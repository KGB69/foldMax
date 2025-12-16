/**
 * ANNOTATION SYSTEM BUNDLE
 * Contains: 
 * 1. annotation-manager (System)
 * 2. annotation-label (Component)
 * 3. annotation-raycaster (Component)
 */

console.log('[annotation-system-v2.js] SCRIPT START - If you see this, the file loaded!');

console.log('[AnnotationSystem] Bundle Loaded via Script Tag');

// =========================================================================================
// 1. ANNOTATION MANAGER (SYSTEM)
// =========================================================================================
AFRAME.registerSystem('annotation-manager', {
    init: function () {
        console.log('[AnnotationManager] System Initializing...');
        this.annotations = [];
        this.pdbId = null;

        this.el.addEventListener('pdb-loading-start', (evt) => {
            this.pdbId = evt.detail.pdbId;
            this.loadAnnotations();
        });

        this.el.addEventListener('pin-annotation', (evt) => {
            this.addAnnotation(evt.detail.atomData, evt.detail.position, evt.detail.mode);
        });

        this.el.addEventListener('clear-annotations', () => {
            this.clearAll();
        });

        console.log('[AnnotationManager] System Ready');
    },

    addAnnotation: function (atomData, pos, mode) {
        mode = mode || 'atom';
        var id = atomData.chainname + '_' + atomData.resid + '_' + atomData.name + '_' + mode;

        var existing = this.annotations.find(a => a.id === id);
        if (existing) return;

        var labelEl = document.createElement('a-entity');
        labelEl.classList.add('pinned-annotation');
        var text = this.formatText(atomData, mode);

        labelEl.setAttribute('annotation-label', {
            text: text,
            targetPos: pos,
            isPreview: false
        });

        this.el.sceneEl.appendChild(labelEl);

        var annotation = {
            id: id,
            pos: { x: pos.x, y: pos.y, z: pos.z },
            text: text,
            atomData: atomData,
            mode: mode,
            timestamp: Date.now()
        };

        this.annotations.push(annotation);
        this.saveAnnotations();
    },

    formatText: function (data, mode) {
        if (mode === 'chain') return `Chain ${data.chainname}`;
        if (mode === 'residue') return `Res ${data.resname} ${data.resid}`;
        return `${data.name} #${data.id}\n${data.resname} ${data.resid}`;
    },

    clearAll: function () {
        var labels = document.querySelectorAll('.pinned-annotation');
        labels.forEach(el => el.parentNode.removeChild(el));
        this.annotations = [];
        this.saveAnnotations();
    },

    saveAnnotations: function () {
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
                var loadedData = JSON.parse(saved);
                this.annotations = [];
                loadedData.forEach(a => {
                    this.addAnnotation(a.atomData, a.pos, a.mode);
                });
            } catch (e) {
                this.annotations = [];
            }
        }
    }
});

// =========================================================================================
// 2. ANNOTATION LABEL (COMPONENT)
// =========================================================================================
/**
 * Component: annotation-label
 * Renders the text and line.
 * UPDATED: Fixes clipping and improves visual container.
 */
