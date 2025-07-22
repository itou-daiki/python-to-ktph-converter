/**
 * CodeMirror mode for Common Test Programming Notation (共通テスト用プログラム表記)
 * Custom syntax highlighting for Japanese programming notation used in university entrance exams
 */

(function(mod) {
    if (typeof exports == "object" && typeof module == "object") // CommonJS
        mod(require("../../../../../../lib/codemirror"));
    else if (typeof define == "function" && define.amd) // AMD
        define(["../../../../../../lib/codemirror"], mod);
    else // Plain browser env
        mod(CodeMirror);
})(function(CodeMirror) {
    "use strict";

    CodeMirror.defineMode("commontest", function(config, parserConfig) {
        
        // Keywords and control structures in Japanese
        const keywords = {
            // Control flow
            "もし": "keyword",
            "ならば": "keyword", 
            "そうでなければ": "keyword",
            "そうでなくもし": "keyword",
            "の間繰り返す": "keyword",
            "を": "keyword",
            "から": "keyword", 
            "まで": "keyword",
            "ずつ": "keyword",
            "増やしながら繰り返す": "keyword",
            "減らしながら繰り返す": "keyword",
            
            // Functions
            "表示する": "builtin",
            "要素数": "builtin",
            "整数": "builtin", 
            "文字列": "builtin",
            "実数": "builtin",
            "乱数": "builtin"
        };
        
        // Operators in Japanese/symbols
        const operators = ["÷", "％", "+", "-", "*", "=", "==", "!=", "<", ">", "<=", ">="];
        
        // Special input notation
        const specialInputPattern = /【外部からの入力】/;
        
        // Tree structure symbols
        const treeSymbols = /^[｜⎿\s]*/;
        
        return {
            startState: function() {
                return {
                    inTreeStructure: false
                };
            },
            
            token: function(stream, state) {
                // Handle tree structure symbols at the beginning of lines
                if (stream.sol()) {
                    const treeMatch = stream.match(treeSymbols);
                    if (treeMatch && treeMatch[0].length > 0) {
                        return "tree-structure";
                    }
                }
                
                // Handle special input notation
                if (stream.match(specialInputPattern)) {
                    return "special-input";
                }
                
                // Handle strings
                if (stream.match(/^"([^"\\]|\\.)*"/)) {
                    return "string";
                }
                if (stream.match(/^'([^'\\]|\\.)*'/)) {
                    return "string";
                }
                
                // Handle numbers
                if (stream.match(/^[0-9]+(\.[0-9]+)?/)) {
                    return "number";
                }
                
                // Handle operators
                for (let op of operators) {
                    if (stream.match(op)) {
                        return "operator";
                    }
                }
                
                // Handle keywords and built-in functions
                // Look for longest match first
                let longestMatch = "";
                let tokenType = null;
                
                for (let keyword in keywords) {
                    if (stream.string.substr(stream.pos).startsWith(keyword)) {
                        if (keyword.length > longestMatch.length) {
                            longestMatch = keyword;
                            tokenType = keywords[keyword];
                        }
                    }
                }
                
                if (longestMatch) {
                    stream.pos += longestMatch.length;
                    return tokenType;
                }
                
                // Handle function calls (look for parentheses after keywords)
                const remaining = stream.string.substr(stream.pos);
                const funcMatch = remaining.match(/^([a-zA-Z_あ-ん\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]+)\s*\(/);
                if (funcMatch) {
                    stream.pos += funcMatch[1].length;
                    return "variable-2";
                }
                
                // Handle variable names (including Japanese characters)
                if (stream.match(/^[a-zA-Z_あ-ん\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf][a-zA-Z0-9_あ-ん\u3040-\u309f\u30a0-\u30ff\u4e00-\u9faf]*/)) {
                    return "variable";
                }
                
                // Handle comments (lines starting with #)
                if (stream.match(/^#.*/)) {
                    return "comment";
                }
                
                // Handle parentheses and brackets
                if (stream.match(/^[()[\]{}]/)) {
                    return "bracket";
                }
                
                // Handle commas and semicolons
                if (stream.match(/^[,;]/)) {
                    return "punctuation";
                }
                
                // Skip whitespace
                if (stream.match(/^\s+/)) {
                    return null;
                }
                
                // Default: advance one character
                stream.next();
                return null;
            }
        };
    });

    CodeMirror.defineMIME("text/commontest", "commontest");
    CodeMirror.defineMIME("text/x-commontest", "commontest");
});