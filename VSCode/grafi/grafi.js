
"use strict";

// Graph Lab: interactive graph editor and visualizer.
// No external dependencies are required.

const SVG_NS = "http://www.w3.org/2000/svg";
const MAX_VERTICES = 50;
const VERTEX_RADIUS = 19;

const canvas = document.getElementById("canvas");
const graphTypeSelect = document.getElementById("graphType");
const allowLoopsCheckbox = document.getElementById("allowLoops");
const allowMultipleCheckbox = document.getElementById("allowMultiple");

const countsElement = document.getElementById("counts");
const lemmaElement = document.getElementById("lemma");
const degreesElement = document.getElementById("degrees");
const adjacencyElement = document.getElementById("adjacency");
const incidenceElement = document.getElementById("incidence");
const statusElement = document.getElementById("status");

const modeButtons = [...document.querySelectorAll("[data-mode]")];

let vertices = [];
let edges = [];
let mode = "vertex";
let selectedVertexId = null;
let selectedEdgeId = null;
let edgeStartId = null;
let highlightedEdgeIds = new Set();
let undoStack = [];
let nextVertexId = 1;
let nextEdgeId = 1;

let dragState = null;
let suppressClick = false;

// ---------- Graph model helpers ----------

function isDirected() {
    return graphTypeSelect.value === "directed";
}

function findVertex(id) {
    return vertices.find(vertex => vertex.id === id);
}

function findEdge(id) {
    return edges.find(edge => edge.id === id);
}

function getDegrees() {
    const result = new Map();

    for (const vertex of vertices) {
        result.set(vertex.id, {
            degree: 0,
            inDegree: 0,
            outDegree: 0
        });
    }

    for (const edge of edges) {
        const from = result.get(edge.from);
        const to = result.get(edge.to);

        if (!from || !to) continue;

        if (isDirected()) {
            from.outDegree++;
            to.inDegree++;
        } else if (edge.from === edge.to) {
            // A loop contributes two to the undirected degree.
            from.degree += 2;
        } else {
            from.degree++;
            to.degree++;
        }
    }

    return result;
}

function getAdjacencyMatrix() {
    const n = vertices.length;
    const matrix = Array.from(
        { length: n },
        () => Array(n).fill(0)
    );
    const index = new Map(
        vertices.map((vertex, i) => [vertex.id, i])
    );

    for (const edge of edges) {
        const i = index.get(edge.from);
        const j = index.get(edge.to);

        if (i === undefined || j === undefined) continue;

        if (isDirected()) {
            matrix[i][j]++;
        } else if (i === j) {
            // Count a loop twice so row sums match degrees.
            matrix[i][i] += 2;
        } else {
            matrix[i][j]++;
            matrix[j][i]++;
        }
    }

    return matrix;
}

function getIncidenceMatrix() {
    const matrix = Array.from(
        { length: vertices.length },
        () => Array(edges.length).fill(0)
    );
    const index = new Map(
        vertices.map((vertex, i) => [vertex.id, i])
    );

    edges.forEach((edge, j) => {
        const from = index.get(edge.from);
        const to = index.get(edge.to);

        if (from === undefined || to === undefined) return;

        if (isDirected()) {
            // A directed loop has both +1 and -1 at the same vertex,
            // so its net incidence value is zero.
            if (from !== to) {
                matrix[from][j] = 1;
                matrix[to][j] = -1;
            }
        } else {
            // The requested undirected incidence matrix uses 0/1.
            matrix[from][j] = 1;
            matrix[to][j] = 1;
        }
    });

    return matrix;
}

function hasDuplicateEdge(from, to) {
    return edges.some(edge => {
        if (isDirected()) {
            return edge.from === from && edge.to === to;
        }

        return (
            (edge.from === from && edge.to === to) ||
            (edge.from === to && edge.to === from)
        );
    });
}

// ---------- Undo and state management ----------

