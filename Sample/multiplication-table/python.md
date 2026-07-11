# 九九の表

難易度: 標準
学習ポイント: 二重ループ、反復回数、文字列結合

```python
# 1から9までの掛け算表
for row in range(1, 10):
    for column in range(1, 10):
        answer = row * column
        print(str(row) + " × " + str(column) + " = " + str(answer))
```
