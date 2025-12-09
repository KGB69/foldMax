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
        distance: { default: 0.15 },  // Distance offset from controller (was 0.05)
        color: { default: '#222222' },
        highlightColor: { default: '#00FFFF' },
        currentSelection: { default: 0 }
    },

    // ... (init and other methods unchanged) ...

    toggleMenu: function (isGripDown) {
        if (!isGripDown) return;

        this.isOpen = !this.isOpen;
        this.menuGroup.setAttribute('visible', this.isOpen);

        this.triggerHaptic(0.5, 50);

        if (this.isOpen) {
            console.log('[ControllerRadialMenu] Menu OPEN - Stopping active transforms');
            // Stop any active transformation when menu opens
            this.el.sceneEl.emit('transform-mode-end');

            this.updateSelection();
        } else {
            console.log('[ControllerRadialMenu] Menu CLOSED');
        }
    },

    init: function () {
        console.log('[ControllerRadialMenu] Initializing for', this.data.hand);

        this.isOpen = false;
        this.menuGroup = null;
        this.menuItems = [];
        this.joystickReset = true;
        this.menuState = 'main'; // main, rotate, scale, move

        // Define menu structures
        this.menus = {
            main: [
                { id: 'rotate', label: 'Rotate', angle: 90, icon: '↻' },
                { id: 'scale', label: 'Scale', angle: 210, icon: '⤢' },
                { id: 'move', label: 'Move', angle: 330, icon: '↔' }
            ],
            rotate: [
                { id: 'rotate_x', label: 'X Axis', angle: 90, icon: 'X', color: '#FF0000' },
                { id: 'rotate_y', label: 'Y Axis', angle: 210, icon: 'Y', color: '#00FF00' },
                { id: 'rotate_z', label: 'Z Axis', angle: 330, icon: 'Z', color: '#0000FF' },
                { id: 'back', label: 'Back', angle: 0, icon: '←', size: 0.5 }
            ],
            scale: [
                { id: 'scale_uniform', label: 'Uniform', angle: 90, icon: '⤢' },
                { id: 'back', label: 'Back', angle: 270, icon: '←' }
            ],
            move: [
                { id: 'move_x', label: 'X Axis', angle: 90, icon: 'X', color: '#FF0000' },
                { id: 'move_y', label: 'Y Axis', angle: 210, icon: 'Y', color: '#00FF00' },
                { id: 'move_z', label: 'Z Axis', angle: 330, icon: 'Z', color: '#0000FF' },
                { id: 'back', label: 'Back', angle: 0, icon: '←', size: 0.5 }
            ]
        };

        // Create menu geometry
        this.createMenuContainer();
        this.loadMenu('main');

        // Setup listeners
        this.setupListeners();

        console.log('[ControllerRadialMenu] Ready');
    },

    createMenuContainer: function () {
        // Container for the menu - parented to controller
        this.menuGroup = document.createElement('a-entity');
        this.menuGroup.setAttribute('visible', false);
        this.menuGroup.setAttribute('position', `0 0.1 -${this.data.distance}`);
        this.el.appendChild(this.menuGroup);

        // Menu Background Ring
        this.ringEl = document.createElement('a-entity');
        this.ringEl.setAttribute('geometry', {
            primitive: 'ring',
            radiusInner: 0.05,
            radiusOuter: this.data.radius,
            thetaLength: 360,
            segmentsTheta: 32
        });
        this.ringEl.setAttribute('material', {
            color: this.data.color,
            opacity: 0.85,
            side: 'double',
            transparent: true,
            shader: 'flat'
        });
        this.menuGroup.appendChild(this.ringEl);

        // Selection Indicator
        this.selectionIndicator = document.createElement('a-entity');
        this.selectionIndicator.setAttribute('geometry', {
            primitive: 'ring',
            radiusInner: this.data.radius - 0.01,
            radiusOuter: this.data.radius + 0.005,
            thetaLength: 360
        });
        this.selectionIndicator.setAttribute('material', {
            color: this.data.highlightColor,
            opacity: 0.0,
            transparent: true,
            shader: 'flat'
        });
        this.menuGroup.appendChild(this.selectionIndicator);
    },

    loadMenu: function (menuName) {
        // Clear existing items
        if (this.currentMenuEl) {
            this.menuGroup.removeChild(this.currentMenuEl);
        }

        this.menuItems = [];
        this.menuState = menuName;
        this.data.currentSelection = 0;

        // Create new container for items
        this.currentMenuEl = document.createElement('a-entity');
        this.menuGroup.appendChild(this.currentMenuEl);

        var items = this.menus[menuName];
        var self = this;

        items.forEach(function (item) {
            self.createMenuItem(item, self.currentMenuEl);
        });

        this.updateSelection();
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
        textEl.setAttribute('width', 0.8); // Use itemData.size or default
        var color = itemData.color || '#FFFFFF';
        textEl.setAttribute('color', color); // Use itemData.color or default

        itemContainer.appendChild(textEl);
        parent.appendChild(itemContainer);

        this.menuItems.push({
            id: itemData.id,
            el: itemContainer,
            angle: itemData.angle,
            data: itemData, // Store original item data for color, etc.
            originalColor: color
        });
    },

    setupListeners: function () {
        var self = this;

        // Grip button to toggle menu
        this.el.addEventListener('gripdown', function () {
            self.toggleMenu(true);
        });

        // Joystick movement (thumbstickmoved)
        this.el.addEventListener('thumbstickmoved', function (evt) {
            if (!self.isOpen) return;
            self.handleJoystick(evt.detail);
        });

        // Trigger to select
        this.el.addEventListener('triggerdown', function () {
            if (!self.isOpen) return;
            self.selectCurrentItem();
        });
    },

    handleJoystick: function (detail) {
        // Horizontal movement: detail.x (-1 to 1)
        // Add deadzone
        if (Math.abs(detail.x) < 0.5) {
            this.joystickReset = true;
            return;
        }

        // Only trigger once per press (like a d-pad)
        if (!this.joystickReset) return;

        if (detail.x > 0.5) {
            this.navigateMenu(1); // Right/Next
        } else if (detail.x < -0.5) {
            this.navigateMenu(-1); // Left/Prev
        }

        this.joystickReset = false;
    },

    navigateMenu: function (direction) {
        // Update selection index
        this.data.currentSelection += direction;

        // Wrap around
        if (this.data.currentSelection >= this.menuItems.length) {
            this.data.currentSelection = 0;
        } else if (this.data.currentSelection < 0) {
            this.data.currentSelection = this.menuItems.length - 1;
        }

        this.updateSelection();
        this.triggerHaptic(0.3, 20); // Light tick
    },

    updateSelection: function () {
        if (!this.menuItems.length) return;

        // visual update of highlight
        var item = this.menuItems[this.data.currentSelection];

        // 1. Move selection ring to item angle
        // Actually, ring highlights the "Active" item. 
        // Our items are at specific angles. 
        // We can rotate the selection indicator or highlight the text.

        // Highlighting the text container:
        this.menuItems.forEach(function (i) {
            i.el.querySelector('a-text').setAttribute('color', i.originalColor || '#FFFFFF');
            i.el.setAttribute('scale', '1 1 1');
        });

        // Use custom highlight color if defined (for axes), else default
        var highlight = item.data.color || this.data.highlightColor;
        item.el.querySelector('a-text').setAttribute('color', highlight);
        item.el.setAttribute('scale', '1.2 1.2 1.2'); // Pop effect

        // Optional: Rotate a pointer or ring to point at it
        // Phase 2 MVP: Just text color/scale
    },

    selectCurrentItem: function () {
        var item = this.menuItems[this.data.currentSelection];
        var id = item.id;
        console.log('[ControllerRadialMenu] Selected:', id);
        this.triggerHaptic(0.8, 50);

        if (id === 'back') {
            this.loadMenu('main');
        } else if (this.menus[id]) {
            // Load sub-menu
            this.loadMenu(id);
        } else {
            // Leaf node: Activate transform mode!
            // Format: 'rotate_x', 'scale_uniform', 'move_z'
            var parts = id.split('_');
            if (parts.length > 1) {
                var mode = parts[0];
                var axis = parts[1];

                console.log('[ControllerRadialMenu] Emitting start:', mode, axis);
                this.el.sceneEl.emit('transform-mode-start', {
                    mode: mode,
                    axis: axis
                });

                // TODO: Visual feedback that we are in adjust mode
                // Maybe close menu or show "Adjusting..." state?
                // For now, let's toggle menu CLOSED to clear view
                this.toggleMenu(true);
            }
        }
    },

    toggleMenu: function (isGripDown) {
        if (!isGripDown) return;

        this.isOpen = !this.isOpen;
        this.menuGroup.setAttribute('visible', this.isOpen);

        this.triggerHaptic(0.5, 50);

        if (this.isOpen) {
            console.log('[ControllerRadialMenu] Menu OPEN');
            this.updateSelection(); // Ensure highlight is correct on open
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
