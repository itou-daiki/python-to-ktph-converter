# 得点データの集計

難易度: 標準
学習ポイント: 集計、カウンタ、最大値

```python
# 得点の平均、合格者数、最高点を求める
scores = [72, 85, 58, 91, 64, 77]
total = 0
pass_count = 0
highest = scores[0]

for i in range(len(scores)):
    total = total + scores[i]
    if scores[i] >= 60:
        pass_count = pass_count + 1
    if scores[i] > highest:
        highest = scores[i]

average = total // len(scores)
print("平均点: " + str(average))
print("合格者数: " + str(pass_count))
print("最高点: " + str(highest))
```
