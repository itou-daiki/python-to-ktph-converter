# API Documentation

## Converter Class

### Methods

#### `pythonToCommonTest(pythonCode: string): string`
Pythonコードを共通テスト用プログラム表記に変換します。

**Parameters:**
- `pythonCode`: 変換するPythonコード

**Returns:**
- 変換された共通テスト用プログラム表記

#### `commonTestToPython(commonTestCode: string): string`
共通テスト用プログラム表記をPythonコードに変換します。

**Parameters:**
- `commonTestCode`: 変換する共通テスト用プログラム表記

**Returns:**
- 変換されたPythonコード

## Executor Class

### Methods

#### `runPythonCode(pythonCode: string): Promise<void>`
Pyodideを使用してPythonコードを実行します。

**Parameters:**
- `pythonCode`: 実行するPythonコード

#### `executeCommonTestCode(code: string): Promise<void>`
共通テスト用プログラム表記を実行します。

**Parameters:**
- `code`: 実行する共通テスト用プログラム表記

## FlowchartGenerator Class

### Methods

#### `generateFlowchart(pythonCode: string): void`
Pythonコードからフローチャートを生成します。

**Parameters:**
- `pythonCode`: フローチャートを生成するPythonコード

#### `clearFlowchart(): void`
フローチャートをクリアします。

## UIManager Class

### Methods

#### `initializeEditors(): void`
CodeMirrorエディタを初期化します。

#### `convert(): void`
選択された方向に基づいてコードを変換します。

#### `loadExample(): void`
サンプルコード（二分探索）を読み込みます。

#### `shareCode(): void`
現在のコードを含む共有URLを生成します。

#### `clearAll(): void`
すべてのエディタと出力をクリアします。