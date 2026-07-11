# 素数判定

難易度: 発展
学習ポイント: 真偽値、早期return、計算量

```
# 素数ならTrueを返す関数
関数 is_prime(number):
｜ もし number < 2 ならば:
｜ ⎿ False を返す

｜ divisor = 2
｜ divisor * divisor <= number の間繰り返す:
｜ ｜ もし number ％ divisor == 0 ならば:
｜ ｜ ⎿ False を返す
｜ ⎿ divisor = divisor + 1

⎿ True を返す

number = 【外部からの入力】
もし is_prime(number) ならば:
｜ 表示する("素数です")
そうでなければ:
⎿ 表示する("素数ではありません")
```
