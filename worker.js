import * as SimplexNoise from "https://cdn.jsdelivr.net/npm/simplex-noise@4.0.3/+esm";
import Alea from "https://cdn.jsdelivr.net/npm/alea@1.0.1/+esm";

let DEBUG;
let SEED;
let WIDTH;
let HEIGHT;
let MATRIX_STEP;
let NOISE_STEP;
let CELL_DISTANCE;

let prng;
let noise2D;

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

      postMessage({
        type: "setup",
        payload: {
          message: "setup done",
          DEBUG,
          SEED,
          WIDTH,
          HEIGHT,
          MATRIX_STEP,
          NOISE_STEP,
          CELL_DISTANCE,
        },
      });

      break;
    }

    case "start": {
      const noiseMatrix = getNoiseMatrix();
      const horizontalChangesMatrix = getHorizontalChangesMatrix(noiseMatrix);
      const verticalChangesMatrix = getVerticalChangesMatrix(noiseMatrix);
      const linesMatrix = getLinesMatrix(noiseMatrix);
      const individualLines = getIndividualLines(linesMatrix);
      const inflections = getInflections(individualLines);
      const curves = getCurves(inflections);

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
        },
      });

      break;
    }
  }
});

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

function getLinesMatrix(matrix, sendProgress = true) {
  const lines = [];
  const horizontal = getHorizontalChangesMatrix(matrix, false);
  const vertical = getVerticalChangesMatrix(matrix, false);

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

    if (sendProgress) {
      postMessage({
        type: "progress",
        payload: {
          progress: "individual-lines-progress",
          value: 0 + (row / (matrixClone.length - 1)) * 50,
        },
      });
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

    if (sendProgress) {
      postMessage({
        type: "progress",
        payload: {
          progress: "individual-lines-progress",
          value: 50 + (row / (matrixClone.length - 1)) * 50,
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
    const inflection = line.reduce((a, c, i, o) => {
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

// ========== helpers

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

function logger(...args) {
  if (!DEBUG) return;

  console.log(...args);
}
