# For loop test
total = 0
for i in range(5):
    total += i
    print(f"i = {i}, total = {total}")
print("For loop finished")

# While loop test
count = 0
while count < 3:
    count += 1
    print(f"count = {count}")
print("While loop finished")

# Nested loops test
for i in range(2):
    for j in range(2):
        print(f"i = {i}, j = {j}")
    print("Inner loop finished")
print("All loops finished")