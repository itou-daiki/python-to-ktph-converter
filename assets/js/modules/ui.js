/**
 * UI Management and Event Handlers
 */
class UIManager {
    constructor() {
        this.pythonEditor = null;
        this.commonTestEditor = null;
        this.samplesConfig = null;
        this.autocompleteDelay = 120;
        this.autocompleteTimers = new WeakMap();
        this.pythonIndentGuideMarks = [];
        this.pythonIndentGuideRefreshTimer = null;
    }

    /**
     * Initialize CodeMirror editors
     */
    initializeEditors() {
        console.log('Initializing editors...');
        
        const pythonContainer = document.getElementById('pythonEditor');
        const commonTestContainer = document.getElementById('commonTestEditor');
        
        if (!pythonContainer) {
            throw new Error('Python editor container not found');
        }
        
        if (!commonTestContainer) {
            throw new Error('Common test editor container not found');
        }

        this.registerAutocompleteHelpers();
        const hintOptions = this.createHintOptions();
        
        console.log('Creating Python editor...');
        this.pythonEditor = CodeMirror(pythonContainer, {
            mode: 'python',
            theme: 'material-darker',
            lineNumbers: true,
            matchBrackets: true,
            indentUnit: 4,
            indentWithTabs: false,
            lineWrapping: false,
            placeholder: 'Pythonコードを入力してください...',
            viewportMargin: 10,
            scrollbarStyle: 'native',
            autoCloseBrackets: true,
            hintOptions,
            extraKeys: {
                'Ctrl-Space': (cm) => this.showAutocomplete(cm),
                'Cmd-Space': (cm) => this.showAutocomplete(cm),
                'Tab': (cm) => this.handleTabKey(cm)
            }
        });
        console.log('Python editor created:', !!this.pythonEditor);

        console.log('Creating Common Test editor...');
        this.commonTestEditor = CodeMirror(commonTestContainer, {
            mode: 'commontest',
            theme: 'material-darker',
            lineNumbers: true,
            lineWrapping: false,
            placeholder: '共通テスト用プログラム表記を入力してください...',
            viewportMargin: 10,
            scrollbarStyle: 'native',
            autoCloseBrackets: true,
            hintOptions,
            extraKeys: {
                'Ctrl-Space': (cm) => this.showAutocomplete(cm),
                'Cmd-Space': (cm) => this.showAutocomplete(cm),
                'Tab': (cm) => this.handleTabKey(cm)
            }
        });
        console.log('Common Test editor created:', !!this.commonTestEditor);

        this.setupEditorAutocomplete(this.pythonEditor);
        this.setupEditorAutocomplete(this.commonTestEditor);
        this.setupPythonIndentGuides();

        // Force line numbers to be visible immediately
        this.forceLineNumbers();
        
        // Force line numbers multiple times with delays
        setTimeout(() => {
            this.forceLineNumbers();
        }, 50);
        
        // Refresh editors to ensure proper sizing
        setTimeout(() => {
            this.refreshEditors();
            this.forceLineNumbers();
        }, 100);
        
        // Additional refresh after layout stabilizes
        setTimeout(() => {
            this.refreshEditors();
            this.forceLineNumbers();
        }, 500);
        
        // Also refresh on window resize
        window.addEventListener('resize', () => {
            setTimeout(() => {
                this.refreshEditors();
            }, 100);
        });
        
        // Refresh editors when they receive focus
        this.pythonEditor.on('focus', () => {
            setTimeout(() => {
                this.pythonEditor.refresh();
                this.forceLineNumbers();
            }, 50);
        });
        
        this.commonTestEditor.on('focus', () => {
            setTimeout(() => {
                this.commonTestEditor.refresh();
                this.forceLineNumbers();
            }, 50);
        });
        
        // Refresh editors when content changes significantly
        this.pythonEditor.on('change', (cm, change) => {
            this.schedulePythonIndentGuideRefresh();
            if (change.text.length > 1 || change.removed.length > 1) {
                setTimeout(() => {
                    this.pythonEditor.refresh();
                }, 100);
            }
        });
        
        this.commonTestEditor.on('change', (cm, change) => {
            if (change.text.length > 1 || change.removed.length > 1) {
                setTimeout(() => {
                    this.commonTestEditor.refresh();
                }, 100);
            }
        });
        
        // Keep startup free of synthetic editor writes. URL restore and sample loading
        // should be the only initialization paths that change user-visible code.
    }

    /**
     * Register CodeMirror completion providers.
     */
    registerAutocompleteHelpers() {
        if (typeof CodeMirror === 'undefined' || !CodeMirror.registerHelper) return;

        CodeMirror.registerHelper('hint', 'python', (cm) => this.getHintResult(cm, 'python'));
        CodeMirror.registerHelper('hint', 'commontest', (cm) => this.getHintResult(cm, 'commontest'));
    }

    /**
     * Shared hint keyboard behavior.
     */
    createHintOptions() {
        return {
            completeSingle: false,
            closeOnUnfocus: true,
            customKeys: {
                Up: (cm, handle) => handle.moveFocus(-1),
                Down: (cm, handle) => handle.moveFocus(1),
                Tab: (cm, handle) => handle.pick(),
                Enter: (cm, handle) => handle.pick(),
                Esc: (cm, handle) => handle.close()
            }
        };
    }

    /**
     * Open completions while typing useful token characters.
     */
    setupEditorAutocomplete(editor) {
        if (!editor || typeof editor.showHint !== 'function') return;

        editor.on('inputRead', (cm, change) => {
            if (!this.shouldOpenAutocomplete(cm, change)) return;

            const existingTimer = this.autocompleteTimers.get(cm);
            if (existingTimer) clearTimeout(existingTimer);

            const timer = setTimeout(() => {
                this.showAutocomplete(cm);
            }, this.autocompleteDelay);
            this.autocompleteTimers.set(cm, timer);
        });
    }

    setupPythonIndentGuides() {
        if (!this.pythonEditor) return;

        this.pythonEditor.on('cursorActivity', () => this.schedulePythonIndentGuideRefresh());
        this.pythonEditor.on('viewportChange', () => this.schedulePythonIndentGuideRefresh());
        this.schedulePythonIndentGuideRefresh();
    }

    schedulePythonIndentGuideRefresh() {
        if (!this.pythonEditor) return;

        if (this.pythonIndentGuideRefreshTimer) {
            clearTimeout(this.pythonIndentGuideRefreshTimer);
        }

        this.pythonIndentGuideRefreshTimer = setTimeout(() => {
            this.pythonIndentGuideRefreshTimer = null;
            this.refreshPythonIndentGuides();
        }, 40);
    }

    refreshPythonIndentGuides() {
        const editor = this.pythonEditor;
        if (!editor || typeof editor.markText !== 'function') return;

        const indentUnit = editor.getOption('indentUnit') || 4;
        const cursor = editor.getCursor();
        const activeIndentDepth = this.getPythonLineIndentDepth(editor, cursor.line, indentUnit);
        const viewport = editor.getViewport ? editor.getViewport() : {
            from: editor.firstLine(),
            to: editor.lastLine() + 1
        };
        const firstLine = Math.max(editor.firstLine(), viewport.from - 8);
        const lastLine = Math.min(editor.lastLine(), viewport.to + 8);

        editor.operation(() => {
            this.pythonIndentGuideMarks.forEach((mark) => mark.clear());
            this.pythonIndentGuideMarks = [];

            for (let lineNo = firstLine; lineNo <= lastLine; lineNo += 1) {
                const line = editor.getLine(lineNo);
                const leadingWhitespace = line.match(/^[\t ]*/)[0];
                if (!leadingWhitespace) continue;

                const guideColumns = this.getPythonIndentGuideColumns(leadingWhitespace, indentUnit);
                guideColumns.forEach((columnInfo) => {
                    const isActive = columnInfo.depth <= activeIndentDepth;
                    const cssClass = isActive
                        ? 'python-indent-guide python-indent-guide-active'
                        : 'python-indent-guide';
                    const mark = editor.markText(
                        {line: lineNo, ch: columnInfo.ch},
                        {line: lineNo, ch: columnInfo.ch + 1},
                        {
                            className: cssClass,
                            inclusiveLeft: false,
                            inclusiveRight: false,
                            clearWhenEmpty: true
                        }
                    );
                    this.pythonIndentGuideMarks.push(mark);
                });
            }
        });
    }

