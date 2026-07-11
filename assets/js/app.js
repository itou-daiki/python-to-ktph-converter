/**
 * Main Application Entry Point
 */

// Global instances
let converter;
let executor;
let flowchartGenerator;
let uiManager;

/**
 * Initialize the application
 */
window.addEventListener('load', async function() {
    try {
        // Initialize all modules
        console.log('Initializing modules...');
        converter = new Converter();
        console.log('Converter initialized:', converter);
        
        executor = new Executor();
        console.log('Executor initialized:', executor);
        
        flowchartGenerator = new FlowchartGenerator();
        console.log('FlowchartGenerator initialized:', flowchartGenerator);
        
        uiManager = new UIManager();
        console.log('UIManager initialized:', uiManager);
        
        // Initialize UI
        console.log('Setting up editors and event listeners...');
        uiManager.initializeEditors();
        await uiManager.initializeSamples();
        uiManager.setupEventListeners();

        window.converter = converter;
        window.executor = executor;
        window.flowchartGenerator = flowchartGenerator;
        window.uiManager = uiManager;

        // URL restoration only needs the editors and flowchart; Pyodide loads on first execution.
        setTimeout(async () => {
            await uiManager.loadFromUrl();
        }, 200);

        console.log('Application initialized successfully');
        console.log('Global variables verified:');
        console.log('- window.converter:', !!window.converter);
        console.log('- window.executor:', !!window.executor);
        console.log('- window.flowchartGenerator:', !!window.flowchartGenerator);
        console.log('- window.uiManager:', !!window.uiManager);
        
    } catch (error) {
        console.error('Failed to initialize application:', error);
        document.getElementById('output').textContent = 'アプリケーションの初期化に失敗しました: ' + error.message;
    }
});

/**
 * Global functions kept for simple integrations and backwards compatibility.
 */

// Convert Python to Common Test
async function convertPythonToCommon() {
    console.log('=== Convert Python to Common Test ===');
    
    if (!uiManager || !converter) {
        console.error('UIManager or Converter not initialized');
        return;
    }
    
    try {
        const pythonCode = uiManager.getPythonCode();
        console.log('Converting Python code:', pythonCode.substring(0, 100) + '...');
        
        const commonTestCode = await converter.pythonToCommonTest(pythonCode);
        uiManager.setCommonTestCode(commonTestCode);
        
        // Generate flowchart from Python code with Common Test style labels
        if (flowchartGenerator) {
            await flowchartGenerator.generateFlowchart(pythonCode);
        }
        
        console.log('Python to Common Test conversion completed successfully');
    } catch (error) {
        console.error('Conversion failed:', error);
        alert('Conversion failed: ' + error.message);
    }
}

// Convert Common Test to Python
async function convertCommonToPython() {
    console.log('=== Convert Common Test to Python ===');
    
    if (!uiManager || !converter) {
        console.error('UIManager or Converter not initialized');
        return;
    }
    
    try {
        const commonTestCode = uiManager.getCommonTestCode();
        console.log('Converting Common Test code:', commonTestCode.substring(0, 100) + '...');
        
        const pythonCode = await converter.commonTestToPython(commonTestCode);
        uiManager.setPythonCode(pythonCode);
        
        // Generate flowchart from Python code with Common Test style labels
        if (flowchartGenerator) {
            await flowchartGenerator.generateFlowchart(pythonCode);
        }
        
        console.log('Common Test to Python conversion completed successfully');
    } catch (error) {
        console.error('Conversion failed:', error);
        alert('Conversion failed: ' + error.message);
    }
}

// Execute code
async function runCode() {
    console.log('=== Run function called ===');
    const outputDiv = document.getElementById('output');
    outputDiv.textContent = '';
    
    console.log('executor exists:', !!executor);
    console.log('uiManager exists:', !!uiManager);
    
    if (!executor) {
        console.error('Executor not initialized');
        alert('Executor not initialized');
        return;
    }
    
    if (!uiManager) {
        console.error('UIManager not initialized');
        alert('UIManager not initialized');
        return;
    }
    
    const runButton = document.querySelector('.run-button');
    const originalButtonText = runButton ? runButton.textContent : '';

    if (runButton) {
        runButton.disabled = true;
        runButton.textContent = '実行中';
    }

    try {
        // Always run Python code using Pyodide
        const pythonCode = uiManager.getPythonCode();
        console.log('Python code to execute:', pythonCode.substring(0, 100) + '...');
        await executor.runPythonCode(pythonCode);
        console.log('Execution completed successfully');
    } catch (error) {
        console.error('Execution failed:', error);
        outputDiv.textContent = 'エラー: ' + error.message;
        alert('実行に失敗しました: ' + error.message);
    } finally {
        if (runButton) {
            runButton.disabled = false;
            runButton.textContent = originalButtonText;
        }
    }
}

// Make global functions available
window.convertPythonToCommon = convertPythonToCommon;
window.convertCommonToPython = convertCommonToPython;
window.runCode = runCode;
