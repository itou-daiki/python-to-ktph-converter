# 最大公約数

難易度: 標準
学習ポイント: 最大公約数、剰余、while

```python
# ユークリッドの互除法で最大公約数を求める
a = int(input("1つ目の正の整数: "))
b = int(input("2つ目の正の整数: "))

while b != 0:
    remainder = a % b
    a = b
    b = remainder

print("最大公約数: " + str(a))
```