    getPythonLineIndentDepth(editor, lineNo, indentUnit) {
        const line = editor.getLine(lineNo) || '';
        const leadingWhitespace = line.match(/^[\t ]*/)[0];
        const columns = this.getIndentColumnWidth(leadingWhitespace, indentUnit);

        return Math.floor(columns / indentUnit);
    }

    getPythonIndentGuideColumns(leadingWhitespace, indentUnit) {
        const guideColumns = [];
        let columns = 0;

        for (let ch = 0; ch < leadingWhitespace.length; ch += 1) {
            if (columns % indentUnit === 0) {
                guideColumns.push({
                    ch,
                    depth: Math.floor(columns / indentUnit) + 1
                });
            }

            columns += leadingWhitespace.charAt(ch) === '\t'
                ? indentUnit - (columns % indentUnit || 0)
                : 1;
        }

        return guideColumns;
    }

    getIndentColumnWidth(leadingWhitespace, indentUnit) {
        let columns = 0;

        for (let i = 0; i < leadingWhitespace.length; i += 1) {
            columns += leadingWhitespace.charAt(i) === '\t'
                ? indentUnit - (columns % indentUnit || 0)
                : 1;
        }

        return columns;
    }

    shouldOpenAutocomplete(cm, change) {
        if (cm.state.completionActive) return false;
        if (!change || change.origin === 'complete') return false;
        if (!change.text || change.text.length !== 1) return false;

        const inserted = change.text[0];
        if (!/^[A-Za-z0-9_ぁ-んァ-ヶ一-龠々ー｜⎿【】.]$/.test(inserted)) {
            return false;
        }

        const context = this.getCompletionContext(cm);
        if (context.suppress) return false;
        if (context.isPropertyAccess) return cm === this.pythonEditor;
        if (/[ぁ-んァ-ヶ一-龠々ー｜⎿【】]/.test(context.token)) return true;
        return context.token.length >= 2;
    }

    showAutocomplete(cm) {
        if (!cm || typeof cm.showHint !== 'function') return;

        const mode = cm === this.commonTestEditor ? 'commontest' : 'python';
        const helper = mode === 'commontest' ? CodeMirror.hint.commontest : CodeMirror.hint.python;

        cm.showHint({
            hint: helper,
            completeSingle: false,
            closeOnUnfocus: true,
            customKeys: this.createHintOptions().customKeys
        });
    }

    handleTabKey(cm) {
        if (cm.state.completionActive) {
            return CodeMirror.Pass;
        }

        if (cm.somethingSelected()) {
            cm.indentSelection('add');
            return;
        }

        const spaces = ' '.repeat(cm.getOption('indentUnit') || 4);
        cm.replaceSelection(spaces, 'end', '+input');
    }

    getHintResult(cm, mode) {
        const context = this.getCompletionContext(cm);
        if (context.suppress) {
            return {
                list: [],
                from: context.from,
                to: context.to,
                completionContext: context
            };
        }

        const identifiers = this.getEditorIdentifiers(cm, context);
        const completions = this.getCompletionList(mode, identifiers, context);
        const filtered = this.filterAndRankCompletions(completions, context);

        return {
            list: filtered,
            from: context.from,
            to: context.to,
            completionContext: context
        };
    }