function saveSnapshot() {
    undoStack.push(JSON.stringify({
        vertices,
        edges,
        graphType: graphTypeSelect.value,
        allowLoops: allowLoopsCheckbox.checked,
        allowMultiple: allowMultipleCheckbox.checked,
        nextVertexId,
        nextEdgeId
    }));

    // Keep the history bounded.
    if (undoStack.length > 100) {
        undoStack.shift();
    }
}

function undo() {
    if (undoStack.length === 0) {
        setStatus("Нет действий для отмены.");
        return;
    }

    const snapshot = JSON.parse(undoStack.pop());

    vertices = snapshot.vertices;
    edges = snapshot.edges;
    graphTypeSelect.value = snapshot.graphType;
    allowLoopsCheckbox.checked = snapshot.allowLoops;
    allowMultipleCheckbox.checked = snapshot.allowMultiple;
    nextVertexId = snapshot.nextVertexId;
    nextEdgeId = snapshot.nextEdgeId;

    selectedVertexId = null;
    selectedEdgeId = null;
    edgeStartId = null;
    highlightedEdgeIds.clear();

    renderAll();
    setStatus("Последнее действие отменено.");
}

function clearGraph() {
    if (vertices.length === 0 && edges.length === 0) {
        setStatus("Граф уже пуст.");
        return;
    }

    saveSnapshot();

    vertices = [];
    edges = [];
    nextVertexId = 1;
    nextEdgeId = 1;

    selectedVertexId = null;
    selectedEdgeId = null;
    edgeStartId = null;
    highlightedEdgeIds.clear();

    renderAll();
    setStatus("Граф очищен.");
}

// ---------- Graph editing ----------

function addVertex(x, y) {
    if (vertices.length >= MAX_VERTICES) {
        setStatus("Достигнут лимит: не более 50 вершин.");
        return;
    }

    saveSnapshot();

    const padding = VERTEX_RADIUS + 3;
    const width = 700;
    const height = 500;

    x = Math.max(padding, Math.min(width - padding, x));
    y = Math.max(padding, Math.min(height - padding, y));

    vertices.push({
        id: nextVertexId++,
        x,
        y
    });

    selectedVertexId = vertices[vertices.length - 1].id;
    selectedEdgeId = null;
    edgeStartId = null;

    renderAll();
    setStatus(`Добавлена вершина ${selectedVertexId}.`);
}

function addEdge(from, to) {
    if (!findVertex(from) || !findVertex(to)) return;

    if (from === to && !allowLoopsCheckbox.checked) {
        setStatus("Петли запрещены. Включите опцию «Петли».");
        return;
    }

    if (
        !allowMultipleCheckbox.checked &&
        hasDuplicateEdge(from, to)
    ) {
        setStatus("Такое ребро уже существует.");
        return;
    }

    saveSnapshot();

    const edge = {
        id: nextEdgeId++,
        from,
        to
    };

    edges.push(edge);

    selectedEdgeId = edge.id;
    selectedVertexId = null;
    edgeStartId = null;
    highlightedEdgeIds = new Set([edge.id]);

    renderAll();

    const arrow = isDirected() ? "дуга" : "ребро";
    setStatus(`Добавлено ${arrow} e${edge.id}.`);
}

function deleteVertex(id) {
    const vertex = findVertex(id);
    if (!vertex) return;

    saveSnapshot();

    vertices = vertices.filter(item => item.id !== id);
    edges = edges.filter(
        edge => edge.from !== id && edge.to !== id
    );

    selectedVertexId = null;
    selectedEdgeId = null;
    edgeStartId = null;
    highlightedEdgeIds.clear();

    renderAll();
    setStatus(`Вершина ${id} и инцидентные рёбра удалены.`);
}

function deleteEdge(id) {
    const edge = findEdge(id);
    if (!edge) return;

    saveSnapshot();

    edges = edges.filter(item => item.id !== id);

    selectedEdgeId = null;
    highlightedEdgeIds.clear();

    renderAll();
    setStatus(`Ребро e${id} удалено.`);
}

