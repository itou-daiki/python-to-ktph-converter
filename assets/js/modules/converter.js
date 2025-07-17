/**
 * Python to Common Test Notation Converter
 */
class Converter {
    constructor() {
        this.indentStack = [0];
        console.log('Converter initialized');
    }

    /**
     * Test conversion with simple example
     */
    test() {
        const testCode = 'print("Hello, World!")';
        const result = this.pythonToCommonTest(testCode);
        console.log('Test input:', testCode);
        console.log('Test output:', result);
        return result;
    }

    /**
     * Test reverse conversion (Common Test to Python)
     */
    testReverse() {
        const testCode = `表示する("Hello, World!")
もし x > 0 ならば:
⎿ 表示する("Positive")`;
        const result = this.commonTestToPython(testCode);
        console.log('Reverse test input:', testCode);
        console.log('Reverse test output:', result);
        return result;
    }

    /**
     * Convert Python code to Common Test notation
     */
    pythonToCommonTest(pythonCode) {
        const lines = pythonCode.split('\n');
        const result = [];
        this.indentStack = [0];
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const trimmed = line.trim();
            
            if (trimmed === '' || trimmed.startsWith('#')) {
                result.push(line);
                continue;
            }
            
            const currentIndent = line.length - line.trimStart().length;
            
            // Handle dedent
            while (this.indentStack.length > 1 && currentIndent < this.indentStack[this.indentStack.length - 1]) {
                this.indentStack.pop();
            }
            
            // Convert the line
            const converted = this.convertLine(trimmed, currentIndent, i, lines);
            
            // Add appropriate prefix for indented content
            if (this.indentStack.length > 1) {
                let prefix = '';
                let isLastInBlock = false;
                
                // Check if this is the last line in the current block
                for (let j = i + 1; j < lines.length; j++) {
                    const nextLine = lines[j].trim();
                    if (nextLine === '') continue; // Skip empty lines
                    
                    const nextIndent = lines[j].length - lines[j].trimStart().length;
                    if (nextIndent < currentIndent) {
                        isLastInBlock = true;
                        break;
                    } else if (nextIndent >= currentIndent) {
                        break;
                    }
                }
                
                // Use appropriate symbol
                if (isLastInBlock || i === lines.length - 1) {
                    prefix = '⎿ '.repeat(this.indentStack.length - 1);
                } else {
                    prefix = '｜ '.repeat(this.indentStack.length - 1);
                }
                
                result.push(prefix + converted);
            } else {
                result.push(converted);
            }
            
            // Update indent stack
            if (trimmed.endsWith(':')) {
                this.indentStack.push(currentIndent + 4);
            }
        }
        
