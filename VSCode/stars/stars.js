const SIZE = 8;

let board;
let firstStar = null;

// true после успешного решения
let solved = false;

// Создание начального поля
function createBoard() {

    board = Array.from(
        { length: SIZE },
        () => Array(SIZE).fill("")
    );

    for (let row = 0; row < SIZE; row++) {
        for (let col = 0; col < SIZE; col++) {

            if (
                row === col ||
                row + col === SIZE - 1
            ) {
                board[row][col] = "#";
            }
        }
    }

    firstStar = null;
    solved = false;
}

// Отрисовка поля
function drawBoard() {

    const boardElement = document.getElementById("board");

    boardElement.innerHTML = "";

    for (let row = 0; row < SIZE; row++) {

        for (let col = 0; col < SIZE; col++) {

            const cell = document.createElement("div");

            cell.classList.add("cell");

            if (board[row][col] === "#") {

                cell.textContent = "#";
                cell.classList.add("blocked");
            }

            else if (board[row][col] === "*") {

                cell.textContent = "*";
                cell.classList.add("star");
            }

            else {
                if (!solved) {
                    cell.onclick = () => selectStar(row, col);
                }
            }

            boardElement.appendChild(cell);
        }
    }
}

// Выбор начальной звёздочки
function selectStar(row, col) {

    if (solved) {
        return;
    }

    if (firstStar !== null) {
        board[firstStar.row][firstStar.col] = "";
    }

    board[row][col] = "*";

    firstStar = {
        row: row,
        col: col
    };

    document.getElementById("message").textContent =
        "Начальная звезда установлена. Нажмите «Решить».";

    drawBoard();
}

// Проверка возможности поставить звёздочку
function canPlace(row, col, stars) {

    if (board[row][col] === "#") {
        return false;
    }

    for (const star of stars) {

        if (star.row === row) {
            return false;
        }

        if (star.col === col) {
            return false;
        }

        if (
            Math.abs(star.row - row) ===
            Math.abs(star.col - col)
        ) {
            return false;
        }
    }

    return true;
}

// Поиск решения
function backtracking(row, stars) {

    if (stars.length === 8) {
        return true;
    }

    if (row >= SIZE) {
        return false;
    }

    const existingStar = stars.find(
        star => star.row === row
    );

    if (existingStar) {
        return backtracking(row + 1, stars);
    }

    for (let col = 0; col < SIZE; col++) {

        if (canPlace(row, col, stars)) {

            board[row][col] = "*";

            stars.push({
                row: row,
                col: col
            });

            if (backtracking(row + 1, stars)) {
                return true;
            }

            stars.pop();
            board[row][col] = "";
        }
    }

    return false;
}

// Решение задачи
function solve() {

    if (firstStar === null) {

        document.getElementById("message").textContent =
            "Сначала поставьте первую звезду.";

        return;
    }

    const stars = [
        {
            row: firstStar.row,
            col: firstStar.col
        }
    ];

    for (let row = 0; row < SIZE; row++) {

        for (let col = 0; col < SIZE; col++) {

            if (
                board[row][col] === "*" &&
                !(
                    row === firstStar.row &&
                    col === firstStar.col
                )
            ) {
                board[row][col] = "";
            }
        }
    }

    const success = backtracking(0, stars);

    if (success) {

        solved = true;

        document.getElementById("message").textContent =
            "Решение найдено!";

        const button = document.getElementById("actionButton");

        button.textContent = "Сбросить";
        button.onclick = resetBoard;

    } else {

        document.getElementById("message").textContent =
            "Для этой позиции решения нет.";
    }

    drawBoard();
}

// Сброс после решения
function resetBoard() {

    createBoard();

    const button = document.getElementById("actionButton");

    button.textContent = "Решить";
    button.onclick = solve;

    document.getElementById("message").textContent =
        "Выберите начальную клетку.";

    drawBoard();
}

const actionButton =
    document.getElementById("actionButton");

actionButton.onclick = solve;

// Создать поле
createBoard();
drawBoard();