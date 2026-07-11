# 10進数から2進数へ変換

難易度: 発展
学習ポイント: 進数変換、剰余、配列、逆順走査

```python
# 10進数を2進数に変換する
number = int(input("0以上の整数: "))
digits = []

if number == 0:
    digits.append(0)
else:
    while number > 0:
        digits.append(number % 2)
        number = number // 2

index = len(digits) - 1
binary = ""
while index >= 0:
    binary = binary + str(digits[index])
    index = index - 1

print("2進数: " + binary)
```
