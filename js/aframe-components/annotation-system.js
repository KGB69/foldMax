/**
 * ANNOTATION SYSTEM BUNDLE
 * Contains: 
 * 1. annotation-manager (System)
 * 2. annotation-label (Component)
 * 3. annotation-raycaster (Component)
 */

console.log('[AnnotationSystem] Bundle Loaded via Script Tag');

// =========================================================================================
// 1. ANNOTATION MANAGER (SYSTEM)
// =========================================================================================
AFRAME.registerSystem('annotation-manager', {
    init: function () {
        console.log('[AnnotationManager] System Initializing...');
        this.annotations = [];
        this.pdbId = null;

        // Listen for PDB load events
        this.el.addEventListener('pdb-loading-start', (evt) => {
            this.pdbId = evt.detail.pdbId;
            this.loadAnnotations();
        });

        // Listen for pin events
        this.el.addEventListener('pin-annotation', (evt) => {
            this.addAnnotation(evt.detail.atomData, evt.detail.position);
        });

        // Listen for clear events
        this.el.addEventListener('clear-annotations', () => {
            this.clearAll();
        });

        console.log('[AnnotationManager] System Ready');
    },

    addAnnotation: function (atomData, position) {
        if (!this.pdbId) {
            console.warn('[AnnotationManager] No PDB loaded, cannot save annotation.');
        }

        var id = atomData.chainname + '_' + atomData.resid + '_' + atomData.name;

        // Check duplicates
        var existing = this.annotations.find(a => a.id === id);
        if (existing) {
            console.log('[AnnotationManager] Annotation already exists:', id);
            return;
        }

        var annotation = {
            id: id,
            pos: { x: position.x, y: position.y, z: position.z },
            text: this.formatText(atomData),
            atomData: atomData,
            timestamp: Date.now()
        };

        this.annotations.push(annotation);
        this.spawnLabel(annotation);
        this.save();
    },

    clearAll: function () {
        var labels = document.querySelectorAll('[annotation-label]');
        labels.forEach(el => {
            if (el.classList.contains('pinned-annotation')) {
                el.parentNode.removeChild(el);
            }
        });

        this.annotations = [];
        this.save();
        console.log('[AnnotationManager] Cleared all annotations');
    },

    spawnLabel: function (data) {
        var el = document.createElement('a-entity');
        el.classList.add('pinned-annotation');
        el.setAttribute('annotation-label', {
            text: data.text,
            targetPos: data.pos
        });
        this.el.sceneEl.appendChild(el);
    },

    formatText: function (atom) {
        return `${atom.resname} ${atom.resid}\n${atom.name} (${atom.chainname})`;
    },

    save: function () {
        if (!this.pdbId) return;
        var key = 'vrmol_annotations_' + this.pdbId;
        localStorage.setItem(key, JSON.stringify(this.annotations));
    },

    loadAnnotations: function () {
        var labels = document.querySelectorAll('.pinned-annotation');
        labels.forEach(el => el.parentNode.removeChild(el));

        if (!this.pdbId) return;

        var key = 'vrmol_annotations_' + this.pdbId;
        var saved = localStorage.getItem(key);

        if (saved) {
            try {
                this.annotations = JSON.parse(saved);
                console.log('[AnnotationManager] Loaded', this.annotations.length, 'annotations');
                this.annotations.forEach(a => this.spawnLabel(a));
            } catch (e) {
                console.error('[AnnotationManager] Error loading annotations:', e);
                this.annotations = [];
            }
        } else {
            this.annotations = [];
        }
    }
});

// =========================================================================================
// 2. ANNOTATION LABEL (COMPONENT)
// =========================================================================================
AFRAME.registerComponent('annotation-label', {
    schema: {
        text: { type: 'string', default: '' },
        targetPos: { type: 'vec3' },
        isPreview: { type: 'boolean', default: false }
    },

    init: function () {
        // Text Entity
        this.textEl = document.createElement('a-entity');
        this.textEl.setAttribute('text', {
            align: 'center',
            color: '#FFFFFF',
            width: 1.5,
            shader: 'msdf',
            font: 'https://raw.githubusercontent.com/etiennepinchon/aframe-fonts/master/fonts/roboto/Roboto-Bold.json'
        });

        // Background Panel
        var bgEl = document.createElement('a-entity');
        bgEl.setAttribute('geometry', { primitive: 'plane', width: 'auto', height: 'auto' });
        bgEl.setAttribute('material', { color: '#000000', opacity: 0.7, transparent: true, side: 'double' });
        bgEl.setAttribute('scale', '0.45 0.2 1');
        bgEl.setAttribute('position', '0 0 -0.01');
        this.textEl.appendChild(bgEl);

        // Connector Line (Empty container, updated in update())
        this.lineEl = document.createElement('a-entity');

        this.el.appendChild(this.textEl);
        this.el.appendChild(this.lineEl);

        // Billboarding
        this.el.setAttribute('look-at', '[camera]');

        // Offset relative to target
        this.offset = new THREE.Vector3(0, 0.25, 0);
    },

    update: function () {
        this.textEl.setAttribute('text', 'value', this.data.text);

        var pos = this.data.targetPos;
        this.el.object3D.position.set(pos.x, pos.y, pos.z).add(this.offset);

        var lineColor = this.data.isPreview ? '#00FFFF' : '#FFFF00';

        // Draw line from 0,0,0 (Label) down to 0,-offset,0 (Atom)
        this.lineEl.setAttribute('line', {
            start: '0 0 0',
            end: '0 ' + (-this.offset.y) + ' 0',
            color: lineColor
        });
    }
});

