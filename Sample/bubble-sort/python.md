# バブルソート

難易度: 発展
学習ポイント: 二重ループ、比較交換、整列

```python
# 配列を昇順に並べ替える
data = [64, 34, 25, 12, 22, 11, 90]
n = len(data)
passes = n - 1

for i in range(passes):
    comparison_count = n - i - 1
    for j in range(comparison_count):
        if data[j] > data[j + 1]:
            temporary = data[j]
            data[j] = data[j + 1]
            data[j + 1] = temporary

print("整列後: " + str(data))
```
