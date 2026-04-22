const canvas = document.getElementById("game");
const ctx = canvas.getContext("2d");

const scoreText = document.getElementById("score");
const bestText = document.getElementById("best");
const gameOverDiv = document.getElementById("gameOver");
const bgMusic = document.getElementById("bgMusic");
const eatSound = document.getElementById("eatSound");
const hitSound = document.getElementById("hitSound");
const toggleBtn = document.getElementById("toggleSound");
const CANVASSIZE = 600;

let soundOn = localStorage.getItem("sound") !== "off";
let currentLevel = 1;
let snake, foods, map;
let score;
let game;
let started = false;
let paused = false;
let isGameOver = false;
let speed = 150;
let baseSpeed = 150;
let speedMultiplier = 1;

/* Quản lý bản đồ game: thiết lập kích thước theo level, tạo vật cản,
xử lý tọa độ lưới ↔ pixel, kiểm tra va chạm và cung cấp vị trí trống để spawn đối tượng */
class Map {
    constructor(level) {
        this.level = level;
        if (level === 1) {
            this.cols = 10; this.rows = 10;
        } else if (level === 2) {
            this.cols = 15; this.rows = 15;
        } else {
            this.cols = 30; this.rows = 30;
        }
        this.box = CANVASSIZE / this.cols;
        this.obstacles = this.generateObstacles();
    }

    generateObstacles() {
        if (this.level < 3) return [];
        const obs = [];
        const count = 20;
        const forbidden = new Set();
        for (let dx = -2; dx <= 2; dx++)
            for (let dy = -2; dy <= 2; dy++) {
                const cx = Math.floor(this.cols / 2) + dx;
                const cy = Math.floor(this.rows / 2) + dy;
                forbidden.add(`${cx},${cy}`);
            }
        let attempts = 0;
        while (obs.length < count && attempts < 500) {
            attempts++;
            const gx = Math.floor(Math.random() * this.cols);
            const gy = Math.floor(Math.random() * this.rows);
            const key = `${gx},${gy}`;
            if (!forbidden.has(key)) { obs.push({ gx, gy }); forbidden.add(key); }
        }
        return obs;
    }

    isObstacle(gx, gy) {
        return this.obstacles.some(o => o.gx === gx && o.gy === gy);
    }

    toPixel(gx, gy) {
        return { x: gx * this.box, y: gy * this.box };
    }

    drawBackground() {
        ctx.fillStyle = "#020617";
        ctx.fillRect(0, 0, CANVASSIZE, CANVASSIZE);
        ctx.strokeStyle = "#0f2040";
        ctx.lineWidth = 0.5;
        for (let i = 0; i <= this.cols; i++) {
            const px = i * this.box;
            ctx.beginPath(); ctx.moveTo(px, 0); ctx.lineTo(px, CANVASSIZE); ctx.stroke();
        }
        for (let j = 0; j <= this.rows; j++) {
            const py = j * this.box;
            ctx.beginPath(); ctx.moveTo(0, py); ctx.lineTo(CANVASSIZE, py); ctx.stroke();
        }
    }

    drawObstacles() {
        const b = this.box;
        this.obstacles.forEach(o => {
            const { x, y } = this.toPixel(o.gx, o.gy);
            ctx.fillStyle = "#475569";
            ctx.fillRect(x + 1, y + 1, b - 2, b - 2);
            ctx.fillStyle = "#64748b";
            ctx.fillRect(x + 1, y + 1, b - 2, 4);
            ctx.fillRect(x + 1, y + 1, 4, b - 2);
            ctx.fillStyle = "#334155";
            ctx.fillRect(x + 1, y + b - 5, b - 2, 4);
            ctx.fillRect(x + b - 5, y + 1, 4, b - 2);
        });
    }

    wrapGrid(gx, gy) {
        return { gx: (gx + this.cols) % this.cols, gy: (gy + this.rows) % this.rows };
    }

    outOfBounds(gx, gy) {
        return gx < 0 || gy < 0 || gx >= this.cols || gy >= this.rows;
    }

    randomFreeCell(snakeBody, existingFoods) {
        const occupied = new Set();
        snakeBody.forEach(s => occupied.add(`${s.gx},${s.gy}`));
        existingFoods.forEach(f => occupied.add(`${f.gx},${f.gy}`));
        this.obstacles.forEach(o => occupied.add(`${o.gx},${o.gy}`));
        let attempts = 0;
        while (attempts < 1000) {
            const gx = Math.floor(Math.random() * this.cols);
            const gy = Math.floor(Math.random() * this.rows);
            if (!occupied.has(`${gx},${gy}`)) return { gx, gy };
            attempts++;
        }
        return null;
    }
}