AFRAME.registerComponent('annotation-label', {
    schema: {
        text: { type: 'string', default: '' },
        targetPos: { type: 'vec3' },
        isPreview: { type: 'boolean', default: false }
    },

    init: function () {
        this.offset = new THREE.Vector3(0, 0.2, 0); // 20cm above atom

        // Container (Billboarded)
        this.containerInfo = document.createElement('a-entity');
        this.containerInfo.setAttribute('look-at', '[camera]'); // Always face user
        this.el.appendChild(this.containerInfo);

        // Background Plane (The "Neat Container")
        this.bgEl = document.createElement('a-entity');
        this.bgEl.setAttribute('geometry', { primitive: 'plane', width: 'auto', height: 0.15 });
        this.bgEl.setAttribute('material', {
            color: '#000000',
            opacity: 0.8,
            transparent: true,
            depthTest: false, // ALWAYS ON TOP
            shader: 'flat'
        });
        // Important: Render Order for "Always on Top" effect
        this.bgEl.object3D.renderOrder = 9999;
        this.containerInfo.appendChild(this.bgEl);

        // Text
        this.textEl = document.createElement('a-entity');
        this.textEl.setAttribute('text', {
            value: this.data.text,
            align: 'center',
            color: '#FFFFFF',
            width: 1.5,
            wrapCount: 20
        });
        // Disable depth test for text too
        // We do this via a custom component or direct object access after load, 
        // but for <a-text>, sticking to standard might be safer. 
        // A-Frame text uses an SDF shader that usually handles depth well, 
        // but we can try to force it via renderOrder.
        this.textEl.object3D.renderOrder = 10000; // Above background
        this.containerInfo.appendChild(this.textEl);

        // Connector Line
        this.lineEl = document.createElement('a-entity');
        // We'll update line geometry in tick/update
        this.el.appendChild(this.lineEl);
    },

    update: function () {
        this.textEl.setAttribute('text', 'value', this.data.text);

        // Resize background based on text length (approximate)
        var len = this.data.text.length;
        var width = Math.max(0.3, len * 0.03); // Auto-width
        this.bgEl.setAttribute('geometry', { width: width, height: 0.15 });

        var pos = this.data.targetPos;
        this.el.object3D.position.set(pos.x, pos.y, pos.z).add(this.offset);

        var lineColor = this.data.isPreview ? '#00FFFF' : '#FFFF00';

        // Update Line
        this.lineEl.setAttribute('line', {
            start: '0 0 0',
            end: `0 ${-this.offset.y} 0`,
            color: lineColor,
            opacity: 0.8
        });
        // Line also needs to see through geometry?
        // Usually lines are thin enough to not matter, but let's try
        // note: 'line' component creates an object, we can't easily access its material here immediately.
    },

    tick: function () {
        // Ensure depthTest is off for the text mesh if it exists
        var mesh = this.textEl.getObject3D('mesh');
        if (mesh && mesh.material) {
            mesh.material.depthTest = false;
            mesh.material.transparent = true;
        }
    }
});

// =========================================================================================
// 3. ANNOTATION RAYCASTER (COMPONENT)
// =========================================================================================
/**
 * Component: annotation-raycaster
 * Handles interaction and state.
 * UPDATED: Adds X-Button for Mode Switching (Atom -> Residue -> Chain)
 */
