/**
 * Radial Menu Component for A-Frame
 * Canvas-based 3D menu with PDB input, representation modes, and loading effects
 */

AFRAME.registerComponent('radial-menu', {
    schema: {},

    init: function () {
        console.log('[RadialMenu] Initializing...');

        // Menu state
        this.isOpen = false;
        this.currentTab = 'main';
        this.selectedIndex = -1;
        this.buttons = [];
        this.isLoading = false;
        this.loadingProgress = 0;
        this.loadingRotation = 0;
        this.menuDistance = 2.4; // Distance from camera in meters (user calibrated)

        // Input mode state
        this.isInputMode = false;
        this.currentInput = '';
        this.maxInputLength = 4;

        // Canvas setup
        this.canvas = document.createElement('canvas');
        this.canvas.width = 1024;
        this.canvas.height = 1024;
        this.ctx = this.canvas.getContext('2d');

        // Create texture and mesh
        this.texture = new THREE.CanvasTexture(this.canvas);
        this.texture.minFilter = THREE.LinearFilter;

        var material = new THREE.MeshBasicMaterial({
            map: this.texture,
            transparent: true,
            side: THREE.DoubleSide,
            alphaTest: 0.1,
            depthTest: true, // Enable depth testing so lasers appear correctly
            depthWrite: true
        });

        var geometry = new THREE.PlaneGeometry(3, 3);
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.visible = false;
        this.mesh.renderOrder = 100; // Lower order so lasers render on top
        this.mesh.userData = { isRadialMenu: true };
        this.mesh.classList = ['clickable']; // Enable VR raycaster interaction

        // Add to entity
        this.el.setObject3D('menu', this.mesh);
        this.el.classList.add('clickable'); // Make entity clickable too

        // Create dimmer sphere
        this.createDimmer();

        // Setup event listeners
        this.setupEventListeners();

        // Initial draw
        this.draw();

        console.log('[RadialMenu] Initialized');
    },

    setupVRControls: function () {
        var self = this;

        // Get controller entities
        var leftController = document.querySelector('[oculus-touch-controls="hand: left"]');
        var rightController = document.querySelector('[oculus-touch-controls="hand: right"]');

        if (!leftController || !rightController) {
            console.log('[RadialMenu] VR controllers not found, skipping VR bindings');
            return;
        }

        console.log('[RadialMenu] Setting up VR controller bindings');

        // Right controller - Menu control
        rightController.addEventListener('bbuttondown', function () {
            console.log('[RadialMenu] B button pressed - toggling menu');
            self.toggle();
        });

        rightController.addEventListener('abuttondown', function () {
            if (self.isOpen) {
                if (self.isInputMode) {
                    console.log('[RadialMenu] A button - canceling input');
                    self.cancelInput();
                } else {
                    console.log('[RadialMenu] A button - closing menu');
                    self.hide();
                }
            }
        });

        rightController.addEventListener('triggerdown', function () {
            if (self.isOpen && !self.isInputMode) {
                console.log('[RadialMenu] Trigger - selecting item');
                self.selectCurrent();
            }
        });

        // Thumbstick navigation
        rightController.addEventListener('thumbstickmoved', function (evt) {
            if (!self.isOpen || self.isInputMode) return;

            var x = evt.detail.x;
            var y = evt.detail.y;
            var threshold = 0.5;

            if (Math.abs(x) > threshold || Math.abs(y) > threshold) {
                if (Math.abs(y) > Math.abs(x)) {
                    if (y > threshold) {
                        self.navigate('down');
                    } else if (y < -threshold) {
                        self.navigate('up');
                    }
                } else {
                    if (x > threshold) {
                        self.navigate('right');
                    } else if (x < -threshold) {
                        self.navigate('left');
                    }
                }
            }
        });

        // Left controller - Distance adjustment  
        leftController.addEventListener('gripdown', function () {
            if (self.isOpen) {
                self.menuDistance = Math.max(0.3, self.menuDistance - 0.3);
                self.updateMenuPosition();
                console.log('[RadialMenu] Left Grip - Distance: ' + self.menuDistance.toFixed(2) + 'm');
            }
        });

        rightController.addEventListener('gripdown', function () {
            if (self.isOpen) {
                self.menuDistance = Math.min(5.0, self.menuDistance + 0.3);
                self.updateMenuPosition();
                console.log('[RadialMenu] Right Grip - Distance: ' + self.menuDistance.toFixed(2) + 'm');
            }
        });

        console.log('[RadialMenu] VR controller bindings ready');
    },

    createDimmer: function () {
        var dimmerGeo = new THREE.SphereGeometry(10, 32, 32);
        var dimmerMat = new THREE.MeshBasicMaterial({
            color: 0x000000,
            transparent: true,
            opacity: 0.7,
            side: THREE.BackSide,
            depthTest: false
        });
        this.dimmerMesh = new THREE.Mesh(dimmerGeo, dimmerMat);
        this.dimmerMesh.visible = false;
        this.dimmerMesh.renderOrder = 998;
    },

    setupEventListeners: function () {
        var self = this;

        // Keyboard controls
        document.addEventListener('keydown', function (e) {
            if (e.code === 'KeyM') {
                self.toggle();
            } else if (self.isOpen) {
                // Handle input mode
                if (self.isInputMode) {
                    if (e.code === 'Enter') {
                        self.submitInput();
                        e.preventDefault();
                    } else if (e.code === 'Escape') {
                        self.cancelInput();
                        e.preventDefault();
                    } else if (e.code === 'Backspace') {
                        self.currentInput = self.currentInput.slice(0, -1);
                        self.draw();
                        e.preventDefault();
                    } else if (e.key.length === 1 && self.currentInput.length < self.maxInputLength) {
                        // Capture single character input (letters/numbers)
                        self.currentInput += e.key.toLowerCase();
                        self.draw();
                        e.preventDefault();
                    }
                } else {
                    // Normal navigation mode
                    switch (e.code) {
                        case 'KeyW':
                            self.menuDistance = Math.max(0.3, self.menuDistance - 0.2);
                            self.updateMenuPosition();
                            console.log('[RadialMenu] Distance: ' + self.menuDistance.toFixed(2) + 'm');
                            e.preventDefault();
                            break;
                        case 'KeyS':
                            self.menuDistance = Math.min(20.0, self.menuDistance + 0.2);
                            self.updateMenuPosition();
                            console.log('[RadialMenu] Distance: ' + self.menuDistance.toFixed(2) + 'm');
                            e.preventDefault();
                            break;
                        case 'ArrowUp':
                            self.navigate('up');
                            e.preventDefault();
                            break;
                        case 'ArrowDown':
                            self.navigate('down');
                            e.preventDefault();
                            break;
                        case 'ArrowLeft':
                        case 'KeyA':
                            self.navigate('left');
                            e.preventDefault();
                            break;
                        case 'ArrowRight':
                        case 'KeyD':
                            self.navigate('right');
                            e.preventDefault();
                            break;
                        case 'Enter':
                            self.selectCurrent();
                            e.preventDefault();
                            break;
                        case 'Escape':
                            self.hide();
                            e.preventDefault();
                            break;
                    }
                }
            }
        });

        // VR Controller Events
        this.setupVRControls();

        // Mouse clicks on menu
        this.el.addEventListener('click', function (evt) {
            if (self.isOpen && evt.detail.intersection) {
                var uv = evt.detail.intersection.uv;
                self.handleClick(uv);
            }
        });

        // Loading progress updates
        this.el.sceneEl.addEventListener('pdb-loading-start', function () {
            self.showLoading();
        });

        this.el.sceneEl.addEventListener('pdb-loading-progress', function (evt) {
            self.updateLoadingProgress(evt.detail.progress);
        });

        this.el.sceneEl.addEventListener('pdb-loading-complete', function () {
            self.hideLoading();
        });

        this.el.sceneEl.addEventListener('pdb-loading-error', function (evt) {
            self.showError(evt.detail.error);
        });
    },

    draw: function () {
        var ctx = this.ctx;
        var w = this.canvas.width;
        var h = this.canvas.height;

        // Clear
        ctx.clearRect(0, 0, w, h);
        this.buttons = [];

        if (this.isLoading) {
            this.drawLoadingScreen(ctx);
        } else {
            // Main container
            this.drawRoundedRect(ctx, 50, 50, 924, 924, 40, 'rgba(15, 25, 35, 0.95)');
            ctx.lineWidth = 8;
            ctx.strokeStyle = 'rgba(0, 200, 255, 0.7)';
            ctx.stroke();

            // Header
            this.drawHeader(ctx);

            // Content based on tab
            this.drawContent(ctx);

            // Close button
            this.registerButton('close', 900, 70, 60, 60, () => this.hide());
            this.drawButton(ctx, '✕', 900, 70, 60, 60, 'rgba(255, 50, 50, 0.8)', 40);

            // Selection highlight
            this.drawSelection(ctx);
        }

        this.texture.needsUpdate = true;
    },

    drawLoadingScreen: function (ctx) {
        var w = this.canvas.width;
        var h = this.canvas.height;

        // Background
        this.drawRoundedRect(ctx, 50, 50, 924, 924, 40, 'rgba(15, 25, 35, 0.95)');
        ctx.lineWidth = 8;
        ctx.strokeStyle = 'rgba(0, 200, 255, 0.7)';
        ctx.stroke();

        // Title
        ctx.font = 'bold 50px Arial';
        ctx.fillStyle = '#00ffff';
        ctx.textAlign = 'center';
        ctx.fillText('Loading PDB...', w / 2, 200);

        // Spinning loader
        var centerX = w / 2;
        var centerY = h / 2;
        var radius = 80;

        ctx.save();
        ctx.translate(centerX, centerY);
        ctx.rotate(this.loadingRotation);

        // Draw spinner arcs
        for (var i = 0; i < 8; i++) {
            var angle = (i / 8) * Math.PI * 2;
            var alpha = 1 - (i / 8);
            ctx.strokeStyle = `rgba(0, 200, 255, ${alpha})`;
            ctx.lineWidth = 12;
            ctx.lineCap = 'round';

            var x1 = Math.cos(angle) * (radius - 20);
            var y1 = Math.sin(angle) * (radius - 20);
            var x2 = Math.cos(angle) * radius;
            var y2 = Math.sin(angle) * radius;

            ctx.beginPath();
            ctx.moveTo(x1, y1);
            ctx.lineTo(x2, y2);
            ctx.stroke();
        }

        ctx.restore();

        // Progress text
        if (this.loadingProgress > 0) {
            ctx.font = 'bold 36px Arial';
            ctx.fillStyle = '#ffffff';
            ctx.textAlign = 'center';
            ctx.fillText(Math.round(this.loadingProgress * 100) + '%', centerX, centerY + 120);
        }
    },

    drawHeader: function (ctx) {
        // Background
        this.drawRoundedRect(ctx, 50, 50, 924, 100, { tl: 40, tr: 40, bl: 0, br: 0 }, 'rgba(0, 150, 200, 0.3)');

        // Title
        ctx.font = 'bold 50px Arial';
        ctx.fillStyle = '#00ffff';
        ctx.textAlign = 'left';
        ctx.fillText('Menu', 80, 110);

        // Tabs
        var tabY = 170;
        var tabW = 180;
        var tabH = 60;
        var tabGap = 10;
        var startX = 80;

        var tabs = [
            { id: 'main', label: 'Main', color: 'rgba(0, 150, 255, 0.4)' },
            { id: 'structure', label: 'Structure', color: 'rgba(100, 200, 100, 0.4)' },
            { id: 'ligand', label: 'Ligand', color: 'rgba(255, 150, 50, 0.4)' },
            { id: 'color', label: 'Color', color: 'rgba(200, 100, 255, 0.4)' },
            { id: 'display', label: 'Display', color: 'rgba(255, 200, 0, 0.4)' }
        ];

        for (var i = 0; i < tabs.length; i++) {
            var tab = tabs[i];
            var x = startX + i * (tabW + tabGap);
            var isActive = this.currentTab === tab.id;

            var tabIdClosure = tab.id;
            var self = this;
            this.registerButton('tab_' + tab.id, x, tabY, tabW, tabH, (function (id) {
                return function () { self.switchTab(id); };
            })(tabIdClosure));

            var bgColor = isActive ? tab.color : 'rgba(50, 50, 50, 0.3)';
            this.drawButton(ctx, tab.label, x, tabY, tabW, tabH, bgColor, 28);

            if (isActive) {
                ctx.fillStyle = '#00ffff';
                ctx.fillRect(x, tabY + tabH - 5, tabW, 5);
            }
        }
    },

    drawContent: function (ctx) {
        var contentY = 260;

        switch (this.currentTab) {
            case 'main':
                this.drawMainTab(ctx, contentY);
                break;
            case 'structure':
                this.drawStructureTab(ctx, contentY);
                break;
            case 'ligand':
                this.drawLigandTab(ctx, contentY);
                break;
            case 'color':
                this.drawColorTab(ctx, contentY);
                break;
            case 'display':
                this.drawDisplayTab(ctx, contentY);
                break;
        }
    },

    drawMainTab: function (ctx, startY) {
        var btnW = 844;
        var btnH = 80;
        var gap = 30;
        var x = 80;
        var y = startY;

        // Section title
        this.drawSectionTitle(ctx, 'Load Molecule', x, y);
        y += 80;

        // PDB Input field (visual representation)
        var borderColor = this.isInputMode ? 'rgba(0, 255, 100, 0.8)' : 'rgba(0, 200, 255, 0.6)';
        ctx.fillStyle = 'rgba(30, 30, 30, 0.8)';
        this.drawRoundedRect(ctx, x, y, btnW, btnH, 15, 'rgba(30, 30, 30, 0.8)');
        ctx.lineWidth = this.isInputMode ? 4 : 3;
        ctx.strokeStyle = borderColor;
        ctx.stroke();

        ctx.font = '36px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'left';

        if (this.currentInput.length > 0) {
            ctx.fillText(this.currentInput.toUpperCase(), x + 20, y + 50);
        } else {
            ctx.fillStyle = '#888';
            ctx.fillText(this.isInputMode ? '|' : 'Enter PDB ID (4 characters)', x + 20, y + 50);
        }

        this.registerButton('pdb_input', x, y, btnW, btnH, () => this.activateInput());
        y += btnH + gap;

        // Load button
        this.registerButton('load_pdb', x, y, btnW, btnH, () => this.loadPDB());
        this.drawButton(ctx, '🔍 Load PDB', x, y, btnW, btnH, 'rgba(0, 150, 255, 0.5)', 36);
        y += btnH + gap + 40;

        // Recent PDBs
        this.drawSectionTitle(ctx, 'Recent', x, y);
        y += 70;

        var recentPDBs = this.getRecentPDBs();
        if (recentPDBs.length > 0) {
            for (var i = 0; i < Math.min(3, recentPDBs.length); i++) {
                var pdbId = recentPDBs[i];
                this.registerButton('recent_' + i, x, y, btnW, btnH, (function (id) {
                    return function () { this.loadPDB(id); };
                }.bind(this))(pdbId));
                this.drawButton(ctx, recentPDBs[i], x, y, btnW, btnH, 'rgba(100, 100, 100, 0.4)', 32);
                y += btnH + gap;
            }
        } else {
            ctx.font = 'italic 28px Arial';
            ctx.fillStyle = '#666';
            ctx.textAlign = 'left';
            ctx.fillText('No recent PDBs', x + 20, y + 40);
        }
    },

    drawStructureTab: function (ctx, startY) {
        var btnW = 260;
        var btnH = 80;
        var gap = 30;
        var x = 80;
        var y = startY;

        this.drawSectionTitle(ctx, 'Representation', x, y);
        y += 70;

        // Row 1
        var modes = [
            { id: 'sphere', label: 'Sphere', mode: 3 },
            { id: 'stick', label: 'Stick', mode: 2 },
            { id: 'ballrod', label: 'Ball & Rod', mode: 51 }
        ];

        for (var i = 0; i < modes.length; i++) {
            var xPos = x + i * (btnW + gap);
            var modeValue = modes[i].mode;
            this.registerButton(modes[i].id, xPos, y, btnW, btnH, (function (mode) {
                return function () { this.changeStructureMode(mode); };
            }.bind(this))(modeValue));
            this.drawButton(ctx, modes[i].label, xPos, y, btnW, btnH, 'rgba(100, 200, 100, 0.4)', 32);
        }

        y += btnH + gap + 40;
        this.drawSectionTitle(ctx, 'Cartoon/Ribbon', x, y);
        y += 70;

        // Row 2
        this.registerButton('cartoon', x, y, btnW, btnH, () => this.changeStructureMode(13));
        this.drawButton(ctx, 'Cartoon', x, y, btnW, btnH, 'rgba(100, 200, 100, 0.4)', 32);

        this.registerButton('ribbon', x + btnW + gap, y, btnW, btnH, () => this.changeStructureMode(10));
        this.drawButton(ctx, 'Ribbon', x + btnW + gap, y, btnW, btnH, 'rgba(100, 200, 100, 0.4)', 32);

        this.registerButton('tube', x + (btnW + gap) * 2, y, btnW, btnH, () => this.changeStructureMode(12));
        this.drawButton(ctx, 'Tube', x + (btnW + gap) * 2, y, btnW, btnH, 'rgba(100, 200, 100, 0.4)', 32);
    },

    drawLigandTab: function (ctx, startY) {
        var btnW = 400;
        var btnH = 80;
        var gap = 24;
        var x = 80;
        var y = startY;

        this.drawSectionTitle(ctx, 'Ligand Display', x, y);
        y += 70;

        this.registerButton('lig_show', x, y, btnW, btnH, () => this.changeLigandMode(53));
        this.drawButton(ctx, '🔬 Show Ligands', x, y, btnW, btnH, 'rgba(255, 150, 50, 0.4)');

        this.registerButton('lig_hide', x + btnW + gap, y, btnW, btnH, () => this.changeLigandMode(0));
        this.drawButton(ctx, '👁️ Hide Ligands', x + btnW + gap, y, btnW, btnH, 'rgba(255, 150, 50, 0.4)');
    },

    drawColorTab: function (ctx, startY) {
        var btnW = 400;
        var btnH = 80;
        var gap = 24;
        var x = 80;
        var y = startY;

        this.drawSectionTitle(ctx, 'Color Scheme', x, y);
        y += 70;

        var colorModes = [
            { id: 'element', label: '🌈 By Element', mode: 1 },
            { id: 'chain', label: '🔗 By Chain', mode: 2 }
        ];

        for (var i = 0; i < colorModes.length; i++) {
            var xPos = x + (i % 2) * (btnW + gap);
            var yPos = y + Math.floor(i / 2) * (btnH + gap);

            var colorModeValue = colorModes[i].mode;
            this.registerButton(colorModes[i].id, xPos, yPos, btnW, btnH, (function (mode) {
                return function () { this.changeColorMode(mode); };
            }.bind(this))(colorModeValue));
            this.drawButton(ctx, colorModes[i].label, xPos, yPos, btnW, btnH, 'rgba(200, 100, 255, 0.4)', 32);
        }
    },

    drawDisplayTab: function (ctx, startY) {
        var btnW = 400;
        var btnH = 80;
        var gap = 24;
        var x = 80;
        var y = startY;

        this.drawSectionTitle(ctx, 'Display Options', x, y);
        y += 70;

        this.registerButton('labels', x, y, btnW, btnH, () => this.toggleLabels());
        this.drawButton(ctx, '🏷️ Toggle Labels', x, y, btnW, btnH, 'rgba(255, 200, 0, 0.4)');

        this.registerButton('measure', x + btnW + gap, y, btnW, btnH, () => this.toggleMeasure());
        this.drawButton(ctx, '📏 Measure', x + btnW + gap, y, btnW, btnH, 'rgba(255, 200, 0, 0.4)');
    },

    // Helper drawing functions
    drawSectionTitle: function (ctx, title, x, y) {
        ctx.font = 'bold 36px Arial';
        ctx.fillStyle = '#00ddff';
        ctx.textAlign = 'left';
        ctx.fillText(title, x, y);

        ctx.strokeStyle = 'rgba(0, 200, 255, 0.5)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x, y + 10);
        ctx.lineTo(x + 300, y + 10);
        ctx.stroke();
    },

    drawRoundedRect: function (ctx, x, y, w, h, r, fillStyle) {
        if (typeof r === 'object') {
            var tl = r.tl || 0, tr = r.tr || 0, bl = r.bl || 0, br = r.br || 0;
            ctx.beginPath();
            ctx.moveTo(x + tl, y);
            ctx.lineTo(x + w - tr, y);
            ctx.quadraticCurveTo(x + w, y, x + w, y + tr);
            ctx.lineTo(x + w, y + h - br);
            ctx.quadraticCurveTo(x + w, y + h, x + w - br, y + h);
            ctx.lineTo(x + bl, y + h);
            ctx.quadraticCurveTo(x, y + h, x, y + h - bl);
            ctx.lineTo(x, y + tl);
            ctx.quadraticCurveTo(x, y, x + tl, y);
        } else {
            ctx.beginPath();
            ctx.moveTo(x + r, y);
            ctx.lineTo(x + w - r, y);
            ctx.quadraticCurveTo(x + w, y, x + w, y + r);
            ctx.lineTo(x + w, y + h - r);
            ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
            ctx.lineTo(x + r, y + h);
            ctx.quadraticCurveTo(x, y + h, x, y + h - r);
            ctx.lineTo(x, y + r);
            ctx.quadraticCurveTo(x, y, x + r, y);
        }
        ctx.closePath();
        if (fillStyle) {
            ctx.fillStyle = fillStyle;
            ctx.fill();
        }
    },

    drawButton: function (ctx, text, x, y, w, h, color, fontSize) {
        color = color || 'rgba(0, 150, 255, 0.4)';
        fontSize = fontSize || 36;

        this.drawRoundedRect(ctx, x, y, w, h, 15, color);
        ctx.lineWidth = 3;
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.8)';
        ctx.stroke();

        ctx.font = 'bold ' + fontSize + 'px Arial';
        ctx.fillStyle = '#ffffff';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(text, x + w / 2, y + h / 2);
    },

    registerButton: function (id, x, y, w, h, callback) {
        this.buttons = this.buttons.filter(b => b.id !== id);
        this.buttons.push({ id, x, y, w, h, callback });
    },

    drawSelection: function (ctx) {
        if (this.selectedIndex >= 0 && this.selectedIndex < this.buttons.length) {
            var b = this.buttons[this.selectedIndex];
            ctx.lineWidth = 6;
            ctx.strokeStyle = '#ffff00';
            this.drawRoundedRect(ctx, b.x - 5, b.y - 5, b.w + 10, b.h + 10, 20);
            ctx.stroke();
        }
    },

    // Navigation and interaction
    navigate: function (direction) {
        if (!this.isOpen || this.buttons.length === 0) return;

        if (this.selectedIndex === -1) {
            this.selectedIndex = 0;
        } else {
            if (direction === 'down' || direction === 'right') {
                this.selectedIndex = (this.selectedIndex + 1) % this.buttons.length;
            } else if (direction === 'up' || direction === 'left') {
                this.selectedIndex = (this.selectedIndex - 1 + this.buttons.length) % this.buttons.length;
            }
        }
        this.draw();
    },

    selectCurrent: function () {
        if (!this.isOpen || this.selectedIndex === -1 || !this.buttons[this.selectedIndex]) return;
        var b = this.buttons[this.selectedIndex];
        console.log('[RadialMenu] Selecting:', b.id);
        if (b.callback) b.callback();
    },

    handleClick: function (uv) {
        if (!uv || !this.isOpen) return;

        var cx = uv.x * this.canvas.width;
        var cy = (1 - uv.y) * this.canvas.height;

        for (var i = 0; i < this.buttons.length; i++) {
            var b = this.buttons[i];
            if (cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h) {
                console.log('[RadialMenu] Button clicked:', b.id);
                if (b.callback) b.callback();
                return;
            }
        }
    },

    switchTab: function (tabId) {
        this.currentTab = tabId;
        this.selectedIndex = -1;
        this.draw();
    },

    // PDB functions
    activateInput: function () {
        this.isInputMode = true;
        this.currentInput = '';
        console.log('[RadialMenu] Input mode activated');
        this.draw();
    },

    submitInput: function () {
        if (this.currentInput.length === 4) {
            console.log('[RadialMenu] Submitting PDB:', this.currentInput);
            this.loadPDB(this.currentInput);
            this.isInputMode = false;
            this.currentInput = '';
        } else {
            console.log('[RadialMenu] Invalid PDB ID length:', this.currentInput.length);
        }
        this.draw();
    },

    cancelInput: function () {
        console.log('[RadialMenu] Input cancelled');
        this.isInputMode = false;
        this.currentInput = '';
        this.draw();
    },

    showPDBInput: function () {
        var pdbId = prompt('Enter PDB ID (4 characters):');
        if (pdbId && pdbId.length === 4) {
            this.loadPDB(pdbId);
        }
    },

    loadPDB: function (pdbId) {
        pdbId = pdbId || prompt('Enter PDB ID:');
        if (!pdbId || pdbId.length !== 4) return;

        console.log('[RadialMenu] Loading PDB:', pdbId);
        this.hide();

        // Emit loading start event
        this.el.sceneEl.emit('pdb-loading-start', { pdbId });

        // Get molecular renderer component
        var molRenderer = document.querySelector('[molecular-renderer]');
        if (molRenderer && molRenderer.components['molecular-renderer']) {
            molRenderer.components['molecular-renderer'].loadMolecule(pdbId);
        }

        // Save to recent
        this.saveRecentPDB(pdbId);
    },

    getRecentPDBs: function () {
        try {
            return JSON.parse(localStorage.getItem('vrmol_recent_pdbs') || '[]');
        } catch (e) {
            return [];
        }
    },

    saveRecentPDB: function (pdbId) {
        try {
            var recent = this.getRecentPDBs();
            recent = recent.filter(id => id !== pdbId);
            recent.unshift(pdbId);
            recent = recent.slice(0, 5);
            localStorage.setItem('vrmol_recent_pdbs', JSON.stringify(recent));
        } catch (e) {
            console.warn('[RadialMenu] Could not save to localStorage');
        }
    },

    // Structure mode functions
    changeStructureMode: function (mode) {
        if (typeof PDB === 'undefined' || !PDB.controller) return;
        console.log('[RadialMenu] Changing structure mode to:', mode);
        PDB.config.mainMode = mode;
        PDB.controller.refreshGeometryByMode(mode);
        this.hide();
    },

    changeLigandMode: function (mode) {
        if (typeof PDB === 'undefined' || !PDB.controller) return;
        console.log('[RadialMenu] Changing ligand mode to:', mode);
        PDB.config.hetMode = mode;
        PDB.controller.refreshGeometryByMode(mode);
        this.hide();
    },

    changeColorMode: function (mode) {
        if (typeof PDB === 'undefined' || !PDB.controller) return;
        console.log('[RadialMenu] Changing color mode to:', mode);
        PDB.controller.switchColorBymode(mode);
    },

    toggleLabels: function () {
        if (typeof PDB === 'undefined' || !PDB.controller) return;
        PDB.controller.showLabel();
    },

    toggleMeasure: function () {
        if (typeof PDB === 'undefined' || !PDB.tool) return;
        PDB.tool.setMeasureDistance();
    },

    // Loading effects
    showLoading: function () {
        this.isLoading = true;
        this.loadingProgress = 0;
        this.draw();
        this.startLoadingAnimation();
    },

    updateLoadingProgress: function (progress) {
        this.loadingProgress = progress;
        this.draw();
    },

    hideLoading: function () {
        this.isLoading = false;
        this.stopLoadingAnimation();
        this.draw();
    },

    showError: function (error) {
        this.isLoading = false;
        this.stopLoadingAnimation();
        alert('Error loading PDB: ' + error);
        this.draw();
    },

    startLoadingAnimation: function () {
        var self = this;
        this.loadingAnimationId = setInterval(function () {
            self.loadingRotation += 0.1;
            self.draw();
        }, 50);
    },

    stopLoadingAnimation: function () {
        if (this.loadingAnimationId) {
            clearInterval(this.loadingAnimationId);
            this.loadingAnimationId = null;
        }
    },

    // Show/hide/toggle
    updateMenuPosition: function () {
        var camera = this.el.sceneEl.camera;
        if (camera) {
            var dir = new THREE.Vector3();
            camera.getWorldDirection(dir);

            var cameraWorldPos = new THREE.Vector3();
            camera.getWorldPosition(cameraWorldPos); // Get camera's world position

            var menuPos = new THREE.Vector3();
            menuPos.copy(cameraWorldPos);
            menuPos.add(dir.multiplyScalar(this.menuDistance));

            this.mesh.position.copy(menuPos);
            this.mesh.lookAt(cameraWorldPos); // Look at world position, not local
        }
    },

    show: function () {
        this.isOpen = true;
        this.mesh.visible = true;
        this.menuDistance = 2.4; // Always reset to default distance

        // Position menu in front of camera
        this.updateMenuPosition();

        var camera = this.el.sceneEl.camera;
        if (camera) {
            // Show dimmer
            if (this.dimmerMesh) {
                camera.add(this.dimmerMesh);
                this.dimmerMesh.visible = true;
            }
        }

        // Disable player controls
        var cameraEl = document.querySelector('#camera');
        if (cameraEl) {
            if (cameraEl.getAttribute('wasd-controls')) {
                cameraEl.setAttribute('wasd-controls', 'enabled', false);
            }
            if (cameraEl.getAttribute('look-controls')) {
                cameraEl.setAttribute('look-controls', 'enabled', false);
            }
        }

        this.draw();
        console.log('[RadialMenu] Shown at distance: ' + this.menuDistance.toFixed(2) + 'm');
    },

    hide: function () {
        this.isOpen = false;
        this.mesh.visible = false;
        this.selectedIndex = -1;

        // Hide dimmer
        if (this.dimmerMesh) {
            this.dimmerMesh.visible = false;
            if (this.dimmerMesh.parent) this.dimmerMesh.parent.remove(this.dimmerMesh);
        }

        // Re-enable player controls
        var cameraEl = document.querySelector('#camera');
        if (cameraEl) {
            if (cameraEl.getAttribute('wasd-controls') !== null) {
                cameraEl.setAttribute('wasd-controls', 'enabled', true);
            }
            if (cameraEl.getAttribute('look-controls') !== null) {
                cameraEl.setAttribute('look-controls', 'enabled', true);
            }
        }

        console.log('[RadialMenu] Hidden');
    },

    toggle: function () {
        if (this.isOpen) {
            this.hide();
        } else {
            this.show();
        }
    },

    tick: function (time, delta) {
        // Update loading animation if active
        if (this.isLoading && this.mesh.visible) {
            // Animation is handled by interval
        }
    }
});

console.log('[RadialMenu] Component registered');
