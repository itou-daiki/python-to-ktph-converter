# 共通テスト用プログラム表記サンプル

共通テスト用プログラム表記からPythonへの変換テスト用のサンプルです。

```
# 二分探索のサンプル
Data = [3, 18, 29, 33, 48, 52, 62, 77, 89, 97]
kazu = 要素数(Data)
表示する("0～99の数字を入力してください")
atai = 整数(【外部からの入力】)
hidari = 0
migi = kazu - 1
owari = 0

もし hidari <= migi and owari == 0 ならば:
｜ aida = (hidari + migi) ÷ 2
｜ もし Data[aida] == atai ならば:
｜ ｜ 表示する(atai, "は", aida, "番目にありました")
｜ ｜ owari = 1
｜ そうでなくもし Data[aida] < atai ならば:
｜ ｜ hidari = aida + 1
｜ そうでなければ:
⎿ ⎿ migi = aida - 1

もし owari == 0 ならば:
⎿ 表示する(atai, "は見つかりませんでした")

表示する("添字", " ", "要素")
i を 0 から kazu まで 1 ずつ増やしながら繰り返す:
⎿ 表示する(i, " ", Data[i])
```