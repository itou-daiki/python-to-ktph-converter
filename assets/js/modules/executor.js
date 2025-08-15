/**
 * Code Execution Engine
 */
class Executor {
    constructor() {
        this.pyodide = null;
        this.executionContext = {
            variables: {},
            output: []
        };
        this.inputCallback = null;
    }

    /**
     * Initialize Pyodide
     */
    async initPyodide() {
        if (!this.pyodide && !this.initializingPyodide) {
            this.initializingPyodide = true;
            document.getElementById('loadingOverlay').style.display = 'flex';
            try {
                this.pyodide = await loadPyodide();
                console.log("Pyodide loaded successfully");
            } catch (error) {
                console.error("Failed to load Pyodide:", error);
                throw error;
            } finally {
                document.getElementById('loadingOverlay').style.display = 'none';
                this.initializingPyodide = false;
            }
        } else if (this.initializingPyodide) {
            // Wait for existing initialization to complete
            while (this.initializingPyodide) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }
        return this.pyodide;
    }

    /**
     * Execute Python code using Pyodide
     */
    async runPythonCode(pythonCode) {
        const outputDiv = document.getElementById('output');
        outputDiv.textContent = ''; // Clear previous output
        
        if (!this.pyodide) {
            await this.initPyodide();
        }
        
        // Initialize output capture array in JavaScript
        let capturedOutput = [];
        
        // Make capturedOutput available to Python code first
        this.pyodide.globals.set("capturedOutput", capturedOutput);
        
        // Reset completely and set up fresh output capture
        this.pyodide.runPython(`
import sys
import js
import builtins

# Store original functions ONCE
if not hasattr(builtins, '_ORIGINAL_PRINT'):
    builtins._ORIGINAL_PRINT = builtins.print
if not hasattr(builtins, '_ORIGINAL_INPUT'):
    builtins._ORIGINAL_INPUT = builtins.input

# Reset to original functions first
builtins.print = builtins._ORIGINAL_PRINT
builtins.input = builtins._ORIGINAL_INPUT

# Clear any existing capture setup
if 'captured_output' in globals():
    del captured_output
if 'custom_print' in globals():
    del custom_print
if 'custom_input' in globals():
    del custom_input
        `);
        
        // Now set up fresh capture
        this.pyodide.runPython(`
# Get the fresh capturedOutput from global namespace
captured_output = capturedOutput

def custom_print(*args, sep=' ', end='\\n', file=None, flush=False):
    """Custom print function that captures output to JavaScript"""
    text = sep.join(str(arg) for arg in args) + end
    captured_output.append(text)
    
def custom_input(prompt=""):
    """Custom input function using browser prompt"""
    if prompt:
        captured_output.append(prompt)
    value = js.window.prompt(prompt if prompt else "入力してください:")
    if value is not None:
        captured_output.append(str(value) + ' ←キーボードから入力\\n')
    return value if value is not None else ""

# Override built-in functions
builtins.print = custom_print
builtins.input = custom_input
        `);
        
        try {
            await this.pyodide.runPythonAsync(pythonCode);
            
            // Get captured output from JavaScript array
            const output = capturedOutput.join('');
            
            // Debug: Log the output to see what we're working with
            console.log('=== DEBUG OUTPUT ===');
            console.log('Raw output:', JSON.stringify(output));
            console.log('Raw output length:', output.length);
            console.log('Contains ←キーボードから入力:', output.includes('←キーボードから入力'));
            
            // Search for the exact pattern in the output
            const inputPattern = '←キーボードから入力';
            const matches = output.match(new RegExp(inputPattern, 'g'));
            console.log('Pattern matches found:', matches ? matches.length : 0);
            
            // Process output to make keyboard input prompts red and bold
            let processedOutput = output;
            
            // Use multiple replacement strategies
            if (output.includes(inputPattern)) {
                console.log('Found input pattern, applying styling...');
                
                // Strategy 1: Replace all occurrences with HTML span
                processedOutput = processedOutput.replace(
                    new RegExp(inputPattern, 'g'),
                    '<span style="color: #e74c3c; font-weight: bold;">' + inputPattern + '</span>'
                );
                
                // Strategy 2: Also handle cases with spaces
                processedOutput = processedOutput.replace(
                    new RegExp(' ' + inputPattern, 'g'),
                    ' <span style="color: #e74c3c; font-weight: bold;">' + inputPattern + '</span>'
                );
                
                console.log('Applied styling to output');
            }
            
            console.log('Processed output:', JSON.stringify(processedOutput.substring(0, 200) + '...'));
            console.log('Contains span tag:', processedOutput.includes('<span'));
            
            // Always use innerHTML if we have any HTML content
            if (processedOutput.includes('<span') || processedOutput !== output) {
                // Convert newlines to <br> tags for HTML display
                const htmlOutput = processedOutput.replace(/\n/g, '<br>');
                outputDiv.innerHTML = htmlOutput || '実行完了（出力なし）';
                console.log('Using innerHTML for output display');
                console.log('Final HTML output:', htmlOutput.substring(0, 200) + '...');
            } else {
                outputDiv.textContent = output || '実行完了（出力なし）';
                console.log('Using textContent for output display');
            }
            
            // Scroll to bottom to show the last line
            outputDiv.scrollTop = outputDiv.scrollHeight;
        } catch (error) {
            outputDiv.textContent = 'Python実行エラー: ' + error.message;
        } finally {
            // Reset to original functions
            this.pyodide.runPython(`
# Reset print and input to original functions
builtins.print = builtins._ORIGINAL_PRINT
builtins.input = builtins._ORIGINAL_INPUT
# Clean up globals
if 'captured_output' in globals():
    del captured_output
if 'custom_print' in globals():
    del custom_print
if 'custom_input' in globals():
    del custom_input
            `);
        }
    }