AFRAME.registerComponent('annotation-raycaster', {
    dependencies: ['raycaster'],

    init: function () {
        console.log('[AnnotationRaycaster] Init');
        this.onTriggerDown = this.onTriggerDown.bind(this);
        this.onGripDown = this.onGripDown.bind(this);
        this.onYButtonDown = this.onYButtonDown.bind(this); // Cycle Mode (Moved from X)
        this.onIntersection = this.onIntersection.bind(this);
        this.onIntersectionCleared = this.onIntersectionCleared.bind(this);
        this.tick = AFRAME.utils.throttleTick(this.tick.bind(this), 100); // 10Hz Check

        this.el.addEventListener('triggerdown', this.onTriggerDown);
        this.el.addEventListener('gripdown', this.onGripDown);
        this.el.addEventListener('ybuttondown', this.onYButtonDown);
        this.el.addEventListener('raycaster-intersection', this.onIntersection);
        this.el.addEventListener('raycaster-intersection-cleared', this.onIntersectionCleared);

        this.hoveredAtom = null;
        this.hoveredPoint = null;
        this.hoveredMesh = null;

        this.modes = ['atom', 'residue', 'chain'];
        this.currentModeIndex = 0; // Start at 'atom'
        this.currentMode = this.modes[0];

        // Create Preview Entity
        this.previewEl = document.createElement('a-entity');
        this.previewEl.setAttribute('annotation-label', { text: '', targetPos: { x: 0, y: 0, z: 0 }, isPreview: true });
        this.previewEl.object3D.visible = false;
        this.el.sceneEl.appendChild(this.previewEl);

        // Mode Toast (Simple Text to show current mode)
        this.modeTextEl = document.createElement('a-text');
        this.modeTextEl.setAttribute('value', 'Mode: ATOM');
        this.modeTextEl.setAttribute('position', '0 0.1 -0.1'); // Slightly above controller
        this.modeTextEl.setAttribute('scale', '0.5 0.5 0.5');
        this.modeTextEl.setAttribute('align', 'center');
        this.modeTextEl.setAttribute('color', 'yellow');
        this.el.appendChild(this.modeTextEl);
    },

    remove: function () {
        this.el.removeEventListener('triggerdown', this.onTriggerDown);
        this.el.removeEventListener('gripdown', this.onGripDown);
        this.el.removeEventListener('ybuttondown', this.onYButtonDown);
        this.el.removeEventListener('raycaster-intersection', this.onIntersection);
        this.el.removeEventListener('raycaster-intersection-cleared', this.onIntersectionCleared);
        if (this.previewEl && this.previewEl.parentNode) this.previewEl.parentNode.removeChild(this.previewEl);
        if (this.hoveredMesh) this.removeGlow(this.hoveredMesh);
        if (this.modeTextEl && this.modeTextEl.parentNode) this.modeTextEl.parentNode.removeChild(this.modeTextEl);
    },

    onYButtonDown: function () {
        // Cycle Mode
        this.currentModeIndex = (this.currentModeIndex + 1) % this.modes.length;
        this.currentMode = this.modes[this.currentModeIndex];

        // Update UI
        this.modeTextEl.setAttribute('value', 'Mode: ' + this.currentMode.toUpperCase());
        console.log('[AnnotationSystem] Switched to mode:', this.currentMode);

        // Force refresh
        if (this.hoveredAtom && this.hoveredPoint) {
            this.handleAtomHit(this.hoveredAtom, this.hoveredMesh, this.hoveredPoint);
        }
    },

    tick: function (t, dt) {
        if (this.hoveredAtom) return;
        var handPos = new THREE.Vector3();
        this.el.object3D.getWorldPosition(handPos);
        var mol = document.querySelector('#molecule-container');
        if (!mol) return;
        var closest = null;
        var minDst = 0.2;
        var scanner = (obj) => {
            if (obj.userData && (obj.userData.presentAtom || obj.userData.atom)) {
                var p = new THREE.Vector3();
                obj.getWorldPosition(p);
                var d = handPos.distanceTo(p);
                if (d < minDst) { minDst = d; closest = { data: obj.userData.presentAtom || obj.userData.atom, obj: obj, point: p }; }
            }
            if (obj.children) obj.children.forEach(scanner);
        };
        scanner(mol.object3D);
        if (closest) this.handleAtomHit(closest.data, closest.obj, closest.point);
    },

    onIntersection: function (evt) {
        var raycaster = this.el.components.raycaster;
        var intersection = raycaster.getIntersection(evt.detail.els[0]);
        if (!intersection) return;
        var atomData = this.getAtomData(intersection.object);
        if (atomData) this.handleAtomHit(atomData, intersection.object, intersection.point);
    },

    handleAtomHit: function (atomData, object, point) {
        this.hoveredAtom = atomData;
        this.hoveredPoint = point;
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
            var system = document.querySelector('a-scene').systems['annotation-manager'];
            if (system) {
                system.addAnnotation(this.hoveredAtom, this.hoveredPoint, this.currentMode);
            }
        }
    },

    onGripDown: function () {
        var system = document.querySelector('a-scene').systems['annotation-manager'];
        if (system) system.clearAll();
    },

    applyGlow: function (mesh) {
        if (!mesh.material) return;
        var mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach(mat => {
            if (mat.emissive) {
                mat.userData.originalEmissive = mat.emissive.getHex();
                mat.emissive.setHex(0x00FF00);
                mat.needsUpdate = true;
            }
        });
    },

    removeGlow: function (mesh) {
        if (!mesh || !mesh.material) return;
        var mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach(mat => {
            if (mat.userData.originalEmissive !== undefined) {
                mat.emissive.setHex(mat.userData.originalEmissive);
                delete mat.userData.originalEmissive;
                mat.needsUpdate = true;
            } else {
                if (mat.emissive) {
                    mat.emissive.setHex(0x000000);
                    mat.needsUpdate = true;
                }
            }
        });
    },

    getAtomData: function (object) {
        var curr = object;
        while (curr) {
            if (curr.userData && (curr.userData.presentAtom || curr.userData.atom)) {
                return curr.userData.presentAtom || curr.userData.atom;
            }
            curr = curr.parent;
            if (curr && curr.id === 'molecule-container') break;
        }
        return null;
    },

    formatLabelText: function (data) {
        if (this.currentMode === 'chain') return `Chain ${data.chainname}`;
        if (this.currentMode === 'residue') return `Res ${data.resname} ${data.resid}`;
        return `Atom: ${data.name} #${data.id}\n${data.resname} ${data.resid}`;
    }
});
