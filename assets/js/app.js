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
        uiManager.setupEventListeners();
        
        // Initialize Pyodide during startup
        console.log('Initializing Pyodide...');
        await executor.initPyodide();
        console.log('Pyodide initialized successfully');
        
        // Load from URL if hash exists
        await uiManager.loadFromUrl();
        
        console.log('Application initialized successfully');
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

// Convert code based on selected direction
async function convert() {
    console.log('Convert function called');
    console.log('uiManager:', uiManager);
    console.log('converter:', converter);
    
    if (!uiManager) {
        console.error('UIManager not initialized');
        return;
    }
    
    if (!converter) {
        console.error('Converter not initialized');
        return;
    }
    
    try {
        await uiManager.convert();
        console.log('Conversion completed successfully');
    } catch (error) {
        console.error('Conversion failed:', error);
    }
}

// Execute code
async function runCode() {
    const outputDiv = document.getElementById('output');
    outputDiv.textContent = '';
    
    try {
        const direction = document.getElementById('conversionDirection').value;
        
        if (direction === 'pythonToCommon') {
            // Run Python code using Pyodide
            await executor.runPythonCode(uiManager.getPythonCode());
        } else {
            // Run Common Test notation using interpreter
            await executor.executeCommonTestCode(uiManager.getCommonTestCode());
        }
    } catch (error) {
        outputDiv.textContent = 'エラー: ' + error.message;
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

// Load example code
function loadExample() {
    uiManager.loadExample();
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
window.convert = convert;
window.runCode = runCode;
window.clearAll = clearAll;
window.clearOutput = clearOutput;
window.loadExample = loadExample;
window.copyToClipboard = copyToClipboard;
window.shareCode = shareCode;
window.copyShareUrl = copyShareUrl;
window.submitInput = submitInput;
window.closeInputDialog = closeInputDialog;

// Make instances globally available for debugging and use
window.converter = converter;
window.executor = executor;
window.flowchartGenerator = flowchartGenerator;
window.uiManager = uiManager;

console.log('Global variables set:');
console.log('window.converter:', window.converter);
console.log('window.executor:', window.executor);
console.log('window.flowchartGenerator:', window.flowchartGenerator);
console.log('window.uiManager:', window.uiManager);