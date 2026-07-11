# 配列の走査と平均

難易度: 基礎
学習ポイント: 配列、添字、要素数、累積処理

```
# 配列を添字で順に調べる
Numbers = [10, 20, 30, 40, 50]
total = 0

i を 0 から 要素数(Numbers)-1 まで 1 ずつ増やしながら繰り返す:
｜ 表示する("位置 " + 文字列(i) + ": " + 文字列(Numbers[i]))
⎿ total = total + Numbers[i]

average = total ÷ 要素数(Numbers)
表示する("合計: " + 文字列(total))
表示する("平均: " + 文字列(average))
```
