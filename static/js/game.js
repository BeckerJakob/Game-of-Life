class GameOfLife {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.ctx = this.canvas.getContext('2d');
        this.cellSize = 20;

        // Infinite Grid State
        this.grid = new Set(); // Stores "x,y" strings
        this.generatedChunks = new Set(); // Stores "cx,cy" strings
        this.chunkSize = 32; // cells per chunk - 32x20 = 640px? No 32 cells.

        this.isRunning = false;
        this.generation = 0;
        this.intervalId = null;
        this.tickRate = 1000;
        this.fps = 1;

        // View State
        this.scale = 1.0;
        this.offsetX = 0;
        this.offsetY = 0;
        this.isDragging = false;
        this.lastMouseX = 0;
        this.lastMouseY = 0;
        this.dragThreshold = 5;
        this.startDragX = 0;
        this.startDragY = 0;

        // Bind methods
        this.resize = this.resize.bind(this);
        this.update = this.update.bind(this);
        this.draw = this.draw.bind(this);
        this.toggle = this.toggle.bind(this);
        this.reset = this.reset.bind(this);
        this.handleMouseDown = this.handleMouseDown.bind(this);
        this.handleMouseMove = this.handleMouseMove.bind(this);
        this.handleMouseUp = this.handleMouseUp.bind(this);
        this.handleWheel = this.handleWheel.bind(this);
        this.handleSpeedChange = this.handleSpeedChange.bind(this);

        window.addEventListener('resize', this.resize);
        this.canvas.addEventListener('mousedown', this.handleMouseDown);
        window.addEventListener('mousemove', this.handleMouseMove);
        window.addEventListener('mouseup', this.handleMouseUp);
        this.canvas.addEventListener('wheel', this.handleWheel, { passive: false });

        // UI Elements
        this.btnToggle = document.getElementById('btn-toggle');
        this.btnReset = document.getElementById('btn-clear');
        this.slider = document.getElementById('speed-slider');
        this.genDisplay = document.getElementById('gen-count');
        this.popDisplay = document.getElementById('pop-count');

        this.btnToggle.addEventListener('click', this.toggle);
        this.btnReset.addEventListener('click', this.reset);
        this.slider.addEventListener('input', this.handleSpeedChange);

        // Init
        this.resize();
        this.randomize();
        this.draw();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        // Optimization: Center initially if empty? 
        // Logic remains same, viewport purely visual now.
        this.draw();
    }

    makeKey(x, y) {
        return `${x},${y}`;
    }

    parseKey(key) {
        const parts = key.split(',');
        return { x: parseInt(parts[0]), y: parseInt(parts[1]) };
    }

    randomize() {
        this.grid.clear();
        this.generatedChunks.clear();
        this.generation = 0;
        this.updateChunks();
        this.updateStats();
    }

    reset() {
        this.stop();
        this.grid.clear();
        this.generatedChunks.clear();
        this.generation = 0;
        this.updateChunks();
        this.draw();
        this.updateStats();
    }

    updateChunks() {
        // Calculate visible chunks based on viewport
        const startWorldX = -this.offsetX / this.scale;
        const endWorldX = (this.canvas.width - this.offsetX) / this.scale;
        const startWorldY = -this.offsetY / this.scale;
        const endWorldY = (this.canvas.height - this.offsetY) / this.scale;

        const startChunkX = Math.floor(startWorldX / this.cellSize / this.chunkSize);
        const endChunkX = Math.floor(endWorldX / this.cellSize / this.chunkSize);
        const startChunkY = Math.floor(startWorldY / this.cellSize / this.chunkSize);
        const endChunkY = Math.floor(endWorldY / this.cellSize / this.chunkSize);

        for (let cx = startChunkX - 1; cx <= endChunkX + 1; cx++) {
            for (let cy = startChunkY - 1; cy <= endChunkY + 1; cy++) {
                const chunkKey = `${cx},${cy}`;
                if (!this.generatedChunks.has(chunkKey)) {
                    this.generatedChunks.add(chunkKey);
                    this.generateChunk(cx, cy);
                }
            }
        }
    }

    generateChunk(cx, cy) {
        // Randomly populate this chunk
        const startX = cx * this.chunkSize;
        const startY = cy * this.chunkSize;

        for (let i = 0; i < this.chunkSize; i++) {
            for (let j = 0; j < this.chunkSize; j++) {
                if (Math.random() > 0.85) {
                    this.grid.add(this.makeKey(startX + i, startY + j));
                }
            }
        }
    }

    handleMouseDown(e) {
        this.isDragging = true;
        this.lastMouseX = e.clientX;
        this.lastMouseY = e.clientY;
        this.startDragX = e.clientX;
        this.startDragY = e.clientY;
    }

    handleMouseMove(e) {
        if (this.isDragging) {
            const dx = e.clientX - this.lastMouseX;
            const dy = e.clientY - this.lastMouseY;

            this.offsetX += dx;
            this.offsetY += dy;

            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;

            this.draw();
        }
    }

    handleMouseUp(e) {
        if (this.isDragging) {
            this.isDragging = false;
            const dist = Math.hypot(e.clientX - this.startDragX, e.clientY - this.startDragY);
            if (dist < this.dragThreshold) {
                this.handleCellClick(e.clientX, e.clientY);
            }
        }
    }

    handleWheel(e) {
        e.preventDefault();

        const zoomIntensity = 0.1;
        const delta = e.deltaY > 0 ? -zoomIntensity : zoomIntensity;
        // Limit zoom
        const newScale = Math.max(0.1, Math.min(this.scale + delta, 5.0));

        const rect = this.canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const worldX = (mouseX - this.offsetX) / this.scale;
        const worldY = (mouseY - this.offsetY) / this.scale;

        this.offsetX = mouseX - worldX * newScale;
        this.offsetY = mouseY - worldY * newScale;
        this.scale = newScale;

        this.draw();
    }

    handleCellClick(screenX, screenY) {
        const rect = this.canvas.getBoundingClientRect();
        const x = screenX - rect.left;
        const y = screenY - rect.top;

        const worldX = (x - this.offsetX) / this.scale;
        const worldY = (y - this.offsetY) / this.scale;

        const gridX = Math.floor(worldX / this.cellSize);
        const gridY = Math.floor(worldY / this.cellSize);
        const key = this.makeKey(gridX, gridY);

        if (this.grid.has(key)) {
            this.grid.delete(key);
        } else {
            this.grid.add(key);
        }

        this.draw();
        this.updateStats();
    }

    toggle() {
        if (this.isRunning) {
            this.stop();
        } else {
            this.start();
        }
    }

    start() {
        if (!this.isRunning) {
            this.isRunning = true;
            this.btnToggle.textContent = 'Pause';
            this.btnToggle.classList.add('running');
            this.runLoop();
        }
    }

    stop() {
        if (this.isRunning) {
            this.isRunning = false;
            this.btnToggle.textContent = 'Starten';
            this.btnToggle.classList.remove('running');
            if (this.intervalId) {
                clearTimeout(this.intervalId);
                this.intervalId = null;
            }
        }
    }

    handleSpeedChange(e) {
        const val = parseInt(e.target.value);
        this.tickRate = 1000 / val;

        if (this.isRunning) {
            if (this.intervalId) clearTimeout(this.intervalId);
            this.runLoop();
        }
    }

    runLoop() {
        this.update();
        if (this.isRunning) {
            this.intervalId = setTimeout(() => this.runLoop(), this.tickRate);
        }
    }

    update() {
        // Calculate Active Window (Visible + Buffer)
        // User requested "10 blocks" buffer. Assuming 1 block = 1 chunk (32 cells).
        const bufferChunks = 10;
        const bufferCells = bufferChunks * this.chunkSize;

        const startWorldX = -this.offsetX / this.scale;
        const endWorldX = (this.canvas.width - this.offsetX) / this.scale;
        const startWorldY = -this.offsetY / this.scale;
        const endWorldY = (this.canvas.height - this.offsetY) / this.scale;

        const activeMinX = Math.floor(startWorldX / this.cellSize) - bufferCells;
        const activeMaxX = Math.floor(endWorldX / this.cellSize) + bufferCells;
        const activeMinY = Math.floor(startWorldY / this.cellSize) - bufferCells;
        const activeMaxY = Math.floor(endWorldY / this.cellSize) + bufferCells;

        // Sparse Update Logic restricted to Active Window
        const neighborCounts = new Map();

        // 1. Tally neighbors for Live cells WITHIN active window
        for (const key of this.grid) {
            const { x, y } = this.parseKey(key);

            // Cull logic: If cell is way outside, ignore it (it pauses)
            if (x < activeMinX || x > activeMaxX || y < activeMinY || y > activeMaxY) {
                continue;
            }

            // Check neighbors
            for (let dx = -1; dx <= 1; dx++) {
                for (let dy = -1; dy <= 1; dy++) {
                    if (dx === 0 && dy === 0) continue;
                    const nKey = this.makeKey(x + dx, y + dy);
                    const count = neighborCounts.get(nKey) || 0;
                    neighborCounts.set(nKey, count + 1);
                }
            }
        }

        const nextGrid = new Set();

        // Preserve cells OUTSIDE the active window (Pause them)
        for (const key of this.grid) {
            const { x, y } = this.parseKey(key);
            if (x < activeMinX || x > activeMaxX || y < activeMinY || y > activeMaxY) {
                nextGrid.add(key);
            }
        }

        // 2. Apply Rules to Candidates (neighborCounts keys)
        // Note: neighborCounts only contains cells that are neighbors to active live cells.
        // So we are effectively simulating the active area.
        for (const [key, count] of neighborCounts) {
            const isAlive = this.grid.has(key);
            if (count === 3 || (isAlive && count === 2)) {
                nextGrid.add(key);
            }
        }

        this.grid = nextGrid;
        this.generation++;
        this.draw();
        this.updateStats();
    }

    draw() {
        this.ctx.fillStyle = '#000000';
        this.ctx.save();
        this.ctx.setTransform(1, 0, 0, 1, 0, 0);
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.restore();

        this.ctx.save();
        this.ctx.translate(this.offsetX, this.offsetY);
        this.ctx.scale(this.scale, this.scale);

        // Procedural Generation trigger on draw
        this.updateChunks();

        // Viewport Culling
        // Screen Rect: (0,0) to (width, height)
        // World Rect: (-offsetX, -offsetY) / scale
        const startCol = Math.floor((-this.offsetX) / this.scale / this.cellSize) - 1;
        const endCol = Math.floor((this.canvas.width - this.offsetX) / this.scale / this.cellSize) + 1;
        const startRow = Math.floor((-this.offsetY) / this.scale / this.cellSize) - 1;
        const endRow = Math.floor((this.canvas.height - this.offsetY) / this.scale / this.cellSize) + 1;

        // Draw grid lines
        this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
        this.ctx.lineWidth = 1 / this.scale;

        this.ctx.beginPath();
        for (let i = startCol; i <= endCol; i++) {
            this.ctx.moveTo(i * this.cellSize, startRow * this.cellSize);
            this.ctx.lineTo(i * this.cellSize, endRow * this.cellSize);
        }
        for (let j = startRow; j <= endRow; j++) {
            this.ctx.moveTo(startCol * this.cellSize, j * this.cellSize);
            this.ctx.lineTo(endCol * this.cellSize, j * this.cellSize);
        }
        this.ctx.stroke();

        // Draw Live Cells
        this.ctx.fillStyle = '#ffffff';

        for (const key of this.grid) {
            const { x, y } = this.parseKey(key);
            if (x >= startCol && x <= endCol && y >= startRow && y <= endRow) {
                this.ctx.fillRect(x * this.cellSize + 0.5, y * this.cellSize + 0.5, this.cellSize - 1, this.cellSize - 1);
            }
        }

        this.ctx.restore();
    }

    updateStats() {
        if (this.genDisplay) this.genDisplay.textContent = this.generation;
        if (this.popDisplay) {
            this.popDisplay.textContent = this.grid.size;
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const game = new GameOfLife('universe');
    game.start();
});
