# 選択ソート

難易度: 発展
学習ポイント: 最小値探索、比較交換、整列済み範囲

```python
# 未整列部分の最小値を探して先頭と交換する
data = [64, 25, 12, 22, 11]
n = len(data)
passes = n - 1

for i in range(passes):
    minimum_index = i
    for j in range(i + 1, n):
        if data[j] < data[minimum_index]:
            minimum_index = j
    temporary = data[i]
    data[i] = data[minimum_index]
    data[minimum_index] = temporary

print("整列後: " + str(data))
```
