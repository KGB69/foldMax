/**
 * Molecular Renderer Component for A-Frame
 * Bridges the existing VRmol PDB visualization logic with A-Frame.
 */
AFRAME.registerComponent('molecular-renderer', {
    schema: {
        pdbId: { type: 'string', default: '1cbs' },
        representation: { type: 'string', default: 'cartoon' }
    },

    init: function () {
        console.log('[MolecularRenderer] UPDATED: Initializing...');

        // DYNAMIC INJECTION: Ensure Annotation System Loads
        if (!document.querySelector('script[src*="annotation-system-v2.js"]')) {
            console.log('[MolecularRenderer] Injecting Annotation System v2...');
            var script = document.createElement('script');
            script.src = 'js/aframe-components/annotation-system-v2.js?v=INJECTED_' + Date.now();
            script.onload = () => console.log('[MolecularRenderer] Annotation Script INJECTED & LOADED');
            script.onerror = () => console.error('[MolecularRenderer] Annotation Script INJECTION FAILED');
            document.head.appendChild(script);
        } else {
            console.log('[MolecularRenderer] Annotation script already present in DOM.');
        }

        // Hijack the global scene/parent for PDB loader
        PDB.scene = this.el.object3D;

        // Ensure PDB global object is ready
        if (typeof PDB === 'undefined') {
            console.error('[MolecularRenderer] PDB object not found.');
            return;
        }

        // Initialize PDB config
        PDB.config.mainMode = PDB.CARTOON_SSE;
        PDB.config.hetMode = PDB.HET_STICK;

        // Load the molecule
        this.loadMolecule(this.data.pdbId);
    },

    update: function (oldData) {
        if (oldData.pdbId && oldData.pdbId !== this.data.pdbId) {
            this.loadMolecule(this.data.pdbId);
        }
    },

    loadMolecule: function (pdbId) {
        console.log(`[MolecularRenderer] Loading PDB: ${pdbId}`);
        var scope = this;

        // Emit loading start event
        this.el.sceneEl.emit('pdb-loading-start', { pdbId: pdbId });

        // CLEAR EXISTING GEOMETRY
        // -------------------------
        console.log('[MolecularRenderer] Clearing previous model...');

        // Step 0: Use Official PDB Library Cleanup (Critical for resetting data buffers)
        if (typeof PDB !== 'undefined') {
            // NOTE: PDB.controller.clear causes "undefined (reading refreshGeometryByMode)" on VR device.
            // Disabling it. PDB.loader.clear() + manual cleanup should be sufficient.
            /* 
            if (PDB.controller && typeof PDB.controller.clear === 'function') {
                console.log('[MolecularRenderer] Calling PDB.controller.clear(2, -1)');
                try { PDB.controller.clear(2, -1); } catch (e) { console.warn('PDB.controller.clear failed:', e); }
            }
            */
            if (PDB.loader && typeof PDB.loader.clear === 'function') {
                console.log('[MolecularRenderer] Calling PDB.loader.clear()');
                try { PDB.loader.clear(); } catch (e) { console.warn('PDB.loader.clear failed:', e); }
            }
        }

        // Method 1: Clear PDB.GROUP children AND Remove Groups

        if (typeof PDB !== 'undefined' && PDB.GROUP) {
            for (var g = 0; g < PDB.GROUP_COUNT; g++) {
                if (PDB.GROUP[g]) {
                    // Dispose children resources
                    while (PDB.GROUP[g].children.length > 0) {
                        var child = PDB.GROUP[g].children[0];
                        if (child.geometry) child.geometry.dispose();
                        if (child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(function (m) { m.dispose(); });
                            } else {
                                child.material.dispose();
                            }
                        }
                        PDB.GROUP[g].remove(child);
                    }

                    // Remove the Group itself from the container
                    this.el.object3D.remove(PDB.GROUP[g]);

                    // Nullify reference so it's recreated fresh
                    PDB.GROUP[g] = null;
                }
            }
        }

        // Method 2: Clear any stray A-Frame children
        while (this.el.object3D.children.length > 0) {
            var child = this.el.object3D.children[0];
            // Safety dispose
            if (child.geometry) child.geometry.dispose();
            this.el.object3D.remove(child);
        }

        // Use CORS proxy to avoid localhost issues
        var pdbUrl = 'https://corsproxy.io/?' + encodeURIComponent('https://files.rcsb.org/view/' + pdbId + '.pdb');

        console.log('[MolecularRenderer] Loading from proxy:', pdbUrl);

        PDB.loader.load(pdbUrl, function () {
            console.log(`[MolecularRenderer] Loaded ${pdbId} successfully.`);

            // Initialize PDB.GROUP objects
            for (var i = 0; i < PDB.GROUP_COUNT; i++) {
                if (!PDB.GROUP[i]) {
                    PDB.GROUP[i] = new THREE.Group();
                    PDB.GROUP[i].userData.group = i;
                    scope.el.object3D.add(PDB.GROUP[i]);
                }
            }

            try {
                // Call painter functions
                PDB.controller.refreshGeometryByMode(PDB.config.mainMode);
                PDB.controller.refreshGeometryByMode(PDB.config.hetMode);

                // Emit loading complete
                scope.el.sceneEl.emit('pdb-loading-complete', { pdbId: pdbId });

                // Add VR manipulation controls
                console.log('[MolecularRenderer] VR manipulation ready (Menu system)');
            } catch (error) {
                console.error('[MolecularRenderer] ERROR:', error);
                scope.el.sceneEl.emit('pdb-loading-error', { error: error.message });
            }

            // Position and Auto-Fit
            // scope.el.object3D.position.set(0, 1.6, -3);
            // scope.el.object3D.scale.set(1.0, 1.0, 1.0);

            // Auto-fit to 3m size, bottom at 0.7m
            setTimeout(function () {
                scope.autoFitModel();
            }, 100); // Slight delay to ensure geometry is ready

            scope.el.object3D.visible = true;
        }, function (error) {
            console.error('[MolecularRenderer] Error loading PDB:', error);
            scope.el.sceneEl.emit('pdb-loading-error', { error: error });
        });
    },

    autoFitModel: function () {
        var el = this.el;
        var object = el.object3D;

        // Reset scale first
        object.scale.set(1, 1, 1);
        object.rotation.set(0, 0, 0); // Reset rotation to align for reliable bounding box? 
        // Maybe keep rotation if user wants? But loading new PDB implies reset.

        object.updateMatrixWorld(true);
        var box = new THREE.Box3().setFromObject(object);
        var size = box.getSize(new THREE.Vector3());
        var maxDim = Math.max(size.x, size.y, size.z);

        if (maxDim === 0) {
            console.warn('[MolecularRenderer] Model has 0 size, cannot auto-fit.');
            return;
        }

        // Target Size: 3.0 meters
        var targetSize = 3.0;
        var scaleFactor = targetSize / maxDim;

        object.scale.set(scaleFactor, scaleFactor, scaleFactor);
        object.updateMatrixWorld(true);

        // Re-measure after scaling
        box.setFromObject(object);
        var newSize = box.getSize(new THREE.Vector3());

        // Position: Bottom at 0.7m, Center X/Z at 0, -3
        var worldCenter = box.getCenter(new THREE.Vector3());
        var bottomY = box.min.y;

        var targetBottom = 0.7;
        var offsetY = targetBottom - bottomY;

        var targetX = 0;
        var offsetX = targetX - worldCenter.x;

        var targetZ = -2.5; // Slightly closer than -3 for 3m object
        var offsetZ = targetZ - worldCenter.z;

        object.position.x += offsetX;
        object.position.y += offsetY;
        object.position.z += offsetZ;

        console.log(`[MolecularRenderer] Auto-fitted: Size=${newSize.y.toFixed(2)}m, Scale=${scaleFactor.toFixed(4)}`);
    }
});
