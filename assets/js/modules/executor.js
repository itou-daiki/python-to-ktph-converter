/**
 * Python execution engine backed by Pyodide.
 */
class Executor {
    constructor() {
        this.pyodide = null;
        this.initializingPyodide = false;
    }

    async initPyodide() {
        if (!this.pyodide && !this.initializingPyodide) {
            this.initializingPyodide = true;
            document.getElementById('loadingOverlay').style.display = 'flex';
            try {
                this.pyodide = await loadPyodide();
                console.log('Pyodide loaded successfully');
            } catch (error) {
                console.error('Failed to load Pyodide:', error);
                throw error;
            } finally {
                document.getElementById('loadingOverlay').style.display = 'none';
                this.initializingPyodide = false;
            }
        } else if (this.initializingPyodide) {
            while (this.initializingPyodide) {
                await new Promise(resolve => setTimeout(resolve, 100));
            }
        }

        return this.pyodide;
    }

    async runPythonCode(pythonCode) {
        const outputDiv = document.getElementById('output');
        outputDiv.textContent = '';

        if (!this.pyodide) {
            await this.initPyodide();
        }

        const capturedOutput = [];
        this.pyodide.globals.set('capturedOutput', capturedOutput);

        try {
            this.pyodide.runPython(`
import builtins
import js

if not hasattr(builtins, '_ORIGINAL_PRINT'):
    builtins._ORIGINAL_PRINT = builtins.print
if not hasattr(builtins, '_ORIGINAL_INPUT'):
    builtins._ORIGINAL_INPUT = builtins.input

builtins.print = builtins._ORIGINAL_PRINT
builtins.input = builtins._ORIGINAL_INPUT
captured_output = capturedOutput

def custom_print(*args, sep=' ', end='\\n', file=None, flush=False):
    text = sep.join(str(arg) for arg in args) + end
    captured_output.append(text)

def custom_input(prompt=''):
    if prompt:
        captured_output.append(prompt)
    value = js.window.prompt(prompt if prompt else '入力してください:')
    if value is not None:
        captured_output.append(str(value) + ' ←キーボードから入力\\n')
    return value if value is not None else ''

builtins.print = custom_print
builtins.input = custom_input
            `);

            await this.pyodide.runPythonAsync(pythonCode);
            this.renderCapturedOutput(capturedOutput.join(''), outputDiv);
            outputDiv.scrollTop = outputDiv.scrollHeight;
        } catch (error) {
            outputDiv.textContent = 'Python実行エラー: ' + error.message;
        } finally {
            this.restorePythonBuiltins();
        }
    }

    renderCapturedOutput(output, outputDiv) {
        if (!output) {
            outputDiv.textContent = '実行完了（出力なし）';
            return;
        }

        const marker = '←キーボードから入力';
        const parts = output.split(marker);
        outputDiv.replaceChildren();

        parts.forEach((part, index) => {
            outputDiv.appendChild(document.createTextNode(part));
            if (index < parts.length - 1) {
                const markerElement = document.createElement('span');
                markerElement.className = 'execution-input-marker';
                markerElement.textContent = marker;
                outputDiv.appendChild(markerElement);
            }
        });
    }

    restorePythonBuiltins() {
        if (!this.pyodide) return;

        try {
            this.pyodide.runPython(`
if hasattr(builtins, '_ORIGINAL_PRINT'):
    builtins.print = builtins._ORIGINAL_PRINT
if hasattr(builtins, '_ORIGINAL_INPUT'):
    builtins.input = builtins._ORIGINAL_INPUT
if 'captured_output' in globals():
    del captured_output
if 'custom_print' in globals():
    del custom_print
if 'custom_input' in globals():
    del custom_input
            `);
        } catch (error) {
            console.warn('Failed to restore Python built-ins:', error);
        }
    }
}

window.Executor = Executor;
