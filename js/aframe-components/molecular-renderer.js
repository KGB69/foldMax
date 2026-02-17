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
            script.onload = () => {
                console.log('[MolecularRenderer] Annotation Script INJECTED & LOADED');
                // FORCE ATTACH COMPONENT to Left Hand
                var leftHand = document.querySelector('#left-hand');
                if (leftHand) {
                    console.log('[MolecularRenderer] Force-attaching annotation-raycaster to left-hand');
                    leftHand.removeAttribute('annotation-raycaster'); // Clear if partial
                    setTimeout(() => {
                        leftHand.setAttribute('annotation-raycaster', '');
                        console.log('[MolecularRenderer] Component attached via JS');
                    }, 500); // Small delay to ensure registration is processed
                } else {
                    console.error('[MolecularRenderer] Left hand not found!');
                }
            };
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

        // ========== QUEST 3 ULTRA-LOW PERFORMANCE OPTIMIZATIONS ==========
        // Strategy 1: EXTREME geometry reduction (85-90% polygon reduction)
        // Strategy 5: Prepare for GPU instancing (future enhancement)

        console.log('[MolecularRenderer] Applying Quest 3 ULTRA-LOW performance settings...');

        // Set structure size level to low (reduces polygon count by ~75%)
        PDB.structureSizeLevel = 3; // 0=auto, 3=low quality

        // QUEST 3 ULTRA-LOW: Reduce geometry segments by 50% more than previous settings
        // This provides 85-90% total polygon reduction from desktop defaults
        if (typeof w3m !== 'undefined' && w3m.config && w3m.config.geom) {
            // Previous: 6 → New: 3 (50% reduction from current, 85% from default)
            w3m.config.geom.sphere_seg = 3;      // Default: 20 → 3 = 85% reduction
            w3m.config.geom.stick_seg = 3;       // Default: 12 → 3 = 75% reduction  
            w3m.config.geom.tube_seg = 3;        // Default: 15 → 3 = 80% reduction

            console.log('[MolecularRenderer] Quest 3 ULTRA-LOW geometry:');
            console.log('  - Sphere segments: 3 (~36 polygons vs 480 desktop)');
            console.log('  - Stick segments: 3 (~27 polygons vs 180 desktop)');
            console.log('  - Tube segments: 3 (~54 polygons vs 270 desktop)');
        }

        // QUEST 3 ULTRA-LOW: Further reduce CONFIG_LOW settings
        if (PDB.CONFIG_LOW) {
            PDB.CONFIG_LOW.sphere_width = 4;     // Previous: 6 → 4 (33% reduction)
            PDB.CONFIG_LOW.sphere_height = 3;    // Previous: 4 → 3 (25% reduction)
            PDB.CONFIG_LOW.stick_sphere_w = 3;   // Previous: 4 → 3 (25% reduction)
            PDB.CONFIG_LOW.ballrod_sphere_w = 3; // Previous: 4 → 3 (25% reduction)
            PDB.CONFIG_LOW.tubesegment = 3;      // Previous: 4 → 3 (25% reduction)

            console.log('[MolecularRenderer] Quest 3 CONFIG_LOW values reduced');
        }

        // TODO: Strategy 5 - GPU Instancing for repeated atoms
        // Future optimization: Use THREE.InstancedMesh for carbon, hydrogen, etc.
        // This would reduce draw calls by ~95% for large molecules
        // Requires refactoring of drawer.js to use instanced geometry

        console.log('[MolecularRenderer] Expected polygon reduction: 85-90% vs desktop');
        console.log('[MolecularRenderer] Target: 72fps on Quest 3 for small-medium molecules');
        // ====================================================

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

        // Use our own server-side proxy (no CORS issues!)
        // Build absolute URL using window.location.origin
        var pdbUrl = window.location.origin + '/api/pdb-proxy.php?pdb=' + encodeURIComponent(pdbId);

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
