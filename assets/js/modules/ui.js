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
        console.log('Initializing editors...');
        
        const pythonContainer = document.getElementById('pythonEditor');
        const commonTestContainer = document.getElementById('commonTestEditor');
        
        if (!pythonContainer) {
            throw new Error('Python editor container not found');
        }
        
        if (!commonTestContainer) {
            throw new Error('Common test editor container not found');
        }
        
        console.log('Creating Python editor...');
        this.pythonEditor = CodeMirror(pythonContainer, {
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
        console.log('Python editor created:', !!this.pythonEditor);

        console.log('Creating Common Test editor...');
        this.commonTestEditor = CodeMirror(commonTestContainer, {
            mode: 'text/plain',
            theme: 'material-darker',
            lineNumbers: true,
            lineWrapping: true,
            placeholder: '共通テスト用プログラム表記を入力してください...',
            viewportMargin: 10,
            scrollbarStyle: 'native'
        });
        console.log('Common Test editor created:', !!this.commonTestEditor);

        // Refresh editors to ensure proper sizing
        setTimeout(() => {
            if (this.pythonEditor) {
                this.pythonEditor.refresh();
                console.log('Python editor refreshed');
            }
            if (this.commonTestEditor) {
                this.commonTestEditor.refresh();
                console.log('Common test editor refreshed');
            }
        }, 100);
        
        // Test editors with sample text
        setTimeout(() => {
            this.testEditors();
        }, 200);
    }

    /**
     * Test if editors are working properly
     */
    testEditors() {
        console.log('Testing editors...');
        
        if (this.pythonEditor) {
            this.pythonEditor.setValue('# Test Python editor');
            const testValue = this.pythonEditor.getValue();
            console.log('Python editor test result:', testValue);
            this.pythonEditor.setValue('');
        }
        
        if (this.commonTestEditor) {
            this.commonTestEditor.setValue('# Test Common Test editor');
            const testValue = this.commonTestEditor.getValue();
            console.log('Common test editor test result:', testValue);
            this.commonTestEditor.setValue('');
        }
        
        console.log('Editor testing completed');
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
            console.log('Convert button found, adding event listener');
            convertBtn.addEventListener('click', async () => {
                console.log('Convert button clicked via event listener');
                await this.convert();
            });
        } else {
            console.error('Convert button not found!');
        }

        // Run button
        const runBtn = document.querySelector('.run-button');
        if (runBtn) {
            console.log('Run button found, adding event listener');
            runBtn.addEventListener('click', async () => {
                console.log('Run button clicked via event listener');
                await window.runCode();
            });
        } else {
            console.error('Run button not found!');
        }

        // Clear button
        const clearBtn = document.querySelector('.clear-button');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                console.log('Clear button clicked');
                this.clearAll();
            });
        }

        // Load sample button
        const loadSampleBtn = document.querySelector('.load-sample-button');
        if (loadSampleBtn) {
            loadSampleBtn.addEventListener('click', () => {
                console.log('Load sample button clicked');
                const sampleSelect = document.getElementById('sampleSelect');
                const selectedSample = sampleSelect.value;
                
                if (selectedSample) {
                    this.loadSampleCode(selectedSample);
                    console.log('Loaded sample:', selectedSample);
                } else {
                    console.log('No sample selected');
                    alert('サンプルを選択してください');
                }
            });
        }

        // Sample selector change event
        const sampleSelect = document.getElementById('sampleSelect');
        if (sampleSelect) {
            sampleSelect.addEventListener('change', (e) => {
                const selectedSample = e.target.value;
                if (selectedSample) {
                    console.log('Sample selected:', selectedSample);
                    this.loadSampleCode(selectedSample);
                }
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
     * Get sample codes collection
     */
    getSampleCodes() {
        return {
            'binary-search': {
                title: '二分探索',
                code: `# 二分探索の例
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
    print(i, " ", data[i])`
            },
            'bubble-sort': {
                title: 'バブルソート',
                code: `# バブルソートの例
data = [64, 34, 25, 12, 22, 11, 90]
n = len(data)

print("ソート前のデータ:")
for i in range(n):
    print(data[i], end=" ")
print()

# バブルソート
for i in range(n):
    for j in range(0, n - i - 1):
        if data[j] > data[j + 1]:
            # 要素を交換
            data[j], data[j + 1] = data[j + 1], data[j]

print("ソート後のデータ:")
for i in range(n):
    print(data[i], end=" ")
print()`
            },
            'linear-search': {
                title: '線形探索',
                code: `# 線形探索の例
data = [2, 3, 4, 10, 40]
print("検索する値を入力してください")
x = int(input())

# 線形探索
found = False
for i in range(len(data)):
    if data[i] == x:
        print(f"値 {x} は位置 {i} にあります")
        found = True
        break

if not found:
    print(f"値 {x} は見つかりませんでした")`
            },
            'factorial': {
                title: '階乗計算',
                code: `# 階乗計算の例
def factorial(n):
    if n == 0 or n == 1:
        return 1
    else:
        return n * factorial(n - 1)

print("階乗を計算する数を入力してください")
num = int(input())

if num < 0:
    print("負の数の階乗は定義されません")
else:
    result = factorial(num)
    print(f"{num}! = {result}")`
            },
            'fibonacci': {
                title: 'フィボナッチ数列',
                code: `# フィボナッチ数列の例
print("フィボナッチ数列の項数を入力してください")
n = int(input())

# 最初の2項
a, b = 0, 1

print("フィボナッチ数列:")
if n >= 1:
    print(a, end=" ")
if n >= 2:
    print(b, end=" ")

for i in range(2, n):
    c = a + b
    print(c, end=" ")
    a, b = b, c

print()`
            },
            'prime-check': {
                title: '素数判定',
                code: `# 素数判定の例
def is_prime(n):
    if n <= 1:
        return False
    if n <= 3:
        return True
    if n % 2 == 0 or n % 3 == 0:
        return False
    
    i = 5
    while i * i <= n:
        if n % i == 0 or n % (i + 2) == 0:
            return False
        i += 6
    return True

print("素数かどうか調べる数を入力してください")
num = int(input())

if is_prime(num):
    print(f"{num} は素数です")
else:
    print(f"{num} は素数ではありません")`
            }
        };
    }

    /**
     * Load example code
     */
    loadExample() {
        // デフォルトで二分探索を読み込み
        this.loadSampleCode('binary-search');
    }

    /**
     * Load specific sample code
     */
    loadSampleCode(sampleKey) {
        const samples = this.getSampleCodes();
        const sample = samples[sampleKey];
        
        if (!sample) {
            console.error('Sample not found:', sampleKey);
            return;
        }
        
        console.log('Loading sample:', sample.title);
        this.pythonEditor.setValue(sample.code);
        
        // Auto-convert after loading sample
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
        console.log('=== Convert function called ===');
        
        try {
            const direction = document.getElementById('conversionDirection').value;
            console.log('Direction:', direction);
            
            // Check if converter is available
            if (!window.converter) {
                throw new Error('Converter not initialized');
            }
            
            // Check if editors are available
            if (!this.pythonEditor) {
                throw new Error('Python editor not initialized');
            }
            
            if (!this.commonTestEditor) {
                throw new Error('Common test editor not initialized');
            }
            
            if (direction === 'pythonToCommon') {
                const pythonCode = this.pythonEditor.getValue();
                console.log('Python code length:', pythonCode.length);
                console.log('Python code preview:', pythonCode.substring(0, 100));
                
                if (!pythonCode.trim()) {
                    console.log('No Python code to convert');
                    return;
                }
                
                console.log('Calling converter.pythonToCommonTest()...');
                const converted = window.converter.pythonToCommonTest(pythonCode);
                console.log('Conversion successful, result length:', converted.length);
                console.log('Conversion result preview:', converted.substring(0, 100));
                
                this.commonTestEditor.setValue(converted);
                console.log('Set converted text to common test editor');
                
            } else {
                const commonTestCode = this.commonTestEditor.getValue();
                console.log('Common test code length:', commonTestCode.length);
                console.log('Common test code preview:', commonTestCode.substring(0, 100));
                
                if (!commonTestCode.trim()) {
                    console.log('No common test code to convert');
                    return;
                }
                
                console.log('Calling converter.commonTestToPython()...');
                const converted = window.converter.commonTestToPython(commonTestCode);
                console.log('Conversion successful, result length:', converted.length);
                console.log('Conversion result preview:', converted.substring(0, 100));
                
                this.pythonEditor.setValue(converted);
                console.log('Set converted text to python editor');
            }
            
            // Generate flowchart
            try {
                if (window.flowchartGenerator) {
                    console.log('Generating flowchart...');
                    await window.flowchartGenerator.generateFlowchart(this.pythonEditor.getValue());
                    console.log('Flowchart generated successfully');
                }
            } catch (flowchartError) {
                console.error('Flowchart generation error:', flowchartError);
                // Don't stop conversion process for flowchart errors
            }
            
            console.log('=== Convert function completed successfully ===');
            
        } catch (error) {
            console.error('Conversion error:', error);
            const errorMsg = '変換エラー: ' + error.message;
            document.getElementById('output').textContent = errorMsg;
            alert(errorMsg);
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