/**
 * UI Management and Event Handlers
 */
class UIManager {
    constructor() {
        this.pythonEditor = null;
        this.commonTestEditor = null;
        this.samplesConfig = null;
        this.sampleAssetVersion = '20260711-samples';
        this.autocompleteDelay = 120;
        this.autocompleteTimers = new WeakMap();
        this.pythonIndentGuideMarks = [];
        this.pythonIndentGuideRefreshTimer = null;
        this.editorRefreshTimer = null;
        this.contentZoomSteps = [80, 90, 100, 110, 125, 140, 160];
        this.contentZoomScales = {
            python: 100,
            commontest: 100,
            output: 100
        };
        this.contentBaseFontSizes = {
            python: 14.5,
            commontest: 14,
            output: 14
        };
        this.editorGutterBaseFontSize = 13;
        this.expandedPanelKind = null;
        this.panelExpansionKeydownHandler = null;
        this.panelFocusReturnElement = null;
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
        
        console.log('Creating Python editor...');
        this.pythonEditor = CodeMirror(pythonContainer, this.createPythonEditorOptions());
        console.log('Python editor created:', !!this.pythonEditor);

        console.log('Creating Common Test editor...');
        this.commonTestEditor = CodeMirror(commonTestContainer, this.createCommonTestEditorOptions());
        console.log('Common Test editor created:', !!this.commonTestEditor);

        this.setupEditorAutocomplete(this.pythonEditor);
        this.setupEditorAutocomplete(this.commonTestEditor);
        this.setupPythonIndentGuides();
        this.setupEditorLifecycle();
        this.initializeContentZoomSettings();

        // Keep startup free of synthetic editor writes. URL restore and sample loading
        // should be the only initialization paths that change user-visible code.
    }

    createPythonEditorOptions() {
        return this.createEditorOptions({
            mode: 'python',
            placeholder: 'Pythonコードを入力してください...',
            indentUnit: 4,
            matchBrackets: true,
            styleActiveLine: true
        });
    }

    createCommonTestEditorOptions() {
        return this.createEditorOptions({
            mode: 'commontest',
            placeholder: '共通テスト用プログラム表記を入力してください...',
            indentUnit: 2
        });
    }

    createEditorOptions(options) {
        return {
            mode: options.mode,
            theme: 'material-darker',
            lineNumbers: true,
            gutters: ['CodeMirror-linenumbers'],
            lineWrapping: false,
            placeholder: options.placeholder,
            viewportMargin: 10,
            scrollbarStyle: 'native',
            autoCloseBrackets: true,
            indentUnit: options.indentUnit,
            indentWithTabs: false,
            matchBrackets: Boolean(options.matchBrackets),
            styleActiveLine: Boolean(options.styleActiveLine),
            hintOptions: this.createHintOptions(),
            extraKeys: this.createEditorExtraKeys()
        };
    }

    createEditorExtraKeys() {
        return {
            'Ctrl-Space': (cm) => this.showAutocomplete(cm),
            'Cmd-Space': (cm) => this.showAutocomplete(cm),
            'Tab': (cm) => this.handleTabKey(cm)
        };
    }

    setupEditorLifecycle() {
        this.scheduleEditorRefresh(50);
        this.scheduleEditorRefresh(250);

        window.addEventListener('resize', () => this.scheduleEditorRefresh(100));

        [this.pythonEditor, this.commonTestEditor].forEach((editor) => {
            if (!editor) return;

            editor.on('focus', () => this.scheduleEditorRefresh(50));
            editor.on('change', (cm, change) => {
                if (cm === this.pythonEditor) {
                    this.schedulePythonIndentGuideRefresh();
                }
                if (this.isLargeEditorChange(change)) {
                    this.scheduleEditorRefresh(100);
                }
            });
        });
    }

    isLargeEditorChange(change) {
        return Boolean(change && (change.text.length > 1 || change.removed.length > 1));
    }

    scheduleEditorRefresh(delay = 100) {
        if (this.editorRefreshTimer) {
            clearTimeout(this.editorRefreshTimer);
        }

        this.editorRefreshTimer = setTimeout(() => {
            this.editorRefreshTimer = null;
            this.refreshEditors();
        }, delay);
    }

    initializeContentZoomSettings() {
        Object.keys(this.contentZoomScales).forEach((kind) => {
            const savedScale = this.readSavedContentZoom(kind);
            this.applyContentZoom(kind, savedScale, {persist: false, refresh: false});
        });
    }

    setupPanelDisplayControls() {
        document.querySelectorAll('[data-content-zoom-action][data-content-kind]').forEach((button) => {
            if (button.dataset.contentZoomBound === 'true') return;

            button.dataset.contentZoomBound = 'true';
            button.addEventListener('click', (event) => {
                event.preventDefault();
                const kind = button.dataset.contentKind;
                const action = button.dataset.contentZoomAction;

                if (action === 'reset') {
                    this.applyContentZoom(kind, 100);
                    return;
                }

                this.adjustContentZoom(kind, action === 'increase' ? 1 : -1);
            });
        });

        document.querySelectorAll('.panel-expand-button[data-panel-kind]').forEach((button) => {
            if (button.dataset.panelExpandBound === 'true') return;

            button.dataset.panelExpandBound = 'true';
            button.addEventListener('click', (event) => {
                event.preventDefault();
                this.togglePanelExpansion(button.dataset.panelKind);
            });
        });

        if (!this.panelExpansionKeydownHandler) {
            this.panelExpansionKeydownHandler = (event) => {
                if (!this.expandedPanelKind) return;

                if (event.key === 'Escape') {
                    this.togglePanelExpansion(this.expandedPanelKind);
                    return;
                }

                if (event.key === 'Tab') {
                    this.trapFocusInExpandedPanel(event);
                }
            };
            document.addEventListener('keydown', this.panelExpansionKeydownHandler);
        }
    }

    adjustContentZoom(kind, direction) {
        const currentScale = this.contentZoomScales[kind] || 100;
        const currentIndex = this.contentZoomSteps.indexOf(currentScale);
        const safeIndex = currentIndex === -1 ? this.contentZoomSteps.indexOf(100) : currentIndex;
        const nextIndex = Math.min(
            this.contentZoomSteps.length - 1,
            Math.max(0, safeIndex + direction)
        );

        this.applyContentZoom(kind, this.contentZoomSteps[nextIndex]);
    }

    applyContentZoom(kind, requestedScale, options = {}) {
        const config = this.getContentZoomConfig(kind);
        if (!config) return;

        const {persist = true, refresh = true} = options;
        const scale = this.normalizeContentZoom(requestedScale);
        const fontSize = config.baseFontSize * scale / 100;
        this.contentZoomScales[kind] = scale;

        if (config.editor) {
            config.element.style.setProperty('--editor-font-size', `${fontSize.toFixed(2)}px`);
            config.element.style.setProperty(
                '--editor-gutter-font-size',
                `${(this.editorGutterBaseFontSize * scale / 100).toFixed(2)}px`
            );
        } else {
            config.element.style.fontSize = `${fontSize.toFixed(2)}px`;
        }

        this.updateContentZoomControls(kind);
        if (persist) this.saveContentZoom(kind, scale);
        if (refresh && config.editor) this.refreshEditorAfterDisplayChange(config.editor, kind);
    }

    getContentZoomConfig(kind) {
        const configs = {
            python: {
                label: 'Python',
                element: document.getElementById('pythonEditor'),
                editor: this.pythonEditor,
                baseFontSize: this.contentBaseFontSizes.python
            },
            commontest: {
                label: '共通テスト用プログラム表記',
                element: document.getElementById('commonTestEditor'),
                editor: this.commonTestEditor,
                baseFontSize: this.contentBaseFontSizes.commontest
            },
            output: {
                label: '実行結果',
                element: document.getElementById('output'),
                editor: null,
                baseFontSize: this.contentBaseFontSizes.output
            }
        };

        const config = configs[kind];
        return config && config.element ? config : null;
    }

