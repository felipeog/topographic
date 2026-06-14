// ========== constants

const DEBUG = false;
const SEED = "topographic-000";

const WIDTH = 210;
const HEIGHT = 297;

const MATRIX_STEP = 1;
const NOISE_STEP = 0.01;
const CELL_DISTANCE = 8;

// ========== elements

const elements = {
  root: document.querySelector("#root"),

  formWrapper: document.querySelector("#form-wrapper"),
  checkboxes: document.querySelectorAll("#form-wrapper [type=checkbox]"),

  svgWrapper: document.querySelector("#svg-wrapper"),
  svg: document.querySelector("#svg"),

  "noise-matrix-group": document.querySelector("#noise-matrix-group"),
  "horizontal-changes-matrix-group": document.querySelector(
    "#horizontal-changes-matrix-group",
  ),
  "vertical-changes-matrix-group": document.querySelector(
    "#vertical-changes-matrix-group",
  ),
  "lines-matrix-group": document.querySelector("#lines-matrix-group"),
  "individual-lines-group": document.querySelector("#individual-lines-group"),
  "inflections-group": document.querySelector("#inflections-group"),
  "curves-group": document.querySelector("#curves-group"),
  "lines-group": document.querySelector("#lines-group"),

  "noise-matrix-progress": document.querySelector("#noise-matrix-progress"),
  "horizontal-changes-matrix-progress": document.querySelector(
    "#horizontal-changes-matrix-progress",
  ),
  "vertical-changes-matrix-progress": document.querySelector(
    "#vertical-changes-matrix-progress",
  ),
  "lines-matrix-progress": document.querySelector("#lines-matrix-progress"),
  "individual-lines-progress": document.querySelector(
    "#individual-lines-progress",
  ),
  "inflections-progress": document.querySelector("#inflections-progress"),
  "curves-progress": document.querySelector("#curves-progress"),
  "lines-progress": document.querySelector("#lines-progress"),
  "drawing-progress": document.querySelector("#drawing-progress"),
};

elements.svg.setAttribute("width", `${WIDTH}mm`);
elements.svg.setAttribute("height", `${HEIGHT}mm`);
elements.svg.setAttribute("viewBox", `0 0 ${WIDTH} ${HEIGHT}`);

// ========== rendering

function renderMatrixCircles(matrix, group, { filter, fill }) {
  const fragment = new DocumentFragment();

  for (let row = 0; row < matrix.length; row++) {
    for (let col = 0; col < matrix[0].length; col++) {
      const cell = matrix[row][col];

      if (filter && !filter(cell)) continue;

      fragment.append(
        createSvgElement("circle", {
          "data-coordinates": `${row}-${col}`,
          cx: cell.col,
          cy: cell.row,
          r: MATRIX_STEP / 2,
          stroke: "none",
          fill: typeof fill === "function" ? fill(cell) : fill,
        }),
      );
    }
  }

  group.append(fragment);
}

function renderNoiseMatrix(matrix, group) {
  renderMatrixCircles(matrix, group, {
    fill: (cell) => `rgb(0 0 0 / ${cell.level})`,
  });
}

function renderHorizontalChangesMatrix(matrix, group) {
  renderMatrixCircles(matrix, group, {
    filter: (cell) => cell.change,
    fill: "rgb(255 0 0 / 1)",
  });
}

function renderVerticalChangesMatrix(matrix, group) {
  renderMatrixCircles(matrix, group, {
    filter: (cell) => cell.change,
    fill: "rgb(0 255 0 / 1)",
  });
}

function renderLinesMatrix(matrix, group) {
  renderMatrixCircles(matrix, group, {
    filter: (cell) => cell.active,
    fill: "rgb(0 0 255 / 1)",
  });
}

function renderIndividualLines(lines, group) {
  const fragment = new DocumentFragment();

  for (const line of lines) {
    for (const cell of line) {
      const circle = createSvgElement("circle", {
        "data-coordinates": `${cell.row}-${cell.col}`,
        cx: cell.col,
        cy: cell.row,
        r: MATRIX_STEP * (1 / 2),
        stroke: "none",
        fill: `rgb(255 255 0 / 1)`,
      });

      fragment.append(circle);
    }
  }

  group.append(fragment);
}

