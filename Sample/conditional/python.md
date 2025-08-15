# 条件分岐

if文を使った条件分岐の基本

```python
# 条件分岐のサンプル
score = int(input("点数を入力してください: "))

if score >= 90:
    print("優秀です！")
elif score >= 70:
    print("よくできました")
elif score >= 60:
    print("合格です")
else:
    print("もう少し頑張りましょう")

print("判定終了")
```