
// Получаем элементы страницы
const canvas = document.getElementById("graphCanvas");
const ctx = canvas.getContext("2d");

const functionInput = document.getElementById("functionInput");
const buildButton = document.getElementById("buildButton");

const x0Slider = document.getElementById("x0");
const deltaSlider = document.getElementById("delta");

const x0Value = document.getElementById("x0Value");
const deltaValue = document.getElementById("deltaValue");

const showDerivative = document.getElementById("showDerivative");

const errorMessage = document.getElementById("errorMessage");

const originalFunction = document.getElementById("originalFunction");
const derivativeFormula = document.getElementById("derivativeFormula");

const fx0Element = document.getElementById("fx0");
const fx1Element = document.getElementById("fx1");
const secantSlopeElement = document.getElementById("secantSlope");
const tangentSlopeElement = document.getElementById("tangentSlope");

// Текущие функции
let f = null;
let df = null;

// Масштаб координатной плоскости
let scale = 40;

// Центр координатной плоскости
let panX = 0;
let panY = 0;

// Перемещение мышью
let isDragging = false;
let lastMouseX = 0;
let lastMouseY = 0;

// Размеры canvas
let canvasWidth = 0;
let canvasHeight = 0;

// Разрешённые математические функции и константы
const allowedNames = new Set([
    "x",
    "sin", "cos", "tan",
    "asin", "acos", "atan",
    "sinh", "cosh", "tanh",
    "log", "log10", "sqrt",
    "abs", "exp",
    "floor", "ceil", "round",
    "sign", "min", "max",
    "pi", "e"
]);

// Проверка и обработка математической функции
function createFunction(expression) {

    expression = expression.trim();

    if (!expression) {
        throw new Error("Введите математическую функцию.");
    }

    // Проверяем допустимые символы
    if (!/^[a-zA-Z0-9_+\-*/^().,\s]+$/.test(expression)) {
        throw new Error("Функция содержит недопустимые символы.");
    }

    // Проверяем названия переменных и функций
    const names = expression.match(/[a-zA-Z_][a-zA-Z_0-9]*/g) || [];

    for (const name of names) {
        if (!allowedNames.has(name)) {
            throw new Error("Неизвестное обозначение: " + name);
        }
    }

    // Проверяем математическое выражение
    const node = math.parse(expression);

    // Аналитически находим производную
    const derivativeNode = math.derivative(node, "x");

    // Компилируем выражения
    const compiledFunction = node.compile();
    const compiledDerivative = derivativeNode.compile();

    // Функция f(x)
    const functionResult = function(x) {
        return compiledFunction.evaluate({ x: x });
    };

    // Функция f'(x)
    const derivativeResult = function(x) {
        return compiledDerivative.evaluate({ x: x });
    };

    // Проверяем вычисление функции
    const testValue = functionResult(0);

    if (typeof testValue !== "number" || !Number.isFinite(testValue)) {
        throw new Error(
            "Функция не имеет конечного значения в точке x = 0. Проверьте область определения."
        );
    }

    return {
        f: functionResult,
        df: derivativeResult,
        derivativeText: derivativeNode.toString()
    };
}

// Форматирование чисел
function formatNumber(number) {

    if (!Number.isFinite(number)) {
        return "не определено";
    }

    return Number(number.toFixed(4)).toString();
}

