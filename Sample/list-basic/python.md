# 配列の基本

配列の作成と要素の操作

```python
# 配列操作のサンプル
numbers = [10, 20, 30, 40, 50]
print("配列の内容:", numbers)
print("配列の長さ:", len(numbers))

print("\n各要素を表示:")
for i in range(len(numbers)):
    print("numbers[" + str(i) + "] = " + str(numbers[i]))

print("\n要素の合計を計算:")
total = 0
for num in numbers:
    total = total + num
print("合計:", total)
```