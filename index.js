const worker = new Worker("worker.js", { type: "module" });

// =============================================================================
// imports
// =============================================================================

import * as SimplexNoise from "https://cdn.jsdelivr.net/npm/simplex-noise@4.0.3/+esm";
import Alea from "https://cdn.jsdelivr.net/npm/alea@1.0.1/+esm";

// =============================================================================
// constants
// =============================================================================

const DEBUG = false;
const SEED = "topographic-000";

const WIDTH = 210;
const HEIGHT = 297;

const MATRIX_STEP = 1;
const NOISE_STEP = 0.01;
const CELL_DISTANCE = 8;

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

// =============================================================================
// objects
// =============================================================================

const prng = new Alea(SEED);
const noise2D = SimplexNoise.createNoise2D(prng);

// =============================================================================
// elements
// =============================================================================

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
  "drawing-progress": document.querySelector("#drawing-progress"),
};

elements.svg.setAttribute("width", `${WIDTH}mm`);
elements.svg.setAttribute("height", `${HEIGHT}mm`);
elements.svg.setAttribute("viewBox", `0 0 ${WIDTH} ${HEIGHT}`);

// =============================================================================
// render
// =============================================================================

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

function renderLines(curves, group) {
  const fragment = new DocumentFragment();
  const handleDistance = 1 / 3;

  for (const curve of curves) {
    const first = curve[0];
    const last = curve[curve.length - 1];
    const isContinuous = areCellsEqual(first, last);

    let prevX1;
    let prevY1;

    const d = curve.reduce((a, c, i, o) => {
      const x = c.col;
      const y = c.row;

      if (i === 0) return `M ${x} ${y}`;

      const isFirst = i === 1;
      const isLast = i === o.length - 1;

      let prev = o[i - 1];
      let next = o[i + 1];

      if (isContinuous && isLast) {
        next = o[1];
      }

      if (isContinuous && isFirst) {
        prev = o[o.length - 1];

        const p = o[o.length - 2];
        const n = o[i];
        const cc = o[i - 1];

        const angle = Math.atan2(p.row - n.row, p.col - n.col);
        const nextDistance = Math.hypot(n.col - cc.col, n.row - cc.row);

        prevX1 =
          Math.cos(angle + Math.PI) * (nextDistance * handleDistance) + cc.col;
        prevY1 =
          Math.sin(angle + Math.PI) * (nextDistance * handleDistance) + cc.row;
      }

      let x1 = prevX1 ?? prev.col;
      let y1 = prevY1 ?? prev.row;

      let x2 = c.col;
      let y2 = c.row;

      if (prev && next) {
        const angle = Math.atan2(prev.row - next.row, prev.col - next.col);
        const distance = Math.hypot(prev.col - c.col, prev.row - c.row);
        const nextDistance = Math.hypot(next.col - c.col, next.row - c.row);

        x2 = Math.cos(angle) * (distance * handleDistance) + c.col;
        y2 = Math.sin(angle) * (distance * handleDistance) + c.row;

        prevX1 =
          Math.cos(angle + Math.PI) * (nextDistance * handleDistance) + c.col;
        prevY1 =
          Math.sin(angle + Math.PI) * (nextDistance * handleDistance) + c.row;

        // const line1 = createSvgElement("line", {
        //   x1: c.col,
        //   y1: c.row,
        //   x2,
        //   y2,
        //   stroke: "rgb(0 0 0 / 0.4)",
        //   "stroke-width": 0.25,
        //   fill: "none",
        // });
        // const line2 = createSvgElement("line", {
        //   x1: c.col,
        //   y1: c.row,
        //   x2: prevX1,
        //   y2: prevY1,
        //   stroke: "rgb(0 0 0 / 0.4)",
        //   "stroke-width": 0.25,
        //   fill: "none",
        // });
        // const from = createSvgElement("circle", {
        //   cx: c.col,
        //   cy: c.row,
        //   r: MATRIX_STEP * (1 / 2),
        //   stroke: "rgb(0 0 0 / 0.6)",
        //   fill: "rgb(255 255 255 / 0.6)",
        //   "stroke-width": 0.25,
        // });
        // const to1 = createSvgElement("circle", {
        //   cx: x2,
        //   cy: y2,
        //   r: MATRIX_STEP * (1 / 2),
        //   stroke: "none",
        //   fill: "rgb(0 255 0 / 0.6)",
        // });
        // const to2 = createSvgElement("circle", {
        //   cx: prevX1,
        //   cy: prevY1,
        //   r: MATRIX_STEP * (1 / 2),
        //   stroke: "none",
        //   fill: "rgb(0 0 255 / 0.6)",
        // });

        // group.append(line1, line2, from, to1, to2);
      }

      return (
        `${a} C ` +
        `${x1.toFixed(2)} ${y1.toFixed(2)} ` +
        `${x2.toFixed(2)} ${y2.toFixed(2)} ` +
        `${x.toFixed(2)} ${y.toFixed(2)}`
      );
    }, "");
    const path = createSvgElement("path", {
      "stroke-width": 0.4,
      stroke: "rgb(0 0 0 / 0.4)",
      fill: "none",
      d,
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

  renderLines(payload.curves, elements.linesGroup);
  elements["drawing-progress"].value = (++currentStep / totalSteps) * 100;
}

// =============================================================================
// helpers
// =============================================================================

function createSvgElement(tag, properties = {}) {
  const element = document.createElementNS("http://www.w3.org/2000/svg", tag);

  Object.entries(properties).forEach(([key, value]) =>
    element.setAttribute(key, value),
  );

  return element;
}

function areCellsNeighbours(a, b) {
  if (a.row - MATRIX_STEP === b.row && a.col - MATRIX_STEP === b.col) {
    return true;
  }

  if (a.row - MATRIX_STEP === b.row && a.col === b.col) {
    return true;
  }

  if (a.row - MATRIX_STEP === b.row && a.col + MATRIX_STEP === b.col) {
    return true;
  }

  if (a.row === b.row && a.col - MATRIX_STEP === b.col) {
    return true;
  }

  // if (a.row === b.row && a.col === b.col) {
  //   return true;
  // }

  if (a.row === b.row && a.col + MATRIX_STEP === b.col) {
    return true;
  }

  if (a.row + MATRIX_STEP === b.row && a.col - MATRIX_STEP === b.col) {
    return true;
  }

  if (a.row + MATRIX_STEP === b.row && a.col === b.col) {
    return true;
  }

  if (a.row + MATRIX_STEP === b.row && a.col + MATRIX_STEP === b.col) {
    return true;
  }

  return false;
}

function areCellsEqual(a, b) {
  const areEqual = a.row === b.row && a.col === b.col;

  return areEqual;
}

function getMatrixNeighbours(matrix, row, col) {
  const neighbours = [];

  if (matrix?.[row - 1]?.[col - 1]?.active) {
    neighbours.push({
      row: row - 1,
      col: col - 1,
    });
  }

  if (matrix?.[row - 1]?.[col]?.active) {
    neighbours.push({
      row: row - 1,
      col: col,
    });
  }

  if (matrix?.[row - 1]?.[col + 1]?.active) {
    neighbours.push({
      row: row - 1,
      col: col + 1,
    });
  }

  if (matrix?.[row]?.[col + 1]?.active) {
    neighbours.push({
      row: row,
      col: col + 1,
    });
  }

  if (matrix?.[row + 1]?.[col + 1]?.active) {
    neighbours.push({
      row: row + 1,
      col: col + 1,
    });
  }

  if (matrix?.[row + 1]?.[col]?.active) {
    neighbours.push({
      row: row + 1,
      col: col,
    });
  }

  if (matrix?.[row + 1]?.[col - 1]?.active) {
    neighbours.push({
      row: row + 1,
      col: col - 1,
    });
  }

  if (matrix?.[row]?.[col - 1]?.active) {
    neighbours.push({
      row: row,
      col: col - 1,
    });
  }

  return neighbours;
}

function delay(ms = 200) {
  return new Promise((res) => setTimeout(res, ms));
}

function logger(...args) {
  if (!DEBUG) return;

  console.log(...args);
}

// =============================================================================
// events
// =============================================================================

function handleCheckboxChange(event) {
  const group = document.querySelector(`#${event.target.dataset.groupId}`);

  if (!group) return;
  if (!event.target.checked) group.classList.add("hidden");
  if (event.target.checked) group.classList.remove("hidden");
}

elements.checkboxes.forEach((c) => {
  c.addEventListener("change", handleCheckboxChange);
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
  }

  switch (type) {
    case "done": {
      render(payload);

      break;
    }
  }
});
