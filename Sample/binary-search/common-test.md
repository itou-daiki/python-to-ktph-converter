# 二分探索

難易度: 発展
学習ポイント: 二分探索、while、探索範囲

```
# 整列済み配列を二分探索
Data = [3, 12, 18, 27, 35, 46, 59, 68, 74, 91]
target = 【外部からの入力】
left = 0
right = 要素数(Data) - 1
position = -1

left <= right and position == -1 の間繰り返す:
｜ middle = (left + right) ÷ 2
｜ もし Data[middle] == target ならば:
｜ ｜ position = middle
｜ そうでなくもし Data[middle] < target ならば:
｜ ｜ left = middle + 1
｜ そうでなければ:
⎿ ⎿ right = middle - 1

もし position == -1 ならば:
｜ 表示する("見つかりませんでした")
そうでなければ:
⎿ 表示する("位置 " + 文字列(position) + " にあります")
```
