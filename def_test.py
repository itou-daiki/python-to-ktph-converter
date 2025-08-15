def message(a, b):
    if a < b:
        print(f"金額が不足しています。不足金額：{b - a}円")
    else:
        print(f"お支払い後の残高：{a - b}円")
zandaka = int(input("残高を入力してください: "))
shiharai = int(input("支払金額を入力してください: "))
message(zandaka, shiharai)