function deleteSelection() {
    if (selectedVertexId !== null) {
        deleteVertex(selectedVertexId);
    } else if (selectedEdgeId !== null) {
        deleteEdge(selectedEdgeId);
    } else {
        setStatus("Сначала выберите вершину или ребро.");
    }
}

function arrangeCircularly() {
    if (vertices.length === 0) {
        setStatus("Нет вершин для расположения.");
        return;
    }

    saveSnapshot();

    const centerX = 350;
    const centerY = 250;
    const radius = Math.min(
        180,
        Math.max(65, 30 * vertices.length)
    );

    vertices.forEach((vertex, i) => {
        const angle =
            -Math.PI / 2 + (2 * Math.PI * i) / vertices.length;

        vertex.x = centerX + radius * Math.cos(angle);
        vertex.y = centerY + radius * Math.sin(angle);
    });

    selectedVertexId = null;
    selectedEdgeId = null;
    highlightedEdgeIds.clear();

    renderAll();
    setStatus("Вершины расположены по окружности.");
}

// ---------- SVG helpers ----------

function svgElement(tag, attributes = {}) {
    const element = document.createElementNS(SVG_NS, tag);

    for (const [key, value] of Object.entries(attributes)) {
        element.setAttribute(key, String(value));
    }

    return element;
}

function graphCoordinates(event) {
    const rect = canvas.getBoundingClientRect();

    return {
        x: (event.clientX - rect.left) * 700 / rect.width,
        y: (event.clientY - rect.top) * 500 / rect.height
    };
}

function createSvgText(x, y, text, className) {
    const element = svgElement("text", {
        x,
        y,
        class: className
    });

    element.textContent = text;
    return element;
}

function edgeGeometry(edge, parallelIndex, parallelCount) {
    const from = findVertex(edge.from);
    const to = findVertex(edge.to);

    if (!from || !to) return null;

    if (edge.from === edge.to) {
        const radius = 23 + parallelIndex * 13;

        return {
            type: "loop",
            d: [
                `M ${from.x - 10} ${from.y - 14}`,
                `C ${from.x - radius - 12} ${from.y - radius * 2}`,
                `${from.x + radius + 12} ${from.y - radius * 2}`,
                `${from.x + 10} ${from.y - 14}`
            ].join(" "),
            labelX: from.x,
            labelY: from.y - radius * 1.55 - 7
        };
    }

    const dx = to.x - from.x;
    const dy = to.y - from.y;
    const length = Math.hypot(dx, dy) || 1;

    const ux = dx / length;
    const uy = dy / length;
    const px = -uy;
    const py = ux;

    const offset = (parallelIndex - (parallelCount - 1) / 2) * 24;

    const startX = from.x + ux * VERTEX_RADIUS;
    const startY = from.y + uy * VERTEX_RADIUS;
    const endX = to.x - ux * VERTEX_RADIUS;
    const endY = to.y - uy * VERTEX_RADIUS;

    if (Math.abs(offset) < 0.1) {
        return {
            type: "line",
            x1: startX,
            y1: startY,
            x2: endX,
            y2: endY,
            labelX: (startX + endX) / 2,
            labelY: (startY + endY) / 2 - 7
        };
    }

    const cx = (from.x + to.x) / 2 + px * offset;
    const cy = (from.y + to.y) / 2 + py * offset;

    const t1 = 0.18;
    const t2 = 0.82;

    return {
        type: "curve",
        d: `M ${startX + px * offset * t1} ${startY + py * offset * t1}
            Q ${cx} ${cy}
            ${endX + px * offset * t2} ${endY + py * offset * t2}`,
        labelX: (from.x + to.x) / 2 + px * offset * 0.65,
        labelY: (from.y + to.y) / 2 + py * offset * 0.65 - 7
    };
}

