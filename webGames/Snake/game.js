const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");
const scoreEl = document.querySelector("#score");
const bestEl = document.querySelector("#best");
const overlay = document.querySelector("#overlay");
const overlayTitle = document.querySelector("#overlay-title");
const overlayCopy = document.querySelector("#overlay-copy");
const restartButton = document.querySelector("#restart");
const pauseButton = document.querySelector("#pause");
const touchButtons = document.querySelectorAll("[data-direction]");

const tileCount = 24;
const tileSize = canvas.width / tileCount;
const startSnake = [
  { x: 11, y: 12 },
  { x: 10, y: 12 },
  { x: 9, y: 12 },
];

let snake;
let food;
let direction;
let queuedDirection;
let score;
let best = Number(localStorage.getItem("snake-best") || 0);
let gameTimer;
let isRunning;
let isPaused;
let isGameOver;

const directions = {
  up: { x: 0, y: -1 },
  left: { x: -1, y: 0 },
  down: { x: 0, y: 1 },
  right: { x: 1, y: 0 },
};

const keyDirections = {
  w: directions.up,
  a: directions.left,
  s: directions.down,
  d: directions.right,
  arrowup: directions.up,
  arrowleft: directions.left,
  arrowdown: directions.down,
  arrowright: directions.right,
};

bestEl.textContent = best;
resetGame();
draw();

function resetGame() {
  snake = startSnake.map((segment) => ({ ...segment }));
  direction = { x: 1, y: 0 };
  queuedDirection = { ...direction };
  score = 0;
  isRunning = false;
  isPaused = false;
  isGameOver = false;
  scoreEl.textContent = score;
  pauseButton.textContent = "Pause";
  placeFood();
  showOverlay("Snake", "Use WASD or the D-pad to start");
  stopLoop();
  draw();
}

function startGame() {
  if (isGameOver) {
    resetGame();
  }

  isRunning = true;
  isPaused = false;
  pauseButton.textContent = "Pause";
  hideOverlay();
  stopLoop();
  gameTimer = window.setInterval(tick, 105);
}

function stopLoop() {
  if (gameTimer) {
    window.clearInterval(gameTimer);
    gameTimer = null;
  }
}

function tick() {
  direction = queuedDirection;
  const head = {
    x: snake[0].x + direction.x,
    y: snake[0].y + direction.y,
  };
  const willEat = head.x === food.x && head.y === food.y;

  if (hitWall(head) || hitSnake(head, willEat)) {
    endGame();
    return;
  }

  snake.unshift(head);

  if (willEat) {
    score += 10;
    scoreEl.textContent = score;
    if (score > best) {
      best = score;
      bestEl.textContent = best;
      localStorage.setItem("snake-best", String(best));
    }
    placeFood();
  } else {
    snake.pop();
  }

  draw();
}

function draw() {
  ctx.fillStyle = "#07120b";
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  drawGrid();
  drawFood();
  drawSnake();
}

function drawGrid() {
  ctx.strokeStyle = "rgba(122, 180, 88, 0.16)";
  ctx.lineWidth = 1;

  for (let i = 0; i <= tileCount; i += 1) {
    const pos = i * tileSize;
    ctx.beginPath();
    ctx.moveTo(pos, 0);
    ctx.lineTo(pos, canvas.height);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, pos);
    ctx.lineTo(canvas.width, pos);
    ctx.stroke();
  }
}

function drawSnake() {
  snake.forEach((segment, index) => {
    const inset = index === 0 ? 2 : 3;
    ctx.fillStyle = index === 0 ? "#d7ff82" : "#8ee05f";
    ctx.fillRect(
      segment.x * tileSize + inset,
      segment.y * tileSize + inset,
      tileSize - inset * 2,
      tileSize - inset * 2
    );

    if (index === 0) {
      ctx.fillStyle = "#23301b";
      const eyeSize = 3;
      const eyeOffset = 7;
      ctx.fillRect(segment.x * tileSize + eyeOffset, segment.y * tileSize + eyeOffset, eyeSize, eyeSize);
      ctx.fillRect(segment.x * tileSize + tileSize - eyeOffset - eyeSize, segment.y * tileSize + eyeOffset, eyeSize, eyeSize);
    }
  });
}

function drawFood() {
  ctx.fillStyle = "#ff5555";
  ctx.fillRect(food.x * tileSize + 4, food.y * tileSize + 4, tileSize - 8, tileSize - 8);
  ctx.fillStyle = "#ffd166";
  ctx.fillRect(food.x * tileSize + 9, food.y * tileSize + 9, tileSize - 18, tileSize - 18);
}

function placeFood() {
  do {
    food = {
      x: Math.floor(Math.random() * tileCount),
      y: Math.floor(Math.random() * tileCount),
    };
  } while (snake.some((segment) => segment.x === food.x && segment.y === food.y));
}

function hitWall(position) {
  return position.x < 0 || position.x >= tileCount || position.y < 0 || position.y >= tileCount;
}

function hitSnake(position, willEat) {
  return snake.some((segment, index) => {
    const isTail = index === snake.length - 1;
    return (!isTail || willEat) && segment.x === position.x && segment.y === position.y;
  });
}

function endGame() {
  isGameOver = true;
  isRunning = false;
  stopLoop();
  showOverlay("Game Over", "Press Restart or choose a direction");
}

function setDirection(nextDirection) {
  const reversing = nextDirection.x + direction.x === 0 && nextDirection.y + direction.y === 0;
  if (reversing && !isGameOver) {
    return;
  }

  queuedDirection = nextDirection;
  if (isGameOver) {
    resetGame();
    queuedDirection = nextDirection;
  }

  if (!isRunning || isPaused) {
    startGame();
  }
}

function togglePause() {
  if (isGameOver || !isRunning) {
    return;
  }

  isPaused = !isPaused;
  if (isPaused) {
    stopLoop();
    pauseButton.textContent = "Resume";
    showOverlay("Paused", "Press Space or Resume");
  } else {
    pauseButton.textContent = "Pause";
    hideOverlay();
    startGame();
  }
}

function showOverlay(title, copy) {
  overlayTitle.textContent = title;
  overlayCopy.textContent = copy;
  overlay.classList.remove("hidden");
}

function hideOverlay() {
  overlay.classList.add("hidden");
}

window.addEventListener("keydown", (event) => {
  const key = event.key.toLowerCase();

  if (keyDirections[key]) {
    event.preventDefault();
    setDirection(keyDirections[key]);
  }

  if (event.code === "Space") {
    event.preventDefault();
    togglePause();
  }
});

touchButtons.forEach((button) => {
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    const nextDirection = directions[button.dataset.direction];
    if (nextDirection) {
      setDirection(nextDirection);
    }
  });
});

restartButton.addEventListener("click", resetGame);
pauseButton.addEventListener("click", togglePause);
