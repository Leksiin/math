import random
import time
import statistics

# 2. Реализуйте бинарный поиск и добавьте счётчик шагов. Проверьте на списке из примера: x = 23 и x = 7.

print()
print("2. Реализуйте бинарный поиск и добавьте счётчик шагов. Проверьте на списке из примера: x = 23 и x = 7.")
print()

def bsearch(a, x):
    lo = 0
    hi = len(a) - 1
    steps = 0

    while lo <= hi:
        mid = (lo + hi) // 2
        steps += 1

        if a[mid] == x:
            return mid, steps
        elif a[mid] < x:
            lo = mid + 1
        else:
            hi = mid - 1

    return -1, steps


a = [2, 5, 8, 12, 16, 23, 38, 46, 72, 91]

for x in [23, 7]:
    index, steps = bsearch(a, x)
    print("x =", x)
    print("Индекс:", index)
    print("Количество шагов:", steps)
print()

# 4. Замерьте время bubble и merge_sort на случайных списках длины 1000, 2000 и 4000 (модуль time). Во сколько раз растёт время, когда n удваивается? Совпало ли с ожиданием?

print()
print("4. Замерьте время bubble и merge_sort на случайных списках длины 1000, 2000 и 4000 (модуль time). Во сколько раз растёт время, когда n удваивается? Совпало ли с ожиданием?")
print()

def bubble(a):
    a = a.copy()
    n = len(a)
    for i in range(n - 1):
        for j in range(n - 1 - i):
            if a[j] > a[j + 1]:
                a[j], a[j + 1] = a[j + 1], a[j]
    return a

def merge_sort(a):
    if len(a) <= 1:
        return a
    m = len(a) // 2
    left, right = merge_sort(a[:m]), merge_sort(a[m:])
    res = []
    i = j = 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            res.append(left[i]); i += 1
        else:
            res.append(right[j]); j += 1
    return res + left[i:] + right[j:]

for n in [1000, 2000, 4000]:
    a = [random.randint(0, 10000) for _ in range(n)]

    bubble_times = []
    merge_times = []

    for _ in range(3):
        start = time.perf_counter()
        bubble(a)
        bubble_times.append(time.perf_counter() - start)

        start = time.perf_counter()
        merge_sort(a)
        merge_times.append(time.perf_counter() - start)

    bubble_time = statistics.median(bubble_times)
    merge_time = statistics.median(merge_times)

    print("Размер списка:", n)
    print("Bubble Sort:", round(bubble_time, 5), "сек.")
    print("Merge Sort:", round(merge_time, 5), "сек.")
    print()

# 5. Реализуйте max_events и проверьте на примере. Затем попробуйте другое жадное правило: «брать самое короткое мероприятие». Найдите набор заявок, на котором оно ошибается.

print()
print("5. Реализуйте max_events и проверьте на примере. Затем попробуйте другое жадное правило: «брать самое короткое мероприятие». Найдите набор заявок, на котором оно ошибается.")
print()

# max events
def max_events(events):
    events.sort(key=lambda p: p[1])
    chosen = []
    end = -1
    for s, f in events:
        if s >= end:
            chosen.append((s, f))
            end = f
    return chosen

events = [
    (1, 4), (3, 5), (0, 6), (5, 7),
    (3, 9), (5, 9), (6, 10), (8, 11),
    (8, 12), (2, 14), (12, 16)
]

result = max_events(events)

print("max_events")
print("Выбранные мероприятия:", result)
print("Количество мероприятий:", len(result))
print()

# самое короткое мероприятие
def shortest_events(events):
    events = sorted(events, key=lambda p: p[1] - p[0])
    chosen = []
    end = -1
    for s, f in events:
        if s >= end:
            chosen.append((s, f))
            end = f
    return chosen


events = [
    (0, 3),
    (3, 6),
    (2, 4)
]

result = shortest_events(events)

print("Самое короткое мероприятие")
print("Исходные заявки:", events)
print("Выбранные мероприятия:", result)
print("Количество мероприятий:", len(result))
print()

# Оптимальное решение
optimal = [(0, 3), (3, 6)]

print("Оптимальный набор:", optimal)
print("Количеств мероприятий в оптимальном наборе:", len(optimal))

print("Жадный алгоритм ошибается:",
      len(result) < len(optimal))
print()

# 7. Используя dp_coins и greedy_coins, найдите все суммы от 1 до 20, где для монет {1, 3, 4} жадность даёт неоптимальный ответ.

print()
print("7. Используя dp_coins и greedy_coins, найдите все суммы от 1 до 20, где для монет {1, 3, 4} жадность даёт неоптимальный ответ.")
print()

def dp_coins(x):
    coins = [1, 3, 4]
    dp = [0] + [float('inf')] * x
    for i in range(1, x + 1):
        for c in coins:
            if i >= c:
                dp[i] = min(dp[i], dp[i-c] + 1)
    return dp[x]

def greedy(x):
    coins = [4, 3, 1]
    count = 0
    for c in coins:
        count += x // c
        x %= c
    return count

for x in range(1, 21):
    if dp_coins(x) != greedy(x):
        print(x)
print()
print("Жадный алгоритм даёт неоптимальный результат для сумм")
print()

# 9. Реализуйте power_mod (на Python или C++) и проверьте: 2^10 mod 1000 и 3^13 mod 1000. Сравните с встроенным pow(a, n, m) в Python.

print()
print("9. Реализуйте power_mod (на Python или C++) и проверьте: 2^10 mod 1000 и 3^13 mod 1000. Сравните с встроенным pow(a, n, m) в Python.")
print()

def power_mod(a, n, m):
    result = 1
    while n > 0:
        if n % 2 == 1:
            result = (result * a) % m
        a = (a * a) % m
        n //= 2
    return result

print("2^10 mod 1000 = ", power_mod(2, 10, 1000))
print("3^13 mod 1000 = ", power_mod(3, 13, 1000))
print()

# Проверка встроенной функцией pow()
print("2^10 mod 1000 (pow) = ", pow(2, 10, 1000))
print("3^13 mod 1000 (pow) = ", pow(3, 13, 1000))
print()

# 10. Реализуйте решето. Сколько простых чисел не больше 100, 1000, 10^6?

print()
print("10. Реализуйте решето. Сколько простых чисел не больше 100, 1000, 10^6?")
print()

def sieve(n):
    is_prime = [True] * (n + 1)
    is_prime[0] = False
    is_prime[1] = False

    for i in range(2, int(n ** 0.5) + 1):
        if is_prime[i]:
            for j in range(i * i, n + 1, i):
                is_prime[j] = False

    primes = []
    for i in range(2, n + 1):
        if is_prime[i]:
            primes.append(i)

    return primes

print("Простых чисел не больше 100: ", len(sieve(100)))
print("Простых чисел не больше 1000: ", len(sieve(1000)))
print("Простых чисел не больше 10^6 (1 000 000): ", len(sieve(10**6)))
print()