    /**
     * Execute Common Test code
     */
    async executeCommonTestCode(code) {
        const lines = code.split('\n');
        const outputDiv = document.getElementById('output');
        outputDiv.textContent = ''; // Clear previous output
        
        this.executionContext = {
            variables: {},
            output: []
        };
        
        await this.executeBlock(lines, 0, lines.length);
        outputDiv.textContent = this.executionContext.output.join('');
        
        // Scroll to bottom to show the last line
        outputDiv.scrollTop = outputDiv.scrollHeight;
    }

    /**
     * Execute a block of code
     */
    async executeBlock(lines, start, end) {
        let i = start;
        while (i < end) {
            let line = lines[i].trim();
            
            // Remove control symbols
            line = line.replace(/^[｜⎿\s]+/, '');
            
            if (line === '' || line.startsWith('#')) {
                i++;
                continue;
            }
            
            // Handle different statements
            if (line.startsWith('表示する(')) {
                await this.executeDisplay(line);
            } else if (line.includes('【外部からの入力】')) {
                await this.executeInput(line);
            } else if (line.startsWith('もし ')) {
                i = await this.executeIf(lines, i);
            } else if (line.endsWith(' の間繰り返す:')) {
                i = await this.executeWhile(lines, i);
            } else if (line.includes(' ずつ増やしながら繰り返す:') || line.includes(' ずつ減らしながら繰り返す:')) {
                i = await this.executeFor(lines, i);
            } else {
                // Variable assignment
                this.executeAssignment(line);
            }
            
            i++;
        }
    }

    /**
     * Execute display statement
     */
    async executeDisplay(line) {
        const content = line.substring(5, line.length - 1);
        const parts = content.split(',').map(part => {
            part = part.trim();
            if (part.startsWith('"') && part.endsWith('"')) {
                return part.slice(1, -1);
            } else {
                return this.evaluateExpression(part);
            }
        });
        
        this.executionContext.output.push(parts.join('') + '\n');
    }

    /**
     * Execute input statement
     */
    async executeInput(line) {
        const varName = line.split('=')[0].trim();
        
        return new Promise((resolve) => {
            this.showInputDialog((value) => {
                this.executionContext.variables[varName] = value;
                resolve();
            });
        });
    }

