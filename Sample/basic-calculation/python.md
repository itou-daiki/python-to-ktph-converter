# 四則演算

難易度: 基礎
学習ポイント: 整数入力、四則演算、ゼロ除算の回避

```python
# 二つの整数を使った計算
a = int(input("1つ目の整数: "))
b = int(input("2つ目の整数: "))

print("和: " + str(a + b))
print("差: " + str(a - b))
print("積: " + str(a * b))

if b != 0:
    print("商: " + str(a // b))
    print("余り: " + str(a % b))
else:
    print("0では割れません")
```
