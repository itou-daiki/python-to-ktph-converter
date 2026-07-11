# 線形探索

難易度: 標準
学習ポイント: 探索、番兵値、break

```python
# 配列を先頭から順に探索
data = [5, 2, 8, 1, 9, 3]
target = int(input("探す値を入力してください: "))
position = -1

for i in range(len(data)):
    if data[i] == target:
        position = i
        break

if position == -1:
    print("見つかりませんでした")
else:
    print("位置 " + str(position) + " にあります")
```
