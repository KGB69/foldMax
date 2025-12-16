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
                var loadedData = JSON.parse(saved);
                console.log('[AnnotationManager] Loaded', loadedData.length, 'annotations');
                loadedData.forEach(a => {
                    // Re-add using the addAnnotation logic to ensure consistency
                    // This will also re-save, which is fine.
                    this.addAnnotation(a.atomData, a.pos, a.mode);
                });
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
        this.onYButtonDown = this.onYButtonDown.bind(this); // Debug Dump
        this.onXButtonDown = this.onXButtonDown.bind(this); // Cycle Mode
        this.onIntersection = this.onIntersection.bind(this);
        this.onIntersectionCleared = this.onIntersectionCleared.bind(this);
        this.tick = AFRAME.utils.throttleTick(this.tick.bind(this), 100); // 10Hz Check

        this.el.addEventListener('triggerdown', this.onTriggerDown);
        this.el.addEventListener('gripdown', this.onGripDown);
        this.el.addEventListener('ybuttondown', this.onYButtonDown);
        this.el.addEventListener('xbuttondown', this.onXButtonDown);
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
        this.el.removeEventListener('xbuttondown', this.onXButtonDown);
        this.el.removeEventListener('raycaster-intersection', this.onIntersection);
        this.el.removeEventListener('raycaster-intersection-cleared', this.onIntersectionCleared);
        if (this.previewEl && this.previewEl.parentNode) this.previewEl.parentNode.removeChild(this.previewEl);
        if (this.hoveredMesh) this.removeGlow(this.hoveredMesh);
        if (this.modeTextEl && this.modeTextEl.parentNode) this.modeTextEl.parentNode.removeChild(this.modeTextEl);
    },

    onXButtonDown: function () {
        // Cycle Mode
        this.currentModeIndex = (this.currentModeIndex + 1) % this.modes.length;
        this.currentMode = this.modes[this.currentModeIndex];

        // Update UI
        this.modeTextEl.setAttribute('value', 'Mode: ' + this.currentMode.toUpperCase());
        console.log('[AnnotationSystem] Switched to mode:', this.currentMode);

        // Force refresh of preview if active
        if (this.hoveredAtom && this.hoveredPoint) {
            this.handleAtomHit(this.hoveredAtom, this.hoveredMesh, this.hoveredPoint);
        }
    },

    tick: function (t, dt) {
        // PROXIMITY SCANNER (Fallback if Raycaster fails)
        // Only run if we don't have a valid raycaster hit
        if (this.hoveredAtom) return;

        var handPos = new THREE.Vector3();
        this.el.object3D.getWorldPosition(handPos);

        var molContainer = document.querySelector('#molecule-container');
        if (!molContainer) return;

        var closestAtom = null;
        var minDst = 0.2; // 20cm Proximity Radius

        var scanner = (obj) => {
            if (obj.userData && (obj.userData.presentAtom || obj.userData.atom)) {
                var atomPos = new THREE.Vector3();
                obj.getWorldPosition(atomPos);
                var dst = handPos.distanceTo(atomPos);
                if (dst < minDst) {
                    minDst = dst;
                    closestAtom = {
                        data: obj.userData.presentAtom || obj.userData.atom,
                        obj: obj,
                        point: atomPos
                    };
                }
            }
            if (obj.children) obj.children.forEach(scanner);
        };

        scanner(molContainer.object3D);

        if (closestAtom) {
            // console.log('[Proximity] Found nearby atom:', closestAtom.data.name);
            this.handleAtomHit(closestAtom.data, closestAtom.obj, closestAtom.point);
        }
    },

    onYButtonDown: function () {
        console.log('[AnnotationSystem] === DEBUG SCENE COMPOSITION ===');
        var mol = document.querySelector('#molecule-container');
        if (!mol) { console.log('No Molecule Container'); return; }

        var count = 0;
        var withData = 0;
        var meshes = 0;

        var traverse = (obj, depth) => {
            count++;
            if (obj.isMesh) meshes++;
            if (obj.userData && (obj.userData.atom || obj.userData.presentAtom)) withData++;

            // Log first few interesting items
            if (count < 20 || (obj.userData && (obj.userData.atom || obj.userData.presentAtom) && withData < 5)) {
                var indent = ' '.repeat(depth * 2);
                console.log(`${indent}${obj.type} - Name: ${obj.name} - UserDataKeys: ${Object.keys(obj.userData).join(',')}`);
            }
            if (obj.children) obj.children.forEach(c => traverse(c, depth + 1));
        };

        console.log('Traversing #molecule-container...');
        traverse(mol.object3D, 0);
        console.log(`[Summary] Total: ${count}, Meshes: ${meshes}, Atoms(UserData): ${withData}`);
    },

    onIntersection: function (evt) {
        var raycaster = this.el.components.raycaster;
        var intersection = raycaster.getIntersection(evt.detail.els[0]);

        if (intersection) {
            // Verbose log is disabled to reduce noise, enable if needed
            // console.log('[RaycasterHit] Hit:', intersection.object.uuid);
        } else {
            // console.log('[RaycasterHit] Event fired but getIntersection returned null for el:', evt.detail.els[0].id);
        }

        if (!intersection) return;

        var atomData = this.getAtomData(intersection.object);
        if (atomData) {
            this.handleAtomHit(atomData, intersection.object, intersection.point);
        }
    },

    // Refactored common handler
    handleAtomHit: function (atomData, object, point) {
        this.hoveredAtom = atomData;
        this.hoveredPoint = point;

        if (this.hoveredMesh !== object) {
            if (this.hoveredMesh) this.removeGlow(this.hoveredMesh);
            this.hoveredMesh = object;
            this.applyGlow(this.hoveredMesh);
        }

        var labelText = this.formatLabelText(atomData);

        this.previewEl.setAttribute('annotation-label', {
            text: labelText,
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
            console.log('[AnnotationSystem] Pinning annotation');
            var system = document.querySelector('a-scene').systems['annotation-manager'];
            if (system) {
                // Pass the current mode so the pinned note matches what the user saw
                system.addAnnotation(this.hoveredAtom, this.hoveredPoint, this.currentMode);
            }
        }
    },

    onGripDown: function () {
        console.log('[AnnotationSystem] Clearing annotations');
        var system = document.querySelector('a-scene').systems['annotation-manager'];
        if (system) {
            system.clearAll();
        }
    },

    applyGlow: function (mesh) {
        if (!mesh.material) return;
        // Simple emissive highlight
        // Handle both single material and array of materials
        var mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach(mat => {
            if (mat.emissive) {
                mat.userData.originalEmissive = mat.emissive.getHex(); // Store original
                mat.emissive.setHex(0x00FF00); // Green glow
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
                delete mat.userData.originalEmissive; // Clean up
                mat.needsUpdate = true;
            } else {
                // If no original was stored, reset to black (no emissive)
                if (mat.emissive) {
                    mat.emissive.setHex(0x000000);
                    mat.needsUpdate = true;
                }
            }
        });
    },

    getAtomData: function (object) {
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
