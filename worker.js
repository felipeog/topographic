import * as SimplexNoise from "https://cdn.jsdelivr.net/npm/simplex-noise@4.0.3/+esm";
import Alea from "https://cdn.jsdelivr.net/npm/alea@1.0.1/+esm";

// ========== constants

let DEBUG;
let SEED;
let WIDTH;
let HEIGHT;
let MATRIX_STEP;
let NOISE_STEP;
let CELL_DISTANCE;

// ========== objects

let prng;
let noise2D;

// ========== events

addEventListener("message", (event) => {
  logger("from main", event.data);

  const type = event?.data?.type;
  const payload = event?.data?.payload;

  if (!type || !payload) {
    postMessage({
      type: "error",
      payload: {
        message: "invalid message",
      },
    });

    return;
  }

  switch (type) {
    case "setup": {
      DEBUG = payload?.DEBUG;
      SEED = payload?.SEED;
      WIDTH = payload?.WIDTH;
      HEIGHT = payload?.HEIGHT;
      MATRIX_STEP = payload?.MATRIX_STEP;
      NOISE_STEP = payload?.NOISE_STEP;
      CELL_DISTANCE = payload?.CELL_DISTANCE;

      prng = new Alea(SEED);
      noise2D = SimplexNoise.createNoise2D(prng);

      break;
    }

    case "start": {
      const noiseMatrix = getNoiseMatrix();
      const horizontalChangesMatrix = getHorizontalChangesMatrix(noiseMatrix);
      const verticalChangesMatrix = getVerticalChangesMatrix(noiseMatrix);
      const linesMatrix = getLinesMatrix(
        noiseMatrix,
        horizontalChangesMatrix,
        verticalChangesMatrix,
      );
      const individualLines = getIndividualLines(linesMatrix);
      const inflections = getInflections(individualLines);
      const curves = getCurves(inflections);
      const lines = getLines(curves);

      postMessage({
        type: "done",
        payload: {
          noiseMatrix,
          horizontalChangesMatrix,
          verticalChangesMatrix,
          linesMatrix,
          individualLines,
          inflections,
          curves,
          lines,
        },
      });

      break;
    }

    default: {
      console.error("invalid type");

      break;
    }
  }
});

// ========== processing

function getNoiseMatrix(sendProgress = true) {
  const rowsTotal = HEIGHT * MATRIX_STEP;
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

    if (sendProgress) {
      postMessage({
        type: "progress",
        payload: {
          progress: "noise-matrix-progress",
          value: (row / rowsTotal) * 100,
        },
      });
    }

    yOffset += NOISE_STEP;
  }

  return matrix;
}

function getHorizontalChangesMatrix(matrix, sendProgress = true) {
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

    if (sendProgress) {
      postMessage({
        type: "progress",
        payload: {
          progress: "horizontal-changes-matrix-progress",
          value: (row / (matrix.length - 1)) * 100,
        },
      });
    }
  }

  return changes;
}

function getVerticalChangesMatrix(matrix, sendProgress = true) {
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

    if (sendProgress) {
      postMessage({
        type: "progress",
        payload: {
          progress: "vertical-changes-matrix-progress",
          value: (col / (matrix[0].length - 1)) * 100,
        },
      });
    }
  }

  return changes;
}

