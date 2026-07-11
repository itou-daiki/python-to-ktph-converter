# バブルソート

難易度: 発展
学習ポイント: 二重ループ、比較交換、整列

```
# 配列を昇順に並べ替える
Data = [64, 34, 25, 12, 22, 11, 90]
n = 要素数(Data)
passes = n - 1

i を 0 から passes-1 まで 1 ずつ増やしながら繰り返す:
｜ comparison_count = n - i - 1
｜ j を 0 から comparison_count-1 まで 1 ずつ増やしながら繰り返す:
｜ ｜ もし Data[j] > Data[j + 1] ならば:
｜ ｜ ｜ temporary = Data[j]
｜ ｜ ｜ Data[j] = Data[j + 1]
⎿ ⎿ ⎿ Data[j + 1] = temporary

表示する("整列後: " + 文字列(Data))
```
