/**
 * VR Locomotion Component
 * Handles left joystick movement for Oculus Quest controllers
 */
AFRAME.registerComponent('vr-locomotion', {
    schema: {
        speed: { type: 'number', default: 3 },
        fly: { type: 'boolean', default: true },
        rotationSpeed: { type: 'number', default: 45 }, // degrees per second for snap turn
        deadzone: { type: 'number', default: 0.2 }
    },

    init: function () {
        console.log('[VRLocomotion] Initializing...');

        this.velocity = new THREE.Vector3();
        this.direction = new THREE.Vector3();
        this.rotation = new THREE.Euler();

        // Track joystick state
        this.leftStick = { x: 0, y: 0 };
        this.rightStick = { x: 0, y: 0 };

        // Get camera for direction reference
        this.camera = document.querySelector('#camera');
        this.rig = this.el;

        // Bind controller events
        this.setupControllerListeners();

        console.log('[VRLocomotion] Ready - Left stick: move, Right stick: turn');
    },

    setupControllerListeners: function () {
        var self = this;

        // Left hand - movement
        var leftHand = document.querySelector('#left-hand');
        if (leftHand) {
            leftHand.addEventListener('thumbstickmoved', function (evt) {
                self.leftStick.x = evt.detail.x;
                self.leftStick.y = evt.detail.y;
            });
            console.log('[VRLocomotion] Left hand listener attached');
        } else {
            console.warn('[VRLocomotion] Left hand not found, retrying...');
            setTimeout(function () { self.setupControllerListeners(); }, 1000);
        }

        // Right hand - rotation (optional)
        var rightHand = document.querySelector('#right-hand');
        if (rightHand) {
            rightHand.addEventListener('thumbstickmoved', function (evt) {
                self.rightStick.x = evt.detail.x;
                self.rightStick.y = evt.detail.y;
            });
            console.log('[VRLocomotion] Right hand listener attached');
        }
    },

    tick: function (time, deltaTime) {
        if (!this.camera || !this.rig) return;

        var dt = deltaTime / 1000; // Convert to seconds
        var speed = this.data.speed;
        var deadzone = this.data.deadzone;

        // Get left stick input (movement)
        var moveX = this.leftStick.x;
        var moveY = this.leftStick.y;

        // Apply deadzone
        if (Math.abs(moveX) < deadzone) moveX = 0;
        if (Math.abs(moveY) < deadzone) moveY = 0;

        // Only process if there's input
        if (moveX !== 0 || moveY !== 0) {
            // Get camera's world direction
            var cameraEl = this.camera;
            var cameraObject = cameraEl.object3D;

            // Get forward direction from camera
            var forward = new THREE.Vector3(0, 0, -1);
            forward.applyQuaternion(cameraObject.quaternion);

            // Get right direction
            var right = new THREE.Vector3(1, 0, 0);
            right.applyQuaternion(cameraObject.quaternion);

            // If not flying, zero out Y component and normalize
            if (!this.data.fly) {
                forward.y = 0;
                forward.normalize();
                right.y = 0;
                right.normalize();
            }

            // Calculate movement direction
            // Forward/back is negative Y stick (push forward = move forward)
            // Left/right is X stick
            this.direction.set(0, 0, 0);
            this.direction.addScaledVector(forward, -moveY); // Inverted because stick Y is inverted
            this.direction.addScaledVector(right, moveX);

            // Apply movement to rig
            var rigPos = this.rig.getAttribute('position');
            rigPos.x += this.direction.x * speed * dt;
            rigPos.z += this.direction.z * speed * dt;

            if (this.data.fly) {
                rigPos.y += this.direction.y * speed * dt;
            }

            this.rig.setAttribute('position', rigPos);
        }

        // Handle right stick rotation (snap turn)
        var turnX = this.rightStick.x;
        if (Math.abs(turnX) > 0.7 && !this.isTurning) {
            this.isTurning = true;
            var currentRotation = this.rig.getAttribute('rotation');
            var turnAmount = turnX > 0 ? -this.data.rotationSpeed : this.data.rotationSpeed;
            currentRotation.y += turnAmount;
            this.rig.setAttribute('rotation', currentRotation);
        } else if (Math.abs(turnX) < 0.3) {
            this.isTurning = false;
        }
    }
});

console.log('[VRLocomotion] Component registered');
