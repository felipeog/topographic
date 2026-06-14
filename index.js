const worker = new Worker("worker.js", { type: "module" });

// =============================================================================
// imports
// =============================================================================

import * as SimplexNoise from "https://cdn.jsdelivr.net/npm/simplex-noise@4.0.3/+esm";
import Alea from "https://cdn.jsdelivr.net/npm/alea@1.0.1/+esm";

// =============================================================================
// constants
// =============================================================================

const SEED = "topographic-000";

const WIDTH = 210;
const HEIGHT = 297;

const DEFAULT_MATRIX_STEP = 1;
const DEFAULT_NOISE_STEP = 0.01;
const DEFAULT_CELL_DISTANCE = 8;

const MATRIX_STEP = 1;
const NOISE_STEP = 0.01;
const CELL_DISTANCE = 8;

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
};

elements.svg.setAttribute("width", `${WIDTH}mm`);
elements.svg.setAttribute("height", `${HEIGHT}mm`);
elements.svg.setAttribute("viewBox", `0 0 ${WIDTH} ${HEIGHT}`);

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

function getNoiseMatrix() {
  const matrix = [];

  let rowIndex = 0;
  let xOffset = 0;
  let yOffset = 0;

  for (let row = 0; row <= HEIGHT; row += MATRIX_STEP) {
    rowIndex = matrix.length;
    xOffset = 0;
    matrix.push([]);

    for (let col = 0; col <= WIDTH; col += MATRIX_STEP) {
      const noise = (noise2D(xOffset, yOffset) + 1) / 2; // (-1, 1) to (0, 1)
      const level = Number(noise.toFixed(1)); // one decimal

      matrix[rowIndex].push({
        row,
        col,
        level,
      });
      xOffset += NOISE_STEP;
    }

    yOffset += NOISE_STEP;
  }

  return matrix;
}

function renderNoiseMatrix(matrix, group) {
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

      group.append(circle);
    }
  }
}

function getHorizontalChangesMatrix(matrix) {
  const changes = [];

  for (let row = 0; row < matrix.length; row++) {
    changes[row] = [];

    for (let col = 0; col < matrix[0].length; col++) {
      const prevCell = matrix?.[row]?.[col - 1] ?? matrix[row][0];
      const currCell = matrix[row][col];

      if (prevCell.level === currCell.level) {
        changes[row][col] = { ...currCell, change: false };
      }

      if (prevCell.level < currCell.level) {
        changes[row][col] = { ...currCell, change: true };
      }

      if (prevCell.level > currCell.level) {
        changes[row][col - 1] = { ...changes[row][col - 1], change: true };
        changes[row][col] = { ...currCell, change: false };
      }
    }
  }

  return changes;
}

function renderHorizontalChangesMatrix(matrix, group) {
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

      group.append(circle);
    }
  }
}

function getVerticalChangesMatrix(matrix) {
  const changes = [];

  for (let col = 0; col < matrix[0].length; col++) {
    for (let row = 0; row < matrix.length; row++) {
      if (!changes[row]) changes[row] = [];

      const prevCell = matrix?.[row - 1]?.[col] ?? matrix[0][col];
      const currCell = matrix[row][col];

      if (prevCell.level === currCell.level) {
        changes[row][col] = { ...currCell, change: false };
      }

      if (prevCell.level < currCell.level) {
        changes[row][col] = { ...currCell, change: true };
      }

      if (prevCell.level > currCell.level) {
        changes[row - 1][col] = { ...changes[row - 1][col], change: true };
        changes[row][col] = { ...currCell, change: false };
      }
    }
  }

  return changes;
}

function renderVerticalChangesMatrix(matrix, group) {
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

      group.append(circle);
    }
  }
}

