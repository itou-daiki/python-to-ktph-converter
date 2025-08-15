# 関数の基本

関数の定義と呼び出し

```
# 関数のサンプル
○ greet(name)
｜ 表示する("こんにちは、", name, "さん！")
⎿ ○の定義終了

○ add_numbers(x, y)
｜ result = x + y
⎿ resultを戻り値として返す

# 関数の呼び出し
greet("太郎")
greet("花子")

# 戻り値のある関数の呼び出し
sum_result = add_numbers(5, 3)
表示する("5 + 3 = ", sum_result)

# 直接値を表示
表示する("10 + 20 = ", add_numbers(10, 20))
```