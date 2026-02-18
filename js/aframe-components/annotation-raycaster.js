/**
 * Annotation System for VRmol
 * Interaction: Hover to Preview (Glow), Trigger to Pin, Grip to Clear.
 */

console.log('[AnnotationRaycaster] Script loaded');

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
        this.hoveredMesh = null; // Track mesh for glow effect
        this.originalEmissive = new THREE.Color(); // Store original color

        // Create Preview Entity (Hidden by default)
        this.previewEl = document.createElement('a-entity');
        this.previewEl.setAttribute('annotation-label', { text: '', targetPos: { x: 0, y: 0, z: 0 }, isPreview: true });
        this.previewEl.object3D.visible = false;
        this.el.sceneEl.appendChild(this.previewEl);

        console.log('[AnnotationSystem] Init: Hover->Glow->Preview, Trigger->Pin');
    },

    remove: function () {
        this.el.removeEventListener('triggerdown', this.onTriggerDown);
        this.el.removeEventListener('gripdown', this.onGripDown);
        this.el.removeEventListener('raycaster-intersection', this.onIntersection);
        this.el.removeEventListener('raycaster-intersection-cleared', this.onIntersectionCleared);

        if (this.previewEl && this.previewEl.parentNode) {
            this.previewEl.parentNode.removeChild(this.previewEl);
        }

        // Clean up glow if active
        if (this.hoveredMesh) {
            this.removeGlow(this.hoveredMesh);
        }
    },

    onIntersection: function (evt) {
        // Suppress atom annotations while the VR main menu is open
        if (window.vrMenuOpen) return;

        var raycaster = this.el.components.raycaster;
        var intersection = raycaster.getIntersection(evt.detail.els[0]);

        if (!intersection) return;

        var object = intersection.object;
        var atomData = this.getAtomData(object);

        if (atomData) {
            console.log('[AnnotationSystem] Hit Atom:', atomData.name, atomData.resid);
            this.hoveredAtom = atomData;
            this.hoveredPoint = intersection.point;

            // 1. Glow Effect
            if (this.hoveredMesh !== object) {
                // If switching objects, clear previous first
                if (this.hoveredMesh) this.removeGlow(this.hoveredMesh);

                this.hoveredMesh = object;
                this.applyGlow(this.hoveredMesh);
            }

            // 2. Show Preview
            this.previewEl.setAttribute('annotation-label', {
                text: this.formatLabelText(atomData),
                targetPos: this.hoveredPoint,
                isPreview: true
            });
            this.previewEl.object3D.visible = true;
        }
    },

    onIntersectionCleared: function () {
        // Clear State
        if (this.hoveredMesh) {
            this.removeGlow(this.hoveredMesh);
            this.hoveredMesh = null;
        }
        this.hoveredAtom = null;
        this.hoveredPoint = null;

        // Hide Preview
        this.previewEl.object3D.visible = false;
    },

    onTriggerDown: function () {
        if (this.hoveredAtom && this.hoveredPoint) {
            console.log('[AnnotationSystem] Pinning:', this.hoveredAtom.name);
            // Delegate to Manager
            this.el.sceneEl.emit('pin-annotation', {
                atomData: this.hoveredAtom,
                position: this.hoveredPoint
            });
        }
    },

    onGripDown: function () {
        console.log('[AnnotationSystem] Requesting Clear All');
        this.el.sceneEl.emit('clear-annotations');
    },

    // --- GLOW LOGIC ---
    applyGlow: function (mesh) {
        if (!mesh.material) return;

        // Handle array materials (rare for atoms but possible) or single
        var mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

        mats.forEach(mat => {
            // Check if we already saved (avoid double save)
            if (!mat.userData.originalEmissive) {
                mat.userData.originalEmissive = mat.emissive ? mat.emissive.clone() : new THREE.Color(0, 0, 0);
            }

            // Set Glow (Emissive Cyan/Yellow)
            if (mat.emissive) {
                mat.emissive.setHex(0x444444); // Slight whitish glow
                // Increase intensity if possible, or use standard material properties
            } else {
                // Fallback for materials without emissive?
                // Most PDB materials are MeshPhong or MeshLambert, so they have emissive.
            }
            mat.needsUpdate = true;
        });
    },

    removeGlow: function (mesh) {
        if (!mesh || !mesh.material) return;

        var mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];

        mats.forEach(mat => {
            if (mat.userData.originalEmissive) {
                mat.emissive.copy(mat.userData.originalEmissive);
                // Clean up userData?
                // delete mat.userData.originalEmissive; 
            } else {
                mat.emissive.setHex(0x000000);
            }
            mat.needsUpdate = true;
        });
    },

    // --- UTILS ---
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
        var chain = atom.chainname || '';
        return `${res} ${resid}\n${name} Chain:${chain}`;
    }
});
