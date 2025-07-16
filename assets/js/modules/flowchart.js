/**
 * Flowchart Generator using Mermaid.js
 */
class FlowchartGenerator {
    constructor() {
        // Initialize mermaid
        mermaid.initialize({ startOnLoad: true });
    }

    /**
     * Generate flowchart from Python code
     */
    generateFlowchart(pythonCode) {
        const lines = pythonCode.split('\n').filter(line => line.trim() !== '');
        
        let mermaidCode = 'graph TD\n';
        let nodeId = 0;
        let previousNode = null;
        const stack = [];
        
        mermaidCode += '    Start[開始] --> ';
        previousNode = 'Start';
        
        for (const line of lines) {
            const trimmed = line.trim();
            
            if (trimmed.startsWith('#')) continue;
            
            nodeId++;
            const currentNode = 'node' + nodeId;
            
            if (trimmed.startsWith('if ') || trimmed.startsWith('elif ')) {
                const condition = trimmed.substring(trimmed.indexOf(' ') + 1, trimmed.length - 1);
                mermaidCode += `${currentNode}{${this.escapeForMermaid(condition)}}\n`;
                if (previousNode) {
                    mermaidCode += `    ${previousNode} --> ${currentNode}\n`;
                }
                stack.push({type: 'if', node: currentNode});
            } else if (trimmed.startsWith('while ')) {
                const condition = trimmed.substring(6, trimmed.length - 1);
                mermaidCode += `${currentNode}{${this.escapeForMermaid(condition)}}\n`;
                if (previousNode) {
                    mermaidCode += `    ${previousNode} --> ${currentNode}\n`;
                }
                stack.push({type: 'while', node: currentNode});
            } else if (trimmed.startsWith('for ')) {
                const loopDesc = this.escapeForMermaid(trimmed);
                mermaidCode += `${currentNode}[${loopDesc}]\n`;
                if (previousNode) {
                    mermaidCode += `    ${previousNode} --> ${currentNode}\n`;
                }
                stack.push({type: 'for', node: currentNode});
            } else if (trimmed === 'else:') {
                // Handle else
                mermaidCode += `${currentNode}[else]\n`;
                if (previousNode) {
                    mermaidCode += `    ${previousNode} --> ${currentNode}\n`;
                }
            } else {
                // Regular statement
                const statement = this.escapeForMermaid(trimmed);
                mermaidCode += `${currentNode}[${statement}]\n`;
                if (previousNode) {
                    mermaidCode += `    ${previousNode} --> ${currentNode}\n`;
                }
            }
            
            previousNode = currentNode;
        }
        
        mermaidCode += 'End[終了]\n';
        mermaidCode += `    ${previousNode} --> End\n`;
        
        this.renderFlowchart(mermaidCode);
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
    renderFlowchart(mermaidCode) {
        const flowchartDiv = document.getElementById('flowchart');
        flowchartDiv.innerHTML = '<div class="mermaid">' + mermaidCode + '</div>';
        
        // Re-initialize mermaid for the new content
        try {
            mermaid.init(undefined, flowchartDiv.querySelector('.mermaid'));
        } catch (error) {
            console.error('Error rendering flowchart:', error);
            flowchartDiv.innerHTML = '<p>フローチャート生成エラー</p>';
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