    normalizeContentZoom(requestedScale) {
        if (requestedScale === null || requestedScale === '' || !Number.isFinite(Number(requestedScale))) {
            return 100;
        }

        const numericScale = Number(requestedScale);
        return this.contentZoomSteps.reduce((closest, scale) => (
            Math.abs(scale - numericScale) < Math.abs(closest - numericScale) ? scale : closest
        ), 100);
    }

    updateContentZoomControls(kind) {
        const config = this.getContentZoomConfig(kind);
        if (!config) return;

        const scale = this.contentZoomScales[kind] || 100;
        const decreaseButton = document.querySelector(
            `[data-content-kind="${kind}"][data-content-zoom-action="decrease"]`
        );
        const resetButton = document.querySelector(
            `[data-content-kind="${kind}"][data-content-zoom-action="reset"]`
        );
        const increaseButton = document.querySelector(
            `[data-content-kind="${kind}"][data-content-zoom-action="increase"]`
        );

        if (decreaseButton) decreaseButton.disabled = scale === this.contentZoomSteps[0];
        if (increaseButton) increaseButton.disabled = scale === this.contentZoomSteps[this.contentZoomSteps.length - 1];
        if (resetButton) {
            resetButton.textContent = `${scale}%`;
            resetButton.title = `${config.label}の文字サイズを100%に戻す`;
            resetButton.setAttribute('aria-label', `${config.label}の文字サイズは${scale}%。100%に戻す`);
        }
    }

    getContentZoomStorageKey(kind) {
        return `python-to-ktph:content-zoom:${kind}`;
    }

    readSavedContentZoom(kind) {
        try {
            return localStorage.getItem(this.getContentZoomStorageKey(kind)) || 100;
        } catch (error) {
            return 100;
        }
    }

    saveContentZoom(kind, scale) {
        try {
            localStorage.setItem(this.getContentZoomStorageKey(kind), String(scale));
        } catch (error) {
            // The controls still work when storage is unavailable.
        }
    }

    refreshEditorAfterDisplayChange(editor, kind, scrollPosition = null) {
        if (!editor) return;

        const scroll = scrollPosition || editor.getScrollInfo();
        requestAnimationFrame(() => {
            editor.setSize(null, null);
            editor.refresh();
            editor.scrollTo(scroll.left, scroll.top);
            if (kind === 'python') this.schedulePythonIndentGuideRefresh();
        });
    }

    getExpandablePanelConfig(kind) {
        const configs = {
            python: {
                label: 'Pythonエディタ',
                panel: document.querySelector('.panel.top-left'),
                content: document.getElementById('pythonEditor'),
                editor: this.pythonEditor
            },
            commontest: {
                label: '共通テスト用プログラム表記エディタ',
                panel: document.querySelector('.panel.top-right'),
                content: document.getElementById('commonTestEditor'),
                editor: this.commonTestEditor
            },
            flowchart: {
                label: 'フローチャート',
                panel: document.querySelector('.panel.bottom-left'),
                content: document.getElementById('flowchart'),
                editor: null
            },
            output: {
                label: '実行結果',
                panel: document.querySelector('.panel.bottom-right'),
                content: document.getElementById('output'),
                editor: null
            }
        };

        const config = configs[kind];
        return config && config.panel && config.content ? config : null;
    }

    togglePanelExpansion(kind) {
        const shouldExpand = this.expandedPanelKind !== kind;

        if (this.expandedPanelKind) {
            const currentKind = this.expandedPanelKind;
            const currentConfig = this.getExpandablePanelConfig(currentKind);
            if (currentConfig) this.setPanelExpandedState(currentKind, currentConfig, false);
        }

        if (shouldExpand) {
            const nextConfig = this.getExpandablePanelConfig(kind);
            if (nextConfig) this.setPanelExpandedState(kind, nextConfig, true);
        }
    }

    setPanelExpandedState(kind, config, expanded) {
        const scrollPosition = this.capturePanelScroll(config);

        if (expanded) {
            this.panelFocusReturnElement = document.activeElement instanceof HTMLElement
                ? document.activeElement
                : null;
            config.panel.setAttribute('role', 'dialog');
            config.panel.setAttribute('aria-modal', 'true');
            config.panel.setAttribute('aria-label', `${config.label}の拡大表示`);
        } else {
            config.panel.removeAttribute('role');
            config.panel.removeAttribute('aria-modal');
            config.panel.removeAttribute('aria-label');
        }

        config.panel.classList.toggle('panel-expanded', expanded);
        this.expandedPanelKind = expanded ? kind : null;
        document.body.classList.toggle('panel-expanded-open', expanded);
        this.updatePanelExpansionButton(kind, expanded, config.label);
        this.restorePanelAfterResize(kind, config, scrollPosition);

        if (!expanded && this.panelFocusReturnElement) {
            const focusReturnElement = this.panelFocusReturnElement;
            this.panelFocusReturnElement = null;
            requestAnimationFrame(() => focusReturnElement.focus());
        }
    }

    capturePanelScroll(config) {
        if (config.editor) {
            const scroll = config.editor.getScrollInfo();
            return {left: scroll.left, top: scroll.top};
        }

        return {
            left: config.content.scrollLeft,
            top: config.content.scrollTop
        };
    }

    restorePanelAfterResize(kind, config, scrollPosition) {
        if (config.editor) {
            this.refreshEditorAfterDisplayChange(config.editor, kind, scrollPosition);
            return;
        }

        requestAnimationFrame(() => {
            config.content.scrollLeft = scrollPosition.left;
            config.content.scrollTop = scrollPosition.top;
        });
    }

    updatePanelExpansionButton(kind, expanded, label) {
        const button = document.querySelector(`.panel-expand-button[data-panel-kind="${kind}"]`);
        if (!button) return;

        button.textContent = expanded ? '⤡' : '⤢';
        button.title = expanded ? `${label}を元の大きさに戻す (Esc)` : `${label}の表示領域を拡大`;
        button.setAttribute(
            'aria-label',
            expanded ? `${label}を元の大きさに戻す` : `${label}の表示領域を拡大`
        );
        button.setAttribute('aria-pressed', String(expanded));
    }

