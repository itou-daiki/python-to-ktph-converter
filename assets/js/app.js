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
    // Show loading overlay during initialization
    document.getElementById('loadingOverlay').style.display = 'flex';
    
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
        
        // Initialize Pyodide during startup
        console.log('Initializing Pyodide...');
        await executor.initPyodide();
        console.log('Pyodide initialized successfully');
        
        // Load from URL if hash exists
        await uiManager.loadFromUrl();
        
        // Make instances globally available immediately after initialization
        window.converter = converter;
        window.executor = executor;
        window.flowchartGenerator = flowchartGenerator;
        window.uiManager = uiManager;
        
        console.log('Application initialized successfully');
        console.log('Global variables verified:');
        console.log('- window.converter:', !!window.converter);
        console.log('- window.executor:', !!window.executor);
        console.log('- window.flowchartGenerator:', !!window.flowchartGenerator);
        console.log('- window.uiManager:', !!window.uiManager);
        
    } catch (error) {
        console.error('Failed to initialize application:', error);
        document.getElementById('output').textContent = 'アプリケーションの初期化に失敗しました: ' + error.message;
    } finally {
        // Hide loading overlay
        document.getElementById('loadingOverlay').style.display = 'none';
    }
});

/**
 * Global functions for HTML onclick handlers
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
        
        // Generate flowchart from converted Common Test code
        if (flowchartGenerator) {
            await flowchartGenerator.generateFlowchart(commonTestCode);
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
        
        // Generate flowchart from Common Test code
        if (flowchartGenerator) {
            await flowchartGenerator.generateFlowchart(commonTestCode);
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
    
    try {
        // Always run Python code using Pyodide
        const pythonCode = uiManager.getPythonCode();
        console.log('Python code to execute:', pythonCode.substring(0, 100) + '...');
        await executor.runPythonCode(pythonCode);
        console.log('Execution completed successfully');
    } catch (error) {
        console.error('Execution failed:', error);
        outputDiv.textContent = 'エラー: ' + error.message;
        alert('Execution failed: ' + error.message);
    }
}

// Clear all content
function clearAll() {
    uiManager.clearAll();
}

// Clear output only
function clearOutput() {
    uiManager.clearOutput();
}

// Load example code (backwards compatibility)
function loadExample() {
    uiManager.loadExample();
}

// Load specific sample code
function loadSampleCode(sampleKey) {
    uiManager.loadSampleCode(sampleKey);
}

// Copy to clipboard
function copyToClipboard(elementId) {
    uiManager.copyToClipboard(elementId);
}

// Generate share URL
function shareCode() {
    uiManager.shareCode();
}

// Copy share URL
function copyShareUrl() {
    uiManager.copyShareUrl();
}

// Input dialog functions
function submitInput() {
    executor.submitInput();
}

function closeInputDialog() {
    executor.closeInputDialog();
}

// Make global functions available
window.convertPythonToCommon = convertPythonToCommon;
window.convertCommonToPython = convertCommonToPython;
window.runCode = runCode;
window.clearAll = clearAll;
window.clearOutput = clearOutput;
window.loadExample = loadExample;
window.loadSampleCode = loadSampleCode;
window.copyToClipboard = copyToClipboard;
window.shareCode = shareCode;
window.copyShareUrl = copyShareUrl;
window.submitInput = submitInput;
window.closeInputDialog = closeInputDialog;

// Global variables are already set during initialization

// Test function to check if everything is working
function testApplication() {
    console.log('=== Application Test ===');
    console.log('converter:', !!window.converter);
    console.log('executor:', !!window.executor);
    console.log('flowchartGenerator:', !!window.flowchartGenerator);
    console.log('uiManager:', !!window.uiManager);
    
    if (window.uiManager) {
        console.log('pythonEditor:', !!window.uiManager.pythonEditor);
        console.log('commonTestEditor:', !!window.uiManager.commonTestEditor);
    }
    
    const convertBtn = document.querySelector('.convert-button');
    const runBtn = document.querySelector('.run-button');
    console.log('Convert button found:', !!convertBtn);
    console.log('Run button found:', !!runBtn);
    
    return 'Test completed - check console for details';
}

// Make test function globally available
window.testApplication = testApplication;