function getParallelGroup(edge) {
    return edges.filter(item => {
        if (item.from === edge.from && item.to === edge.to) {
            return true;
        }

        return (
            !isDirected() &&
            item.from === edge.to &&
            item.to === edge.from
        );
    });
}

// ---------- Rendering ----------

function renderGraph() {
    // Preserve the arrow marker defined in the original HTML.
    [...canvas.children].forEach(child => {
        if (child.tagName.toLowerCase() !== "defs") {
            child.remove();
        }
    });

    for (const edge of edges) {
        const group = getParallelGroup(edge);
        const parallelIndex = group.findIndex(
            item => item.id === edge.id
        );
        const geometry = edgeGeometry(
            edge,
            parallelIndex,
            group.length
        );

        if (!geometry) continue;

        const highlighted =
            edge.id === selectedEdgeId ||
            highlightedEdgeIds.has(edge.id);

        const edgeClass = highlighted ? "edge selected" : "edge";

        let shape;

        if (geometry.type === "line") {
            shape = svgElement("line", {
                x1: geometry.x1,
                y1: geometry.y1,
                x2: geometry.x2,
                y2: geometry.y2,
                class: edgeClass
            });
        } else {
            shape = svgElement("path", {
                d: geometry.type === "loop"
                    ? geometry.d
                    : geometry.d,
                fill: "none",
                class: edgeClass
            });
        }

        shape.setAttribute("data-edge-id", edge.id);

        if (isDirected()) {
            shape.setAttribute("marker-end", "url(#arrow)");
        }

        shape.addEventListener("click", event => {
            event.stopPropagation();

            if (suppressClick) return;

            if (mode === "delete") {
                deleteEdge(edge.id);
                return;
            }

            selectedEdgeId = edge.id;
            selectedVertexId = null;
            highlightedEdgeIds = new Set([edge.id]);
            renderAll();
            setStatus(`Выбрано ребро e${edge.id}.`);
        });

        canvas.appendChild(shape);

        const label = createSvgText(
            geometry.labelX,
            geometry.labelY,
            `e${edge.id}`,
            "edge-label"
        );

        canvas.appendChild(label);
    }

    for (const vertex of vertices) {
        const group = svgElement("g", {
            "data-vertex-id": vertex.id
        });

        const circle = svgElement("circle", {
            cx: vertex.x,
            cy: vertex.y,
            r: VERTEX_RADIUS,
            class: (
                vertex.id === selectedVertexId ||
                vertex.id === edgeStartId
            ) ? "vertex selected" : "vertex"
        });

        group.appendChild(circle);

        group.appendChild(createSvgText(
            vertex.x,
            vertex.y,
            vertex.id,
            "vertex-label"
        ));

        group.addEventListener("click", event => {
            event.stopPropagation();

            if (suppressClick) return;

            if (mode === "delete") {
                deleteVertex(vertex.id);
            } else if (mode === "edge") {
                handleEdgeVertexClick(vertex.id);
            } else {
                selectedVertexId = vertex.id;
                selectedEdgeId = null;
                renderAll();
                setStatus(`Выбрана вершина ${vertex.id}.`);
            }
        });

        group.addEventListener("pointerdown", event => {
            if (mode !== "move" || event.button !== 0) return;

            event.preventDefault();
            event.stopPropagation();

            selectedVertexId = vertex.id;
            selectedEdgeId = null;

            dragState = {
                id: vertex.id,
                startX: vertex.x,
                startY: vertex.y,
                pointerX: event.clientX,
                pointerY: event.clientY,
                moved: false
            };

            group.setPointerCapture?.(event.pointerId);
        });

        canvas.appendChild(group);
    }
}