    getCompletionContext(cm) {
        const cursor = cm.getCursor();
        const line = cm.getLine(cursor.line) || '';
        const tokenInfo = cm.getTokenAt(cursor);
        const tokenType = tokenInfo && tokenInfo.type ? tokenInfo.type : '';
        const suppress = /\b(comment|string)\b/.test(tokenType);
        let start = cursor.ch;

        while (start > 0 && this.isCompletionTokenChar(line.charAt(start - 1))) {
            start -= 1;
        }

        const token = line.slice(start, cursor.ch);
        const hasPropertyDot = start > 0 && line.charAt(start - 1) === '.';
        const beforeToken = line.slice(0, start);
        const propertyOwnerMatch = hasPropertyDot
            ? beforeToken.slice(0, -1).match(/([A-Za-z_]\w*|\]|\))\s*$/)
            : null;
        const isPropertyAccess = Boolean(propertyOwnerMatch);

        return {
            from: CodeMirror.Pos(cursor.line, start),
            to: CodeMirror.Pos(cursor.line, cursor.ch),
            token,
            line,
            cursor,
            suppress,
            isPropertyAccess,
            propertyOwner: propertyOwnerMatch ? propertyOwnerMatch[1] : '',
            lineIndent: (line.match(/^\s*/) || [''])[0],
            commonBodyPrefix: this.getCommonBodyPrefix(line)
        };
    }

    isCompletionTokenChar(char) {
        return /[A-Za-z0-9_$ぁ-んァ-ヶ一-龠々ー]/.test(char);
    }

    getEditorIdentifiers(cm, context = null) {
        const identifiers = new Map();
        const code = cm.getValue();
        const pattern = /[A-Za-z_$ぁ-んァ-ヶ一-龠々ー][A-Za-z0-9_$ぁ-んァ-ヶ一-龠々ー]*/g;
        let match;

        while ((match = pattern.exec(code)) !== null) {
            const value = match[0];
            if (context && value === context.token) continue;
            if (!this.isReservedIdentifier(value)) {
                identifiers.set(value, (identifiers.get(value) || 0) + 1);
            }
        }

        return Array.from(identifiers.entries())
            .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], 'ja'))
            .map(([name]) => name);
    }

    isReservedIdentifier(value) {
        return [
            'and', 'or', 'not', 'if', 'elif', 'else', 'for', 'while', 'in',
            'range', 'print', 'input', 'int', 'float', 'str', 'len', 'def',
            'return', 'True', 'False', 'None', 'import', 'from', 'as', 'break',
            'continue', 'class', 'try', 'except', 'finally', 'with', 'lambda',
            '表示する', '整数', '実数', '文字列', '要素数', '乱数', '関数',
            'もし', 'ならば', 'そうでなくもし', 'そうでなければ'
        ].includes(value);
    }

    getCompletionList(mode, identifiers, context) {
        const base = mode === 'commontest'
            ? this.getCommonTestCompletions(context)
            : this.getPythonCompletions(context);

        if (mode === 'python' && context.isPropertyAccess) {
            return this.getPythonPropertyCompletions(context);
        }

        const identifierCompletions = identifiers.map((identifier) => (
            this.createCompletion(identifier, identifier, '既存の名前', {
                kind: 'identifier',
                priority: -20
            })
        ));

        return base.concat(identifierCompletions);
    }

    getPythonCompletions() {
        return [
            this.createCompletion('print()', 'print(__CURSOR__)', '出力', { aliases: ['display', '表示', '出力'] }),
            this.createCompletion('input()', 'input(__CURSOR__)', '入力', { aliases: ['nyuuryoku', '入力'] }),
            this.createCompletion('int(input())', 'int(input(__CURSOR__))', '整数入力', { aliases: ['整数', 'input int'] }),
            this.createCompletion('float(input())', 'float(input(__CURSOR__))', '実数入力', { aliases: ['実数', 'input float'] }),
            this.createCompletion('len()', 'len(__CURSOR__)', '要素数', { aliases: ['length', '要素数'] }),
            this.createCompletion('range(n)', 'range(__CURSOR__)', '0からn-1'),
            this.createCompletion('range(start, end)', 'range(__CURSOR__, end)', '範囲指定'),
            this.createCompletion('for i in range(n):', 'for i in range(__CURSOR__):\n__PY_BODY__', '回数繰り返し'),
            this.createCompletion('for item in list:', 'for __CURSOR__ in list:\n__PY_BODY__', '配列を順に処理'),
            this.createCompletion('while 条件:', 'while __CURSOR__:\n__PY_BODY__', '条件繰り返し'),
            this.createCompletion('if 条件:', 'if __CURSOR__:\n__PY_BODY__', '条件分岐'),
            this.createCompletion('elif 条件:', 'elif __CURSOR__:\n__PY_BODY__', '追加条件'),
            this.createCompletion('else:', 'else:\n__PY_BODY__', 'その他'),
            this.createCompletion('def 関数():', 'def __CURSOR__():\n__PY_BODY__', '関数定義'),
            this.createCompletion('return', 'return __CURSOR__', '戻り値'),
            this.createCompletion('break', 'break', '繰り返し終了'),
            this.createCompletion('continue', 'continue', '次の繰り返しへ'),
            this.createCompletion('True', 'True', '真'),
            this.createCompletion('False', 'False', '偽'),
            this.createCompletion('None', 'None', '値なし'),
            this.createCompletion('sum()', 'sum(__CURSOR__)', '合計'),
            this.createCompletion('max()', 'max(__CURSOR__)', '最大'),
            this.createCompletion('min()', 'min(__CURSOR__)', '最小'),
            this.createCompletion('sorted()', 'sorted(__CURSOR__)', '並べ替え'),
            this.createCompletion('enumerate()', 'enumerate(__CURSOR__)', '番号つき反復'),
            this.createCompletion('import random', 'import random', '乱数モジュール'),
            this.createCompletion('random.randint()', 'random.randint(__CURSOR__, end)', '整数乱数'),
            this.createCompletion('random.random()', 'random.random()', '0以上1未満の乱数'),
            this.createCompletion('[]', '[__CURSOR__]', 'リスト'),
            this.createCompletion('{}', '{__CURSOR__}', '辞書')
        ];
    }

    getPythonPropertyCompletions() {
        return [
            this.createCompletion('append()', 'append(__CURSOR__)', 'リストへ追加', { aliases: ['add', '追加'] }),
            this.createCompletion('pop()', 'pop(__CURSOR__)', '要素を取り出す'),
            this.createCompletion('sort()', 'sort()', 'リストを並べ替え'),
            this.createCompletion('reverse()', 'reverse()', '逆順にする'),
            this.createCompletion('insert()', 'insert(__CURSOR__, value)', '位置を指定して追加'),
            this.createCompletion('remove()', 'remove(__CURSOR__)', '値を削除'),
            this.createCompletion('count()', 'count(__CURSOR__)', '個数を数える'),
            this.createCompletion('index()', 'index(__CURSOR__)', '位置を探す'),
            this.createCompletion('strip()', 'strip()', '前後の空白削除'),
            this.createCompletion('split()', 'split(__CURSOR__)', '文字列分割'),
            this.createCompletion('join()', 'join(__CURSOR__)', '文字列結合')
        ];
    }

    getCommonTestCompletions() {
        return [
            this.createCompletion('表示する()', '表示する(__CURSOR__)', '出力', { aliases: ['print', 'display', '出力'] }),
            this.createCompletion('【外部からの入力】', '【外部からの入力】', '入力', { aliases: ['input', '入力'] }),
            this.createCompletion('整数(【外部からの入力】)', '整数(【外部からの入力】)', '整数入力'),
            this.createCompletion('整数()', '整数(__CURSOR__)', '整数変換'),
            this.createCompletion('実数()', '実数(__CURSOR__)', '実数変換'),
            this.createCompletion('文字列()', '文字列(__CURSOR__)', '文字列変換'),
            this.createCompletion('要素数()', '要素数(__CURSOR__)', '要素数', { aliases: ['len', 'length'] }),
            this.createCompletion('乱数()', '乱数()', '乱数'),
            this.createCompletion('もし 条件 ならば:', 'もし __CURSOR__ ならば:\n__COMMON_BODY__', '条件分岐', { aliases: ['if'] }),
            this.createCompletion('そうでなくもし 条件 ならば:', 'そうでなくもし __CURSOR__ ならば:\n__COMMON_BODY__', '追加条件', { aliases: ['elif'] }),
            this.createCompletion('そうでなければ:', 'そうでなければ:\n__COMMON_BODY__', 'その他', { aliases: ['else'] }),
            this.createCompletion('条件 の間繰り返す:', '__CURSOR__ の間繰り返す:\n__COMMON_BODY__', 'while相当'),
            this.createCompletion('i を 0 から n まで繰り返す:', 'i を 0 から __CURSOR__ まで 1 ずつ増やしながら繰り返す:\n__COMMON_BODY__', 'for相当'),
            this.createCompletion('i を n から 0 まで繰り返す:', 'i を __CURSOR__ から 0 まで 1 ずつ減らしながら繰り返す:\n__COMMON_BODY__', '逆順for相当'),
            this.createCompletion('関数 関数名():', '関数 __CURSOR__():\n__COMMON_BODY__', '関数定義'),
            this.createCompletion('値 を返す', '__CURSOR__ を返す', '戻り値'),
            this.createCompletion('break', 'break', '繰り返し終了'),
            this.createCompletion('｜', '｜ ', 'ブロック継続'),
            this.createCompletion('⎿', '⎿ ', 'ブロック終了')
        ];
    }

    filterAndRankCompletions(completions, context) {
        const token = context.token.toLowerCase();
        const seen = new Set();

        return completions
            .map((completion, index) => ({
                completion,
                index,
                score: this.getCompletionScore(completion, token)
            }))
            .filter((item) => !token || item.score !== null)
            .sort((a, b) => {
                const scoreDiff = a.score - b.score;
                if (scoreDiff !== 0) return scoreDiff;
                return a.index - b.index;
            })
            .map((item) => item.completion)
            .filter((completion) => {
                const key = `${completion.displayText}\u0000${completion.text}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
            })
            .slice(0, 40);
    }

    getCompletionScore(completion, token) {
        const priority = completion.priority || 0;
        if (!token) return 100 + priority;

        const fields = [
            completion.displayText,
            completion.text,
            completion.detail || '',
            ...(completion.aliases || [])
        ].map((value) => value.toLowerCase());

        if (fields.some((field) => field === token)) return priority;
        if (fields.some((field) => field.startsWith(token))) return 10 + priority;
        if (fields.some((field) => this.matchesAcronym(field, token))) return 35 + priority;
        if (fields.some((field) => field.includes(token))) return 70 + priority;
        return null;
    }

    matchesAcronym(text, token) {
        const acronym = text
            .split(/[^A-Za-z0-9ぁ-んァ-ヶ一-龠々ー]+/)
            .filter(Boolean)
            .map((word) => word[0])
            .join('')
            .toLowerCase();
        return acronym.startsWith(token);
    }

    createCompletion(displayText, text, detail, options = {}) {
        return {
            text,
            displayText,
            detail,
            aliases: options.aliases || [],
            priority: options.priority || 0,
            kind: options.kind || 'snippet',
            render: (element) => {
                const label = document.createElement('span');
                label.className = 'autocomplete-label';
                label.textContent = displayText;
                element.appendChild(label);

                if (detail) {
                    const detailElement = document.createElement('span');
                    detailElement.className = 'autocomplete-detail';
                    detailElement.textContent = detail;
                    element.appendChild(detailElement);
                }
            },
            hint: (cm, data, completion) => {
                const cursorMarker = '__CURSOR__';
                const preparedText = this.prepareCompletionText(completion.text, cm, data.completionContext);
                const markerIndex = preparedText.indexOf(cursorMarker);
                const insertion = preparedText.replace(cursorMarker, '');

                cm.replaceRange(insertion, data.from, data.to, 'complete');

                if (markerIndex !== -1) {
                    const beforeMarker = completion.text.slice(0, markerIndex);
                    const beforeLines = beforeMarker.split('\n');
                    const lineOffset = beforeLines.length - 1;
                    const ch = lineOffset === 0
                        ? data.from.ch + beforeLines[0].length
                        : beforeLines[beforeLines.length - 1].length;

                    cm.setCursor({
                        line: data.from.line + lineOffset,
                        ch
                    });
                }
            }
        };
    }

    prepareCompletionText(text, cm, context) {
        const indentUnit = cm.getOption('indentUnit') || 4;
        const lineIndent = context ? context.lineIndent : '';
        const pythonBodyIndent = lineIndent + ' '.repeat(indentUnit);
        const commonBodyPrefix = context ? context.commonBodyPrefix : '｜ ';

        return text
            .replace(/__PY_BODY__/g, pythonBodyIndent)
            .replace(/__COMMON_BODY__/g, commonBodyPrefix);
    }

    getCommonBodyPrefix(line) {
        const trimmed = line.trimStart();
        const symbols = [];
        let index = 0;

        while (index < trimmed.length) {
            const char = trimmed[index];
            if (char === '｜' || char === '⎿') {
                symbols.push('｜');
                index += 1;
                continue;
            }
            if (char === ' ' || char === '　') {
                index += 1;
                continue;
            }
            break;
        }

        symbols.push('｜');
        return `${symbols.join(' ')} `;
    }

    /**
     * Force line numbers to be visible
     */
    forceLineNumbers() {
        if (this.pythonEditor) {
            // Force line numbers option multiple times
            this.pythonEditor.setOption('lineNumbers', false);
            setTimeout(() => {
                this.pythonEditor.setOption('lineNumbers', true);
                this.pythonEditor.setOption('gutters', ['CodeMirror-linenumbers']);
                // Force complete refresh
                this.pythonEditor.refresh();
                console.log('Python editor line numbers forced');
            }, 10);
        }
        if (this.commonTestEditor) {
            // Force line numbers option multiple times
            this.commonTestEditor.setOption('lineNumbers', false);
            setTimeout(() => {
                this.commonTestEditor.setOption('lineNumbers', true);
                this.commonTestEditor.setOption('gutters', ['CodeMirror-linenumbers']);
                // Force complete refresh
                this.commonTestEditor.refresh();
                console.log('Common test editor line numbers forced');
            }, 10);
        }
        
        // Multiple attempts to force gutters visibility
        for (let attempt = 0; attempt < 3; attempt++) {
            setTimeout(() => {
                const pythonGutters = document.querySelector('#pythonEditor .CodeMirror-gutters');
                const commonTestGutters = document.querySelector('#commonTestEditor .CodeMirror-gutters');
                
                if (pythonGutters) {
                    pythonGutters.style.display = 'block';
                    pythonGutters.style.visibility = 'visible';
                    pythonGutters.style.opacity = '1';
                    pythonGutters.style.width = '40px';
                    pythonGutters.style.minWidth = '40px';
                    pythonGutters.style.backgroundColor = '#263238';
                    pythonGutters.style.borderRight = '1px solid #37474f';
                    
                    // Force line numbers style
                    const lineNumbers = pythonGutters.querySelectorAll('.CodeMirror-linenumber');
                    lineNumbers.forEach(line => {
                        line.style.color = '#90a4ae';
                        line.style.display = 'inline-block';
                        line.style.visibility = 'visible';
                        line.style.opacity = '1';
                        line.style.fontSize = '13px';
                        line.style.fontFamily = 'Consolas, Monaco, monospace';
                    });
                    
                    console.log('Python gutters forced visible (attempt', attempt + 1, ')');
                } else {
                    console.warn('Python gutters not found (attempt', attempt + 1, ')');
                    // Try to recreate the editor if gutters are missing
                    if (attempt === 2 && this.pythonEditor) {
                        this.pythonEditor.setOption('lineNumbers', true);
                        this.pythonEditor.refresh();
                    }
                }
                
                if (commonTestGutters) {
                    commonTestGutters.style.display = 'block';
                    commonTestGutters.style.visibility = 'visible';
                    commonTestGutters.style.opacity = '1';
                    commonTestGutters.style.width = '40px';
                    commonTestGutters.style.minWidth = '40px';
                    commonTestGutters.style.backgroundColor = '#263238';
                    commonTestGutters.style.borderRight = '1px solid #37474f';
                    
                    // Force line numbers style
                    const lineNumbers = commonTestGutters.querySelectorAll('.CodeMirror-linenumber');
                    lineNumbers.forEach(line => {
                        line.style.color = '#90a4ae';
                        line.style.display = 'inline-block';
                        line.style.visibility = 'visible';
                        line.style.opacity = '1';
                        line.style.fontSize = '13px';
                        line.style.fontFamily = 'Consolas, Monaco, monospace';
                    });
                    
                    console.log('Common test gutters forced visible (attempt', attempt + 1, ')');
                } else {
                    console.warn('Common test gutters not found (attempt', attempt + 1, ')');
                    // Try to recreate the editor if gutters are missing
                    if (attempt === 2 && this.commonTestEditor) {
                        this.commonTestEditor.setOption('lineNumbers', true);
                        this.commonTestEditor.refresh();
                    }
                }
            }, 100 * (attempt + 1));
        }
    }

    /**
     * Refresh editors for proper sizing and scrolling
     */
    refreshEditors() {
        if (this.pythonEditor) {
            this.pythonEditor.refresh();
            // Set size to null for both width and height to use CSS
            this.pythonEditor.setSize(null, null);
            // Force scrollbar recalculation
            this.pythonEditor.getScrollInfo();
            // Ensure the last line is visible by scrolling to end then back to position
            const lastLine = this.pythonEditor.lastLine();
            if (lastLine > 0) {
                this.pythonEditor.scrollIntoView({line: lastLine, ch: 0}, 50);
                // Give a moment then scroll back to top for better UX
                setTimeout(() => {
                    this.pythonEditor.scrollTo(null, 0);
                }, 100);
            }
            console.log('Python editor refreshed with enhanced scrolling');
        }
        if (this.commonTestEditor) {
            this.commonTestEditor.refresh();
            // Set size to null for both width and height to use CSS
            this.commonTestEditor.setSize(null, null);
            // Force scrollbar recalculation
            this.commonTestEditor.getScrollInfo();
            // Ensure the last line is visible by scrolling to end then back to position
            const lastLine = this.commonTestEditor.lastLine();
            if (lastLine > 0) {
                this.commonTestEditor.scrollIntoView({line: lastLine, ch: 0}, 50);
                // Give a moment then scroll back to top for better UX
                setTimeout(() => {
                    this.commonTestEditor.scrollTo(null, 0);
                }, 100);
            }
            console.log('Common test editor refreshed with enhanced scrolling');
        }
        
        // Additional refresh with forced recalculation
        setTimeout(() => {
            if (this.pythonEditor) {
                this.pythonEditor.refresh();
                this.pythonEditor.setSize(null, null);
                // Force CodeMirror to recalculate viewport
                this.pythonEditor.operation(() => {
                    this.pythonEditor.refresh();
                });
            }
            if (this.commonTestEditor) {
                this.commonTestEditor.refresh();
                this.commonTestEditor.setSize(null, null);
                // Force CodeMirror to recalculate viewport
                this.commonTestEditor.operation(() => {
                    this.commonTestEditor.refresh();
                });
            }
        }, 200);
    }

    /**
     * Test if editors are working properly
     */
    testEditors() {
        console.log('Testing editors...');
        
        if (this.pythonEditor) {
            this.pythonEditor.setValue('# Test Python editor');
            const testValue = this.pythonEditor.getValue();
            console.log('Python editor test result:', testValue);
            this.pythonEditor.setValue('');
        }
        
        if (this.commonTestEditor) {
            this.commonTestEditor.setValue('# Test Common Test editor');
            const testValue = this.commonTestEditor.getValue();
            console.log('Common test editor test result:', testValue);
            this.commonTestEditor.setValue('');
        }
        
        console.log('Editor testing completed');
    }

    /**
     * Initialize sample configuration
     */
    async initializeSamples() {
        try {
            const response = await fetch('Sample/samples.json');
            this.samplesConfig = await response.json();
            this.populateSampleDropdown();
        } catch (error) {
            console.error('Failed to load samples configuration:', error);
            // Fallback to inline samples if JSON loading fails
            this.samplesConfig = this.getFallbackSamplesConfig();
            this.populateSampleDropdown();
        }
    }

    /**
     * Populate sample dropdown from JSON config
     */
    populateSampleDropdown() {
        const sampleSelect = document.getElementById('sampleSelect');
        if (!sampleSelect || !this.samplesConfig) return;
        
        // Clear existing options except the first one
        while (sampleSelect.children.length > 1) {
            sampleSelect.removeChild(sampleSelect.lastChild);
        }
        
        // Add options from configuration
        this.samplesConfig.samples.forEach(sample => {
            const option = document.createElement('option');
            option.value = sample.id;
            option.textContent = sample.title;
            option.title = sample.description;
            sampleSelect.appendChild(option);
        });
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        console.log('Setting up event listeners');
        
        // Check if the old direction selector exists (for backward compatibility)
        const directionSelector = document.getElementById('conversionDirection');
        if (directionSelector) {
            // Set initial panel labels based on default direction
            const defaultDirection = directionSelector.value;
            this.updatePanelLabels(defaultDirection);
            
            // Direction selector
            directionSelector.addEventListener('change', (e) => {
                this.updatePanelLabels(e.target.value);
            });
        }

        // Convert buttons (Python to Common and Common to Python)
        const convertRightBtn = document.querySelector('.convert-button-right');
        const convertLeftBtn = document.querySelector('.convert-button-left');
        
        // Convert buttons use onclick attributes in HTML, no event listeners needed

        // Run button
        const runBtn = document.querySelector('.run-button');
        if (runBtn) {
            // Remove any existing event listeners to prevent duplicates
            runBtn.onclick = null;
            runBtn.replaceWith(runBtn.cloneNode(true));
            // Re-get the button reference after cloning
            const newRunBtn = document.querySelector('.run-button');
            newRunBtn.addEventListener('click', async () => {
                await window.runCode();
            });
        }

        // Clear button
        const clearBtn = document.querySelector('.clear-button');
        if (clearBtn) {
            clearBtn.addEventListener('click', () => {
                this.clearAll();
            });
        }

        // Load sample button
        const loadSampleBtn = document.querySelector('.load-sample-button');
        if (loadSampleBtn) {
            loadSampleBtn.addEventListener('click', () => {
                const sampleSelect = document.getElementById('sampleSelect');
                const selectedSample = sampleSelect.value;
                
                if (selectedSample) {
                    this.loadSampleCode(selectedSample);
                } else {
                    alert('サンプルを選択してください');
                }
            });
        }

        // Sample selector change event
        const sampleSelect = document.getElementById('sampleSelect');
        if (sampleSelect) {
            sampleSelect.addEventListener('change', (e) => {
                const selectedSample = e.target.value;
                if (selectedSample) {
                    this.loadSampleCode(selectedSample);
                }
            });
        }

        // Share generate button
        const shareGenerateBtn = document.querySelector('.share-generate-button');
        if (shareGenerateBtn) {
            shareGenerateBtn.addEventListener('click', () => {
                this.shareCode();
            });
        }

        // Share copy button
        const shareCopyBtn = document.querySelector('.share-copy-button');
        if (shareCopyBtn) {
            shareCopyBtn.addEventListener('click', async (event) => {
                await this.copyShareUrl(event.target);
            });
        }

        // Python Tutor generate button
        const pythonTutorGenerateBtn = document.querySelector('.python-tutor-generate-button');
        if (pythonTutorGenerateBtn) {
            pythonTutorGenerateBtn.addEventListener('click', () => {
                this.generatePythonTutorUrl();
            });
        }

        // Python Tutor copy button
        const pythonTutorCopyBtn = document.querySelector('.python-tutor-copy-button');
        if (pythonTutorCopyBtn) {
            pythonTutorCopyBtn.addEventListener('click', async (event) => {
                await this.copyPythonTutorUrl(event.target);
            });
        }

        // Python copy button
        const pythonCopyBtn = document.querySelector('.python-copy-button');
        if (pythonCopyBtn) {
            pythonCopyBtn.addEventListener('click', async (event) => {
                await this.copyToClipboard('pythonCode', event.target);
            });
        }

        // Common test copy button
        const commonCopyBtn = document.querySelector('.common-copy-button');
        if (commonCopyBtn) {
            commonCopyBtn.addEventListener('click', async (event) => {
                await this.copyToClipboard('commonTestCode', event.target);
            });
        }

        // Format buttons
        const pythonFormatBtn = document.querySelector('.python-format-button');
        if (pythonFormatBtn) {
            pythonFormatBtn.addEventListener('click', (event) => {
                this.formatEditor('python', event.target);
            });
        }

        const commonFormatBtn = document.querySelector('.common-format-button');
        if (commonFormatBtn) {
            commonFormatBtn.addEventListener('click', (event) => {
                this.formatEditor('commontest', event.target);
            });
        }


        // Enter key in input dialog (remove existing listener first to prevent duplicates)
        const userInput = document.getElementById('userInput');
        userInput.removeEventListener('keypress', this.handleUserInputKeypress);
        this.handleUserInputKeypress = (e) => {
            if (e.key === 'Enter') {
                if (window.executor) {
                    window.executor.submitInput();
                }
            }
        };
        userInput.addEventListener('keypress', this.handleUserInputKeypress);
        
        // Hash change event listener for URL sharing
        window.addEventListener('hashchange', () => {
            this.loadFromUrl();
        });
    }

    /**
     * Update panel labels based on conversion direction
     */
    updatePanelLabels(direction) {
        const leftLabel = document.getElementById('leftPanelLabel');
        const rightLabel = document.getElementById('rightPanelLabel');
        
        if (direction === 'pythonToCommon') {
            leftLabel.textContent = 'Python';
            rightLabel.textContent = '共通テスト用プログラム表記';
        } else {
            leftLabel.textContent = '共通テスト用プログラム表記';
            rightLabel.textContent = 'Python';
        }
    }

    /**
     * Copy text to clipboard
     */
    async copyToClipboard(elementId, buttonElement) {
        let text = '';
        if (elementId === 'pythonCode') {
            text = this.pythonEditor.getValue();
        } else if (elementId === 'commonTestCode') {
            text = this.commonTestEditor.getValue();
        }
        
        const copied = await this.writeClipboardText(text);
        this.flashButton(buttonElement, copied ? 'コピー済み!' : 'コピー不可');
    }

    async writeClipboardText(text) {
        if (navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
            try {
                await navigator.clipboard.writeText(text);
                return true;
            } catch (_) {
                // Fall back for browsers or test environments that deny async clipboard access.
            }
        }

        return this.copyTextWithTextarea(text);
    }

    copyTextWithTextarea(text) {
        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'fixed';
        textarea.style.top = '-9999px';
        textarea.style.left = '-9999px';

        document.body.appendChild(textarea);
        textarea.select();

        try {
            return document.execCommand('copy');
        } catch (_) {
            return false;
        } finally {
            document.body.removeChild(textarea);
        }
    }

    /**
     * Format the selected editor.
     */
    formatEditor(kind, buttonElement) {
        const editor = kind === 'commontest' ? this.commonTestEditor : this.pythonEditor;
        if (!editor) return;

        const original = editor.getValue();
        const formatted = kind === 'commontest'
            ? this.formatCommonTestCode(original)
            : this.formatPythonCode(original);

        editor.setValue(formatted);
        this.refreshEditors();
        this.flashButton(buttonElement, '整形済み');
    }

    formatPythonCode(code) {
        const lines = code.replace(/\r\n/g, '\n').split('\n');
        const formatted = lines.map((line) => {
            const withoutTrailing = line.replace(/\s+$/g, '');
            const normalizedTabs = withoutTrailing.replace(/^\t+/, (tabs) => '    '.repeat(tabs.length));
            return this.normalizeOperatorSpacing(normalizedTabs);
        });

        return this.limitBlankLines(formatted).join('\n').trimEnd();
    }

    formatCommonTestCode(code) {
        const lines = code.replace(/\r\n/g, '\n').split('\n');
        const formatted = lines.map((line) => {
            const withoutTrailing = line.replace(/\s+$/g, '');
            const normalizedPrefix = this.normalizeCommonPrefix(withoutTrailing);
            return this.normalizeOperatorSpacing(normalizedPrefix);
        });

        return this.limitBlankLines(formatted).join('\n').trimEnd();
    }

    normalizeCommonPrefix(line) {
        const trimmed = line.trimStart();
        const symbols = [];
        let index = 0;

        while (index < trimmed.length) {
            const char = trimmed[index];
            if (char === '｜' || char === '⎿') {
                symbols.push(char);
                index += 1;
                continue;
            }
            if (char === ' ' || char === '　') {
                index += 1;
                continue;
            }
            break;
        }

        if (symbols.length === 0) return trimmed;

        const body = trimmed.slice(index).trimStart();
        return `${symbols.join(' ')} ${body}`;
    }

    normalizeOperatorSpacing(line) {
        let result = '';
        let segment = '';
        let quote = null;

        const flushSegment = () => {
            if (!segment) return;
            result += this.formatCodeSegment(segment);
            segment = '';
        };

        for (let index = 0; index < line.length; index++) {
            const char = line[index];
            const previous = line[index - 1];

            if ((char === '"' || char === "'") && previous !== '\\') {
                if (!quote) {
                    flushSegment();
                    quote = char;
                    result += char;
                    continue;
                }

                if (quote === char) {
                    quote = null;
                    result += char;
                    continue;
                }
            }

            if (quote) {
                result += char;
            } else {
                segment += char;
            }
        }

        flushSegment();
        return result;
    }

    formatCodeSegment(segment) {
        let normalized = segment;
        normalized = normalized.replace(/\s*(==|!=|<=|>=|\+=|-=|\*=|\/=|%=|\/\/|\*\*|=|<|>|\+|-|\*|\/|%|％|÷)\s*/g, ' $1 ');
        normalized = normalized.replace(/\s*,\s*/g, ', ');
        normalized = normalized.replace(/\s+([,):\]])/g, '$1');
        normalized = normalized.replace(/([(\[])\s+/g, '$1');
        normalized = normalized.replace(/(^|[=(\[:])\s*-\s+(\d+)/g, '$1-$2');
        normalized = normalized.replace(/(,)\s*-\s+(\d+)/g, '$1 -$2');
        normalized = normalized.replace(/\s{2,}/g, ' ');
        const leading = segment.match(/^\s*/)[0];
        return leading + normalized.trimStart();
    }

    limitBlankLines(lines) {
        const result = [];
        let blankCount = 0;

        for (const line of lines) {
            if (line.trim() === '') {
                blankCount += 1;
                if (blankCount <= 2) {
                    result.push('');
                }
                continue;
            }

            blankCount = 0;
            result.push(line);
        }

        return result;
    }

    flashButton(buttonElement, message) {
        if (!buttonElement) return;

        const originalText = buttonElement.textContent;
        buttonElement.textContent = message;
        setTimeout(() => {
            buttonElement.textContent = originalText;
        }, 1600);
    }

    /**
     * Clear all content
     */
    clearAll() {
        this.pythonEditor.setValue('');
        this.commonTestEditor.setValue('');
        if (window.flowchartGenerator) {
            window.flowchartGenerator.clearFlowchart();
        }
        document.getElementById('output').textContent = '';
        document.getElementById('shareUrl').value = '';
        document.getElementById('pythonTutorUrl').value = '';
        
        // Hide the share URL link
        const shareUrlLink = document.getElementById('shareUrlLink');
        if (shareUrlLink) {
            shareUrlLink.style.display = 'none';
        }
        
        // Hide the Python Tutor URL link
        const pythonTutorLink = document.getElementById('pythonTutorLink');
        if (pythonTutorLink) {
            pythonTutorLink.style.display = 'none';
        }
        
    }

    /**
     * Clear output only
     */
    clearOutput() {
        document.getElementById('output').textContent = '';
    }

    /**
     * Get fallback samples configuration
     */
    getFallbackSamplesConfig() {
        return {
            samples: [
                {
                    id: 'binary-search',
                    title: '二分探索',
                    file: 'binary-search.md',
                    description: 'ソート済み配列から特定の値を効率的に検索'
                },
                {
                    id: 'bubble-sort',
                    title: 'バブルソート',
                    file: 'bubble-sort.md',
                    description: '隣接する要素を比較して交換を繰り返すソートアルゴリズム'
                },
                {
                    id: 'linear-search',
                    title: '線形探索',
                    file: 'linear-search.md',
                    description: '配列を先頭から順に検索するアルゴリズム'
                },
                {
                    id: 'factorial',
                    title: '階乗計算',
                    file: 'factorial.md',
                    description: '再帰を使った階乗計算'
                },
                {
                    id: 'fibonacci',
                    title: 'フィボナッチ数列',
                    file: 'fibonacci.md',
                    description: 'フィボナッチ数列を生成するアルゴリズム'
                },
                {
                    id: 'prime-check',
                    title: '素数判定',
                    file: 'prime-check.md',
                    description: '効率的な素数判定アルゴリズム'
                }
            ]
        };
    }

    /**
     * Get sample codes collection (fallback)
     */
    getSampleCodes() {
        return {
            'binary-search': {
                title: '二分探索',
                code: `# 二分探索の例
data = [3, 18, 29, 33, 48, 52, 62, 77, 89, 97]
kazu = len(data)
print("0～99の数字を入力してください")
atai = int(input())
hidari = 0
migi = kazu - 1
owari = 0

while hidari <= migi and owari == 0:
    aida = (hidari + migi) // 2
    if data[aida] == atai:
        print(atai, "は", aida, "番目にありました")
        owari = 1
    elif data[aida] < atai:
        hidari = aida + 1
    else:
        migi = aida - 1

if owari == 0:
    print(atai, "は見つかりませんでした")

print("添字", " ", "要素")
for i in range(0, kazu):
    print(i, " ", data[i])`
            },
            'bubble-sort': {
                title: 'バブルソート',
                code: `# バブルソートの例
data = [64, 34, 25, 12, 22, 11, 90]
n = len(data)

print("ソート前のデータ:")
for i in range(n):
    print(data[i], end=" ")
print()

# バブルソート
for i in range(n):
    for j in range(0, n - i - 1):
        if data[j] > data[j + 1]:
            # 要素を交換
            data[j], data[j + 1] = data[j + 1], data[j]

print("ソート後のデータ:")
for i in range(n):
    print(data[i], end=" ")
print()`
            },
            'linear-search': {
                title: '線形探索',
                code: `# 線形探索の例
data = [2, 3, 4, 10, 40]
print("検索する値を入力してください")
x = int(input())

# 線形探索
found = False
for i in range(len(data)):
    if data[i] == x:
        print(f"値 {x} は位置 {i} にあります")
        found = True
        break

if not found:
    print(f"値 {x} は見つかりませんでした")`
            },
            'factorial': {
                title: '階乗計算',
                code: `# 階乗計算の例
def factorial(n):
    if n == 0 or n == 1:
        return 1
    else:
        return n * factorial(n - 1)

print("階乗を計算する数を入力してください")
num = int(input())

if num < 0:
    print("負の数の階乗は定義されません")
else:
    result = factorial(num)
    print(f"{num}! = {result}")`
            },
            'fibonacci': {
                title: 'フィボナッチ数列',
                code: `# フィボナッチ数列の例
print("フィボナッチ数列の項数を入力してください")
n = int(input())

# 最初の2項
a, b = 0, 1

print("フィボナッチ数列:")
if n >= 1:
    print(a, end=" ")
if n >= 2:
    print(b, end=" ")

for i in range(2, n):
    c = a + b
    print(c, end=" ")
    a, b = b, c

print()`
            },
            'prime-check': {
                title: '素数判定',
                code: `# 素数判定の例
def is_prime(n):
    if n <= 1:
        return False
    if n <= 3:
        return True
    if n % 2 == 0 or n % 3 == 0:
        return False
    
    i = 5
    while i * i <= n:
        if n % i == 0 or n % (i + 2) == 0:
            return False
        i += 6
    return True

print("素数かどうか調べる数を入力してください")
num = int(input())

if is_prime(num):
    print(f"{num} は素数です")
else:
    print(f"{num} は素数ではありません")`
            }
        };
    }

    /**
     * Load example code
     */
    loadExample() {
        // デフォルトで二分探索を読み込み
        this.loadSampleCode('binary-search');
    }

    /**
     * Load specific sample code from markdown file
     */
    async loadSampleCode(sampleKey) {
        if (!this.samplesConfig) {
            console.error('Samples configuration not loaded');
            return;
        }
        
        const sample = this.samplesConfig.samples.find(s => s.id === sampleKey);
        if (!sample) {
            console.error('Sample not found:', sampleKey);
            return;
        }
        
        try {
            console.log('Loading sample:', sample.title);
            
            if (sample.folder && sample.pythonFile && sample.commonTestFile) {
                // New folder-based structure
                const [pythonResponse, commonTestResponse] = await Promise.all([
                    fetch(`Sample/${sample.folder}/${sample.pythonFile}`),
                    fetch(`Sample/${sample.folder}/${sample.commonTestFile}`)
                ]);
                
                const pythonContent = await pythonResponse.text();
                const commonTestContent = await commonTestResponse.text();
                
                // Extract code from markdown files
                const pythonCodeMatch = pythonContent.match(/```python\n([\s\S]*?)\n```/);
                const commonTestCodeMatch = commonTestContent.match(/```\n([\s\S]*?)\n```/);
                
                if (pythonCodeMatch && pythonCodeMatch[1]) {
                    this.pythonEditor.setValue(pythonCodeMatch[1]);
                }
                
                if (commonTestCodeMatch && commonTestCodeMatch[1]) {
                    this.commonTestEditor.setValue(commonTestCodeMatch[1]);
                }
                
                console.log('Sample loaded successfully from folder structure:', sample.title);
            } else if (sample.file && sample.file.endsWith('.json')) {
                // Legacy JSON format (backward compatibility)
                const response = await fetch(`Sample/${sample.file}`);
                const sampleData = await response.json();
                
                // Load both Python and Common Test code
                if (sampleData.python) {
                    this.pythonEditor.setValue(sampleData.python);
                }
                if (sampleData.commonTest) {
                    this.commonTestEditor.setValue(sampleData.commonTest);
                }
                
                console.log('Sample loaded successfully from JSON format:', sample.title);
            } else {
                // Old markdown format (backward compatibility)
                const response = await fetch(`Sample/${sample.file}`);
                const markdownContent = await response.text();
                
                // Extract code from markdown (try Python first, then plain code blocks)
                let codeMatch = markdownContent.match(/```python\n([\s\S]*?)\n```/);
                let isPythonCode = true;
                
                if (!codeMatch) {
                    // Try plain code block (for Common Test notation)
                    codeMatch = markdownContent.match(/```\n([\s\S]*?)\n```/);
                    isPythonCode = false;
                }
                
                if (codeMatch && codeMatch[1]) {
                    const code = codeMatch[1];
                    
                    if (isPythonCode) {
                        // Set Python code
                        this.pythonEditor.setValue(code);
                        // Auto-convert to Common Test
                        setTimeout(async () => {
                            if (window.convertPythonToCommon) {
                                await window.convertPythonToCommon();
                            }
                        }, 100);
                    } else {
                        // Set Common Test code
                        this.commonTestEditor.setValue(code);
                        // Auto-convert to Python
                        setTimeout(async () => {
                            if (window.convertCommonToPython) {
                                await window.convertCommonToPython();
                            }
                        }, 100);
                    }
                } else {
                    console.error('No code found in markdown file');
                }
            }
        } catch (error) {
            console.error('Failed to load sample file:', error);
            // Fallback to inline samples
            this.loadFallbackSampleCode(sampleKey);
        }
    }

    /**
     * Fallback method to load samples from inline code
     */
    loadFallbackSampleCode(sampleKey) {
        const samples = this.getSampleCodes();
        const sample = samples[sampleKey];
        
        if (!sample) {
            console.error('Sample not found:', sampleKey);
            return;
        }
        
        console.log('Loading fallback sample:', sample.title);
        this.pythonEditor.setValue(sample.code);
        
        // Auto-convert after loading sample
        setTimeout(async () => {
            if (window.converter) {
                await this.convert();
            }
        }, 100);
    }

    /**
     * Convert code based on selected direction
     */
    async convert() {
        console.log('=== Convert function called ===');
        
        try {
            const direction = document.getElementById('conversionDirection').value;
            console.log('Direction:', direction);
            
            // Check if converter is available
            if (!window.converter) {
                throw new Error('Converter not initialized');
            }
            
            // Check if editors are available
            if (!this.pythonEditor) {
                throw new Error('Python editor not initialized');
            }
            
            if (!this.commonTestEditor) {
                throw new Error('Common test editor not initialized');
            }
            
            if (direction === 'pythonToCommon') {
                // Python → Common Test: pythonEditor → commonTestEditor
                const pythonCode = this.pythonEditor.getValue();
                console.log('Python code length:', pythonCode.length);
                console.log('Python code preview:', pythonCode.substring(0, 100));
                
                if (!pythonCode.trim()) {
                    console.log('No Python code to convert');
                    return;
                }
                
                console.log('Converting Python to Common Test...');
                const converted = window.converter.pythonToCommonTest(pythonCode);
                console.log('Conversion successful, result length:', converted.length);
                console.log('Conversion result preview:', converted.substring(0, 100));
                
                this.commonTestEditor.setValue(converted);
                console.log('Set converted text to common test editor');
                
            } else {
                // Common Test → Python: commonTestEditor → pythonEditor
                const commonTestCode = this.commonTestEditor.getValue();
                console.log('Common test code length:', commonTestCode.length);
                console.log('Common test code preview:', commonTestCode.substring(0, 100));
                
                if (!commonTestCode.trim()) {
                    console.log('No common test code to convert');
                    return;
                }
                
                console.log('Converting Common Test to Python...');
                const converted = window.converter.commonTestToPython(commonTestCode);
                console.log('Conversion successful, result length:', converted.length);
                console.log('Conversion result preview:', converted.substring(0, 100));
                
                this.pythonEditor.setValue(converted);
                console.log('Set converted text to python editor');
            }
            
            // Generate flowchart using Python code
            try {
                if (window.flowchartGenerator) {
                    console.log('Generating flowchart...');
                    // Always use the current Python code in the Python editor
                    const pythonCodeForFlowchart = this.pythonEditor.getValue();
                    await window.flowchartGenerator.generateFlowchart(pythonCodeForFlowchart);
                    console.log('Flowchart generated successfully');
                }
            } catch (flowchartError) {
                console.error('Flowchart generation error:', flowchartError);
                // Don't stop conversion process for flowchart errors
            }
            
            console.log('=== Convert function completed successfully ===');
            
        } catch (error) {
            console.error('Conversion error:', error);
            const errorMsg = '変換エラー: ' + error.message;
            document.getElementById('output').textContent = errorMsg;
            alert(errorMsg);
        }
    }

    /**
     * Generate share URL
     */
    shareCode() {
        const pythonCode = this.pythonEditor.getValue();
        const commonTestCode = this.commonTestEditor.getValue();
        
        console.log('shareCode called');
        console.log('Python code length:', pythonCode.length);
        console.log('Common test code length:', commonTestCode.length);
        
        // Since conversionDirection element doesn't exist, determine direction based on content
        let direction = 'python-to-common';
        if (commonTestCode && !pythonCode) {
            direction = 'common-to-python';
        }
        
        const data = {
            python: pythonCode,
            common: commonTestCode,
            direction: direction
        };
        
        console.log('Data to encode:', data);
        
        const jsonString = JSON.stringify(data);
        console.log('JSON string length:', jsonString.length);
        
        const encodedString = encodeURIComponent(jsonString);
        console.log('Encoded string length:', encodedString.length);
        
        // Use Base64 encoding that can handle Unicode characters
        const utf8Bytes = new TextEncoder().encode(jsonString);
        const base64String = btoa(String.fromCharCode(...utf8Bytes));
        
        // Convert to URL-safe Base64 to avoid issues with +, /, and = characters
        const compressed = base64String
            .replace(/\+/g, '-')    // Replace + with -
            .replace(/\//g, '_')    // Replace / with _
            .replace(/=/g, '');     // Remove padding = characters
        
        console.log('Compressed string length:', compressed.length);
        
        // Generate clean URL without any existing hash
        const baseUrl = window.location.origin + window.location.pathname;
        const url = baseUrl + '#' + compressed;
        
        // Check URL length (browser limit is usually around 2048 characters)
        if (url.length > 2000) {
            console.warn('Generated URL is very long:', url.length, 'characters');
            alert('生成されたURLが非常に長くなっています。一部のブラウザで問題が発生する可能性があります。');
        }
        
        document.getElementById('shareUrl').value = url;
        console.log('Share URL generated:', url.length, 'characters');
        
        // Update the link element to make URL clickable
        const shareUrlLink = document.getElementById('shareUrlLink');
        if (shareUrlLink) {
            shareUrlLink.href = url;
            shareUrlLink.style.display = 'inline'; // Show the link
        }
        
        
        // Test immediate decode to verify
        try {
            // Convert back from URL-safe Base64
            let base64ForDecode = compressed
                .replace(/-/g, '+')    // Replace - with +
                .replace(/_/g, '/');   // Replace _ with /
            
            // Add padding if needed
            while (base64ForDecode.length % 4) {
                base64ForDecode += '=';
            }
            
            const binaryString = atob(base64ForDecode);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            const testDecode = JSON.parse(new TextDecoder().decode(bytes));
            console.log('Test decode successful:', testDecode);
        } catch (e) {
            console.error('Test decode failed:', e);
        }
    }

    /**
     * Generate Python Tutor URL for visualization
     */
    generatePythonTutorUrl() {
        const pythonCode = this.pythonEditor.getValue();
        
        console.log('generatePythonTutorUrl called');
        console.log('Python code length:', pythonCode.length);
        
        if (!pythonCode.trim()) {
            alert('Pythonコードが入力されていません');
            return;
        }
        
        // URL encode the Python code
        const encodedCode = encodeURIComponent(pythonCode);
        
        // Generate Python Tutor URL with parameters
        const pythonTutorUrl = `https://pythontutor.com/visualize.html#code=${encodedCode}&cumulative=false&py=3&curInstr=0&heapPrimitives=nevernest&mode=display&origin=opt-frontend.js&rawInputLstJSON=[]&textReferences=false`;
        
        // Set the URL in the input field
        document.getElementById('pythonTutorUrl').value = pythonTutorUrl;
        console.log('Python Tutor URL generated:', pythonTutorUrl.length, 'characters');
        
        // Update the link element to make URL clickable
        const pythonTutorLink = document.getElementById('pythonTutorLink');
        if (pythonTutorLink) {
            pythonTutorLink.href = pythonTutorUrl;
            pythonTutorLink.style.display = 'inline';
        }
        
        // Check URL length
        if (pythonTutorUrl.length > 2000) {
            console.warn('Generated Python Tutor URL is very long:', pythonTutorUrl.length, 'characters');
            alert('生成されたPython Tutor URLが非常に長くなっています。一部のブラウザで問題が発生する可能性があります。');
        }
    }

    /**
     * Copy Python Tutor URL to clipboard
     */
    async copyPythonTutorUrl(buttonElement) {
        const pythonTutorUrl = document.getElementById('pythonTutorUrl');
        
        if (!pythonTutorUrl.value) {
            alert('Python Tutor URLが生成されていません');
            return;
        }
        
        const button = buttonElement || document.querySelector('.python-tutor-copy-button');
        const copied = await this.writeClipboardText(pythonTutorUrl.value);
        this.flashButton(button, copied ? 'コピー済み!' : 'コピー不可');
    }



    /**
     * Copy share URL to clipboard
     */
    async copyShareUrl(buttonElement) {
        const shareUrl = document.getElementById('shareUrl');

        if (!shareUrl.value) {
            alert('共有URLが生成されていません');
            return;
        }

        const button = buttonElement || document.querySelector('.share-copy-button');
        const copied = await this.writeClipboardText(shareUrl.value);
        this.flashButton(button, copied ? 'コピー済み!' : 'コピー不可');
    }

    /**
     * Load code from URL
     */
    async loadFromUrl() {
        console.log('loadFromUrl called');
        console.log('Current URL hash:', window.location.hash);
        
        if (window.location.hash) {
            try {
                const compressed = window.location.hash.substring(1);
                console.log('Compressed data:', compressed);
                
                // Convert back from URL-safe Base64
                let base64ForDecode = compressed
                    .replace(/-/g, '+')    // Replace - with +
                    .replace(/_/g, '/');   // Replace _ with /
                
                // Add padding if needed
                while (base64ForDecode.length % 4) {
                    base64ForDecode += '=';
                }
                
                // Decode the data
                const binaryString = atob(base64ForDecode);
                const bytes = new Uint8Array(binaryString.length);
                for (let i = 0; i < binaryString.length; i++) {
                    bytes[i] = binaryString.charCodeAt(i);
                }
                const decodedData = new TextDecoder().decode(bytes);
                console.log('Decoded data:', decodedData);
                
                const data = JSON.parse(decodedData);
                console.log('Parsed data:', data);
                
                // Check if editors are available, wait if not
                if (!this.pythonEditor || !this.commonTestEditor) {
                    console.log('Editors not initialized yet, waiting...');
                    let retries = 0;
                    while ((!this.pythonEditor || !this.commonTestEditor) && retries < 50) {
                        await new Promise(resolve => setTimeout(resolve, 100));
                        retries++;
                    }
                    
                    if (!this.pythonEditor || !this.commonTestEditor) {
                        console.error('Editors still not available after waiting');
                        return;
                    }
                }
                
                console.log('Editors are ready, loading data...');
                
                if (data.python) {
                    console.log('Loading Python code:', data.python.substring(0, 100) + '...');
                    this.pythonEditor.setValue(data.python);
                    console.log('Python code loaded successfully');
                }
                if (data.common) {
                    console.log('Loading Common Test code:', data.common.substring(0, 100) + '...');
                    this.commonTestEditor.setValue(data.common);
                    console.log('Common Test code loaded successfully');
                }
                if (data.direction) {
                    console.log('Loaded direction from URL:', data.direction);
                }
                
                // Refresh editors to ensure proper display
                setTimeout(() => {
                    this.refreshEditors();
                }, 100);
                
                if (window.flowchartGenerator && data.python) {
                    console.log('Generating flowchart...');
                    setTimeout(async () => {
                        try {
                            await window.flowchartGenerator.generateFlowchart(data.python);
                            console.log('Flowchart generated successfully');
                        } catch (error) {
                            console.error('Flowchart generation error:', error);
                        }
                    }, 300);
                }
                
                console.log('URL loading completed successfully');
            } catch (e) {
                console.error('Failed to load from URL:', e);
                console.error('Hash content:', window.location.hash);
                alert('URLからのデータ読み込みに失敗しました: ' + e.message);
            }
        } else {
            console.log('No hash found in URL');
        }
    }

    /**
     * Get editor values
     */
    getPythonCode() {
        return this.pythonEditor.getValue();
    }

    getCommonTestCode() {
        return this.commonTestEditor.getValue();
    }

    /**
     * Set editor values
     */
    setPythonCode(code) {
        this.pythonEditor.setValue(code);
    }

    setCommonTestCode(code) {
        this.commonTestEditor.setValue(code);
    }
}

// Export for use in other modules
window.UIManager = UIManager;
