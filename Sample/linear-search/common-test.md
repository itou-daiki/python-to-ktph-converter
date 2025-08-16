# 線形探索

配列から値を順番に探す

```
# 線形探索のサンプル
Data = [5, 2, 8, 1, 9, 3]
表示する("配列:", data)
target = 【外部からの入力】

found = False
position = -1

i を 0 から 要素数(data)-1 まで 1 ずつ増やしながら繰り返す:
｜ もし data[i] == target ならば:
｜ ｜ found = True
｜ ｜ position = i
⎿ ⎿ break

もし found ならば:
｜ 表示する("値 " + target + " は位置 " + position + " にあります")
そうでなければ:
⎿ 表示する("値 " + target + " は見つかりませんでした")
```