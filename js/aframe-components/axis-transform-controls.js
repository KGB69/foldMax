/**
 * Axis Transform Controls Component
 * 
 * Handles precise axis-locked transformations (Rotate, Scale, Move)
 * using vertical joystick input. Integrates with controller-radial-menu.
 */

AFRAME.registerComponent('axis-transform-controls', {
    schema: {
        target: { type: 'selector' }, // Target entity to manipulate (molecule)
        hand: { default: 'right' },   // Controller hand
        speed: { default: 1.0 },      // Base transformation speed
    },

    init: function () {
        console.log('[AxisTransformControls] Initializing...');

        this.mode = null; // 'rotate', 'scale', 'move'
        this.axis = null; // 'x', 'y', 'z', 'uniform'
        this.isActive = false;

        // Setup listeners
        this.setupListeners();
    },

    setupListeners: function () {
        var self = this;
        var controller = document.querySelector('#' + this.data.hand + '-hand');

        if (controller) {
            // Listen for vertical joystick movement
            controller.addEventListener('thumbstickmoved', function (evt) {
                if (!self.isActive) return;
                self.handleJoystick(evt.detail);
            });

            // Listen for mode activation events from radial menu
            this.el.sceneEl.addEventListener('transform-mode-start', function (evt) {
                self.activate(evt.detail.mode, evt.detail.axis);
            });

            this.el.sceneEl.addEventListener('transform-mode-end', function () {
                self.deactivate();
            });
        }
    },

    activate: function (mode, axis) {
        console.log('[AxisTransform] Activated:', mode, axis);
        this.mode = mode;
        this.axis = axis;
        this.isActive = true;

        // Show Gizmos (Phase 4)
        this.showGizmos();
    },

    deactivate: function () {
        if (!this.isActive) return; // Prevent double deactivation logs

        console.log('[AxisTransform] Deactivating current mode:', this.mode);
        this.isActive = false;
        this.mode = null;
        this.axis = null;
        this.valueLabel = null; // Reset label reference to force recreating (or better: hide it)

        // Hide Gizmos
        this.hideGizmos();
    },

    handleJoystick: function (detail) {
        // Vertical movement: detail.y (-1 to 1)
        // -1 is UP, 1 is DOWN usually (depends on controller)
        // Let's assume -1 is UP (increase), 1 is DOWN (decrease)
        // Add deadzone
        if (Math.abs(detail.y) < 0.2) return;

        var delta = -detail.y * 0.05 * this.data.speed; // Scale factor

        this.applyTransform(delta);

        // Continuous Haptic Feedback
        // Intensity proportional to speed
        var intensity = Math.min(Math.abs(detail.y), 1.0) * 0.8;
        this.triggerHaptic(intensity, 15); // Short 15ms pulse every frame
    },

    applyTransform: function (delta) {
        var target = this.data.target || this.el;
        if (!target) return;

        switch (this.mode) {
            case 'rotate':
                var rotation = target.getAttribute('rotation');
                var deg = delta * 50; // Convert to degrees (tweak speed)

                if (this.axis === 'x') rotation.x += deg;
                if (this.axis === 'y') rotation.y += deg;
                if (this.axis === 'z') rotation.z += deg;

                target.setAttribute('rotation', rotation);
                break;

            case 'scale':
                var scale = target.getAttribute('scale');
                var factor = 1 + delta;

                // Prevent negative/zero scale
                var newScale = scale.x * factor;
                if (newScale < 0.1) newScale = 0.1;

                if (this.axis === 'uniform') {
                    target.setAttribute('scale', { x: newScale, y: newScale, z: newScale });
                }
                break;

            case 'move':
                var position = target.getAttribute('position');
                var moveDelta = delta * 2; // Move speed

                if (this.axis === 'x') position.x += moveDelta;
                if (this.axis === 'y') position.y += moveDelta;
                if (this.axis === 'z') position.z += moveDelta;

                target.setAttribute('position', position);
                break;
        }
    },

    showGizmos: function () {
        if (this.gizmosVisible) return;
        this.gizmosVisible = true;

        var target = this.data.target || this.el;
        if (!target) return;

        // Create gizmo container if needed
        // Disabled RGB Arrows per user request
        // Only ensuring value label exists

        // Value Display Label
        if (!this.valueLabel) {
            this.valueLabel = document.createElement('a-text');
            this.valueLabel.setAttribute('align', 'center');
            this.valueLabel.setAttribute('color', '#FFFFFF');
            this.valueLabel.setAttribute('width', 4);
            this.valueLabel.setAttribute('position', '0 1.2 0'); // 1.2m above molecule
            this.valueLabel.setAttribute('side', 'double');
            target.appendChild(this.valueLabel);
        }

        this.valueLabel.setAttribute('visible', true);
        this.updateValueDisplay();
    },

    updateValueDisplay: function () {
        if (!this.valueLabel || !this.isActive) return;

        var target = this.data.target || this.el;
        var text = '';
        var color = '#FFFFFF';

        if (this.mode === 'rotate') {
            var rot = target.getAttribute('rotation');
            var val = 0;
            if (this.axis === 'x') { val = rot.x; color = '#FF0000'; }
            if (this.axis === 'y') { val = rot.y; color = '#00FF00'; }
            if (this.axis === 'z') { val = rot.z; color = '#5555FF'; }
            text = 'Rotate ' + this.axis.toUpperCase() + ': ' + val.toFixed(1) + '°';
        } else if (this.mode === 'scale') {
            var scale = target.getAttribute('scale');
            text = 'Scale: ' + scale.x.toFixed(2) + 'x';
            color = '#00FFFF';
        } else if (this.mode === 'move') {
            var pos = target.getAttribute('position');
            var val = 0;
            if (this.axis === 'x') { val = pos.x; color = '#FF0000'; }
            if (this.axis === 'y') { val = pos.y; color = '#00FF00'; }
            if (this.axis === 'z') { val = pos.z; color = '#5555FF'; }
            text = 'Move ' + this.axis.toUpperCase() + ': ' + val.toFixed(2) + 'm';
        }

        this.valueLabel.setAttribute('value', text);
        this.valueLabel.setAttribute('color', color);

        // Face camera
        if (this.el.sceneEl.camera) {
            this.valueLabel.object3D.lookAt(this.el.sceneEl.camera.position);
        }

        // Reset fade timer
        this.resetFadeTimer();
    },

    resetFadeTimer: function () {
        if (this.fadeTimer) clearTimeout(this.fadeTimer);

        var self = this;
        // Fade out after 2 seconds of inactivity
        this.fadeTimer = setTimeout(function () {
            if (self.valueLabel) self.valueLabel.setAttribute('visible', false);
            // Keep gizmos visible? Design says auto-fade gizmos after 2s too
            self.hideGizmos();
        }, 2000);
    },

    updateGizmoHighlight: function () {
        if (!this.gizmoGroup) return;

        // Reset colors/opacity
        // Note: ArrowHelper color setter is specific
        this.arrowX.setColor(new THREE.Color(0x550000));
        this.arrowY.setColor(new THREE.Color(0x005500));
        this.arrowZ.setColor(new THREE.Color(0x000055));

        // Brighten active axis
        if (this.axis === 'x') this.arrowX.setColor(new THREE.Color(0xFF0000));
        if (this.axis === 'y') this.arrowY.setColor(new THREE.Color(0x00FF00));
        if (this.axis === 'z') this.arrowZ.setColor(new THREE.Color(0x0000FF));

        // If uniform scale, maybe highlight all?
        if (this.axis === 'uniform') {
            this.arrowX.setColor(new THREE.Color(0xFFFFFF));
            this.arrowY.setColor(new THREE.Color(0xFFFFFF));
            this.arrowZ.setColor(new THREE.Color(0xFFFFFF));
        }
    },

    hideGizmos: function () {
        if (!this.gizmosVisible) return;
        this.gizmosVisible = false;

        if (this.gizmoGroup) {
            this.gizmoGroup.visible = false;
        }
    },

    triggerHaptic: function (intensity, duration) {
        var controller = document.querySelector('#' + this.data.hand + '-hand');
        if (controller && controller.components['oculus-touch-controls'] &&
            controller.components['oculus-touch-controls'].controller &&
            controller.components['oculus-touch-controls'].controller.hapticActuators &&
            controller.components['oculus-touch-controls'].controller.hapticActuators[0]) {
            controller.components['oculus-touch-controls'].controller.hapticActuators[0].pulse(intensity, duration);
        }
    }
});
