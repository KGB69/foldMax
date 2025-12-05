/**
 * Protein Manipulator Component
 * VR interaction controls for 3D protein structures
 * Phase 1: Grip-based grab and rotate with haptic/visual feedback
 */

AFRAME.registerComponent('protein-manipulator', {
    schema: {
        grabEnabled: { default: true },
        scaleEnabled: { default: true },
        pointerEnabled: { default: true },
        orbitEnabled: { default: true }
    },

    init: function () {
        console.log('[ProteinManipulator] Initializing...');

        // State tracking
        this.gripped = {
            left: false,
            right: false
        };

        this.controllerData = {
            left: { position: new THREE.Vector3(), rotation: new THREE.Quaternion() },
            right: { position: new THREE.Vector3(), rotation: new THREE.Quaternion() }
        };

        this.initialGrabData = {
            moleculePosition: new THREE.Vector3(),
            moleculeRotation: new THREE.Quaternion(),
            controllerPosition: new THREE.Vector3(),
            controllerRotation: new THREE.Quaternion()
        };

        // Visual feedback - glow material
        this.originalMaterials = [];
        this.glowActive = false;

        // Setup Phase 1: Grab controls
        if (this.data.grabEnabled) {
            this.setupGrabControls();
        }

        console.log('[ProteinManipulator] Ready - Grip to grab molecule');
    },

    setupGrabControls: function () {
        var self = this;

        // Get controller entities
        setTimeout(function () {
            var leftHand = document.querySelector('#left-hand');
            var rightHand = document.querySelector('#right-hand');

            if (leftHand) {
                leftHand.addEventListener('gripdown', function (evt) {
                    self.onGripDown('left', evt);
                });
                leftHand.addEventListener('gripup', function (evt) {
                    self.onGripUp('left', evt);
                });
                console.log('[ProteinManipulator] Left grip bound');
            }

            if (rightHand) {
                rightHand.addEventListener('gripdown', function (evt) {
                    self.onGripDown('right', evt);
                });
                rightHand.addEventListener('gripup', function (evt) {
                    self.onGripUp('right', evt);
                });
                console.log('[ProteinManipulator] Right grip bound');
            }

            if (!leftHand && !rightHand) {
                console.warn('[ProteinManipulator] No controllers found');
            }
        }, 1000);
    },

    onGripDown: function (hand, evt) {
        console.log('[ProteinManipulator] Grip down:', hand);

        this.gripped[hand] = true;

        // Get controller entity
        var controller = hand === 'left'
            ? document.querySelector('#left-hand')
            : document.querySelector('#right-hand');

        if (controller && controller.object3D) {
            // Store initial grab data
            if (!this.gripped.left && !this.gripped.right) {
                // First grip - store molecule state
                this.initialGrabData.moleculePosition.copy(this.el.object3D.position);
                this.initialGrabData.moleculeRotation.copy(this.el.object3D.quaternion);
            }

            // Store controller state
            controller.object3D.getWorldPosition(this.controllerData[hand].position);
            controller.object3D.getWorldQuaternion(this.controllerData[hand].rotation);

            // Store as initial grab point
            this.initialGrabData.controllerPosition.copy(this.controllerData[hand].position);
            this.initialGrabData.controllerRotation.copy(this.controllerData[hand].rotation);

            // Haptic feedback - short pulse
            this.triggerHapticPulse(controller, 100, 0.5);

            // Visual feedback - add glow
            this.activateGlow();
        }
    },

    onGripUp: function (hand, evt) {
        console.log('[ProteinManipulator] Grip up:', hand);

        this.gripped[hand] = false;

        // Get controller for haptic feedback
        var controller = hand === 'left'
            ? document.querySelector('#left-hand')
            : document.querySelector('#right-hand');

        // Haptic feedback - short pulse on release
        if (controller) {
            this.triggerHapticPulse(controller, 50, 0.3);
        }

        // If no grips active, remove glow
        if (!this.gripped.left && !this.gripped.right) {
            this.deactivateGlow();
        }
    },

    triggerHapticPulse: function (controllerEl, duration, intensity) {
        // Trigger haptic feedback if available
        if (controllerEl && controllerEl.components && controllerEl.components['oculus-touch-controls']) {
            var gamepad = controllerEl.components['oculus-touch-controls'].controller;
            if (gamepad && gamepad.hapticActuators && gamepad.hapticActuators[0]) {
                gamepad.hapticActuators[0].pulse(intensity, duration);
                console.log('[ProteinManipulator] Haptic pulse:', intensity, duration + 'ms');
            }
        }
    },

    activateGlow: function () {
        if (this.glowActive) return;

        console.log('[ProteinManipulator] Activating glow effect');
        this.glowActive = true;

        // Add emissive glow to all meshes in molecule
        this.el.object3D.traverse(function (node) {
            if (node.isMesh && node.material) {
                // Store original emissive
                if (!node.userData.originalEmissive) {
                    node.userData.originalEmissive = node.material.emissive ? node.material.emissive.clone() : new THREE.Color(0x000000);
                    node.userData.originalEmissiveIntensity = node.material.emissiveIntensity || 0;
                }

                // Add cyan glow
                if (node.material.emissive) {
                    node.material.emissive.setHex(0x00ffff);
                    node.material.emissiveIntensity = 0.3;
                }
            }
        });
    },

    deactivateGlow: function () {
        if (!this.glowActive) return;

        console.log('[ProteinManipulator] Deactivating glow effect');
        this.glowActive = false;

        // Restore original materials
        this.el.object3D.traverse(function (node) {
            if (node.isMesh && node.material && node.userData.originalEmissive) {
                if (node.material.emissive) {
                    node.material.emissive.copy(node.userData.originalEmissive);
                    node.material.emissiveIntensity = node.userData.originalEmissiveIntensity;
                }
            }
        });
    },

    tick: function () {
        // Update molecule transform if gripped
        if (this.gripped.left || this.gripped.right) {
            this.updateGrabTransform();
        }
    },

    updateGrabTransform: function () {
        // Get the active controller (prefer right, fall back to left)
        var activeHand = this.gripped.right ? 'right' : 'left';
        var controller = activeHand === 'left'
            ? document.querySelector('#left-hand')
            : document.querySelector('#right-hand');

        if (!controller || !controller.object3D) return;

        // Get current controller world transform
        var currentControllerPos = new THREE.Vector3();
        var currentControllerRot = new THREE.Quaternion();
        controller.object3D.getWorldPosition(currentControllerPos);
        controller.object3D.getWorldQuaternion(currentControllerRot);

        // Calculate delta rotation
        var deltaRotation = new THREE.Quaternion();
        deltaRotation.copy(currentControllerRot);
        deltaRotation.multiply(this.initialGrabData.controllerRotation.clone().invert());

        // Apply rotation to molecule
        this.el.object3D.quaternion.copy(this.initialGrabData.moleculeRotation);
        this.el.object3D.quaternion.premultiply(deltaRotation);

        // Calculate delta position
        var deltaPos = new THREE.Vector3();
        deltaPos.copy(currentControllerPos);
        deltaPos.sub(this.initialGrabData.controllerPosition);

        // Apply position to molecule
        this.el.object3D.position.copy(this.initialGrabData.moleculePosition);
        this.el.object3D.position.add(deltaPos);
    },

    remove: function () {
        console.log('[ProteinManipulator] Removing...');
        this.deactivateGlow();
    }
});
