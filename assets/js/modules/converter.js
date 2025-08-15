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
            const converted = this.convertLine(trimmed);
            
            // Add appropriate prefix for indented content
            if (this.indentStack.length > 1) {
                let prefix = '';
                
                // Determine which blocks will close after this line
                let nextIndent = null;
                
                // Find the next non-empty, non-comment line
                let nextLineContent = '';
                for (let j = i + 1; j < lines.length; j++) {
                    const nextLine = lines[j].trim();
                    if (nextLine === '' || nextLine.startsWith('#')) continue;
                    nextIndent = lines[j].length - lines[j].trimStart().length;
                    nextLineContent = nextLine;
                    break;
                }
                
                // If no next line found, treat as file end (indent 0)
                if (nextIndent === null) {
                    nextIndent = 0;
                }
                
                // Determine which blocks will close after this line
                prefix = '';
                
                // Build prefix based on which blocks will close
                for (let level = 0; level < this.indentStack.length - 1; level++) {
                    const blockIndent = this.indentStack[level + 1];
                    
                    // Special case: if next line is else/elif at same level as if, 
                    // don't close the if block yet
                    let willClose = nextIndent < blockIndent;
                    
                    if (willClose && nextIndent === blockIndent - 4) {
                        // Next line is at the same level as the block header
                        if (nextLineContent.startsWith('else:') || nextLineContent.startsWith('elif ')) {
                            // This is continuing the if-else structure, don't close the block
                            willClose = false;
                        }
                    }
                    
                    if (willClose) {
                        prefix += '⎿ ';
                    } else {
                        prefix += '｜ ';
                    }
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
    convertLine(line) {
        // import random - skip this line
        if (line.startsWith('import random')) {
            return '';
        }
        
        // Variable assignment with input() - handle various patterns
        if (line.includes('input(')) {
            // Handle int(input("prompt")), str(input("prompt")), float(input("prompt")) etc.
            line = line.replace(/int\(input\([^)]*\)\)/g, '【外部からの入力】');
            line = line.replace(/str\(input\([^)]*\)\)/g, '【外部からの入力】');
            line = line.replace(/float\(input\([^)]*\)\)/g, '【外部からの入力】');
            // Handle simple input()
            line = line.replace(/input\([^)]*\)/g, '【外部からの入力】');
        }
        
        // print statement - handle f-strings
        if (line.startsWith('print(')) {
            let content = line.substring(6, line.length - 1);
            
            // Convert f-strings to concatenation format
            if (content.startsWith('f"') || content.startsWith("f'")) {
                content = this.convertFStringToConcat(content);
            }
            
            // Remove str() function calls from print content
            content = content.replace(/str\([^)]+\)/g, function(match) {
                return match.substring(4, match.length - 1); // Remove str( and )
            });
            
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
                    // Check if params[0] is a number or variable
                    const param = params[0];
                    if (!isNaN(parseInt(param))) {
                        const end = parseInt(param) - 1;
                        return variable + ' を 0 から ' + end + ' まで 1 ずつ増やしながら繰り返す:';
                    } else {
                        // If it's a variable, use the variable-1 format
                        return variable + ' を 0 から ' + param + '-1 まで 1 ずつ増やしながら繰り返す:';
                    }
                } else if (params.length === 2) {
                    const end = parseInt(params[1]) - 1;
                    return variable + ' を ' + params[0] + ' から ' + end + ' まで 1 ずつ増やしながら繰り返す:';
                } else if (params.length === 3) {
                    const step = parseInt(params[2]);
                    if (step > 0) {
                        const end = parseInt(params[1]) - 1;
                        return variable + ' を ' + params[0] + ' から ' + end + ' まで ' + params[2] + ' ずつ増やしながら繰り返す:';
                    } else {
                        const end = parseInt(params[1]) + 1;
                        return variable + ' を ' + params[0] + ' から ' + end + ' まで ' + Math.abs(step) + ' ずつ減らしながら繰り返す:';
                    }
                }
            }
        }
        
        // Handle multiple assignments in one line (Python: x = 1; y = 2 -> Common Test: x = 1, y = 2)
        if (line.includes(';')) {
            line = line.replace(/;\s*/g, ', ');
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
        
        // Array initialization patterns (e.g., array.fill(0))
        const fillMatch = line.match(/(\w+)\.fill\(([^)]+)\)/);
        if (fillMatch) {
            const arrayName = fillMatch[1];
            const value = fillMatch[2];
            const capitalizedName = arrayName[0].toUpperCase() + arrayName.slice(1);
            line = line.replace(fillMatch[0], capitalizedName + 'のすべての値を' + value + 'にする');
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
        
        // Check if random function is used in the code
        const needsRandomImport = commonTestCode.includes('乱数()');
        
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
        
        // Add import statement at the beginning if random function is used
        if (needsRandomImport) {
            // Check if import random already exists
            const hasImportRandom = result.some(line => 
                line.trim() === 'import random' || line.includes('from random import')
            );
            
            if (!hasImportRandom) {
                result.unshift('import random');
            }
        }
        
        return result.join('\n');
    }

    /**
     * Convert f-string to concatenation format for Common Test notation
     */
    convertFStringToConcat(fstring) {
        // Remove f prefix and quotes
        let content = fstring.slice(2, -1); // Remove f" and "
        
        // Simple regex to find {variable} patterns
        const parts = [];
        let currentPart = '';
        let i = 0;
        
        while (i < content.length) {
            if (content[i] === '{') {
                // Found start of variable
                if (currentPart) {
                    parts.push('"' + currentPart + '"');
                    currentPart = '';
                }
                
                // Find the end of the variable
                let j = i + 1;
                while (j < content.length && content[j] !== '}') {
                    j++;
                }
                
                if (j < content.length) {
                    // Extract variable name
                    const variable = content.slice(i + 1, j);
                    parts.push(variable);
                    i = j + 1;
                } else {
                    // No closing brace found, treat as literal
                    currentPart += content[i];
                    i++;
                }
            } else {
                currentPart += content[i];
                i++;
            }
        }
        
        // Add remaining part
        if (currentPart) {
            parts.push('"' + currentPart + '"');
        }
        
        // Join with comma and space for concatenation
        return parts.join(', ');
    }

    /**
     * Convert individual line from Common Test to Python
     */
    convertLineToPython(line) {
        // Input - handle various patterns
        if (line.includes('【外部からの入力】')) {
            // According to official specification: 【外部からの入力】 = int(input())
            line = line.replace(/【外部からの入力】/g, 'int(input())');
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
        const forMatch = line.match(/(\w+)\s*を\s*(\d+)\s*から\s*(\d+)\s*まで\s*(\d+)\s*ずつ(増やし|減らし)ながら繰り返す:/);
        if (forMatch) {
            const variable = forMatch[1];
            const start = parseInt(forMatch[2]);
            const end = parseInt(forMatch[3]);
            const step = parseInt(forMatch[4]);
            const direction = forMatch[5];
            
            if (direction === '増やし') {
                // Convert back to Python range: end value needs +1
                return `for ${variable} in range(${start}, ${end + 1}, ${step}):`;
            } else {
                // For decreasing: end value needs -1
                return `for ${variable} in range(${start}, ${end - 1}, -${step}):`;
            }
        }
        
        // Array initialization pattern
        const arrayFillMatch = line.match(/(\w+)のすべての値を(\d+)にする/);
        if (arrayFillMatch) {
            const arrayName = arrayFillMatch[1].toLowerCase();
            const value = arrayFillMatch[2];
            return `${arrayName} = [${value}] * len(${arrayName})`;
        }
        
        // Handle multiple assignments in one line (Common Test: x = 1, y = 2 -> Python: x = 1; y = 2)
        // Only convert comma-separated assignments, not function parameters
        if (line.includes(',') && line.includes('=') && !line.startsWith('表示する(') && !line.includes('(')) {
            // Simple heuristic: if line contains comma and equals sign but no function call
            const assignmentPattern = /^[^()]*=.*,.*=[^()]*/;
            if (assignmentPattern.test(line)) {
                line = line.replace(/,\s*/g, '; ');
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
            .replace(/\bstr\(/g, '')  // Remove str() completely for Common Test format
            .replace(/\bfloat\(/g, '実数(')
            .replace(/\brandom\.randint\((\d+),\s*(\d+)\)/g, '乱数($1,$2)')
            .replace(/\brandom\.random\(\)/g, '乱数()')
            .replace(/\brandom\(\)/g, '乱数()')
            .replace(/\*\*/g, '**')    // Keep ** as is for power operation (べき乗)
            .replace(/\/\//g, '÷')
            .replace(/%/g, '％')
            // Logical operators - keep as English in Common Test notation
            .replace(/\band\b/g, 'and')
            .replace(/\bor\b/g, 'or') 
            .replace(/\bnot\b/g, 'not');
    }

    /**
     * Replace operators for Common Test to Python conversion
     */
    replaceOperatorsReverse(line) {
        return line
            .replace(/要素数\(/g, 'len(')
            .replace(/整数\(/g, 'int(')
            .replace(/文字列\(/g, 'str(')
            .replace(/実数\(/g, 'float(')
            .replace(/乱数\((\d+),\s*(\d+)\)/g, 'random.randint($1, $2)')
            .replace(/乱数\(\)/g, 'random.random()')
            .replace(/÷/g, '//')
            .replace(/％/g, '%')
            // Logical operators remain the same (English in both notations)
            .replace(/\band\b/g, 'and')
            .replace(/\bor\b/g, 'or')
            .replace(/\bnot\b/g, 'not');
            // ** remains as ** for power operation (べき乗)
    }
}

// Export for use in other modules
window.Converter = Converter;