/**
 * VR Debug Panel - Toggle with X key
 * Shows gamepad input, rig position, and movement status in VR
 */

AFRAME.registerComponent('vr-debug-panel', {
    schema: {},

    init: function () {
        console.log('[VR Debug] Initializing...');

        this.isVisible = false;
        this.updateInterval = null;

        // Create canvas
        this.canvas = document.createElement('canvas');
        this.canvas.width = 1024;
        this.canvas.height = 512;
        this.ctx = this.canvas.getContext('2d');

        // Create texture and material
        this.texture = new THREE.CanvasTexture(this.canvas);
        this.texture.minFilter = THREE.LinearFilter;

        var material = new THREE.MeshBasicMaterial({
            map: this.texture,
            transparent: true,
            side: THREE.DoubleSide
        });

        // Create mesh
        var geometry = new THREE.PlaneGeometry(2, 1);
        this.mesh = new THREE.Mesh(geometry, material);
        this.mesh.visible = false;
        this.el.setObject3D('debug-panel', this.mesh);

        // Position in front of camera
        this.mesh.position.set(0, 1.5, -1.5);

        // Setup keyboard toggle
        var self = this;
        document.addEventListener('keydown', function (e) {
            if (e.code === 'KeyX') {
                self.toggle();
            }
        });

        // Initial draw
        this.draw();

        console.log('[VR Debug] Ready - Press X to toggle');
    },

    toggle: function () {
        this.isVisible = !this.isVisible;
        this.mesh.visible = this.isVisible;

        if (this.isVisible) {
            this.startUpdates();
            console.log('[VR Debug] Panel shown');
        } else {
            this.stopUpdates();
            console.log('[VR Debug] Panel hidden');
        }
    },

    startUpdates: function () {
        if (this.updateInterval) return;

        var self = this;
        this.updateInterval = setInterval(function () {
            self.draw();
        }, 100); // Update 10 times per second
    },

    stopUpdates: function () {
        if (this.updateInterval) {
            clearInterval(this.updateInterval);
            this.updateInterval = null;
        }
    },

    draw: function () {
        var ctx = this.ctx;
        var w = this.canvas.width;
        var h = this.canvas.height;

        // Clear
        ctx.fillStyle = 'rgba(20, 20, 20, 0.9)';
        ctx.fillRect(0, 0, w, h);

        // Border
        ctx.strokeStyle = '#00ff00';
        ctx.lineWidth = 4;
        ctx.strokeRect(2, 2, w - 4, h - 4);

        // Title
        ctx.font = 'bold 40px monospace';
        ctx.fillStyle = '#00ff00';
        ctx.fillText('VR DEBUG PANEL (Press X to hide)', 20, 50);

        var y = 100;
        var lineHeight = 35;

        // Get gamepad info
        var gamepads = navigator.getGamepads ? navigator.getGamepads() : [];
        var gamepadCount = 0;

        ctx.font = '30px monospace';
        ctx.fillStyle = '#ffffff';

        for (var i = 0; i < gamepads.length; i++) {
            if (gamepads[i]) {
                gamepadCount++;
                var gp = gamepads[i];

                ctx.fillStyle = '#ffff00';
                ctx.fillText('Gamepad ' + i + ': ' + gp.id.substring(0, 30), 20, y);
                y += lineHeight;

                ctx.fillStyle = '#ffffff';

                // Axes (joysticks)
                if (gp.axes.length >= 2) {
                    ctx.fillText('  Left Stick: X=' + gp.axes[0].toFixed(2) + ' Y=' + gp.axes[1].toFixed(2), 20, y);
                    y += lineHeight;
                }
                if (gp.axes.length >= 4) {
                    ctx.fillText('  Right Stick: X=' + gp.axes[2].toFixed(2) + ' Y=' + gp.axes[3].toFixed(2), 20, y);
                    y += lineHeight;
                }

                // Pressed buttons
                var pressedButtons = [];
                for (var b = 0; b < gp.buttons.length; b++) {
                    if (gp.buttons[b].pressed) {
                        pressedButtons.push(b);
                    }
                }
                if (pressedButtons.length > 0) {
                    ctx.fillText('  Buttons: ' + pressedButtons.join(', '), 20, y);
                    y += lineHeight;
                }
            }
        }

        if (gamepadCount === 0) {
            ctx.fillStyle = '#ff0000';
            ctx.fillText('NO GAMEPADS DETECTED', 20, y);
            y += lineHeight;
        }

        y += 20;

        // Rig info
        var rig = document.querySelector('#rig');
        var camera = document.querySelector('#camera');

        if (rig) {
            ctx.fillStyle = '#00ffff';
            ctx.fillText('RIG:', 20, y);
            y += lineHeight;

            ctx.fillStyle = '#ffffff';
            var rigPos = rig.getAttribute('position');
            ctx.fillText('  Position: ' + JSON.stringify(rigPos), 20, y);
            y += lineHeight;

            var movementControls = rig.getAttribute('movement-controls');
            if (movementControls) {
                ctx.fillText('  Movement: FLY=' + (movementControls.fly || false) + ' SPEED=' + (movementControls.speed || 0), 20, y);
                y += lineHeight;
            } else {
                ctx.fillStyle = '#ff0000';
                ctx.fillText('  Movement-controls: NOT FOUND', 20, y);
                y += lineHeight;
            }
        }

        if (camera) {
            ctx.fillStyle = '#00ffff';
            ctx.fillText('CAMERA:', 20, y);
            y += lineHeight;

            ctx.fillStyle = '#ffffff';
            var camPos = camera.getAttribute('position');
            ctx.fillText('  Position: ' + JSON.stringify(camPos), 20, y);
            y += lineHeight;
        }

        this.texture.needsUpdate = true;
    },

    remove: function () {
        this.stopUpdates();
    }
});
