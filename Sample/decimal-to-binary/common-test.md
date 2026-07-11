# 10進数から2進数へ変換

難易度: 発展
学習ポイント: 進数変換、剰余、配列、逆順走査

```
# 10進数を2進数に変換する
number = 【外部からの入力】
Digits = []

もし number == 0 ならば:
｜ Digits配列に要素を追加する(0)
そうでなければ:
｜ number > 0 の間繰り返す:
｜ ｜ Digits配列に要素を追加する(number ％ 2)
⎿ ⎿ number = number ÷ 2

index = 要素数(Digits) - 1
binary = ""
index >= 0 の間繰り返す:
｜ binary = binary + 文字列(Digits[index])
⎿ index = index - 1

表示する("2進数: " + binary)
```