function getLinesMatrix(matrix) {
  const lines = [];
  const horizontal = getHorizontalChangesMatrix(matrix);
  const vertical = getVerticalChangesMatrix(matrix);

  // merge horizontal and vertical
  for (let row = 0; row < matrix.length; row++) {
    lines[row] = [];

    for (let col = 0; col < matrix[0].length; col++) {
      lines[row][col] = {
        ...matrix[row][col],
        active: horizontal[row][col].change || vertical[row][col].change,
      };
    }
  }

  // remove corners
  for (let row = 0; row < matrix.length; row++) {
    for (let col = 0; col < matrix[0].length; col++) {
      if (lines[row][col].active) continue;

      const topLeft = lines?.[row - 1]?.[col - 1]?.active;
      const top = lines?.[row - 1]?.[col]?.active;
      const topRight = lines?.[row - 1]?.[col + 1]?.active;
      const right = lines?.[row]?.[col + 1]?.active;
      const bottomRight = lines?.[row + 1]?.[col + 1]?.active;
      const bottom = lines?.[row + 1]?.[col]?.active;
      const bottomLeft = lines?.[row + 1]?.[col - 1]?.active;
      const left = lines?.[row]?.[col - 1]?.active;

      if (left && topLeft && top) {
        lines[row - 1][col - 1].active = false;
      }

      if (top && topRight && right) {
        lines[row - 1][col + 1].active = false;
      }

      if (right && bottomRight && bottom) {
        lines[row + 1][col + 1].active = false;
      }

      if (bottom && bottomLeft && left) {
        lines[row + 1][col - 1].active = false;
      }
    }
  }

  return lines;
}

function renderLinesMatrix(matrix, group) {
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

      group.append(circle);
    }
  }
}

function getIndividualLines(matrix) {
  const matrixClone = structuredClone(matrix);
  const lines = [];

  // border lines first
  for (let row = 0; row < matrixClone.length; row++) {
    for (let col = 0; col < matrixClone[0].length; col++) {
      const isBorder =
        row === 0 ||
        row === matrixClone.length - 1 ||
        col === 0 ||
        col === matrixClone[0].length - 1;

      if (!isBorder || !matrixClone[row][col].active) continue;

      const line = [];

      let cellRow = row;
      let cellCol = col;

      while (true) {
        line.push({
          row: matrixClone[cellRow][cellCol].row,
          col: matrixClone[cellRow][cellCol].col,
        });

        matrixClone[cellRow][cellCol].active = false;

        const neighbours = getMatrixNeighbours(matrixClone, cellRow, cellCol);

        if (neighbours.length <= 0) break;

        cellRow = neighbours[0].row;
        cellCol = neighbours[0].col;
      }

      lines.push(line);
    }
  }

  // other lines second
  for (let row = 0; row < matrixClone.length; row++) {
    for (let col = 0; col < matrixClone[0].length; col++) {
      if (!matrixClone[row][col].active) continue;

      let cellRow = row;
      let cellCol = col;

      const line = [];

      while (true) {
        line.push({
          row: matrixClone[cellRow][cellCol].row,
          col: matrixClone[cellRow][cellCol].col,
        });

        matrixClone[cellRow][cellCol].active = false;

        const neighbours = getMatrixNeighbours(matrixClone, cellRow, cellCol);

        if (neighbours.length <= 0) break;

        cellRow = neighbours[0].row;
        cellCol = neighbours[0].col;
      }

      lines.push(line);
    }
  }

  return lines;
}

function renderIndividualLines(lines, group) {
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

      group.append(circle);
    }
  }
}

function getInflections(lines) {
  const inflections = [];

  for (const line of lines) {
    const inflection = line.reduce((a, c, i, o) => {
      if (i % CELL_DISTANCE === 0) {
        return [...a, c];
      }

      return a;
    }, []);

    if (!inflection.length) {
      inflections.push(line[0], line[line.length - 1]);

      continue;
    }

    if (!areCellsEqual(inflection[0], line[0])) {
      inflection.unshift(line[0]);
    }

    if (
      !areCellsEqual(inflection[inflection.length - 1], line[line.length - 1])
    ) {
      inflection.push(line[line.length - 1]);
    }

    inflections.push(inflection);
  }

  return inflections;
}

function renderInflections(inflections, group) {
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

      group.append(circle);
    }
  }
}