function handleEdgeVertexClick(id) {
    if (edgeStartId === null) {
        edgeStartId = id;
        selectedVertexId = id;
        selectedEdgeId = null;

        renderAll();
        setStatus(`Начало выбрано: вершина ${id}. Выберите конец.`);
        return;
    }

    const from = edgeStartId;
    const to = id;

    // Allow the user to change the starting vertex.
    if (from === to && !allowLoopsCheckbox.checked) {
        setStatus("Выберите другую вершину: петли отключены.");
        return;
    }

    addEdge(from, to);
}

// ---------- Statistics and matrices ----------

function renderStatistics() {
    countsElement.textContent =
        `Вершин: ${vertices.length} | Рёбер: ${edges.length}`;

    const degrees = getDegrees();

    if (isDirected()) {
        degreesElement.innerHTML = "<strong>Степени вершин</strong>";

        for (const vertex of vertices) {
            const degree = degrees.get(vertex.id);
            const row = document.createElement("div");

            row.textContent =
                `v${vertex.id}: deg+ = ${degree.outDegree}, ` +
                `deg− = ${degree.inDegree}, ` +
                `deg = ${degree.outDegree + degree.inDegree}`;

            degreesElement.appendChild(row);
        }

        const sumOut = [...degrees.values()].reduce(
            (sum, item) => sum + item.outDegree, 0
        );

        const sumIn = [...degrees.values()].reduce(
            (sum, item) => sum + item.inDegree, 0
        );

        const valid =
            sumOut === edges.length &&
            sumIn === edges.length;

        lemmaElement.className = valid ? "valid" : "invalid";
        lemmaElement.textContent =
            `Σ deg+(v) = ${sumOut}; Σ deg−(v) = ${sumIn}; ` +
            `|A| = ${edges.length}. ` +
            (valid ? "Лемма выполняется." : "Ошибка проверки!");
    } else {
        degreesElement.innerHTML = "<strong>Степени вершин</strong>";

        let sum = 0;
        let oddCount = 0;

        for (const vertex of vertices) {
            const degree = degrees.get(vertex.id).degree;
            sum += degree;

            if (degree % 2 !== 0) oddCount++;

            const row = document.createElement("div");
            row.textContent = `v${vertex.id}: deg = ${degree}`;
            degreesElement.appendChild(row);
        }

        const twiceEdges = 2 * edges.length;
        const valid = sum === twiceEdges;

        lemmaElement.className = valid ? "valid" : "invalid";
        lemmaElement.textContent =
            `Σ deg(v) = ${sum}; 2|E| = ${twiceEdges}. ` +
            (valid ? "Лемма выполняется." : "Ошибка проверки!") +
            ` Нечётных вершин: ${oddCount} ` +
            (oddCount % 2 === 0
                ? "(чётно)."
                : "(нечётно — ошибка!).");
    }
}