        return result.join('\n');
    }

    /**
     * Convert individual line from Python to Common Test
     */
    convertLine(line, indent, lineIndex, allLines) {
        // Variable assignment with input()
        if (line.includes('= input(')) {
            const parts = line.split('= input(');
            return parts[0] + '= 【外部からの入力】';
        }
        
        // print statement
        if (line.startsWith('print(')) {
            const content = line.substring(6, line.length - 1);
            return '表示する(' + content + ')';
        }
        
        // if statement
        if (line.startsWith('if ')) {
            const condition = line.substring(3, line.length - 1);
            return 'もし ' + condition + ' ならば:';
        }
        
        // elif statement
        if (line.startsWith('elif ')) {
            const condition = line.substring(5, line.length - 1);
            return 'そうでなくもし ' + condition + ' ならば:';
        }
        
        // else statement
        if (line === 'else:') {
            return 'そうでなければ:';
        }
        
        // while loop
        if (line.startsWith('while ')) {
            const condition = line.substring(6, line.length - 1);
            return condition + ' の間繰り返す:';
        }
        
        // for loop with range
        if (line.startsWith('for ') && line.includes(' in range(')) {
            const match = line.match(/for\s+(\w+)\s+in\s+range\((.*)\):/);
            if (match) {
                const variable = match[1];
                const params = match[2].split(',').map(p => p.trim());
                
                if (params.length === 1) {
                    return variable + ' を 0 から ' + params[0] + '-1 まで 1 ずつ増やしながら繰り返す:';
                } else if (params.length === 2) {
                    return variable + ' を ' + params[0] + ' から ' + params[1] + '-1 まで 1 ずつ増やしながら繰り返す:';
                } else if (params.length === 3) {
                    const step = parseInt(params[2]);
                    if (step > 0) {
                        return variable + ' を ' + params[0] + ' から ' + params[1] + '-1 まで ' + params[2] + ' ずつ増やしながら繰り返す:';
                    } else {
                        return variable + ' を ' + params[0] + ' から ' + params[1] + '+1 まで ' + Math.abs(step) + ' ずつ減らしながら繰り返す:';
                    }
                }
            }
        }
        
        // Replace operators and functions
        line = this.replaceOperators(line);
        
        // Array names (capitalize first letter if it's a list assignment)
        if (line.includes(' = [')) {
            const varName = line.split('=')[0].trim();
            if (varName[0] === varName[0].toLowerCase()) {
                line = line.replace(varName, varName[0].toUpperCase() + varName.slice(1));
            }
        }
        
        return line;
    }

    /**
     * Common Test to Python converter
     */
    commonTestToPython(commonTestCode) {
        const lines = commonTestCode.split('\n');
        const result = [];
        let indentLevel = 0;
        
        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            let trimmed = line.trim();
            
            // Remove control symbols and get actual content
            trimmed = trimmed.replace(/^[｜⎿\s]+/, '');
            
            if (trimmed === '' || trimmed.startsWith('#')) {
                result.push(line);
                continue;
            }
            
            // Handle dedenting by checking the visual structure
            const originalSymbols = line.match(/^[｜⎿\s]*/)[0];
            const symbolDepth = (originalSymbols.match(/[｜⎿]/g) || []).length;
            
            // Adjust indent level based on symbol depth
            if (symbolDepth < indentLevel && symbolDepth >= 0) {
                indentLevel = symbolDepth;
            }
            
            // Special handling for else/elif which should be at same level as if
            if (trimmed.startsWith('そうでなければ') || trimmed.startsWith('そうでなくもし')) {
                indentLevel = Math.max(0, indentLevel);
            }
            
            // Convert the line
            const converted = this.convertLineToPython(trimmed);
            
            // Add indentation
            result.push('    '.repeat(indentLevel) + converted);
            
            // Increase indent after colon
            if (converted.endsWith(':')) {
                indentLevel++;
            }
        }
        
        return result.join('\n');
    }

    /**
     * Convert individual line from Common Test to Python
     */
    convertLineToPython(line) {
        // Input
        if (line.includes('【外部からの入力】')) {
            return line.replace('【外部からの入力】', 'input()');
        }
        
        // Display
        if (line.startsWith('表示する(')) {
            const content = line.substring(5, line.length - 1);
            return 'print(' + content + ')';
        }
        
        // If statement
        if (line.startsWith('もし ') && line.endsWith(' ならば:')) {
            const condition = line.substring(3, line.length - 6);
            return 'if ' + condition + ':';
        }
        
        // Elif statement
        if (line.startsWith('そうでなくもし ') && line.endsWith(' ならば:')) {
            const condition = line.substring(8, line.length - 6);
            return 'elif ' + condition + ':';
        }
        
        // Else statement
        if (line === 'そうでなければ:') {
            return 'else:';
        }
        
        // While loop
        if (line.endsWith(' の間繰り返す:')) {
            const condition = line.substring(0, line.length - 8);
            return 'while ' + condition + ':';
        }
        
        // For loop
        const forMatch = line.match(/(\w+)\s*を\s*(\d+)\s*から\s*(.+?)\s*まで\s*(\d+)\s*ずつ(増やし|減らし)ながら繰り返す:/);
        if (forMatch) {
            const variable = forMatch[1];
            const start = forMatch[2];
            let end = forMatch[3];
            const step = forMatch[4];
            const direction = forMatch[5];
            
            if (direction === '増やし') {
                end = end.replace('-1', '');
                return `for ${variable} in range(${start}, ${end}, ${step}):`;
            } else {
                end = end.replace('+1', '');
                return `for ${variable} in range(${start}, ${end}, -${step}):`;
            }
        }
        
        // Replace functions and operators back to Python
        line = this.replaceOperatorsReverse(line);
        
        // Lowercase array names
        const arrayMatch = line.match(/^([A-Z]\w*)\s*=/);
        if (arrayMatch) {
            const varName = arrayMatch[1];
            line = line.replace(varName, varName[0].toLowerCase() + varName.slice(1));
        }
        
        return line;
    }

    /**
     * Replace operators for Python to Common Test conversion
     */
    replaceOperators(line) {
        return line
            .replace(/\blen\(/g, '要素数(')
            .replace(/\bint\(/g, '整数(')
            .replace(/\bstr\(/g, '文字列(')
            .replace(/\brandom\(\)/g, '乱数()')
            .replace(/\/\//g, '÷')
            .replace(/%/g, '％');
    }

    /**
     * Replace operators for Common Test to Python conversion
     */
    replaceOperatorsReverse(line) {
        return line
            .replace(/要素数\(/g, 'len(')
            .replace(/整数\(/g, 'int(')
            .replace(/文字列\(/g, 'str(')
            .replace(/乱数\(\)/g, 'random()')
            .replace(/÷/g, '//')
            .replace(/％/g, '%');
    }
}

// Export for use in other modules
window.Converter = Converter;