    /**
     * Execute assignment
     */
    executeAssignment(line) {
        if (line.includes(' = ')) {
            const parts = line.split(' = ');
            const varName = parts[0].trim();
            const value = this.evaluateExpression(parts[1].trim());
            
            if (varName.includes('[')) {
                // Array element assignment
                const match = varName.match(/(\w+)\[(.+)\]/);
                if (match) {
                    const arrayName = match[1];
                    const index = this.evaluateExpression(match[2]);
                    this.executionContext.variables[arrayName][index] = value;
                }
            } else {
                this.executionContext.variables[varName] = value;
            }
        }
    }

    /**
     * Evaluate expression
     */
    evaluateExpression(expr) {
        expr = expr.trim();
        
        // String literal
        if (expr.startsWith('"') && expr.endsWith('"')) {
            return expr.slice(1, -1);
        }
        
        // Array literal
        if (expr.startsWith('[') && expr.endsWith(']')) {
            const elements = expr.slice(1, -1).split(',').map(e => this.evaluateExpression(e.trim()));
            return elements;
        }
        
        // Function calls
        if (expr.includes('要素数(')) {
            const match = expr.match(/要素数\((.+)\)/);
            if (match) {
                const array = this.executionContext.variables[match[1]];
                return array ? array.length : 0;
            }
        }
        
        if (expr.includes('整数(')) {
            const match = expr.match(/整数\((.+)\)/);
            if (match) {
                return parseInt(this.evaluateExpression(match[1]));
            }
        }
        
        if (expr === '乱数()') {
            return Math.random();
        }
        
        // Array access
        if (expr.includes('[') && expr.includes(']')) {
            const match = expr.match(/(\w+)\[(.+)\]/);
            if (match) {
                const arrayName = match[1];
                const index = this.evaluateExpression(match[2]);
                return this.executionContext.variables[arrayName][index];
            }
        }
        
        // Binary operations
        if (expr.includes(' + ')) {
            const parts = expr.split(' + ');
            return this.evaluateExpression(parts[0]) + this.evaluateExpression(parts[1]);
        }
        
        if (expr.includes(' ÷ ')) {
            const parts = expr.split(' ÷ ');
            return Math.floor(this.evaluateExpression(parts[0]) / this.evaluateExpression(parts[1]));
        }
        
        // Number literal
        if (!isNaN(expr)) {
            return Number(expr);
        }
        
        // Variable reference
        if (this.executionContext.variables.hasOwnProperty(expr)) {
            return this.executionContext.variables[expr];
        }
        
        return expr;
    }

    /**
     * Show input dialog
     */
    showInputDialog(callback) {
        this.inputCallback = callback;
        document.getElementById('overlay').style.display = 'block';
        document.getElementById('inputDialog').style.display = 'block';
        document.getElementById('userInput').value = '';
        document.getElementById('userInput').focus();
    }

    /**
     * Submit input
     */
    submitInput() {
        const value = document.getElementById('userInput').value;
        this.closeInputDialog();
        if (this.inputCallback) {
            this.inputCallback(value);
            this.inputCallback = null;
        }
    }

    /**
     * Close input dialog
     */
    closeInputDialog() {
        document.getElementById('overlay').style.display = 'none';
        document.getElementById('inputDialog').style.display = 'none';
    }

    /**
     * Find the end of a block
     */
    findBlockEnd(lines, start) {
        let level = 0;
        for (let i = start; i < lines.length; i++) {
            const line = lines[i];
            const controlSymbols = line.match(/^[｜⎿\s]+/);
            
            if (!controlSymbols) {
                return i;
            }
            
            const currentLevel = (controlSymbols[0].match(/[｜⎿]/g) || []).length;
            if (i === start) {
                level = currentLevel;
            } else if (currentLevel < level) {
                return i;
            }
        }
        return lines.length;
    }
}

// Export for use in other modules
window.Executor = Executor;