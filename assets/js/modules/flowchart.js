/**
 * Flowchart Generator using Mermaid.js
 */
class FlowchartGenerator {
    constructor() {
        // Initialize mermaid with proper configuration
        if (typeof mermaid !== 'undefined') {
            mermaid.initialize({ 
                startOnLoad: false, // We'll manually render
                theme: 'default',
                securityLevel: 'loose',
                flowchart: {
                    useMaxWidth: false,  // Allow diagram to use natural width
                    htmlLabels: false,  // Use text labels to avoid HTML parsing issues
                    curve: 'basis',
                    padding: 20
                },
                fontFamily: 'arial',
                fontSize: 12,
                gantt: {
                    useMaxWidth: false
                }
            });
            console.log('Mermaid initialized');
        } else {
            console.error('Mermaid not loaded');
        }
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
            
            mermaidCode += '    Start([開始])\n';
            
            const result = this.parseCodeStructure(lines, 0);
            mermaidCode += result.mermaidCode;
            
            mermaidCode += '    End([終了])\n';
            
            // Connect start to first node
            if (result.firstNode) {
                mermaidCode += `    Start --> ${result.firstNode}\n`;
            } else {
                mermaidCode += '    Start --> End\n';
            }
            
            // Connect last nodes to end
            if (result.lastNodes && result.lastNodes.length > 0) {
                for (const lastNode of result.lastNodes) {
                    mermaidCode += `    ${lastNode} --> End\n`;
                }
            } else if (result.lastNode) {
                mermaidCode += `    ${result.lastNode} --> End\n`;
            }
            
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
        
        while (i < lines.length) {
            const line = lines[i].trim();
            const indentLevel = this.getIndentLevel(lines[i]);
            
            if (line === '') {
                i++;
                continue;
            }

            nodeCounter.value++;
            const currentNode = 'N' + nodeCounter.value;
            
            if (!firstNode) firstNode = currentNode;

            // Convert Python code to Common Test style for display
            const isFirst = (i === startIndex);
            const isLast = (i === lines.length - 1 || (i + 1 < lines.length && this.getIndentLevel(lines[i + 1]) <= indentLevel));
            let nodeText = this.convertPythonToCommonTestStyle(line, isInBlock, isFirst, isLast);
            nodeText = this.escapeForMermaid(nodeText);

            if (line.startsWith('if ')) {
                const ifResult = this.parseIfChain(lines, i, indentLevel, nodeCounter, currentNode, nodeText, currentLastNodes);
                mermaidCode += ifResult.mermaidCode;
                currentLastNodes = ifResult.lastNodes;
                i = ifResult.endIndex - 1;

            } else if (line.startsWith('for ') || line.startsWith('while ')) {
                // Handle loops
                mermaidCode += `    ${currentNode}{"${nodeText}"}\n`;
                
                // Connect from previous nodes
                if (currentLastNodes.length > 0) {
                    for (const prevNode of currentLastNodes) {
                        mermaidCode += `    ${prevNode} --> ${currentNode}\n`;
                    }
                }

                // Find loop body
                const loopBlockEnd = this.findBlockEnd(lines, i + 1, indentLevel);
                const loopLines = lines.slice(i + 1, loopBlockEnd);
                
                if (loopLines.length > 0) {
                    const loopResult = this.parseCodeStructure(loopLines, 0, nodeCounter, true);
                    mermaidCode += loopResult.mermaidCode;
                    if (loopResult.firstNode) {
                        mermaidCode += `    ${currentNode} -->|継続| ${loopResult.firstNode}\n`;
                        for (const lastNode of this.getLastNodes(loopResult)) {
                            mermaidCode += `    ${lastNode} --> ${currentNode}\n`;
                        }
                    }
                }
                
                // Loop exits to next statement
                currentLastNodes = [currentNode];
                i = loopBlockEnd - 1;

            } else {
                // Regular statement
                if (line.includes('print(') || line.includes('input(')) {
                    mermaidCode += `    ${currentNode}[["${nodeText}"]]\n`;  // I/O shape
                } else {
                    mermaidCode += `    ${currentNode}["${nodeText}"]\n`;  // Process shape
                }
                
                // Connect from previous nodes
                if (currentLastNodes.length > 0) {
                    for (const prevNode of currentLastNodes) {
                        mermaidCode += `    ${prevNode} --> ${currentNode}\n`;
                    }
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
            nodeId: nodeCounter.value
        };
    }

    /**
     * Parse an if / elif / else chain as one branching structure.
     */
    parseIfChain(lines, startIndex, indentLevel, nodeCounter, firstNodeId, firstNodeText, previousNodes) {
        let mermaidCode = '';
        const branchEndNodes = [];
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
                    : this.escapeForMermaid(this.convertPythonToCommonTestStyle(lines[branch.index].trim(), true, true, false));
                mermaidCode += `    ${currentConditionNode}{"${rawText}"}\n`;

                if (isFirstBranch) {
                    mermaidCode += this.connectNodes(previousNodes, currentConditionNode);
                } else if (branch.previousConditionNode) {
                    mermaidCode += `    ${branch.previousConditionNode} -->|No| ${currentConditionNode}\n`;
                }

                const bodyResult = this.parseBranchBody(lines, branch, nodeCounter);
                mermaidCode += bodyResult.mermaidCode;

                if (bodyResult.firstNode) {
                    mermaidCode += `    ${currentConditionNode} -->|Yes| ${bodyResult.firstNode}\n`;
                    branchEndNodes.push(...bodyResult.lastNodes);
                } else {
                    branchEndNodes.push(currentConditionNode);
                }

                const nextBranch = branches[branchIndex + 1];
                if (!nextBranch) {
                    branchEndNodes.push(currentConditionNode);
                } else if (nextBranch.type !== 'else') {
                    nextBranch.previousConditionNode = currentConditionNode;
                } else {
                    nextBranch.previousConditionNode = currentConditionNode;
                }
            } else {
                const bodyResult = this.parseBranchBody(lines, branch, nodeCounter);
                mermaidCode += bodyResult.mermaidCode;

                if (bodyResult.firstNode) {
                    mermaidCode += `    ${branch.previousConditionNode} -->|No| ${bodyResult.firstNode}\n`;
                    branchEndNodes.push(...bodyResult.lastNodes);
                } else {
                    branchEndNodes.push(branch.previousConditionNode);
                }
            }
        }

        return {
            mermaidCode,
            lastNodes: this.uniqueNodes(branchEndNodes),
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
                lastNodes: []
            };
        }

