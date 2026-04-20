const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreText = document.getElementById("score");
const bestText = document.getElementById("best");
const gameOverDiv = document.getElementById("gameOver");
const bgMusic = document.getElementById("bgMusic");
const eatSound = document.getElementById("eatSound");
const toggleBtn = document.getElementById("toggleSound");

const box = 20;
const canvasSize = 400;

let soundOn = true;
let currentLevel = "easy";
let snake, food, obstacles;
let score;
let game;
let started = false;
let speed = 150;
let bestScore = localStorage.getItem("bestScore") || 0;

bestText.innerText = "Best: " + bestScore;

class Snake {
    constructor() {
        this.body = [{ x: 200, y: 200 }];
        this.direction = null;
        this.nextDirection = null;
    }

    setDirection(dir) {
        if (
            (dir === "LEFT" && this.direction !== "RIGHT") ||
            (dir === "RIGHT" && this.direction !== "LEFT") ||
            (dir === "UP" && this.direction !== "DOWN") ||
            (dir === "DOWN" && this.direction !== "UP")
        ) {
            this.nextDirection = dir;
        }
    }

    move() {
        this.direction = this.nextDirection || this.direction;

        let head = { ...this.body[0] };

        if (this.direction === "LEFT") head.x -= box;
        if (this.direction === "RIGHT") head.x += box;
        if (this.direction === "UP") head.y -= box;
        if (this.direction === "DOWN") head.y += box;

        return head;
    }

    grow(newHead) {
        this.body.unshift(newHead);
    }

    shrink() {
        this.body.pop();
    }

    draw() {
        this.body.forEach((s, i) => {
            let color = i === 0 ? "#00ff99" : "#00cc66";
            drawRoundedRect(s.x + 1, s.y + 1, 18, 5, color);
        });
    }
}

class Food {
    constructor(x, y, type = "normal") {
        this.x = x;
        this.y = y;
        this.type = type;
        this.pulse = 0;
    }

    draw() {
        this.pulse += 0.1;
        let size = 14 + Math.sin(this.pulse) * 3;

        ctx.fillStyle = this.type === "bonus" ? "gold" : "red";
        ctx.beginPath();
        ctx.arc(this.x + 10, this.y + 10, size / 2, 0, Math.PI * 2);
        ctx.fill();
    }

    applyEffect() {
        return this.type === "bonus" ? 3 : 1;
    }
}

function initGame(level) {
    snake = new Snake();
    score = 0;
    started = false;
    bgMusic.volume = 0.6;
    eatSound.volume = 1;
    obstacles = generateObstacles(level);
    food = spawnFood();

    speed = level === "easy" ? 150 : level === "medium" ? 120 : 90;

    scoreText.innerText = "Score: 0";
    gameOverDiv.style.display = "none";

    clearInterval(game);
    game = setInterval(draw, speed);
}

function selectLevel(level) {
    currentLevel = level;

    document.querySelectorAll(".buttons button").forEach(btn => {
        btn.classList.remove("active");
    });

    event.target.classList.add("active");

    if (!started || gameOverDiv.style.display === "block") {
        initGame(currentLevel);
    }
}

soundOn = localStorage.getItem("sound") !== "off";
toggleBtn.addEventListener("click", () => {
    soundOn = !soundOn;
    localStorage.setItem("sound", soundOn ? "on" : "off");

    if (soundOn) {
        bgMusic.play().catch(() => {});
    } else {
        bgMusic.pause();
    }
});

function handleAudioStart() {
    if (bgMusic.paused && soundOn) {
        bgMusic.play().catch(() => {});
    }
}

function handleGameStart() {
    if (!started) {
        started = true;
        if (!snake) {
        initGame(currentLevel);
        }
    }
}

function handleDirection(e) {
    if (e.key === "ArrowLeft")  snake.setDirection("LEFT");
    if (e.key === "ArrowRight") snake.setDirection("RIGHT");
    if (e.key === "ArrowUp") snake.setDirection("UP");
    if (e.key === "ArrowDown") snake.setDirection("DOWN");
}

document.addEventListener("keydown", function (e) {
    handleAudioStart();
    handleGameStart();
    handleDirection(e);
});

function draw() {
    update();
    render();
}

function update() {
    if (!started) return;

    let newHead = snake.move();

    if (newHead.x < 0 || newHead.y < 0 ||
        newHead.x >= canvasSize || newHead.y >= canvasSize ||
        collision(newHead, snake.body) ||
        collision(newHead, obstacles)) {
        return gameOver();
    }

    if (newHead.x === food.x && newHead.y === food.y) {

        if (soundOn) {
            eatSound.currentTime = 0;
            eatSound.play();
        }

        score += food.applyEffect();
        scoreText.innerText = "Score: " + score;

        if (score > bestScore) {
            bestScore = score;
            localStorage.setItem("bestScore", bestScore);
            bestText.innerText = "Best: " + bestScore;
        }

        food = spawnFood();
    } else {
        snake.shrink();
    }

    snake.grow(newHead);
}

function render() {
    ctx.clearRect(0, 0, canvasSize, canvasSize);

    drawGrid();
    food.draw();
    drawObstacles();
    snake.draw();
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

function spawnFood() {
    let newFood;

    do {
        newFood = new Food(
            Math.floor(Math.random() * (canvasSize / box)) * box,
            Math.floor(Math.random() * (canvasSize / box)) * box,
            Math.random() < 0.2 ? "bonus" : "normal"
        );
    } while (
        collision(newFood, snake.body) ||
        collision(newFood, obstacles)
        );

    return newFood;
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
    if (!obstacles) return;

    ctx.fillStyle = "gray";
    obstacles.forEach(o => {
        ctx.fillRect(o.x, o.y, box, box);
    });
}

function collision(head, arr) {
    return arr && arr.some(item => item.x === head.x && item.y === head.y);
}

function gameOver() {
    clearInterval(game);
    gameOverDiv.style.display = "block";
}

function restartGame() {
    gameOverDiv.style.display = "none";
    initGame(currentLevel);
}