// Изменение размеров canvas
function resizeCanvas() {

    const rect = canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;

    canvasWidth = rect.width;
    canvasHeight = rect.height;

    canvas.width = Math.round(rect.width * dpr);
    canvas.height = Math.round(rect.height * dpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    drawGraph();
}

// Перевод математических координат в экранные
function toScreenX(x) {
    return canvasWidth / 2 + (x - panX) * scale;
}

function toScreenY(y) {
    return canvasHeight / 2 - (y - panY) * scale;
}

// Перевод экранных координат в математические
function toMathX(x) {
    return (x - canvasWidth / 2) / scale + panX;
}

function toMathY(y) {
    return (canvasHeight / 2 - y) / scale + panY;
}

// Построение координатной сетки
function drawGrid() {

    const centerX = toScreenX(0);
    const centerY = toScreenY(0);

    ctx.lineWidth = 1;
    ctx.font = "12px Arial";
    ctx.textAlign = "center";
    ctx.textBaseline = "top";

    let step = 1;

    if (scale < 20) {
        step = 2;
    }

    if (scale < 10) {
        step = 5;
    }

    if (scale > 100) {
        step = 0.5;
    }

    // Вертикальные линии
    const left = toMathX(0);
    const right = toMathX(canvasWidth);

    const startX = Math.floor(left / step) * step;

    for (let x = startX; x <= right; x += step) {

        const screenX = toScreenX(x);

        ctx.beginPath();
        ctx.strokeStyle = "#e5e5e5";
        ctx.moveTo(screenX, 0);
        ctx.lineTo(screenX, canvasHeight);
        ctx.stroke();

        if (Math.abs(screenX - centerX) > 20) {
            ctx.fillStyle = "#555";

            ctx.fillText(
                formatNumber(x),
                screenX,
                Math.min(canvasHeight - 18, centerY + 8)
            );
        }
    }

    // Горизонтальные линии
    const top = toMathY(0);
    const bottom = toMathY(canvasHeight);

    const startY = Math.floor(bottom / step) * step;

    ctx.textAlign = "left";

    for (let y = startY; y <= top; y += step) {

        const screenY = toScreenY(y);

        ctx.beginPath();
        ctx.strokeStyle = "#e5e5e5";
        ctx.moveTo(0, screenY);
        ctx.lineTo(canvasWidth, screenY);
        ctx.stroke();

        if (Math.abs(screenY - centerY) > 15) {
            ctx.fillStyle = "#555";

            ctx.fillText(
                formatNumber(y),
                Math.min(canvasWidth - 35, centerX + 8),
                screenY - 14
            );
        }
    }

    // Ось X
    ctx.beginPath();
    ctx.strokeStyle = "#333";
    ctx.lineWidth = 2;
    ctx.moveTo(0, centerY);
    ctx.lineTo(canvasWidth, centerY);
    ctx.stroke();

    // Ось Y
    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, canvasHeight);
    ctx.stroke();

    // Подписи осей
    ctx.fillStyle = "#222";
    ctx.font = "bold 14px Arial";

    ctx.textAlign = "right";
    ctx.fillText("X", canvasWidth - 10, centerY - 20);

    ctx.textAlign = "left";
    ctx.fillText("Y", centerX + 10, 15);

    ctx.fillText("0", centerX + 7, centerY + 7);
}

// Построение графика функции
function drawCurve(func, color, width = 2.5) {

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;

    let started = false;
    let previousY = null;

    for (let screenX = 0; screenX <= canvasWidth; screenX += 2) {

        const x = toMathX(screenX);

        let y;

        try {
            y = func(x);
        } catch (error) {
            started = false;
            previousY = null;
            continue;
        }

        if (!Number.isFinite(y) || Math.abs(y) > 1e6) {
            started = false;
            previousY = null;
            continue;
        }

        const screenY = toScreenY(y);

        if (!Number.isFinite(screenY) ||
            screenY < -canvasHeight * 5 ||
            screenY > canvasHeight * 6) {

            started = false;
            previousY = null;
            continue;
        }

        // Не соединяем график через разрывы
        if (previousY !== null &&
            Math.abs(screenY - previousY) > canvasHeight) {
            started = false;
        }

        if (!started) {
            ctx.moveTo(screenX, screenY);
            started = true;
        } else {
            ctx.lineTo(screenX, screenY);
        }

        previousY = screenY;
    }

    ctx.stroke();
}

// Рисование прямой
function drawLine(x1, y1, x2, y2, color, width = 2) {

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = width;

    ctx.moveTo(toScreenX(x1), toScreenY(y1));
    ctx.lineTo(toScreenX(x2), toScreenY(y2));

    ctx.stroke();
}

// Рисование точки
function drawPoint(x, y, color) {

    ctx.beginPath();

    ctx.arc(
        toScreenX(x),
        toScreenY(y),
        5,
        0,
        Math.PI * 2
    );

    ctx.fillStyle = color;
    ctx.fill();

    ctx.strokeStyle = "white";
    ctx.lineWidth = 2;
    ctx.stroke();
}

// Вертикальная пунктирная линия
function drawVerticalLine(x, color) {

    ctx.beginPath();

    ctx.setLineDash([5, 5]);
    ctx.strokeStyle = color;
    ctx.lineWidth = 1;

    ctx.moveTo(toScreenX(x), 0);
    ctx.lineTo(toScreenX(x), canvasHeight);

    ctx.stroke();

    ctx.setLineDash([]);
}

// Построение секущей и касательной
function drawGeometry() {

    const x0 = Number(x0Slider.value);
    const delta = Number(deltaSlider.value);

    const x1 = x0 + delta;

    let y0;
    let y1;
    let derivative;

    try {
        y0 = f(x0);
        y1 = f(x1);
        derivative = df(x0);
    } catch (error) {
        return;
    }

    if (![y0, y1, derivative].every(Number.isFinite)) {
        return;
    }

    // Угловой коэффициент секущей
    const secantSlope = (y1 - y0) / delta;

    const left = toMathX(0);
    const right = toMathX(canvasWidth);

    // Секущая прямая
    const secantY1 = y0 + secantSlope * (left - x0);
    const secantY2 = y0 + secantSlope * (right - x0);

    drawLine(
        left, secantY1,
        right, secantY2,
        "#e69500",
        2
    );

    // Касательная прямая
    const tangentY1 = y0 + derivative * (left - x0);
    const tangentY2 = y0 + derivative * (right - x0);

    drawLine(
        left, tangentY1,
        right, tangentY2,
        "#159447",
        2
    );

    // Вертикальные линии
    drawVerticalLine(x0, "#159447");
    drawVerticalLine(x1, "#e69500");

    // Точки графика
    drawPoint(x0, y0, "#159447");
    drawPoint(x1, y1, "#e69500");

    // Обновляем информацию
    fx0Element.textContent = formatNumber(y0);
    fx1Element.textContent = formatNumber(y1);

    secantSlopeElement.textContent = formatNumber(secantSlope);
    tangentSlopeElement.textContent = formatNumber(derivative);
}

