const size = 7;
const planLength = 4;

const commands = [
  {
    id: "vector",
    name: "Vector Dash",
    cost: 2,
    desc: "Move up to 2 orthogonal cells. Captures one enemy on landing.",
    icon: "⇢",
    apply: (state, target) => movePlayer(state, target, 2),
    targets: (state) => reachable(state, 2),
  },
  {
    id: "lance",
    name: "Lance Sweep",
    cost: 3,
    desc: "Strike a straight line of 3 cells without moving.",
    icon: "╋",
    apply: (state, target) => strikeLine(state, target),
    targets: (state) => lineTargets(state, 3),
  },
  {
    id: "fold",
    name: "Fold Space",
    cost: 4,
    desc: "Teleport to a matching color node and charge the core.",
    icon: "◇",
    apply: (state, target) => teleport(state, target),
    targets: (state) => state.nodes.filter((p) => !same(p, state.player)),
  },
  {
    id: "barrier",
    name: "Hard Barrier",
    cost: 2,
    desc: "Place a wall. Enemies recalculate shortest paths around it.",
    icon: "▣",
    apply: (state, target) => addWall(state, target),
    targets: (state) => emptyCells(state).filter((p) => dist(p, state.player) <= 2),
  },
  {
    id: "harvest",
    name: "Relic Harvest",
    cost: 1,
    desc: "Convert an adjacent relic into +5 integrity and +2 core.",
    icon: "✦",
    apply: (state, target) => harvest(state, target),
    targets: (state) => state.relics.filter((p) => dist(p, state.player) === 1),
  },
];

let game;

const els = {
  board: document.querySelector("#board"),
  hand: document.querySelector("#hand"),
  plan: document.querySelector("#plan"),
  threats: document.querySelector("#threats"),
  cycle: document.querySelector("#cycle"),
  integrity: document.querySelector("#integrity"),
  core: document.querySelector("#core"),
  forecast: document.querySelector("#forecast"),
  handCount: document.querySelector("#handCount"),
  planScore: document.querySelector("#planScore"),
  threatLevel: document.querySelector("#threatLevel"),
  title: document.querySelector("#messageTitle"),
  message: document.querySelector("#message"),
  undo: document.querySelector("#undo"),
  commit: document.querySelector("#commit"),
  newGame: document.querySelector("#newGame"),
};

function start() {
  game = {
    cycle: 1,
    integrity: 24,
    core: 0,
    selected: null,
    planned: [],
    history: [],
    state: makeState(),
    committed: false,
  };
  setMessage("Calculate the line.", "Select commands, then choose target cells. Commit exactly four moves.");
  render();
}

function makeState() {
  return {
    player: { x: 3, y: 3 },
    enemies: [
      { x: 0, y: 0 },
      { x: 6, y: 0 },
      { x: 0, y: 6 },
      { x: 6, y: 6 },
    ],
    walls: [
      { x: 2, y: 1 },
      { x: 4, y: 1 },
      { x: 1, y: 4 },
      { x: 5, y: 4 },
      { x: 3, y: 5 },
    ],
    nodes: [
      { x: 1, y: 2 },
      { x: 5, y: 2 },
      { x: 2, y: 5 },
      { x: 6, y: 4 },
    ],
    relics: [
      { x: 3, y: 0 },
      { x: 0, y: 3 },
      { x: 4, y: 4 },
      { x: 6, y: 3 },
    ],
  };
}

function render() {
  els.cycle.textContent = game.cycle;
  els.integrity.textContent = game.integrity;
  els.core.textContent = game.core;
  els.forecast.textContent = planLength - game.planned.length;
  els.handCount.textContent = commands.length;
  els.planScore.textContent = projectedScore(game.state);
  els.threatLevel.textContent = threatValue(game.state);

  renderHand();
  renderBoard();
  renderPlan();
  renderThreats();
}

function renderHand() {
  els.hand.replaceChildren();
  commands.forEach((cmd) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = `card${game.selected?.id === cmd.id ? " selected" : ""}`;
    card.innerHTML = `<strong><span>${cmd.name}</span><em>${cmd.icon} ${cmd.cost}</em></strong><span>${cmd.desc}</span>`;
    card.addEventListener("click", () => {
      game.selected = game.selected?.id === cmd.id ? null : cmd;
      render();
    });
    els.hand.append(card);
  });
}

function renderBoard() {
  els.board.replaceChildren();
  const targets = game.selected ? game.selected.targets(game.state) : [];
  const planCells = game.planned.map((step) => step.target);

  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const pos = { x, y };
      const cell = document.createElement("button");
      cell.type = "button";
      cell.className = "cell";
      if (planCells.some((p) => same(p, pos))) cell.classList.add("path");
      if (targets.some((p) => same(p, pos))) cell.classList.add("target");
      cell.addEventListener("click", () => selectTarget(pos));

      const tile = tileAt(game.state, pos);
      if (tile) cell.append(tile);
      els.board.append(cell);
    }
  }
}

