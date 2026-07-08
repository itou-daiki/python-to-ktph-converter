/**
 * Flowchart Generator using Mermaid.js
 */
class FlowchartGenerator {
    constructor() {
        this.zoom = 1;
        this.minZoom = 0.5;
        this.maxZoom = 2.5;
        this.zoomStep = 0.1;
        this.renderedSvgElement = null;
        this.currentSvgMarkup = '';
        this.loopBackEdges = [];

        // Initialize mermaid with proper configuration
        if (typeof mermaid !== 'undefined') {
            mermaid.initialize({ 
                startOnLoad: false, // We'll manually render
                theme: 'default',
                securityLevel: 'loose',
                flowchart: {
                    useMaxWidth: false,  // Allow diagram to use natural width
                    htmlLabels: false,  // Use text labels to avoid HTML parsing issues
                    curve: 'linear',
                    padding: 18,
                    nodeSpacing: 44,
                    rankSpacing: 58
                },
                fontFamily: 'arial',
                fontSize: 12,
                themeVariables: {
                    primaryColor: '#2f73d4',
                    primaryTextColor: '#ffffff',
                    primaryBorderColor: '#2f73d4',
                    lineColor: '#2f73d4',
                    edgeLabelBackground: '#f7f9fc',
                    fontFamily: 'arial'
                },
                gantt: {
                    useMaxWidth: false
                }
            });
            console.log('Mermaid initialized');
        } else {
            console.error('Mermaid not loaded');
        }

        this.setupControls();
        this.updateControlState();
    }

    /**
     * Generate flowchart from Python code with Common Test style labels
     */
    async generateFlowchart(pythonCode) {
        if (!pythonCode || pythonCode.trim() === '') {
            console.log('No code to generate flowchart');
            this.clearFlowchart();
            return;
        }

        try {
            console.log('Generating flowchart for:', pythonCode.substring(0, 100) + '...');
            this.loopBackEdges = [];
            
            const lines = pythonCode.split('\n').filter(line => line.trim() !== '' && !line.trim().startsWith('#'));
            
            if (lines.length === 0) {
                console.log('No valid lines for flowchart');
                this.clearFlowchart();
                return;
            }

            let mermaidCode = 'flowchart TD\n';
            
            mermaidCode += '    Start([開始]):::terminal\n';
            
            const result = this.parseCodeStructure(lines, 0);
            mermaidCode += result.mermaidCode;
            
            mermaidCode += '    End([終了]):::terminal\n';
            
            // Connect start to first node
            if (result.firstNode) {
                mermaidCode += `    Start --> ${result.firstNode}\n`;
            } else {
                mermaidCode += '    Start --> End\n';
            }
            
            // Connect last nodes to end
            if (result.lastNodes && result.lastNodes.length > 0) {
                mermaidCode += this.connectNodes(result.lastNodes, 'End');
            } else if (result.lastNode) {
                mermaidCode += this.connectNodes([result.lastNode], 'End');
            }

            mermaidCode += this.getFlowchartStyles();
            
            console.log('Generated mermaid code:', mermaidCode);
            await this.renderFlowchart(mermaidCode);
        } catch (error) {
            console.error('Error generating flowchart:', error);
        }
    }

