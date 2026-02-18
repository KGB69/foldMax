/**
 * VR Main Menu Component for A-Frame
 * Canvas-based 3D panel shown on VR entry — the in-headset equivalent of the 2D splash menu.
 * Auto-shows when VR session starts, dismissed by "Enter VR" button.
 */

AFRAME.registerComponent('vr-main-menu', {
    schema: {},

    init: function () {
        var self = this;
        this.isVisible = false;
        this.buttons = [];   // { x, y, w, h, action }
        this.hovered = -1;

        // Canvas
        this.W = 1024;
        this.H = 1280;
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.W;
        this.canvas.height = this.H;
        this.ctx = this.canvas.getContext('2d');

        // Texture + material
        this.texture = new THREE.CanvasTexture(this.canvas);
        this.texture.minFilter = THREE.LinearFilter;
        this.texture.magFilter = THREE.LinearFilter;

        this.material = new THREE.MeshBasicMaterial({
            map: this.texture,
            transparent: true,
            alphaTest: 0.01,   // Transparent pixels don't render — no white background
            side: THREE.DoubleSide,
            depthTest: true,   // Participate in depth so menu occludes controllers
            depthWrite: false  // Don't write depth (alphaTest handles occlusion for opaque parts)
        });

        // Geometry — portrait panel, 2.0m wide × 2.5m tall
        this.geometry = new THREE.PlaneGeometry(2.0, 2.5);
        this.mesh = new THREE.Mesh(this.geometry, this.material);
        this.mesh.visible = false;
        this.mesh.renderOrder = 1100; // Above controllers (~1000) so menu is always in front
        this.mesh.userData = { isVRMainMenu: true };

        this.el.setObject3D('vr-main-menu', this.mesh);
        this.el.classList.add('clickable');

        // Auto-show when VR session starts
        this.el.sceneEl.addEventListener('enter-vr', function () {
            setTimeout(function () { self.show(); }, 400);
        });

        // Raycaster click
        this.el.addEventListener('click', function (evt) {
            if (!self.isVisible) return;
            var uv = evt.detail && evt.detail.intersection && evt.detail.intersection.uv;
            if (uv) self.handleClick(uv);
        });

        // Raycaster hover for highlight
        this.el.addEventListener('raycaster-intersected', function (evt) {
            if (!self.isVisible) return;
            self._raycaster = evt.detail.el;
        });
        this.el.addEventListener('raycaster-intersected-cleared', function () {
            self._raycaster = null;
            if (self.hovered !== -1) {
                self.hovered = -1;
                self.draw();
            }
        });

        this.draw();

        // Create menu environment (skybox + particles)
        this._createMenuEnvironment();

        console.log('[VRMainMenu] Initialized');
    },

    _createMenuEnvironment: function () {
        var scene = this.el.sceneEl.object3D;

        // ── Dark gradient sky sphere ──
        var skyGeo = new THREE.SphereGeometry(50, 32, 16);
        var skyVert = [
            'varying vec3 vWorldPos;',
            'void main() {',
            '  vec4 wp = modelMatrix * vec4(position, 1.0);',
            '  vWorldPos = wp.xyz;',
            '  gl_Position = projectionMatrix * viewMatrix * wp;',
            '}'
        ].join('\n');
        var skyFrag = [
            'varying vec3 vWorldPos;',
            'void main() {',
            '  float h = normalize(vWorldPos).y;',
            '  vec3 top    = vec3(0.01, 0.02, 0.06);',
            '  vec3 mid    = vec3(0.02, 0.05, 0.10);',
            '  vec3 bottom = vec3(0.01, 0.01, 0.03);',
            '  vec3 col = h > 0.0 ? mix(mid, top, h) : mix(mid, bottom, -h);',
            '  // Subtle teal horizon glow',
            '  float horizon = 1.0 - abs(h);',
            '  col += vec3(0.0, 0.12, 0.10) * pow(horizon, 6.0);',
            '  gl_FragColor = vec4(col, 1.0);',
            '}'
        ].join('\n');
        var skyMat = new THREE.ShaderMaterial({
            vertexShader: skyVert,
            fragmentShader: skyFrag,
            side: THREE.BackSide,
            depthWrite: false
        });
        this._menuSky = new THREE.Mesh(skyGeo, skyMat);
        this._menuSky.renderOrder = -1;
        this._menuSky.visible = false;
        scene.add(this._menuSky);

        // ── Floating particles ──
        var count = 200;
        var positions = new Float32Array(count * 3);
        var colors = new Float32Array(count * 3);
        var sizes = new Float32Array(count);
        for (var i = 0; i < count; i++) {
            positions[i * 3] = (Math.random() - 0.5) * 30;
            positions[i * 3 + 1] = (Math.random() - 0.5) * 20;
            positions[i * 3 + 2] = (Math.random() - 0.5) * 30;
            // Teal to cyan color range
            var t = Math.random();
            colors[i * 3] = t * 0.1;              // R
            colors[i * 3 + 1] = 0.4 + t * 0.4;       // G
            colors[i * 3 + 2] = 0.5 + t * 0.3;       // B
            sizes[i] = Math.random() * 3 + 1;
        }
        var partGeo = new THREE.BufferGeometry();
        partGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
        partGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
        partGeo.setAttribute('size', new THREE.BufferAttribute(sizes, 1));

        var partMat = new THREE.PointsMaterial({
            size: 0.06,
            vertexColors: true,
            transparent: true,
            opacity: 0.6,
            sizeAttenuation: true,
            depthWrite: false,
            blending: THREE.AdditiveBlending
        });
        this._menuParticles = new THREE.Points(partGeo, partMat);
        this._menuParticles.visible = false;
        scene.add(this._menuParticles);

        // Store original positions for animation
        this._particleBasePos = new Float32Array(positions);
    },

    // ── Positioning ──────────────────────────────────────────────────────────
    updatePosition: function () {
        var camera = this.el.sceneEl.camera;
        if (!camera) return;

        var dir = new THREE.Vector3();
        camera.getWorldDirection(dir);

        var camPos = new THREE.Vector3();
        camera.getWorldPosition(camPos);

        // Place 2.2m in front of camera at eye level
        var pos = camPos.clone().add(dir.multiplyScalar(2.2));
        pos.y = camPos.y; // keep at eye level

        this.mesh.position.copy(pos);
        this.mesh.lookAt(camPos);
    },

    // ── Show / Hide ───────────────────────────────────────────────────────────
    show: function () {
        this.isVisible = true;
        this.mesh.visible = true;
        this.updatePosition();
        this.draw();

        // Global flag so annotation-raycaster can bail out
        window.vrMenuOpen = true;

        // Hide molecule entity
        var mol = document.getElementById('molecule-container');
        if (mol) mol.setAttribute('visible', 'false');

        // Hide environment meshes (added directly to Three.js scene root)
        this._hideEnvMeshes();

        // Hide other scene UI entities
        var hideIds = ['radial-menu'];
        this._hiddenEntities = [];
        for (var i = 0; i < hideIds.length; i++) {
            var ent = document.getElementById(hideIds[i]);
            if (ent) {
                ent.setAttribute('visible', 'false');
                this._hiddenEntities.push(ent);
            }
        }
        // Hide vr-debug-panel and vr-console by component selector
        var debugPanels = document.querySelectorAll('[vr-debug-panel], [vr-console]');
        for (var d = 0; d < debugPanels.length; d++) {
            debugPanels[d].setAttribute('visible', 'false');
            this._hiddenEntities.push(debugPanels[d]);
        }

        // Restrict raycasters to menu panel only + enable UV computation
        var leftHand = document.getElementById('left-hand');
        var rightHand = document.getElementById('right-hand');
        if (leftHand) leftHand.setAttribute('raycaster', 'objects: #vr-main-menu; far: 10; computeIntersectionUVs: true');
        if (rightHand) rightHand.setAttribute('raycaster', 'objects: #vr-main-menu; far: 10; computeIntersectionUVs: true');

        // Disable molecule transform controls
        if (mol) mol.removeAttribute('axis-transform-controls');

        console.log('[VRMainMenu] Shown');

        // Show menu environment
        if (this._menuSky) this._menuSky.visible = true;
        if (this._menuParticles) this._menuParticles.visible = true;
    },

    _hideEnvMeshes: function () {
        var scene = this.el.sceneEl.object3D;
        this._hiddenEnvObjects = [];
        var self = this;
        scene.traverse(function (obj) {
            // Hide ShaderMaterial meshes (sky + ground) and lights added by environment-loader
            // but NOT our menu mesh or A-Frame entity wrappers
            if (!obj.isLight && !obj.isMesh) return;
            if (obj === self.mesh) return;
            // Skip A-Frame entity object3Ds (they have el property)
            if (obj.el) return;
            if (obj.visible) {
                obj.visible = false;
                self._hiddenEnvObjects.push(obj);
            }
        });
    },

    _showEnvMeshes: function () {
        if (!this._hiddenEnvObjects) return;
        for (var i = 0; i < this._hiddenEnvObjects.length; i++) {
            this._hiddenEnvObjects[i].visible = true;
        }
        this._hiddenEnvObjects = [];
    },

    hide: function () {
        this.isVisible = false;
        this.mesh.visible = false;

        // Clear global flag
        window.vrMenuOpen = false;

        // Reveal molecule entity
        var mol = document.getElementById('molecule-container');
        if (mol) mol.setAttribute('visible', 'true');

        // Restore environment meshes
        this._showEnvMeshes();

        // Restore hidden entities
        if (this._hiddenEntities) {
            for (var i = 0; i < this._hiddenEntities.length; i++) {
                this._hiddenEntities[i].setAttribute('visible', 'true');
            }
            this._hiddenEntities = [];
        }

        // Restore raycasters to full scene
        var leftHand = document.getElementById('left-hand');
        var rightHand = document.getElementById('right-hand');
        if (leftHand) leftHand.setAttribute('raycaster', 'objects: .clickable; far: 5');
        if (rightHand) rightHand.setAttribute('raycaster', 'objects: .clickable; far: 5');

        // Re-enable molecule transform controls
        if (mol) mol.setAttribute('axis-transform-controls', 'hand: right');

        console.log('[VRMainMenu] Hidden');

        // Hide menu environment
        if (this._menuSky) this._menuSky.visible = false;
        if (this._menuParticles) this._menuParticles.visible = false;
    },

    // ── Tick: poll raycasters for hover UV ───────────────────────────────────
    tick: function () {
        if (!this.isVisible) return;

        // Poll both hand raycasters for intersection with our mesh
        var hands = ['left-hand', 'right-hand'];
        var foundUV = null;

        for (var h = 0; h < hands.length; h++) {
            var handEl = document.getElementById(hands[h]);
            if (!handEl) continue;
            var rc = handEl.components && handEl.components.raycaster;
            if (!rc || !rc.intersections || !rc.intersections.length) continue;

            for (var i = 0; i < rc.intersections.length; i++) {
                if (rc.intersections[i].object === this.mesh && rc.intersections[i].uv) {
                    foundUV = rc.intersections[i].uv;
                    break;
                }
            }
            if (foundUV) break;
        }

        if (foundUV) {
            this.updateHover(foundUV);
        } else if (this.hovered !== -1) {
            this.hovered = -1;
            this.draw();
        }

        // Animate menu particles
        if (this._menuParticles && this._menuParticles.visible && this._particleBasePos) {
            var posAttr = this._menuParticles.geometry.getAttribute('position');
            var t = performance.now() * 0.0003;
            for (var p = 0; p < posAttr.count; p++) {
                var baseIdx = p * 3;
                posAttr.array[baseIdx] = this._particleBasePos[baseIdx] + Math.sin(t + p * 0.7) * 0.3;
                posAttr.array[baseIdx + 1] = this._particleBasePos[baseIdx + 1] + Math.sin(t * 0.7 + p * 1.1) * 0.2;
                posAttr.array[baseIdx + 2] = this._particleBasePos[baseIdx + 2] + Math.cos(t * 0.5 + p * 0.9) * 0.3;
            }
            posAttr.needsUpdate = true;
        }
    },

    updateHover: function (uv) {
        // lookAt(camPos) mirrors the mesh horizontally — flip X to correct UV
        var px = (1 - uv.x) * this.W;
        var py = (1 - uv.y) * this.H;
        var newHover = -1;

        for (var i = 0; i < this.buttons.length; i++) {
            var b = this.buttons[i];
            if (px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) {
                newHover = i;
                break;
            }
        }

        if (newHover !== this.hovered) {
            this.hovered = newHover;
            this.draw();
        }
    },

    // ── Click handling ────────────────────────────────────────────────────────
    handleClick: function (uv) {
        // lookAt(camPos) mirrors the mesh horizontally — flip X to correct UV
        var px = (1 - uv.x) * this.W;
        var py = (1 - uv.y) * this.H;

        for (var i = 0; i < this.buttons.length; i++) {
            var b = this.buttons[i];
            if (px >= b.x && px <= b.x + b.w && py >= b.y && py <= b.y + b.h) {
                if (b.action) b.action();
                return;
            }
        }
    },

    // ── Drawing ───────────────────────────────────────────────────────────────
    draw: function () {
        var ctx = this.ctx;
        var W = this.W, H = this.H;
        this.buttons = [];

        ctx.clearRect(0, 0, W, H);

        // ── Background panel ──
        this.drawPanel(ctx, W, H);

        // ── Logo area ──
        var logoY = 90;
        this.drawLogo(ctx, W / 2, logoY + 60, 56);

        // ── Title ──
        ctx.save();
        var titleGrad = ctx.createLinearGradient(W * 0.2, 0, W * 0.8, 0);
        titleGrad.addColorStop(0, '#ffffff');
        titleGrad.addColorStop(1, 'rgba(0,220,200,0.9)');
        ctx.fillStyle = titleGrad;
        ctx.font = 'bold 72px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('FoldVR', W / 2, logoY + 160);
        ctx.restore();

        // ── Subtitle ──
        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,0.35)';
        ctx.font = '28px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.letterSpacing = '0.12em';
        ctx.fillText('MOLECULAR VISUALIZATION', W / 2, logoY + 205);
        ctx.restore();

        // ── Divider ──
        var divY = logoY + 235;
        var divGrad = ctx.createLinearGradient(60, 0, W - 60, 0);
        divGrad.addColorStop(0, 'transparent');
        divGrad.addColorStop(0.5, 'rgba(0,220,200,0.35)');
        divGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = divGrad;
        ctx.fillRect(60, divY, W - 120, 1);

        // ── Buttons ──
        var btnX = 60, btnW = W - 120, btnH = 110, gap = 18;
        var startY = divY + 32;

        var menuItems = [
            { label: 'Enter VR', desc: 'Open the 3D molecular scene', icon: '⬡', primary: true, action: 'enter-vr' },
            { label: 'Enter AR', desc: 'Passthrough mixed reality (Quest 3)', icon: '◈', disabled: true, soon: true },
            { label: 'Settings', desc: 'Graphics, controls & preferences', icon: '⚙' },
            { label: 'Help', desc: 'Controls, tips & documentation', icon: '?', action: 'help' },
            { label: 'Multiplayer', desc: 'Collaborate in shared VR sessions', icon: '◈', disabled: true, soon: true },
        ];

        for (var i = 0; i < menuItems.length; i++) {
            var item = menuItems[i];
            var by = startY + i * (btnH + gap);
            this.drawButton(ctx, item, btnX, by, btnW, btnH, i);

            if (!item.disabled) {
                var capturedItem = item;
                this.buttons.push({ x: btnX, y: by, w: btnW, h: btnH, action: this.makeAction(capturedItem) });
            }
        }

        // ── Footer ──
        ctx.save();
        ctx.fillStyle = 'rgba(255,255,255,0.15)';
        ctx.font = '22px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('FoldVR  ·  Quest 3  ·  WebXR  ·  A-Frame 1.4', W / 2, H - 36);
        ctx.restore();

        // ── Version badge ──
        ctx.save();
        ctx.fillStyle = 'rgba(0,220,200,0.45)';
        ctx.font = 'bold 20px Arial, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('v0.1 Alpha', W - 36, 48);
        ctx.restore();

        this.texture.needsUpdate = true;
    },

    drawPanel: function (ctx, W, H) {
        var r = 40;
        ctx.save();

        // ── Step 1: Full canvas solid black base so nothing bleeds through ──
        ctx.fillStyle = 'rgba(3, 7, 14, 1.0)';
        ctx.fillRect(0, 0, W, H);

        // ── Step 2: Teal top radial glow (splash BG aesthetic) ──
        var gTop = ctx.createRadialGradient(W / 2, 0, 0, W / 2, 0, W * 0.85);
        gTop.addColorStop(0, 'rgba(0,200,180,0.22)');
        gTop.addColorStop(1, 'transparent');
        ctx.fillStyle = gTop;
        ctx.fillRect(0, 0, W, H);

        // ── Step 3: Purple bottom-right glow ──
        var gBR = ctx.createRadialGradient(W, H, 0, W, H, W * 0.75);
        gBR.addColorStop(0, 'rgba(80,60,220,0.18)');
        gBR.addColorStop(1, 'transparent');
        ctx.fillStyle = gBR;
        ctx.fillRect(0, 0, W, H);

        // ── Step 4: Teal grid lines ──
        ctx.globalAlpha = 0.10;
        ctx.strokeStyle = 'rgba(0,220,200,1)';
        ctx.lineWidth = 1;
        var gridSize = 60;
        for (var gx = 0; gx < W; gx += gridSize) {
            ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke();
        }
        for (var gy = 0; gy < H; gy += gridSize) {
            ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke();
        }
        ctx.globalAlpha = 1;

        // ── Step 5: Rounded rect panel on top (slightly lighter than base) ──
        ctx.beginPath();
        ctx.moveTo(r, 0);
        ctx.lineTo(W - r, 0);
        ctx.quadraticCurveTo(W, 0, W, r);
        ctx.lineTo(W, H - r);
        ctx.quadraticCurveTo(W, H, W - r, H);
        ctx.lineTo(r, H);
        ctx.quadraticCurveTo(0, H, 0, H - r);
        ctx.lineTo(0, r);
        ctx.quadraticCurveTo(0, 0, r, 0);
        ctx.closePath();

        // Slightly lighter glass layer over the base
        ctx.fillStyle = 'rgba(8, 18, 32, 0.55)';
        ctx.fill();

        // Teal border glow — stronger
        ctx.strokeStyle = 'rgba(0,220,200,0.55)';
        ctx.lineWidth = 2.5;
        ctx.stroke();

        // Inner top highlight
        ctx.beginPath();
        ctx.moveTo(r + 20, 1.5);
        ctx.lineTo(W - r - 20, 1.5);
        ctx.strokeStyle = 'rgba(255,255,255,0.12)';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.restore();
    },

    drawLogo: function (ctx, cx, cy, r) {
        // Molecule icon — central atom + 6 satellites + bonds
        var atoms = [
            { dx: 0, dy: 0, r: r * 0.38, color: 'rgba(0,220,200,0.95)' },
            { dx: -r, dy: -r * 0.6, r: r * 0.25, color: 'rgba(0,180,255,0.85)' },
            { dx: r, dy: -r * 0.6, r: r * 0.25, color: 'rgba(0,180,255,0.85)' },
            { dx: -r, dy: r * 0.6, r: r * 0.25, color: 'rgba(80,120,255,0.85)' },
            { dx: r, dy: r * 0.6, r: r * 0.25, color: 'rgba(80,120,255,0.85)' },
            { dx: 0, dy: -r * 1.1, r: r * 0.18, color: 'rgba(0,220,200,0.65)' },
            { dx: 0, dy: r * 1.1, r: r * 0.18, color: 'rgba(0,220,200,0.65)' },
        ];

        // Bonds first
        ctx.save();
        ctx.strokeStyle = 'rgba(0,220,200,0.35)';
        ctx.lineWidth = 2.5;
        for (var i = 1; i < atoms.length; i++) {
            ctx.beginPath();
            ctx.moveTo(cx + atoms[0].dx, cy + atoms[0].dy);
            ctx.lineTo(cx + atoms[i].dx, cy + atoms[i].dy);
            ctx.stroke();
        }

        // Atoms
        for (var j = 0; j < atoms.length; j++) {
            var a = atoms[j];
            var glow = ctx.createRadialGradient(cx + a.dx, cy + a.dy, 0, cx + a.dx, cy + a.dy, a.r * 2);
            glow.addColorStop(0, a.color);
            glow.addColorStop(1, 'transparent');
            ctx.fillStyle = glow;
            ctx.beginPath();
            ctx.arc(cx + a.dx, cy + a.dy, a.r * 2, 0, Math.PI * 2);
            ctx.fill();

            ctx.fillStyle = a.color;
            ctx.beginPath();
            ctx.arc(cx + a.dx, cy + a.dy, a.r, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
    },

    drawButton: function (ctx, item, x, y, w, h, idx) {
        var isHovered = (this.hovered === idx) && !item.disabled;
        var isPrimary = item.primary && !item.disabled;
        var isDisabled = item.disabled;
        var r = 16;

        ctx.save();

        // Button background
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
        ctx.closePath();

        if (isDisabled) {
            ctx.fillStyle = 'rgba(255,255,255,0.03)';
            ctx.globalAlpha = 0.4;
        } else if (isPrimary && isHovered) {
            ctx.fillStyle = 'rgba(0,200,180,0.38)';
        } else if (isPrimary) {
            ctx.fillStyle = 'rgba(0,200,180,0.22)';
        } else if (isHovered) {
            ctx.fillStyle = 'rgba(0,220,200,0.10)';
        } else {
            ctx.fillStyle = 'rgba(255,255,255,0.04)';
        }
        ctx.fill();

        // Border
        ctx.strokeStyle = isPrimary
            ? (isHovered ? 'rgba(0,220,200,0.7)' : 'rgba(0,220,200,0.4)')
            : (isHovered ? 'rgba(0,220,200,0.35)' : 'rgba(255,255,255,0.08)');
        ctx.lineWidth = 1.5;
        ctx.stroke();

        ctx.globalAlpha = isDisabled ? 0.4 : 1;

        // Icon circle
        var iconX = x + 22, iconCY = y + h / 2, iconR = 28;
        ctx.fillStyle = isPrimary ? 'rgba(0,220,200,0.15)' : 'rgba(255,255,255,0.06)';
        ctx.beginPath();
        ctx.arc(iconX + iconR, iconCY, iconR, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = isPrimary ? 'rgba(0,220,200,0.25)' : 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1;
        ctx.stroke();

        ctx.fillStyle = isPrimary ? 'rgba(0,220,200,0.9)' : 'rgba(255,255,255,0.7)';
        ctx.font = '28px Arial, sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(item.icon, iconX + iconR, iconCY);

        // Label
        var textX = iconX + iconR * 2 + 20;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 30px Arial, sans-serif';
        ctx.fillText(item.label, textX, y + h / 2 - 4);

        // SOON badge
        if (item.soon) {
            var labelW = ctx.measureText(item.label).width;
            ctx.fillStyle = 'rgba(0,220,200,0.7)';
            ctx.font = 'bold 18px Arial, sans-serif';
            ctx.fillText('SOON', textX + labelW + 14, y + h / 2 - 4);
        }

        // Description
        ctx.fillStyle = 'rgba(255,255,255,0.38)';
        ctx.font = '22px Arial, sans-serif';
        ctx.fillText(item.desc, textX, y + h / 2 + 26);

        // Arrow
        if (!isDisabled) {
            ctx.fillStyle = isHovered ? 'rgba(0,220,200,0.9)' : 'rgba(0,220,200,0.45)';
            ctx.font = '32px Arial, sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText('›', x + w - 20, y + h / 2 + 10);
        }

        ctx.globalAlpha = 1;
        ctx.restore();
    },

    makeAction: function (item) {
        var self = this;
        return function () {
            if (item.action === 'enter-vr') {
                self.hide();
                // Remove the 2D splash menu if still present
                var splash = document.getElementById('splash-screen');
                if (splash && splash.parentNode) splash.parentNode.removeChild(splash);
            } else if (item.action === 'help') {
                console.log('[VRMainMenu] Help: B=menu, Trigger=select, Grip=distance, Thumbstick=move');
            }
        };
    },

    remove: function () {
        this.el.removeObject3D('vr-main-menu');
    }
});
