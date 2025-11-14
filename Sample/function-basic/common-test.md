# 関数の基本

関数の定義と呼び出し

```
# 関数のサンプル
関数 greet(name):
⎿ 表示する("こんにちは、" + name + "さん！")

関数 add_numbers(x, y):
｜ result = x + y
⎿ result を返す

# 関数の呼び出し
greet("太郎")
greet("花子")

# 戻り値のある関数の呼び出し
sum_result = add_numbers(5, 3)
表示する("5 + 3 = " + 文字列(sum_result))

# 直接値を表示
表示する("10 + 20 = " + 文字列(add_numbers(10, 20)))
```