/* Quản lý con rắn: xử lý hướng di chuyển, cập nhật vị trí đầu,
kiểm tra va chạm với chính nó, tăng/giảm độ dài và vẽ toàn bộ thân + đầu rắn lên map */
class Snake {
    constructor(map) {
        this.map = map;
        const startGx = Math.floor(map.cols / 2);
        const startGy = Math.floor(map.rows / 2);
        this.body = [{ gx: startGx, gy: startGy }];
        this.direction = null;
        this.nextDirection = null;
    }

    setDirection(dir) {
        const opposites = { LEFT: "RIGHT", RIGHT: "LEFT", UP: "DOWN", DOWN: "UP" };
        if (dir !== opposites[this.direction]) this.nextDirection = dir;
    }

    getNextHead() {
        this.direction = this.nextDirection || this.direction;
        if (!this.direction) return null;
        let { gx, gy } = this.body[0];
        if (this.direction === "LEFT")  gx -= 1;
        if (this.direction === "RIGHT") gx += 1;
        if (this.direction === "UP")    gy -= 1;
        if (this.direction === "DOWN")  gy += 1;
        if (this.map.level === 1) {
            const wrapped = this.map.wrapGrid(gx, gy);
            gx = wrapped.gx; gy = wrapped.gy;
        }
        return { gx, gy };
    }

    grow(newHead) { this.body.unshift(newHead); }

    foodRemove1Tail() { if (this.body.length > 1) this.body.pop(); }

    collidesWithSelf(head) {
        return this.body.some(s => s.gx === head.gx && s.gy === head.gy);
    }

    draw() {
        const b = this.map.box;
        this.body.forEach((s, i) => {
            const { x, y } = this.map.toPixel(s.gx, s.gy);
            const pad = 1, size = b - pad * 2;
            const radius = Math.max(2, size * 0.25);
            if (i === 0) {
                this.drawHead(x + pad, y + pad, size, radius);
            } else {
                const ratio = i / this.body.length;
                const g = Math.round(200 - ratio * 100);
                drawRoundedRect(x + pad, y + pad, size, radius, `rgb(0,${g},80)`);
            }
        });
    }

