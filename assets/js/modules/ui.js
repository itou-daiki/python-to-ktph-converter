/**
 * UI Management and Event Handlers
 */
class UIManager {
    constructor() {
        this.pythonEditor = null;
        this.commonTestEditor = null;
        this.samplesConfig = null;
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
            viewportMargin: 50, // Show extra lines above/below viewport
            scrollbarStyle: 'native',
            autoCloseBrackets: true,
            autoCloseTags: true,
            height: 'auto', // Auto height adjustment
            extraKeys: {
                'Ctrl-Space': 'autocomplete',
                'End': function(cm) {
                    // Custom End key behavior to ensure last line is visible
                    const lastLine = cm.lastLine();
                    cm.setCursor(lastLine, cm.getLine(lastLine).length);
                    cm.scrollIntoView(null, 50);
                }
            }
        });
        console.log('Python editor created:', !!this.pythonEditor);

        console.log('Creating Common Test editor...');
        this.commonTestEditor = CodeMirror(commonTestContainer, {
            mode: 'commontest',
            theme: 'material-darker',
            lineNumbers: true,
            lineWrapping: true,
            placeholder: '共通テスト用プログラム表記を入力してください...',
            viewportMargin: 50, // Show extra lines above/below viewport
            scrollbarStyle: 'native',
            autoCloseBrackets: true,
            height: 'auto', // Auto height adjustment
            extraKeys: {
                'Ctrl-Space': 'autocomplete',
                'End': function(cm) {
                    // Custom End key behavior to ensure last line is visible
                    const lastLine = cm.lastLine();
                    cm.setCursor(lastLine, cm.getLine(lastLine).length);
                    cm.scrollIntoView(null, 50);
                }
            }
        });
        console.log('Common Test editor created:', !!this.commonTestEditor);

        // Refresh editors to ensure proper sizing
        setTimeout(() => {
            this.refreshEditors();
        }, 100);
        
        // Additional refresh after layout stabilizes
        setTimeout(() => {
            this.refreshEditors();
        }, 500);
        
        // Also refresh on window resize
        window.addEventListener('resize', () => {
            setTimeout(() => {
                this.refreshEditors();
            }, 100);
        });
        
        // Refresh editors when they receive focus
        this.pythonEditor.on('focus', () => {
            setTimeout(() => {
                this.pythonEditor.refresh();
            }, 50);
        });
        
        this.commonTestEditor.on('focus', () => {
            setTimeout(() => {
                this.commonTestEditor.refresh();
            }, 50);
        });
        
        // Refresh editors when content changes significantly
        this.pythonEditor.on('change', (cm, change) => {
            if (change.text.length > 1 || change.removed.length > 1) {
                setTimeout(() => {
                    this.pythonEditor.refresh();
                }, 100);
            }
        });
        
        this.commonTestEditor.on('change', (cm, change) => {
            if (change.text.length > 1 || change.removed.length > 1) {
                setTimeout(() => {
                    this.commonTestEditor.refresh();
                }, 100);
            }
        });
        
        // Test editors with sample text
        setTimeout(() => {
            this.testEditors();
        }, 200);
    }

    /**
     * Refresh editors for proper sizing and scrolling
     */
    refreshEditors() {
        if (this.pythonEditor) {
            this.pythonEditor.refresh();
            // Set size to null for both width and height to use CSS
            this.pythonEditor.setSize(null, null);
            // Force scrollbar recalculation
            this.pythonEditor.getScrollInfo();
            // Ensure the last line is visible by scrolling to end then back to position
            const lastLine = this.pythonEditor.lastLine();
            if (lastLine > 0) {
                this.pythonEditor.scrollIntoView({line: lastLine, ch: 0}, 50);
                // Give a moment then scroll back to top for better UX
                setTimeout(() => {
                    this.pythonEditor.scrollTo(null, 0);
                }, 100);
            }
            console.log('Python editor refreshed with enhanced scrolling');
        }
        if (this.commonTestEditor) {
            this.commonTestEditor.refresh();
            // Set size to null for both width and height to use CSS
            this.commonTestEditor.setSize(null, null);
            // Force scrollbar recalculation
            this.commonTestEditor.getScrollInfo();
            // Ensure the last line is visible by scrolling to end then back to position
            const lastLine = this.commonTestEditor.lastLine();
            if (lastLine > 0) {
                this.commonTestEditor.scrollIntoView({line: lastLine, ch: 0}, 50);
                // Give a moment then scroll back to top for better UX
                setTimeout(() => {
                    this.commonTestEditor.scrollTo(null, 0);
                }, 100);
            }
            console.log('Common test editor refreshed with enhanced scrolling');
        }
        
        // Additional refresh with forced recalculation
        setTimeout(() => {
            if (this.pythonEditor) {
                this.pythonEditor.refresh();
                this.pythonEditor.setSize(null, null);
                // Force CodeMirror to recalculate viewport
                this.pythonEditor.operation(() => {
                    this.pythonEditor.refresh();
                });
            }
            if (this.commonTestEditor) {
                this.commonTestEditor.refresh();
                this.commonTestEditor.setSize(null, null);
                // Force CodeMirror to recalculate viewport
                this.commonTestEditor.operation(() => {
                    this.commonTestEditor.refresh();
                });
            }
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
     * Initialize sample configuration
     */
    async initializeSamples() {
        try {
            const response = await fetch('Sample/samples.json');
            this.samplesConfig = await response.json();
            this.populateSampleDropdown();
        } catch (error) {
            console.error('Failed to load samples configuration:', error);
            // Fallback to inline samples if JSON loading fails
            this.samplesConfig = this.getFallbackSamplesConfig();
            this.populateSampleDropdown();
        }
    }

    /**
     * Populate sample dropdown from JSON config
     */
    populateSampleDropdown() {
        const sampleSelect = document.getElementById('sampleSelect');
        if (!sampleSelect || !this.samplesConfig) return;
        
        // Clear existing options except the first one
        while (sampleSelect.children.length > 1) {
            sampleSelect.removeChild(sampleSelect.lastChild);
        }
        
        // Add options from configuration
        this.samplesConfig.samples.forEach(sample => {
            const option = document.createElement('option');
            option.value = sample.id;
            option.textContent = sample.title;
            option.title = sample.description;
            sampleSelect.appendChild(option);
        });
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        console.log('Setting up event listeners');
        
        // Check if the old direction selector exists (for backward compatibility)
        const directionSelector = document.getElementById('conversionDirection');
        if (directionSelector) {
            // Set initial panel labels based on default direction
            const defaultDirection = directionSelector.value;
            this.updatePanelLabels(defaultDirection);
            
            // Direction selector
            directionSelector.addEventListener('change', (e) => {
                this.updatePanelLabels(e.target.value);
            });
        }

        // Convert buttons (Python to Common and Common to Python)
        const convertRightBtn = document.querySelector('.convert-button-right');
        const convertLeftBtn = document.querySelector('.convert-button-left');
        
        // Convert buttons use onclick attributes in HTML, no event listeners needed

        // Run button
        const runBtn = document.querySelector('.run-button');
        if (runBtn) {
            // Remove any existing event listeners to prevent duplicates
            runBtn.onclick = null;
            runBtn.replaceWith(runBtn.cloneNode(true));
            // Re-get the button reference after cloning
            const newRunBtn = document.querySelector('.run-button');
            newRunBtn.addEventListener('click', async () => {
                await window.runCode();
            });
        }

        // Clear button
        const clearBtn = document.querySelector('.clear-button');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearAll();
            });
        }

        // Load sample button
        const loadSampleBtn = document.querySelector('.load-sample-button');
        if (loadSampleBtn) {
            loadSampleBtn.addEventListener('click', () => {
                const sampleSelect = document.getElementById('sampleSelect');
                const selectedSample = sampleSelect.value;
                
                if (selectedSample) {
                    this.loadSampleCode(selectedSample);
                } else {
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
                    this.loadSampleCode(selectedSample);
                }
            });
        }

        // Share generate button
        const shareGenerateBtn = document.querySelector('.share-generate-button');
        if (shareGenerateBtn) {
            shareGenerateBtn.addEventListener('click', () => {
                this.shareCode();
            });
        }

        // Share copy button
        const shareCopyBtn = document.querySelector('.share-copy-button');
        if (shareCopyBtn) {
            shareCopyBtn.addEventListener('click', async (event) => {
                await this.copyShareUrl(event.target);
            });
        }

        // Python copy button
        const pythonCopyBtn = document.querySelector('.python-copy-button');
        if (pythonCopyBtn) {
            pythonCopyBtn.addEventListener('click', async (event) => {
                await this.copyToClipboard('pythonCode', event.target);
            });
        }

        // Common test copy button
        const commonCopyBtn = document.querySelector('.common-copy-button');
        if (commonCopyBtn) {
            commonCopyBtn.addEventListener('click', async (event) => {
                await this.copyToClipboard('commonTestCode', event.target);
            });
        }

        // QR toggle button
        const qrToggleBtn = document.getElementById('qrToggleButton');
        if (qrToggleBtn) {
            qrToggleBtn.addEventListener('click', () => {
                this.toggleQRCode();
            });
        }

        // Enter key in input dialog (remove existing listener first to prevent duplicates)
        const userInput = document.getElementById('userInput');
        userInput.removeEventListener('keypress', this.handleUserInputKeypress);
        this.handleUserInputKeypress = (e) => {
            if (e.key === 'Enter') {
                if (window.executor) {
                    window.executor.submitInput();
                }
            }
        };
        userInput.addEventListener('keypress', this.handleUserInputKeypress);
        
        // Hash change event listener for URL sharing
        window.addEventListener('hashchange', () => {
            this.loadFromUrl();
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
    async copyToClipboard(elementId, buttonElement) {
        let text = '';
        if (elementId === 'pythonCode') {
            text = this.pythonEditor.getValue();
        } else if (elementId === 'commonTestCode') {
            text = this.commonTestEditor.getValue();
        }
        
        try {
            await navigator.clipboard.writeText(text);
            
            // Show feedback
            if (buttonElement) {
                const originalText = buttonElement.textContent;
                buttonElement.textContent = 'コピー済み!';
                setTimeout(() => {
                    buttonElement.textContent = originalText;
                }, 2000);
            }
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
        
        // Hide the share URL link
        const shareUrlLink = document.getElementById('shareUrlLink');
        if (shareUrlLink) {
            shareUrlLink.style.display = 'none';
        }
        
        // Hide QR code elements
        const qrToggleButton = document.getElementById('qrToggleButton');
        if (qrToggleButton) {
            qrToggleButton.style.display = 'none';
            qrToggleButton.textContent = '📱 QR';
        }
        
        const qrCodeContainer = document.getElementById('qrCodeContainer');
        if (qrCodeContainer) {
            qrCodeContainer.style.display = 'none';
        }
        
        const qrCodeDisplay = document.getElementById('qrCodeDisplay');
        if (qrCodeDisplay) {
            qrCodeDisplay.innerHTML = '';
        }
    }

    /**
     * Clear output only
     */
    clearOutput() {
        document.getElementById('output').textContent = '';
    }

    /**
     * Get fallback samples configuration
     */
    getFallbackSamplesConfig() {
        return {
            samples: [
                {
                    id: 'binary-search',
                    title: '二分探索',
                    file: 'binary-search.md',
                    description: 'ソート済み配列から特定の値を効率的に検索'
                },
                {
                    id: 'bubble-sort',
                    title: 'バブルソート',
                    file: 'bubble-sort.md',
                    description: '隣接する要素を比較して交換を繰り返すソートアルゴリズム'
                },
                {
                    id: 'linear-search',
                    title: '線形探索',
                    file: 'linear-search.md',
                    description: '配列を先頭から順に検索するアルゴリズム'
                },
                {
                    id: 'factorial',
                    title: '階乗計算',
                    file: 'factorial.md',
                    description: '再帰を使った階乗計算'
                },
                {
                    id: 'fibonacci',
                    title: 'フィボナッチ数列',
                    file: 'fibonacci.md',
                    description: 'フィボナッチ数列を生成するアルゴリズム'
                },
                {
                    id: 'prime-check',
                    title: '素数判定',
                    file: 'prime-check.md',
                    description: '効率的な素数判定アルゴリズム'
                }
            ]
        };
    }

    /**
     * Get sample codes collection (fallback)
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
     * Load specific sample code from markdown file
     */
    async loadSampleCode(sampleKey) {
        if (!this.samplesConfig) {
            console.error('Samples configuration not loaded');
            return;
        }
        
        const sample = this.samplesConfig.samples.find(s => s.id === sampleKey);
        if (!sample) {
            console.error('Sample not found:', sampleKey);
            return;
        }
        
        try {
            console.log('Loading sample:', sample.title);
            
            if (sample.folder && sample.pythonFile && sample.commonTestFile) {
                // New folder-based structure
                const [pythonResponse, commonTestResponse] = await Promise.all([
                    fetch(`Sample/${sample.folder}/${sample.pythonFile}`),
                    fetch(`Sample/${sample.folder}/${sample.commonTestFile}`)
                ]);
                
                const pythonContent = await pythonResponse.text();
                const commonTestContent = await commonTestResponse.text();
                
                // Extract code from markdown files
                const pythonCodeMatch = pythonContent.match(/```python\n([\s\S]*?)\n```/);
                const commonTestCodeMatch = commonTestContent.match(/```\n([\s\S]*?)\n```/);
                
                if (pythonCodeMatch && pythonCodeMatch[1]) {
                    this.pythonEditor.setValue(pythonCodeMatch[1]);
                }
                
                if (commonTestCodeMatch && commonTestCodeMatch[1]) {
                    this.commonTestEditor.setValue(commonTestCodeMatch[1]);
                }
                
                console.log('Sample loaded successfully from folder structure:', sample.title);
            } else if (sample.file && sample.file.endsWith('.json')) {
                // Legacy JSON format (backward compatibility)
                const response = await fetch(`Sample/${sample.file}`);
                const sampleData = await response.json();
                
                // Load both Python and Common Test code
                if (sampleData.python) {
                    this.pythonEditor.setValue(sampleData.python);
                }
                if (sampleData.commonTest) {
                    this.commonTestEditor.setValue(sampleData.commonTest);
                }
                
                console.log('Sample loaded successfully from JSON format:', sample.title);
            } else {
                // Old markdown format (backward compatibility)
                const response = await fetch(`Sample/${sample.file}`);
                const markdownContent = await response.text();
                
                // Extract code from markdown (try Python first, then plain code blocks)
                let codeMatch = markdownContent.match(/```python\n([\s\S]*?)\n```/);
                let isPythonCode = true;
                
                if (!codeMatch) {
                    // Try plain code block (for Common Test notation)
                    codeMatch = markdownContent.match(/```\n([\s\S]*?)\n```/);
                    isPythonCode = false;
                }
                
                if (codeMatch && codeMatch[1]) {
                    const code = codeMatch[1];
                    
                    if (isPythonCode) {
                        // Set Python code
                        this.pythonEditor.setValue(code);
                        // Auto-convert to Common Test
                        setTimeout(async () => {
                            if (window.convertPythonToCommon) {
                                await window.convertPythonToCommon();
                            }
                        }, 100);
                    } else {
                        // Set Common Test code
                        this.commonTestEditor.setValue(code);
                        // Auto-convert to Python
                        setTimeout(async () => {
                            if (window.convertCommonToPython) {
                                await window.convertCommonToPython();
                            }
                        }, 100);
                    }
                } else {
                    console.error('No code found in markdown file');
                }
            }
        } catch (error) {
            console.error('Failed to load sample file:', error);
            // Fallback to inline samples
            this.loadFallbackSampleCode(sampleKey);
        }
    }

    /**
     * Fallback method to load samples from inline code
     */
    loadFallbackSampleCode(sampleKey) {
        const samples = this.getSampleCodes();
        const sample = samples[sampleKey];
        
        if (!sample) {
            console.error('Sample not found:', sampleKey);
            return;
        }
        
        console.log('Loading fallback sample:', sample.title);
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
                // Python → Common Test: pythonEditor → commonTestEditor
                const pythonCode = this.pythonEditor.getValue();
                console.log('Python code length:', pythonCode.length);
                console.log('Python code preview:', pythonCode.substring(0, 100));
                
                if (!pythonCode.trim()) {
                    console.log('No Python code to convert');
                    return;
                }
                
                console.log('Converting Python to Common Test...');
                const converted = window.converter.pythonToCommonTest(pythonCode);
                console.log('Conversion successful, result length:', converted.length);
                console.log('Conversion result preview:', converted.substring(0, 100));
                
                this.commonTestEditor.setValue(converted);
                console.log('Set converted text to common test editor');
                
            } else {
                // Common Test → Python: commonTestEditor → pythonEditor
                const commonTestCode = this.commonTestEditor.getValue();
                console.log('Common test code length:', commonTestCode.length);
                console.log('Common test code preview:', commonTestCode.substring(0, 100));
                
                if (!commonTestCode.trim()) {
                    console.log('No common test code to convert');
                    return;
                }
                
                console.log('Converting Common Test to Python...');
                const converted = window.converter.commonTestToPython(commonTestCode);
                console.log('Conversion successful, result length:', converted.length);
                console.log('Conversion result preview:', converted.substring(0, 100));
                
                this.pythonEditor.setValue(converted);
                console.log('Set converted text to python editor');
            }
            
            // Generate flowchart using Python code
            try {
                if (window.flowchartGenerator) {
                    console.log('Generating flowchart...');
                    // Always use the current Python code in the Python editor
                    const pythonCodeForFlowchart = this.pythonEditor.getValue();
                    await window.flowchartGenerator.generateFlowchart(pythonCodeForFlowchart);
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
        
        console.log('shareCode called');
        console.log('Python code length:', pythonCode.length);
        console.log('Common test code length:', commonTestCode.length);
        
        // Since conversionDirection element doesn't exist, determine direction based on content
        let direction = 'python-to-common';
        if (commonTestCode && !pythonCode) {
            direction = 'common-to-python';
        }
        
        const data = {
            python: pythonCode,
            common: commonTestCode,
            direction: direction
        };
        
        console.log('Data to encode:', data);
        
        const jsonString = JSON.stringify(data);
        console.log('JSON string length:', jsonString.length);
        
        const encodedString = encodeURIComponent(jsonString);
        console.log('Encoded string length:', encodedString.length);
        
        // Use Base64 encoding that can handle Unicode characters
        const utf8Bytes = new TextEncoder().encode(jsonString);
        const base64String = btoa(String.fromCharCode(...utf8Bytes));
        
        // Convert to URL-safe Base64 to avoid issues with +, /, and = characters
        const compressed = base64String
            .replace(/\+/g, '-')    // Replace + with -
            .replace(/\//g, '_')    // Replace / with _
            .replace(/=/g, '');     // Remove padding = characters
        
        console.log('Compressed string length:', compressed.length);
        
        // Generate clean URL without any existing hash
        const baseUrl = window.location.origin + window.location.pathname;
        const url = baseUrl + '#' + compressed;
        
        // Check URL length (browser limit is usually around 2048 characters)
        if (url.length > 2000) {
            console.warn('Generated URL is very long:', url.length, 'characters');
            alert('生成されたURLが非常に長くなっています。一部のブラウザで問題が発生する可能性があります。');
        }
        
        document.getElementById('shareUrl').value = url;
        console.log('Share URL generated:', url.length, 'characters');
        
        // Update the link element to make URL clickable
        const shareUrlLink = document.getElementById('shareUrlLink');
        if (shareUrlLink) {
            shareUrlLink.href = url;
            shareUrlLink.style.display = 'inline'; // Show the link
        }
        
        // Show QR button
        const qrToggleButton = document.getElementById('qrToggleButton');
        if (qrToggleButton) {
            qrToggleButton.style.display = 'inline-block';
        }
        
        // Generate QR Code
        this.generateQRCode(url);
        
        // Test immediate decode to verify
        try {
            // Convert back from URL-safe Base64
            let base64ForDecode = compressed
                .replace(/-/g, '+')    // Replace - with +
                .replace(/_/g, '/');   // Replace _ with /
            
            // Add padding if needed
            while (base64ForDecode.length % 4) {
                base64ForDecode += '=';
            }
            
            const binaryString = atob(base64ForDecode);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const testDecode = JSON.parse(new TextDecoder().decode(bytes));
            console.log('Test decode successful:', testDecode);
        } catch (e) {
            console.error('Test decode failed:', e);
        }
    }

    /**
     * Generate QR Code for the given URL
     */
    generateQRCode(url) {
        const qrCodeDisplay = document.getElementById('qrCodeDisplay');
        if (!qrCodeDisplay) {
            console.error('QR code display element not found');
            return;
        }
        
        // Clear previous QR code
        qrCodeDisplay.innerHTML = '';
        
        // Check if QRCode library is available with retry
        if (typeof QRCode === 'undefined') {
            console.log('QRCode library not ready, retrying...');
            qrCodeDisplay.innerHTML = '<p style="color: #3498db;">QRコードを生成中...</p>';
            
            // Retry after a longer delay to allow for library loading
            setTimeout(() => {
                if (typeof QRCode !== 'undefined') {
                    this.generateQRCode(url);
                } else {
                    // Try one more time after additional delay
                    setTimeout(() => {
                        if (typeof QRCode !== 'undefined') {
                            this.generateQRCode(url);
                        } else {
                            console.error('QRCode library failed to load after retries');
                            qrCodeDisplay.innerHTML = '<p style="color: #e74c3c;">QRコードライブラリが読み込めませんでした<br><small>ページを再読み込みしてお試しください</small></p>';
                        }
                    }, 2000);
                }
            }, 2000);
            return;
        }
        
        try {
            // Generate QR code as canvas
            QRCode.toCanvas(url, {
                width: 200,
                height: 200,
                margin: 2,
                color: {
                    dark: '#2c3e50',
                    light: '#ffffff'
                },
                errorCorrectionLevel: 'M'
            }, (error, canvas) => {
                if (error) {
                    console.error('QR code generation failed:', error);
                    qrCodeDisplay.innerHTML = '<p style="color: #e74c3c;">QRコード生成エラー</p>';
                } else {
                    qrCodeDisplay.appendChild(canvas);
                    console.log('QR code generated successfully');
                }
            });
        } catch (error) {
            console.error('QR code generation error:', error);
            qrCodeDisplay.innerHTML = '<p style="color: #e74c3c;">QRコード生成に失敗しました</p>';
        }
    }

    /**
     * Toggle QR Code display
     */
    toggleQRCode() {
        const qrCodeContainer = document.getElementById('qrCodeContainer');
        const qrToggleButton = document.getElementById('qrToggleButton');
        
        if (!qrCodeContainer || !qrToggleButton) return;
        
        if (qrCodeContainer.style.display === 'none' || qrCodeContainer.style.display === '') {
            qrCodeContainer.style.display = 'block';
            qrToggleButton.textContent = '📱 隠す';
        } else {
            qrCodeContainer.style.display = 'none';
            qrToggleButton.textContent = '📱 QR';
        }
    }

    /**
     * Copy share URL to clipboard
     */
    async copyShareUrl(buttonElement) {
        const shareUrl = document.getElementById('shareUrl');
        
        try {
            await navigator.clipboard.writeText(shareUrl.value);
            
            const button = buttonElement || document.querySelector('.share-copy-button');
            if (button) {
                const originalText = button.textContent;
                button.textContent = 'コピー済み!';
                setTimeout(() => {
                    button.textContent = originalText;
                }, 2000);
            }
        } catch (error) {
            console.error('Failed to copy share URL: ', error);
        }
    }

    /**
     * Load code from URL
     */
    async loadFromUrl() {
        console.log('loadFromUrl called');
        console.log('Current URL hash:', window.location.hash);
        
        if (window.location.hash) {
            try {
                const compressed = window.location.hash.substring(1);
                console.log('Compressed data:', compressed);
                
                // Convert back from URL-safe Base64
                let base64ForDecode = compressed
                    .replace(/-/g, '+')    // Replace - with +
                    .replace(/_/g, '/');   // Replace _ with /
                
                // Add padding if needed
                while (base64ForDecode.length % 4) {
                    base64ForDecode += '=';
                }
                
                // Decode the data
                const binaryString = atob(base64ForDecode);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                const decodedData = new TextDecoder().decode(bytes);
                console.log('Decoded data:', decodedData);
                
                const data = JSON.parse(decodedData);
                console.log('Parsed data:', data);
                
                // Check if editors are available, wait if not
                if (!this.pythonEditor || !this.commonTestEditor) {
                    console.log('Editors not initialized yet, waiting...');
                    let retries = 0;
                    while ((!this.pythonEditor || !this.commonTestEditor) && retries < 50) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                        retries++;
                    }
                    
                    if (!this.pythonEditor || !this.commonTestEditor) {
                        console.error('Editors still not available after waiting');
                        return;
                    }
                }
                
                console.log('Editors are ready, loading data...');
                
                if (data.python) {
                    console.log('Loading Python code:', data.python.substring(0, 100) + '...');
                    this.pythonEditor.setValue(data.python);
                    console.log('Python code loaded successfully');
                }
                if (data.common) {
                    console.log('Loading Common Test code:', data.common.substring(0, 100) + '...');
                    this.commonTestEditor.setValue(data.common);
                    console.log('Common Test code loaded successfully');
                }
                if (data.direction) {
                    console.log('Loaded direction from URL:', data.direction);
                }
                
                // Refresh editors to ensure proper display
                setTimeout(() => {
                    this.refreshEditors();
                }, 100);
                
                if (window.flowchartGenerator && data.python) {
                    console.log('Generating flowchart...');
                    setTimeout(async () => {
                        try {
                            await window.flowchartGenerator.generateFlowchart(data.python);
                            console.log('Flowchart generated successfully');
                        } catch (error) {
                            console.error('Flowchart generation error:', error);
                        }
                    }, 300);
                }
                
                console.log('URL loading completed successfully');
            } catch (e) {
                console.error('Failed to load from URL:', e);
                console.error('Hash content:', window.location.hash);
                alert('URLからのデータ読み込みに失敗しました: ' + e.message);
            }
        } else {
            console.log('No hash found in URL');
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

    /**
     * Set editor values
     */
    setPythonCode(code) {
        this.pythonEditor.setValue(code);
    }

    setCommonTestCode(code) {
        this.commonTestEditor.setValue(code);
    }
}

// Export for use in other modules
window.UIManager = UIManager;