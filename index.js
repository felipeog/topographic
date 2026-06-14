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

  noiseMatrixGroup: document.querySelector("#noise-matrix-group"),
  horizontalChangesMatrixGroup: document.querySelector(
    "#horizontal-changes-matrix-group",
  ),
  verticalChangesMatrixGroup: document.querySelector(
    "#vertical-changes-matrix-group",
  ),
  linesMatrixGroup: document.querySelector("#lines-matrix-group"),
  individualLinesGroup: document.querySelector("#individual-lines-group"),
  inflectionsGroup: document.querySelector("#inflections-group"),
  curvesGroup: document.querySelector("#curves-group"),
  linesGroup: document.querySelector("#lines-group"),

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

function renderNoiseMatrix(matrix, group) {
  const fragment = new DocumentFragment();

  for (let row = 0; row < matrix.length; row++) {
    for (let col = 0; col < matrix[0].length; col++) {
      const cell = matrix[row][col];
      const circle = createSvgElement("circle", {
        "data-coordinates": `${row}-${col}`,
        cx: cell.col,
        cy: cell.row,
        r: MATRIX_STEP * (1 / 2),
        stroke: "none",
        fill: `rgb(0 0 0 / ${cell.level})`,
      });

      fragment.append(circle);
    }
  }

  group.append(fragment);
}

function renderHorizontalChangesMatrix(matrix, group) {
  const fragment = new DocumentFragment();

  for (let row = 0; row < matrix.length; row++) {
    for (let col = 0; col < matrix[0].length; col++) {
      const cell = matrix[row][col];

      if (!cell.change) continue;

      const circle = createSvgElement("circle", {
        "data-coordinates": `${row}-${col}`,
        cx: cell.col,
        cy: cell.row,
        r: MATRIX_STEP * (1 / 2),
        stroke: "none",
        fill: `rgb(255 0 0 / 1)`,
      });

      fragment.append(circle);
    }
  }

  group.append(fragment);
}

function renderVerticalChangesMatrix(matrix, group) {
  const fragment = new DocumentFragment();

  for (let row = 0; row < matrix.length; row++) {
    for (let col = 0; col < matrix[0].length; col++) {
      const cell = matrix[row][col];

      if (!cell.change) continue;

      const circle = createSvgElement("circle", {
        "data-coordinates": `${row}-${col}`,
        cx: cell.col,
        cy: cell.row,
        r: MATRIX_STEP * (1 / 2),
        stroke: "none",
        fill: `rgb(0 255 0 / 1)`,
      });

      fragment.append(circle);
    }
  }

  group.append(fragment);
}

function renderLinesMatrix(matrix, group) {
  const fragment = new DocumentFragment();

  for (let row = 0; row < matrix.length; row++) {
    for (let col = 0; col < matrix[0].length; col++) {
      const cell = matrix[row][col];

      if (!cell.active) continue;

      const circle = createSvgElement("circle", {
        "data-coordinates": `${row}-${col}`,
        cx: cell.col,
        cy: cell.row,
        r: MATRIX_STEP * (1 / 2),
        stroke: "none",
        fill: `rgb(0 0 255 / 1)`,
      });

      fragment.append(circle);
    }
  }

  group.append(fragment);
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
  let currentStep = 0;
  const totalSteps = 8;

  renderNoiseMatrix(payload.noiseMatrix, elements.noiseMatrixGroup);
  elements["drawing-progress"].value = (++currentStep / totalSteps) * 100;
  await delay();

  renderHorizontalChangesMatrix(
    payload.horizontalChangesMatrix,
    elements.horizontalChangesMatrixGroup,
  );
  elements["drawing-progress"].value = (++currentStep / totalSteps) * 100;
  await delay();

  renderVerticalChangesMatrix(
    payload.verticalChangesMatrix,
    elements.verticalChangesMatrixGroup,
  );
  elements["drawing-progress"].value = (++currentStep / totalSteps) * 100;
  await delay();

  renderLinesMatrix(payload.linesMatrix, elements.linesMatrixGroup);
  elements["drawing-progress"].value = (++currentStep / totalSteps) * 100;
  await delay();

  renderIndividualLines(payload.individualLines, elements.individualLinesGroup);
  elements["drawing-progress"].value = (++currentStep / totalSteps) * 100;
  await delay();

  renderInflections(payload.inflections, elements.inflectionsGroup);
  elements["drawing-progress"].value = (++currentStep / totalSteps) * 100;
  await delay();

  renderCurves(payload.curves, elements.curvesGroup);
  elements["drawing-progress"].value = (++currentStep / totalSteps) * 100;
  await delay();

  renderLines(payload.lines, elements.linesGroup);
  elements["drawing-progress"].value = (++currentStep / totalSteps) * 100;
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
  const group = document.querySelector(`#${event.target.dataset.groupId}`);

  if (!group) return;
  if (!event.target.checked) group.classList.add("hidden");
  if (event.target.checked) group.classList.remove("hidden");
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
      if (!elements[payload.progress]) return;

      elements[payload.progress].value = payload.value;

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