    // Vẽ đầu
    drawHead(x, y, size, radius) {
        const dir = this.direction || "RIGHT";
        let gx0, gy0, gx1, gy1;
        if (dir === "RIGHT")      { gx0 = x;        gy0 = y; gx1 = x + size; gy1 = y; }
        else if (dir === "LEFT")  { gx0 = x + size; gy0 = y; gx1 = x;        gy1 = y; }
        else if (dir === "DOWN")  { gx0 = x; gy0 = y;        gx1 = x; gy1 = y + size; }
        else                      { gx0 = x; gy0 = y + size; gx1 = x; gy1 = y; }

        const headGrad = ctx.createLinearGradient(gx0, gy0, gx1, gy1);
        headGrad.addColorStop(0, "#00ffaa");
        headGrad.addColorStop(1, "#00cc77");
        ctx.fillStyle = headGrad;
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

        ctx.fillStyle = "rgba(255,255,255,0.18)";
        ctx.beginPath();
        const shineR = size * 0.22;
        let shineCx = x + size / 2, shineCy = y + size / 2;
        if (dir === "RIGHT")      { shineCx = x + size * 0.72; shineCy = y + size * 0.28; }
        else if (dir === "LEFT")  { shineCx = x + size * 0.28; shineCy = y + size * 0.28; }
        else if (dir === "DOWN")  { shineCx = x + size * 0.72; shineCy = y + size * 0.72; }
        else                      { shineCx = x + size * 0.72; shineCy = y + size * 0.28; }
        ctx.arc(shineCx, shineCy, shineR, 0, Math.PI * 2);
        ctx.fill();

        const eyeR   = Math.max(1.5, size * 0.11);
        const pupilR = eyeR * 0.55;
        const front  = size * 0.68, side1 = size * 0.28, side2 = size * 0.72;
        let eye1, eye2;
        if (dir === "RIGHT")      { eye1 = [x + front,          y + side1]; eye2 = [x + front,          y + side2]; }
        else if (dir === "LEFT")  { eye1 = [x + size - front,   y + side1]; eye2 = [x + size - front,   y + side2]; }
        else if (dir === "DOWN")  { eye1 = [x + side1, y + front         ]; eye2 = [x + side2, y + front         ]; }
        else                      { eye1 = [x + side1, y + size - front  ]; eye2 = [x + side2, y + size - front  ]; }

        [eye1, eye2].forEach(([ex, ey]) => {
            ctx.fillStyle = "#e0ffe8"; ctx.beginPath(); ctx.arc(ex, ey, eyeR,   0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "#001a0d"; ctx.beginPath(); ctx.arc(ex, ey, pupilR, 0, Math.PI * 2); ctx.fill();
            ctx.fillStyle = "rgba(255,255,255,0.85)";
            ctx.beginPath(); ctx.arc(ex - pupilR * 0.3, ey - pupilR * 0.3, pupilR * 0.35, 0, Math.PI * 2); ctx.fill();
        });

        if (size >= 16) {
            const tongueLen = size * 0.32, forkLen = size * 0.14, forkSpread = size * 0.12;
            const tongueW = Math.max(1, size * 0.06);
            ctx.strokeStyle = "#ff2255"; ctx.lineWidth = tongueW; ctx.lineCap = "round";
            let tx0, ty0, tx1, ty1;
            const center = size / 2;
            if (dir === "RIGHT")      { tx0 = x + size; ty0 = y + center; tx1 = tx0 + tongueLen; ty1 = ty0; }
            else if (dir === "LEFT")  { tx0 = x;        ty0 = y + center; tx1 = tx0 - tongueLen; ty1 = ty0; }
            else if (dir === "DOWN")  { tx0 = x + center; ty0 = y + size; tx1 = tx0; ty1 = ty0 + tongueLen; }
            else                      { tx0 = x + center; ty0 = y;        tx1 = tx0; ty1 = ty0 - tongueLen; }
            ctx.beginPath(); ctx.moveTo(tx0, ty0); ctx.lineTo(tx1, ty1); ctx.stroke();
            ctx.lineWidth = Math.max(0.8, tongueW * 0.7);
            if (dir === "RIGHT" || dir === "LEFT") {
                const sign = dir === "RIGHT" ? 1 : -1;
                ctx.beginPath(); ctx.moveTo(tx1, ty1); ctx.lineTo(tx1 + sign * forkLen, ty1 - forkSpread); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(tx1, ty1); ctx.lineTo(tx1 + sign * forkLen, ty1 + forkSpread); ctx.stroke();
            } else {
                const sign = dir === "DOWN" ? 1 : -1;
                ctx.beginPath(); ctx.moveTo(tx1, ty1); ctx.lineTo(tx1 - forkSpread, ty1 + sign * forkLen); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(tx1, ty1); ctx.lineTo(tx1 + forkSpread, ty1 + sign * forkLen); ctx.stroke();
            }
        }
    }
}

/* Thức ăn
points > 0 : tăng điểm & kéo dài thân
points < 0 : trừ điểm & rút ngắn thân
points = 0 : không đổi
rate       : trọng số xác suất spawn (tương đối) */
const FOODTYPES = {
    foodAdd1:    { color: "#ef4444", glow: "#ff000080", points:  1, rate: 0.55, label: "+1" },
    foodRemove1: { color: "#a855f7", glow: "#a855f780", points: -1, rate: 0.20, label: "-1" },
    foodAdd3:    { color: "#f59e0b", glow: "#fbbf2480", points:  3, rate: 0.10, label: "+3" },
    foodNothing: { color: "#38bdf8", glow: "#38bdf880", points:  0, rate: 0.15, label: "±0" },
};

/* Quản lý thức ăn: lưu vị trí, loại food (hiệu ứng khác nhau),
tạo hiệu ứng nhấp nháy (pulse) và vẽ food với màu sắc, glow và ký hiệu lên map */
class Food {
    constructor(gx, gy, type = "foodAdd1") {
        this.gx    = gx;
        this.gy    = gy;
        this.type  = type;
        this.pulse = Math.random() * Math.PI * 2;
        this.info  = FOODTYPES[type];
    }

