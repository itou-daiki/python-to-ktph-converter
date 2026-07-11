# 配列の走査と平均

難易度: 基礎
学習ポイント: 配列、添字、要素数、累積処理

```python
# 配列を添字で順に調べる
numbers = [10, 20, 30, 40, 50]
total = 0

for i in range(len(numbers)):
    print("位置 " + str(i) + ": " + str(numbers[i]))
    total = total + numbers[i]

average = total // len(numbers)
print("合計: " + str(total))
print("平均: " + str(average))
```
