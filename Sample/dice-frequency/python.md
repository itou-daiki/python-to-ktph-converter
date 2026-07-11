# さいころの度数実験

難易度: 標準
学習ポイント: 乱数、度数、シミュレーション

```python
# さいころを30回振り、出た目の回数を数える
import random

counts = [0, 0, 0, 0, 0, 0]

for i in range(30):
    die = random.randint(1, 6)
    counts[die - 1] = counts[die - 1] + 1

for i in range(len(counts)):
    print(str(i + 1) + "の回数: " + str(counts[i]))
```
