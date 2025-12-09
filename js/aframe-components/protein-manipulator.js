/**
 * Protein Manipulator Component
 * VR interaction controls for 3D protein structures
 * Phase 1: Grip-based grab and rotate with haptic/visual feedback
 * REDESIGNED: Frame-by-frame delta approach
 */

AFRAME.registerComponent('protein-manipulator', {
    schema: {
        grabEnabled: { default: true },
        scaleEnabled: { default: true },
        pointerEnabled: { default: true },
        orbitEnabled: { default: true }
    },

    init: function () {
        console.log('[ProteinManipulator] Initializing (Delta-based v2)...');

        // State tracking
        this.gripped = {
            left: false,
            right: false
        };

        // Track previous controller state for frame-to-frame delta calculations
        this.prevControllerState = {
            left: { position: new THREE.Vector3(), rotation: new THREE.Quaternion(), valid: false },
            right: { position: new THREE.Vector3(), rotation: new THREE.Quaternion(), valid: false }
        };

        // Visual feedback
        this.glowActive = false;

        // Setup Phase 1: Grab controls
        if (this.data.grabEnabled) {
            this.setupGrabControls();
        }

        console.log('[ProteinManipulator] Ready - New delta-based grab system');
    },

    setupGrabControls: function () {
        var self = this;

        console.log('[ProteinManipulator] Setting up grab controls...');

        // Try to find controllers multiple times
        var attempts = 0;
        var checkInterval = setInterval(function () {
            attempts++;

            var leftHand = document.querySelector('#left-hand');
            var rightHand = document.querySelector('#right-hand');

            if (leftHand || rightHand) {
                if (leftHand) {
                    leftHand.addEventListener('gripdown', function (evt) {
                        console.log('[ProteinManipulator] *** LEFT GRIP DOWN ***');
                        self.onGripDown('left');
                    });
                    leftHand.addEventListener('gripup', function (evt) {
                        console.log('[ProteinManipulator] *** LEFT GRIP UP ***');
                        self.onGripUp('left');
                    });
                    console.log('[ProteinManipulator] ✓ Left grip bound');
                }

                if (rightHand) {
                    rightHand.addEventListener('gripdown', function (evt) {
                        console.log('[ProteinManipulator] *** RIGHT GRIP DOWN ***');
                        self.onGripDown('right');
                    });
                    rightHand.addEventListener('gripup', function (evt) {
                        console.log('[ProteinManipulator] *** RIGHT GRIP UP ***');
                        self.onGripUp('right');
                    });
                    console.log('[ProteinManipulator] ✓ Right grip bound');
                }

                clearInterval(checkInterval);
            } else if (attempts > 20) {
                console.error('[ProteinManipulator] No controllers found after 20 attempts');
                clearInterval(checkInterval);
            }
        }, 500);
    },

    onGripDown: function (hand) {
        var controller = document.querySelector('#' + hand + '-hand');
        if (!controller || !controller.object3D) return;

        this.gripped[hand] = true;

        // Initialize previous state for THIS grip session
        controller.object3D.getWorldPosition(this.prevControllerState[hand].position);
        controller.object3D.getWorldQuaternion(this.prevControllerState[hand].rotation);
        this.prevControllerState[hand].valid = true;

        console.log('[ProteinManipulator] Grip started -', hand);

        // Haptic + visual feedback
        this.triggerHapticPulse(controller, 100, 0.5);
        this.activateGlow();
    },

    onGripUp: function (hand) {
        this.gripped[hand] = false;
        this.prevControllerState[hand].valid = false;

        var controller = document.querySelector('#' + hand + '-hand');
        if (controller) {
            this.triggerHapticPulse(controller, 50, 0.3);
        }

        if (!this.gripped.left && !this.gripped.right) {
            this.deactivateGlow();
            console.log('[ProteinManipulator] All grips released');
        }
    },

    tick: function () {
        if (!this.gripped.left && !this.gripped.right) return;

        // Update transform based on controller deltas
        var activeHand = this.gripped.right ? 'right' : 'left';
        var controller = document.querySelector('#' + activeHand + '-hand');

        if (!controller || !controller.object3D) return;
        if (!this.prevControllerState[activeHand].valid) return;

        // Get current controller state
        var currentPos = new THREE.Vector3();
        var currentRot = new THREE.Quaternion();
        controller.object3D.getWorldPosition(currentPos);
        controller.object3D.getWorldQuaternion(currentRot);

        // Calculate deltas from PREVIOUS FRAME
        var deltaPos = new THREE.Vector3();
        deltaPos.subVectors(currentPos, this.prevControllerState[activeHand].position);

        var deltaRot = new THREE.Quaternion();
        deltaRot.copy(currentRot);
        deltaRot.multiply(this.prevControllerState[activeHand].rotation.clone().invert());

        // Apply deltas to molecule's CURRENT state (not stored initial state!)
        this.el.object3D.position.add(deltaPos);
        this.el.object3D.quaternion.premultiply(deltaRot);

        // Update previous state for next frame
        this.prevControllerState[activeHand].position.copy(currentPos);
        this.prevControllerState[activeHand].rotation.copy(currentRot);
    },

    triggerHapticPulse: function (controllerEl, duration, intensity) {
        if (controllerEl && controllerEl.components && controllerEl.components['oculus-touch-controls']) {
            var gamepad = controllerEl.components['oculus-touch-controls'].controller;
            if (gamepad && gamepad.hapticActuators && gamepad.hapticActuators[0]) {
                gamepad.hapticActuators[0].pulse(intensity, duration);
            }
        }
    },

    activateGlow: function () {
        if (this.glowActive) return;
        this.glowActive = true;

        this.el.object3D.traverse(function (node) {
            if (node.isMesh && node.material) {
                if (!node.userData.originalEmissive) {
                    node.userData.originalEmissive = node.material.emissive ? node.material.emissive.clone() : new THREE.Color(0x000000);
                    node.userData.originalEmissiveIntensity = node.material.emissiveIntensity || 0;
                }
                if (node.material.emissive) {
                    node.material.emissive.setHex(0x00ffff);
                    node.material.emissiveIntensity = 0.3;
                }
            }
        });
    },

    deactivateGlow: function () {
        if (!this.glowActive) return;
        this.glowActive = false;

        this.el.object3D.traverse(function (node) {
            if (node.isMesh && node.material && node.userData.originalEmissive) {
                if (node.material.emissive) {
                    node.material.emissive.copy(node.userData.originalEmissive);
                    node.material.emissiveIntensity = node.userData.originalEmissiveIntensity;
                }
            }
        });
    },

    remove: function () {
        this.deactivateGlow();
    }
});
