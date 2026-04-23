const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreText = document.getElementById("score");
const bestText = document.getElementById("best");
const gameOverDiv = document.getElementById("gameOver");
const finalScoreText = document.getElementById("finalScore");
const bgMusic = document.getElementById("bgMusic");
const eatSound = document.getElementById("eatSound");
const hitSound = document.getElementById("hitSound");
const toggleBtn = document.getElementById("toggleSound");
const CANVASSIZE = 600;

let soundOn = localStorage.getItem("sound") !== "off";
let currentLevel = 1;
let snake, food, obstacles;
let direction = null;
let nextDirection = null;
let score;
let game;
let started = false;
let speed = 150;
let baseSpeed = 150;
let speedMultiplier = 1;
let foodPulse = 0;

const COLS = 20;
const box = CANVASSIZE / COLS;

let bestScore = parseInt(localStorage.getItem("bestScore")) || 0;
bestText.innerText = "Best: " + bestScore;

function initGame(level) {
    currentLevel = level;
    snake = [{ x: 10, y: 10 }];
    direction = null;
    nextDirection = null;
    started = false;
    score = 0;
    foodPulse = 0;

    obstacles = generateObstacles(level);
    food = randomFood();

    speed = baseSpeed / speedMultiplier;

    scoreText.innerText = "Score: 0";
    gameOverDiv.style.display = "none";

    clearInterval(game);
    game = setInterval(draw, speed);
}

function selectLevel(level) {
    currentLevel = level;
    document.querySelectorAll(".buttons button").forEach(btn => btn.classList.remove("active"));
    event.target.classList.add("active");
    initGame(level);
}

toggleBtn.addEventListener("click", () => {
    soundOn = !soundOn;
    localStorage.setItem("sound", soundOn ? "on" : "off");
    soundOn ? bgMusic.play().catch(() => {}) : bgMusic.pause();
});

document.addEventListener("keydown", function (e) {
    if (bgMusic.paused && soundOn) bgMusic.play().catch(() => {});

    if (!started) started = true;

    if (e.key === "ArrowLeft"  && direction !== "RIGHT") nextDirection = "LEFT";
    if (e.key === "ArrowUp"    && direction !== "DOWN")  nextDirection = "UP";
    if (e.key === "ArrowRight" && direction !== "LEFT")  nextDirection = "RIGHT";
    if (e.key === "ArrowDown"  && direction !== "UP")    nextDirection = "DOWN";
});

function draw() {
    update();
    render();
}

function update() {
    if (!started) return;

    direction = nextDirection || direction;
    if (!direction) return;

    let x = snake[0].x;
    let y = snake[0].y;

    if (direction === "LEFT")  x -= 1;
    if (direction === "UP")    y -= 1;
    if (direction === "RIGHT") x += 1;
    if (direction === "DOWN")  y += 1;

    if (
        x < 0 || y < 0 ||
        x >= COLS || y >= COLS ||
        collision({ x, y }, snake) ||
        collision({ x, y }, obstacles)
    ) {
        return gameOver();
    }

    if (x === food.x && y === food.y) {
        applyFood();
        food = randomFood();
    } else {
        snake.pop();
    }

    snake.unshift({ x, y });
}

function render() {
    ctx.fillStyle = "#020617";
    ctx.fillRect(0, 0, CANVASSIZE, CANVASSIZE);

    drawGrid();
    drawObstacles();
    drawFood();

    for (let i = 0; i < snake.length; i++) {
        const px = snake[i].x * box;
        const py = snake[i].y * box;
        const color = i === 0 ? "#00ff99" : "#00cc66";
        drawRoundedRect(px + 1, py + 1, box - 2, 5, color);
    }

    if (!started) {
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(0, 0, CANVASSIZE, CANVASSIZE);
        ctx.fillStyle = "#00ff99";
        ctx.font = `bold ${CANVASSIZE * 0.045}px monospace`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Nhấn phím mũi tên để bắt đầu", CANVASSIZE / 2, CANVASSIZE / 2);
    }
}

function drawGrid() {
    ctx.strokeStyle = "#0f2040";
    ctx.lineWidth = 0.5;
    for (let i = 0; i <= COLS; i++) {
        const p = i * box;
        ctx.beginPath(); ctx.moveTo(p, 0); ctx.lineTo(p, CANVASSIZE); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(0, p); ctx.lineTo(CANVASSIZE, p); ctx.stroke();
    }
}

function drawFood() {
    foodPulse += 0.1;
    const px = food.x * box + box / 2;
    const py = food.y * box + box / 2;
    const radius = box * 0.3 + Math.sin(foodPulse) * (box * 0.05);

    ctx.fillStyle = food.type === "bonus" ? "#f59e0b" : "red";
    ctx.beginPath();
    ctx.arc(px, py, radius, 0, Math.PI * 2);
    ctx.fill();
}

function drawObstacles() {
    ctx.fillStyle = "#475569";
    obstacles.forEach(o => {
        const px = o.x * box;
        const py = o.y * box;
        ctx.fillRect(px + 1, py + 1, box - 2, box - 2);
    });
}

function drawRoundedRect(x, y, size, radius, color) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + size - radius, y);
    ctx.quadraticCurveTo(x + size, y, x + size, y + radius);
    ctx.lineTo(x + size, y + size - radius);
    ctx.quadraticCurveTo(x + size, y + size, x + size - radius, y + size);
    ctx.lineTo(x + radius, y + size);
    ctx.quadraticCurveTo(x, y + size, x, y + size - radius);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.fill();
}

function randomFood() {
    let newFood;
    do {
        newFood = {
            x: Math.floor(Math.random() * COLS),
            y: Math.floor(Math.random() * COLS),
            type: Math.random() < 0.2 ? "bonus" : "normal"
        };
    } while (
        collision(newFood, snake) ||
        collision(newFood, obstacles)
        );
    return newFood;
}

function applyFood() {
    if (food.type === "bonus") {
        score += 3;
        for (let i = 0; i < 2; i++)
            snake.push({ ...snake[snake.length - 1] });
    } else {
        score++;
    }

    if (soundOn) { eatSound.currentTime = 0; eatSound.play(); }

    scoreText.innerText = "Score: " + score;

    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem("bestScore", bestScore);
        bestText.innerText = "Best: " + bestScore;
    }
}

function generateObstacles(level) {
    const obs = [];
    const count = level === 1 ? 0 : level === 2 ? 5 : 10;
    const forbidden = new Set();
    forbidden.add("10,10");

    let attempts = 0;
    while (obs.length < count && attempts < 500) {
        attempts++;
        const x = Math.floor(Math.random() * COLS);
        const y = Math.floor(Math.random() * COLS);
        const key = `${x},${y}`;
        if (!forbidden.has(key)) {
            obs.push({ x, y });
            forbidden.add(key);
        }
    }
    return obs;
}

function collision(head, body) {
    return body.some(item => item.x === head.x && item.y === head.y);
}

function changeSpeed(value) {
    speedMultiplier = Math.min(3, Math.max(0.5, speedMultiplier + value));
    document.getElementById("speedValue").innerText = speedMultiplier.toFixed(2);
    clearInterval(game);
    speed = baseSpeed / speedMultiplier;
    game = setInterval(draw, speed);
}

function gameOver() {
    if (soundOn) hitSound.play();
    clearInterval(game);
    if (finalScoreText) finalScoreText.innerText = "Điểm của bạn: " + score;
    gameOverDiv.style.display = "block";
}

function restartGame() {
    gameOverDiv.style.display = "none";
    initGame(currentLevel);
}

initGame(1);