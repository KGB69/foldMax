/**
 * Simple Controller Menu - Bulletproof Implementation
 * Uses direct raycaster polling instead of events
 */

AFRAME.registerComponent('simple-controller-menu', {
    schema: {
        hand: { default: 'right' },
        radius: { default: 0.12 },
        innerRadius: { default: 0.03 },
        distance: { default: 0.15 }
    },

    init: function () {
        console.log('[SimpleMenu] Initializing for', this.data.hand);

        this.isOpen = false;
        this.menuGroup = null;
        this.segments = [];
        this.currentSegment = null;
        this.menuState = 'main';
        this.triggerPressed = false;

        // Menu definitions
        this.menus = {
            main: [
                { id: 'rotate', label: 'Rotate', icon: '↻', color: '#FF9800' },
                { id: 'scale', label: 'Scale', icon: '⤢', color: '#9C27B0' },
                { id: 'move', label: 'Move', icon: '↔', color: '#2196F3' }
            ],
            rotate: [
                { id: 'rotate_x', label: 'X', icon: 'X', color: '#FF0000' },
                { id: 'rotate_y', label: 'Y', icon: 'Y', color: '#00FF00' },
                { id: 'rotate_z', label: 'Z', icon: 'Z', color: '#0000FF' },
                { id: 'back', label: 'Back', icon: '←', color: '#888888' }
            ],
            scale: [
                { id: 'scale_uniform', label: 'Scale', icon: '⤢', color: '#9C27B0' },
                { id: 'back', label: 'Back', icon: '←', color: '#888888' }
            ],
            move: [
                { id: 'move_x', label: 'X', icon: 'X', color: '#FF0000' },
                { id: 'move_y', label: 'Y', icon: 'Y', color: '#00FF00' },
                { id: 'move_z', label: 'Z', icon: 'Z', color: '#0000FF' },
                { id: 'back', label: 'Back', icon: '←', color: '#888888' }
            ]
        };

        this.createMenu();
        this.setupListeners();

        console.log('[SimpleMenu] Ready');
    },

    createMenu: function () {
        this.menuGroup = document.createElement('a-entity');
        this.menuGroup.setAttribute('visible', false);
        this.menuGroup.setAttribute('position', '0 0.08 -' + this.data.distance);
        this.el.appendChild(this.menuGroup);
    },

    loadMenu: function (menuName) {
        // Clear existing
        while (this.menuGroup.firstChild) {
            this.menuGroup.removeChild(this.menuGroup.firstChild);
        }
        this.segments = [];
        this.currentSegment = null;
        this.menuState = menuName;

        var items = this.menus[menuName];
        var numItems = items.length;
        var segmentAngle = 360 / numItems;
        var gap = 2;

        for (var i = 0; i < numItems; i++) {
            var item = items[i];
            var startAngle = i * segmentAngle - 90 + gap / 2;
            var endAngle = startAngle + segmentAngle - gap;
            this.createSegment(item, startAngle, endAngle);
        }
    },

    createSegment: function (itemData, startAngle, endAngle) {
        var radius = this.data.radius;
        var innerRadius = this.data.innerRadius;

        // Create wedge shape
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
            color: itemData.color,
            side: THREE.DoubleSide,
            transparent: true,
            opacity: 0.85
        });

        var mesh = new THREE.Mesh(geometry, material);
        mesh.position.z = 0.001;

        var segmentEl = document.createElement('a-entity');
        segmentEl.setObject3D('mesh', mesh);
        segmentEl.classList.add('clickable');
        segmentEl.classList.add('menu-segment');
        segmentEl.dataset.action = itemData.id;

        this.menuGroup.appendChild(segmentEl);

        // Label
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

        this.segments.push({
            el: segmentEl,
            mesh: mesh,
            material: material,
            baseColor: new THREE.Color(itemData.color),
            action: itemData.id
        });
    },

    setupListeners: function () {
        var self = this;

        this.el.addEventListener('gripdown', function () {
            self.toggleMenu();
        });

        this.el.addEventListener('triggerdown', function () {
            if (self.isOpen && !self.triggerPressed) {
                self.triggerPressed = true;
                self.onTrigger();
            }
        });

        this.el.addEventListener('triggerup', function () {
            self.triggerPressed = false;
        });
    },

    toggleMenu: function () {
        this.isOpen = !this.isOpen;
        this.menuGroup.setAttribute('visible', this.isOpen);

        if (this.isOpen) {
            console.log('[SimpleMenu] OPEN');
            this.loadMenu('main');
        } else {
            console.log('[SimpleMenu] CLOSED');
            this.currentSegment = null;
        }
    },

    onTrigger: function () {
        if (!this.currentSegment) {
            console.log('[SimpleMenu] No segment selected');
            return;
        }

        var action = this.currentSegment.action;
        console.log('[SimpleMenu] Executing action:', action);

        if (action === 'back') {
            this.loadMenu('main');
        } else if (action === 'rotate') {
            this.loadMenu('rotate');
        } else if (action === 'scale') {
            this.loadMenu('scale');
        } else if (action === 'move') {
            this.loadMenu('move');
        } else if (action.startsWith('rotate_') || action.startsWith('move_') || action === 'scale_uniform') {
            this.el.sceneEl.emit('transform-mode-start', {
                mode: action,
                hand: this.data.hand
            });
            this.toggleMenu();
        }
    },

    tick: function () {
        if (!this.isOpen) return;

        // Make menu face camera
        var camera = document.querySelector('#camera');
        if (camera) {
            var camPos = camera.object3D.getWorldPosition(new THREE.Vector3());
            this.menuGroup.object3D.lookAt(camPos);
        }

        // Check raycaster intersection
        var raycaster = this.el.components.raycaster;
        if (!raycaster || !raycaster.intersections) return;

        var foundSegment = null;

        for (var i = 0; i < raycaster.intersections.length; i++) {
            var intersection = raycaster.intersections[i];
            var el = intersection.object.el;

            if (el && el.classList.contains('menu-segment')) {
                foundSegment = this.segments.find(function (s) { return s.el === el; });
                break;
            }
        }

        // Update highlighting
        if (foundSegment !== this.currentSegment) {
            // Clear old highlight
            if (this.currentSegment) {
                this.currentSegment.material.color.copy(this.currentSegment.baseColor);
                this.currentSegment.material.opacity = 0.85;
            }

            // Set new highlight
            this.currentSegment = foundSegment;
            if (this.currentSegment) {
                this.currentSegment.material.color.set('#00FFFF');
                this.currentSegment.material.opacity = 1.0;
            }
        }
    }
});

console.log('[SimpleMenu] Component registered');
