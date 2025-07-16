/**
 * UI Management and Event Handlers
 */
class UIManager {
    constructor() {
        this.pythonEditor = null;
        this.commonTestEditor = null;
    }

    /**
     * Initialize CodeMirror editors
     */
    initializeEditors() {
        this.pythonEditor = CodeMirror(document.getElementById('pythonEditor'), {
            mode: 'python',
            theme: 'material-darker',
            lineNumbers: true,
            matchBrackets: true,
            indentUnit: 4,
            indentWithTabs: false,
            lineWrapping: true,
            placeholder: 'Pythonコードを入力してください...',
            viewportMargin: 10,
            scrollbarStyle: 'native'
        });

        this.commonTestEditor = CodeMirror(document.getElementById('commonTestEditor'), {
            mode: 'text/plain',
            theme: 'material-darker',
            lineNumbers: true,
            lineWrapping: true,
            placeholder: '共通テスト用プログラム表記を入力してください...',
            viewportMargin: 10,
            scrollbarStyle: 'native'
        });

        // Refresh editors to ensure proper sizing
        setTimeout(() => {
            this.pythonEditor.refresh();
            this.commonTestEditor.refresh();
        }, 100);
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        console.log('Setting up event listeners');
        
        // Direction selector
        document.getElementById('conversionDirection').addEventListener('change', (e) => {
            this.updatePanelLabels(e.target.value);
        });

        // Convert button
        const convertBtn = document.querySelector('.convert-button');
        if (convertBtn) {
            convertBtn.addEventListener('click', async () => {
                console.log('Convert button clicked');
                await this.convert();
            });
        }

        // Run button
        const runBtn = document.querySelector('.run-button');
        if (runBtn) {
            runBtn.addEventListener('click', async () => {
                console.log('Run button clicked');
                await window.runCode();
            });
        }

        // Clear button
        const clearBtn = document.querySelector('.clear-button');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                console.log('Clear button clicked');
                this.clearAll();
            });
        }

        // Load example button
        const loadExampleBtn = document.querySelector('.load-example-button');
        if (loadExampleBtn) {
            loadExampleBtn.addEventListener('click', () => {
                console.log('Load example button clicked');
                this.loadExample();
            });
        }

        // Share generate button
        const shareGenerateBtn = document.querySelector('.share-generate-button');
        if (shareGenerateBtn) {
            shareGenerateBtn.addEventListener('click', () => {
                console.log('Share generate button clicked');
                this.shareCode();
            });
        }

        // Share copy button
        const shareCopyBtn = document.querySelector('.share-copy-button');
        if (shareCopyBtn) {
            shareCopyBtn.addEventListener('click', async () => {
                console.log('Share copy button clicked');
                await this.copyShareUrl();
            });
        }

        // Python copy button
        const pythonCopyBtn = document.querySelector('.python-copy-button');
        if (pythonCopyBtn) {
            pythonCopyBtn.addEventListener('click', async () => {
                console.log('Python copy button clicked');
                await this.copyToClipboard('pythonCode');
            });
        }

        // Common test copy button
        const commonCopyBtn = document.querySelector('.common-copy-button');
        if (commonCopyBtn) {
            commonCopyBtn.addEventListener('click', async () => {
                console.log('Common test copy button clicked');
                await this.copyToClipboard('commonTestCode');
            });
        }

        // Enter key in input dialog
        document.getElementById('userInput').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                if (window.executor) {
                    window.executor.submitInput();
                }
            }
        });
    }

    /**
     * Update panel labels based on conversion direction
     */
    updatePanelLabels(direction) {
        const leftLabel = document.getElementById('leftPanelLabel');
        const rightLabel = document.getElementById('rightPanelLabel');
        
        if (direction === 'pythonToCommon') {
            leftLabel.textContent = 'Python';
            rightLabel.textContent = '共通テスト用プログラム表記';
        } else {
            leftLabel.textContent = '共通テスト用プログラム表記';
            rightLabel.textContent = 'Python';
        }
    }

    /**
     * Copy text to clipboard
     */
    async copyToClipboard(elementId) {
        let text = '';
        if (elementId === 'pythonCode') {
            text = this.pythonEditor.getValue();
        } else if (elementId === 'commonTestCode') {
            text = this.commonTestEditor.getValue();
        }
        
        try {
            await navigator.clipboard.writeText(text);
            
            // Show feedback
            const button = event.target;
            const originalText = button.textContent;
            button.textContent = 'コピー済み!';
            setTimeout(() => {
                button.textContent = originalText;
            }, 2000);
        } catch (error) {
            console.error('Failed to copy text: ', error);
        }
    }

    /**
     * Clear all content
     */
    clearAll() {
        this.pythonEditor.setValue('');
        this.commonTestEditor.setValue('');
        if (window.flowchartGenerator) {
            window.flowchartGenerator.clearFlowchart();
        }
        document.getElementById('output').textContent = '';
        document.getElementById('shareUrl').value = '';
    }

    /**
     * Clear output only
     */
    clearOutput() {
        document.getElementById('output').textContent = '';
    }

    /**
     * Load example code
     */
    loadExample() {
        const examplePython = `# 二分探索の例
data = [3, 18, 29, 33, 48, 52, 62, 77, 89, 97]
kazu = len(data)
print("0～99の数字を入力してください")
atai = int(input())
hidari = 0
migi = kazu - 1
owari = 0

while hidari <= migi and owari == 0:
    aida = (hidari + migi) // 2
    if data[aida] == atai:
        print(atai, "は", aida, "番目にありました")
        owari = 1
    elif data[aida] < atai:
        hidari = aida + 1
    else:
        migi = aida - 1

if owari == 0:
    print(atai, "は見つかりませんでした")

print("添字", " ", "要素")
for i in range(0, kazu):
    print(i, " ", data[i])`;

        this.pythonEditor.setValue(examplePython);
        // Auto-convert after loading example
        setTimeout(async () => {
            if (window.converter) {
                await this.convert();
            }
        }, 100);
    }

    /**
     * Convert code based on selected direction
     */
    async convert() {
        const direction = document.getElementById('conversionDirection').value;
        
        // Check if converter is available
        if (!window.converter) {
            console.error('Converter not initialized');
            return;
        }
        
        try {
            if (direction === 'pythonToCommon') {
                const pythonCode = this.pythonEditor.getValue();
                console.log('Converting Python to Common Test:', pythonCode.substring(0, 100) + '...');
                const converted = window.converter.pythonToCommonTest(pythonCode);
                console.log('Conversion result:', converted.substring(0, 100) + '...');
                this.commonTestEditor.setValue(converted);
            } else {
                const commonTestCode = this.commonTestEditor.getValue();
                console.log('Converting Common Test to Python:', commonTestCode.substring(0, 100) + '...');
                const converted = window.converter.commonTestToPython(commonTestCode);
                console.log('Conversion result:', converted.substring(0, 100) + '...');
                this.pythonEditor.setValue(converted);
            }
            
            // Generate flowchart
            if (window.flowchartGenerator) {
                await window.flowchartGenerator.generateFlowchart(this.pythonEditor.getValue());
            }
        } catch (error) {
            console.error('Conversion error:', error);
            document.getElementById('output').textContent = '変換エラー: ' + error.message;
        }
    }

    /**
     * Generate share URL
     */
    shareCode() {
        const pythonCode = this.pythonEditor.getValue();
        const commonTestCode = this.commonTestEditor.getValue();
        const direction = document.getElementById('conversionDirection').value;
        
        const data = {
            python: pythonCode,
            common: commonTestCode,
            direction: direction
        };
        
        const compressed = btoa(encodeURIComponent(JSON.stringify(data)));
        const url = window.location.origin + window.location.pathname + '#' + compressed;
        
        document.getElementById('shareUrl').value = url;
    }

    /**
     * Copy share URL to clipboard
     */
    async copyShareUrl() {
        const shareUrl = document.getElementById('shareUrl');
        
        try {
            await navigator.clipboard.writeText(shareUrl.value);
            
            const button = event.target;
            const originalText = button.textContent;
            button.textContent = 'コピー済み!';
            setTimeout(() => {
                button.textContent = originalText;
            }, 2000);
        } catch (error) {
            console.error('Failed to copy share URL: ', error);
        }
    }

    /**
     * Load code from URL
     */
    async loadFromUrl() {
        if (window.location.hash) {
            try {
                const compressed = window.location.hash.substring(1);
                const data = JSON.parse(decodeURIComponent(atob(compressed)));
                
                if (data.python) {
                    this.pythonEditor.setValue(data.python);
                }
                if (data.common) {
                    this.commonTestEditor.setValue(data.common);
                }
                if (data.direction) {
                    document.getElementById('conversionDirection').value = data.direction;
                    this.updatePanelLabels(data.direction);
                }
                
                if (window.flowchartGenerator) {
                    await window.flowchartGenerator.generateFlowchart(this.pythonEditor.getValue());
                }
            } catch (e) {
                console.error('Failed to load from URL:', e);
            }
        }
    }

    /**
     * Get editor values
     */
    getPythonCode() {
        return this.pythonEditor.getValue();
    }

    getCommonTestCode() {
        return this.commonTestEditor.getValue();
    }
}

// Export for use in other modules
window.UIManager = UIManager;