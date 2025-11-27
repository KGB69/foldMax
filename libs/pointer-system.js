/**
 * Universal Pointer System
 * Hybrid: Crosshair + Laser Beam with Annotations
 * Works in both Desktop and VR modes
 */

(function () {
    'use strict';

    var UniversalPointer = {
        // State
        enabled: true,
        beamEnabled: false,
        crosshairEnabled: true,
        annotationsEnabled: true,

        // Three.js objects
        raycaster: null,
        currentTarget: null,
        highlightMesh: null,
        beamMesh: null,

        // DOM elements
        crosshairElement: null,
        annotationElement: null,

        // Settings
        highlightColor: 0xffff00, // Yellow
        beamColor: 0x00ffff, // Cyan
        maxDistance: 1000,

        /**
         * Initialize the pointer system
         */
        init: function () {
            console.log('[POINTER] Initializing Universal Pointer System...');

            this.raycaster = new THREE.Raycaster();
            this.raycaster.params.Points = { threshold: 2 };

            this.createCrosshair();
            this.createAnnotationPanel();
            this.createLaserBeam();

            // Start update loop
            this.startUpdateLoop();

            // Keyboard controls
            document.addEventListener('keydown', this.onKeyDown.bind(this));

            console.log('[POINTER] Pointer System initialized');
        },

        /**
         * Create crosshair UI element
         */
        createCrosshair: function () {
            this.crosshairElement = document.createElement('div');
            this.crosshairElement.id = 'universal-crosshair';
            this.crosshairElement.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(-50%, -50%);
                width: 24px;
                height: 24px;
                pointer-events: none;
                z-index: 1000;
                transition: all 0.2s ease;
            `;

            this.crosshairElement.innerHTML = `
                <svg width="24" height="24" viewBox="0 0 24 24">
                    <circle cx="12" cy="12" r="10" fill="none" stroke="cyan" stroke-width="2" opacity="0.8"/>
                    <circle cx="12" cy="12" r="2" fill="cyan" opacity="0.6"/>
                    <line x1="12" y1="0" x2="12" y2="7" stroke="cyan" stroke-width="2"/>
                    <line x1="12" y1="17" x2="12" y2="24" stroke="cyan" stroke-width="2"/>
                    <line x1="0" y1="12" x2="7" y2="12" stroke="cyan" stroke-width="2"/>
                    <line x1="17" y1="12" x2="24" y2="12" stroke="cyan" stroke-width="2"/>
                </svg>
            `;

            document.body.appendChild(this.crosshairElement);
        },

        /**
         * Create annotation panel
         */
        createAnnotationPanel: function () {
            this.annotationElement = document.createElement('div');
            this.annotationElement.id = 'pointer-annotation';
            this.annotationElement.style.cssText = `
                position: fixed;
                top: 50%;
                left: 50%;
                transform: translate(20px, -50%);
                background: rgba(0, 20, 30, 0.9);
                border: 2px solid cyan;
                border-radius: 8px;
                padding: 12px 16px;
                font-family: 'Courier New', monospace;
                font-size: 14px;
                color: cyan;
                pointer-events: none;
                z-index: 999;
                display: none;
                min-width: 200px;
                box-shadow: 0 0 20px rgba(0, 255, 255, 0.3);
            `;

            document.body.appendChild(this.annotationElement);
        },

        /**
         * Create laser beam mesh
         */
        createLaserBeam: function () {
            if (!window.scene) return;

            // Beam geometry (cylinder from camera to target)
            var beamGeometry = new THREE.CylinderGeometry(0.05, 0.2, 100, 8);
            var beamMaterial = new THREE.MeshBasicMaterial({
                color: this.beamColor,
                transparent: true,
                opacity: 0.6,
                depthWrite: false
            });

            this.beamMesh = new THREE.Mesh(beamGeometry, beamMaterial);
            this.beamMesh.visible = false;
            window.scene.add(this.beamMesh);
        },

        /**
         * Start update loop
         */
        startUpdateLoop: function () {
            var self = this;

            function update() {
                if (self.enabled) {
                    self.updatePointer();
                }
                requestAnimationFrame(update);
            }

            update();
        },

        /**
         * Main update function
         */
        updatePointer: function () {
            if (!window.camera || !window.scene) return;

            // Raycast from center of screen
            this.raycaster.setFromCamera(
                new THREE.Vector2(0, 0), // Screen center
                window.camera
            );

            var target = this.detectTarget();

            if (target) {
                this.currentTarget = target;
                this.updateCrosshair(true);
                this.updateHighlight(target);
                this.updateAnnotation(target);
                this.updateBeam(target);
            } else {
                this.currentTarget = null;
                this.updateCrosshair(false);
                this.clearHighlight();
                this.hideAnnotation();
                this.hideBeam();
            }
        },

        /**
         * Detect target protein/atom
         */
        detectTarget: function () {
            var proteinGroups = [];

            // Collect all protein groups
            if (window.PDB && window.PDB.GROUP_STRUCTURE_INDEX) {
                for (var i = 0; i < window.PDB.GROUP_STRUCTURE_INDEX.length; i++) {
                    var groupIndex = window.PDB.GROUP_STRUCTURE_INDEX[i];
                    if (window.PDB.GROUP[groupIndex] && window.PDB.GROUP[groupIndex].children.length > 0) {
                        proteinGroups.push(window.PDB.GROUP[groupIndex]);
                    }
                }
            }

            if (proteinGroups.length === 0) return null;

            // Raycast
            var intersects = this.raycaster.intersectObjects(proteinGroups, true);

            if (intersects.length > 0) {
                var intersection = intersects[0];

                return {
                    object: intersection.object,
                    point: intersection.point,
                    distance: intersection.distance,
                    userData: intersection.object.userData
                };
            }

            return null;
        },

        /**
         * Update crosshair visual state
         */
        updateCrosshair: function (targeting) {
            if (!this.crosshairEnabled || !this.crosshairElement) return;

            var svg = this.crosshairElement.querySelector('svg');
            if (svg) {
                if (targeting) {
                    // Green when targeting
                    svg.querySelectorAll('circle, line').forEach(function (el) {
                        el.setAttribute('stroke', '#00ff00');
                        if (el.tagName === 'circle' && el.getAttribute('r') === '2') {
                            el.setAttribute('fill', '#00ff00');
                        }
                    });
                    this.crosshairElement.style.transform = 'translate(-50%, -50%) scale(1.2)';
                } else {
                    // Cyan default
                    svg.querySelectorAll('circle, line').forEach(function (el) {
                        el.setAttribute('stroke', 'cyan');
                        if (el.tagName === 'circle' && el.getAttribute('r') === '2') {
                            el.setAttribute('fill', 'cyan');
                        }
                    });
                    this.crosshairElement.style.transform = 'translate(-50%, -50%) scale(1.0)';
                }
            }
        },

        /**
         * Update highlight on target object
         */
        updateHighlight: function (target) {
            this.clearHighlight();

            var obj = target.object;

            // Store original material
            if (obj.material) {
                if (!obj.userData.originalEmissive) {
                    if (obj.material.emissive) {
                        obj.userData.originalEmissive = obj.material.emissive.getHex();
                    }
                }

                // Apply yellow highlight
                if (obj.material.emissive) {
                    obj.material.emissive.setHex(this.highlightColor);
                }
            }

            this.highlightMesh = obj;
        },

        /**
         * Clear highlight
         */
        clearHighlight: function () {
            if (this.highlightMesh && this.highlightMesh.material) {
                if (this.highlightMesh.userData.originalEmissive !== undefined) {
                    if (this.highlightMesh.material.emissive) {
                        this.highlightMesh.material.emissive.setHex(
                            this.highlightMesh.userData.originalEmissive
                        );
                    }
                }
            }
            this.highlightMesh = null;
        },

        /**
         * Update annotation panel with target info
         */
        updateAnnotation: function (target) {
            if (!this.annotationsEnabled || !this.annotationElement) return;

            var userData = target.userData;
            var distance = target.distance.toFixed(1);

            var html = '<div style="line-height: 1.6;">';

            // Distance
            html += '<div style="color: #00ff00; font-weight: bold; margin-bottom: 8px;">';
            html += '📏 Distance: ' + distance + ' Å';
            html += '</div>';

            // Atom info
            if (userData.presentAtom) {
                var atom = userData.presentAtom;

                html += '<div style="border-top: 1px solid cyan; padding-top: 8px; margin-top: 8px;">';

                // Chain
                html += '<div>🧬 Chain: <span style="color: #ffa500;">' +
                    atom.chainname.toUpperCase() + '</span></div>';

                // Residue
                html += '<div>🔗 Residue: <span style="color: #ff69b4;">' +
                    atom.resname.toUpperCase() + ' ' + atom.resid + '</span></div>';

                // Atom
                html += '<div>⚛️  Atom: <span style="color: #87ceeb;">' +
                    atom.name.toUpperCase() + ' (#' + atom.id + ')</span></div>';

                // Additional info
                if (atom.bfactor !== undefined) {
                    html += '<div style="font-size: 12px; color: #aaa; margin-top: 4px;">';
                    html += 'B-factor: ' + atom.bfactor.toFixed(2);
                    html += '</div>';
                }

                html += '</div>';
            } else {
                html += '<div style="color: #aaa;">Protein Structure</div>';
            }

            html += '</div>';

            this.annotationElement.innerHTML = html;
            this.annotationElement.style.display = 'block';
        },

        /**
         * Hide annotation panel
         */
        hideAnnotation: function () {
            if (this.annotationElement) {
                this.annotationElement.style.display = 'none';
            }
        },

        /**
         * Update laser beam
         */
        updateBeam: function (target) {
            if (!this.beamEnabled || !this.beamMesh || !window.camera) return;

            var cameraPos = window.camera.position;
            var targetPos = target.point;

            // Position beam between camera and target
            var distance = cameraPos.distanceTo(targetPos);
            var midpoint = new THREE.Vector3().lerpVectors(cameraPos, targetPos, 0.5);

            this.beamMesh.position.copy(midpoint);
            this.beamMesh.lookAt(targetPos);
            this.beamMesh.rotateX(Math.PI / 2); // Cylinder default is Y-axis
            this.beamMesh.scale.y = distance / 100; // Scale length

            // Color based on distance
            if (distance < 50) {
                this.beamMesh.material.color.setHex(0x00ff00); // Green (close)
            } else if (distance < 150) {
                this.beamMesh.material.color.setHex(this.beamColor); // Cyan (medium)
            } else {
                this.beamMesh.material.color.setHex(0xff6600); // Orange (far)
            }

            this.beamMesh.visible = true;
        },

        /**
         * Hide laser beam
         */
        hideBeam: function () {
            if (this.beamMesh) {
                this.beamMesh.visible = false;
            }
        },

        /**
         * Keyboard controls
         */
        onKeyDown: function (event) {
            switch (event.key.toLowerCase()) {
                case 't': // Toggle beam
                    this.toggleBeam();
                    event.preventDefault();
                    break;

                case 'h': // Toggle crosshair
                    this.toggleCrosshair();
                    event.preventDefault();
                    break;

                case 'i': // Toggle annotations
                    this.toggleAnnotations();
                    event.preventDefault();
                    break;
            }
        },

        /**
         * Toggle laser beam
         */
        toggleBeam: function () {
            this.beamEnabled = !this.beamEnabled;
            console.log('[POINTER] Laser beam:', this.beamEnabled ? 'ON' : 'OFF');

            if (!this.beamEnabled) {
                this.hideBeam();
            }
        },

        /**
         * Toggle crosshair
         */
        toggleCrosshair: function () {
            this.crosshairEnabled = !this.crosshairEnabled;
            console.log('[POINTER] Crosshair:', this.crosshairEnabled ? 'ON' : 'OFF');

            if (this.crosshairElement) {
                this.crosshairElement.style.display = this.crosshairEnabled ? 'block' : 'none';
            }
        },

        /**
         * Toggle annotations
         */
        toggleAnnotations: function () {
            this.annotationsEnabled = !this.annotationsEnabled;
            console.log('[POINTER] Annotations:', this.annotationsEnabled ? 'ON' : 'OFF');

            if (!this.annotationsEnabled) {
                this.hideAnnotation();
            }
        },

        /**
         * Enable pointer system
         */
        enable: function () {
            this.enabled = true;
            console.log('[POINTER] Enabled');
        },

        /**
         * Disable pointer system
         */
        disable: function () {
            this.enabled = false;
            this.clearHighlight();
            this.hideAnnotation();
            this.hideBeam();
            console.log('[POINTER] Disabled');
        },

        /**
         * Get current target info (for external use)
         */
        getCurrentTarget: function () {
            return this.currentTarget;
        }
    };

    // Export globally
    window.UniversalPointer = UniversalPointer;

    // Auto-initialize when scene is ready
    if (typeof window.scene !== 'undefined' && window.scene) {
        UniversalPointer.init();
    } else {
        // Wait for scene
        var checkScene = setInterval(function () {
            if (window.scene) {
                clearInterval(checkScene);
                UniversalPointer.init();
            }
        }, 100);
    }

})();
