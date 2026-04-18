const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreText = document.getElementById("score");
const bestText = document.getElementById("best");
const gameOverDiv = document.getElementById("gameOver");

const box = 20;
const canvasSize = 400;

let snake;
let food;
let direction;
let score;
let game;
let foodPulse = 0;

let bestScore = localStorage.getItem("bestScore") || 0;
bestText.innerText = "Best: " + bestScore;

function initGame() {
    snake = [{ x: 200, y: 200 }];
    direction = "UP";
    score = 0;
    food = randomFood();

    scoreText.innerText = "Score: 0";
    gameOverDiv.style.display = "none";

    clearInterval(game);
    game = setInterval(draw, 150);
}

function randomFood() {
    return {
        x: Math.floor(Math.random() * 20) * box,
        y: Math.floor(Math.random() * 20) * box
    };
}

document.addEventListener("keydown", changeDirection);

function changeDirection(e) {
    if (e.key === "ArrowLeft" && direction !== "RIGHT") direction = "LEFT";
    if (e.key === "ArrowUp" && direction !== "DOWN") direction = "UP";
    if (e.key === "ArrowRight" && direction !== "LEFT") direction = "RIGHT";
    if (e.key === "ArrowDown" && direction !== "UP") direction = "DOWN";
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

function drawFood() {
    foodPulse += 0.1;
    let size = 14 + Math.sin(foodPulse) * 3;

    ctx.fillStyle = "red";
    ctx.beginPath();
    ctx.arc(food.x + 10, food.y + 10, size / 2, 0, Math.PI * 2);
    ctx.fill();
}

function draw() {
    ctx.clearRect(0, 0, canvasSize, canvasSize);

    drawGrid();
    drawFood();

    for (let i = 0; i < snake.length; i++) {
        let color;
        if (i === 0) {
            color = "#00ff99";
        } else {
            color = "#00cc66";
        }
        drawRoundedRect(snake[i].x + 1, snake[i].y + 1, 18, 5, color);
    }

    let snakeX = snake[0].x;
    let snakeY = snake[0].y;

    if (direction === "LEFT") snakeX -= box;
    if (direction === "UP") snakeY -= box;
    if (direction === "RIGHT") snakeX += box;
    if (direction === "DOWN") snakeY += box;

    if (snakeX === food.x && snakeY === food.y) {
        score++;
        scoreText.innerText = "Score: " + score;

        if (score > bestScore) {
            bestScore = score;
            localStorage.setItem("bestScore", bestScore);
            bestText.innerText = "Best: " + bestScore;
        }

        food = randomFood();
    } else {
        snake.pop();
    }

    let newHead = { x: snakeX, y: snakeY };

    if (snakeX < 0 || snakeY < 0 || snakeX >= canvasSize || snakeY >= canvasSize || collision(newHead, snake)) {
        clearInterval(game);
        gameOverDiv.style.display = "block";
        return;
    }

    snake.unshift(newHead);
}

function collision(head, body) {
    for (let item of body) {
        if (head.x === item.x && head.y === item.y) return true;
    }
    return false;
}

function restartGame() {
    initGame();
}

initGame();