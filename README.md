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
- 4つの作業領域の拡大表示と、領域ごとの内容ズーム
- フローチャートの拡大・縮小・PNG保存
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

## 教材サンプル

12件のサンプルを、授業で扱いやすい順にカテゴリ分けしています。選択すると難易度、概要、学習ポイントが表示され、`読込`を押すとPython、共通テスト表記、フローチャートが同時に準備されます。

| カテゴリ | サンプル |
| --- | --- |
| 入出力と変数 | Hello World と入力、四則演算 |
| 条件分岐 | 得点の判定、FizzBuzz |
| 繰り返し | 合計とカウントダウン |
| 配列 | 配列の走査と平均、得点データの集計 |
| 探索と整列 | 線形探索、二分探索、バブルソート |
| 関数 | 関数の定義と戻り値、素数判定 |

## 授業での活用

このアプリは、単なる記法置換ではなく、同じアルゴリズムを「Python」「共通テスト表記」「フローチャート」「実行結果」の4つの見方で往復して確かめることを意図しています。

### 生徒の活用例

1. 変換前に結果を予想し、自分の予想と変換結果を比較します。
2. Pythonのインデントと、共通テスト表記の制御記号の対応を確認します。
3. 実行結果とフローチャートを見て、分岐や繰り返しが意図どおりか確かめます。
4. 共有URLで途中のコードを提出し、修正前後を振り返ります。

### 教師の活用例

1. サンプルを読み込み、変換前後を並べて記法の対応を説明します。
2. 説明対象の領域を拡大し、教室の投影環境に合わせて内容倍率を調整します。
3. フローチャートを拡大して処理順を確認し、PNG画像を教材や振り返り資料に使います。
4. 共有URLやPython Tutorを使い、授業後も同じコードから学習を再開できるようにします。

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
│   │   ├── editor.css
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
