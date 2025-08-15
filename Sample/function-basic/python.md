# 関数の基本

関数の定義と呼び出し

```python
# 関数のサンプル
def greet(name):
    print(f"こんにちは、{name}さん！")

def add_numbers(x, y):
    result = x + y
    return result

# 関数の呼び出し
greet("太郎")
greet("花子")

# 戻り値のある関数の呼び出し
sum_result = add_numbers(5, 3)
print(f"5 + 3 = {sum_result}")

# 直接値を表示
print(f"10 + 20 = {add_numbers(10, 20)}")
```