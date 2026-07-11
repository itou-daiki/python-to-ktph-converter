# FizzBuzz

難易度: 標準
学習ポイント: 複合分岐、剰余、条件の順序

```python
# 1から100までのFizzBuzz
for i in range(1, 101):
    if i % 15 == 0:
        print("FizzBuzz")
    elif i % 3 == 0:
        print("Fizz")
    elif i % 5 == 0:
        print("Buzz")
    else:
        print(i)
```
