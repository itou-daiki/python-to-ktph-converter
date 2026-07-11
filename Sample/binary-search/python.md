# 二分探索

難易度: 発展
学習ポイント: 二分探索、while、探索範囲

```python
# 整列済み配列を二分探索
data = [3, 12, 18, 27, 35, 46, 59, 68, 74, 91]
target = int(input("探す値を入力してください: "))
left = 0
right = len(data) - 1
position = -1

while left <= right and position == -1:
    middle = (left + right) // 2
    if data[middle] == target:
        position = middle
    elif data[middle] < target:
        left = middle + 1
    else:
        right = middle - 1

if position == -1:
    print("見つかりませんでした")
else:
    print("位置 " + str(position) + " にあります")
```