    /**
     * Parse code structure and generate proper branching flowchart
     */
    parseCodeStructure(lines, startIndex = 0, nodeCounter = { value: 0 }, isInBlock = false) {
        let mermaidCode = '';
        let i = startIndex;
        let firstNode = null;
        let currentLastNodes = []; // Track current ending nodes
        let breakNodes = [];
        let continueNodes = [];
        
        while (i < lines.length) {
            const line = lines[i].trim();
            const indentLevel = this.getIndentLevel(lines[i]);
            
            if (line === '') {
                i++;
                continue;
            }

            if (line === 'break') {
                breakNodes.push(...currentLastNodes);
                currentLastNodes = [];
                i++;
                continue;
            }

            if (line === 'continue') {
                continueNodes.push(...currentLastNodes);
                currentLastNodes = [];
                i++;
                continue;
            }

            nodeCounter.value++;
            const currentNode = 'N' + nodeCounter.value;
            
            if (!firstNode) firstNode = currentNode;

            // Convert Python code to Common Test style for display
            const isFirst = (i === startIndex);
            const isLast = (i === lines.length - 1 || (i + 1 < lines.length && this.getIndentLevel(lines[i + 1]) <= indentLevel));
            let nodeText = this.getFlowchartNodeText(line, isInBlock, isFirst, isLast);
            nodeText = this.escapeForMermaid(nodeText);

            if (line.startsWith('if ')) {
                const ifResult = this.parseIfChain(lines, i, indentLevel, nodeCounter, currentNode, nodeText, currentLastNodes);
                mermaidCode += ifResult.mermaidCode;
                currentLastNodes = ifResult.lastNodes;
                breakNodes.push(...(ifResult.breakNodes || []));
                continueNodes.push(...(ifResult.continueNodes || []));
                i = ifResult.endIndex - 1;

            } else if (line.startsWith('for ') || line.startsWith('while ')) {
                // Handle loops
                // Find loop body
                const loopBlockEnd = this.findBlockEnd(lines, i + 1, indentLevel);
                const loopLines = lines.slice(i + 1, loopBlockEnd);
                let loopBreakNodes = [];

                const rangeLoop = this.parseRangeLoopStatement(line);
                if (rangeLoop) {
                    const setupNode = currentNode;
                    nodeCounter.value++;
                    const conditionNode = 'N' + nodeCounter.value;

                    mermaidCode += `    ${setupNode}["${this.escapeForMermaid(rangeLoop.setupLabel)}"]:::process\n`;
                    mermaidCode += `    ${conditionNode}{"${this.escapeForMermaid(rangeLoop.conditionLabel)}"}:::decision\n`;

                    if (currentLastNodes.length > 0) {
                        mermaidCode += this.connectNodes(currentLastNodes, setupNode);
                    }
                    mermaidCode += `    ${setupNode} --> ${conditionNode}\n`;

                    let repeatNodes = [];
                    if (loopLines.length > 0) {
                        const loopResult = this.parseCodeStructure(loopLines, 0, nodeCounter, true);
                        mermaidCode += loopResult.mermaidCode;
                        loopBreakNodes = loopResult.breakNodes || [];
                        if (loopResult.firstNode) {
                            mermaidCode += `    ${conditionNode} -->|YES| ${loopResult.firstNode}\n`;
                            repeatNodes = this.uniqueNodes([
                                ...this.getLastNodes(loopResult),
                                ...(loopResult.continueNodes || [])
                            ]);
                        }
                    }

                    nodeCounter.value++;
                    const updateNode = 'N' + nodeCounter.value;
                    mermaidCode += `    ${updateNode}["${this.escapeForMermaid(rangeLoop.updateLabel)}"]:::process\n`;

                    if (repeatNodes.length > 0) {
                        mermaidCode += this.connectNodes(repeatNodes, updateNode);
                    } else {
                        mermaidCode += `    ${conditionNode} -->|YES| ${updateNode}\n`;
                    }

                    this.loopBackEdges.push({
                        from: updateNode,
                        to: conditionNode
                    });

                    currentLastNodes = [
                        this.createEdgeRef(conditionNode, 'NO'),
                        ...loopBreakNodes
                    ];
                } else {
                    mermaidCode += `    ${currentNode}{"${nodeText}"}:::decision\n`;

                    // Connect from previous nodes
                    if (currentLastNodes.length > 0) {
                        mermaidCode += this.connectNodes(currentLastNodes, currentNode);
                    }

                    if (loopLines.length > 0) {
                        const loopResult = this.parseCodeStructure(loopLines, 0, nodeCounter, true);
                        mermaidCode += loopResult.mermaidCode;
                        loopBreakNodes = loopResult.breakNodes || [];
                        if (loopResult.firstNode) {
                            mermaidCode += `    ${currentNode} -->|YES| ${loopResult.firstNode}\n`;
                            const repeatNodes = this.uniqueNodes([
                                ...this.getLastNodes(loopResult),
                                ...(loopResult.continueNodes || [])
                            ]);
                            const loopBackSource = this.mergeLoopBackNodes(repeatNodes, nodeCounter, (code) => {
                                mermaidCode += code;
                            });
                            if (loopBackSource) {
                                this.loopBackEdges.push({
                                    from: loopBackSource,
                                    to: currentNode
                                });
                            }
                        }
                    }

                    // Loop exits to next statement
                    currentLastNodes = [
                        this.createEdgeRef(currentNode, 'NO'),
                        ...loopBreakNodes
                    ];
                }
                i = loopBlockEnd - 1;

            } else {
                // Regular statement
                if (line.includes('print(') || line.includes('input(')) {
                    mermaidCode += `    ${currentNode}[["${nodeText}"]]:::io\n`;  // I/O shape
                } else {
                    mermaidCode += `    ${currentNode}["${nodeText}"]:::process\n`;  // Process shape
                }
                
                // Connect from previous nodes
                if (currentLastNodes.length > 0) {
                    mermaidCode += this.connectNodes(currentLastNodes, currentNode);
                }
                
                currentLastNodes = [currentNode];
            }

            i++;
        }

        return {
            mermaidCode: mermaidCode,
            firstNode: firstNode,
            lastNode: currentLastNodes.length > 0 ? currentLastNodes[0] : null,
            lastNodes: currentLastNodes, // Return all ending nodes
            breakNodes,
            continueNodes,
            nodeId: nodeCounter.value
        };
    }

