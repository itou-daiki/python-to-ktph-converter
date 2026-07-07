# python-to-ktph-converter - Claude Code設定

## プロジェクト概要
Python と共通テスト用プログラム表記を相互変換する、GitHub Pages 向けの静的 Web アプリケーションです。ビルド工程はなく、`index.html` から CSS/JavaScript と CDN ライブラリを読み込んで動作します。

主な機能は、Python/共通テスト表記の双方向変換、CodeMirror エディタ、コード整形ボタン、補完候補表示、Pyodide による Python 実行、Mermaid フローチャート生成、共有 URL と Python Tutor URL 生成です。

## 開発環境
- Python: ローカル静的サーバー用。確認時は `Python 3.14.4`。
- Node.js: 構文チェック用。確認時は `v25.9.0`。
- 主要な依存関係:
  - CodeMirror 5.65.13 (CDN)
  - CodeMirror show-hint / matchbrackets / closebrackets add-ons (CDN)
  - Pyodide 0.24.1 (CDN)
  - Mermaid 10.6.1 (CDN)

## 開発ガイドライン
1. GitHub Pages で直接配信される前提を守る。バンドラー、サーバーサイド処理、Node 依存の実行時処理を追加しない。
2. パスは相対パスを使う。`Sample/*.md` は `fetch()` で読むため、確認は `file://` ではなく HTTP サーバーで行う。
3. UI は `index.html`、スタイルは `assets/css/`、アプリロジックは `assets/js/` と `assets/js/modules/` に分ける。
4. サンプルを増やす場合は `Sample/samples.json` と対応する `Sample/<folder>/python.md` / `common-test.md` を同時に更新する。
5. CodeMirror 補完は `assets/js/modules/ui.js` に集約されている。候補、キーバインド、整形処理を変更したらブラウザで確認する。
6. 変換規則は `assets/js/modules/converter.js` と `docs/reference/共通テスト用プログラム表記.md` の整合を意識する。

## テスト・確認
```bash
# 開発サーバー起動
python3 -m http.server 8765 --bind 127.0.0.1

# JavaScript構文チェック
node --check assets/js/app.js
node --check assets/js/modules/converter.js
node --check assets/js/modules/executor.js
node --check assets/js/modules/flowchart.js
node --check assets/js/modules/ui.js

# ブラウザ確認
# http://127.0.0.1:8765/ を開く
```

## ビルド・デプロイ
ビルドは不要です。GitHub Pages は `main` ブランチの静的ファイルをそのまま配信します。デプロイ前に、ローカル HTTP サーバー上で CDN 読み込み、サンプル読込、変換、整形、補完、共有 URL を確認してください。