        const result = this.parseCodeStructure(branchLines, 0, nodeCounter, true);
        return {
            mermaidCode: result.mermaidCode,
            firstNode: result.firstNode,
            lastNodes: this.getLastNodes(result)
        };
    }

    /**
     * Connect a list of previous nodes to a target node.
     */
    connectNodes(fromNodes, toNode) {
        let mermaidCode = '';
        for (const fromNode of fromNodes) {
            mermaidCode += `    ${fromNode} --> ${toNode}\n`;
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
        return [...new Set(nodes.filter(Boolean))];
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
            
            // Create a container for the diagram
            const diagramContainer = document.createElement('div');
            const diagramId = 'mermaid-diagram-' + Date.now();
            diagramContainer.id = diagramId;
            diagramContainer.className = 'mermaid';
            diagramContainer.textContent = mermaidCode;
            
            flowchartDiv.appendChild(diagramContainer);
            
            // Use mermaid.init to render the diagram
            await mermaid.init(undefined, diagramContainer);
            
            console.log('Flowchart rendered successfully');
        } catch (error) {
            console.error('Error rendering flowchart:', error);
            flowchartDiv.innerHTML = `
                <div style="padding: 20px; text-align: center; color: #666;">
                    <p>フローチャート生成エラー:</p>
                    <p style="font-size: 12px; margin-top: 10px;">${error.message}</p>
                    <p style="font-size: 10px; margin-top: 10px;">コードを確認してください</p>
                </div>
            `;
        }
    }

    /**
     * Clear flowchart
     */
    clearFlowchart() {
        document.getElementById('flowchart').innerHTML = '';
    }
}

// Export for use in other modules
window.FlowchartGenerator = FlowchartGenerator;