// Основная функция отрисовки
function drawGraph() {

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    // Белый фон
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);

    // Координатная сетка
    drawGrid();

    if (!f || !df) {
        return;
    }

    // Исходная функция
    drawCurve(f, "#1565c0", 2.5);

    // Производная
    if (showDerivative.checked) {
        drawCurve(df, "#e53935", 2);
    }

    // Секущая и касательная
    drawGeometry();
}

// Построение графика по введённой функции
function buildGraph() {

    try {

        const expression = functionInput.value.trim();

        const result = createFunction(expression);

        f = result.f;
        df = result.df;

        originalFunction.textContent =
            "f(x) = " + expression;

        derivativeFormula.textContent =
            "f'(x) = " + result.derivativeText;

        errorMessage.textContent = "";

        // Сброс масштаба
        scale = 40;
        panX = 0;
        panY = 0;

        drawGraph();

    } catch (error) {

        errorMessage.textContent =
            "Ошибка: " + error.message;
    }
}

// Обновление настроек
function updateSettings() {

    x0Value.textContent = x0Slider.value;

    deltaValue.textContent =
        Number(deltaSlider.value).toFixed(2);

    drawGraph();
}

// Кнопка построения графика
buildButton.addEventListener("click", buildGraph);

// Построение при нажатии Enter
functionInput.addEventListener("keydown", function(event) {

    if (event.key === "Enter") {
        buildGraph();
    }

});

// Изменение x0
x0Slider.addEventListener("input", updateSettings);

// Изменение Δx
deltaSlider.addEventListener("input", updateSettings);

// Включение и отключение производной
showDerivative.addEventListener("change", drawGraph);

// Готовые примеры
document.querySelectorAll(".example").forEach(button => {

    button.addEventListener("click", function() {

        functionInput.value = this.dataset.function;

        buildGraph();

    });

});

// Масштабирование колёсиком мыши
canvas.addEventListener("wheel", function(event) {

    event.preventDefault();

    const rect = canvas.getBoundingClientRect();

    const mouseX = event.clientX - rect.left;
    const mouseY = event.clientY - rect.top;

    // Координаты под курсором до масштабирования
    const worldX = toMathX(mouseX);
    const worldY = toMathY(mouseY);

    const zoomFactor = event.deltaY < 0 ? 1.1 : 0.9;

    scale *= zoomFactor;

    // Ограничение масштаба
    scale = Math.max(5, Math.min(scale, 250));

    // Сохраняем точку под курсором
    panX = worldX - (mouseX - canvasWidth / 2) / scale;

    panY = worldY + (mouseY - canvasHeight / 2) / scale;

    drawGraph();

}, { passive: false });

// Начало перемещения графика
canvas.addEventListener("mousedown", function(event) {

    isDragging = true;

    lastMouseX = event.clientX;
    lastMouseY = event.clientY;

});

// Перемещение графика
window.addEventListener("mousemove", function(event) {

    if (!isDragging) {
        return;
    }

    const dx = event.clientX - lastMouseX;
    const dy = event.clientY - lastMouseY;

    panX -= dx / scale;
    panY += dy / scale;

    lastMouseX = event.clientX;
    lastMouseY = event.clientY;

    drawGraph();

});

// Завершение перемещения
window.addEventListener("mouseup", function() {

    isDragging = false;

});

// Перемещение на телефоне
canvas.addEventListener("touchstart", function(event) {

    if (event.touches.length !== 1) {
        return;
    }

    isDragging = true;

    lastMouseX = event.touches[0].clientX;
    lastMouseY = event.touches[0].clientY;

}, { passive: true });

canvas.addEventListener("touchmove", function(event) {

    if (!isDragging || event.touches.length !== 1) {
        return;
    }

    const dx = event.touches[0].clientX - lastMouseX;
    const dy = event.touches[0].clientY - lastMouseY;

    panX -= dx / scale;
    panY += dy / scale;

    lastMouseX = event.touches[0].clientX;
    lastMouseY = event.touches[0].clientY;

    drawGraph();

}, { passive: true });

canvas.addEventListener("touchend", function() {

    isDragging = false;

});

// Изменение размеров окна
window.addEventListener("resize", resizeCanvas);

// Запуск приложения
resizeCanvas();
buildGraph();
updateSettings();
