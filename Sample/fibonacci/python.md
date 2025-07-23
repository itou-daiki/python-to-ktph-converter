# フィボナッチ数列

フィボナッチ数列を生成するアルゴリズム

```python
# フィボナッチ数列の例
print("フィボナッチ数列の項数を入力してください")
n = int(input())

# 最初の2項
a, b = 0, 1

print("フィボナッチ数列:")
if n >= 1:
    print(a, end=" ")
if n >= 2:
    print(b, end=" ")

for i in range(2, n):
    c = a + b
    print(c, end=" ")
    a, b = b, c

print()
```