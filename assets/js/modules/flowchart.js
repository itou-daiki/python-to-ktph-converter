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
                mermaidCode += `    ${currentNode}{"${nodeText}"}:::decision\n`;
                
                // Connect from previous nodes
                if (currentLastNodes.length > 0) {
                    mermaidCode += this.connectNodes(currentLastNodes, currentNode);
                }

                // Find loop body
                const loopBlockEnd = this.findBlockEnd(lines, i + 1, indentLevel);
                const loopLines = lines.slice(i + 1, loopBlockEnd);
                let loopBreakNodes = [];
                
                if (loopLines.length > 0) {
                    const loopResult = this.parseCodeStructure(loopLines, 0, nodeCounter, true);
                    mermaidCode += loopResult.mermaidCode;
                    loopBreakNodes = loopResult.breakNodes || [];
                    if (loopResult.firstNode) {
                        mermaidCode += `    ${currentNode} -->|YES| ${loopResult.firstNode}\n`;
                        for (const lastNode of this.getLastNodes(loopResult)) {
                            mermaidCode += `    ${this.getNodeId(lastNode)} --> ${currentNode}\n`;
                        }
                        for (const continueNode of loopResult.continueNodes || []) {
                            mermaidCode += `    ${this.getNodeId(continueNode)} --> ${currentNode}\n`;
                        }
                    }
                }
                
                // Loop exits to next statement
                currentLastNodes = [
                    this.createEdgeRef(currentNode, 'NO'),
                    ...loopBreakNodes
                ];
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

        return {
            mermaidCode,
            lastNodes: this.uniqueNodes(branchEndNodes),
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
            '    classDef io fill:#2f73d4,stroke:#2f73d4,color:#ffffff;'
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
            return this.truncateFlowchartLabel(ifMatch[1]);
        }

        const elifMatch = pythonCode.match(/^elif\s+(.+)\s*:/);
        if (elifMatch) {
            return this.truncateFlowchartLabel(elifMatch[1]);
        }

        const whileMatch = pythonCode.match(/^while\s+(.+)\s*:/);
        if (whileMatch) {
            return this.truncateFlowchartLabel(whileMatch[1]);
        }

        const forRangeMatch = pythonCode.match(/^for\s+(\w+)\s+in\s+range\s*\((.*)\)\s*:/);
        if (forRangeMatch) {
            return this.truncateFlowchartLabel(this.formatRangeLoopLabel(forRangeMatch[1], forRangeMatch[2]));
        }

        const forMatch = pythonCode.match(/^for\s+(\w+)\s+in\s+(.+)\s*:/);
        if (forMatch) {
            return this.truncateFlowchartLabel(`${forMatch[1]} in ${forMatch[2]}`);
        }

        return this.truncateFlowchartLabel(pythonCode.replace(/:\s*$/, ''));
    }

    formatRangeLoopLabel(variable, rangeArguments) {
        const args = rangeArguments.split(',').map((arg) => arg.trim()).filter(Boolean);

        if (args.length === 1) {
            const end = this.getInclusiveRangeEnd(args[0], -1);
            return `${variable}: 0..${end}`;
        }

        if (args.length === 2) {
            const end = this.getInclusiveRangeEnd(args[1], -1);
            return `${variable}: ${args[0]}..${end}`;
        }

        if (args.length >= 3) {
            const step = args[2];
            const endOffset = step.trim().startsWith('-') ? 1 : -1;
            const end = this.getInclusiveRangeEnd(args[1], endOffset);
            return `${variable}: ${args[0]}..${end} / ${step}`;
        }

        return `${variable}: range(${rangeArguments})`;
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
            this.zoom = 1;
            this.applyZoom();
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