function getLinesMatrix(matrix, horizontal, vertical, sendProgress = true) {
  const lines = [];

  // merge horizontal and vertical
  for (let row = 0; row < matrix.length; row++) {
    lines[row] = [];

    for (let col = 0; col < matrix[0].length; col++) {
      lines[row][col] = {
        ...matrix[row][col],
        active: horizontal[row][col].change || vertical[row][col].change,
      };
    }

    if (sendProgress) {
      postMessage({
        type: "progress",
        payload: {
          progress: "lines-matrix-progress",
          value: 0 + (row / (matrix.length - 1)) * 50,
        },
      });
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

    if (sendProgress) {
      postMessage({
        type: "progress",
        payload: {
          progress: "lines-matrix-progress",
          value: 50 + (row / (matrix.length - 1)) * 50,
        },
      });
    }
  }

  return lines;
}

function getIndividualLines(matrix, sendProgress = true) {
  const visited = new Set();
  const lines = [];

  // border lines first
  for (let row = 0; row < matrix.length; row++) {
    for (let col = 0; col < matrix[0].length; col++) {
      const isBorder =
        row === 0 ||
        row === matrix.length - 1 ||
        col === 0 ||
        col === matrix[0].length - 1;

      if (!isBorder || !matrix[row][col].active || visited.has(`${row},${col}`))
        continue;

      const line = [];

      let cellRow = row;
      let cellCol = col;

      while (true) {
        line.push({
          row: matrix[cellRow][cellCol].row,
          col: matrix[cellRow][cellCol].col,
        });

        visited.add(`${cellRow},${cellCol}`);

        const neighbours = getMatrixNeighbours(
          matrix,
          cellRow,
          cellCol,
          visited,
        );

        if (neighbours.length <= 0) break;

        cellRow = neighbours[0].row;
        cellCol = neighbours[0].col;
      }

      lines.push(line);
    }

    if (sendProgress) {
      postMessage({
        type: "progress",
        payload: {
          progress: "individual-lines-progress",
          value: 0 + (row / (matrix.length - 1)) * 50,
        },
      });
    }
  }

  // other lines second
  for (let row = 0; row < matrix.length; row++) {
    for (let col = 0; col < matrix[0].length; col++) {
      if (!matrix[row][col].active || visited.has(`${row},${col}`)) continue;

      let cellRow = row;
      let cellCol = col;

      const line = [];

      while (true) {
        line.push({
          row: matrix[cellRow][cellCol].row,
          col: matrix[cellRow][cellCol].col,
        });

        visited.add(`${cellRow},${cellCol}`);

        const neighbours = getMatrixNeighbours(
          matrix,
          cellRow,
          cellCol,
          visited,
        );

        if (neighbours.length <= 0) break;

        cellRow = neighbours[0].row;
        cellCol = neighbours[0].col;
      }

      lines.push(line);
    }

    if (sendProgress) {
      postMessage({
        type: "progress",
        payload: {
          progress: "individual-lines-progress",
          value: 50 + (row / (matrix.length - 1)) * 50,
        },
      });
    }
  }

  return lines;
}

function getInflections(lines, sendProgress = true) {
  const inflections = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const inflection = line.reduce((a, c, i) => {
      if (i % CELL_DISTANCE === 0) {
        return [...a, c];
      }

      return a;
    }, []);

    if (!inflection.length) {
      inflections.push(line[0], line[line.length - 1]);
    } else {
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

    if (sendProgress) {
      postMessage({
        type: "progress",
        payload: {
          progress: "inflections-progress",
          value: (i / (lines.length - 1)) * 100,
        },
      });
    }
  }

  return inflections;
}

function getCurves(inflections, sendProgress = true) {
  const curves = [];

  for (let i = 0; i < inflections.length; i++) {
    const inflection = inflections[i];
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
      const hasNeighbours = isNextN || isPrevN;

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

    if (!((isContinuous && curve.length < 4) || curve.length < 2)) {
      curves.push(curve);
    }

    if (sendProgress) {
      postMessage({
        type: "progress",
        payload: {
          progress: "curves-progress",
          value: (i / (inflections.length - 1)) * 100,
        },
      });
    }
  }

  return curves;
}

function getLines(curves, sendProgress = true) {
  const lines = [];
  const handleDistance = 1 / 3;

  for (let i = 0; i < curves.length; i++) {
    const curve = curves[i];

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
      }

      return (
        `${a} C ` +
        `${x1.toFixed(2)} ${y1.toFixed(2)} ` +
        `${x2.toFixed(2)} ${y2.toFixed(2)} ` +
        `${x.toFixed(2)} ${y.toFixed(2)}`
      );
    }, "");

    lines.push(d);

    if (sendProgress) {
      postMessage({
        type: "progress",
        payload: {
          progress: "lines-progress",
          value: (i / (curves.length - 1)) * 100,
        },
      });
    }
  }

  return lines;
}

// ========== helpers

function areCellsNeighbours(a, b) {
  const rowDirection = Math.abs(a.row - b.row);
  const colDirection = Math.abs(a.col - b.col);

  return (
    rowDirection <= MATRIX_STEP &&
    colDirection <= MATRIX_STEP &&
    (rowDirection !== 0 || colDirection !== 0)
  );
}

function areCellsEqual(a, b) {
  const areEqual = a.row === b.row && a.col === b.col;

  return areEqual;
}

function getMatrixNeighbours(matrix, row, col, visited) {
  const directions = [
    [-1, -1],
    [-1, 0],
    [-1, 1],
    [0, 1],
    [1, 1],
    [1, 0],
    [1, -1],
    [0, -1],
  ];

  return directions
    .map(([rowDirection, colDirection]) => {
      return {
        row: row + rowDirection,
        col: col + colDirection,
      };
    })
    .filter((cell) => {
      return (
        matrix?.[cell.row]?.[cell.col]?.active &&
        !visited?.has(`${cell.row},${cell.col}`)
      );
    });
}

function logger(...args) {
  if (!DEBUG) return;

  console.log(...args);
}
