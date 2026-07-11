# 条件に合う要素の抽出

難易度: 標準
学習ポイント: 条件抽出、append、配列の作成

```python
# 80点以上の得点だけを新しい配列に集める
scores = [72, 85, 91, 68, 80, 59]
selected = []

for i in range(len(scores)):
    if scores[i] >= 80:
        selected.append(scores[i])

print("80点以上: " + str(selected))
```
