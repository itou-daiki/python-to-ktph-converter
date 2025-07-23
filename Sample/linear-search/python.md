# 線形探索

配列を先頭から順に検索するアルゴリズム

```python
# 線形探索の例
data = [2, 3, 4, 10, 40]
print("検索する値を入力してください")
x = int(input())

# 線形探索
found = False
for i in range(len(data)):
    if data[i] == x:
        print(f"値 {x} は位置 {i} にあります")
        found = True
        break

if not found:
    print(f"値 {x} は見つかりませんでした")
```