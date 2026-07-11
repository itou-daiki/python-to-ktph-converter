# 回答の度数分布

難易度: 発展
学習ポイント: 度数分布、添字変換、カウンタ配列

```python
# 1から5までの回答数を数える
responses = [1, 3, 2, 5, 3, 1, 4, 3, 2, 5, 3]
counts = [0, 0, 0, 0, 0]

for i in range(len(responses)):
    answer = responses[i]
    counts[answer - 1] = counts[answer - 1] + 1

for i in range(len(counts)):
    print(str(i + 1) + "の回答数: " + str(counts[i]))
```
