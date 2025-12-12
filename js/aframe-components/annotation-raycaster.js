/**
 * Annotation System for VRmol
 * Interaction: Hover to Preview, Trigger to Pin, Grip to Clear.
 */

AFRAME.registerComponent('annotation-raycaster', {
    dependencies: ['raycaster'],

    init: function () {
        this.onTriggerDown = this.onTriggerDown.bind(this);
        this.onGripDown = this.onGripDown.bind(this);
        this.onIntersection = this.onIntersection.bind(this);
        this.onIntersectionCleared = this.onIntersectionCleared.bind(this);

        // Controller Events
        this.el.addEventListener('triggerdown', this.onTriggerDown);
        this.el.addEventListener('gripdown', this.onGripDown);

        // Raycaster Events
        this.el.addEventListener('raycaster-intersection', this.onIntersection);
        this.el.addEventListener('raycaster-intersection-cleared', this.onIntersectionCleared);

        // State
        this.hoveredAtom = null;
        this.hoveredPoint = null;

        // Create Preview Entity (Hidden by default)
        this.previewEl = document.createElement('a-entity');
        this.previewEl.setAttribute('annotation-label', { text: '', targetPos: { x: 0, y: 0, z: 0 } });
        this.previewEl.object3D.visible = false;
        this.el.sceneEl.appendChild(this.previewEl);

        console.log('[AnnotationSystem] Init: Hover->Preview, Trigger->Pin');
    },

    remove: function () {
        this.el.removeEventListener('triggerdown', this.onTriggerDown);
        this.el.removeEventListener('gripdown', this.onGripDown);
        this.el.removeEventListener('raycaster-intersection', this.onIntersection);
        this.el.removeEventListener('raycaster-intersection-cleared', this.onIntersectionCleared);

        if (this.previewEl && this.previewEl.parentNode) {
            this.previewEl.parentNode.removeChild(this.previewEl);
        }
    },

    onIntersection: function (evt) {
        // evt.detail.els is an array of intersected entities
        var raycaster = this.el.components.raycaster;
        // intersectObjects is internal, getIntersection is safer if available
        var intersection = raycaster.getIntersection(evt.detail.els[0]);

        if (!intersection) return;

        var object = intersection.object;
        var atomData = this.getAtomData(object);

        if (atomData) {
            this.hoveredAtom = atomData;
            this.hoveredPoint = intersection.point;

            // Show Preview
            this.previewEl.setAttribute('annotation-label', {
                text: this.formatLabelText(atomData),
                targetPos: this.hoveredPoint
            });
            this.previewEl.object3D.visible = true;
        }
    },

    onIntersectionCleared: function () {
        this.hoveredAtom = null;
        this.hoveredPoint = null;
        // Hide Preview
        this.previewEl.object3D.visible = false;
    },

    onTriggerDown: function () {
        // Pin the current preview if valid
        if (this.hoveredAtom && this.hoveredPoint) {
            this.spawnPermanentLabel(this.hoveredPoint, this.hoveredAtom);
        }
    },

    onGripDown: function () {
        console.log('[AnnotationSystem] Clearing all pinned annotations');
        var labels = document.querySelectorAll('.pinned-annotation');
        for (var i = 0; i < labels.length; i++) {
            labels[i].parentNode.removeChild(labels[i]);
        }
    },

    getAtomData: function (object) {
        var curr = object;
        while (curr) {
            if (curr.userData) {
                var atom = curr.userData.presentAtom || curr.userData.atom;
                if (atom) return atom;
            }
            if (curr.userData && curr.userData.group && curr.userData.group === 'main') break;
            curr = curr.parent;
        }
        return null;
    },

    spawnPermanentLabel: function (position, atom) {
        // Create new entity
        var labelEl = document.createElement('a-entity');
        labelEl.classList.add('pinned-annotation'); // Mark for clearing
        labelEl.setAttribute('annotation-label', {
            text: this.formatLabelText(atom),
            targetPos: position
        });
        this.el.sceneEl.appendChild(labelEl);
        console.log('[AnnotationSystem] Pinned label for:', atom.name);
    },

    formatLabelText: function (atom) {
        var res = atom.resname || '???';
        var resid = atom.resid || '';
        var name = atom.name || '';
        var chain = atom.chainname || '';
        return `${res} ${resid}\n${name} Chain:${chain}`;
    }
});

// Reusable Label Component
AFRAME.registerComponent('annotation-label', {
    schema: {
        text: { type: 'string', default: '' },
        targetPos: { type: 'vec3' }
    },

    init: function () {
        // Text
        this.textEl = document.createElement('a-entity');
        this.textEl.setAttribute('text', {
            align: 'center', color: '#FFFFFF', width: 1.5,
            shader: 'msdf',
            font: 'https://raw.githubusercontent.com/etiennepinchon/aframe-fonts/master/fonts/roboto/Roboto-Bold.json'
        });

        // Background
        var bgEl = document.createElement('a-entity');
        bgEl.setAttribute('geometry', { primitive: 'plane', width: 'auto', height: 'auto' });
        bgEl.setAttribute('material', { color: '#000000', opacity: 0.6, transparent: true });
        bgEl.setAttribute('scale', '0.4 0.15 1');
        bgEl.setAttribute('position', '0 0 -0.01');
        this.textEl.appendChild(bgEl);

        // Line
        this.lineEl = document.createElement('a-entity');

        this.el.appendChild(this.textEl);
        this.el.appendChild(this.lineEl);

        this.el.setAttribute('look-at', '[camera]');
    },

    update: function () {
        // Update Text
        this.textEl.setAttribute('text', 'value', this.data.text);

        // Update Position
        var pos = this.data.targetPos;
        this.el.object3D.position.set(pos.x, pos.y + 0.2, pos.z);

        // Update Line
        this.lineEl.setAttribute('line', {
            start: '0 0 0',
            end: '0 -0.2 0',
            color: '#FFFF00'
        });
    }
});
