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
 * UPDATED: Cleaner container with border and dot.
 */
AFRAME.registerComponent('annotation-label', {
    schema: {
        text: { type: 'string', default: '' },
        targetPos: { type: 'vec3' },
        isPreview: { type: 'boolean', default: false }
    },

    init: function () {
        this.offset = new THREE.Vector3(0, 0.25, 0); // 25cm above atom

        // Main Container (Billboarded)
        this.containerInfo = document.createElement('a-entity');
        this.containerInfo.setAttribute('look-at', '[camera]'); // Always face user
        this.el.appendChild(this.containerInfo);

        // 1. Background Panel (Dark with Border)
        this.bgEl = document.createElement('a-entity');
        this.bgEl.setAttribute('geometry', { primitive: 'plane', width: 'auto', height: 0.12 });
        this.bgEl.setAttribute('material', {
            color: '#111111',
            opacity: 0.9,
            transparent: true,
            shader: 'flat',
            depthTest: false
        });
        this.bgEl.object3D.renderOrder = 9999;
        this.containerInfo.appendChild(this.bgEl);

        // Border (slightly larger plane behind, or lines) -> Using a slightly larger plane for border effect
        this.borderEl = document.createElement('a-entity');
        this.borderEl.setAttribute('geometry', { primitive: 'plane', width: 'auto', height: 0.13 });
        this.borderEl.setAttribute('material', { color: '#444444', shader: 'flat', depthTest: false });
        this.borderEl.object3D.renderOrder = 9998;
        this.borderEl.setAttribute('position', '0 0 -0.001');
        this.containerInfo.appendChild(this.borderEl);

        // 2. Text - SCALE DOWN for VR readability
        this.textEl = document.createElement('a-entity');
        this.textEl.setAttribute('text', {
            value: this.data.text,
            align: 'center',
            color: '#FFFFFF',
            width: 0.4,
            wrapCount: 30,
            baseline: 'center',
            anchor: 'center'
        });
        this.textEl.object3D.renderOrder = 10000;
        this.containerInfo.appendChild(this.textEl);

        // 3. Connector Line
        this.lineEl = document.createElement('a-entity');
        this.el.appendChild(this.lineEl);

        // 4. Anchor Dot (Visual anchor at the atom)
        this.dotEl = document.createElement('a-entity');
        this.dotEl.setAttribute('geometry', { primitive: 'sphere', radius: 0.008 });
        this.dotEl.setAttribute('material', { color: '#00FFFF', shader: 'flat', depthTest: false });
        this.dotEl.object3D.renderOrder = 10000;
        this.el.appendChild(this.dotEl);
    },

    update: function () {
        this.textEl.setAttribute('text', 'value', this.data.text);

        // Dynamic Sizing based on text width property (0.4)
        var lines = this.data.text.split('\n');
        var lineCount = lines.length;
        var maxLen = 0;
        lines.forEach(l => { maxLen = Math.max(maxLen, l.length); });

        // For width=0.4 text, each char is roughly 0.013 units
        var width = Math.max(0.08, maxLen * 0.013) + 0.03;
        var height = (lineCount * 0.025) + 0.02;

        this.bgEl.setAttribute('geometry', { width: width, height: height });
        this.borderEl.setAttribute('geometry', { width: width + 0.005, height: height + 0.005 });

        // Center text in box
        // A-Frame text is anchored center, so just placing bg at 0,0 is fine if text is at 0,0
        // But we want the connector line to come from the BOTTOM of the box.

        var pos = this.data.targetPos;
        this.el.object3D.position.set(pos.x, pos.y, pos.z);
        this.containerInfo.object3D.position.copy(this.offset);

        var color = this.data.isPreview ? '#00FFFF' : '#FFFF00';
        this.dotEl.setAttribute('material', 'color', color);

        // Line from bottom of box to origin
        // Box bottom y is -height/2
        var boxBottom = -height / 2;

        this.lineEl.setAttribute('line', {
            start: { x: 0, y: this.offset.y + boxBottom, z: 0 },
            end: { x: 0, y: 0, z: 0 },
            color: color,
            opacity: 0.8
        });
    },

    tick: function () {
        // Enforce depthTest false on children meshes if loaded
        var mesh = this.textEl.getObject3D('mesh');
        if (mesh && mesh.material) mesh.material.depthTest = false;
    }
});

