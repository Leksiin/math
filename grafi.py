import tkinter as tk
from tkinter import messagebox

root = tk.Tk()
root.title("Построение графа")
root.geometry("850x650")

R = 20
vertices = {}
edges = []
count = 0
selected = None
dragging = None
mode = "add"

canvas = tk.Canvas(root, bg="white")
canvas.pack(fill="both", expand=True)

info = tk.Label(root, justify="left", anchor="w")
info.pack(fill="x", padx=10, pady=5)

status = tk.Label(root, text="Режим: Добавить вершины")
status.pack(fill="x")


def vertex_at(x, y):
    for v, (vx, vy) in vertices.items():
        if (x-vx)**2 + (y-vy)**2 <= R**2:
            return v
    return None


def redraw():
    canvas.delete("all")

    for a, b in edges:
        x1, y1 = vertices[a]
        x2, y2 = vertices[b]
        canvas.create_line(x1, y1, x2, y2, width=2)

    for v, (x, y) in vertices.items():
        color = "orange" if v == selected else "lightblue"
        canvas.create_oval(
            x-R, y-R, x+R, y+R,
            fill=color, outline="black", width=2
        )
        canvas.create_text(x, y, text=str(v))


def update():
    degrees = {v: 0 for v in vertices}

    for a, b in edges:
        degrees[a] += 1
        degrees[b] += 1

    total = sum(degrees.values())

    info.config(text=(
        f"Вершин: {len(vertices)}/100 | Рёбер: {len(edges)}/500\n"
        f"Степени: {degrees}\n"
        f"Сумма степеней: {total} | 2 × рёбра: {2*len(edges)}\n"
        f"Лемма о рукопожатиях: "
        f"{'ВЕРНА' if total == 2*len(edges) else 'ОШИБКА'}"
    ))


def set_mode(new_mode):
    global mode, selected, dragging
    mode = new_mode
    selected = None
    dragging = None

    names = {
        "add": "Добавление вершин",
        "edge": "Соединение рёбер",
        "move": "Перемещение вершин",
        "delete_edge": "Удаление рёбер",
        "delete_vertex": "Удаление вершин"
    }

    status.config(text="Режим: " + names[mode])
    redraw()
    update()


def click(event):
    global count, selected, dragging

    v = vertex_at(event.x, event.y)

    # Режим добавления вершин
    if mode == "add":
        if v is not None:
            return

        if len(vertices) >= 100:
            messagebox.showwarning("Ошибка", "Максимум 100 вершин!")
            return

        x, y = event.x, event.y

        for vx, vy in vertices.values():
            if (x-vx)**2 + (y-vy)**2 < (2*R+5)**2:
                messagebox.showinfo("Граф", "Вершины слишком близко!")
                return

        count += 1
        vertices[count] = (x, y)
        redraw()
        update()
        return

    # В остальных режимах нужно нажать на вершину
    if v is None:
        selected = None
        redraw()
        return

    # Режим соединения рёбер
    if mode == "edge":
        if selected is None:
            selected = v
        elif selected == v:
            selected = None
        else:
            edge = tuple(sorted((selected, v)))

            if edge in edges:
                messagebox.showinfo("Граф", "Ребро уже существует!")
            elif len(edges) >= 500:
                messagebox.showwarning("Ошибка", "Максимум 500 рёбер!")
            else:
                edges.append(edge)

            selected = None

        redraw()
        update()
        return

    # Режим удаления рёбер
    if mode == "delete_edge":
        if selected is None:
            selected = v
        elif selected == v:
            selected = None
        else:
            edge = tuple(sorted((selected, v)))

            if edge in edges:
                edges.remove(edge)
            else:
                messagebox.showinfo("Граф", "Между вершинами нет ребра!")

            selected = None

        redraw()
        update()
        return

    # Режим удаления вершин
    if mode == "delete_vertex":
        del vertices[v]
        edges[:] = [e for e in edges if v not in e]
        selected = None
        redraw()
        update()
        return

    # Режим перемещения: запоминаем вершину
    if mode == "move":
        dragging = v
        selected = v
        redraw()

def move_vertex(event):
    if mode != "move" or dragging is None:
        return

    x, y = event.x, event.y

    for v, (vx, vy) in vertices.items():
        if v != dragging and (x-vx)**2 + (y-vy)**2 < (2*R+5)**2:
            return

    vertices[dragging] = (x, y)
    redraw()


def release(event):
    global dragging
    dragging = None
    update()


buttons = tk.Frame(root)
buttons.pack(fill="x", pady=5)

for text, value in [
    ("Добавить вершины", "add"),
    ("Соединить рёбра", "edge"),
    ("Перемещать вершины", "move"),
    ("Удалить ребро", "delete_edge"),
    ("Удалить вершину", "delete_vertex")
]:
    tk.Button(
        buttons,
        text=text,
        command=lambda m=value: set_mode(m)
    ).pack(side="left", padx=3)

canvas.bind("<Button-1>", click)
canvas.bind("<B1-Motion>", move_vertex)
canvas.bind("<ButtonRelease-1>", release)

redraw()
update()
root.mainloop()
