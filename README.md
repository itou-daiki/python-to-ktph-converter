# Python ⇄ 共通テスト用プログラム表記 変換ツール

Python と日本の共通テスト用プログラム表記を相互に変換し、学習・確認に使える GitHub Pages 向け Web アプリケーションです。

## 主な機能

- Python → 共通テスト用プログラム表記の変換
- 共通テスト用プログラム表記 → Python の変換
- CodeMirror によるコード編集
- コード整形ボタン
- 入力中のオートコンプリート
  - 候補表示
  - 上下キーで候補選択
  - Tab / Enter で決定
- Pyodide による Python 実行
- Mermaid によるフローチャート生成
- サンプルコード読込
- 共有 URL 生成
- Python Tutor URL 生成
- レスポンシブ表示

## 使い方

1. 左側の Python エディタ、または右側の共通テスト用プログラム表記エディタにコードを入力します。
2. `→` ボタンで Python から共通テスト表記へ変換します。
3. `←` ボタンで共通テスト表記から Python へ変換します。
4. `整形` ボタンで各エディタのコードを整えます。
5. 入力中に補完候補が表示されます。上下キーで選び、Tab または Enter で確定します。
6. `実行` ボタンで Python エディタの内容をブラウザ内で実行します。
7. `URL生成` または `PythonTutor` で共有用 URL を生成します。

## 対応する主な変換規則

### 基本構造

- `print("文字列")` → `表示する("文字列")`
- `input()` / `int(input())` → `【外部からの入力】`
- `def 関数名(...):` → `関数 関数名(...):`
- `return 値` → `値 を返す`

### 制御構造

- `if 条件:` → `もし 条件 ならば:`
- `elif 条件:` → `そうでなくもし 条件 ならば:`
- `else:` → `そうでなければ:`
- `while 条件:` → `条件 の間繰り返す:`
- `for 変数 in range(...):` → `変数 を ... から ... まで ... ずつ増やしながら繰り返す:`

### 演算子・関数

- `//` → `÷`
- `%` → `％`
- `len()` → `要素数()`
- `int()` → `整数()`
- `float()` → `実数()`
- `str()` → `文字列()`
- `random.random()` → `乱数()`

## プロジェクト構造

```text
python-to-ktph-converter/
├── index.html
├── python-overview.html
├── commontest-overview.html
├── README.md
├── AGENTS.md
├── CLAUDE.md
├── _config.yml
├── docs/
│   └── reference/
│       └── 共通テスト用プログラム表記.md
├── Sample/
│   ├── samples.json
│   └── <sample-name>/
│       ├── python.md
│       └── common-test.md
├── assets/
│   ├── css/
│   │   ├── main.css
│   │   ├── components.css
│   │   ├── layout.css
│   │   ├── modal.css
│   │   ├── responsive.css
│   │   ├── commontest-highlight.css
│   │   ├── detail-pages.css
│   │   └── info-sections.css
│   └── js/
│       ├── app.js
│       └── modules/
│           ├── commontest-mode.js
│           ├── converter.js
│           ├── executor.js
│           ├── flowchart.js
│           └── ui.js
└── .github/
    └── workflows/
        └── deploy.yml
```

## 技術仕様

- フロントエンド: HTML5, CSS3, JavaScript
- エディタ: CodeMirror 5.65.13
- 補完: CodeMirror show-hint addon
- Python 実行: Pyodide 0.24.1
- フローチャート: Mermaid.js 10.6.1
- デプロイ: GitHub Pages

## 開発

このアプリは静的ファイルだけで動作します。依存ライブラリは CDN から読み込むため、通常の開発に `npm install` やビルドは不要です。

```bash
# ローカルサーバー
python3 -m http.server 8765 --bind 127.0.0.1

# JavaScript構文チェック
node --check assets/js/app.js
node --check assets/js/modules/converter.js
node --check assets/js/modules/executor.js
node --check assets/js/modules/flowchart.js
node --check assets/js/modules/ui.js
```

ローカル確認は `http://127.0.0.1:8765/` を開いて行います。`Sample/` のコードは `fetch()` で読み込むため、`file://` で直接開く確認は避けてください。

## GitHub Pages

GitHub Pages でそのまま配信する前提です。

- 相対パスで CSS/JS/サンプルを参照します。
- サーバーサイド処理やビルド成果物は不要です。
- CDN が読み込めるネットワーク環境で動作します。

## ライセンス

MIT License
