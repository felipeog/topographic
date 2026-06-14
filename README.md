# Topographic

A browser-based generative art tool that renders topographic contour lines as a scalable SVG. It samples 2D Simplex noise, traces edge transitions through an 8-stage pipeline, and outputs smooth cubic Bézier curves — all computed off the main thread via a Web Worker.

The output canvas matches A4 paper dimensions (210 × 297 mm), making it suitable for pen plotting or printing.

## Features

- **Deterministic output** — seeded PRNG produces the same result every run
- **Non-blocking computation** — all processing runs in a Web Worker; the UI stays responsive throughout
- **Progressive rendering** — each of the 8 pipeline stages renders independently with live progress bars
- **Layer inspection** — toggle any intermediate processing layer on/off via checkboxes to visualize the algorithm at each step
- **Print-ready SVG** — A4-sized vector output with semi-transparent cubic Bézier strokes
- **No build step** — plain HTML, CSS, and ES module JavaScript; open in a browser and run

## Tech Stack

| Layer       | Technology                                                                          |
| ----------- | ----------------------------------------------------------------------------------- |
| Markup      | HTML5 (`<svg>`, `<progress>`, `<input type="checkbox">`)                            |
| Styles      | CSS (`display: none` toggle, SVG border)                                            |
| Logic       | Vanilla JavaScript (ES modules)                                                     |
| Concurrency | [Web Workers API](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API) |
| Rendering   | SVG (`<path>` with cubic Bézier `C` commands)                                       |
| Noise       | [`simplex-noise@4.0.3`](https://github.com/jwagner/simplex-noise.js) via CDN        |
| PRNG        | [`alea@1.0.1`](https://github.com/coverslide/node-alea) via CDN                     |

No npm, no bundler, no framework.

## Project Structure

```
topographic/
├── index.html   # SVG canvas, layer checkboxes, progress bars
├── index.css    # Minimal styles (SVG border + .hidden class)
├── index.js     # Main thread: rendering, UI events, worker communication
└── worker.js    # Web Worker: all computation (noise → curves)
```

## Installation

No installation required. Clone the repository and serve the files over HTTP (ES modules do not load from `file://` URLs).

```bash
git clone https://github.com/felipeog/topographic.git
cd topographic
```

Then start any static file server in the project directory. Examples:

```bash
# Node.js
npx serve .

# Python 3
python3 -m http.server

# Python 2
python -m SimpleHTTPServer
```

Open `http://localhost:3000` (or whichever port your server uses) in a modern browser.

## Quick Start

1. Serve the directory (see above).
2. Open the URL in your browser.
3. Wait for computation to complete — progress bars fill as each stage finishes.
4. The final topographic SVG renders automatically.

Generation time depends on hardware. With the default settings (~62 000 cells) it typically completes in a few seconds.

## Usage

### Viewing intermediate layers

The left panel contains eight checkboxes, one per processing stage. Unchecking a layer hides its corresponding SVG group so you can inspect individual steps of the pipeline:

| Layer                             | What it shows                                                               |
| --------------------------------- | --------------------------------------------------------------------------- |
| `noise-matrix-group`              | Raw Simplex noise as gray circles (opacity = noise level)                   |
| `horizontal-changes-matrix-group` | Red circles where the noise level rises left → right                        |
| `vertical-changes-matrix-group`   | Green circles where the noise level rises top → bottom                      |
| `lines-matrix-group`              | Blue circles marking all active edge cells (H ∪ V changes, corners removed) |
| `individual-lines-group`          | Yellow circles showing traced connected-component paths                     |
| `inflections-group`               | Cyan circles showing downsampled control-point candidates                   |
| `curves-group`                    | Dark circles showing final refined Bézier control points                    |
| `lines-group`                     | The finished SVG paths — smooth topographic contour lines                   |

## Configuration

All tunable parameters live at the top of `index.js`:

```js
const SEED = "topographic-000"; // PRNG seed — change for a different composition
const WIDTH = 210; // SVG width in mm  (default: A4)
const HEIGHT = 297; // SVG height in mm (default: A4)
const MATRIX_STEP = 1; // Grid resolution — cells per mm (higher = slower)
const NOISE_STEP = 0.01; // Noise frequency — smaller = smoother, larger features
const CELL_DISTANCE = 8; // Control-point sampling interval along traced lines
```

After any change, reload the page to regenerate.

| Parameter       | Effect of increasing                                    |
| --------------- | ------------------------------------------------------- |
| `SEED`          | Different random composition (same algorithm)           |
| `MATRIX_STEP`   | Coarser grid, faster but lower resolution               |
| `NOISE_STEP`    | Higher noise frequency, tighter / more chaotic contours |
| `CELL_DISTANCE` | Fewer control points, smoother but less faithful curves |

## Architecture

The project splits cleanly into two threads:

```
Main thread (index.js)                Worker thread (worker.js)
─────────────────────                 ─────────────────────────
Send "setup" ──────────────────────→  Store constants, init noise
Send "start" ──────────────────────→  Run 8-stage pipeline
                                       ↓ postMessage("progress") × many
Receive "progress" → update bars ←───
                                       ↓ postMessage("done", payload)
Receive "done" → render 8 SVG ←──────
layers with 200 ms delays
```

### Processing pipeline (worker.js)

```
getNoiseMatrix()
  └─ 2D Simplex noise sampled at NOISE_STEP intervals, quantised to 1 decimal place

getHorizontalChangesMatrix()  ─┐
                               ├─ passed into getLinesMatrix()
getVerticalChangesMatrix()    ─┘
  └─ per-cell boolean: does the noise level rise across this edge?

getLinesMatrix()
  └─ merge H + V change flags; remove diagonal corner artifacts

getIndividualLines()
  └─ flood-fill trace of connected active cells into ordered line arrays;
     border cells are seeded first to anchor open contours at the canvas edge

getInflections()
  └─ downsample each line to every CELL_DISTANCE-th point; ensure endpoints are kept

getCurves()
  └─ remove neighbouring / redundant control points; detect closed loops

getLines()
  └─ emit SVG path strings using angle-based cubic Bézier handle placement
```

## Performance Considerations

- At the default `MATRIX_STEP = 1` the grid is 211 × 298 ≈ 62 900 cells. All computation runs in a Web Worker so the page remains interactive.
- `getIndividualLines` uses a `Set` for visited-cell tracking rather than deep-cloning the matrix, avoiding tens of thousands of object copies.
- `getHorizontalChangesMatrix` and `getVerticalChangesMatrix` are computed once in the pipeline and passed into `getLinesMatrix`, not recomputed internally.
- Rendering uses `DocumentFragment` per layer to batch DOM insertions.
- Increasing `MATRIX_STEP` beyond `1` reduces cell count quadratically and is the fastest way to prototype at lower fidelity.

## Development

No toolchain setup is needed. Edit any source file and reload the browser.

```
index.html  — add/remove UI elements, SVG groups
index.css   — style the page layout
index.js    — change rendering logic, constants, event handling
worker.js   — change the noise or curve algorithm
```

The `DEBUG` constant at the top of both files gates `console.log` output:

```js
// index.js / worker.js
const DEBUG = true; // set to true to enable verbose logging
```

## Known Considerations

- **Internet required at runtime** — `simplex-noise` and `alea` are loaded from the jsDelivr CDN. Offline use requires vendoring those modules locally.
- **No UI for parameters** — changing the seed, dimensions, or noise settings requires editing `index.js` and reloading.
- **Single static output** — there is no animation or real-time interaction beyond layer visibility toggling.
- **Browser support** — requires ES module support and Web Workers (all modern browsers; no IE).
