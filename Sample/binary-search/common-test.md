# 二分探索

ソート済み配列から特定の値を効率的に検索するアルゴリズム

```
# 二分探索の例
data ← [3, 18, 29, 33, 48, 52, 62, 77, 89, 97]
kazu ← len(data)
"0～99の数字を入力してください" を出力する
atai ← 整数値を入力する
hidari ← 0
migi ← kazu - 1
owari ← 0

hidari <= migi かつ owari == 0 の間
    aida ← (hidari + migi) // 2
    もし data[aida] == atai ならば
        atai, "は", aida, "番目にありました" を出力する
        owari ← 1
    そうでなくもし data[aida] < atai ならば
        hidari ← aida + 1
    そうでなければ
        migi ← aida - 1

もし owari == 0 ならば
    atai, "は見つかりませんでした" を出力する

"添字", " ", "要素" を出力する
i を 0 から kazu-1 まで繰り返す
    i, " ", data[i] を出力する
```