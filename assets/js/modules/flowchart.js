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
     * Generate flowchart from Python code
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
                
                // Simplify the text for display and handle special cases
                let nodeText = this.simplifyCodeText(trimmed);
                nodeText = this.escapeForMermaid(nodeText);
                
                if (trimmed.includes('if ') || trimmed.includes('while ')) {
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
     * Simplify code text for flowchart display
     */
    simplifyCodeText(text) {
        // Handle common Python patterns
        let simplified = text;
        
        // Simplify variable assignments with lists
        if (simplified.includes(' = [') && simplified.includes(']')) {
            const varName = simplified.split('=')[0].trim();
            simplified = `${varName} = リスト`;
        }
        
        // Simplify print statements
        if (simplified.includes('print(')) {
            simplified = '出力';
        }
        
        // Simplify input statements
        if (simplified.includes('input(')) {
            simplified = '入力';
        }
        
        // Simplify len() calls
        if (simplified.includes('len(')) {
            simplified = simplified.replace(/len\([^)]+\)/g, '長さ');
        }
        
        // Truncate if still too long
        if (simplified.length > 25) {
            simplified = simplified.substring(0, 22) + '...';
        }
        
        return simplified;
    }

    /**
     * Escape special characters for Mermaid
     */
    escapeForMermaid(text) {
        return text
            .replace(/"/g, '#quot;')
            .replace(/'/g, '#apos;')
            .replace(/</g, '#lt;')
            .replace(/>/g, '#gt;')
            .replace(/&/g, '#amp;')
            .replace(/\[/g, '#91;')  // Escape square brackets
            .replace(/\]/g, '#93;')
            .replace(/\{/g, '#123;') // Escape curly braces
            .replace(/\}/g, '#125;')
            .replace(/\(/g, '#40;')  // Escape parentheses
            .replace(/\)/g, '#41;')
            .replace(/=/g, '#61;')   // Escape equals sign
            .replace(/,/g, '#44;')   // Escape commas
            .replace(/;/g, '#59;');  // Escape semicolons
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