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
                    useMaxWidth: true,
                    htmlLabels: true
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
                
                // Simplify the text for display
                let nodeText = trimmed.length > 30 ? trimmed.substring(0, 30) + '...' : trimmed;
                nodeText = this.escapeForMermaid(nodeText);
                
                if (trimmed.includes('if ') || trimmed.includes('while ')) {
                    mermaidCode += `    ${currentNode}{${nodeText}}\n`;
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
     * Escape special characters for Mermaid
     */
    escapeForMermaid(text) {
        return text
            .replace(/"/g, '#quot;')
            .replace(/'/g, '#apos;')
            .replace(/</g, '#lt;')
            .replace(/>/g, '#gt;')
            .replace(/&/g, '#amp;');
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