    draw(map) {
        this.pulse += 0.08;
        const { x, y } = map.toPixel(this.gx, this.gy);
        const b  = map.box;
        const cx = x + b / 2, cy = y + b / 2;
        const radius = (b * 0.3) + Math.sin(this.pulse) * (b * 0.05);

        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius * 2);
        grad.addColorStop(0, this.info.glow);
        grad.addColorStop(1, "transparent");
        ctx.fillStyle = grad;
        ctx.beginPath(); ctx.arc(cx, cy, radius * 2, 0, Math.PI * 2); ctx.fill();

        ctx.fillStyle = this.info.color;
        ctx.beginPath(); ctx.arc(cx, cy, radius, 0, Math.PI * 2); ctx.fill();

        if (b >= 30) {
            ctx.fillStyle = "#fff";
            ctx.font = `bold ${Math.max(8, b * 0.2)}px monospace`;
            ctx.textAlign = "center"; ctx.textBaseline = "middle";
            ctx.fillText(this.info.label, cx, cy);
        }
    }
}

function getAvailableFoodTypes(level) {
    if (level === 1) return ["foodAdd1"];
    if (level === 2) return ["foodAdd1", "foodRemove1"];
    return ["foodAdd1", "foodAdd3", "foodRemove1", "foodNothing"];
}

function pickWeightedType(availableTypes) {
    const pool  = availableTypes.map(t => ({ type: t, rate: FOODTYPES[t].rate }));
    const total = pool.reduce((sum, p) => sum + p.rate, 0);
    let r = Math.random() * total;
    for (const p of pool) { r -= p.rate; if (r <= 0) return p.type; }
    return pool[pool.length - 1].type;
}

function spawnFoods(count, ensurePositive = false) {
    const newFoods      = [];
    const types         = getAvailableFoodTypes(currentLevel);
    const positiveTypes = types.filter(t => FOODTYPES[t].points > 0);
    for (let i = 0; i < count; i++) {
        const cell = map.randomFreeCell(snake.body, [...foods, ...newFoods]);
        if (!cell) break;
        const needsGuarantee = ensurePositive && i === count - 1 && !newFoods.some(f => f.info.points > 0);
        const type = needsGuarantee
            ? positiveTypes[Math.floor(Math.random() * positiveTypes.length)]
            : pickWeightedType(types);
        newFoods.push(new Food(cell.gx, cell.gy, type));
    }
    return newFoods;
}

function getFoodCount() {
    if (currentLevel === 1) return 10;
    if (currentLevel === 2) return 5;
    return 3;
}

// high score theo lv
function getBestScore(level) {
    return parseInt(localStorage.getItem(`bestScore_${level}`)) || 0;
}
function setBestScore(level, val) {
    localStorage.setItem(`bestScore_${level}`, val);
}
function updateBestDisplay() {
    bestText.innerText = "Best: " + getBestScore(currentLevel);
}

