/**
 * Pie-Chart Radial Menu Component
 * Refactored for Pointer/Raycaster Selection
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
        this.hoveredSegment = null; // Track currently hovered segment
        this.menuState = 'main';

        // Define menu structures (Enter PDB removed)
        this.menus = {
            main: [
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

        console.log('[PieMenu] Ready (Pointer Mode)');
    },

    createMenuContainer: function () {
        this.menuGroup = document.createElement('a-entity');
        this.menuGroup.setAttribute('visible', false);
        this.menuGroup.setAttribute('position', '0 0.08 -' + this.data.distance);
        this.el.appendChild(this.menuGroup);
    },

    loadMenu: function (menuName) {
        if (!this.menus[menuName]) {
            console.error('[PieMenu] Menu not found:', menuName);
            return;
        }

        // Clear existing segments
        while (this.menuGroup.firstChild) {
            this.menuGroup.removeChild(this.menuGroup.firstChild);
        }
        this.segments = [];
        this.hoveredSegment = null;
        this.menuState = menuName;

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
    },

    createPieSegment: function (itemData, startAngle, endAngle, index) {
        var radius = this.data.radius;
        var innerRadius = this.data.innerRadius;

        // Create pie wedge shape
        var shape = new THREE.Shape();
        var startRad = THREE.MathUtils.degToRad(startAngle);
        var endRad = THREE.MathUtils.degToRad(endAngle);

        shape.moveTo(Math.cos(startRad) * innerRadius, Math.sin(startRad) * innerRadius);
        shape.lineTo(Math.cos(startRad) * radius, Math.sin(startRad) * radius);
        shape.absarc(0, 0, radius, startRad, endRad, false);
        shape.lineTo(Math.cos(endRad) * innerRadius, Math.sin(endRad) * innerRadius);
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

        // Make interactable using raycaster
        segmentEl.classList.add('clickable');

        // Add listeners for hover effect
        var self = this;
        var segmentObj = {
            id: itemData.id,
            el: segmentEl,
            mesh: mesh,
            material: material,
            baseColor: new THREE.Color(itemData.color || this.data.baseColor)
        };

        segmentEl.addEventListener('mouseenter', function () {
            self.onSegmentHover(segmentObj);
        });

        segmentEl.addEventListener('mouseleave', function () {
            self.onSegmentOut(segmentObj);
        });

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

        // Pass interactions on label through to segment? 
        // A-text is an entity, might block raycaster if not handled. 
        // Let's make label clickable too or non-interactive.
        // Actually, raycaster normally hits mesh first. Let's create label but maybe ignore it for now or assume segment is big enough.
        this.menuGroup.appendChild(labelEl);

        return segmentObj;
    },

    setupListeners: function () {
        var self = this;

        // Grip to toggle
        this.el.addEventListener('gripdown', function () {
            self.toggleMenu();
        });

        // Trigger to select currently hovered item
        this.el.addEventListener('triggerdown', function () {
            if (!self.isOpen) return;
            self.selectHoveredItem();
        });
    },

    onSegmentHover: function (segment) {
        if (!this.isOpen) return;
        this.hoveredSegment = segment;

        // Highlight
        segment.material.color.set(this.data.highlightColor);
        segment.material.opacity = 1.0;

        this.triggerHaptic(0.2, 20);
    },

    onSegmentOut: function (segment) {
        if (!this.isOpen) return;
        if (this.hoveredSegment === segment) {
            this.hoveredSegment = null;
        }

        // Reset color
        segment.material.color.copy(segment.baseColor);
        segment.material.opacity = 0.85;
    },

    selectHoveredItem: function () {
        if (!this.hoveredSegment) return;

        var itemId = this.hoveredSegment.id;
        console.log('[PieMenu] Selected:', itemId);
        this.triggerHaptic(0.6, 50);

        if (itemId === 'back') {
            this.loadMenu('main');
        } else if (itemId === 'rotate') {
            this.loadMenu('rotate');
        } else if (itemId === 'scale') {
            this.loadMenu('scale');
        } else if (itemId === 'move') {
            this.loadMenu('move');
        } else if (itemId.startsWith('rotate_') || itemId.startsWith('move_') || itemId === 'scale_uniform') {
            this.el.sceneEl.emit('transform-mode-start', {
                mode: itemId,
                hand: this.data.hand
            });
            this.toggleMenu();
        }
    },

    toggleMenu: function () {
        this.isOpen = !this.isOpen;
        this.menuGroup.setAttribute('visible', this.isOpen);
        this.triggerHaptic(0.5, 50);

        if (this.isOpen) {
            console.log('[PieMenu] OPEN');
            this.el.sceneEl.emit('transform-mode-end');
            // Ensure raycaster intercepts menu
            this.menuGroup.classList.add('clickable');
            this.loadMenu('main');
        } else {
            console.log('[PieMenu] CLOSED');
            this.hoveredSegment = null;
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
        if (this.isOpen && this.menuGroup) {
            var camera = document.querySelector('#camera');
            if (camera) {
                var camPos = camera.object3D.getWorldPosition(new THREE.Vector3());
                this.menuGroup.object3D.lookAt(camPos);
            }
        }
    }
});

console.log('[PieMenu] Component registered (Pointer Version)');
