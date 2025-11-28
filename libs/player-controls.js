/**
 * Player Controls (WASD + Pointer Lock)
 * Ported from envTest/src/components/PlayerControls.jsx
 */

var PlayerControls = {
    isLocked: false,
    movementLocked: false, // For focus mode - prevents WASD movement
    moveForward: false,
    moveBackward: false,
    moveLeft: false,
    moveRight: false,
    velocity: new THREE.Vector3(),
    direction: new THREE.Vector3(),
    camera: null,
    domElement: null,
    controls: null,
    moveSpeedMultiplier: 77.0, // Controllable from UI slider (default 77x)
    playerHeight: 1.6, // Controllable from UI slider (default 1.6m eye level)

    init: function (camera, domElement) {
        this.camera = camera;
        this.domElement = domElement || document.body;

        // Manual mouse rotation (NO PointerLockControls - it interferes!)
        var euler = new THREE.Euler(0, 0, 0, 'YXZ');
        var PI_2 = Math.PI / 2;
        var _vector = new THREE.Vector3();

        var onMouseMove = function (event) {
            if (!PlayerControls.isLocked) return;

            var movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
            var movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

            euler.setFromQuaternion(PlayerControls.camera.quaternion);
            euler.y -= movementX * 0.002;
            euler.x -= movementY * 0.002;
            euler.x = Math.max(-PI_2 + 0.15, Math.min(PI_2 - 0.15, euler.x)); // Allow ±80° vertical look
            PlayerControls.camera.quaternion.setFromEuler(euler);
        };

        document.addEventListener('mousemove', onMouseMove, false);

        // Event Listeners
        document.addEventListener('keydown', this.onKeyDown.bind(this));
        document.addEventListener('keyup', this.onKeyUp.bind(this));

        // Pointer Lock trigger (click to lock)
        document.addEventListener('click', function () {
            // Disable pointer lock in VR mode
            if (typeof window.renderer !== 'undefined' && window.renderer.xr && window.renderer.xr.isPresenting) return;

            if (!PlayerControls.isLocked && !PDB.isShowMenu) {
                document.body.requestPointerLock = document.body.requestPointerLock || document.body.mozRequestPointerLock || document.body.webkitRequestPointerLock;
                if (document.body.requestPointerLock) {
                    document.body.requestPointerLock();
                }
            }
        });

        // Handle lock state changes
        document.addEventListener('pointerlockchange', this.onPointerLockChange.bind(this), false);
        document.addEventListener('mozpointerlockchange', this.onPointerLockChange.bind(this), false);
        document.addEventListener('webkitpointerlockchange', this.onPointerLockChange.bind(this), false);
    },

    onPointerLockChange: function () {
        if (document.pointerLockElement === document.body || document.mozPointerLockElement === document.body || document.webkitPointerLockElement === document.body) {
            this.isLocked = true;
            console.log('[PlayerControls] Locked');
        } else {
            this.isLocked = false;
            console.log('[PlayerControls] Unlocked');
        }
    },

    onKeyDown: function (event) {
        // Bio-floor toggle (B key)
        if (event.code === 'KeyB') {
            if (typeof window.toggleBioFloor === 'function') {
                window.toggleBioFloor();
            }
            return;
        }

        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                this.moveForward = true;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                this.moveLeft = true;
                break;
            case 'ArrowDown':
            case 'KeyS':
                this.moveBackward = true;
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.moveRight = true;
                break;
        }
    },

    onKeyUp: function (event) {
        switch (event.code) {
            case 'ArrowUp':
            case 'KeyW':
                this.moveForward = false;
                break;
            case 'ArrowLeft':
            case 'KeyA':
                this.moveLeft = false;
                break;
            case 'ArrowDown':
            case 'KeyS':
                this.moveBackward = false;
                break;
            case 'ArrowRight':
            case 'KeyD':
                this.moveRight = false;
                break;
        }
    },

    update: function (delta) {
        if (!this.camera) return;
        if (!delta || delta === 0 || isNaN(delta) || delta > 1) delta = 0.016;

        // Check if we're in VR mode
        var isVR = (typeof window.renderer !== 'undefined' && window.renderer.xr && window.renderer.xr.isPresenting);

        // In VR, we move the rig not the camera
        // In desktop, we move the camera directly
        var targetObject = (isVR && typeof window.playerRig !== 'undefined') ? window.playerRig : this.camera;

        // LOCK TO GROUND - always at eye level (user-adjustable)
        if (!isVR) {
            this.camera.position.y = this.playerHeight;
        }

        // PREVENT PITCH - lock camera horizontal (RELAXED to allow looking up/down)
        // Desktop only - VR headset controls camera rotation
        if (!isVR) {
            var euler = new THREE.Euler().setFromQuaternion(this.camera.quaternion, 'YXZ');
            euler.x = THREE.MathUtils.clamp(euler.x, -1.4, 1.4); // Allow ±80° vertical look
            this.camera.quaternion.setFromEuler(euler);
        }

        // Get flat movement directions
        var forward = new THREE.Vector3();
        this.camera.getWorldDirection(forward);
        forward.y = 0;
        forward.normalize();

        var right = new THREE.Vector3();
        right.crossVectors(forward, new THREE.Vector3(0, 1, 0));
        right.normalize();

        // Calculate move direction (skip if movement is locked for focus mode)
        var moveDirection = new THREE.Vector3(0, 0, 0);
        if (!this.movementLocked) {
            if (this.moveForward) moveDirection.add(forward);
            if (this.moveBackward) moveDirection.sub(forward);
            if (this.moveRight) moveDirection.add(right);
            if (this.moveLeft) moveDirection.sub(right);
        }

        if (moveDirection.length() > 0) moveDirection.normalize();

        // Accelerate - FAST (with user-controllable multiplier)
        var moveSpeed = 25.0 * this.moveSpeedMultiplier;
        if (moveDirection.length() > 0) {
            this.velocity.x += moveDirection.x * moveSpeed * delta;
            this.velocity.z += moveDirection.z * moveSpeed * delta;
        }

        // Friction
        this.velocity.x *= Math.pow(0.85, delta * 60);
        this.velocity.z *= Math.pow(0.85, delta * 60);

        // Cap speed (also affected by multiplier)
        var maxSpeed = 35.0 * this.moveSpeedMultiplier;
        var currentSpeed = Math.sqrt(this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z);
        if (currentSpeed > maxSpeed) {
            this.velocity.x = (this.velocity.x / currentSpeed) * maxSpeed;
            this.velocity.z = (this.velocity.z / currentSpeed) * maxSpeed;
        }

        // Move
        targetObject.position.x += this.velocity.x * delta;
        targetObject.position.z += this.velocity.z * delta;

        // Circular Boundary Collision
        var groundRadius = window.GROUND_RADIUS || 250;
        var distFromCenter = Math.sqrt(
            targetObject.position.x * targetObject.position.x +
            targetObject.position.z * targetObject.position.z
        );

        if (distFromCenter > groundRadius) {
            // Push back to edge
            var angle = Math.atan2(targetObject.position.z, targetObject.position.x);
            targetObject.position.x = Math.cos(angle) * groundRadius;
            targetObject.position.z = Math.sin(angle) * groundRadius;

            // Stop velocity
            this.velocity.set(0, 0, 0);
        }

        targetObject.position.y = this.playerHeight; // Final lock to user-set height
    },

    // Lock movement for focus mode
    lockMovement: function () {
        this.movementLocked = true;
        // Stop all current movement
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.velocity.set(0, 0, 0);
        console.log('[PlayerControls] Movement locked');
    },

    // Unlock movement
    unlockMovement: function () {
        this.movementLocked = false;
        console.log('[PlayerControls] Movement unlocked');
    }
};
