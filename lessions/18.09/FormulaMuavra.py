import math

k = int(input("Введите k: "))
r = float(input("Введите модуль r: "))
phi = float(input("Введите аргумент phi: "))

if k < 1 or r < 0:
    print("Некорректные данные")
else:
    a = math.cos(phi)
    b = math.sin(phi)

    z = complex(r * a, r * b)

    left_k = z ** k
    right_k = r ** k * complex(
        math.cos(k * phi),
        math.sin(k * phi)
    )

    left_next = z ** (k + 1)

    # Раскрытие скобок при переходе к k+1
    c = math.cos(k * phi)
    d = math.sin(k * phi)

    right_next = r ** (k + 1) * complex(
        c * a - d * b,
        d * a + c * b
    )

    print("Проверка шага k:", abs(left_k - right_k) < 1e-9)
    print("Проверка шага k+1:", abs(left_next - right_next) < 1e-9)

    if abs(left_k - right_k) < 1e-9 and abs(left_next - right_next) < 1e-9:
        print("Формула Муавра подтверждена!")
    else:
        print("Равенство не подтверждено")
        