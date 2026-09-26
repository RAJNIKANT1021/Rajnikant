const PUZZLE = "530070000600195000098000060800060003400803001700020006060000280000419005000080079";

function canPlace(board, i, v) {
  const r = (i / 9) | 0;
  const c = i % 9;
  for (let k = 0; k < 9; k++) {
    if (board[r * 9 + k] === v || board[k * 9 + c] === v) return false;
  }
  const br = r - (r % 3);
  const bc = c - (c % 3);
  for (let y = 0; y < 3; y++) {
    for (let x = 0; x < 3; x++) {
      if (board[(br + y) * 9 + bc + x] === v) return false;
    }
  }
  return true;
}

function* solve(board) {
  const i = board.indexOf(0);
  if (i < 0) return true;
  for (let v = 1; v <= 9; v++) {
    if (!canPlace(board, i, v)) continue;
    board[i] = v;
    yield { i, v, type: "place" };
    if (yield* solve(board)) return true;
    board[i] = 0;
    yield { i, v: 0, type: "back" };
  }
  return false;
}

export function createSudokuDemo(root) {
  const grid = root.querySelector("[data-sudoku-grid]");
  const runBtn = root.querySelector('[data-action="run"]');
  const resetBtn = root.querySelector('[data-action="reset"]');
  const speed = root.querySelector("[data-speed]");
  const stepsEl = root.querySelector('[data-stat="steps"]');
  const backEl = root.querySelector('[data-stat="backtracks"]');
  const statusEl = root.querySelector('[data-stat="status"]');

  const cells = [];
  for (let i = 0; i < 81; i++) {
    const cell = document.createElement("span");
    cell.className = "sudoku__cell";
    grid.appendChild(cell);
    cells.push(cell);
  }

  let board;
  let solver;
  let playing = false;
  let steps = 0;
  let backs = 0;
  let lastActive = -1;

  function reset() {
    board = [...PUZZLE].map(Number);
    solver = solve(board);
    playing = false;
    steps = 0;
    backs = 0;
    lastActive = -1;
    cells.forEach((cell, i) => {
      cell.textContent = board[i] || "";
      cell.className = "sudoku__cell" + (board[i] ? " is-given" : "");
    });
    runBtn.textContent = "Run backtracking";
    statusEl.textContent = "Ready";
    updateStats();
  }

  function updateStats() {
    stepsEl.textContent = steps.toLocaleString();
    backEl.textContent = backs.toLocaleString();
  }

  function applyStep({ i, v, type }) {
    const cell = cells[i];
    cell.textContent = v || "";
    cell.classList.toggle("is-placed", type === "place");
    cell.classList.toggle("is-back", type === "back");
    if (type === "place") steps++;
    else backs++;
    if (lastActive >= 0 && lastActive !== i) cells[lastActive].classList.remove("is-active");
    cell.classList.add("is-active");
    lastActive = i;
  }

  function loop() {
    if (!playing) return;
    const perFrame = Number(speed.value);
    for (let n = 0; n < perFrame; n++) {
      const { value, done } = solver.next();
      if (done) {
        playing = false;
        if (lastActive >= 0) cells[lastActive].classList.remove("is-active");
        cells.forEach((c) => c.classList.remove("is-back"));
        root.classList.add("is-solved");
        statusEl.textContent = "Solved";
        runBtn.textContent = "Solved";
        runBtn.disabled = true;
        updateStats();
        return;
      }
      applyStep(value);
    }
    updateStats();
    requestAnimationFrame(loop);
  }

  runBtn.addEventListener("click", () => {
    playing = !playing;
    runBtn.textContent = playing ? "Pause" : "Resume";
    statusEl.textContent = playing ? "Searching…" : "Paused";
    if (playing) requestAnimationFrame(loop);
  });

  resetBtn.addEventListener("click", () => {
    root.classList.remove("is-solved");
    runBtn.disabled = false;
    reset();
  });

  reset();
}