// =========================================================================================
// 3. ANNOTATION RAYCASTER (COMPONENT)
// =========================================================================================
AFRAME.registerComponent('annotation-raycaster', {
    dependencies: ['raycaster'],

    init: function () {
        console.log('[AnnotationRaycaster] Init');
        this.onTriggerDown = this.onTriggerDown.bind(this);
        this.onGripDown = this.onGripDown.bind(this);
        this.onIntersection = this.onIntersection.bind(this);
        this.onIntersectionCleared = this.onIntersectionCleared.bind(this);

        this.el.addEventListener('triggerdown', this.onTriggerDown);
        this.el.addEventListener('gripdown', this.onGripDown);
        this.el.addEventListener('raycaster-intersection', this.onIntersection);
        this.el.addEventListener('raycaster-intersection-cleared', this.onIntersectionCleared);

        this.hoveredAtom = null;
        this.hoveredPoint = null;
        this.hoveredMesh = null;

        // Create Preview Entity
        this.previewEl = document.createElement('a-entity');
        this.previewEl.setAttribute('annotation-label', { text: '', targetPos: { x: 0, y: 0, z: 0 }, isPreview: true });
        this.previewEl.object3D.visible = false;
        this.el.sceneEl.appendChild(this.previewEl);
    },

    remove: function () {
        this.el.removeEventListener('triggerdown', this.onTriggerDown);
        this.el.removeEventListener('gripdown', this.onGripDown);
        this.el.removeEventListener('raycaster-intersection', this.onIntersection);
        this.el.removeEventListener('raycaster-intersection-cleared', this.onIntersectionCleared);
        if (this.previewEl && this.previewEl.parentNode) this.previewEl.parentNode.removeChild(this.previewEl);
        if (this.hoveredMesh) this.removeGlow(this.hoveredMesh);
    },

    onIntersection: function (evt) {
        var raycaster = this.el.components.raycaster;
        var intersection = raycaster.getIntersection(evt.detail.els[0]);

        if (intersection) {
            // DEBUG LOGS
            // console.log('[RaycasterHit] UUID:', intersection.object.uuid);
        }

        if (!intersection) return;

        var object = intersection.object;
        var atomData = this.getAtomData(object);

        if (atomData) {
            console.log('[AnnotationSystem] Hit Atom:', atomData.name);
            this.hoveredAtom = atomData;
            this.hoveredPoint = intersection.point;

            if (this.hoveredMesh !== object) {
                if (this.hoveredMesh) this.removeGlow(this.hoveredMesh);
                this.hoveredMesh = object;
                this.applyGlow(this.hoveredMesh);
            }

            this.previewEl.setAttribute('annotation-label', {
                text: this.formatLabelText(atomData),
                targetPos: this.hoveredPoint,
                isPreview: true
            });
            this.previewEl.object3D.visible = true;
        }
    },

    onIntersectionCleared: function () {
        if (this.hoveredMesh) {
            this.removeGlow(this.hoveredMesh);
            this.hoveredMesh = null;
        }
        this.hoveredAtom = null;
        this.hoveredPoint = null;
        this.previewEl.object3D.visible = false;
    },

    onTriggerDown: function () {
        if (this.hoveredAtom && this.hoveredPoint) {
            console.log('[AnnotationSystem] Pinning');
            this.el.sceneEl.emit('pin-annotation', {
                atomData: this.hoveredAtom,
                position: this.hoveredPoint
            });
        }
    },

    onGripDown: function () {
        console.log('[AnnotationSystem] Clearing');
        this.el.sceneEl.emit('clear-annotations');
    },

    applyGlow: function (mesh) {
        if (!mesh.material) return;
        var mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach(mat => {
            if (!mat.userData.originalEmissive) {
                mat.userData.originalEmissive = mat.emissive ? mat.emissive.clone() : new THREE.Color(0, 0, 0);
            }
            if (mat.emissive) mat.emissive.setHex(0x444444);
            mat.needsUpdate = true;
        });
    },

    removeGlow: function (mesh) {
        if (!mesh || !mesh.material) return;
        var mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach(mat => {
            if (mat.userData.originalEmissive) {
                mat.emissive.copy(mat.userData.originalEmissive);
            } else {
                mat.emissive.setHex(0x000000);
            }
            mat.needsUpdate = true;
        });
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

    formatLabelText: function (atom) {
        var res = atom.resname || '???';
        var resid = atom.resid || '';
        var name = atom.name || '';
        return `${res} ${resid}\n${name}`;
    }
});
