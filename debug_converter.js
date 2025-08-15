const fs = require('fs');
global.window = global;
eval(fs.readFileSync('assets/js/modules/converter.js', 'utf8'));

// Override the converter to add debug info
class DebugConverter extends Converter {
    pythonToCommonTest(pythonCode) {
        const lines = pythonCode.split('\n');
        const result = [];
        this.indentStack = [0];
        
        console.log('=== Debug Info ===');
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();
            
            if (trimmed === '' || trimmed.startsWith('#')) {
                result.push(line);
                continue;
            }
            
            const currentIndent = line.length - line.trimStart().length;
            console.log(`\nLine ${i}: "${trimmed}"`);
            console.log(`  Current indent: ${currentIndent}`);
            console.log(`  Indent stack: [${this.indentStack.join(', ')}]`);
            
            // Handle dedent
            while (this.indentStack.length > 1 && currentIndent < this.indentStack[this.indentStack.length - 1]) {
                this.indentStack.pop();
            }
            console.log(`  Indent stack after dedent: [${this.indentStack.join(', ')}]`);
            
            const converted = this.convertLine(trimmed);
            
            // Find next indent
            let nextIndent = null;
            for (let j = i + 1; j < lines.length; j++) {
                const nextLine = lines[j].trim();
                if (nextLine === '' || nextLine.startsWith('#')) continue;
                nextIndent = lines[j].length - lines[j].trimStart().length;
                break;
            }
            if (nextIndent === null) nextIndent = 0;
            console.log(`  Next indent: ${nextIndent}`);
            
            if (this.indentStack.length > 1) {
                let prefix = '';
                for (let level = 0; level < this.indentStack.length - 1; level++) {
                    const blockIndent = this.indentStack[level + 1];
                    const willClose = nextIndent < blockIndent;
                    console.log(`    Level ${level}: blockIndent=${blockIndent}, willClose=${willClose}`);
                    if (willClose) {
                        prefix += '⎿ ';
                    } else {
                        prefix += '｜ ';
                    }
                }
                console.log(`  Prefix: "${prefix}"`);
                result.push(prefix + converted);
            } else {
                result.push(converted);
            }
            
            // Update indent stack
            if (trimmed.endsWith(':')) {
                this.indentStack.push(currentIndent + 4);
                console.log(`  Added to stack: ${currentIndent + 4}, stack: [${this.indentStack.join(', ')}]`);
            }
        }
        
        return result.join('\n');
    }
}

const converter = new DebugConverter();
const pythonCode = `def message(a, b):
    if a < b:
        print("test")
    else:
        print("test2")`;

console.log(pythonCode);
const converted = converter.pythonToCommonTest(pythonCode);
console.log('\n=== Result ===');
console.log(converted);