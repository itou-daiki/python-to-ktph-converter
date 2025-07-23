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
            let nodeId = 0;
            let previousNode = 'Start';
            
            mermaidCode += '    Start([開始])\n';
            
            for (let i = 0; i < Math.min(lines.length, 10); i++) { // Limit to 10 nodes for simplicity
                const trimmed = lines[i].trim();
                nodeId++;
                const currentNode = 'N' + nodeId;
                
                // Convert Python code to Common Test style for display
                let nodeText = this.convertPythonToCommonTestStyle(trimmed);
                nodeText = this.escapeForMermaid(nodeText);
                
                if (trimmed.includes('if ') || trimmed.includes('while ') || trimmed.includes('for ')) {
                    mermaidCode += `    ${currentNode}{${nodeText}}\n`;
                } else if (trimmed.includes('print(') || trimmed.includes('input(')) {
                    mermaidCode += `    ${currentNode}[[${nodeText}]]\n`;  // Subroutine shape for I/O
                } else {
                    mermaidCode += `    ${currentNode}[${nodeText}]\n`;
                }
                
                mermaidCode += `    ${previousNode} --> ${currentNode}\n`;
                previousNode = currentNode;
            }
            
            mermaidCode += '    End([終了])\n';
            mermaidCode += `    ${previousNode} --> End\n`;
            
            console.log('Generated mermaid code:', mermaidCode);
            await this.renderFlowchart(mermaidCode);
        } catch (error) {
            console.error('Error generating flowchart:', error);
        }
    }

    /**
     * Convert Python code to Common Test style notation for flowchart display
     */
    convertPythonToCommonTestStyle(pythonCode) {
        let converted = pythonCode.trim();
        
        // Convert for loops to Common Test style
        const forMatch = converted.match(/for\s+(\w+)\s+in\s+range\s*\((\d+),\s*(\d+)(?:,\s*(\d+))?\s*\)\s*:/);
        if (forMatch) {
            const variable = forMatch[1];
            const start = forMatch[2];
            const end = parseInt(forMatch[3]) - 1; // range is exclusive of end
            const step = forMatch[4] || '1';
            return `${variable} を ${start} から ${end} まで ${step} ずつ増やしながら繰り返す`;
        }
        
        // Convert while loops
        const whileMatch = converted.match(/while\s+(.+)\s*:/);
        if (whileMatch) {
            const condition = whileMatch[1];
            return `${condition} の間繰り返す`;
        }
        
        // Convert if statements
        const ifMatch = converted.match(/if\s+(.+)\s*:/);
        if (ifMatch) {
            const condition = ifMatch[1];
            return `もし ${condition} ならば`;
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