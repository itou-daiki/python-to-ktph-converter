const fs = require('fs');
global.window = global;
eval(fs.readFileSync('assets/js/modules/converter.js', 'utf8'));

class DebugConverter extends Converter {
    pythonToCommonTest(pythonCode) {
        const lines = pythonCode.split('\n');
        const result = [];
        this.indentStack = [0];
        
        console.log('=== Detailed Debug Info ===');
        
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
            console.log(`  Indent stack before: [${this.indentStack.join(', ')}]`);
            
            // Handle dedent
            while (this.indentStack.length > 1 && currentIndent < this.indentStack[this.indentStack.length - 1]) {
                this.indentStack.pop();
            }
            console.log(`  Indent stack after dedent: [${this.indentStack.join(', ')}]`);
            
            const converted = this.convertLine(trimmed);
            
            // Find next indent
            let nextIndent = null;
            let nextLine = '';
            for (let j = i + 1; j < lines.length; j++) {
                const nextLineTrimmed = lines[j].trim();
                if (nextLineTrimmed === '' || nextLineTrimmed.startsWith('#')) continue;
                nextIndent = lines[j].length - lines[j].trimStart().length;
                nextLine = nextLineTrimmed;
                break;
            }
            if (nextIndent === null) nextIndent = 0;
            console.log(`  Next line: "${nextLine}" (indent: ${nextIndent})`);
            
            if (this.indentStack.length > 1) {
                let prefix = '';
                console.log(`  Building prefix for ${this.indentStack.length - 1} levels:`);
                
                for (let level = 0; level < this.indentStack.length - 1; level++) {
                    const blockIndent = this.indentStack[level + 1];
                    let willClose = nextIndent < blockIndent;
                    
                    if (willClose && nextIndent === blockIndent - 4) {
                        // Next line is at the same level as the block header
                        if (nextLine.startsWith('else:') || nextLine.startsWith('elif ')) {
                            // This is continuing the if-else structure, don't close the block
                            willClose = false;
                            console.log(`    Level ${level}: Special case - else/elif detected, keeping block open`);
                        }
                    }
                    
                    console.log(`    Level ${level}: blockIndent=${blockIndent}, nextIndent=${nextIndent}, nextLine="${nextLine}", willClose=${willClose}`);
                    
                    if (willClose) {
                        prefix += '⎿ ';
                    } else {
                        prefix += '｜ ';
                    }
                }
                console.log(`  Final prefix: "${prefix}"`);
                result.push(prefix + converted);
            } else {
                result.push(converted);
            }
            
            // Update indent stack
            if (trimmed.endsWith(':')) {
                this.indentStack.push(currentIndent + 4);
                console.log(`  Added to stack: ${currentIndent + 4}, new stack: [${this.indentStack.join(', ')}]`);
            }
        }
        
        return result.join('\n');
    }
}

const converter = new DebugConverter();
const pythonCode = `def message(a, b):
    if a < b:
        print("test1")
    else:
        print("test2")`;

console.log('Input:');
console.log(pythonCode);
const converted = converter.pythonToCommonTest(pythonCode);
console.log('\n=== Final Result ===');
console.log(converted);