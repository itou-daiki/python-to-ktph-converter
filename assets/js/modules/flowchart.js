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
                // Handle if statement with branching
                mermaidCode += `    ${currentNode}{${nodeText}}\\n`;
                
                // Connect from previous nodes
                if (currentLastNodes.length > 0) {
                    for (const prevNode of currentLastNodes) {
                        mermaidCode += `    ${prevNode} --> ${currentNode}\\n`;
                    }
                }

                // Find the if block and else block
                const ifBlockEnd = this.findBlockEnd(lines, i + 1, indentLevel);
                const elseIndex = this.findElseStatement(lines, i, indentLevel);
                
                let branchEndNodes = [];

                // Process if block (Yes branch)
                if (i + 1 < (elseIndex || ifBlockEnd)) {
                    const ifLines = lines.slice(i + 1, elseIndex || ifBlockEnd);
                    if (ifLines.length > 0) {
                        const ifResult = this.parseCodeStructure(ifLines, 0, nodeCounter, true);
                        mermaidCode += ifResult.mermaidCode;
                        if (ifResult.firstNode) {
                            mermaidCode += `    ${currentNode} -->|Yes| ${ifResult.firstNode}\\n`;
                        }
                        if (ifResult.lastNode) {
                            branchEndNodes.push(ifResult.lastNode);
                        }
                    } else {
                        // Empty if block - connect directly
                        branchEndNodes.push(currentNode);
                    }
                } else {
                    // Empty if block
                    branchEndNodes.push(currentNode);
                }

                // Process else block (No branch) if exists
                if (elseIndex && elseIndex < lines.length) {
                    const elseBlockEnd = this.findBlockEnd(lines, elseIndex + 1, indentLevel);
                    const elseLines = lines.slice(elseIndex + 1, elseBlockEnd);
                    if (elseLines.length > 0) {
                        const elseResult = this.parseCodeStructure(elseLines, 0, nodeCounter, true);
                        mermaidCode += elseResult.mermaidCode;
                        if (elseResult.firstNode) {
                            mermaidCode += `    ${currentNode} -->|No| ${elseResult.firstNode}\\n`;
                        }
                        if (elseResult.lastNode) {
                            branchEndNodes.push(elseResult.lastNode);
                        }
                    } else {
                        // Empty else block
                        branchEndNodes.push(currentNode);
                    }
                    i = elseBlockEnd - 1;
                } else {
                    // No else block - the No branch continues to next statement
                    branchEndNodes.push(currentNode);
                    i = ifBlockEnd - 1;
                }

                currentLastNodes = branchEndNodes;

            } else if (line.startsWith('for ') || line.startsWith('while ')) {
                // Handle loops
                mermaidCode += `    ${currentNode}{${nodeText}}\\n`;
                
                // Connect from previous nodes
                if (currentLastNodes.length > 0) {
                    for (const prevNode of currentLastNodes) {
                        mermaidCode += `    ${prevNode} --> ${currentNode}\\n`;
                    }
                }

                // Find loop body
                const loopBlockEnd = this.findBlockEnd(lines, i + 1, indentLevel);
                const loopLines = lines.slice(i + 1, loopBlockEnd);
                
                if (loopLines.length > 0) {
                    const loopResult = this.parseCodeStructure(loopLines, 0, nodeCounter, true);
                    mermaidCode += loopResult.mermaidCode;
                    if (loopResult.firstNode) {
                        mermaidCode += `    ${currentNode} -->|継続| ${loopResult.firstNode}\\n`;
                        if (loopResult.lastNode) {
                            // Loop back to condition
                            mermaidCode += `    ${loopResult.lastNode} --> ${currentNode}\\n`;
                        }
                    }
                }
                
                // Loop exits to next statement
                currentLastNodes = [currentNode];
                i = loopBlockEnd - 1;

            } else {
                // Regular statement
                if (line.includes('print(') || line.includes('input(')) {
                    mermaidCode += `    ${currentNode}[[${nodeText}]]\\n`;  // I/O shape
                } else {
                    mermaidCode += `    ${currentNode}[${nodeText}]\\n`;  // Process shape
                }
                
                // Connect from previous nodes
                if (currentLastNodes.length > 0) {
                    for (const prevNode of currentLastNodes) {
                        mermaidCode += `    ${prevNode} --> ${currentNode}\\n`;
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
        
        // Convert if statements
        const ifMatch = converted.match(/if\s+(.+)\s*:/);
        if (ifMatch) {
            const condition = ifMatch[1];
            return `もし ${condition} ならば:`;
        }
        
        // Convert elif statements
        const elifMatch = converted.match(/elif\s+(.+)\s*:/);
        if (elifMatch) {
            const condition = elifMatch[1];
            return `そうでなくもし ${condition} ならば:`;
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
        // Only escape truly problematic characters for Mermaid, preserve Japanese content
        return text
            .replace(/"/g, "'")         // Replace double quotes with single quotes
            .replace(/\[/g, '［')       // Replace with full-width brackets
            .replace(/\]/g, '］')
            .replace(/\{/g, '｛')       // Replace with full-width braces
            .replace(/\}/g, '｝')
            .replace(/\(/g, '（')       // Replace with full-width parentheses
            .replace(/\)/g, '）')
            .replace(/:/g, '：')        // Replace with full-width colon
            .replace(/->/g, '→')        // Replace arrows
            // Don't escape < and > symbols - use full-width versions to avoid HTML escaping
            .replace(/</g, '＜')        // Replace < with full-width <
            .replace(/>/g, '＞')        // Replace > with full-width >
            .replace(/&/g, '＆')        // Replace & with full-width &
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