// khởi động game
function initGame(level) {
    currentLevel = level;
    map        = new Map(level);
    snake      = new Snake(map);
    score      = 0;
    paused     = false;
    isGameOver = false;
    eatSound.volume = 1;
    bgMusic.volume  = 0.6;
    hitSound.volume = 1;
    started = false;
    foods   = [];
    foods   = spawnFoods(getFoodCount(), level > 1);
    speed   = baseSpeed / speedMultiplier;
    scoreText.innerText = "Score: 0";
    updateBestDisplay();
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

function handleAudioStart() {
    if (bgMusic.paused && soundOn) bgMusic.play().catch(() => {});
}

// KEYBOARD
document.addEventListener("keydown", function (e) {
    handleAudioStart();

    if (e.code === "Space" || e.key === "p" || e.key === "P") {
        e.preventDefault();
        if (!started || isGameOver) return restartGame();
        togglePause();
        return;
    }

    const dirMap = { ArrowLeft: "LEFT", ArrowRight: "RIGHT", ArrowUp: "UP", ArrowDown: "DOWN" };
    const dir    = dirMap[e.key];
    if (!dir) return;
    e.preventDefault();

    if (isGameOver) return;

    if (paused) togglePause();

    if (!started) started = true;
    if (snake) snake.setDirection(dir);
});

// Hiển thị mỗi tick
function draw() {
    update();
    render();
}

function update() {
    if (!started || paused) return;

    const newHead = snake.getNextHead();
    if (!newHead) return;

    if (currentLevel > 1 && map.outOfBounds(newHead.gx, newHead.gy)) return gameOver();
    if (map.isObstacle(newHead.gx, newHead.gy))                       return gameOver();
    if (snake.collidesWithSelf(newHead))                               return gameOver();

    const eatenIndex = foods.findIndex(f => f.gx === newHead.gx && f.gy === newHead.gy);

    if (eatenIndex !== -1) {
        const eaten = foods.splice(eatenIndex, 1)[0];

        if (soundOn) { eatSound.currentTime = 0; eatSound.play(); }

        score = Math.max(0, score + eaten.info.points);
        scoreText.innerText = "Score: " + score;

        if (score > getBestScore(currentLevel)) {
            setBestScore(currentLevel, score);
            updateBestDisplay();
        }

        if (eaten.info.points > 0) {
            snake.grow(newHead);
            for (let i = 1; i < eaten.info.points; i++)
                snake.body.push({ ...snake.body[snake.body.length - 1] });
        } else if (eaten.info.points < 0) {
            snake.grow(newHead);
            const removeCount = Math.abs(eaten.info.points) + 1;
            for (let i = 0; i < removeCount; i++) snake.foodRemove1Tail();
        } else {
            snake.grow(newHead);
            snake.foodRemove1Tail();
        }

        for (let i = 0; i < 2 && foods.length > 0; i++)
            foods.splice(Math.floor(Math.random() * foods.length), 1);
        foods.push(...spawnFoods(3, currentLevel > 1));

    } else {
        snake.grow(newHead);
        snake.foodRemove1Tail();
    }
}

function render() {
    map.drawBackground();
    map.drawObstacles();
    foods.forEach(f => f.draw(map));
    snake.draw();

    if (!started) {
        ctx.fillStyle = "rgba(0,0,0,0.55)";
        ctx.fillRect(0, 0, CANVASSIZE, CANVASSIZE);
        ctx.fillStyle    = "#00ff99";
        ctx.font         = `bold ${CANVASSIZE * 0.045}px monospace`;
        ctx.textAlign    = "center";
        ctx.textBaseline = "middle";
        ctx.fillText("Nhấn phím mũi tên để bắt đầu", CANVASSIZE / 2, CANVASSIZE / 2);
    }
}

// Tiện ích
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

function togglePause() {
    paused = !paused;
    if (paused) {
        clearInterval(game);
        renderPauseOverlay();
        if (soundOn) bgMusic.pause();
    } else {
        game = setInterval(draw, speed);
        if (soundOn) bgMusic.play().catch(() => {});
    }
}

function renderPauseOverlay() {
    ctx.fillStyle = "rgba(0,0,0,0.60)";
    ctx.fillRect(0, 0, CANVASSIZE, CANVASSIZE);

    ctx.fillStyle = "#00ff99";
    const bw = CANVASSIZE * 0.06, bh = CANVASSIZE * 0.14;
    const bx = CANVASSIZE / 2 - bw - CANVASSIZE * 0.03;
    const by = CANVASSIZE / 2 - CANVASSIZE * 0.13;
    ctx.fillRect(bx,           by, bw, bh);
    ctx.fillRect(bx + bw * 2, by, bw, bh);

    ctx.fillStyle    = "#00ff99";
    ctx.font         = `bold ${CANVASSIZE * 0.06}px monospace`;
    ctx.textAlign    = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("PAUSED", CANVASSIZE / 2, CANVASSIZE / 2 + CANVASSIZE * 0.12);

    ctx.fillStyle = "rgba(255,255,255,0.50)";
    ctx.font      = `${CANVASSIZE * 0.028}px monospace`;
    ctx.fillText("Space / P  hoặc  ← → ↑ ↓ để tiếp tục", CANVASSIZE / 2, CANVASSIZE / 2 + CANVASSIZE * 0.21);
}

function changeSpeed(value) {
    speedMultiplier = Math.min(3, Math.max(0.5, speedMultiplier + value));
    document.getElementById("speedValue").innerText = speedMultiplier.toFixed(2);
    updateGameSpeed();
}

function updateGameSpeed() {
    if (!game) return;
    clearInterval(game);
    speed = baseSpeed / speedMultiplier;
    game  = setInterval(draw, speed);
}

function gameOver() {
    if (soundOn) hitSound.play();
    isGameOver = true;
    clearInterval(game);
    gameOverDiv.style.display = "flex";
}

function restartGame() {
    gameOverDiv.style.display = "none";
    initGame(currentLevel);
}

initGame(1);