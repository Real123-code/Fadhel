const canvas = document.querySelector("#game-canvas");
const context = canvas.getContext("2d");
const overlay = document.querySelector("#game-overlay");
const startButton = document.querySelector("#start-button");
const playButton = document.querySelector("#play-button");
const scoreElement = document.querySelector("#score");
const bestScoreElement = document.querySelector("#best-score");
const overlayEyebrow = document.querySelector("#overlay-eyebrow");
const overlayTitle = document.querySelector("#overlay-title");
const overlayMessage = document.querySelector("#overlay-message");

const width = canvas.width;
const height = canvas.height;
const playerSize = 22;
const playerSpeed = 340;
const keys = new Set();
const obstacles = [];
let playerX = width / 2 - playerSize / 2;
let score = 0;
let bestScore = loadBestScore();
let spawnTimer = 0;
let elapsed = 0;
let previousTime = 0;
let animationFrame = 0;
let running = false;
let touchDirection = 0;

bestScoreElement.textContent = String(bestScore);
draw();

function loadBestScore() {
  try {
    return Number(localStorage.getItem("neon-square-best")) || 0;
  } catch (error) {
    console.warn("Could not load the saved best score.", error);
    return 0;
  }
}

function saveBestScore(value) {
  try {
    localStorage.setItem("neon-square-best", String(value));
  } catch (error) {
    console.warn("Could not save the best score.", error);
  }
}

function startGame() {
  cancelAnimationFrame(animationFrame);
  obstacles.length = 0;
  playerX = width / 2 - playerSize / 2;
  score = 0;
  elapsed = 0;
  spawnTimer = 0.55;
  previousTime = 0;
  running = true;
  scoreElement.textContent = "0";
  overlay.hidden = true;
  animationFrame = requestAnimationFrame(update);
}

function endGame() {
  running = false;
  if (score > bestScore) {
    bestScore = score;
    bestScoreElement.textContent = String(bestScore);
    saveBestScore(bestScore);
  }

  overlayEyebrow.textContent = "NICE RUN";
  overlayTitle.textContent = "Game over";
  overlayMessage.textContent = `You scored ${score}. Want to try again?`;
  startButton.innerHTML = 'Play again <span aria-hidden="true">→</span>';
  overlay.hidden = false;
}

function update(time) {
  if (!running) return;

  if (previousTime === 0) previousTime = time;
  const delta = Math.min((time - previousTime) / 1000, 0.032);
  previousTime = time;
  elapsed += delta;
  score = Math.floor(elapsed * 10);
  scoreElement.textContent = String(score);

  const movingLeft = keys.has("ArrowLeft") || keys.has("a") || keys.has("A") || touchDirection < 0;
  const movingRight = keys.has("ArrowRight") || keys.has("d") || keys.has("D") || touchDirection > 0;
  if (movingLeft !== movingRight) {
    playerX += (movingRight ? 1 : -1) * playerSpeed * delta;
  }
  playerX = Math.max(0, Math.min(width - playerSize, playerX));

  spawnTimer -= delta;
  if (spawnTimer <= 0) {
    spawnObstacle();
    spawnTimer = Math.max(0.35, 0.95 - elapsed * 0.012) * (0.75 + Math.random() * 0.5);
  }

  const playerY = height - 48;
  const player = { x: playerX, y: playerY, width: playerSize, height: playerSize };
  const speed = 155 + Math.min(elapsed * 5, 230);
  for (let index = obstacles.length - 1; index >= 0; index -= 1) {
    const obstacle = obstacles[index];
    obstacle.y += speed * obstacle.speedScale * delta;
    if (intersects(player, obstacle)) {
      endGame();
      draw();
      return;
    }
    if (obstacle.y > height) obstacles.splice(index, 1);
  }

  draw();
  animationFrame = requestAnimationFrame(update);
}

function spawnObstacle() {
  const size = 17 + Math.random() * 22;
  obstacles.push({
    x: Math.random() * (width - size),
    y: -size,
    width: size,
    height: size,
    speedScale: 0.8 + Math.random() * 0.55,
  });
}

function intersects(first, second) {
  return (
    first.x < second.x + second.width &&
    first.x + first.width > second.x &&
    first.y < second.y + second.height &&
    first.y + first.height > second.y
  );
}

function draw() {
  context.clearRect(0, 0, width, height);
  context.fillStyle = "#0c0c0e";
  context.fillRect(0, 0, width, height);

  context.strokeStyle = "rgba(255, 255, 255, 0.035)";
  context.lineWidth = 1;
  for (let x = 0; x <= width; x += 32) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }
  for (let y = 0; y <= height; y += 32) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(width, y);
    context.stroke();
  }

  for (const obstacle of obstacles) {
    context.fillStyle = "#494950";
    context.fillRect(obstacle.x, obstacle.y, obstacle.width, obstacle.height);
    context.strokeStyle = "#707079";
    context.strokeRect(obstacle.x + 0.5, obstacle.y + 0.5, obstacle.width - 1, obstacle.height - 1);
  }

  const playerY = height - 48;
  context.shadowColor = "#c4f54a";
  context.shadowBlur = 20;
  context.fillStyle = "#c4f54a";
  context.fillRect(playerX, playerY, playerSize, playerSize);
  context.shadowBlur = 0;
  context.strokeStyle = "#e3ffab";
  context.strokeRect(playerX + 0.5, playerY + 0.5, playerSize - 1, playerSize - 1);
}

startButton.addEventListener("click", startGame);
playButton.addEventListener("click", () => {
  document.querySelector("#game").scrollIntoView({ behavior: "smooth" });
  if (!running) startGame();
});

document.addEventListener("keydown", (event) => {
  if (["ArrowLeft", "ArrowRight", "a", "A", "d", "D"].includes(event.key)) {
    event.preventDefault();
    keys.add(event.key);
  }
  if (event.key === " " && !running) {
    event.preventDefault();
    startGame();
  }
});

document.addEventListener("keyup", (event) => keys.delete(event.key));
window.addEventListener("blur", () => keys.clear());

for (const button of document.querySelectorAll(".control-button")) {
  const direction = button.dataset.direction === "left" ? -1 : 1;
  button.addEventListener("pointerdown", (event) => {
    event.preventDefault();
    touchDirection = direction;
    button.setPointerCapture(event.pointerId);
  });
  const release = () => {
    if (touchDirection === direction) touchDirection = 0;
  };
  button.addEventListener("pointerup", release);
  button.addEventListener("pointercancel", release);
  button.addEventListener("lostpointercapture", release);
}
