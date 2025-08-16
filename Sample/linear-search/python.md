# 線形探索

配列から値を順番に探す

```python
# 線形探索のサンプル
data = [5, 2, 8, 1, 9, 3]
print("配列:", data)
target = int(input("探す値を入力してください: "))

found = False
position = -1

for i in range(len(data)):
    if data[i] == target:
        found = True
        position = i
        break

if found:
    print("値 " + str(target) + " は位置 " + str(position) + " にあります")
else:
    print("値 " + str(target) + " は見つかりませんでした")
```