/**
 * VR-Optimized Ball and Rod Renderer
 * Uses BufferGeometry merging to reduce 3000+ draw calls to ~1
 * This dramatically improves performance on Quest 3
 */

(function () {
    'use strict';

    // Create namespace
    window.VROptimizedRenderer = window.VROptimizedRenderer || {};

    /**
     * Render Ball+Rod representation using merged geometry
     * Instead of 3000+ individual meshes, creates just 1-2 merged meshes
     */
    VROptimizedRenderer.showBallRodOptimized = function () {
        console.log('[VR-Optimized] Starting merged Ball+Rod render...');
        console.time('[VR-Optimized] Ball+Rod Total');

        if (!PDB.linkedAtomIdArray || PDB.linkedAtomIdArray.length === 0) {
            console.warn('[VR-Optimized] No linked atoms found');
            return;
        }

        var radius = 0.1;
        var sphereRadius = 0.15;
        var sphereSegments = 6;  // Low-poly for VR
        var cylinderSegments = 4;

        // Collect all geometry data
        var spherePositions = [];
        var sphereColors = [];
        var stickData = [];  // {start, end, color}

        var history = {};

        // First pass: collect all sphere positions and stick data
        for (var t = 0; t < PDB.linkedAtomIdArray.length; t++) {
            var ids = PDB.linkedAtomIdArray[t];
            var startAtom = PDB.tool.getMainAtom(PDB.pdbId, ids[0]);
            var atom = PDB.tool.getMainAtom(PDB.pdbId, ids[1]);

            if (!startAtom || !atom) continue;

            // Collect sphere data
            if (!history[startAtom.id]) {
                spherePositions.push(startAtom.pos_centered.clone());
                sphereColors.push(startAtom.color ? startAtom.color.clone() : new THREE.Color(0xcccccc));
                history[startAtom.id] = 1;
            }
            if (!history[atom.id]) {
                spherePositions.push(atom.pos_centered.clone());
                sphereColors.push(atom.color ? atom.color.clone() : new THREE.Color(0xcccccc));
                history[atom.id] = 1;
            }

            // Collect stick data (split at midpoint for colors)
            var midp = PDB.tool.midPoint(startAtom.pos_centered, atom.pos_centered);
            stickData.push({
                start: startAtom.pos_centered.clone(),
                end: midp.clone(),
                color: startAtom.color ? startAtom.color.clone() : new THREE.Color(0xcccccc)
            });
            stickData.push({
                start: midp.clone(),
                end: atom.pos_centered.clone(),
                color: atom.color ? atom.color.clone() : new THREE.Color(0xcccccc)
            });
        }

        console.log('[VR-Optimized] Spheres:', spherePositions.length, 'Sticks:', stickData.length);

        // Create merged sphere geometry using InstancedMesh (most efficient)
        var sphereGeom = new THREE.IcosahedronBufferGeometry(sphereRadius, 1); // Very low poly
        var sphereMat = new THREE.MeshBasicMaterial({ vertexColors: true });

        // Use InstancedMesh for spheres (1 draw call for ALL spheres)
        var sphereInstancedMesh = new THREE.InstancedMesh(
            new THREE.IcosahedronBufferGeometry(sphereRadius, 1),
            new THREE.MeshBasicMaterial({ color: 0xffffff }),
            spherePositions.length
        );

        var matrix = new THREE.Matrix4();
        var color = new THREE.Color();

        for (var i = 0; i < spherePositions.length; i++) {
            matrix.setPosition(spherePositions[i]);
            sphereInstancedMesh.setMatrixAt(i, matrix);
            sphereInstancedMesh.setColorAt(i, sphereColors[i]);
        }
        sphereInstancedMesh.instanceMatrix.needsUpdate = true;
        if (sphereInstancedMesh.instanceColor) sphereInstancedMesh.instanceColor.needsUpdate = true;
        sphereInstancedMesh.userData = { type: 'vr-optimized-spheres' };

        // Create merged stick geometry (merge all cylinders into one BufferGeometry)
        var mergedStickGeom = new THREE.BufferGeometry();
        var stickGeometries = [];

        var cylinderGeomTemplate = new THREE.CylinderBufferGeometry(radius, radius, 1, cylinderSegments, 1);

        for (var j = 0; j < stickData.length; j++) {
            var stick = stickData[j];
            var distance = stick.start.distanceTo(stick.end);
            if (distance < 0.001) continue;

            // Create positioned cylinder
            var cyl = cylinderGeomTemplate.clone();
            cyl.scale(1, distance, 1);

            // Position and orient
            var midpoint = new THREE.Vector3().lerpVectors(stick.start, stick.end, 0.5);
            var direction = new THREE.Vector3().subVectors(stick.end, stick.start).normalize();
            var quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), direction);

            cyl.applyQuaternion(quaternion);
            cyl.translate(midpoint.x, midpoint.y, midpoint.z);

            // Add color attribute
            var colorArray = new Float32Array(cyl.attributes.position.count * 3);
            for (var k = 0; k < cyl.attributes.position.count; k++) {
                colorArray[k * 3] = stick.color.r;
                colorArray[k * 3 + 1] = stick.color.g;
                colorArray[k * 3 + 2] = stick.color.b;
            }
            cyl.setAttribute('color', new THREE.BufferAttribute(colorArray, 3));

            stickGeometries.push(cyl);
        }

        // Merge all stick geometries
        if (stickGeometries.length > 0) {
            mergedStickGeom = THREE.BufferGeometryUtils.mergeBufferGeometries(stickGeometries, false);
        }

        var stickMesh = new THREE.Mesh(
            mergedStickGeom,
            new THREE.MeshBasicMaterial({ vertexColors: true })
        );
        stickMesh.userData = { type: 'vr-optimized-sticks' };

        // Find target group and add meshes
        var targetGroup = null;
        for (var chain in PDB.GROUP) {
            if (chain.startsWith && chain.startsWith('chain_')) {
                targetGroup = PDB.GROUP[chain];
                break;
            }
        }
        if (!targetGroup && PDB.GROUP[PDB.GROUP_MAIN]) {
            targetGroup = PDB.GROUP[PDB.GROUP_MAIN];
        }

        if (targetGroup) {
            // Clear existing children
            while (targetGroup.children.length > 0) {
                var child = targetGroup.children[0];
                if (child.geometry) child.geometry.dispose();
                if (child.material) child.material.dispose();
                targetGroup.remove(child);
            }

            targetGroup.add(sphereInstancedMesh);
            targetGroup.add(stickMesh);
            console.log('[VR-Optimized] Added to group:', targetGroup.name || 'unnamed');
        } else {
            // Fallback: add to molecule container
            var molContainer = document.querySelector('#molecule-container');
            if (molContainer && molContainer.object3D) {
                molContainer.object3D.add(sphereInstancedMesh);
                molContainer.object3D.add(stickMesh);
                console.log('[VR-Optimized] Added to molecule-container');
            }
        }

        console.timeEnd('[VR-Optimized] Ball+Rod Total');
        console.log('[VR-Optimized] Render complete - 2 draw calls instead of',
            spherePositions.length + stickData.length);
    };

    /**
     * Clear VR-optimized meshes
     */
    VROptimizedRenderer.clear = function () {
        var molContainer = document.querySelector('#molecule-container');
        if (!molContainer || !molContainer.object3D) return;

        var toRemove = [];
        molContainer.object3D.traverse(function (obj) {
            if (obj.userData && obj.userData.type && obj.userData.type.startsWith('vr-optimized')) {
                toRemove.push(obj);
            }
        });

        toRemove.forEach(function (obj) {
            if (obj.geometry) obj.geometry.dispose();
            if (obj.material) obj.material.dispose();
            if (obj.parent) obj.parent.remove(obj);
        });
    };

    console.log('[VR-Optimized] Renderer loaded');
})();
