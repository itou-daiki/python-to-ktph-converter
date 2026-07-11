# 得点の判定

難易度: 基礎
学習ポイント: if、elif、else、論理演算

```python
# 0点から100点までの得点を判定
score = int(input("点数を入力してください: "))

if score < 0 or score > 100:
    print("0から100までの点数を入力してください")
elif score >= 90:
    print("評価はAです")
elif score >= 70:
    print("評価はBです")
elif score >= 60:
    print("評価はCです")
else:
    print("もう一度復習しましょう")
```