    /**
     * Parse an if / elif / else chain as one branching structure.
     */
    parseIfChain(lines, startIndex, indentLevel, nodeCounter, firstNodeId, firstNodeText, previousNodes) {
        let mermaidCode = '';
        const branchEndNodes = [];
        const breakNodes = [];
        const continueNodes = [];
        const branches = this.collectIfBranches(lines, startIndex, indentLevel);
        let currentConditionNode = firstNodeId;

        for (let branchIndex = 0; branchIndex < branches.length; branchIndex++) {
            const branch = branches[branchIndex];
            const isFirstBranch = branchIndex === 0;

            if (branch.type !== 'else') {
                if (!isFirstBranch) {
                    nodeCounter.value++;
                    currentConditionNode = 'N' + nodeCounter.value;
                }

                const rawText = isFirstBranch
                    ? firstNodeText
                    : this.escapeForMermaid(this.getFlowchartNodeText(lines[branch.index].trim(), true, true, false));
                mermaidCode += `    ${currentConditionNode}{"${rawText}"}:::decision\n`;

                if (isFirstBranch) {
                    mermaidCode += this.connectNodes(previousNodes, currentConditionNode);
                } else if (branch.previousConditionNode) {
                    mermaidCode += `    ${branch.previousConditionNode} -->|NO| ${currentConditionNode}\n`;
                }

                const bodyResult = this.parseBranchBody(lines, branch, nodeCounter);
                mermaidCode += bodyResult.mermaidCode;
                breakNodes.push(...(bodyResult.breakNodes || []));
                continueNodes.push(...(bodyResult.continueNodes || []));

                if (bodyResult.firstNode) {
                    mermaidCode += `    ${currentConditionNode} -->|YES| ${bodyResult.firstNode}\n`;
                    branchEndNodes.push(...bodyResult.lastNodes);
                } else {
                    branchEndNodes.push(this.createEdgeRef(currentConditionNode, 'YES'));
                }

                const nextBranch = branches[branchIndex + 1];
                if (!nextBranch) {
                    branchEndNodes.push(this.createEdgeRef(currentConditionNode, 'NO'));
                } else if (nextBranch.type !== 'else') {
                    nextBranch.previousConditionNode = currentConditionNode;
                } else {
                    nextBranch.previousConditionNode = currentConditionNode;
                }
            } else {
                const bodyResult = this.parseBranchBody(lines, branch, nodeCounter);
                mermaidCode += bodyResult.mermaidCode;
                breakNodes.push(...(bodyResult.breakNodes || []));
                continueNodes.push(...(bodyResult.continueNodes || []));

                if (bodyResult.firstNode) {
                    mermaidCode += `    ${branch.previousConditionNode} -->|NO| ${bodyResult.firstNode}\n`;
                    branchEndNodes.push(...bodyResult.lastNodes);
                } else {
                    branchEndNodes.push(this.createEdgeRef(branch.previousConditionNode, 'NO'));
                }
            }
        }

        const mergedLastNodes = this.mergeBranchEndNodes(branchEndNodes, nodeCounter, (code) => {
            mermaidCode += code;
        });

        return {
            mermaidCode,
            lastNodes: mergedLastNodes,
            breakNodes: this.uniqueNodes(breakNodes),
            continueNodes: this.uniqueNodes(continueNodes),
            endIndex: branches.length > 0 ? branches[branches.length - 1].bodyEnd : startIndex + 1
        };
    }

    /**
     * Collect all branches belonging to one if / elif / else chain.
     */
    collectIfBranches(lines, startIndex, indentLevel) {
        const branches = [];
        let index = startIndex;

        while (index < lines.length) {
            const line = lines[index].trim();
            const currentIndent = this.getIndentLevel(lines[index]);
            const isFirst = index === startIndex;
            const isElif = line.startsWith('elif ');
            const isElse = line === 'else:';

            if (currentIndent !== indentLevel || (!isFirst && !isElif && !isElse)) {
                break;
            }

            const nextBranchIndex = this.findNextIfBranch(lines, index + 1, indentLevel);
            const blockEnd = this.findBlockEnd(lines, index + 1, indentLevel);
            const bodyEnd = nextBranchIndex !== null && nextBranchIndex <= blockEnd ? nextBranchIndex : blockEnd;

            branches.push({
                type: isElse ? 'else' : (isElif ? 'elif' : 'if'),
                index,
                bodyStart: index + 1,
                bodyEnd
            });

            if (isElse || nextBranchIndex === null) {
                break;
            }

            index = nextBranchIndex;
        }

        return branches;
    }

    /**
     * Find the next elif or else at the same indentation level.
     */
    findNextIfBranch(lines, startIndex, indentLevel) {
        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line === '') continue;

