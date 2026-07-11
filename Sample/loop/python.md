# 合計とカウントダウン

難易度: 基礎
学習ポイント: for、while、累積処理

```python
# 1から10までの合計
total = 0
for i in range(1, 11):
    total = total + i
print("1から10までの合計: " + str(total))

# 3から1までのカウントダウン
count = 3
while count >= 1:
    print(count)
    count = count - 1
print("スタート")
```
