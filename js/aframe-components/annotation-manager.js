/**
 * Annotation Manager System
 * Handles storage, retrieval, and management of 3D annotations.
 */

AFRAME.registerSystem('annotation-manager', {
    init: function () {
        this.annotations = [];
        this.pdbId = null; // Will be set when a model loads

        // Listen for PDB load events to switch context
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

        console.log('[AnnotationManager] System Initialized');
    },

    addAnnotation: function (atomData, position) {
        if (!this.pdbId) {
            console.warn('[AnnotationManager] No PDB loaded, cannot save annotation.');
            // Allow adding temporarily even if no PDB set? Maybe default to 'temp'
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
        // Remove entities
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
        console.log('[AnnotationManager] Saved', this.annotations.length, 'annotations');
    },

    loadAnnotations: function () {
        // Clear current visual labels first
        var labels = document.querySelectorAll('.pinned-annotation');
        labels.forEach(el => el.parentNode.removeChild(el));

        if (!this.pdbId) return;

        var key = 'vrmol_annotations_' + this.pdbId;
        var saved = localStorage.getItem(key);

        if (saved) {
            try {
                this.annotations = JSON.parse(saved);
                console.log('[AnnotationManager] Loaded', this.annotations.length, 'annotations for', this.pdbId);

                // Respawn them
                this.annotations.forEach(a => {
                    this.spawnLabel(a);
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
