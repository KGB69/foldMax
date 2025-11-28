/**
 * VR Debug Console
 * Displays console logs in VR as a 3D text panel
 */

var VRDebugConsole = {
    logs: [],
    maxLogs: 12,
    canvas: null,
    texture: null,
    mesh: null,
    visible: true,
    width: 1024,
    height: 512,

    init: function () {
        console.log('[VR Debug Console] Initializing...');

        // Create canvas
        this.canvas = document.createElement('canvas');
        this.canvas.width = this.width;
        this.canvas.height = this.height;
        this.ctx = this.canvas.getContext('2d');

        // Create texture
        this.texture = new THREE.CanvasTexture(this.canvas);
        this.texture.minFilter = THREE.LinearFilter;

        // Create material and geometry
        var material = new THREE.MeshBasicMaterial({
            map: this.texture,
            transparent: true,
            opacity: 0.9,
            side: THREE.DoubleSide
        });

        var geometry = new THREE.PlaneGeometry(3, 1.5);
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.position.set(-2, 2, -3); // Top-left of view
        this.mesh.visible = this.visible;

        // Add to scene
        if (typeof scene !== 'undefined') {
            scene.add(this.mesh);
        }

        // Intercept console.log
        this.interceptConsole();

        // Initial draw
        this.draw();

        console.log('[VR Debug Console] Initialized');
    },

    interceptConsole: function () {
        var self = this;
        var originalLog = console.log;
        var originalWarn = console.warn;
        var originalError = console.error;

        console.log = function () {
            self.addLog('LOG', Array.from(arguments).join(' '));
            originalLog.apply(console, arguments);
        };

        console.warn = function () {
            self.addLog('WARN', Array.from(arguments).join(' '));
            originalWarn.apply(console, arguments);
        };

        console.error = function () {
            self.addLog('ERROR', Array.from(arguments).join(' '));
            originalError.apply(console, arguments);
        };
    },

    addLog: function (type, message) {
        // Add timestamp
        var now = new Date();
        var timestamp = now.getHours().toString().padStart(2, '0') + ':' +
            now.getMinutes().toString().padStart(2, '0') + ':' +
            now.getSeconds().toString().padStart(2, '0');

        this.logs.push({
            type: type,
            message: message,
            timestamp: timestamp
        });

        // Keep only last N logs
        if (this.logs.length > this.maxLogs) {
            this.logs.shift();
        }

        this.draw();
    },

    draw: function () {
        var ctx = this.ctx;
        var w = this.width;
        var h = this.height;

        // Clear
        ctx.clearRect(0, 0, w, h);

        // Background
        ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
        ctx.fillRect(0, 0, w, h);

        // Border
        ctx.strokeStyle = '#00ffff';
        ctx.lineWidth = 4;
        ctx.strokeRect(2, 2, w - 4, h - 4);

        // Title
        ctx.fillStyle = '#00ffff';
        ctx.font = 'bold 24px monospace';
        ctx.fillText('VR DEBUG CONSOLE', 20, 35);

        // Instructions
        ctx.fillStyle = '#888888';
        ctx.font = '16px monospace';
        ctx.fillText('Press Y to toggle', w - 200, 35);

        // Logs
        var lineHeight = 32;
        var startY = 70;
        ctx.font = '18px monospace';

        for (var i = 0; i < this.logs.length; i++) {
            var log = this.logs[i];
            var y = startY + (i * lineHeight);

            // Color based on type
            if (log.type === 'ERROR') {
                ctx.fillStyle = '#ff4444';
            } else if (log.type === 'WARN') {
                ctx.fillStyle = '#ffaa00';
            } else {
                ctx.fillStyle = '#ffffff';
            }

            // Timestamp
            ctx.fillStyle = '#888888';
            ctx.fillText(log.timestamp, 20, y);

            // Message (truncated if too long)
            ctx.fillStyle = log.type === 'ERROR' ? '#ff4444' :
                log.type === 'WARN' ? '#ffaa00' : '#ffffff';
            var msg = log.message.substring(0, 80);
            ctx.fillText(msg, 120, y);
        }

        this.texture.needsUpdate = true;
    },

    toggle: function () {
        this.visible = !this.visible;
        if (this.mesh) {
            this.mesh.visible = this.visible;
        }
        console.log('[VR Debug Console] Visibility:', this.visible);
    },

    show: function () {
        this.visible = true;
        if (this.mesh) {
            this.mesh.visible = true;
        }
    },

    hide: function () {
        this.visible = false;
        if (this.mesh) {
            this.mesh.visible = false;
        }
    },

    // Update position to follow camera
    updatePosition: function () {
        if (!this.mesh || !this.visible) return;

        // Keep console at a fixed offset from camera
        if (typeof camera !== 'undefined') {
            var offset = new THREE.Vector3(-2, 2, -3);
            var worldOffset = offset.applyQuaternion(camera.quaternion);
            this.mesh.position.copy(camera.position).add(worldOffset);
            this.mesh.lookAt(camera.position);
        }
    }
};

window.VRDebugConsole = VRDebugConsole;