function makeTable(headers, rows, options = {}) {
    const table = document.createElement("table");
    const thead = document.createElement("thead");
    const headerRow = document.createElement("tr");

    for (const header of headers) {
        const th = document.createElement("th");
        th.textContent = header;
        headerRow.appendChild(th);
    }

    thead.appendChild(headerRow);
    table.appendChild(thead);

    const tbody = document.createElement("tbody");

    rows.forEach((row, rowIndex) => {
        const tr = document.createElement("tr");

        row.forEach((value, colIndex) => {
            const td = document.createElement("td");
            td.textContent = String(value);

            if (options.cellClick) {
                td.addEventListener("click", () => {
                    options.cellClick(rowIndex, colIndex);
                });
            }

            tr.appendChild(td);
        });

        tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    return table;
}

function renderAdjacencyMatrix() {
    adjacencyElement.replaceChildren();

    if (vertices.length === 0) {
        adjacencyElement.textContent = "Граф пуст.";
        return;
    }

    const matrix = getAdjacencyMatrix();
    const headers = ["v"];

    for (const vertex of vertices) {
        headers.push(`v${vertex.id}`);
    }

    const rows = matrix.map((row, i) => [
        `v${vertices[i].id}`,
        ...row
    ]);

    const table = makeTable(headers, rows, {
        cellClick(rowIndex, colIndex) {
            // Column zero contains row labels.
            if (colIndex === 0) return;

            const from = vertices[rowIndex];
            const to = vertices[colIndex - 1];

            if (!from || !to) return;

            const matching = edges.filter(edge => {
                if (isDirected()) {
                    return edge.from === from.id && edge.to === to.id;
                }

                return (
                    (edge.from === from.id && edge.to === to.id) ||
                    (edge.from === to.id && edge.to === from.id)
                );
            });

            if (matching.length === 0) {
                highlightedEdgeIds.clear();
                selectedEdgeId = null;
                setStatus("Между этими вершинами нет ребра.");
            } else {
                highlightedEdgeIds = new Set(
                    matching.map(edge => edge.id)
                );
                selectedEdgeId = matching[0].id;
                setStatus(
                    `Подсвечено рёбер: ${matching.length}.`
                );
            }

            renderGraph();
        }
    });

    // The first data column is the row label, not a matrix entry.
    adjacencyElement.appendChild(table);
}

function renderIncidenceMatrix() {
    incidenceElement.replaceChildren();

    if (vertices.length === 0) {
        incidenceElement.textContent = "Граф пуст.";
        return;
    }

    const matrix = getIncidenceMatrix();
    const headers = ["v"];

    for (const edge of edges) {
        headers.push(`e${edge.id}`);
    }

    const rows = matrix.map((row, i) => [
        `v${vertices[i].id}`,
        ...row
    ]);

    const table = makeTable(headers, rows, {
        cellClick(rowIndex, colIndex) {
            if (colIndex === 0) return;

            const edge = edges[colIndex - 1];
            if (!edge) return;

            selectedEdgeId = edge.id;
            selectedVertexId = null;
            highlightedEdgeIds = new Set([edge.id]);

            renderGraph();
            setStatus(`Подсвечено ребро e${edge.id}.`);
        }
    });

    incidenceElement.appendChild(table);
}

function renderAll() {
    renderGraph();
    renderStatistics();
    renderAdjacencyMatrix();
    renderIncidenceMatrix();
}

// ---------- Modes and controls ----------

function setMode(newMode) {
    mode = newMode;
    edgeStartId = null;

    modeButtons.forEach(button => {
        const active = button.dataset.mode === mode;
        button.classList.toggle("active", active);
        button.setAttribute("aria-pressed", String(active));
    });

    const names = {
        vertex: "Вершина",
        edge: "Ребро",
        delete: "Удалить",
        move: "Переместить"
    };

    setStatus(`Режим: ${names[mode] || mode}`);
    renderGraph();
}

function setStatus(message) {
    statusElement.textContent = message;
}

modeButtons.forEach(button => {
    button.addEventListener("click", () => {
        setMode(button.dataset.mode);
    });
});

canvas.addEventListener("click", event => {
    if (suppressClick) {
        suppressClick = false;
        return;
    }

    if (event.target !== canvas) return;

    if (mode === "vertex") {
        const point = graphCoordinates(event);
        addVertex(point.x, point.y);
    } else if (mode === "edge") {
        edgeStartId = null;
        renderGraph();
        setStatus("Выберите первую вершину для ребра.");
    } else {
        selectedVertexId = null;
        selectedEdgeId = null;
        highlightedEdgeIds.clear();
        renderAll();
    }
});

canvas.addEventListener("pointermove", event => {
    if (!dragState) return;

    const vertex = findVertex(dragState.id);
    if (!vertex) return;

    const rect = canvas.getBoundingClientRect();
    const dx = (event.clientX - dragState.pointerX) * 700 / rect.width;
    const dy = (event.clientY - dragState.pointerY) * 500 / rect.height;

    if (!dragState.moved && Math.hypot(dx, dy) < 2) return;

    if (!dragState.moved) {
        saveSnapshot();
        dragState.moved = true;
    }

    vertex.x = Math.max(
        VERTEX_RADIUS,
        Math.min(700 - VERTEX_RADIUS, dragState.startX + dx)
    );

    vertex.y = Math.max(
        VERTEX_RADIUS,
        Math.min(500 - VERTEX_RADIUS, dragState.startY + dy)
    );

    renderAll();
});

canvas.addEventListener("pointerup", () => {
    if (dragState?.moved) {
        suppressClick = true;
        setStatus("Вершина перемещена.");
    }

    dragState = null;
});

canvas.addEventListener("pointercancel", () => {
    dragState = null;
});

document.getElementById("undo").addEventListener("click", undo);
document.getElementById("clear").addEventListener("click", clearGraph);

graphTypeSelect.addEventListener("change", () => {
    saveSnapshot();

    selectedVertexId = null;
    selectedEdgeId = null;
    edgeStartId = null;
    highlightedEdgeIds.clear();

    renderAll();

    setStatus(
        isDirected()
            ? "Включён ориентированный граф."
            : "Включён неориентированный граф."
    );
});

allowLoopsCheckbox.addEventListener("change", () => {
    saveSnapshot();
    renderAll();
    setStatus(
        allowLoopsCheckbox.checked
            ? "Петли разрешены."
            : "Создание петель запрещено."
    );
});

allowMultipleCheckbox.addEventListener("change", () => {
    saveSnapshot();
    renderAll();
    setStatus(
        allowMultipleCheckbox.checked
            ? "Кратные рёбра разрешены."
            : "Создание кратных рёбер запрещено."
    );
});

document.addEventListener("keydown", event => {
    const target = event.target;
    const isTyping =
        target instanceof HTMLInputElement ||
        target instanceof HTMLTextAreaElement ||
        target instanceof HTMLSelectElement;

    if (isTyping) return;

    if (
        (event.ctrlKey || event.metaKey) &&
        event.key.toLowerCase() === "z"
    ) {
        event.preventDefault();
        undo();
        return;
    }

    if (event.key === "Delete" || event.key === "Backspace") {
        event.preventDefault();
        deleteSelection();
    }

    if (event.key === "Escape") {
        edgeStartId = null;
        selectedVertexId = null;
        selectedEdgeId = null;
        highlightedEdgeIds.clear();
        renderAll();
        setStatus("Выбор сброшен.");
    }
});

// ---------- JSON export and import ----------

function downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");

    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();

    setTimeout(() => URL.revokeObjectURL(url), 1000);
}

document.getElementById("saveJson").addEventListener("click", () => {
    const data = {
        version: 1,
        graphType: graphTypeSelect.value,
        allowLoops: allowLoopsCheckbox.checked,
        allowMultiple: allowMultipleCheckbox.checked,
        vertices,
        edges,
        nextVertexId,
        nextEdgeId
    };

    downloadFile(
        "graph-lab.json",
        JSON.stringify(data, null, 2),
        "application/json;charset=utf-8"
    );

    setStatus("Граф сохранён в JSON.");
});

const fileInput = document.getElementById("fileInput");

document.getElementById("loadJson").addEventListener("click", () => {
    fileInput.click();
});

fileInput.addEventListener("change", async () => {
    const file = fileInput.files?.[0];
    if (!file) return;

    try {
        const data = JSON.parse(await file.text());

        if (
            !data ||
            !Array.isArray(data.vertices) ||
            !Array.isArray(data.edges) ||
            data.vertices.length > MAX_VERTICES
        ) {
            throw new Error("Некорректная структура файла.");
        }

        const ids = new Set();

        for (const vertex of data.vertices) {
            if (
                !Number.isInteger(vertex.id) ||
                !Number.isFinite(vertex.x) ||
                !Number.isFinite(vertex.y) ||
                ids.has(vertex.id)
            ) {
                throw new Error("Некорректные данные вершин.");
            }

            ids.add(vertex.id);
        }

        const vertexIds = new Set(
            data.vertices.map(vertex => vertex.id)
        );
        const edgeIds = new Set();

        for (const edge of data.edges) {
            if (
                !Number.isInteger(edge.id) ||
                edgeIds.has(edge.id) ||
                !vertexIds.has(edge.from) ||
                !vertexIds.has(edge.to)
            ) {
                throw new Error("Некорректные данные рёбер.");
            }

            edgeIds.add(edge.id);
        }

        if (
            data.graphType !== "directed" &&
            data.graphType !== "undirected"
        ) {
            throw new Error("Неизвестный тип графа.");
        }

        // Preserve the current graph so import can be undone.
        saveSnapshot();

        vertices = data.vertices.map(vertex => ({
            id: vertex.id,
            x: Math.max(
                VERTEX_RADIUS,
                Math.min(700 - VERTEX_RADIUS, vertex.x)
            ),
            y: Math.max(
                VERTEX_RADIUS,
                Math.min(500 - VERTEX_RADIUS, vertex.y)
            )
        }));

        edges = data.edges.map(edge => ({
            id: edge.id,
            from: edge.from,
            to: edge.to
        }));

        graphTypeSelect.value = data.graphType;
        allowLoopsCheckbox.checked = Boolean(data.allowLoops);
        allowMultipleCheckbox.checked = Boolean(data.allowMultiple);

        nextVertexId = Math.max(
            Number(data.nextVertexId) || 1,
            ...vertices.map(vertex => vertex.id + 1),
            1
        );

        nextEdgeId = Math.max(
            Number(data.nextEdgeId) || 1,
            ...edges.map(edge => edge.id + 1),
            1
        );

        selectedVertexId = null;
        selectedEdgeId = null;
        edgeStartId = null;
        highlightedEdgeIds.clear();

        renderAll();
        setStatus("Граф загружен из JSON.");
    } catch (error) {
        alert(`Не удалось загрузить граф: ${error.message}`);
        setStatus("Ошибка загрузки JSON.");
    } finally {
        fileInput.value = "";
    }
});

// ---------- CSV export ----------

function matrixToCSV(matrix) {
    return matrix
        .map(row => row.map(value => {
            const text = String(value);
            return /[",\r\n;]/.test(text)
                ? `"${text.replace(/"/g, '""')}"`
                : text;
        }).join(";"))
        .join("\r\n");
}

async function copyText(text) {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(text);
        } else {
            const textarea = document.createElement("textarea");

            textarea.value = text;
            textarea.style.position = "fixed";
            textarea.style.opacity = "0";

            document.body.appendChild(textarea);
            textarea.select();

            const copied = document.execCommand("copy");
            textarea.remove();

            if (!copied) {
                throw new Error("Буфер обмена недоступен.");
            }
        }

        setStatus("Матрица скопирована в буфер обмена.");
    } catch (error) {
        // Clipboard may be unavailable in a local file context.
        downloadFile(
            "graph-matrix.csv",
            text,
            "text/csv;charset=utf-8"
        );

        setStatus("Не удалось скопировать: CSV сохранён в файл.");
    }
}

document.getElementById("copyAdjacency").addEventListener(
    "click",
    () => {
        const matrix = getAdjacencyMatrix();
        const header = ["", ...vertices.map(v => `v${v.id}`)];

        const rows = matrix.map((row, i) => [
            `v${vertices[i].id}`,
            ...row
        ]);

        copyText(matrixToCSV([header, ...rows]));
    }
);

document.getElementById("copyIncidence").addEventListener(
    "click",
    () => {
        const matrix = getIncidenceMatrix();
        const header = ["", ...edges.map(e => `e${e.id}`)];

        const rows = matrix.map((row, i) => [
            `v${vertices[i].id}`,
            ...row
        ]);

        copyText(matrixToCSV([header, ...rows]));
    }
);

// ---------- Initialization ----------

setMode("vertex");
renderAll();