// =========================================================================================
// 3. WRIST WATCH / MODE PANEL (COMPONENT)
// =========================================================================================
AFRAME.registerComponent('annotation-mode-panel', {
    init: function () {
        // Container attached to controller
        this.panel = document.createElement('a-entity');
        this.panel.setAttribute('position', '0 0.06 0.08');
        this.panel.setAttribute('rotation', '-45 0 0');

        // Background - sized to fit text
        var bg = document.createElement('a-entity');
        bg.setAttribute('geometry', { primitive: 'plane', width: 0.08, height: 0.06 });
        bg.setAttribute('material', { color: '#111', opacity: 0.95, shader: 'flat', transparent: true });
        this.panel.appendChild(bg);

        this.el.appendChild(this.panel);

        // Mode Labels (Vertical List) - much smaller scale
        this.labels = {};
        var modes = ['ATOM', 'RESIDUE', 'CHAIN'];
        var startY = 0.015;

        modes.forEach((m, i) => {
            var label = document.createElement('a-text');
            label.setAttribute('value', m);
            label.setAttribute('scale', '0.08 0.08 0.08');
            label.setAttribute('color', '#555');
            label.setAttribute('align', 'center');
            label.setAttribute('anchor', 'center');
            label.setAttribute('position', `0 ${startY - (i * 0.015)} 0.01`);
            this.panel.appendChild(label);
            this.labels[m] = label;
        });

        // Header/Title
        var title = document.createElement('a-text');
        title.setAttribute('value', 'MODE');
        title.setAttribute('scale', '0.06 0.06 0.06');
        title.setAttribute('color', '#888');
        title.setAttribute('align', 'center');
        title.setAttribute('position', '0 0.025 0.01');
        this.panel.appendChild(title);
    },

    setMode: function (mode) {
        var modeUpper = mode.toUpperCase();
        for (var m in this.labels) {
            if (m === modeUpper) {
                this.labels[m].setAttribute('color', '#00FF00');
                this.labels[m].setAttribute('scale', '0.10 0.10 0.10');
            } else {
                this.labels[m].setAttribute('color', '#444');
                this.labels[m].setAttribute('scale', '0.08 0.08 0.08');
            }
        }
    }
});