    trapFocusInExpandedPanel(event) {
        const config = this.getExpandablePanelConfig(this.expandedPanelKind);
        if (!config) return;

        const focusableElements = Array.from(config.panel.querySelectorAll(
            'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), '
            + 'textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        )).filter((element) => element.getClientRects().length > 0);

        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];
        const activeElement = document.activeElement;

        if (!config.panel.contains(activeElement)) {
            event.preventDefault();
            firstElement.focus();
            return;
        }

        if (event.shiftKey && activeElement === firstElement) {
            event.preventDefault();
            lastElement.focus();
        } else if (!event.shiftKey && activeElement === lastElement) {
            event.preventDefault();
            firstElement.focus();
        }
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
        const activeIndentDepth = this.getPythonActiveIndentDepth(editor, cursor.line, indentUnit);
        const activeIndentScope = this.getPythonActiveIndentScope(editor, cursor.line, activeIndentDepth, indentUnit);
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

                const indentInfo = this.getPythonLineIndentInfo(editor, lineNo, indentUnit);
                const isActiveScope = activeIndentScope
                    && lineNo >= activeIndentScope.start
                    && lineNo <= activeIndentScope.end
                    && indentInfo.depth >= activeIndentDepth;
                const classNames = ['python-leading-indent'];

                if (isActiveScope) {
                    classNames.push('python-leading-indent-active');
                }
                if (indentInfo.columns % indentUnit !== 0) {
                    classNames.push('python-leading-indent-partial');
                }

                const mark = editor.markText(
                    {line: lineNo, ch: 0},
                    {line: lineNo, ch: leadingWhitespace.length},
                    {
                        className: classNames.join(' '),
                        inclusiveLeft: false,
                        inclusiveRight: false,
                        clearWhenEmpty: true
                    }
                );
                this.pythonIndentGuideMarks.push(mark);
            }
        });
    }

    getPythonActiveIndentDepth(editor, lineNo, indentUnit) {
        const indentInfo = this.getPythonLineIndentInfo(editor, lineNo, indentUnit);
        const line = editor.getLine(lineNo) || '';

        if (indentInfo.depth > 0) {
            return indentInfo.depth;
        }

        return this.isPythonBlockHeader(line.trim()) ? 1 : 0;
    }

    getPythonActiveIndentScope(editor, cursorLine, activeIndentDepth, indentUnit) {
        if (!activeIndentDepth) return null;

        let start = cursorLine;
        let end = cursorLine;

        while (start > editor.firstLine()) {
            const previousLineNo = start - 1;
            const previousLine = editor.getLine(previousLineNo) || '';
            const previousTrimmed = previousLine.trim();
            const previousIndentInfo = this.getPythonLineIndentInfo(editor, previousLineNo, indentUnit);

            if (!previousTrimmed
                || previousIndentInfo.depth >= activeIndentDepth
                || (previousIndentInfo.depth === activeIndentDepth - 1 && this.isPythonBlockHeader(previousTrimmed))) {
                start = previousLineNo;
                continue;
            }

            break;
        }

        while (end < editor.lastLine()) {
            const nextLineNo = end + 1;
            const nextLine = editor.getLine(nextLineNo) || '';
            const nextTrimmed = nextLine.trim();
            const nextIndentInfo = this.getPythonLineIndentInfo(editor, nextLineNo, indentUnit);

            if (!nextTrimmed || nextIndentInfo.depth >= activeIndentDepth) {
                end = nextLineNo;
                continue;
            }

            break;
        }

        return {start, end};
    }

    getPythonLineIndentInfo(editor, lineNo, indentUnit) {
        const line = editor.getLine(lineNo) || '';
        const leadingWhitespace = line.match(/^[\t ]*/)[0];
        const columns = this.getIndentColumnWidth(leadingWhitespace, indentUnit);

        return {
            leadingWhitespace,
            columns,
            depth: Math.floor(columns / indentUnit)
        };
    }

    isPythonBlockHeader(trimmedLine) {
        return /^(if|elif|else|for|while|def|class|try|except|finally|with)\b.*:\s*(#.*)?$/.test(trimmedLine);
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

        const context = this.getCompletionContext(cm);
        if (context.suppress) return false;

        const inserted = change.text[0];
        if (context.isPropertyAccess) return cm === this.pythonEditor;
        if (this.shouldOpenAfterCompletionTrigger(inserted, context, cm)) return true;
        if (!/^[A-Za-z0-9_ぁ-んァ-ヶ一-龠々ー｜⎿【】.]$/.test(inserted)) {
            return false;
        }
        if (/[ぁ-んァ-ヶ一-龠々ー｜⎿【】]/.test(context.token)) return true;
        return context.token.length >= 2;
    }

    shouldOpenAfterCompletionTrigger(inserted, context, cm) {
        const before = context.lineBeforeCursor.trim();
        const mode = cm === this.commonTestEditor ? 'commontest' : 'python';

        if (inserted === '.') {
            return mode === 'python' && context.isPropertyAccess;
        }

        if (!/^[\s(=,]$/.test(inserted)) {
            return false;
        }

        if (mode === 'python') {
            return /^(if|elif|while|for|return|print|len|range|int|float|str|sum|max|min|input)\b/.test(before)
                || /=$/.test(before)
                || /\($/.test(before);
        }

        return /^(もし|そうでなくもし|表示する|要素数|整数|実数|文字列)\b/.test(before)
            || /=$/.test(before)
            || /（$|\($/.test(before);
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
        const analysis = this.getCompletionAnalysis(cm, mode, context);
        const completions = this.getCompletionList(mode, identifiers, analysis, context);
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
        const lineIndent = (line.match(/^\s*/) || [''])[0];
        const lineBeforeCursor = line.slice(0, cursor.ch);
        const lineAfterCursor = line.slice(cursor.ch);

        return {
            from: CodeMirror.Pos(cursor.line, start),
            to: CodeMirror.Pos(cursor.line, cursor.ch),
            token,
            line,
            lineBeforeCursor,
            lineAfterCursor,
            lineBodyBeforeCursor: lineBeforeCursor.slice(lineIndent.length),
            lineBodyAfterCursor: lineAfterCursor,
            trimmedLine: line.trim(),
            trimmedBeforeCursor: lineBeforeCursor.trim(),
            cursor,
            suppress,
            isPropertyAccess,
            propertyOwner: propertyOwnerMatch ? propertyOwnerMatch[1] : '',
            lineIndent,
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
            'もし', 'ならば', 'そうでなくもし', 'そうでなければ',
            'を', 'から', 'まで', 'ずつ', '増やしながら', '減らしながら',
            '繰り返す', 'ずつ増やしながら繰り返す', 'ずつ減らしながら繰り返す',
            'の間繰り返す', '返す'
        ].includes(value);
    }

    getCompletionAnalysis(cm, mode, context) {
        const lines = (cm.getValue() || '').split('\n');
        const variableMap = new Map();
        const functionMap = new Map();

        lines.forEach((line, lineNo) => {
            if (mode === 'commontest') {
                this.analyzeCommonTestCompletionLine(line, lineNo, variableMap, functionMap);
            } else {
                this.analyzePythonCompletionLine(line, lineNo, variableMap, functionMap);
            }
        });

        const cursorLine = context ? context.cursor.line : lines.length - 1;
        const variables = Array.from(variableMap.values())
            .sort((a, b) => {
                const distanceDiff = Math.abs(cursorLine - a.lastLine) - Math.abs(cursorLine - b.lastLine);
                if (distanceDiff !== 0) return distanceDiff;
                return b.count - a.count || a.name.localeCompare(b.name, 'ja');
            });
        const functions = Array.from(functionMap.values())
            .sort((a, b) => a.name.localeCompare(b.name, 'ja'));

        return {
            variables,
            variableMap,
            functions,
            lists: variables.filter((variable) => variable.type === 'list'),
            numbers: variables.filter((variable) => variable.type === 'number'),
            strings: variables.filter((variable) => variable.type === 'string'),
            booleans: variables.filter((variable) => variable.type === 'boolean')
        };
    }

    analyzePythonCompletionLine(line, lineNo, variableMap, functionMap) {
        const trimmed = this.stripLineComment(line).trim();
        if (!trimmed) return;

        const functionMatch = trimmed.match(/^def\s+([A-Za-z_]\w*)\s*\(([^)]*)\)/);
        if (functionMatch) {
            this.rememberFunction(functionMap, functionMatch[1], functionMatch[2], lineNo);
            functionMatch[2]
                .split(',')
                .map((name) => name.trim())
                .filter(Boolean)
                .forEach((name) => this.rememberVariable(variableMap, name, 'value', lineNo));
            return;
        }

        const forMatch = trimmed.match(/^for\s+([A-Za-z_]\w*)\s+in\s+(.+):$/);
        if (forMatch) {
            const iterable = forMatch[2].trim();
            this.rememberVariable(variableMap, forMatch[1], iterable.startsWith('range(') ? 'number' : 'value', lineNo);

            const iterableName = iterable.match(/^([A-Za-z_]\w*)$/);
            if (iterableName) {
                this.rememberVariable(variableMap, iterableName[1], 'list', lineNo);
            }
            return;
        }

        const appendMatch = trimmed.match(/^([A-Za-z_]\w*)\.append\s*\(/);
        if (appendMatch) {
            this.rememberVariable(variableMap, appendMatch[1], 'list', lineNo);
        }

        const tupleAssignmentMatch = trimmed.match(/^([A-Za-z_]\w*(?:\s*,\s*[A-Za-z_]\w*)+)\s*=\s*(.+)$/);
        if (tupleAssignmentMatch) {
            tupleAssignmentMatch[1]
                .split(',')
                .map((name) => name.trim())
                .forEach((name) => this.rememberVariable(variableMap, name, 'value', lineNo));
            return;
        }

        const assignmentMatch = trimmed.match(/^([A-Za-z_]\w*)\s*=\s*(?!=)(.+)$/);
        if (assignmentMatch) {
            this.rememberVariable(
                variableMap,
                assignmentMatch[1],
                this.inferPythonValueType(assignmentMatch[2]),
                lineNo
            );
            return;
        }

        const augmentedAssignmentMatch = trimmed.match(/^([A-Za-z_]\w*)\s*(?:\+=|-=|\*=|\/=|%=)/);
        if (augmentedAssignmentMatch) {
            this.rememberVariable(variableMap, augmentedAssignmentMatch[1], 'number', lineNo);
        }
    }

    analyzeCommonTestCompletionLine(line, lineNo, variableMap, functionMap) {
        const trimmed = line.trim().replace(/^[｜⎿\s]+/, '');
        if (!trimmed || trimmed.startsWith('#')) return;

        const functionMatch = trimmed.match(/^関数\s+([A-Za-z_$ぁ-んァ-ヶ一-龠々ー][A-Za-z0-9_$ぁ-んァ-ヶ一-龠々ー]*)\s*\(([^)]*)\)/);
        if (functionMatch) {
            this.rememberFunction(functionMap, functionMatch[1], functionMatch[2], lineNo);
            return;
        }

        const loopMatch = trimmed.match(/^([A-Za-z_$ぁ-んァ-ヶ一-龠々ー][A-Za-z0-9_$ぁ-んァ-ヶ一-龠々ー]*)\s+を\s+.+から\s+.+まで/);
        if (loopMatch) {
            this.rememberVariable(variableMap, loopMatch[1], 'number', lineNo);
        }

        const assignmentMatch = trimmed.match(/^([A-Za-z_$ぁ-んァ-ヶ一-龠々ー][A-Za-z0-9_$ぁ-んァ-ヶ一-龠々ー]*)\s*=\s*(.+)$/);
        if (assignmentMatch) {
            this.rememberVariable(
                variableMap,
                assignmentMatch[1],
                this.inferCommonTestValueType(assignmentMatch[2], assignmentMatch[1]),
                lineNo
            );
        }
    }

    stripLineComment(line) {
        let quote = null;

        for (let index = 0; index < line.length; index += 1) {
            const char = line[index];
            const previous = line[index - 1];

            if ((char === '"' || char === "'") && previous !== '\\') {
                quote = quote === char ? null : (quote || char);
                continue;
            }

            if (char === '#' && !quote) {
                return line.slice(0, index);
            }
        }

        return line;
    }

    inferPythonValueType(expression) {
        const value = expression.trim();
        if (/^\[/.test(value) || /\.split\s*\(/.test(value) || /^list\s*\(/.test(value)) return 'list';
        if (/^(?:int|float)\s*\(/.test(value) || /^[+-]?\d+(?:\.\d+)?$/.test(value)) return 'number';
        if (/^(?:input|str)\s*\(/.test(value) || /^["']/.test(value)) return 'string';
        if (/^(?:True|False)$/.test(value)) return 'boolean';
        if (/^(?:len|sum|max|min)\s*\(/.test(value)) return 'number';
        return 'value';
    }

    inferCommonTestValueType(expression, name) {
        const value = expression.trim();
        if (/^\[/.test(value) || /^[A-Z]/.test(name)) return 'list';
        if (/^(?:整数|実数|要素数|乱数)\s*\(/.test(value) || /^[+-]?\d+(?:\.\d+)?$/.test(value)) return 'number';
        if (/^(?:文字列)\s*\(/.test(value) || /^["']/.test(value) || value === '【外部からの入力】') return 'string';
        return 'value';
    }

    rememberVariable(variableMap, name, type, lineNo) {
        if (!name || this.isReservedIdentifier(name)) return;

        const existing = variableMap.get(name) || {
            name,
            type: 'value',
            count: 0,
            firstLine: lineNo,
            lastLine: lineNo
        };

        existing.count += 1;
        existing.lastLine = lineNo;
        existing.type = this.pickMoreSpecificCompletionType(existing.type, type);
        variableMap.set(name, existing);
    }

    rememberFunction(functionMap, name, parameters, lineNo) {
        if (!name || this.isReservedIdentifier(name)) return;

        functionMap.set(name, {
            name,
            parameters,
            lineNo
        });
    }

    pickMoreSpecificCompletionType(currentType, nextType) {
        const rank = {
            value: 0,
            boolean: 1,
            string: 2,
            number: 3,
            list: 4
        };

        return (rank[nextType] || 0) >= (rank[currentType] || 0) ? nextType : currentType;
    }

    getCompletionList(mode, identifiers, analysis, context) {
        const base = mode === 'commontest'
            ? this.getCommonTestCompletions(context, analysis)
            : this.getPythonCompletions(context, analysis);

        if (mode === 'python' && context.isPropertyAccess) {
            return this.getPythonPropertyCompletions(context, analysis);
        }

        const identifierCompletions = identifiers.map((identifier) => (
            this.createCompletion(identifier, identifier, '既存の名前', {
                kind: 'identifier',
                priority: -20
            })
        ));

        const contextual = mode === 'commontest'
            ? this.getCommonTestContextualCompletions(context, analysis)
            : this.getPythonContextualCompletions(context, analysis);

        return contextual.concat(base, identifierCompletions);
    }

    getPythonCompletions(context, analysis) {
        return [
            this.createCompletion('print()', 'print(__CURSOR__)', '出力', { aliases: ['display', '表示', '出力'] }),
            this.createCompletion('input()', 'input(__CURSOR__)', '入力', { aliases: ['nyuuryoku', '入力'] }),
            this.createCompletion('int(input())', 'int(input(__CURSOR__))', '整数入力', { aliases: ['整数', 'input int'] }),
            this.createCompletion('float(input())', 'float(input(__CURSOR__))', '実数入力', { aliases: ['実数', 'input float'] }),
            this.createCompletion('len()', 'len(__CURSOR__)', '要素数', { aliases: ['length', '要素数'] }),
            this.createCompletion('range(n)', 'range(__CURSOR__)', '0からn-1'),
            this.createCompletion('range(start, end)', 'range(__CURSOR__, end)', '範囲指定'),
            this.createCompletion('for i in range(n):', 'for i in range(__CURSOR__):\n__PY_BODY__', '回数繰り返し', { replaceMode: 'lineBody' }),
            this.createCompletion('for item in list:', 'for __CURSOR__ in list:\n__PY_BODY__', '配列を順に処理', { replaceMode: 'lineBody' }),
            this.createCompletion('while 条件:', 'while __CURSOR__:\n__PY_BODY__', '条件繰り返し', { replaceMode: 'lineBody' }),
            this.createCompletion('if 条件:', 'if __CURSOR__:\n__PY_BODY__', '条件分岐', { replaceMode: 'lineBody' }),
            this.createCompletion('elif 条件:', 'elif __CURSOR__:\n__PY_BODY__', '追加条件', { replaceMode: 'lineBody' }),
            this.createCompletion('else:', 'else:\n__PY_BODY__', 'その他', { replaceMode: 'lineBody' }),
            this.createCompletion('def 関数():', 'def __CURSOR__():\n__PY_BODY__', '関数定義', { replaceMode: 'lineBody' }),
            this.createCompletion('return', 'return __CURSOR__', '戻り値', { replaceMode: 'lineBody' }),
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
            this.createCompletion('import random', 'import random', '乱数モジュール', { replaceMode: 'lineBody' }),
            this.createCompletion('random.randint()', 'random.randint(__CURSOR__, end)', '整数乱数'),
            this.createCompletion('random.random()', 'random.random()', '0以上1未満の乱数'),
            this.createCompletion('[]', '[__CURSOR__]', 'リスト'),
            this.createCompletion('{}', '{__CURSOR__}', '辞書'),
            ...this.getPythonLineCompletions(context, analysis)
        ];
    }

    getPythonContextualCompletions(context, analysis) {
        const completions = [];
        const expressionContext = this.getPythonExpressionContext(context);
        const canReplaceLine = this.isLineCompletionContext(context);

        analysis.variables.forEach((variable) => {
            completions.push(this.createCompletion(variable.name, variable.name, this.getVariableDetail(variable), {
                aliases: [variable.name],
                kind: 'context',
                priority: -55
            }));

            if (expressionContext === 'print') {
                completions.push(this.createCompletion(`print(${variable.name})`, variable.name, `${variable.name} を表示`, {
                    aliases: [`p${variable.name}`, `表示${variable.name}`],
                    kind: 'context',
                    priority: -85
                }));
            } else if (canReplaceLine) {
                completions.push(this.createCompletion(`print(${variable.name})`, `print(${variable.name})`, `${variable.name} を表示`, {
                    aliases: [`p${variable.name}`, `表示${variable.name}`],
                    kind: 'context',
                    priority: -45,
                    replaceMode: 'lineBody'
                }));
            }

            if (variable.type === 'number' && canReplaceLine) {
                completions.push(
                    this.createCompletion(`if ${variable.name} == 0:`, `if ${variable.name} == 0:\n__PY_BODY____CURSOR__`, `${variable.name} を条件に分岐`, {
                        aliases: [`if ${variable.name}`, `${variable.name} 条件`],
                        kind: 'context',
                        priority: -70,
                        replaceMode: 'lineBody'
                    }),
                    this.createCompletion(`if ${variable.name} % 2 == 0:`, `if ${variable.name} % 2 == 0:\n__PY_BODY____CURSOR__`, `${variable.name} が偶数か判定`, {
                        aliases: [`even ${variable.name}`, `${variable.name} 偶数`],
                        kind: 'context',
                        priority: -66,
                        replaceMode: 'lineBody'
                    })
                );
            }

            if (variable.type === 'list') {
                const itemName = this.getPreferredItemName(variable.name);
                if (canReplaceLine) {
                    completions.push(this.createCompletion(`for ${itemName} in ${variable.name}:`, `for ${itemName} in ${variable.name}:\n__PY_BODY____CURSOR__`, `${variable.name} を順に処理`, {
                        aliases: [`for ${variable.name}`, `${variable.name} loop`],
                        kind: 'context',
                        priority: -80,
                        replaceMode: 'lineBody'
                    }));
                }

                completions.push(
                    this.createCompletion(`${variable.name}.append()`, `${variable.name}.append(__CURSOR__)`, `${variable.name} に追加`, {
                        aliases: [`add ${variable.name}`, `${variable.name} 追加`],
                        kind: 'context',
                        priority: -64
                    }),
                    this.createCompletion(`len(${variable.name})`, `len(${variable.name})`, `${variable.name} の要素数`, {
                        aliases: [`length ${variable.name}`, `${variable.name} 要素数`],
                        kind: 'context',
                        priority: -62
                    })
                );
            }
        });

        analysis.functions.forEach((fn) => {
            completions.push(this.createCompletion(`${fn.name}()`, `${fn.name}(__CURSOR__)`, '定義済み関数', {
                aliases: [fn.name, fn.parameters],
                kind: 'context',
                priority: -52
            }));
        });

        return completions;
    }

    getPythonLineCompletions(context, analysis) {
        if (!this.isLineCompletionContext(context)) return [];

        const completions = [];
        const loopVariable = this.getPreferredLoopVariable(analysis);
        const limitName = analysis.numbers[0] ? analysis.numbers[0].name : 'n';

        completions.push(
            this.createCompletion(`for ${loopVariable} in range(${limitName}):`, `for ${loopVariable} in range(${limitName}):\n__PY_BODY____CURSOR__`, '文脈に合わせた回数繰り返し', {
                aliases: ['for', 'loop', '繰り返し'],
                kind: 'context',
                priority: -58,
                replaceMode: 'lineBody'
            }),
            this.createCompletion(`for ${loopVariable} in range(1, ${limitName} + 1):`, `for ${loopVariable} in range(1, ${limitName} + 1):\n__PY_BODY____CURSOR__`, '1からnまで繰り返し', {
                aliases: ['for 1 n', 'range 1', '1から'],
                kind: 'context',
                priority: -56,
                replaceMode: 'lineBody'
            }),
            this.createCompletion('if ...:', 'if __CURSOR__:\n__PY_BODY__', '条件分岐', {
                aliases: ['if', '条件'],
                kind: 'context',
                priority: -50,
                replaceMode: 'lineBody'
            }),
            this.createCompletion('print(...)', 'print(__CURSOR__)', '値を表示', {
                aliases: ['print', '表示'],
                kind: 'context',
                priority: -44,
                replaceMode: 'lineBody'
            })
        );

        return completions;
    }

    getPythonPropertyCompletions(context, analysis) {
        const owner = context.propertyOwner;
        const variable = analysis.variableMap.get(owner);
        const ownerType = variable ? variable.type : 'value';
        const listPriority = ownerType === 'list' ? -80 : -20;
        const stringPriority = ownerType === 'string' ? -80 : -10;
        const listMethods = [
            this.createCompletion('append()', 'append(__CURSOR__)', 'リストへ追加', { aliases: ['add', '追加'], priority: listPriority }),
            this.createCompletion('pop()', 'pop(__CURSOR__)', '要素を取り出す', { priority: listPriority }),
            this.createCompletion('sort()', 'sort()', 'リストを並べ替え', { priority: listPriority }),
            this.createCompletion('reverse()', 'reverse()', '逆順にする', { priority: listPriority }),
            this.createCompletion('insert()', 'insert(__CURSOR__, value)', '位置を指定して追加', { priority: listPriority }),
            this.createCompletion('remove()', 'remove(__CURSOR__)', '値を削除', { priority: listPriority })
        ];
        const stringMethods = [
            this.createCompletion('strip()', 'strip()', '前後の空白削除', { priority: stringPriority }),
            this.createCompletion('split()', 'split(__CURSOR__)', '文字列分割', { priority: stringPriority }),
            this.createCompletion('join()', 'join(__CURSOR__)', '文字列結合', { priority: stringPriority }),
            this.createCompletion('replace()', 'replace(__CURSOR__, new)', '文字列置換', { priority: stringPriority }),
            this.createCompletion('lower()', 'lower()', '小文字に変換', { priority: stringPriority }),
            this.createCompletion('upper()', 'upper()', '大文字に変換', { priority: stringPriority })
        ];
        const sharedMethods = [
            this.createCompletion('count()', 'count(__CURSOR__)', '個数を数える', { priority: Math.min(listPriority, stringPriority) + 4 }),
            this.createCompletion('index()', 'index(__CURSOR__)', '位置を探す', { priority: Math.min(listPriority, stringPriority) + 4 })
        ];

        return ownerType === 'string'
            ? stringMethods.concat(sharedMethods, listMethods)
            : listMethods.concat(sharedMethods, stringMethods);
    }

    getCommonTestCompletions(context, analysis) {
        return [
            this.createCompletion('表示する()', '表示する(__CURSOR__)', '出力', { aliases: ['print', 'display', '出力'] }),
            this.createCompletion('【外部からの入力】', '【外部からの入力】', '入力', { aliases: ['input', '入力'] }),
            this.createCompletion('整数(【外部からの入力】)', '整数(【外部からの入力】)', '整数入力'),
            this.createCompletion('整数()', '整数(__CURSOR__)', '整数変換'),
            this.createCompletion('実数()', '実数(__CURSOR__)', '実数変換'),
            this.createCompletion('文字列()', '文字列(__CURSOR__)', '文字列変換'),
            this.createCompletion('要素数()', '要素数(__CURSOR__)', '要素数', { aliases: ['len', 'length'] }),
            this.createCompletion('乱数()', '乱数()', '乱数'),
            this.createCompletion('もし 条件 ならば:', 'もし __CURSOR__ ならば:\n__COMMON_BODY__', '条件分岐', { aliases: ['if'], replaceMode: 'lineBody' }),
            this.createCompletion('そうでなくもし 条件 ならば:', 'そうでなくもし __CURSOR__ ならば:\n__COMMON_BODY__', '追加条件', { aliases: ['elif'], replaceMode: 'lineBody' }),
            this.createCompletion('そうでなければ:', 'そうでなければ:\n__COMMON_BODY__', 'その他', { aliases: ['else'], replaceMode: 'lineBody' }),
            this.createCompletion('条件 の間繰り返す:', '__CURSOR__ の間繰り返す:\n__COMMON_BODY__', 'while相当', { replaceMode: 'lineBody' }),
            this.createCompletion('i を 0 から n まで繰り返す:', 'i を 0 から __CURSOR__ まで 1 ずつ増やしながら繰り返す:\n__COMMON_BODY__', 'for相当', { replaceMode: 'lineBody' }),
            this.createCompletion('i を n から 0 まで繰り返す:', 'i を __CURSOR__ から 0 まで 1 ずつ減らしながら繰り返す:\n__COMMON_BODY__', '逆順for相当', { replaceMode: 'lineBody' }),
            this.createCompletion('関数 関数名():', '関数 __CURSOR__():\n__COMMON_BODY__', '関数定義', { replaceMode: 'lineBody' }),
            this.createCompletion('値 を返す', '__CURSOR__ を返す', '戻り値', { replaceMode: 'lineBody' }),
            this.createCompletion('break', 'break', '繰り返し終了'),
            this.createCompletion('｜', '｜ ', 'ブロック継続'),
            this.createCompletion('⎿', '⎿ ', 'ブロック終了'),
            ...this.getCommonTestLineCompletions(context, analysis)
        ];
    }

    getCommonTestContextualCompletions(context, analysis) {
        const completions = [];
        const insideDisplay = /表示する\([^)]*$/.test(context.lineBeforeCursor);
        const canReplaceLine = this.isLineCompletionContext(context);

        analysis.variables.forEach((variable) => {
            completions.push(this.createCompletion(variable.name, variable.name, this.getVariableDetail(variable), {
                aliases: [variable.name],
                kind: 'context',
                priority: -55
            }));

            if (insideDisplay || canReplaceLine) {
                completions.push(this.createCompletion(`表示する(${variable.name})`, insideDisplay ? variable.name : `表示する(${variable.name})`, `${variable.name} を表示`, {
                    aliases: [`print ${variable.name}`, `表示${variable.name}`],
                    kind: 'context',
                    priority: insideDisplay ? -85 : -45,
                    replaceMode: insideDisplay ? 'token' : 'lineBody'
                }));
            }

            if (variable.type === 'number' && canReplaceLine) {
                completions.push(this.createCompletion(`もし ${variable.name} == 0 ならば:`, `もし ${variable.name} == 0 ならば:\n__COMMON_BODY____CURSOR__`, `${variable.name} を条件に分岐`, {
                    aliases: [`if ${variable.name}`, `${variable.name} 条件`],
                    kind: 'context',
                    priority: -70,
                    replaceMode: 'lineBody'
                }));
            }

            if (variable.type === 'list') {
                completions.push(this.createCompletion(`要素数(${variable.name})`, `要素数(${variable.name})`, `${variable.name} の要素数`, {
                    aliases: [`len ${variable.name}`, `${variable.name} 要素数`],
                    kind: 'context',
                    priority: -62
                }));
            }
        });

        analysis.functions.forEach((fn) => {
            completions.push(this.createCompletion(`${fn.name}()`, `${fn.name}(__CURSOR__)`, '定義済み関数', {
                aliases: [fn.name, fn.parameters],
                kind: 'context',
                priority: -52
            }));
        });

        return completions;
    }

    getCommonTestLineCompletions(context, analysis) {
        if (!this.isLineCompletionContext(context)) return [];

        const loopVariable = analysis.numbers[0] ? analysis.numbers[0].name : 'i';
        return [
            this.createCompletion(`もし ${loopVariable} == 0 ならば:`, `もし ${loopVariable} == 0 ならば:\n__COMMON_BODY____CURSOR__`, '文脈に合わせた条件分岐', {
                aliases: ['if', 'もし', '条件'],
                kind: 'context',
                priority: -58,
                replaceMode: 'lineBody'
            }),
            this.createCompletion(`${loopVariable} を 1 から 100 まで繰り返す:`, `${loopVariable} を 1 から 100 まで 1 ずつ増やしながら繰り返す:\n__COMMON_BODY____CURSOR__`, '1から100まで繰り返し', {
                aliases: ['for', 'loop', '繰り返し'],
                kind: 'context',
                priority: -54,
                replaceMode: 'lineBody'
            }),
            this.createCompletion('表示する(...)', '表示する(__CURSOR__)', '値を表示', {
                aliases: ['print', '表示'],
                kind: 'context',
                priority: -44,
                replaceMode: 'lineBody'
            })
        ];
    }

    getVariableDetail(variable) {
        const labels = {
            list: 'リスト変数',
            number: '数値変数',
            string: '文字列変数',
            boolean: '真偽値',
            value: '文脈内の変数'
        };

        return labels[variable.type] || labels.value;
    }

    isLineCompletionContext(context) {
        const body = context.lineBodyBeforeCursor;
        const trimmed = body.trim();

        if (this.isInsideCallArgument(context)) return false;
        if (!trimmed) return true;
        if (trimmed === context.token) return true;
        return /^(if|elif|else|for|while|def|return|print|import|もし|そうでなくもし|そうでなければ|表示する|関数)\b/.test(trimmed);
    }

    isInsideCallArgument(context) {
        const body = context.lineBodyBeforeCursor;
        return body.lastIndexOf('(') > body.lastIndexOf(')');
    }

    getPythonExpressionContext(context) {
        const before = context.lineBeforeCursor;

        if (/print\([^)]*$/.test(before)) return 'print';
        if (/range\([^)]*$/.test(before)) return 'range';
        if (/len\([^)]*$/.test(before)) return 'len';
        if (/[=,(]\s*$/.test(before)) return 'expression';
        return '';
    }

    getPreferredLoopVariable(analysis) {
        const usedNames = new Set(analysis.variables.map((variable) => variable.name));
        return ['i', 'j', 'k', 'index'].find((name) => !usedNames.has(name)) || 'i';
    }

    getPreferredItemName(listName) {
        const singular = listName
            .replace(/List$/i, '')
            .replace(/s$/i, '');

        if (singular && singular !== listName) {
            return singular.charAt(0).toLowerCase() + singular.slice(1);
        }

        return 'item';
    }

    filterAndRankCompletions(completions, context) {
        const token = context.token.toLowerCase();
        const seen = new Set();

        return completions
            .filter((completion) => completion.replaceMode !== 'lineBody' || this.isLineCompletionContext(context))
            .map((completion, index) => ({
                completion,
                index,
                score: this.getCompletionScore(completion, token, context)
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

    getCompletionScore(completion, token, context) {
        const priority = completion.priority || 0;
        if (!token) {
            return this.applyLinePrefixScoreBoost(100 + priority, completion, context);
        }

        const fields = [
            completion.displayText,
            completion.text,
            completion.detail || '',
            ...(completion.aliases || [])
        ].map((value) => value.toLowerCase());

        if (fields.some((field) => field === token)) return this.applyLinePrefixScoreBoost(priority, completion, context);
        if (fields.some((field) => field.startsWith(token))) return this.applyLinePrefixScoreBoost(10 + priority, completion, context);
        if (fields.some((field) => this.matchesAcronym(field, token))) return this.applyLinePrefixScoreBoost(35 + priority, completion, context);
        if (fields.some((field) => field.includes(token))) return this.applyLinePrefixScoreBoost(70 + priority, completion, context);
        if (fields.some((field) => this.matchesSubsequence(field, token))) return this.applyLinePrefixScoreBoost(95 + priority, completion, context);
        return null;
    }

    applyLinePrefixScoreBoost(score, completion, context) {
        if (!context || !context.lineBodyBeforeCursor) return score;

        const body = context.lineBodyBeforeCursor.trim().toLowerCase();
        const keywordMatch = body.match(/^(if|elif|else|for|while|def|return|print|import|もし|そうでなくもし|そうでなければ|表示する|関数)\b/);
        if (!keywordMatch) return score;

        const keyword = keywordMatch[1];
        const display = completion.displayText.toLowerCase();
        const aliases = completion.aliases || [];
        const matchesKeyword = display.startsWith(keyword)
            || completion.text.toLowerCase().startsWith(keyword)
            || aliases.some((alias) => String(alias).toLowerCase().startsWith(keyword));

        return matchesKeyword ? score - 70 : score + 25;
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

    matchesSubsequence(text, token) {
        if (!token) return true;

        let tokenIndex = 0;
        for (let index = 0; index < text.length && tokenIndex < token.length; index += 1) {
            if (text[index] === token[tokenIndex]) {
                tokenIndex += 1;
            }
        }

        return tokenIndex === token.length;
    }

    createCompletion(displayText, text, detail, options = {}) {
        return {
            text,
            displayText,
            detail,
            aliases: options.aliases || [],
            priority: options.priority || 0,
            kind: options.kind || 'snippet',
            replaceMode: options.replaceMode || 'token',
            render: (element) => {
                const label = document.createElement('span');
                label.className = 'autocomplete-label';
                label.textContent = displayText;
                element.appendChild(label);

                if (options.kind === 'context') {
                    const kind = document.createElement('span');
                    kind.className = 'autocomplete-kind';
                    kind.textContent = '文脈';
                    element.appendChild(kind);
                }

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
                const replacementRange = this.getCompletionReplacementRange(completion, data);

                cm.replaceRange(insertion, replacementRange.from, replacementRange.to, 'complete');

                if (markerIndex !== -1) {
                    const beforeMarker = preparedText.slice(0, markerIndex);
                    const beforeLines = beforeMarker.split('\n');
                    const lineOffset = beforeLines.length - 1;
                    const ch = lineOffset === 0
                        ? replacementRange.from.ch + beforeLines[0].length
                        : beforeLines[beforeLines.length - 1].length;

                    cm.setCursor({
                        line: replacementRange.from.line + lineOffset,
                        ch
                    });
                }
            }
        };
    }

    getCompletionReplacementRange(completion, data) {
        const context = data.completionContext;
        if (!context) {
            return {from: data.from, to: data.to};
        }

        if (completion.replaceMode === 'lineBody') {
            return {
                from: CodeMirror.Pos(context.cursor.line, context.lineIndent.length),
                to: CodeMirror.Pos(context.cursor.line, context.cursor.ch)
            };
        }

        if (completion.replaceMode === 'line') {
            return {
                from: CodeMirror.Pos(context.cursor.line, 0),
                to: CodeMirror.Pos(context.cursor.line, context.cursor.ch)
            };
        }

        return {from: data.from, to: data.to};
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
     * Refresh editors after layout changes without moving the user's scroll position.
     */
    refreshEditors() {
        [this.pythonEditor, this.commonTestEditor].forEach((editor) => {
            if (!editor) return;

            editor.refresh();
            editor.setSize(null, null);
            editor.getScrollInfo();
        });
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
            const response = await fetch(`Sample/samples.json?v=${this.sampleAssetVersion}`);
            if (!response.ok) {
                throw new Error(`サンプル一覧の取得に失敗しました (${response.status})`);
            }

            const config = await response.json();
            if (!config || !Array.isArray(config.samples) || config.samples.length === 0) {
                throw new Error('サンプル一覧の形式が正しくありません');
            }

            this.samplesConfig = config;
            this.populateSampleDropdown();
        } catch (error) {
            console.error('Failed to load samples configuration:', error);
            this.samplesConfig = {samples: []};
            this.setSampleControlsAvailable(false);
            this.updateSampleDescription(null, 'サンプル一覧を読み込めませんでした。ページを再読み込みしてください。');
        }
    }

    /**
     * Populate sample dropdown from JSON config
     */
    populateSampleDropdown() {
        const sampleSelect = document.getElementById('sampleSelect');
        if (!sampleSelect || !this.samplesConfig) return;
        
        sampleSelect.replaceChildren();
        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = 'サンプルを選択';
        sampleSelect.appendChild(placeholder);

        const categoryGroups = new Map();
        this.samplesConfig.samples.forEach((sample) => {
            const category = sample.category || 'その他';
            let group = categoryGroups.get(category);
            if (!group) {
                group = document.createElement('optgroup');
                group.label = category;
                categoryGroups.set(category, group);
                sampleSelect.appendChild(group);
            }

            const option = document.createElement('option');
            option.value = sample.id;
            option.textContent = sample.title;
            option.title = [sample.difficulty, sample.description].filter(Boolean).join(' - ');
            group.appendChild(option);
        });

        this.setSampleControlsAvailable(true);
        this.updateSampleDescription('');
    }

    setSampleControlsAvailable(available) {
        const sampleSelect = document.getElementById('sampleSelect');
        const loadButton = document.querySelector('.load-sample-button');
        if (sampleSelect) sampleSelect.disabled = !available;
        if (loadButton) loadButton.disabled = !available;
    }

    updateSampleDescription(sampleKey, fallbackMessage = '') {
        const descriptionElement = document.getElementById('sampleDescription');
        if (!descriptionElement) return;

        const sample = this.samplesConfig && this.samplesConfig.samples
            ? this.samplesConfig.samples.find((item) => item.id === sampleKey)
            : null;

        if (!sample) {
            descriptionElement.textContent = fallbackMessage;
            descriptionElement.hidden = !fallbackMessage;
            return;
        }

        const learningPoints = Array.isArray(sample.learningPoints)
            ? sample.learningPoints.join('・')
            : '';
        descriptionElement.textContent = [
            sample.difficulty,
            sample.description,
            learningPoints ? `学習: ${learningPoints}` : ''
        ].filter(Boolean).join(' | ');
        descriptionElement.hidden = false;
    }

    /**
     * Set up event listeners
     */
    setupEventListeners() {
        console.log('Setting up event listeners');
        
        this.bindClick('.convert-button-right', () => window.convertPythonToCommon());
        this.bindClick('.convert-button-left', () => window.convertCommonToPython());
        this.bindClick('.run-button', () => window.runCode());
        this.bindClick('.clear-button', () => this.clearAll());
        this.bindClick('.output-clear-button', () => this.clearOutput());
        this.setupPanelDisplayControls();

        // Load sample button
        this.bindClick('.load-sample-button', () => {
            const sampleSelect = document.getElementById('sampleSelect');
            const selectedSample = sampleSelect ? sampleSelect.value : '';

            if (selectedSample) {
                return this.requestSampleLoad(selectedSample);
            } else {
                alert('サンプルを選択してください');
            }
        });

        const sampleSelect = document.getElementById('sampleSelect');
        if (sampleSelect && sampleSelect.dataset.descriptionBound !== 'true') {
            sampleSelect.dataset.descriptionBound = 'true';
            sampleSelect.addEventListener('change', () => {
                this.updateSampleDescription(sampleSelect.value);
            });
        }

        // Share generate button
        this.bindClick('.share-generate-button', () => this.shareCode());
        this.bindClick('.share-copy-button', (event) => this.copyShareUrl(event.currentTarget));
        this.bindClick('.python-tutor-generate-button', () => this.generatePythonTutorUrl());
        this.bindClick('.python-tutor-copy-button', (event) => this.copyPythonTutorUrl(event.currentTarget));
        this.bindClick('.python-copy-button', (event) => this.copyToClipboard('pythonCode', event.currentTarget));
        this.bindClick('.common-copy-button', (event) => this.copyToClipboard('commonTestCode', event.currentTarget));
        this.bindClick('.python-format-button', (event) => this.formatEditor('python', event.currentTarget));
        this.bindClick('.common-format-button', (event) => this.formatEditor('commontest', event.currentTarget));
        // Hash change event listener for URL sharing
        window.addEventListener('hashchange', () => {
            this.loadFromUrl();
        });
    }

    bindClick(selector, handler) {
        const element = document.querySelector(selector);
        if (!element) return;

        element.addEventListener('click', async (event) => {
            event.preventDefault();
            await handler(event);
        });
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
        const trimmed = normalized.trimStart();
        const keepLeading = !/^[,):\]]/.test(trimmed);
        return (keepLeading ? leading : '') + trimmed;
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
        if (this.hasWorkspaceContent()) {
            const confirmed = window.confirm('入力内容、フローチャート、実行結果、生成URLをすべて消去します。よろしいですか？');
            if (!confirmed) return false;
        }

        this.pythonEditor.setValue('');
        this.commonTestEditor.setValue('');
        if (window.flowchartGenerator) {
            window.flowchartGenerator.clearFlowchart();
        }
        this.clearOutput();
        this.clearGeneratedUrls();

        return true;
    }

    clearGeneratedUrls() {
        document.getElementById('shareUrl').value = '';
        document.getElementById('pythonTutorUrl').value = '';

        const shareUrlLink = document.getElementById('shareUrlLink');
        if (shareUrlLink) {
            shareUrlLink.hidden = true;
        }

        const pythonTutorLink = document.getElementById('pythonTutorLink');
        if (pythonTutorLink) {
            pythonTutorLink.hidden = true;
        }
    }

    hasWorkspaceContent() {
        const pythonCode = this.pythonEditor ? this.pythonEditor.getValue().trim() : '';
        const commonCode = this.commonTestEditor ? this.commonTestEditor.getValue().trim() : '';
        const flowchart = document.getElementById('flowchart');
        const output = document.getElementById('output');
        const shareUrl = document.getElementById('shareUrl');
        const pythonTutorUrl = document.getElementById('pythonTutorUrl');

        return Boolean(
            pythonCode
            || commonCode
            || (flowchart && flowchart.childElementCount > 0)
            || (output && output.textContent.trim())
            || (shareUrl && shareUrl.value)
            || (pythonTutorUrl && pythonTutorUrl.value)
        );
    }

    /**
     * Clear output only
     */
    clearOutput() {
        document.getElementById('output').textContent = '';
    }

    /**
     * Load example code
     */
    loadExample() {
        this.loadSampleCode('hello-world');
    }

    async requestSampleLoad(sampleKey) {
        const hasEditorContent = Boolean(
            (this.pythonEditor && this.pythonEditor.getValue().trim())
            || (this.commonTestEditor && this.commonTestEditor.getValue().trim())
        );

        if (hasEditorContent) {
            const confirmed = window.confirm('現在の入力内容を、選択したサンプルで置き換えます。よろしいですか？');
            if (!confirmed) return false;
        }

        return this.loadSampleCode(sampleKey);
    }

    /**
     * Load specific sample code from markdown file
     */
    async loadSampleCode(sampleKey) {
        if (!this.samplesConfig) {
            console.error('Samples configuration not loaded');
            return false;
        }

        const sample = this.samplesConfig.samples.find(s => s.id === sampleKey);
        if (!sample) {
            console.error('Sample not found:', sampleKey);
            return false;
        }

        try {
            console.log('Loading sample:', sample.title);

            if (!sample.folder || !sample.pythonFile || !sample.commonTestFile) {
                throw new Error('サンプル設定に必要なファイル情報がありません');
            }

            const [pythonResponse, commonTestResponse] = await Promise.all([
                fetch(`Sample/${sample.folder}/${sample.pythonFile}?v=${this.sampleAssetVersion}`),
                fetch(`Sample/${sample.folder}/${sample.commonTestFile}?v=${this.sampleAssetVersion}`)
            ]);
            if (!pythonResponse.ok || !commonTestResponse.ok) {
                throw new Error(`サンプルファイルの取得に失敗しました (${pythonResponse.status}/${commonTestResponse.status})`);
            }

            const [pythonContent, commonTestContent] = await Promise.all([
                pythonResponse.text(),
                commonTestResponse.text()
            ]);
            const pythonCodeMatch = pythonContent.match(/```python\r?\n([\s\S]*?)\r?\n```/);
            const commonTestCodeMatch = commonTestContent.match(/```\r?\n([\s\S]*?)\r?\n```/);
            if (!pythonCodeMatch || !commonTestCodeMatch) {
                throw new Error('サンプル内のコードブロックを読み取れませんでした');
            }

            const pythonCode = pythonCodeMatch[1];
            this.pythonEditor.setValue(pythonCode);
            this.commonTestEditor.setValue(commonTestCodeMatch[1]);
            this.clearOutput();
            this.clearGeneratedUrls();

            if (window.flowchartGenerator) {
                await window.flowchartGenerator.generateFlowchart(pythonCode);
            }

            console.log('Sample loaded successfully:', sample.title);
            return true;
        } catch (error) {
            console.error('Failed to load sample file:', error);
            alert(`サンプル「${sample.title}」を読み込めませんでした。ページを再読み込みしてお試しください。`);
            return false;
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
        
        // Determine the initial direction from the populated editor.
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
            shareUrlLink.hidden = false;
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
            pythonTutorLink.hidden = false;
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