function tileAt(state, pos) {
  const tile = document.createElement("div");
  tile.className = "tile";

  if (same(state.player, pos)) {
    tile.classList.add("player");
    tile.textContent = "K";
  } else if (state.enemies.some((p) => same(p, pos))) {
    tile.classList.add("enemy");
    tile.textContent = "X";
  } else if (state.walls.some((p) => same(p, pos))) {
    tile.classList.add("wall");
  } else if (state.nodes.some((p) => same(p, pos))) {
    tile.classList.add("node");
    tile.textContent = "N";
  } else if (state.relics.some((p) => same(p, pos))) {
    tile.classList.add("relic");
    tile.textContent = "R";
  } else {
    return null;
  }

  return tile;
}

function renderPlan() {
  els.plan.replaceChildren();
  if (!game.planned.length) {
    const empty = document.createElement("li");
    empty.textContent = "No line set.";
    els.plan.append(empty);
    return;
  }

  game.planned.forEach((step, index) => {
    const item = document.createElement("li");
    item.textContent = `${index + 1}. ${step.command.name} at ${coord(step.target)}: ${step.result}`;
    els.plan.append(item);
  });
}

function renderThreats() {
  els.threats.replaceChildren();
  const ranked = game.state.enemies
    .map((enemy) => ({ enemy, distance: shortestDistance(game.state, enemy, game.state.player) }))
    .sort((a, b) => a.distance - b.distance);

  ranked.slice(0, 4).forEach(({ enemy, distance }) => {
    const node = document.createElement("div");
    node.className = "threat";
    node.innerHTML = `<strong>Intruder ${coord(enemy)}</strong><span>${distance} turns from king. Breach damage: <em>${Math.max(2, 8 - distance)}</em></span>`;
    els.threats.append(node);
  });
}

function selectTarget(pos) {
  if (!game.selected) {
    setMessage("Choose a command first.", "The target grid updates for the selected command.");
    return;
  }

  if (game.planned.length >= planLength) {
    setMessage("Line is full.", "Commit or undo before adding another command.");
    return;
  }

  const legal = game.selected.targets(game.state);
  if (!legal.some((p) => same(p, pos))) {
    setMessage("Illegal target.", "That cell does not satisfy the selected command.");
    return;
  }

  const previous = cloneState(game.state);
  const outcome = game.selected.apply(game.state, pos);
  advanceEnemies(game.state);
  resolveBreach();

  game.history.push(previous);
  game.planned.push({
    command: game.selected,
    target: { ...pos },
    result: outcome,
  });

  setMessage("Line extended.", `${game.selected.name} resolved. ${planLength - game.planned.length} move slots remain.`);
  if (game.integrity <= 0) setMessage("Core breached.", "The line failed. Start a new grid and search for a cleaner route.");
  render();
}

function commitPlan() {
  if (game.planned.length !== planLength) {
    setMessage("Incomplete line.", `Commit requires exactly ${planLength} planned moves.`);
    return;
  }

  const gain = projectedScore(game.state);
  game.core += gain;
  game.cycle += 1;
  game.planned = [];
  game.history = [];
  game.selected = null;
  spawnCycle();

  if (game.core >= 60) {
    setMessage("Checkmate achieved.", "You stabilized the grid. Start a new run to chase a cleaner solution.");
  } else if (game.integrity <= 0) {
    setMessage("Core breached.", "The calculation collapsed under pressure.");
  } else {
    setMessage("Cycle committed.", `Core gained ${gain}. Enemy pressure has increased.`);
  }

  render();
}

function undo() {
  const previous = game.history.pop();
  if (!previous) {
    setMessage("Nothing to undo.", "Plan a command before rewinding.");
    return;
  }
  game.state = previous;
  game.planned.pop();
  game.integrity = Math.min(30, game.integrity + 1);
  setMessage("Move rewound.", "Integrity refund is partial, so every experiment still has weight.");
  render();
}

function movePlayer(state, target, range) {
  if (dist(state.player, target) > range) return "Out of range.";
  if (blocked(state, target)) return "Blocked.";
  state.player = { ...target };
  const before = state.enemies.length;
  state.enemies = state.enemies.filter((enemy) => !same(enemy, target));
  return before > state.enemies.length ? "Captured an intruder." : "Repositioned king.";
}

function strikeLine(state, target) {
  const dx = Math.sign(target.x - state.player.x);
  const dy = Math.sign(target.y - state.player.y);
  const killed = [];
  for (let i = 1; i <= 3; i += 1) {
    const p = { x: state.player.x + dx * i, y: state.player.y + dy * i };
    if (same(p, target) || dx === 0 || dy === 0) {
      if (state.enemies.some((enemy) => same(enemy, p))) killed.push(p);
    }
  }
  state.enemies = state.enemies.filter((enemy) => !killed.some((p) => same(p, enemy)));
  return killed.length ? `Removed ${killed.length} intruder${killed.length > 1 ? "s" : ""}.` : "No target in the beam.";
}

function teleport(state, target) {
  state.player = { ...target };
  return "Core alignment gained.";
}

function addWall(state, target) {
  state.walls.push({ ...target });
  return "Enemy pathing disrupted.";
}

