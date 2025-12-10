/**
 * Pie-Chart Radial Menu Component
 * 
 * A proper pie-chart style menu with wedge segments for VR controllers.
 * Replaces the previous ring-based menu.
 */

AFRAME.registerComponent('controller-radial-menu', {
    schema: {
        hand: { default: 'right' },
        radius: { default: 0.12 },
        innerRadius: { default: 0.03 },
        distance: { default: 0.15 },
        baseColor: { default: '#333333' },
        highlightColor: { default: '#00FFFF' },
        segmentGap: { default: 2 } // degrees
    },

    init: function () {
        console.log('[PieMenu] Initializing for', this.data.hand);

        this.isOpen = false;
        this.menuGroup = null;
        this.segments = [];
        this.selectedIndex = 0;
        this.joystickReset = true;
        this.menuState = 'main';
        this.keyboardActive = false;

        // Define menu structures
        this.menus = {
            main: [
                { id: 'enter_pdb', label: 'Enter PDB', icon: '📝', color: '#4CAF50' },
                { id: 'rotate', label: 'Rotate', icon: '↻', color: '#FF9800' },
                { id: 'scale', label: 'Scale', icon: '⤢', color: '#9C27B0' },
                { id: 'move', label: 'Move', icon: '↔', color: '#2196F3' }
            ],
            rotate: [
                { id: 'rotate_x', label: 'X Axis', icon: 'X', color: '#FF0000' },
                { id: 'rotate_y', label: 'Y Axis', icon: 'Y', color: '#00FF00' },
                { id: 'rotate_z', label: 'Z Axis', icon: 'Z', color: '#0000FF' },
                { id: 'back', label: 'Back', icon: '←', color: '#888888' }
            ],
            scale: [
                { id: 'scale_uniform', label: 'Uniform', icon: '⤢', color: '#9C27B0' },
                { id: 'back', label: 'Back', icon: '←', color: '#888888' }
            ],
            move: [
                { id: 'move_x', label: 'X Axis', icon: 'X', color: '#FF0000' },
                { id: 'move_y', label: 'Y Axis', icon: 'Y', color: '#00FF00' },
                { id: 'move_z', label: 'Z Axis', icon: 'Z', color: '#0000FF' },
                { id: 'back', label: 'Back', icon: '←', color: '#888888' }
            ]
        };

        this.createMenuContainer();
        this.loadMenu('main');
        this.setupListeners();

        console.log('[PieMenu] Ready');
    },

    createMenuContainer: function () {
        this.menuGroup = document.createElement('a-entity');
        this.menuGroup.setAttribute('visible', false);
        this.menuGroup.setAttribute('position', '0 0.08 -' + this.data.distance);
        this.el.appendChild(this.menuGroup);
    },

    loadMenu: function (menuName) {
        // Clear existing segments
        while (this.menuGroup.firstChild) {
            this.menuGroup.removeChild(this.menuGroup.firstChild);
        }
        this.segments = [];
        this.menuState = menuName;
        this.selectedIndex = 0;

        var items = this.menus[menuName];
        var numItems = items.length;
        var segmentAngle = 360 / numItems;
        var gap = this.data.segmentGap;

        for (var i = 0; i < numItems; i++) {
            var item = items[i];
            var startAngle = i * segmentAngle - 90 + gap / 2; // Start from top
            var endAngle = startAngle + segmentAngle - gap;

            var segment = this.createPieSegment(item, startAngle, endAngle, i);
            this.segments.push(segment);
        }

        this.updateSelection();
    },

    createPieSegment: function (itemData, startAngle, endAngle, index) {
        var radius = this.data.radius;
        var innerRadius = this.data.innerRadius;

        // Create pie wedge shape
        var shape = new THREE.Shape();
        var startRad = THREE.MathUtils.degToRad(startAngle);
        var endRad = THREE.MathUtils.degToRad(endAngle);

        // Start at inner arc
        shape.moveTo(
            Math.cos(startRad) * innerRadius,
            Math.sin(startRad) * innerRadius
        );

        // Line to outer arc start
        shape.lineTo(
            Math.cos(startRad) * radius,
            Math.sin(startRad) * radius
        );

        // Outer arc
        shape.absarc(0, 0, radius, startRad, endRad, false);

        // Line to inner arc end
        shape.lineTo(
            Math.cos(endRad) * innerRadius,
            Math.sin(endRad) * innerRadius
        );

        // Inner arc (reverse)
        shape.absarc(0, 0, innerRadius, endRad, startRad, true);

        var geometry = new THREE.ShapeGeometry(shape);
        var material = new THREE.MeshBasicMaterial({
            color: itemData.color || this.data.baseColor,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.85
        });

        var mesh = new THREE.Mesh(geometry, material);
        mesh.position.z = 0.001;

        // Container entity
        var segmentEl = document.createElement('a-entity');
        segmentEl.setObject3D('mesh', mesh);
        this.menuGroup.appendChild(segmentEl);

        // Add label
        var midAngle = (startAngle + endAngle) / 2;
        var labelRadius = (radius + innerRadius) / 2;
        var labelX = Math.cos(THREE.MathUtils.degToRad(midAngle)) * labelRadius;
        var labelY = Math.sin(THREE.MathUtils.degToRad(midAngle)) * labelRadius;

        var labelEl = document.createElement('a-text');
        labelEl.setAttribute('value', itemData.icon + '\n' + itemData.label);
        labelEl.setAttribute('align', 'center');
        labelEl.setAttribute('width', 0.3);
        labelEl.setAttribute('color', '#FFFFFF');
        labelEl.setAttribute('position', labelX + ' ' + labelY + ' 0.002');
        this.menuGroup.appendChild(labelEl);

        return {
            id: itemData.id,
            el: segmentEl,
            labelEl: labelEl,
            mesh: mesh,
            material: material,
            data: itemData,
            baseColor: new THREE.Color(itemData.color || this.data.baseColor),
            index: index
        };
    },

    setupListeners: function () {
        var self = this;

        this.el.addEventListener('gripdown', function () {
            self.toggleMenu();
        });

        this.el.addEventListener('thumbstickmoved', function (evt) {
            if (!self.isOpen || self.keyboardActive) return;
            self.handleJoystick(evt.detail);
        });

        this.el.addEventListener('triggerdown', function () {
            if (!self.isOpen) return;
            self.selectCurrentItem();
        });
    },

    handleJoystick: function (detail) {
        var x = detail.x;
        var y = detail.y;
        var deadzone = 0.4;

        if (Math.abs(x) < deadzone && Math.abs(y) < deadzone) {
            this.joystickReset = true;
            return;
        }

        if (!this.joystickReset) return;
        this.joystickReset = false;

        // Calculate angle from joystick position
        var angle = Math.atan2(y, x) * (180 / Math.PI);
        angle = (angle + 360) % 360; // Normalize to 0-360

        // Convert to segment index
        var numItems = this.segments.length;
        var segmentAngle = 360 / numItems;
        // Offset by 90 degrees (menu starts from top)
        var adjustedAngle = (angle + 90 + segmentAngle / 2) % 360;
        var newIndex = Math.floor(adjustedAngle / segmentAngle);

        if (newIndex !== this.selectedIndex) {
            this.selectedIndex = newIndex;
            this.updateSelection();
            this.triggerHaptic(0.3, 30);
        }
    },

    updateSelection: function () {
        var self = this;
        this.segments.forEach(function (seg, i) {
            if (i === self.selectedIndex) {
                seg.material.color.set(self.data.highlightColor);
                seg.material.opacity = 1.0;
            } else {
                seg.material.color.copy(seg.baseColor);
                seg.material.opacity = 0.85;
            }
        });
    },

    selectCurrentItem: function () {
        if (this.selectedIndex < 0 || this.selectedIndex >= this.segments.length) return;

        var segment = this.segments[this.selectedIndex];
        var itemId = segment.id;

        console.log('[PieMenu] Selected:', itemId);
        this.triggerHaptic(0.6, 50);

        // Handle selection
        if (itemId === 'back') {
            this.loadMenu('main');
        } else if (itemId === 'rotate') {
            this.loadMenu('rotate');
        } else if (itemId === 'scale') {
            this.loadMenu('scale');
        } else if (itemId === 'move') {
            this.loadMenu('move');
        } else if (itemId === 'enter_pdb') {
            this.openKeyboard();
        } else if (itemId.startsWith('rotate_') || itemId.startsWith('move_') || itemId === 'scale_uniform') {
            // Emit transform event
            this.el.sceneEl.emit('transform-mode-start', {
                mode: itemId,
                hand: this.data.hand
            });
            this.toggleMenu(); // Close menu
        }
    },

    openKeyboard: function () {
        console.log('[PieMenu] Opening VR Keyboard for PDB input');
        this.keyboardActive = true;
        this.el.sceneEl.emit('vr-keyboard-open', { callback: this.onPDBEntered.bind(this) });
    },

    onPDBEntered: function (pdbId) {
        console.log('[PieMenu] PDB entered:', pdbId);
        this.keyboardActive = false;
        if (pdbId && pdbId.length > 0) {
            // Load the PDB
            if (typeof PDB !== 'undefined' && PDB.loader) {
                PDB.loader.load(pdbId);
            }
        }
        this.toggleMenu();
    },

    toggleMenu: function () {
        this.isOpen = !this.isOpen;
        this.menuGroup.setAttribute('visible', this.isOpen);
        this.triggerHaptic(0.5, 50);

        if (this.isOpen) {
            console.log('[PieMenu] OPEN');
            this.el.sceneEl.emit('transform-mode-end');
            this.loadMenu('main');
        } else {
            console.log('[PieMenu] CLOSED');
        }
    },

    triggerHaptic: function (intensity, duration) {
        var gamepad = this.el.components['oculus-touch-controls'];
        if (gamepad && gamepad.controller && gamepad.controller.gamepad) {
            var actuators = gamepad.controller.gamepad.hapticActuators;
            if (actuators && actuators[0]) {
                actuators[0].pulse(intensity, duration);
            }
        }
    },

    tick: function () {
        // Keep menu facing camera
        if (this.isOpen && this.menuGroup) {
            var camera = document.querySelector('#camera');
            if (camera) {
                var camPos = camera.object3D.getWorldPosition(new THREE.Vector3());
                this.menuGroup.object3D.lookAt(camPos);
            }
        }
    }
});

console.log('[PieMenu] Component registered');
