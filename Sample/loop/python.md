# 繰り返し処理

for文とwhile文を使った繰り返し

```python
# 繰り返し処理のサンプル
print("=== for文の例 ===")
for i in range(5):
    print(f"{i + 1}回目の処理")

print("\n=== while文の例 ===")
count = 1
while count <= 3:
    print(f"カウント: {count}")
    count = count + 1

print("処理完了")
```