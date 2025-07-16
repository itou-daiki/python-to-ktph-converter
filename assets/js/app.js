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
window.addEventListener('load', function() {
    // Initialize all modules
    converter = new Converter();
    executor = new Executor();
    flowchartGenerator = new FlowchartGenerator();
    uiManager = new UIManager();
    
    // Initialize UI
    uiManager.initializeEditors();
    uiManager.setupEventListeners();
    
    // Load from URL if hash exists
    uiManager.loadFromUrl();
    
    console.log('Application initialized successfully');
});

/**
 * Global functions for HTML onclick handlers
 */

// Convert code based on selected direction
function convert() {
    uiManager.convert();
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

// Make instances globally available for debugging
window.converter = converter;
window.executor = executor;
window.flowchartGenerator = flowchartGenerator;
window.uiManager = uiManager;