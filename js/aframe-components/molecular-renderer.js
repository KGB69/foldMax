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
        console.log('[MolecularRenderer] Initializing...');

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

        // Method 1: Clear PDB.GROUP children explicitly
        if (typeof PDB !== 'undefined' && PDB.GROUP) {
            for (var g = 0; g < PDB.GROUP_COUNT; g++) {
                if (PDB.GROUP[g]) {
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
                }
            }
        }

        // Method 2: Clear any A-Frame children created by this component
        // (Just in case some are not in PDB.GROUP)
        while (this.el.object3D.children.length > 0) {
            // Be careful not to remove things that shouldn't be removed if any
            // But for this container, we want it empty for the new molecule
            // Actually, PDB.GROUPs are added to this.el.object3D, so we might want to re-init them instead of removing
            break; // Rely on Method 1 for now to avoid breaking structure
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

            // Position and scale
            scope.el.object3D.position.set(0, 1.6, -3);
            scope.el.object3D.scale.set(1.0, 1.0, 1.0);
            scope.el.object3D.visible = true;
        }, function (error) {
            console.error('[MolecularRenderer] Error loading PDB:', error);
            scope.el.sceneEl.emit('pdb-loading-error', { error: error });
        });
    }
});
