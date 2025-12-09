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
        console.log('[AxisTransform] Deactivated');
        this.isActive = false;
        this.mode = null;
        this.axis = null;

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
        // Phase 4 implementation placeholder
        // TODO: Create/show arrow helpers
    },

    hideGizmos: function () {
        // Phase 4 implementation placeholder
        // TODO: Hide arrow helpers
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
