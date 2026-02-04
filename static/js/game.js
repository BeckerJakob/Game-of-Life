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

        // Interaction Mode (Refactored to Middle Click Pan)
        this.isPanning = false;
        this.isPainting = false;

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

        // Prevent default context menu on right click (optional, but good if we used right click)
        // Prevent scroll on middle click
        this.canvas.addEventListener('mousedown', (e) => {
            if (e.button === 1) e.preventDefault();
        });

        // UI Elements
        this.btnToggle = document.getElementById('btn-toggle');
        this.btnRandom = document.getElementById('btn-random');
        this.btnReset = document.getElementById('btn-clear');
        this.btnHelp = document.getElementById('btn-help');
        this.modalHelp = document.getElementById('modal-help');
        this.btnCloseHelp = document.getElementById('btn-close-help');

        this.slider = document.getElementById('speed-slider');
        this.genDisplay = document.getElementById('gen-count');
        this.popDisplay = document.getElementById('pop-count');

        this.btnToggle.addEventListener('click', this.toggle);
        this.btnRandom.addEventListener('click', () => this.randomizeVisible());
        this.btnReset.addEventListener('click', this.reset);
        this.slider.addEventListener('input', this.handleSpeedChange);

        // Modal Listeners
        this.btnHelp.addEventListener('click', () => this.modalHelp.classList.remove('hidden'));
        this.btnCloseHelp.addEventListener('click', () => this.modalHelp.classList.add('hidden'));
        this.modalHelp.addEventListener('click', (e) => {
            if (e.target === this.modalHelp) this.modalHelp.classList.add('hidden');
        });

        // Objects Elements
        this.btnObjects = document.getElementById('btn-objects');
        this.modalObjects = document.getElementById('modal-objects');
        this.objectsList = document.getElementById('objects-list');
        this.btnCloseObjects = document.getElementById('btn-close-objects');

        this.btnObjects.addEventListener('click', () => this.modalObjects.classList.remove('hidden'));
        this.btnCloseObjects.addEventListener('click', () => this.modalObjects.classList.add('hidden'));
        this.modalObjects.addEventListener('click', (e) => {
            if (e.target === this.modalObjects) this.modalObjects.classList.add('hidden');
        });

        // Prevent Context Menu (Global)
        window.addEventListener('contextmenu', (e) => e.preventDefault());

        // Patterns Data
        this.patterns = {
            'Stillleben': [
                { name: 'Block', points: [[0, 0], [1, 0], [0, 1], [1, 1]] },
                { name: 'Bienenstock', points: [[1, 0], [2, 0], [0, 1], [3, 1], [1, 2], [2, 2]] },
                { name: 'Boot', points: [[0, 0], [1, 0], [0, 1], [2, 1], [1, 2]] },
                { name: 'Brotlaib', points: [[1, 0], [2, 0], [0, 1], [3, 1], [1, 2], [3, 2], [2, 3]] },
                { name: 'Kübel', points: [[1, 0], [0, 1], [2, 1], [1, 2]] },
                { name: 'Kahn', points: [[1, 0], [0, 1], [2, 1], [1, 2], [3, 2], [2, 3]] },
                { name: 'Teich', points: [[1, 0], [2, 0], [0, 1], [3, 1], [0, 2], [3, 2], [1, 3], [2, 3]] },
                { name: 'Fresser', points: [[0, 0], [1, 0], [0, 1], [2, 1], [2, 2], [2, 3], [3, 3]] }
            ],
            'Oszillatoren': [
                { name: 'Blinker', points: [[0, 0], [1, 0], [2, 0]], period: 2 },
                { name: 'Uhr', points: [[2, 0], [0, 1], [1, 1], [2, 2], [3, 2], [1, 3]], period: 2 }, // Simple Clock 
                { name: 'Kröte', points: [[1, 0], [2, 0], [3, 0], [0, 1], [1, 1], [2, 1]], period: 2 },
                { name: 'Bipole', points: [[0, 0], [1, 0], [0, 1], [1, 1], [2, 2], [3, 2], [2, 3], [3, 3]], period: 2 },
                { name: 'Tripole', points: [[0, 0], [1, 0], [0, 1], [2, 1], [2, 3], [4, 3], [3, 4], [4, 4]], period: 2 }, // Approximation
                { name: 'Pulsator', points: [[2, 0], [7, 0], [0, 1], [1, 1], [3, 1], [4, 1], [5, 1], [6, 1], [8, 1], [9, 1], [2, 2], [7, 2]], period: 15 }, // Pentadecathlon
                { name: 'Tümmler', points: [[0, 0], [1, 0], [2, 0], [4, 0], [5, 0], [6, 0], [0, 1], [6, 1], [2, 2], [4, 2], [1, 3], [2, 3], [4, 3], [5, 3], [0, 4], [6, 4]], period: 14 },
                { name: 'Oktagon', points: [[3, 0], [4, 0], [2, 1], [5, 1], [1, 2], [6, 2], [0, 3], [7, 3], [0, 4], [7, 4], [1, 5], [6, 5], [2, 6], [5, 6], [3, 7], [4, 7]], period: 5 }
            ],
            'Raumschiffe': [
                { name: 'Gleiter', points: [[1, 0], [2, 1], [0, 2], [1, 2], [2, 2]] },
                { name: 'LWSS', points: [[1, 0], [2, 0], [3, 0], [4, 0], [0, 1], [4, 1], [4, 2], [0, 3], [3, 3]] },
                { name: 'MWSS', points: [[1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [0, 1], [5, 1], [5, 2], [0, 3], [4, 3], [2, 4]] },
                { name: 'HWSS', points: [[1, 0], [2, 0], [3, 0], [4, 0], [5, 0], [6, 0], [0, 1], [6, 1], [6, 2], [0, 3], [5, 3], [2, 4], [3, 4]] }
            ]
        };

        this.selectedPattern = null;
        this.selectedPatternCenter = { x: 0, y: 0 };
        this.populateObjects();

        this.hoverGridX = 0;
        this.hoverGridY = 0;

        // Init
        this.resize();
        // this.randomize(); // Start Empty
        this.draw();
    }

    resize() {
        this.canvas.width = window.innerWidth;
        this.canvas.height = window.innerHeight;
        // Optimization: Center initially if empty? 
        // Logic remains same, viewport purely visual now.
        this.draw();
    }

    populateObjects() {
        this.objectsList.innerHTML = '';

        for (const [group, patterns] of Object.entries(this.patterns)) {
            const groupDiv = document.createElement('div');
            groupDiv.className = 'object-group';

            const title = document.createElement('h3');
            title.textContent = group;
            groupDiv.appendChild(title);

            const grid = document.createElement('div');
            grid.className = 'object-grid';

            patterns.forEach(p => {
                const item = document.createElement('div');
                item.className = 'object-item';

                // Create Preview Canvas
                const canvas = document.createElement('canvas');
                canvas.width = 60;
                canvas.height = 60;
                canvas.className = 'preview-canvas';
                this.drawPreview(canvas, p.points);

                const label = document.createElement('span');
                label.textContent = p.name;

                // Prepend canvas and Append label
                item.appendChild(canvas);
                item.appendChild(label);

                // Add Period Info if available
                if (p.period) {
                    const badge = document.createElement('div');
                    badge.className = 'period-badge';
                    badge.textContent = p.period;
                    item.appendChild(badge);
                }

                item.addEventListener('click', (e) => {
                    e.stopPropagation(); // Prevent bubbling
                    // e.preventDefault(); // Stop any default scrolling
                    this.selectedPattern = p;
                    // Calculate center
                    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
                    p.points.forEach(([x, y]) => {
                        if (x < minX) minX = x;
                        if (y < minY) minY = y;
                        if (x > maxX) maxX = x;
                        if (y > maxY) maxY = y;
                    });
                    this.selectedPatternCenter = {
                        x: Math.floor((maxX - minX + 1) / 2),
                        y: Math.floor((maxY - minY + 1) / 2)
                    };
                    this.modalObjects.classList.add('hidden');
                    // Optional: Change cursor?
                });
                grid.appendChild(item);
            });

            groupDiv.appendChild(grid);
            this.objectsList.appendChild(groupDiv);
        }
    }

    drawPreview(canvas, points) {
        const ctx = canvas.getContext('2d');
        const w = canvas.width;
        const h = canvas.height;

        // Calculate bounds
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        points.forEach(([x, y]) => {
            if (x < minX) minX = x;
            if (y < minY) minY = y;
            if (x > maxX) maxX = x;
            if (y > maxY) maxY = y;
        });

        const contentW = maxX - minX + 1;
        const contentH = maxY - minY + 1;

        // Scale to fit (leaving margin)
        const margin = 10;
        const availW = w - margin * 2;
        const availH = h - margin * 2;

        const scaleX = availW / contentW;
        const scaleY = availH / contentH;
        const scale = Math.min(scaleX, scaleY, 10); // Cap max scale for small items

        const drawW = contentW * scale;
        const drawH = contentH * scale;

        const offX = (w - drawW) / 2;
        const offY = (h - drawH) / 2;

        ctx.fillStyle = 'white';
        points.forEach(([x, y]) => {
            // Normalized coordinates
            const nx = x - minX;
            const ny = y - minY;
            ctx.fillRect(offX + nx * scale, offY + ny * scale, scale - 1, scale - 1);
        });
    }

    makeKey(x, y) {
        return `${x},${y}`;
    }

    parseKey(key) {
        const parts = key.split(',');
        return { x: parseInt(parts[0]), y: parseInt(parts[1]) };
    }

    randomizeVisible() {
        this.reset(); // Clear everything first (User Request: "Reset auslösen")

        // Populate ONLY visible area
        const startWorldX = -this.offsetX / this.scale;
        const endWorldX = (this.canvas.width - this.offsetX) / this.scale;
        const startWorldY = -this.offsetY / this.scale;
        const endWorldY = (this.canvas.height - this.offsetY) / this.scale;

        const startCol = Math.floor(startWorldX / this.cellSize);
        const endCol = Math.floor(endWorldX / this.cellSize);
        const startRow = Math.floor(startWorldY / this.cellSize);
        const endRow = Math.floor(endWorldY / this.cellSize);

        for (let i = startCol; i <= endCol; i++) {
            for (let j = startRow; j <= endRow; j++) {
                const key = this.makeKey(i, j);
                // this.grid.delete(key); // Not needed after reset()
                if (Math.random() > 0.85) {
                    this.grid.add(key);
                }
            }
        }
        this.draw();
        this.updateStats();
    }

    reset() {
        this.grid.clear();
        this.generatedChunks.clear();
        this.generation = 0;
        // this.updateChunks(); 
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
        if (e.button === 2) { // Right Click
            e.preventDefault();
            if (this.selectedPattern) {
                // Cancel Object Selection
                this.selectedPattern = null;
                this.isPainting = false;
                this.isPanning = false;
                this.draw();
            } else {
                // Eraser Mode
                this.isErasing = true;
                this.startDragX = e.clientX;
                this.startDragY = e.clientY;
            }
            return;
        }

        if (e.button === 1) { // Middle Mouse Button
            e.preventDefault(); // Prevent scroll cursor
            this.isPanning = true;
            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;
            this.canvas.style.cursor = 'grabbing';
        } else if (e.button === 0) { // Left Mouse Button
            if (this.selectedPattern) {
                // Place Pattern
                this.placePattern(e.clientX, e.clientY);
            } else {
                this.isPainting = true;
                this.startDragX = e.clientX;
                this.startDragY = e.clientY;
            }
        }
    }

    placePattern(screenX, screenY) {
        const rect = this.canvas.getBoundingClientRect();
        const x = screenX - rect.left;
        const y = screenY - rect.top;

        const worldX = (x - this.offsetX) / this.scale;
        const worldY = (y - this.offsetY) / this.scale;

        const gridX = Math.floor(worldX / this.cellSize);
        const gridY = Math.floor(worldY / this.cellSize);

        const cx = this.selectedPatternCenter.x;
        const cy = this.selectedPatternCenter.y;

        this.selectedPattern.points.forEach(([dx, dy]) => {
            this.grid.add(this.makeKey(gridX + dx - cx, gridY + dy - cy));
        });

        // Pattern remains selected until Right Click (handled in handleMouseDown)

        this.draw();
        this.updateStats();
    }

    handleMouseMove(e) {
        // Track hover position for ghost
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const worldX = (x - this.offsetX) / this.scale;
        const worldY = (y - this.offsetY) / this.scale;
        this.hoverGridX = Math.floor(worldX / this.cellSize);
        this.hoverGridY = Math.floor(worldY / this.cellSize);

        if (this.selectedPattern) {
            this.draw(); // Redraw to show ghost
        }

        if (this.isPanning) {
            const dx = e.clientX - this.lastMouseX;
            const dy = e.clientY - this.lastMouseY;

            this.offsetX += dx;
            this.offsetY += dy;

            this.lastMouseX = e.clientX;
            this.lastMouseY = e.clientY;

            this.draw();
        } else if (this.isPainting && !this.selectedPattern) {
            // Paint only if NOT placing object
            const dist = Math.hypot(e.clientX - this.startDragX, e.clientY - this.startDragY);
            if (dist > this.dragThreshold) {
                this.handleCellClick(e.clientX, e.clientY, 'add'); // Force Add
            }
        } else if (this.isErasing) {
            // Erase Logic
            const dist = Math.hypot(e.clientX - this.startDragX, e.clientY - this.startDragY);
            if (dist > this.dragThreshold) {
                this.handleCellClick(e.clientX, e.clientY, 'remove'); // Force Remove
            }
        }
    }

    handleMouseUp(e) {
        if (this.isPanning && e.button === 1) {
            this.isPanning = false;
            this.canvas.style.cursor = 'default';
        } else if (this.isPainting && e.button === 0) {
            this.isPainting = false;
            const dist = Math.hypot(e.clientX - this.startDragX, e.clientY - this.startDragY);
            if (dist < this.dragThreshold) {
                // It was a click, not a drag. Toggle.
                this.handleCellClick(e.clientX, e.clientY, 'toggle');
            }
        } else if (this.isErasing && e.button === 2) {
            this.isErasing = false;
            const dist = Math.hypot(e.clientX - this.startDragX, e.clientY - this.startDragY);
            if (dist < this.dragThreshold) {
                // Click to erase single cell
                this.handleCellClick(e.clientX, e.clientY, 'remove');
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

    handleCellClick(screenX, screenY, mode = 'toggle') {
        const rect = this.canvas.getBoundingClientRect();
        const x = screenX - rect.left;
        const y = screenY - rect.top;

        const worldX = (x - this.offsetX) / this.scale;
        const worldY = (y - this.offsetY) / this.scale;

        const gridX = Math.floor(worldX / this.cellSize);
        const gridY = Math.floor(worldY / this.cellSize);
        const key = this.makeKey(gridX, gridY);

        if (mode === 'add') {
            if (!this.grid.has(key)) {
                this.grid.add(key);
                this.draw();
                this.updateStats();
            }
        } else if (mode === 'remove') {
            if (this.grid.has(key)) {
                this.grid.delete(key);
                this.draw();
                this.updateStats();
            }
        } else { // toggle
            if (this.grid.has(key)) {
                this.grid.delete(key);
            } else {
                this.grid.add(key);
            }
            this.draw();
            this.updateStats();
        }
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
            this.btnToggle.classList.add('running');
            this.runLoop();
        }
    }

    stop() {
        if (this.isRunning) {
            this.isRunning = false;
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

        // Procedural Generation trigger REMOVED
        // this.updateChunks();

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

        // Ghost Preview
        if (this.selectedPattern) {
            const cx = this.selectedPatternCenter.x;
            const cy = this.selectedPatternCenter.y;
            this.ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
            this.selectedPattern.points.forEach(([dx, dy]) => {
                const px = this.hoverGridX + dx - cx;
                const py = this.hoverGridY + dy - cy;
                // Only draw if visible (optimization)
                if (px >= startCol && px <= endCol && py >= startRow && py <= endRow) {
                    this.ctx.fillRect(px * this.cellSize + 0.5, py * this.cellSize + 0.5, this.cellSize - 1, this.cellSize - 1);
                }
            });
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
