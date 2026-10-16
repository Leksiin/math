import numpy as np

dim = int(input("Выберите размерность (2 или 3): "))

if dim not in (2, 3):
    print("ОШИБКА: Нужно выбрать 2 или 3.")
else:
    a = np.array(list(map(int, input(f"Введите вектор a ({dim} числа через пробел): ").split())))
    b = np.array(list(map(int, input(f"Введите вектор b ({dim} числа через пробел): ").split())))

    if len(a) != dim or len(b) != dim:
        print(f"Ошибка! Каждый вектор должен содержать {dim} числа.")
    else:
        print("Сложение: a + b =", a + b)
        print("Скалярное произведение: a @ b =", a @ b)

        if dim == 2:
            cross = a[0] * b[1] - a[1] * b[0]
            print("Векторное произведение =", cross)
        else:
            print("Векторное произведение =", np.cross(a, b))

        norm_a = np.linalg.norm(a)
        norm_b = np.linalg.norm(b)

        if norm_a == 0 or norm_b == 0:
            print("Косинус угла не определён для нулевого вектора.")
        else:
            cos = (a @ b) / (norm_a * norm_b)
            print("Косинус угла =", cos)