function renderInflections(inflections, group) {
  const fragment = new DocumentFragment();

  for (const inflection of inflections) {
    for (const cell of inflection) {
      const circle = createSvgElement("circle", {
        "data-coordinates": `${cell.row}-${cell.col}`,
        cx: cell.col,
        cy: cell.row,
        r: MATRIX_STEP * (1 / 2),
        stroke: "none",
        fill: `rgb(0 255 255 / 1)`,
      });

      fragment.append(circle);
    }
  }

  group.append(fragment);
}

function renderCurves(curves, group) {
  const fragment = new DocumentFragment();

  for (const curve of curves) {
    for (const cell of curve) {
      const circle = createSvgElement("circle", {
        "data-coordinates": `${cell.row}-${cell.col}`,
        cx: cell.col,
        cy: cell.row,
        r: MATRIX_STEP * (1 / 2),
        stroke: "none",
        fill: `rgb(0 0 0 / 0.5)`,
      });

      fragment.append(circle);
    }
  }

  group.append(fragment);
}

function renderLines(lines, group) {
  const fragment = new DocumentFragment();

  for (const line of lines) {
    const path = createSvgElement("path", {
      "stroke-width": 0.4,
      stroke: "rgb(0 0 0 / 0.4)",
      fill: "none",
      d: line,
    });

    fragment.append(path);
  }

  group.append(fragment);
}

async function render(payload) {
  const steps = [
    [renderNoiseMatrix, payload.noiseMatrix, "noise-matrix-group"],
    [
      renderHorizontalChangesMatrix,
      payload.horizontalChangesMatrix,
      "horizontal-changes-matrix-group",
    ],
    [
      renderVerticalChangesMatrix,
      payload.verticalChangesMatrix,
      "vertical-changes-matrix-group",
    ],
    [renderLinesMatrix, payload.linesMatrix, "lines-matrix-group"],
    [renderIndividualLines, payload.individualLines, "individual-lines-group"],
    [renderInflections, payload.inflections, "inflections-group"],
    [renderCurves, payload.curves, "curves-group"],
    [renderLines, payload.lines, "lines-group"],
  ];

  for (let i = 0; i < steps.length; i++) {
    const [fn, data, groupKey] = steps[i];

    fn(data, elements[groupKey]);

    elements["drawing-progress"].value = ((i + 1) / steps.length) * 100;

    await delay();
  }
}

// ========== helpers

function createSvgElement(tag, properties = {}) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", tag);

  Object.entries(properties).forEach(([key, value]) =>
    element.setAttribute(key, value),
  );

  return element;
}

function delay(ms = 200) {
  return new Promise((res) => setTimeout(res, ms));
}

function logger(...args) {
  if (!DEBUG) return;

  console.log(...args);
}

// ========== events

function handleCheckboxChange(event) {
  const group = elements[event.target.dataset.groupId];

  if (!group) return;
  group.classList.toggle("hidden", !event.target.checked);
}

elements.checkboxes.forEach((c) => {
  c.addEventListener("change", handleCheckboxChange);
});

// ========== worker

const worker = new Worker("worker.js", { type: "module" });

worker.postMessage({
  type: "setup",
  payload: {
    DEBUG,
    SEED,
    WIDTH,
    HEIGHT,
    MATRIX_STEP,
    NOISE_STEP,
    CELL_DISTANCE,
  },
});

worker.postMessage({
  type: "start",
  payload: {},
});

worker.addEventListener("message", (event) => {
  logger("from worker", event.data);

  const type = event?.data?.type;
  const payload = event?.data?.payload;

  if (!type || !payload) {
    console.error("invalid message");

    return;
  }

  switch (type) {
    case "progress": {
      const progress = elements[payload.progress];

      if (!progress) return;

      progress.value = payload.value;

      break;
    }

    case "done": {
      render(payload);

      break;
    }

    default: {
      console.error("invalid type");

      break;
    }
  }
});
