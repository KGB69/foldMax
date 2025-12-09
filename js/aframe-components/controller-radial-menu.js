/**
 * Controller Radial Menu Component
 * 
 * Implements a Blender-style 3D radial menu that orbits the VR controller.
 * Main entry point for the new protein manipulation system.
 */

AFRAME.registerComponent('controller-radial-menu', {
    schema: {
        hand: { default: 'right' },
        radius: { default: 0.15 },    // Radius of the menu ring
        distance: { default: 0.05 },  // Distance offset from controller (forward)
        color: { default: '#222222' },
        highlightColor: { default: '#00FFFF' }
    },

    init: function () {
        console.log('[ControllerRadialMenu] Initializing for', this.data.hand);

        this.isOpen = false;
        this.menuGroup = null;
        this.menuItems = [];

        // Create menu geometry
        this.createMenu();

        // Setup listeners
        this.setupListeners();

        console.log('[ControllerRadialMenu] Ready');
    },

    createMenu: function () {
        // Container for the menu - parented to controller
        this.menuGroup = document.createElement('a-entity');
        this.menuGroup.setAttribute('visible', false);
        // Position slightly in front of controller
        this.menuGroup.setAttribute('position', `0 0.1 -${this.data.distance}`);
        this.el.appendChild(this.menuGroup);

        // 1. Menu Background Ring
        var ringEl = document.createElement('a-entity');
        ringEl.setAttribute('geometry', {
            primitive: 'ring',
            radiusInner: 0.05,
            radiusOuter: this.data.radius,
            thetaLength: 360,
            segmentsTheta: 32
        });
        ringEl.setAttribute('material', {
            color: this.data.color,
            opacity: 0.85,
            side: 'double',
            transparent: true,
            shader: 'flat'
        });
        this.menuGroup.appendChild(ringEl);

        // 2. Menu Items (Rotate, Scale, Move)
        // Using simple text/icons for Phase 1
        var items = [
            { id: 'rotate', label: 'Rotate', angle: 90, icon: '↻' },
            { id: 'scale', label: 'Scale', angle: 210, icon: '⤢' }, // uniform scale only
            { id: 'move', label: 'Move', angle: 330, icon: '↔' }
        ];

        var self = this;
        items.forEach(function (item) {
            self.createMenuItem(item, ringEl);
        });

        // 3. Selection Indicator (Center or Highlight)
        this.selectionIndicator = document.createElement('a-entity');
        this.selectionIndicator.setAttribute('geometry', {
            primitive: 'ring',
            radiusInner: this.data.radius - 0.01,
            radiusOuter: this.data.radius + 0.005,
            thetaLength: 360
        });
        this.selectionIndicator.setAttribute('material', {
            color: this.data.highlightColor,
            opacity: 0.0, // Hidden by default
            transparent: true,
            shader: 'flat'
        });
        this.menuGroup.appendChild(this.selectionIndicator);
    },

    createMenuItem: function (itemData, parent) {
        // Convert angle to position on ring
        // Angle 0 is right, 90 is top. 
        // We want Rotate at top (90), Scale bottom-left (210), Move bottom-right (330)
        var rad = itemData.angle * (Math.PI / 180);
        var r = this.data.radius * 0.65; // Position items inside the ring
        var x = r * Math.cos(rad);
        var y = r * Math.sin(rad);

        // Container for item
        var itemContainer = document.createElement('a-entity');
        itemContainer.setAttribute('position', `${x} ${y} 0.01`);

        // Icon/Text
        var textEl = document.createElement('a-text');
        textEl.setAttribute('value', itemData.icon + '\n' + itemData.label);
        textEl.setAttribute('align', 'center');
        textEl.setAttribute('width', 0.8);
        textEl.setAttribute('color', '#FFFFFF');

        itemContainer.appendChild(textEl);
        parent.appendChild(itemContainer);

        this.menuItems.push({
            id: itemData.id,
            el: itemContainer,
            angle: itemData.angle
        });
    },

    setupListeners: function () {
        var self = this;

        // Grip button to toggle menu
        // 'gripdown' and 'gripup' are standard events from oculus-touch-controls
        this.el.addEventListener('gripdown', function () {
            self.toggleMenu(true);
        });

        this.el.addEventListener('gripup', function () {
            // Design decision: Keeps menu open while holding? 
            // Or toggle? User asked for "Grip button opens (and closes)"
            // Let's make it toggle for now, or hold-to-show if preferred.
            // "Grip button would open (and close)..." implies toggle.
            // But usually radial menus are hold-to-select.
            // Let's stick to toggle behavior per request -> Grip DOWN toggles.
            // Wait, "Grip button opens (and closes)" -> Toggle.

            // Actually, common radial menu pattern is Hold Grip -> Select with Stick -> Release.
            // But user said "hinged to the controller... open (and close)..."
            // Let's implement toggle on Grip Down for now.
        });

        // Check for quick toggle (if user wants to close)
        this.el.addEventListener('gripdown', function () {
            // Logic handled in toggleMenu
        });
    },

    toggleMenu: function (isGripDown) {
        if (!isGripDown) return; // Only act on press

        // Simple toggle
        this.isOpen = !this.isOpen;
        this.menuGroup.setAttribute('visible', this.isOpen);

        // Haptic feedback
        this.triggerHaptic(0.5, 50);

        if (this.isOpen) {
            console.log('[ControllerRadialMenu] Menu OPEN');
            // Ensure menu faces camera initially?
            // Since it's child of controller, it rotates with controller.
            // If user wants it to "orbit", maybe billboard?
            // "3D radial menu orbiting controller" -> Usually implies fixed relative to controller OR billboarding.
            // Design doc: "3D radial menu orbiting controller"
            // Let's keep it fixed to controller for Phase 1 (moves with hand).
        } else {
            console.log('[ControllerRadialMenu] Menu CLOSED');
        }
    },

    triggerHaptic: function (intensity, duration) {
        if (this.el.components['oculus-touch-controls'] &&
            this.el.components['oculus-touch-controls'].controller &&
            this.el.components['oculus-touch-controls'].controller.hapticActuators &&
            this.el.components['oculus-touch-controls'].controller.hapticActuators[0]) {
            this.el.components['oculus-touch-controls'].controller.hapticActuators[0].pulse(intensity, duration);
        }
    },

    tick: function () {
        // Animation or orientation updates can go here
        if (this.isOpen && this.menuGroup) {
            // Optional: billboard logic to face camera
            var camera = this.el.sceneEl.camera;
            if (camera) {
                // Clone position, look at camera
                // But we want it to stay attached to controller position-wise.
                // So we only rotate the menuGroup.

                // However, "attached to controller" usually means it rotates with controller (like a palette).
                // User said "hinged to the controller". I'll leave it attached (no billboarding) for now.
                // This feels more like a palette on your hand.
            }
        }
    }
});
