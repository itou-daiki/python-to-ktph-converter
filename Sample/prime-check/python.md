# 素数判定

難易度: 発展
学習ポイント: 真偽値、早期return、計算量

```python
# 素数ならTrueを返す関数
def is_prime(number):
    if number < 2:
        return False

    divisor = 2
    while divisor * divisor <= number:
        if number % divisor == 0:
            return False
        divisor = divisor + 1

    return True

number = int(input("調べる整数: "))
if is_prime(number):
    print("素数です")
else:
    print("素数ではありません")
```
