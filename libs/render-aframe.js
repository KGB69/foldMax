/**
 * A-Frame Adapter for VRmol Render Logic
 * Replaces libs/render.js
 */

var scene = null; // Placeholder for compatibility
var camera = null;
var renderer = null;

PDB.render = {
    init: function () {
        console.log("A-Frame render init called");
        // The actual rendering happens in the loader callback
        // See js/aframe-components/molecular-renderer.js
    },

    // Utility functions copied/adapted from render.js
    clearGroupIndex: function (groupIndex) {
        if (PDB.GROUP[groupIndex] != undefined && PDB.GROUP[groupIndex].children != undefined && PDB.GROUP[groupIndex].children.length > 0) {
            var children = PDB.GROUP[groupIndex].children;
            for (var i = children.length - 1; i >= 0; i--) {
                var meshObj = children[i];
                if (meshObj instanceof THREE.Mesh) {
                    if (meshObj.geometry) meshObj.geometry.dispose();
                    if (meshObj.material) {
                        if (Array.isArray(meshObj.material)) {
                            meshObj.material.forEach(m => m.dispose());
                        } else {
                            meshObj.material.dispose();
                        }
                    }
                }
                PDB.GROUP[groupIndex].remove(meshObj);
            }
        }
    },

    clear: function (mode) {
        // Simplified clear logic
        if (mode === 0) {
            // Clear main
            for (var i in PDB.GROUP_MAIN_INDEX) {
                this.clearGroupIndex(PDB.GROUP_MAIN_INDEX[i]);
            }
        } else if (mode === 2) {
            // Clear structure
            for (var i in PDB.GROUP_STRUCTURE_INDEX) {
                this.clearGroupIndex(PDB.GROUP_STRUCTURE_INDEX[i]);
            }
        }
        // Add other modes as needed
    },

    clearMain: function () {
        this.clear(0);
    },

    changeToVrMode: function () {
        console.log("[PDB.render] changeToVrMode called (handled by A-Frame)");
    },

    showMenu: function () {
        console.log("[PDB.render] showMenu called (TODO: Implement A-Frame UI)");
    },

    hideMenu: function () {
        console.log("[PDB.render] hideMenu called");
    },

    hideStructure: function () {
        if (PDB.GROUP_STRUCTURE_INDEX) {
            PDB.GROUP_STRUCTURE_INDEX.forEach(idx => {
                if (PDB.GROUP[idx]) PDB.GROUP[idx].visible = false;
            });
        }
    },

    showStructure: function () {
        if (PDB.GROUP_STRUCTURE_INDEX) {
            PDB.GROUP_STRUCTURE_INDEX.forEach(idx => {
                if (PDB.GROUP[idx]) PDB.GROUP[idx].visible = true;
            });
        }
    }
};
