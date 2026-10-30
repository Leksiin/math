
// 1. Таблица производных
const derivativesTable = [
    { f: "c (константа)", df: "0" },
    { f: "x", df: "1" },
    { f: "x^n", df: "n * x^(n-1)" },
    { f: "√x", df: "1 / (2√x)" },
    { f: "1/x", df: "-1 / x^2" },
    { f: "e^x", df: "e^x" },
    { f: "a^x", df: "a^x * ln(a)" },
    { f: "ln(x)", df: "1 / x" },
    { f: "sin(x)", df: "cos(x)" },
    { f: "cos(x)", df: "-sin(x)" },
    { f: "tg(x)", df: "1 / cos^2(x)" },
    { f: "ctg(x)", df: "-1 / sin^2(x)" }
];

// Вывод таблицы на страницу
function displayDerivativesTable() {
    let html = `
        <table>
            <tr>
                <th>Функция</th>
                <th>Производная</th>
            </tr>
    `;

    derivativesTable.forEach(item => {
        html += `
            <tr>
                <td>${item.f}</td>
                <td>${item.df}</td>
            </tr>
        `;
    });

    html += "</table>";

    document.getElementById("derivativesTable").innerHTML = html;
}


// 2. Функция для вычисления производной
function derivative(f) {
    f = f.trim().replace(/\s+/g, "");

    // Таблица основных производных
    const rules = {
        "0": "0",
        "1": "0",
        "x": "1",
        "e^x": "e^x",
        "sin(x)": "cos(x)",
        "cos(x)": "-sin(x)",
        "tg(x)": "1/cos^2(x)",
        "ctg(x)": "-1/sin^2(x)",
        "ln(x)": "1/x",
        "1/x": "-1/x^2",
        "sqrt(x)": "1/(2*sqrt(x))"
    };

    if (rules[f] !== undefined) {
        return rules[f];
    }

    // Производная числа
    if (/^-?\d+(\.\d+)?$/.test(f)) {
        return "0";
    }

    // Производная x^n
    let powerMatch = f.match(/^x\^(-?\d+(\.\d+)?)$/);

    if (powerMatch) {
        let n = Number(powerMatch[1]);

        if (n === 0) return "0";
        if (n === 1) return "1";

        return `${n}*x^${n - 1}`;
    }

    // Производная k*x
    let linearMatch = f.match(/^(-?\d+(\.\d+)?)\*?x$/);

    if (linearMatch) {
        return linearMatch[1];
    }

    // Производная k*x^n
    let coefficientMatch = f.match(
        /^(-?\d+(\.\d+)?)\*x\^(-?\d+(\.\d+)?)$/
    );

    if (coefficientMatch) {
        let k = Number(coefficientMatch[1]);
        let n = Number(coefficientMatch[3]);

        if (n === 0) return "0";
        if (n === 1) return String(k);

        return `${k * n}*x^${n - 1}`;
    }

    return "Неизвестная функция";
}


// 3. Производная суммы
function calculateSumDerivative() {
    let input = document.getElementById("sumInput").value;

    // Разделяем функции по запятой
    let functions = input.split(",");

    let derivatives = functions.map(f => derivative(f));

    let result = derivatives.join(" + ");

    // Убираем лишнее + 0
    result = result.replace(/\s\+\s0/g, "");

    if (result === "") {
        result = "0";
    }

    document.getElementById("sumResult").innerHTML =
        "Исходная сумма: " + input +
        "\nПроизводная: " + result;
}


// 4. Производная произведения
function calculateProductDerivative() {
    let f1 = document.getElementById("prodF1").value.trim();
    let f2 = document.getElementById("prodF2").value.trim();

    let df1 = derivative(f1);
    let df2 = derivative(f2);

    // Формула (f1*f2)' = f1'*f2 + f2'*f1
    let result = `(${df1})*(${f2}) + (${df2})*(${f1})`;

    document.getElementById("prodResult").innerHTML =
        "Исходное произведение: " + f1 + " * " + f2 +
        "\nПроизводная: " + result;
}


// Запуск отображения таблицы
displayDerivativesTable();
