# 関数の定義と戻り値

難易度: 標準
学習ポイント: 関数、引数、戻り値

```python
# 長方形の面積を返す関数
def rectangle_area(width, height):
    area = width * height
    return area

# 計算結果を表示する関数
def show_area(area):
    print("長方形の面積: " + str(area))

width = int(input("横の長さ: "))
height = int(input("縦の長さ: "))
result = rectangle_area(width, height)
show_area(result)
```
