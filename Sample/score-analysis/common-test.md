# 得点データの集計

難易度: 標準
学習ポイント: 集計、カウンタ、最大値

```
# 得点の平均、合格者数、最高点を求める
Scores = [72, 85, 58, 91, 64, 77]
total = 0
pass_count = 0
highest = Scores[0]

i を 0 から 要素数(Scores)-1 まで 1 ずつ増やしながら繰り返す:
｜ total = total + Scores[i]
｜ もし Scores[i] >= 60 ならば:
｜ ⎿ pass_count = pass_count + 1
｜ もし Scores[i] > highest ならば:
⎿ ⎿ highest = Scores[i]

average = total ÷ 要素数(Scores)
表示する("平均点: " + 文字列(average))
表示する("合格者数: " + 文字列(pass_count))
表示する("最高点: " + 文字列(highest))
```
