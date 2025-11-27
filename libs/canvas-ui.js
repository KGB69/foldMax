/**
 * Canvas UI Manager for VR - Tabbed Interface
 * Renders UI to a canvas texture for display in WebGL
 */

var CanvasUI = {
    canvas: null,
    context: null,
    texture: null,
    mesh: null,
    scene: null,
    buttons: [],
    width: 1024,
    height: 1024,
    currentTab: 'main', // 'main', 'structure', 'ligand', 'display'

    init: function () {
        console.log('[CanvasUI] Initializing...');

        this.canvas = document.createElement('canvas');
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.context = this.canvas.getContext('2d');

        this.texture = new THREE.CanvasTexture(this.canvas);
        this.texture.minFilter = THREE.LinearFilter;

        var material = new THREE.MeshBasicMaterial({
            map: this.texture,
            transparent: true,
            side: THREE.DoubleSide,
            alphaTest: 0.1,
            depthTest: false
        });

        var geometry = new THREE.PlaneGeometry(15, 15);
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.visible = false;
        this.mesh.renderOrder = 999;
        this.mesh.userData = { isCanvasUI: true };

        if (typeof scene !== 'undefined') {
            scene.add(this.mesh);
        }

        this.draw();
        console.log('[CanvasUI] Initialized');
    },

    draw: function () {
        var ctx = this.context;
        var w = this.width;
        var h = this.height;

        ctx.clearRect(0, 0, w, h);

        // Main container
        this.drawRoundedRect(ctx, 50, 50, 924, 924, 40, 'rgba(15, 25, 35, 0.95)');

        // Border
        ctx.lineWidth = 8;
        ctx.strokeStyle = 'rgba(0, 200, 255, 0.7)';
        ctx.stroke();

        // Header with tabs
        this.drawHeader(ctx);

        // Content area based on current tab
        this.drawContent(ctx);

        // Close button (always visible)
        this.registerButton('close', 900, 70, 60, 60, function () { CanvasUI.hide(); });
        this.drawButton(ctx, '✕', 900, 70, 60, 60, 'rgba(255, 50, 50, 0.8)', 40);

        this.texture.needsUpdate = true;
    },

    drawHeader: function (ctx) {
        // Header background
        this.drawRoundedRect(ctx, 50, 50, 924, 100, { tl: 40, tr: 40, bl: 0, br: 0 }, 'rgba(0, 150, 200, 0.3)');

        // Title
        ctx.font = 'bold 50px Arial';
        ctx.fillStyle = '#00ffff';
        ctx.textAlign = 'left';
        ctx.fillText('VR Controls', 80, 110);

        // Tabs (below header)
        var tabY = 170;
        var tabW = 200;
        var tabH = 60;
        var tabGap = 10;
        var startX = 80;

        var tabs = [
            { id: 'main', label: 'Main', color: 'rgba(0, 150, 255, 0.4)' },
            { id: 'structure', label: 'Structure', color: 'rgba(100, 200, 100, 0.4)' },
            { id: 'ligand', label: 'Ligand', color: 'rgba(255, 150, 50, 0.4)' },
            { id: 'display', label: 'Display', color: 'rgba(200, 100, 255, 0.4)' }
        ];

        for (var i = 0; i < tabs.length; i++) {
            var tab = tabs[i];
            var x = startX + i * (tabW + tabGap);
            var isActive = this.currentTab === tab.id;

            var self = this;
            this.registerButton('tab_' + tab.id, x, tabY, tabW, tabH, (function (tabId) {
                return function () { self.switchTab(tabId); };
            })(tab.id));

            var bgColor = isActive ? tab.color : 'rgba(50, 50, 50, 0.3)';
            this.drawButton(ctx, tab.label, x, tabY, tabW, tabH, bgColor, 32);

            // Active indicator
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

        // Section: File Operations
        this.drawSectionTitle(ctx, 'File Operations', x, y);
        y += 60;

        this.registerButton('load_pdb', x, y, btnW, btnH, function () {
            if (typeof ImmersiveMenuExt !== 'undefined') ImmersiveMenuExt.showFileDialog();
        });
        this.drawButton(ctx, '📁 Load PDB File', x, y, btnW, btnH, 'rgba(0, 150, 255, 0.4)');
        y += btnH + gap;

        this.registerButton('enter_pdb', x, y, btnW, btnH, function () {
            console.log('[CanvasUI] Enter PDB ID - TODO: Implement input dialog');
        });
        this.drawButton(ctx, '🔤 Enter PDB ID', x, y, btnW, btnH, 'rgba(0, 150, 255, 0.4)');
        y += btnH + gap + 40;

        // Section: Quick Actions
        this.drawSectionTitle(ctx, 'Quick Actions', x, y);
        y += 60;

        this.registerButton('exit_vr', x, y, btnW, btnH, function () {
            if (typeof PDB !== 'undefined') PDB.render.changeToThreeMode(PDB.MODE_THREE, false);
        });
        this.drawButton(ctx, '🖥️ Exit VR Mode', x, y, btnW, btnH, 'rgba(255, 100, 100, 0.4)');
    },

    drawStructureTab: function (ctx, startY) {
        var btnW = 260;
        var btnH = 80;
        var gap = 25;
        var x = 80;
        var y = startY;

        this.drawSectionTitle(ctx, 'Visualization Mode', x, y);
        y += 60;

        // Row 1
        this.registerButton('sphere', x, y, btnW, btnH, function () {
            if (typeof PDB !== 'undefined') PDB.render.changeStructure(PDB.SPHERE);
        });
        this.drawButton(ctx, 'Sphere', x, y, btnW, btnH, 'rgba(100, 200, 100, 0.4)', 32);

        this.registerButton('stick', x + btnW + gap, y, btnW, btnH, function () {
            if (typeof PDB !== 'undefined') PDB.render.changeStructure(PDB.STICK);
        });
        this.drawButton(ctx, 'Stick', x + btnW + gap, y, btnW, btnH, 'rgba(100, 200, 100, 0.4)', 32);

        this.registerButton('ballrod', x + (btnW + gap) * 2, y, btnW, btnH, function () {
            if (typeof PDB !== 'undefined') PDB.render.changeStructure(PDB.BALL_ROD);
        });
        this.drawButton(ctx, 'Ball & Rod', x + (btnW + gap) * 2, y, btnW, btnH, 'rgba(100, 200, 100, 0.4)', 32);

        y += btnH + gap + 40;

        // Cartoon/Ribbon mode
        this.drawSectionTitle(ctx, 'Representation', x, y);
        y += 60;

        this.registerButton('cartoon', x, y, btnW, btnH, function () {
            console.log('[CanvasUI] Cartoon mode - TODO: Implement');
        });
        this.drawButton(ctx, 'Cartoon', x, y, btnW, btnH, 'rgba(100, 200, 100, 0.4)', 32);

        this.registerButton('surface', x + btnW + gap, y, btnW, btnH, function () {
            console.log('[CanvasUI] Surface mode - TODO: Implement');
        });
        this.drawButton(ctx, 'Surface', x + btnW + gap, y, btnW, btnH, 'rgba(100, 200, 100, 0.4)', 32);
    },

    drawLigandTab: function (ctx, startY) {
        var btnW = 844;
        var btnH = 80;
        var gap = 30;
        var x = 80;
        var y = startY;

        this.drawSectionTitle(ctx, 'Ligand Controls', x, y);
        y += 60;

        this.registerButton('show_ligands', x, y, btnW, btnH, function () {
            console.log('[CanvasUI] Show all ligands - TODO: Implement');
        });
        this.drawButton(ctx, '🔬 Show All Ligands', x, y, btnW, btnH, 'rgba(255, 150, 50, 0.4)');
        y += btnH + gap;

        this.registerButton('hide_ligands', x, y, btnW, btnH, function () {
            console.log('[CanvasUI] Hide ligands - TODO: Implement');
        });
        this.drawButton(ctx, '👁️ Hide Ligands', x, y, btnW, btnH, 'rgba(255, 150, 50, 0.4)');
        y += btnH + gap;

        this.registerButton('highlight_binding', x, y, btnW, btnH, function () {
            console.log('[CanvasUI] Highlight binding site - TODO: Implement');
        });
        this.drawButton(ctx, '✨ Highlight Binding Site', x, y, btnW, btnH, 'rgba(255, 150, 50, 0.4)');
    },

    drawDisplayTab: function (ctx, startY) {
        var btnW = 400;
        var btnH = 80;
        var gap = 24;
        var x = 80;
        var y = startY;

        this.drawSectionTitle(ctx, 'Display Options', x, y);
        y += 60;

        // Row 1
        this.registerButton('show_labels', x, y, btnW, btnH, function () {
            console.log('[CanvasUI] Show labels - TODO: Implement');
        });
        this.drawButton(ctx, '🏷️ Labels', x, y, btnW, btnH, 'rgba(200, 100, 255, 0.4)', 32);

        this.registerButton('show_bonds', x + btnW + gap, y, btnW, btnH, function () {
            console.log('[CanvasUI] Toggle bonds - TODO: Implement');
        });
        this.drawButton(ctx, '🔗 Bonds', x + btnW + gap, y, btnW, btnH, 'rgba(200, 100, 255, 0.4)', 32);

        y += btnH + gap;

        // Row 2
        this.registerButton('show_hbonds', x, y, btnW, btnH, function () {
            console.log('[CanvasUI] Show H-bonds - TODO: Implement');
        });
        this.drawButton(ctx, '⚡ H-Bonds', x, y, btnW, btnH, 'rgba(200, 100, 255, 0.4)', 32);

        this.registerButton('measure', x + btnW + gap, y, btnW, btnH, function () {
            console.log('[CanvasUI] Measurement mode - TODO: Implement');
        });
        this.drawButton(ctx, '📏 Measure', x + btnW + gap, y, btnW, btnH, 'rgba(200, 100, 255, 0.4)', 32);
    },

    drawSectionTitle: function (ctx, title, x, y) {
        ctx.font = 'bold 36px Arial';
        ctx.fillStyle = '#00ddff';
        ctx.textAlign = 'left';
        ctx.fillText(title, x, y);

        // Underline
        ctx.strokeStyle = 'rgba(0, 200, 255, 0.5)';
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.moveTo(x, y + 10);
        ctx.lineTo(x + 300, y + 10);
        ctx.stroke();
    },

    switchTab: function (tabId) {
        this.currentTab = tabId;
        this.draw();
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
        this.buttons.push({ id: id, x: x, y: y, w: w, h: h, callback: callback });
    },

    handleClick: function (uv) {
        if (!uv || !this.mesh.visible) return;

        var cx = uv.x * this.width;
        var cy = (1 - uv.y) * this.height;

        console.log('[CanvasUI] Click at', cx, cy);
        this.drawClick(cx, cy);

        for (var i = 0; i < this.buttons.length; i++) {
            var b = this.buttons[i];
            if (cx >= b.x && cx <= b.x + b.w && cy >= b.y && cy <= b.y + b.h) {
                console.log('[CanvasUI] Button clicked:', b.id);
                this.highlightButton(b);
                if (b.callback) b.callback();
                return;
            }
        }
    },

    handleMove: function (uv) {
        // Disabled for performance
    },

    drawClick: function (x, y) {
        var ctx = this.context;
        ctx.beginPath();
        ctx.arc(x, y, 15, 0, 2 * Math.PI);
        ctx.fillStyle = 'rgba(255, 255, 0, 0.8)';
        ctx.fill();
        this.texture.needsUpdate = true;

        var self = this;
        setTimeout(function () { self.draw(); }, 300);
    },

    highlightButton: function (btn) {
        var ctx = this.context;
        this.drawButton(ctx, '✓', btn.x, btn.y, btn.w, btn.h, 'rgba(0, 255, 0, 0.6)');
        this.texture.needsUpdate = true;
    },

    show: function () {
        if (!this.mesh) return;

        if (!this.mesh.parent && typeof scene !== 'undefined') {
            scene.add(this.mesh);
        }

        this.mesh.visible = true;

        if (typeof camera !== 'undefined') {
            var dist = 6;
            var dir = new THREE.Vector3();
            camera.getWorldDirection(dir);
            var pos = new THREE.Vector3();
            pos.copy(camera.position);
            pos.add(dir.multiplyScalar(dist));
            this.mesh.position.copy(pos);
            this.mesh.lookAt(camera.position);

            console.log('[CanvasUI] Menu shown at:', pos);
        }
    },

    hide: function () {
        if (this.mesh) this.mesh.visible = false;
    },

    toggle: function () {
        if (this.mesh) {
            if (this.mesh.visible) this.hide();
            else this.show();
        }
    }
};

window.CanvasUI = CanvasUI;
