# 技術スタックとコーディング規約

## 技術スタック

### 言語・フレームワーク
- **HTML5, CSS3, JavaScript (ES6+)**
- **外部ライブラリ:**
  - CodeMirror 5.65.13（エディタ）
  - Pyodide 0.24.1（Python実行）
  - Mermaid.js 10.6.1（フローチャート）

### アーキテクチャ
- モジュラー設計（ES6モジュール）
- クラスベースのJavaScript
- 静的ファイル配信（GitHub Pages）

## コーディング規約

### JavaScript
- ES6+ 構文を使用
- クラスベースの設計
- メソッド名はキャメルケース（`convertLine`, `executeDisplay`）
- 変数名もキャメルケース
- 詳細なコメント（日本語可）

### CSS
- コンポーネント単位でファイル分割
- レスポンシブデザイン対応
- BEM的な命名規則

### HTML
- セマンティックHTML5
- アクセシビリティ対応
- 日本語コンテンツ

## 変換ロジックの特徴

### Python → 共通テスト変換
- `convertLine()`メソッドで行単位変換
- 演算子置換は`replaceOperators()`で処理
- 日本語キーワードへの変換

### 共通テスト → Python変換
- `convertLineToPython()`メソッドで逆変換
- `replaceOperatorsReverse()`で演算子を戻す
- range関数の適切な変換

### 実行エンジン
- Python: Pyodide使用
- 共通テスト: カスタムインタープリター
- 入力はダイアログで処理

## ファイル構造の規約
- `assets/js/modules/`：機能別モジュール
- `assets/css/`：スタイル別CSS
- `Sample/`：サンプルコード
- ルートに設定ファイル（`_config.yml`等）

注意: ユーザー定義関数の変換は現在未実装