            const currentIndent = this.getIndentLevel(lines[i]);
            if (currentIndent < indentLevel) {
                return null;
            }
            if (currentIndent === indentLevel) {
                if (line.startsWith('elif ') || line === 'else:') {
                    return i;
                }
                return null;
            }
        }

        return null;
    }

    /**
     * Parse the body of one branch and normalize its exit nodes.
     */
    parseBranchBody(lines, branch, nodeCounter) {
        const branchLines = lines.slice(branch.bodyStart, branch.bodyEnd);
        if (branchLines.length === 0) {
            return {
                mermaidCode: '',
                firstNode: null,
                lastNodes: [],
                breakNodes: [],
                continueNodes: []
            };
        }

        const result = this.parseCodeStructure(branchLines, 0, nodeCounter, true);
        return {
            mermaidCode: result.mermaidCode,
            firstNode: result.firstNode,
            lastNodes: this.getLastNodes(result),
            breakNodes: result.breakNodes || [],
            continueNodes: result.continueNodes || []
        };
    }

    /**
     * Connect a list of previous nodes to a target node.
     */
    connectNodes(fromNodes, toNode) {
        let mermaidCode = '';
        for (const fromNode of fromNodes) {
            const nodeId = this.getNodeId(fromNode);
            const edgeLabel = this.getEdgeLabel(fromNode);
            mermaidCode += edgeLabel
                ? `    ${nodeId} -->|${edgeLabel}| ${toNode}\n`
                : `    ${nodeId} --> ${toNode}\n`;
        }
        return mermaidCode;
    }

    mergeBranchEndNodes(endNodes, nodeCounter, appendMermaidCode) {
        const uniqueEndNodes = this.uniqueNodes(endNodes);
        if (uniqueEndNodes.length <= 1) {
            return uniqueEndNodes;
        }

        const junctionNode = this.createJunctionNode(nodeCounter);
        appendMermaidCode(`    ${junctionNode}[" "]:::junction\n`);
        appendMermaidCode(this.connectNodes(uniqueEndNodes, junctionNode));
        return [junctionNode];
    }

    mergeLoopBackNodes(fromNodes, nodeCounter, appendMermaidCode) {
        const uniqueFromNodes = this.uniqueNodes(fromNodes);
        if (uniqueFromNodes.length === 0) return null;
        if (uniqueFromNodes.length === 1) return this.getNodeId(uniqueFromNodes[0]);

        const junctionNode = this.createJunctionNode(nodeCounter);
        appendMermaidCode(`    ${junctionNode}[" "]:::junction\n`);
        appendMermaidCode(this.connectNodes(uniqueFromNodes, junctionNode));
        return junctionNode;
    }

    /**
     * Normalize parser results to an array of unique exit nodes.
     */
    getLastNodes(result) {
        if (result.lastNodes && result.lastNodes.length > 0) {
            return this.uniqueNodes(result.lastNodes);
        }
        return result.lastNode ? [result.lastNode] : [];
    }

    uniqueNodes(nodes) {
        const unique = new Map();
        nodes.filter(Boolean).forEach((node) => {
            const key = `${this.getNodeId(node)}:${this.getEdgeLabel(node)}`;
            if (!unique.has(key)) {
                unique.set(key, node);
            }
        });
        return Array.from(unique.values());
    }

    createJunctionNode(nodeCounter) {
        nodeCounter.value++;
        return `J${nodeCounter.value}`;
    }

    createEdgeRef(node, label = '') {
        return {node, label};
    }

    getNodeId(nodeRef) {
        return typeof nodeRef === 'string' ? nodeRef : nodeRef.node;
    }

    getEdgeLabel(nodeRef) {
        return typeof nodeRef === 'string' ? '' : (nodeRef.label || '');
    }

    getFlowchartStyles() {
        return [
            '    classDef terminal fill:#2f73d4,stroke:#2f73d4,color:#ffffff;',
            '    classDef process fill:#2f73d4,stroke:#2f73d4,color:#ffffff;',
            '    classDef decision fill:#2f73d4,stroke:#2f73d4,color:#ffffff;',
            '    classDef io fill:#2f73d4,stroke:#2f73d4,color:#ffffff;',
            '    classDef junction fill:transparent,stroke:transparent,color:transparent;'
        ].join('\n') + '\n';
    }

    /**
     * Use compact labels for decision diamonds so branching nodes stay readable.
     */
    getFlowchartNodeText(pythonCode, isInBlock = false, isFirst = false, isLast = false) {
        const converted = pythonCode.trim();

        if (this.isControlStatement(converted)) {
            return this.convertControlStatementToCompactLabel(converted);
        }

        return this.convertPythonToCommonTestStyle(converted, isInBlock, isFirst, isLast);
    }

    isControlStatement(pythonCode) {
        return /^(if|elif|for|while)\b/.test(pythonCode);
    }

    convertControlStatementToCompactLabel(pythonCode) {
        const ifMatch = pythonCode.match(/^if\s+(.+)\s*:/);
        if (ifMatch) {
            return this.truncateFlowchartLabel(ifMatch[1], 40);
        }

        const elifMatch = pythonCode.match(/^elif\s+(.+)\s*:/);
        if (elifMatch) {
            return this.truncateFlowchartLabel(elifMatch[1], 40);
        }

        const whileMatch = pythonCode.match(/^while\s+(.+)\s*:/);
        if (whileMatch) {
            return this.truncateFlowchartLabel(whileMatch[1], 40);
        }

        const forRangeMatch = pythonCode.match(/^for\s+(\w+)\s+in\s+range\s*\((.*)\)\s*:/);
        if (forRangeMatch) {
            return this.truncateFlowchartLabel(this.formatRangeLoopLabel(forRangeMatch[1], forRangeMatch[2]), 48);
        }

        const forMatch = pythonCode.match(/^for\s+(\w+)\s+in\s+(.+)\s*:/);
        if (forMatch) {
            return this.truncateFlowchartLabel(`${forMatch[1]} を ${forMatch[2]} から順に取り出す`, 48);
        }

        return this.truncateFlowchartLabel(pythonCode.replace(/:\s*$/, ''), 48);
    }

    parseRangeLoopStatement(pythonCode) {
        const match = pythonCode.match(/^for\s+([A-Za-z_]\w*)\s+in\s+range\s*\((.*)\)\s*:/);
        if (!match) return null;

        const variable = match[1];
        const args = this.splitArguments(match[2]);
        if (args.length === 0) return null;

        const start = args.length === 1 ? '0' : args[0];
        const stop = args.length === 1 ? args[0] : args[1];
        const step = args.length >= 3 ? args[2] : '1';
        const isNegativeStep = this.isNegativeRangeStep(step);
        const inclusiveEnd = this.getInclusiveRangeEnd(stop, isNegativeStep ? 1 : -1);
        const comparator = isNegativeStep ? '≥' : '≤';

        return {
            setupLabel: `${variable} = ${start}`,
            conditionLabel: `${variable} ${comparator} ${inclusiveEnd}`,
            updateLabel: this.formatRangeUpdateLabel(variable, step)
        };
    }

    splitArguments(argumentText) {
        const args = [];
        let current = '';
        let depth = 0;
        let quote = null;

        for (const char of argumentText) {
            if (quote) {
                current += char;
                if (char === quote) quote = null;
                continue;
            }

            if (char === '"' || char === "'") {
                quote = char;
                current += char;
                continue;
            }

            if (char === '(' || char === '[' || char === '{') {
                depth += 1;
                current += char;
                continue;
            }

            if (char === ')' || char === ']' || char === '}') {
                depth = Math.max(0, depth - 1);
                current += char;
                continue;
            }

            if (char === ',' && depth === 0) {
                if (current.trim()) args.push(current.trim());
                current = '';
                continue;
            }

            current += char;
        }

        if (current.trim()) args.push(current.trim());
        return args;
    }

    isNegativeRangeStep(step) {
        const numericStep = Number(step);
        if (Number.isFinite(numericStep)) {
            return numericStep < 0;
        }
        return step.trim().startsWith('-');
    }

    formatRangeUpdateLabel(variable, step) {
        const trimmedStep = step.trim();
        const numericStep = Number(trimmedStep);

        if (Number.isFinite(numericStep)) {
            if (numericStep === 1) return `${variable} = ${variable} + 1`;
            if (numericStep === -1) return `${variable} = ${variable} - 1`;
            if (numericStep > 0) return `${variable} = ${variable} + ${numericStep}`;
            return `${variable} = ${variable} - ${Math.abs(numericStep)}`;
        }

        if (trimmedStep.startsWith('-')) {
            const stepWithoutSign = trimmedStep.slice(1).trim();
            return `${variable} = ${variable} - ${stepWithoutSign}`;
        }

        return `${variable} = ${variable} + ${trimmedStep}`;
    }

    formatRangeLoopLabel(variable, rangeArguments) {
        const args = this.splitArguments(rangeArguments);

        if (args.length === 1) {
            const end = this.getInclusiveRangeEnd(args[0], -1);
            return `${variable} を 0 から ${end} まで 1 ずつ増やしながら繰り返す`;
        }

        if (args.length === 2) {
            const end = this.getInclusiveRangeEnd(args[1], -1);
            return `${variable} を ${args[0]} から ${end} まで 1 ずつ増やしながら繰り返す`;
        }

        if (args.length >= 3) {
            const step = args[2];
            const endOffset = step.trim().startsWith('-') ? 1 : -1;
            const end = this.getInclusiveRangeEnd(args[1], endOffset);
            const direction = step.trim().startsWith('-') ? '減らしながら' : '増やしながら';
            return `${variable} を ${args[0]} から ${end} まで ${step} ずつ${direction}繰り返す`;
        }

        return `${variable} を range(${rangeArguments}) で繰り返す`;
    }

    getInclusiveRangeEnd(value, offset) {
        const numericValue = Number(value);
        if (Number.isInteger(numericValue)) {
            return String(numericValue + offset);
        }

        const compactValue = value.replace(/\s+/g, '');
        if (offset === -1 && compactValue.endsWith('+1')) {
            return compactValue.slice(0, -2);
        }
        if (offset === 1 && compactValue.endsWith('-1')) {
            return compactValue.slice(0, -2);
        }

        return offset > 0 ? `${value} + 1` : `${value} - 1`;
    }

    truncateFlowchartLabel(label, maxLength = 24) {
        const normalized = label.replace(/\s+/g, ' ').trim();
        if (normalized.length <= maxLength) {
            return normalized;
        }

        return normalized.substring(0, maxLength - 3) + '...';
    }

    /**
     * Get indentation level of a line
     */
    getIndentLevel(line) {
        const match = line.match(/^(\s*)/);
        return match ? match[1].length : 0;
    }

    /**
     * Find the end of a code block
     */
    findBlockEnd(lines, startIndex, parentIndentLevel) {
        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i].trim();
            if (line === '') continue;
            
            const indentLevel = this.getIndentLevel(lines[i]);
            if (indentLevel <= parentIndentLevel) {
                return i;
            }
        }
        return lines.length;
    }

    /**
     * Find corresponding else statement for an if
     */
    findElseStatement(lines, ifIndex, ifIndentLevel) {
        const blockEnd = this.findBlockEnd(lines, ifIndex + 1, ifIndentLevel);
        
        if (blockEnd < lines.length) {
            const nextLine = lines[blockEnd].trim();
            const nextIndentLevel = this.getIndentLevel(lines[blockEnd]);
            
            if (nextLine.startsWith('else:') && nextIndentLevel === ifIndentLevel) {
                return blockEnd;
            }
        }
        
        return null;
    }

    /**
     * Add control symbols to code blocks for Common Test style
     */
    addControlSymbols(nodeText, isFirst, isLast, isInBlock) {
        if (!isInBlock) {
            return nodeText;
        }
        
        let prefix = '';
        if (isLast) {
            prefix = '⎿ ';  // End of control block
        } else {
            prefix = '｜ ';  // Inside control block
        }
        
        return prefix + nodeText;
    }

    /**
     * Convert Python code to Common Test style notation for flowchart display
     */
    convertPythonToCommonTestStyle(pythonCode, isInBlock = false, isFirst = false, isLast = false) {
        let converted = pythonCode.trim();
        
        // Convert for loops to Common Test style
        const forMatch = converted.match(/for\s+(\w+)\s+in\s+range\s*\((\d+),\s*(\d+)(?:,\s*(\d+))?\s*\)\s*:/);
        if (forMatch) {
            const variable = forMatch[1];
            const start = forMatch[2];
            const end = parseInt(forMatch[3]) - 1; // range is exclusive of end
            const step = forMatch[4] || '1';
            return `${variable} を ${start} から ${end} まで ${step} ずつ増やしながら繰り返す:`;
        }
        
        // Convert while loops
        const whileMatch = converted.match(/while\s+(.+)\s*:/);
        if (whileMatch) {
            const condition = whileMatch[1];
            return `${condition} の間繰り返す:`;
        }
        
        // Convert elif statements
        const elifMatch = converted.match(/^elif\s+(.+)\s*:/);
        if (elifMatch) {
            const condition = elifMatch[1];
            return `そうでなくもし ${condition} ならば:`;
        }

        // Convert if statements
        const ifMatch = converted.match(/^if\s+(.+)\s*:/);
        if (ifMatch) {
            const condition = ifMatch[1];
            return `もし ${condition} ならば:`;
        }
        
        // Convert else statements
        if (converted === 'else:') {
            return 'そうでなければ:';
        }
        
        // Convert print statements
        const printMatch = converted.match(/print\s*\((.*)\)/);
        if (printMatch) {
            const content = printMatch[1];
            return `表示する(${content})`;
        }
        
        // Convert input statements
        const inputMatch = converted.match(/(\w+)\s*=\s*input\s*\((.*)\)/);
        if (inputMatch) {
            const variable = inputMatch[1];
            return `${variable} = 【外部からの入力】`;
        }
        
        // Convert variable assignments
        const assignMatch = converted.match(/(\w+)\s*=\s*(.+)/);
        if (assignMatch) {
            const variable = assignMatch[1];
            const value = assignMatch[2];
            return `${variable} = ${value}`;
        }
        
        // Truncate if still too long
        if (converted.length > 50) {
            converted = converted.substring(0, 47) + '...';
        }
        
        // Add control symbols if in a block
        converted = this.addControlSymbols(converted, isFirst, isLast, isInBlock);
        
        return converted;
    }

    /**
     * Escape special characters for Mermaid while preserving Japanese text
     */
    escapeForMermaid(text) {
        // For Mermaid, we need to be more careful with special characters
        // Use quotes to wrap the text and escape internal quotes
        return text
            .replace(/"/g, "'")         // Replace double quotes with single quotes
            .replace(/\r?\n/g, ' ')     // Replace newlines with space
            .replace(/\s+/g, ' ')       // Normalize whitespace
            .trim();
    }

    /**
     * Render the flowchart
     */
    async renderFlowchart(mermaidCode) {
        const flowchartDiv = document.getElementById('flowchart');
        
        try {
            // Fix escaped newlines in the mermaid code
            mermaidCode = mermaidCode.replace(/\\n/g, '\n');
            
            console.log('Rendering flowchart with code:', mermaidCode);
            
            if (typeof mermaid === 'undefined') {
                throw new Error('Mermaid library not loaded');
            }
            
            // Clear previous content
            flowchartDiv.innerHTML = '';
            this.renderedSvgElement = null;
            this.currentSvgMarkup = '';
            
            const viewport = document.createElement('div');
            viewport.className = 'flowchart-viewport';

            const canvas = document.createElement('div');
            canvas.className = 'flowchart-canvas';

            const diagramContainer = document.createElement('div');
            const diagramId = 'mermaid-diagram-' + Date.now();
            diagramContainer.className = 'mermaid flowchart-diagram';

            canvas.appendChild(diagramContainer);
            viewport.appendChild(canvas);
            flowchartDiv.appendChild(viewport);

            const renderResult = await mermaid.render(diagramId, mermaidCode);
            diagramContainer.innerHTML = renderResult.svg;
            if (typeof renderResult.bindFunctions === 'function') {
                renderResult.bindFunctions(diagramContainer);
            }

            this.currentSvgMarkup = renderResult.svg;
            this.renderedSvgElement = diagramContainer.querySelector('svg');
            this.drawLoopBackEdges();
            this.trimSvgViewBox();
            this.zoom = 1;
            this.applyZoom();
            this.centerFlowchartViewport();
            this.updateControlState();
            
            console.log('Flowchart rendered successfully');
        } catch (error) {
            console.error('Error rendering flowchart:', error);
            flowchartDiv.innerHTML = '';
            this.renderedSvgElement = null;
            this.currentSvgMarkup = '';
            this.updateControlState();

            const errorContainer = document.createElement('div');
            errorContainer.className = 'flowchart-error';

            const title = document.createElement('p');
            title.className = 'flowchart-error-title';
            title.textContent = 'フローチャート生成エラー:';

            const message = document.createElement('p');
            message.className = 'flowchart-error-message';
            message.textContent = error.message;

            const hint = document.createElement('p');
            hint.className = 'flowchart-error-hint';
            hint.textContent = 'コードを確認してください';

            errorContainer.append(title, message, hint);
            flowchartDiv.appendChild(errorContainer);
        }
    }

    /**
     * Clear flowchart
     */
    clearFlowchart() {
        document.getElementById('flowchart').innerHTML = '';
        this.renderedSvgElement = null;
        this.currentSvgMarkup = '';
        this.zoom = 1;
        this.updateControlState();
    }

    setupControls() {
        this.zoomOutButton = document.querySelector('.flowchart-zoom-out-button');
        this.zoomResetButton = document.querySelector('.flowchart-zoom-reset-button');
        this.zoomInButton = document.querySelector('.flowchart-zoom-in-button');
        this.saveButton = document.querySelector('.flowchart-save-button');

        if (this.zoomOutButton) {
            this.zoomOutButton.addEventListener('click', () => this.zoomOut());
        }
        if (this.zoomResetButton) {
            this.zoomResetButton.addEventListener('click', () => this.resetZoom());
        }
        if (this.zoomInButton) {
            this.zoomInButton.addEventListener('click', () => this.zoomIn());
        }
        if (this.saveButton) {
            this.saveButton.addEventListener('click', () => this.saveAsPng());
        }
    }

    zoomIn() {
        this.setZoom(this.zoom + this.zoomStep);
    }

    zoomOut() {
        this.setZoom(this.zoom - this.zoomStep);
    }

    resetZoom() {
        this.setZoom(1);
    }

    setZoom(value) {
        const nextZoom = Math.min(this.maxZoom, Math.max(this.minZoom, value));
        this.zoom = Math.round(nextZoom * 100) / 100;
        this.applyZoom();
        this.updateControlState();
    }

    applyZoom() {
        const svg = this.getRenderedSvg();
        const canvas = document.querySelector('#flowchart .flowchart-canvas');
        if (!svg || !canvas) return;

        const size = this.getSvgNaturalSize(svg);
        svg.style.width = `${size.width}px`;
        svg.style.height = `${size.height}px`;
        svg.style.transform = `scale(${this.zoom})`;
        svg.style.transformOrigin = 'top left';
        canvas.style.width = `${Math.ceil(size.width * this.zoom)}px`;
        canvas.style.height = `${Math.ceil(size.height * this.zoom)}px`;
    }

    centerFlowchartViewport() {
        const flowchart = document.getElementById('flowchart');
        if (!flowchart) return;

        flowchart.scrollLeft = Math.max(0, (flowchart.scrollWidth - flowchart.clientWidth) / 2);
        flowchart.scrollTop = 0;
    }

    updateControlState() {
        const hasDiagram = Boolean(this.getRenderedSvg());
        const controls = [this.zoomOutButton, this.zoomResetButton, this.zoomInButton, this.saveButton];
        controls.forEach((button) => {
            if (button) button.disabled = !hasDiagram;
        });

        if (this.zoomOutButton) this.zoomOutButton.disabled = !hasDiagram || this.zoom <= this.minZoom;
        if (this.zoomInButton) this.zoomInButton.disabled = !hasDiagram || this.zoom >= this.maxZoom;
        if (this.zoomResetButton) {
            this.zoomResetButton.textContent = hasDiagram ? `${Math.round(this.zoom * 100)}%` : '100%';
        }
    }

    getRenderedSvg() {
        if (this.renderedSvgElement && this.renderedSvgElement.isConnected) {
            return this.renderedSvgElement;
        }
        this.renderedSvgElement = document.querySelector('#flowchart svg');
        return this.renderedSvgElement;
    }

    drawLoopBackEdges() {
        const svg = this.getRenderedSvg();
        if (!svg || !this.loopBackEdges.length) return;

        const existingGroup = svg.querySelector('.flowchart-loop-back-edges');
        if (existingGroup) existingGroup.remove();

        this.ensureLoopArrowMarker(svg);
        const group = document.createElementNS('http://www.w3.org/2000/svg', 'g');
        group.setAttribute('class', 'flowchart-loop-back-edges');

        this.loopBackEdges.forEach((edge, index) => {
            const fromElement = this.getSvgNodeElement(svg, edge.from);
            const toElement = this.getSvgNodeElement(svg, edge.to);
            if (!fromElement || !toElement) return;

            const fromBox = this.getSvgNodeBounds(svg, fromElement);
            const toBox = this.getSvgNodeBounds(svg, toElement);
            if (!fromBox || !toBox) return;
            const gap = 44 + (index * 18);
            const contentBox = this.getSvgContentBounds(svg);
            const startX = fromBox.x + (fromBox.width / 2);
            const startY = fromBox.y + fromBox.height;
            const endX = toBox.x;
            const endY = toBox.y + (toBox.height / 2);
            const sideX = (contentBox ? contentBox.x : Math.min(fromBox.x, toBox.x)) - gap;
            const lowerY = startY + 24;
            const d = [
                `M ${startX} ${startY}`,
                `L ${startX} ${lowerY}`,
                `L ${sideX} ${lowerY}`,
                `L ${sideX} ${endY}`,
                `L ${endX} ${endY}`
            ].join(' ');

            const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
            path.setAttribute('class', 'flowchart-loop-back-path');
            path.setAttribute('d', d);
            path.setAttribute('fill', 'none');
            path.setAttribute('stroke', '#2f73d4');
            path.setAttribute('stroke-width', '2');
            path.setAttribute('marker-end', 'url(#flowchart-loop-arrow)');
            group.appendChild(path);

            this.expandSvgViewBox(svg, sideX - 8, lowerY + 8);
        });

        const firstNode = svg.querySelector('.node');
        if (firstNode && firstNode.parentNode) {
            firstNode.parentNode.insertBefore(group, firstNode);
        } else {
            svg.appendChild(group);
        }
    }

    getSvgContentBounds(svg) {
        const nodes = Array.from(svg.querySelectorAll('.node:not(.junction)'))
            .map((node) => this.getSvgNodeBounds(svg, node))
            .filter(Boolean);
        if (nodes.length === 0) return null;

        const minX = Math.min(...nodes.map((node) => node.x));
        const minY = Math.min(...nodes.map((node) => node.y));
        const maxX = Math.max(...nodes.map((node) => node.x + node.width));
        const maxY = Math.max(...nodes.map((node) => node.y + node.height));

        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    getSvgNodeBounds(svg, element) {
        if (!svg || !element || typeof element.getBBox !== 'function') return null;

        const box = element.getBBox();
        const matrix = element.getCTM();
        if (!matrix) return box;

        const corners = [
            this.transformSvgPoint(svg, matrix, box.x, box.y),
            this.transformSvgPoint(svg, matrix, box.x + box.width, box.y),
            this.transformSvgPoint(svg, matrix, box.x, box.y + box.height),
            this.transformSvgPoint(svg, matrix, box.x + box.width, box.y + box.height)
        ].filter(Boolean);
        if (corners.length === 0) return box;

        const xValues = corners.map((point) => point.x);
        const yValues = corners.map((point) => point.y);
        const minX = Math.min(...xValues);
        const maxX = Math.max(...xValues);
        const minY = Math.min(...yValues);
        const maxY = Math.max(...yValues);

        return {
            x: minX,
            y: minY,
            width: maxX - minX,
            height: maxY - minY
        };
    }

    transformSvgPoint(svg, matrix, x, y) {
        const point = svg.createSVGPoint();
        point.x = x;
        point.y = y;
        return point.matrixTransform(matrix);
    }

    getSvgNodeElement(svg, nodeId) {
        const escapedId = typeof CSS !== 'undefined' && CSS.escape
            ? CSS.escape(nodeId)
            : nodeId.replace(/[^A-Za-z0-9_-]/g, '\\$&');
        return svg.querySelector(`#${escapedId}`)
            || Array.from(svg.querySelectorAll('.node')).find((node) => (
                node.id === nodeId || node.id.startsWith(`flowchart-${nodeId}-`)
            ));
    }

    ensureLoopArrowMarker(svg) {
        let defs = svg.querySelector('defs');
        if (!defs) {
            defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
            svg.insertBefore(defs, svg.firstChild);
        }

        if (svg.querySelector('#flowchart-loop-arrow')) return;

        const marker = document.createElementNS('http://www.w3.org/2000/svg', 'marker');
        marker.setAttribute('id', 'flowchart-loop-arrow');
        marker.setAttribute('viewBox', '0 0 10 10');
        marker.setAttribute('refX', '9');
        marker.setAttribute('refY', '5');
        marker.setAttribute('markerWidth', '7');
        marker.setAttribute('markerHeight', '7');
        marker.setAttribute('orient', 'auto-start-reverse');

        const arrow = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        arrow.setAttribute('d', 'M 0 0 L 10 5 L 0 10 z');
        arrow.setAttribute('fill', '#2f73d4');
        marker.appendChild(arrow);
        defs.appendChild(marker);
    }

    expandSvgViewBox(svg, minX, maxY) {
        const viewBox = svg.viewBox && svg.viewBox.baseVal;
        if (!viewBox || !viewBox.width || !viewBox.height) return;

        const currentMinX = viewBox.x;
        const currentMinY = viewBox.y;
        const currentMaxX = viewBox.x + viewBox.width;
        const currentMaxY = viewBox.y + viewBox.height;
        const nextMinX = Math.min(currentMinX, minX);
        const nextMaxY = Math.max(currentMaxY, maxY);

        if (nextMinX !== currentMinX || nextMaxY !== currentMaxY) {
            const nextWidth = currentMaxX - nextMinX;
            const nextHeight = nextMaxY - currentMinY;
            svg.setAttribute('viewBox', `${nextMinX} ${currentMinY} ${nextWidth} ${nextHeight}`);
        }
    }

    trimSvgViewBox() {
        const svg = this.getRenderedSvg();
        if (!svg || typeof svg.getBBox !== 'function') return;

        try {
            const box = svg.getBBox();
            if (!box.width || !box.height) return;

            const padding = 16;
            svg.setAttribute(
                'viewBox',
                `${box.x - padding} ${box.y - padding} ${box.width + (padding * 2)} ${box.height + (padding * 2)}`
            );
        } catch (_) {
            // Some browsers can fail getBBox while fonts are settling; the original viewBox is still usable.
        }
    }

    getSvgNaturalSize(svg) {
        const viewBox = svg.viewBox && svg.viewBox.baseVal;
        if (viewBox && viewBox.width > 0 && viewBox.height > 0) {
            return {width: viewBox.width, height: viewBox.height};
        }

        const width = parseFloat(svg.getAttribute('width')) || svg.getBoundingClientRect().width || 800;
        const height = parseFloat(svg.getAttribute('height')) || svg.getBoundingClientRect().height || 600;
        return {width, height};
    }

    async saveAsPng() {
        const svg = this.getRenderedSvg();
        if (!svg) {
            this.flashButton(this.saveButton, 'なし');
            return;
        }

        try {
            const size = this.getSvgNaturalSize(svg);
            const clonedSvg = svg.cloneNode(true);
            clonedSvg.removeAttribute('style');
            clonedSvg.setAttribute('xmlns', 'http://www.w3.org/2000/svg');
            clonedSvg.setAttribute('width', String(size.width));
            clonedSvg.setAttribute('height', String(size.height));

            const svgText = new XMLSerializer().serializeToString(clonedSvg);
            const svgBlob = new Blob([svgText], {type: 'image/svg+xml;charset=utf-8'});
            const url = URL.createObjectURL(svgBlob);
            const image = new Image();

            await new Promise((resolve, reject) => {
                image.onload = resolve;
                image.onerror = reject;
                image.src = url;
            });

            const exportScale = 2;
            const canvas = document.createElement('canvas');
            canvas.width = Math.ceil(size.width * exportScale);
            canvas.height = Math.ceil(size.height * exportScale);
            const context = canvas.getContext('2d');
            context.fillStyle = '#f7f9fc';
            context.fillRect(0, 0, canvas.width, canvas.height);
            context.drawImage(image, 0, 0, canvas.width, canvas.height);

            URL.revokeObjectURL(url);

            const pngBlob = await new Promise((resolve) => {
                canvas.toBlob(resolve, 'image/png');
            });
            if (!pngBlob) throw new Error('PNG画像を作成できませんでした');

            this.downloadBlob(pngBlob, this.createDownloadFileName());
            this.flashButton(this.saveButton, '保存済');
        } catch (error) {
            console.error('Failed to save flowchart image:', error);
            this.flashButton(this.saveButton, '失敗');
        }
    }

    downloadBlob(blob, filename) {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    createDownloadFileName() {
        const timestamp = new Date()
            .toISOString()
            .replace(/[:.]/g, '-')
            .replace('T', '_')
            .replace('Z', '');
        return `flowchart_${timestamp}.png`;
    }

    flashButton(button, text) {
        if (!button) return;
        const originalText = button.textContent;
        button.textContent = text;
        setTimeout(() => {
            button.textContent = originalText;
            this.updateControlState();
        }, 1200);
    }
}

// Export for use in other modules
window.FlowchartGenerator = FlowchartGenerator;