function getCurves(inflections) {
  const curves = [];

  for (const inflection of inflections) {
    const isContinuous = areCellsNeighbours(
      inflection[0],
      inflection[inflection.length - 1],
    );

    let count = 0;

    const curve = inflection.reduce((a, c, i, o) => {
      if (i < 1) return a;

      const prev = o[i - 1];
      const next = o[i + 1];

      const isPrevN = areCellsNeighbours(prev, c);
      const isNextN = next ? areCellsNeighbours(next, c) : false;
      const hasNeighbours = isNextN || isNextN;

      if (isPrevN) {
        count += count > 0 ? 1 : 2;

        return a;
      }

      if (count > 0) {
        const b = o[i - Math.floor(count / 2) - 1];

        count = 0;

        if (!isPrevN && !isNextN) return [...a, b, o[i]];

        return [...a, b];
      }

      if (!hasNeighbours) {
        return [...a, o[i]];
      }

      return a;
    }, []);

    if (count > 0) {
      const b = inflection[inflection.length - Math.floor(count / 2)];

      curve.push(b);
    }

    if (!areCellsEqual(inflection[0], curve[0])) {
      curve.unshift(inflection[0]);
    }

    if (
      !areCellsEqual(inflection[inflection.length - 1], curve[curve.length - 1])
    ) {
      curve.push(inflection[inflection.length - 1]);
    }

    if (isContinuous) {
      curve.push(inflection[0]);
    }

    if (areCellsNeighbours(curve[0], curve[1])) {
      curve.splice(1, 1);
    }

    if (areCellsNeighbours(curve[curve.length - 1], curve[curve.length - 2])) {
      curve.splice(curve.length - 2, 1);
    }

    if ((isContinuous && curve.length < 4) || curve.length < 2) continue;

    curves.push(curve);
  }

  return curves;
}

function renderCurves(curves, group) {
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

      group.append(circle);
    }
  }
}

function renderLines(curves, group) {
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

        const line1 = createSvgElement("line", {
          x1: c.col,
          y1: c.row,
          x2,
          y2,
          stroke: "rgb(0 0 0 / 0.4)",
          "stroke-width": 0.25,
          fill: "none",
        });
        const line2 = createSvgElement("line", {
          x1: c.col,
          y1: c.row,
          x2: prevX1,
          y2: prevY1,
          stroke: "rgb(0 0 0 / 0.4)",
          "stroke-width": 0.25,
          fill: "none",
        });
        const from = createSvgElement("circle", {
          cx: c.col,
          cy: c.row,
          r: MATRIX_STEP * (1 / 2),
          stroke: "rgb(0 0 0 / 0.6)",
          fill: "rgb(255 255 255 / 0.6)",
          "stroke-width": 0.25,
        });
        const to1 = createSvgElement("circle", {
          cx: x2,
          cy: y2,
          r: MATRIX_STEP * (1 / 2),
          stroke: "none",
          fill: "rgb(0 255 0 / 0.6)",
        });
        const to2 = createSvgElement("circle", {
          cx: prevX1,
          cy: prevY1,
          r: MATRIX_STEP * (1 / 2),
          stroke: "none",
          fill: "rgb(0 0 255 / 0.6)",
        });

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

    group.append(path);
  }
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

// =============================================================================
// main
// =============================================================================

const noiseMatrix = getNoiseMatrix();
renderNoiseMatrix(noiseMatrix, elements.noiseMatrixGroup);

const horizontalChangesMatrix = getHorizontalChangesMatrix(noiseMatrix);
renderHorizontalChangesMatrix(
  horizontalChangesMatrix,
  elements.horizontalChangesMatrixGroup,
);

const verticalChangesMatrix = getVerticalChangesMatrix(noiseMatrix);
renderVerticalChangesMatrix(
  verticalChangesMatrix,
  elements.verticalChangesMatrixGroup,
);

const linesMatrix = getLinesMatrix(noiseMatrix);
renderLinesMatrix(linesMatrix, elements.linesMatrixGroup);

const individualLines = getIndividualLines(linesMatrix);
renderIndividualLines(individualLines, elements.individualLinesGroup);

const inflections = getInflections(individualLines);
renderInflections(inflections, elements.inflectionsGroup);

const curves = getCurves(inflections);
renderCurves(curves, elements.curvesGroup);
renderLines(curves, elements.linesGroup);
