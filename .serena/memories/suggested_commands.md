# 推奨コマンド

## 開発・テスト用コマンド

### ローカル開発サーバー起動
```bash
# Pythonの場合
python -m http.server 8000
# または
python3 -m http.server 8000

# Node.jsの場合（serve等がインストールされている場合）
npx serve .
```

### ファイル検索・探索
```bash
# ファイル一覧
ls -la
find . -name "*.js"
find . -name "*.css"

# コード検索
grep -r "def(" .
grep -r "関数" .
rg "def.*\(" --type js
```

### Git操作
```bash
git status
git add .
git commit -m "変更内容"
git push origin main
```

### デバッグ・確認
```bash
# JavaScriptファイルの構文チェック（Node.js環境の場合）
node -c assets/js/modules/converter.js

# ファイル内容確認
cat assets/js/modules/converter.js | head -50
```

## デプロイ

### GitHub Pages
- `main`ブランチへのpushで自動デプロイ
- 設定: リポジトリ設定 > Pages > Source: Deploy from a branch > main

## テスト方法

### 手動テスト
1. ブラウザで`index.html`を開く
2. サンプルコードを読み込み
3. 変換機能をテスト
4. 実行機能をテスト
5. フローチャート生成をテスト

### 変換テスト例
- Python関数定義を共通テスト表記に変換
- 共通テスト表記をPythonに逆変換
- 演算子の変換確認

## 推奨開発環境
- VS Code（Live Server拡張推奨）
- Chrome/Firefox（開発者ツール使用）
- Git

注意：この プロジェクトは純粋なフロントエンドプロジェクトのため、npm/yarnやビルドプロセスは不要