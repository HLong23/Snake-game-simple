const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreText = document.getElementById("score");
const bestText = document.getElementById("best");
const gameOverDiv = document.getElementById("gameOver");
const menu = document.getElementById("menu");

const box = 20;
const canvasSize = 400;

let snake, food, obstacles;
let direction = null;
let nextDirection = null;
let score;
let game;
let started = false;
let speed = 150;
let foodPulse = 0;

let bestScore = localStorage.getItem("bestScore") || 0;
bestText.innerText = "Best: " + bestScore;

function initGame(level) {
    snake = [{ x: 200, y: 200 }];
    direction = null;
    nextDirection = null;
    started = false;
    score = 0;
    foodPulse = 0;

    obstacles = generateObstacles(level);
    food = randomFood();

    speed = level === "easy" ? 150 : level === "medium" ? 120 : 90;

    scoreText.innerText = "Score: 0";
    gameOverDiv.style.display = "none";

    clearInterval(game);
    game = setInterval(draw, speed);
}

function startGame(level) {
    menu.style.display = "none";
    initGame(level);
}

document.addEventListener("keydown", function (e) {
    if (!started) started = true;

    if (e.key === "ArrowLeft" && direction !== "RIGHT") nextDirection = "LEFT";
    if (e.key === "ArrowUp" && direction !== "DOWN") nextDirection = "UP";
    if (e.key === "ArrowRight" && direction !== "LEFT") nextDirection = "RIGHT";
    if (e.key === "ArrowDown" && direction !== "UP") nextDirection = "DOWN";
});

function draw() {
    update();
    render();
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

function drawGrid() {
    ctx.strokeStyle = "#222";
    for (let i = 0; i < canvasSize; i += box) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i, canvasSize);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvasSize, i);
        ctx.stroke();
    }
}
function update() {
    if (!started) return;

    direction = nextDirection || direction;

    let snakeX = snake[0].x;
    let snakeY = snake[0].y;

    if (direction === "LEFT") snakeX -= box;
    if (direction === "UP") snakeY -= box;
    if (direction === "RIGHT") snakeX += box;
    if (direction === "DOWN") snakeY += box;

    let newHead = { x: snakeX, y: snakeY };

    // va chạm
    if (
        snakeX < 0 || snakeY < 0 ||
        snakeX >= canvasSize || snakeY >= canvasSize ||
        collision(newHead, snake) ||
        collision(newHead, obstacles)
    ) {
        return gameOver();
    }

    // ăn
    if (snakeX === food.x && snakeY === food.y) {
        applyFood();
        food = randomFood();
    } else {
        snake.pop();
    }

    snake.unshift(newHead);
}

function render() {
    ctx.clearRect(0, 0, canvasSize, canvasSize);

    drawGrid();
    drawFood();
    drawObstacles();

    for (let i = 0; i < snake.length; i++) {
        let color = i === 0 ? "#00ff99" : "#00cc66";
        drawRoundedRect(snake[i].x + 1, snake[i].y + 1, 18, 5, color);
    }
}

function randomFood() {
    let newFood;
    do {
        newFood = {
            x: Math.floor(Math.random() * (canvasSize / box)) * box,
            y: Math.floor(Math.random() * (canvasSize / box)) * box,
            type: Math.random() < 0.2 ? "bonus" : "normal"
        };
    } while (
        collision(newFood, snake) ||
        collision(newFood, obstacles)
        );
    return newFood;
}

function applyFood() {
    if (food.type === "bonus") score += 3;
    else score++;

    scoreText.innerText = "Score: " + score;

    if (score > bestScore) {
        bestScore = score;
        localStorage.setItem("bestScore", bestScore);
        bestText.innerText = "Best: " + bestScore;
    }
}

function drawFood() {
    foodPulse += 0.1;
    let size = 14 + Math.sin(foodPulse) * 3;

    ctx.fillStyle = food.type === "bonus" ? "gold" : "red";
    ctx.beginPath();
    ctx.arc(food.x + 10, food.y + 10, size / 2, 0, Math.PI * 2);
    ctx.fill();
}

function generateObstacles(level) {
    let obs = [];
    let count = level === "easy" ? 0 : level === "medium" ? 5 : 10;

    for (let i = 0; i < count; i++) {
        obs.push({
            x: Math.floor(Math.random() * (canvasSize / box)) * box,
            y: Math.floor(Math.random() * (canvasSize / box)) * box
        });
    }
    return obs;
}

function drawObstacles() {
    ctx.fillStyle = "gray";
    obstacles.forEach(o => {
        ctx.fillRect(o.x, o.y, box, box);
    });
}

function collision(head, body) {
    return body.some(item => item.x === head.x && item.y === head.y);
}

function gameOver() {
    clearInterval(game);
    gameOverDiv.style.display = "block";
}

function restartGame() {
    menu.style.display = "block";
    gameOverDiv.style.display = "none";
}