// =========================================================================================
// 4. ANNOTATION RAYCASTER (COMPONENT)
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
        this.tick = AFRAME.utils.throttleTick(this.tick.bind(this), 200); // 5Hz Check (was 10Hz - better for VR perf)

        this.el.addEventListener('triggerdown', this.onTriggerDown);
        this.el.addEventListener('gripdown', this.onGripDown);
        this.el.addEventListener('ybuttondown', this.onYButtonDown);
        this.el.addEventListener('raycaster-intersection', this.onIntersection);
        this.el.addEventListener('raycaster-intersection-cleared', this.onIntersectionCleared);

        // Add Wrist Panel
        this.el.setAttribute('annotation-mode-panel', '');

        this.hoveredAtom = null;
        this.hoveredPoint = null;
        this.hoveredMesh = null;

        this.modes = ['atom', 'residue', 'chain'];
        this.currentModeIndex = 0; // Start at 'atom'
        this.currentMode = this.modes[0];

        // Init Panel
        setTimeout(() => {
            if (this.el.components['annotation-mode-panel']) {
                this.el.components['annotation-mode-panel'].setMode(this.currentMode);
            }
        }, 500);

        // Create Preview Entity
        this.previewEl = document.createElement('a-entity');
        this.previewEl.setAttribute('annotation-label', { text: '', targetPos: { x: 0, y: 0, z: 0 }, isPreview: true });
        this.previewEl.object3D.visible = false;
        this.el.sceneEl.appendChild(this.previewEl);
    },

    remove: function () {
        this.el.removeEventListener('triggerdown', this.onTriggerDown);
        this.el.removeEventListener('gripdown', this.onGripDown);
        this.el.removeEventListener('ybuttondown', this.onYButtonDown);
        this.el.removeEventListener('raycaster-intersection', this.onIntersection);
        this.el.removeEventListener('raycaster-intersection-cleared', this.onIntersectionCleared);
        if (this.previewEl && this.previewEl.parentNode) this.previewEl.parentNode.removeChild(this.previewEl);
        if (this.hoveredMesh) this.removeGlow(this.hoveredMesh);
    },

    onYButtonDown: function () {
        // Cycle Mode
        this.currentModeIndex = (this.currentModeIndex + 1) % this.modes.length;
        this.currentMode = this.modes[this.currentModeIndex];

        // Update Panel
        if (this.el.components['annotation-mode-panel']) {
            this.el.components['annotation-mode-panel'].setMode(this.currentMode);
        }
        console.log('[AnnotationSystem] Switched to mode:', this.currentMode);

        // Force refresh
        if (this.hoveredAtom && this.hoveredPoint) {
            this.handleAtomHit(this.hoveredAtom, this.hoveredMesh, this.hoveredPoint);
        }
    },

    tick: function (t, dt) {
        // Suppress annotations while VR main menu is open
        if (window.vrMenuOpen) return;

        // Custom THREE.js Raycaster for actual pointer detection
        // This bypasses A-Frame's raycaster which only works on entities

        var mol = document.querySelector('#molecule-container');
        if (!mol || !mol.object3D) return;

        // PERF: Use pooled/cached objects to reduce GC pressure
        if (!this._controllerPos) this._controllerPos = new THREE.Vector3();
        if (!this._controllerDir) this._controllerDir = new THREE.Vector3();
        if (!this._quat) this._quat = new THREE.Quaternion();

        var controllerPos = this._controllerPos;
        var controllerDir = this._controllerDir.set(0, 0, -1); // Forward in local space

        this.el.object3D.getWorldPosition(controllerPos);
        this.el.object3D.getWorldQuaternion(this._quat);
        controllerDir.applyQuaternion(this._quat);

        // Create raycaster
        if (!this._raycaster) {
            this._raycaster = new THREE.Raycaster();
            this._raycaster.params.Line = { threshold: 0.1 };
            this._raycaster.params.Points = { threshold: 0.1 };
        }

        this._raycaster.set(controllerPos, controllerDir);
        this._raycaster.far = 50; // Match HTML config

        // Collect all meshes with atom data
        var meshes = [];
        var collectMeshes = (obj) => {
            if (obj.isMesh && obj.userData && (obj.userData.presentAtom || obj.userData.atom)) {
                meshes.push(obj);
            }
            if (obj.children) obj.children.forEach(collectMeshes);
        };
        collectMeshes(mol.object3D);

        // Perform raycast
        var intersects = this._raycaster.intersectObjects(meshes, false);

        if (intersects.length > 0) {
            var hit = intersects[0];
            var atomData = hit.object.userData.presentAtom || hit.object.userData.atom;

            if (atomData) {
                this.handleAtomHit(atomData, hit.object, hit.point);
                return; // Found a hit, stop here
            }
        }

        // FALLBACK: Proximity detection if ray misses (hand might be inside molecule)
        if (this.hoveredAtom) return; // Already have something from raycaster

        var handPos = controllerPos;
        var closest = null;
        var minDst = 0.15; // 15cm proximity

        var scanProximity = (obj) => {
            if (obj.userData && (obj.userData.presentAtom || obj.userData.atom)) {
                var p = new THREE.Vector3();
                obj.getWorldPosition(p);
                var d = handPos.distanceTo(p);
                if (d < minDst) {
                    minDst = d;
                    closest = { data: obj.userData.presentAtom || obj.userData.atom, obj: obj, point: p };
                }
            }
            if (obj.children) obj.children.forEach(scanProximity);
        };
        scanProximity(mol.object3D);

        if (closest) {
            this.handleAtomHit(closest.data, closest.obj, closest.point);
        } else if (this.hoveredAtom) {
            // Clear if nothing nearby
            this.onIntersectionCleared();
        }
    },

    onIntersection: function (evt) {
        // Suppress annotations while VR main menu is open
        if (window.vrMenuOpen) return;

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
        return `Atom: ${data.id}\n${data.resname} ${data.resid}\nChain ${data.chainname}`;
    }
});
