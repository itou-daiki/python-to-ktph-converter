# 選択ソート

難易度: 発展
学習ポイント: 最小値探索、比較交換、整列済み範囲

```
# 未整列部分の最小値を探して先頭と交換する
Data = [64, 25, 12, 22, 11]
n = 要素数(Data)
passes = n - 1

i を 0 から passes-1 まで 1 ずつ増やしながら繰り返す:
｜ minimum_index = i
｜ j を i + 1 から n-1 まで 1 ずつ増やしながら繰り返す:
｜ ｜ もし Data[j] < Data[minimum_index] ならば:
｜ ⎿ ⎿ minimum_index = j
｜ temporary = Data[i]
｜ Data[i] = Data[minimum_index]
⎿ Data[minimum_index] = temporary

表示する("整列後: " + 文字列(Data))
```