function harvest(state, target) {
  state.relics = state.relics.filter((p) => !same(p, target));
  game.integrity = Math.min(30, game.integrity + 5);
  game.core += 2;
  return "Relic converted.";
}

function advanceEnemies(state) {
  state.enemies = state.enemies.map((enemy) => nextStepToward(state, enemy, state.player));
}

function resolveBreach() {
  const hits = game.state.enemies.filter((enemy) => same(enemy, game.state.player)).length;
  if (hits) {
    game.integrity -= hits * 7;
    game.state.enemies = game.state.enemies.filter((enemy) => !same(enemy, game.state.player));
  } else {
    game.integrity -= Math.max(0, threatValue(game.state) - 9);
  }
}

function spawnCycle() {
  const edges = [
    { x: 0, y: 0 },
    { x: 6, y: 0 },
    { x: 0, y: 6 },
    { x: 6, y: 6 },
    { x: 3, y: 0 },
    { x: 6, y: 3 },
    { x: 0, y: 3 },
  ];
  const count = Math.min(2 + game.cycle, 6);
  for (let i = 0; i < count; i += 1) {
    const p = edges[(i + game.cycle) % edges.length];
    if (!occupied(game.state, p)) game.state.enemies.push({ ...p });
  }
  if (game.cycle % 2 === 0) {
    const relic = { x: (game.cycle * 2) % size, y: (game.cycle * 3 + 1) % size };
    if (!occupied(game.state, relic)) game.state.relics.push(relic);
  }
}

function reachable(state, range) {
  const cells = [];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const p = { x, y };
      const hardBlocked =
        same(state.player, p) ||
        state.walls.some((q) => same(q, p)) ||
        state.nodes.some((q) => same(q, p)) ||
        state.relics.some((q) => same(q, p));
      if (!hardBlocked && dist(p, state.player) > 0 && dist(p, state.player) <= range) {
        cells.push(p);
      }
    }
  }
  return cells;
}

function lineTargets(state, range) {
  const result = [];
  const dirs = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];
  dirs.forEach((dir) => {
    for (let i = 1; i <= range; i += 1) {
      const p = { x: state.player.x + dir.x * i, y: state.player.y + dir.y * i };
      if (inside(p)) result.push(p);
    }
  });
  return result;
}

function emptyCells(state) {
  const cells = [];
  for (let y = 0; y < size; y += 1) {
    for (let x = 0; x < size; x += 1) {
      const p = { x, y };
      if (!occupied(state, p)) cells.push(p);
    }
  }
  return cells;
}

function occupied(state, p) {
  return (
    same(state.player, p) ||
    state.enemies.some((q) => same(q, p)) ||
    state.walls.some((q) => same(q, p)) ||
    state.nodes.some((q) => same(q, p)) ||
    state.relics.some((q) => same(q, p))
  );
}

function blocked(state, p) {
  return state.walls.some((q) => same(q, p));
}

function nextStepToward(state, from, to) {
  const dirs = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];

  return dirs
    .map((dir) => ({ x: from.x + dir.x, y: from.y + dir.y }))
    .filter((p) => inside(p) && !blocked(state, p))
    .sort((a, b) => shortestDistance(state, a, to) - shortestDistance(state, b, to))[0] || from;
}

function shortestDistance(state, from, to) {
  const key = (p) => `${p.x},${p.y}`;
  const queue = [{ p: from, d: 0 }];
  const seen = new Set([key(from)]);
  const dirs = [
    { x: 1, y: 0 },
    { x: -1, y: 0 },
    { x: 0, y: 1 },
    { x: 0, y: -1 },
  ];

  while (queue.length) {
    const current = queue.shift();
    if (same(current.p, to)) return current.d;
    dirs.forEach((dir) => {
      const p = { x: current.p.x + dir.x, y: current.p.y + dir.y };
      if (!inside(p) || blocked(state, p) || seen.has(key(p))) return;
      seen.add(key(p));
      queue.push({ p, d: current.d + 1 });
    });
  }

  return 99;
}

function threatValue(state) {
  return state.enemies.reduce((sum, enemy) => {
    const d = shortestDistance(state, enemy, state.player);
    return sum + Math.max(0, 8 - d);
  }, 0);
}

function projectedScore(state) {
  return Math.max(0, 8 + state.relics.length * 2 - state.enemies.length + Math.floor(game.integrity / 6));
}

function cloneState(state) {
  return {
    player: { ...state.player },
    enemies: state.enemies.map((p) => ({ ...p })),
    walls: state.walls.map((p) => ({ ...p })),
    nodes: state.nodes.map((p) => ({ ...p })),
    relics: state.relics.map((p) => ({ ...p })),
  };
}

function same(a, b) {
  return a.x === b.x && a.y === b.y;
}

function dist(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

function inside(p) {
  return p.x >= 0 && p.y >= 0 && p.x < size && p.y < size;
}

function coord(p) {
  return `${String.fromCharCode(65 + p.x)}${p.y + 1}`;
}

function setMessage(title, message) {
  els.title.textContent = title;
  els.message.textContent = message;
}

els.undo.addEventListener("click", undo);
els.commit.addEventListener("click", commitPlan);
els.newGame.addEventListener("click", start);

start();
