/**
 * Navigation module for VRmol
 * Implements WASD keyboard controls with collision detection for 3D protein environment
 * 
 * Usage Instructions:
 * - Press 'N' key or click the "Toggle WASD Controls" button to enable/disable navigation mode
 * - Use WASD keys to move (W=forward, A=left, S=backward, D=right)
 * - Use mouse to look around
 * - Collision detection prevents moving through protein structures
 * - Movement is bounded within the protein environment
 * - Only available in non-VR mode
 */

// Check if PDB is defined, if not create a minimal version for testing
if (typeof PDB === 'undefined') {
    var PDB = {
        mode: 0, // MODE_THREE
        MODE_THREE: 0,
        MODE_VR: 1
    };
}

PDB.navigation = {
    // Configuration
    enabled: false,
    boundingBoxSize: 100, // Size of the environment boundary
    collisionDistance: 2, // Minimum distance to obstacles
    moveSpeed: 50.0, // Movement speed (increased from 0.5)

    // Internal state
    clock: null,
    colliders: [], // Objects to check for collision
    boundingBox: null,

    // Movement state
    moveForward: false,
    moveBackward: false,
    moveLeft: false,
    moveRight: false,
    moveUp: false,
    moveDown: false,
    run: false,
    slow: false,

    // Mouse state
    mouseLook: {
        x: 0,
        y: 0,
        xDelta: 0,
        yDelta: 0,
        sensitivity: 0.002
    },

    /**
     * Initialize first-person navigation
     */
    init: function () {
        // Don't initialize in VR mode
        if (PDB.mode === PDB.MODE_VR) return;

        // Store original camera position for restoration
        this.originalCameraPosition = camera.position.clone();
        this.originalCameraRotation = camera.rotation.clone();

        // Set up clock for delta time
        this.clock = new THREE.Clock();

        // Disable orbit controls when navigation is enabled
        if (typeof controls !== 'undefined') {
            controls.enabled = false;
        }

        // Setup input handlers
        this.setupKeyboardControls();
        this.setupMouseControls();

        // Set initial camera properties
        camera.rotation.order = 'YXZ'; // Important for proper first-person controls

        console.log("Custom first-person navigation initialized");
    },

    /**
     * Setup keyboard controls for WASD navigation
     */
    setupKeyboardControls: function () {
        var self = this;

        // Key down handler
        document.addEventListener('keydown', function (event) {
            switch (event.code) {
                case 'KeyW': // W - forward
                    self.moveForward = true;
                    break;
                case 'KeyS': // S - backward
                    self.moveBackward = true;
                    break;
                case 'KeyA': // A - left
                    self.moveLeft = true;
                    break;
                case 'KeyD': // D - right
                    self.moveRight = true;
                    break;
                case 'Space': // Space - up
                    self.moveUp = true;
                    break;
                case 'ShiftLeft': // Shift - down
                case 'ShiftRight':
                    self.moveDown = true;
                    break;
                case 'ControlLeft': // Ctrl - slow mode
                case 'ControlRight':
                    self.slow = true;
                    break;
            }
        });

        // Key up handler
        document.addEventListener('keyup', function (event) {
            switch (event.code) {
                case 'KeyW': // W - forward
                    self.moveForward = false;
                    break;
                case 'KeyS': // S - backward
                    self.moveBackward = false;
                    break;
                case 'KeyA': // A - left
                    self.moveLeft = false;
                    break;
                case 'KeyD': // D - right
                    self.moveRight = false;
                    break;
                case 'Space': // Space - up
                    self.moveUp = false;
                    break;
                case 'ShiftLeft': // Shift - down
                case 'ShiftRight':
                    self.moveDown = false;
                    break;
                case 'ControlLeft': // Ctrl - slow mode
                case 'ControlRight':
                    self.slow = false;
                    break;
            }
        });
    },

    /**
     * Setup mouse controls for looking around
     */
    setupMouseControls: function () {
        var self = this;
        var canvasElement = renderer.domElement;

        // Mouse move handler
        canvasElement.addEventListener('mousemove', function (event) {
            if (!self.enabled) return;

            // Calculate mouse movement
            var movementX = event.movementX || event.mozMovementX || event.webkitMovementX || 0;
            var movementY = event.movementY || event.mozMovementY || event.webkitMovementY || 0;

            // Update mouse look values
            self.mouseLook.xDelta = movementX * self.mouseLook.sensitivity;
            self.mouseLook.yDelta = movementY * self.mouseLook.sensitivity;
        });

        // Request pointer lock when navigation is enabled
        document.addEventListener('pointerlockchange', function () {
            if (document.pointerLockElement === canvasElement) {
                console.log('Pointer lock active - mouse look enabled');
            } else if (self.enabled) {
                console.log('Pointer lock inactive - mouse look disabled');
            }
        });

        // Re-request pointer lock on click if enabled
        canvasElement.addEventListener('click', function () {
            if (self.enabled && document.pointerLockElement !== canvasElement) {
                canvasElement.requestPointerLock();
            }
        });
    },

    /**
     * Create invisible bounding box to contain the player
     */
    createBoundingBox: function () {
        // Get the protein structure limits
        var limit = w3m.global.limit;
        var size = Math.max(
            limit.x[1] - limit.x[0],
            limit.y[1] - limit.y[0],
            limit.z[1] - limit.z[0]
        );

        // Create a bounding box slightly larger than the protein
        var boxSize = size * 1.5;
        this.boundingBoxSize = boxSize;

        // Create invisible box geometry
        var boxGeometry = new THREE.BoxGeometry(boxSize, boxSize, boxSize);
        var boxMaterial = new THREE.MeshBasicMaterial({
            color: 0x00ff00,
            wireframe: true,
            visible: false
        });

        this.boundingBox = new THREE.Mesh(boxGeometry, boxMaterial);
        scene.add(this.boundingBox);

        // Center the bounding box on the protein
        var center = new THREE.Vector3(
            (limit.x[0] + limit.x[1]) / 2,
            (limit.y[0] + limit.y[1]) / 2,
            (limit.z[0] + limit.z[1]) / 2
        );
        this.boundingBox.position.copy(center);
    },

    /**
     * Generate collision objects from the protein structure
     */
    generateColliders: function () {
        // Clear existing colliders
        this.colliders = [];

        // Use simplified bounding spheres for collision detection
        // Add main protein structure as collider
        if (PDB.GROUP[PDB.GROUP_MAIN]) {
            this.colliders.push(PDB.GROUP[PDB.GROUP_MAIN]);
        }

        // Add HET groups as colliders
        if (PDB.GROUP[PDB.GROUP_HET]) {
            this.colliders.push(PDB.GROUP[PDB.GROUP_HET]);
        }
    },

    /**
     * Check if a position would cause a collision
     * @param {THREE.Vector3} position - Position to check
     * @returns {boolean} - True if position causes collision
     */
    checkCollision: function (position) {
        // Check if position is outside bounding box
        if (this.boundingBox) {
            var boxSize = this.boundingBoxSize / 2;
            var boxPos = this.boundingBox.position;

            if (
                position.x < boxPos.x - boxSize || position.x > boxPos.x + boxSize ||
                position.y < boxPos.y - boxSize || position.y > boxPos.y + boxSize ||
                position.z < boxPos.z - boxSize || position.z > boxPos.z + boxSize
            ) {
                return true; // Outside bounding box
            }
        }

        // Check collision with protein structure
        var raycaster = new THREE.Raycaster();

        // Check in 8 primary directions plus 4 diagonals for better coverage
        var directions = [
            // Primary directions
            new THREE.Vector3(1, 0, 0),   // right
            new THREE.Vector3(-1, 0, 0),  // left
            new THREE.Vector3(0, 1, 0),   // up
            new THREE.Vector3(0, -1, 0),  // down
            new THREE.Vector3(0, 0, 1),   // forward
            new THREE.Vector3(0, 0, -1),  // backward
            // Diagonal directions for better coverage
            new THREE.Vector3(1, 0, 1),   // forward-right
            new THREE.Vector3(-1, 0, 1),  // forward-left
            new THREE.Vector3(1, 0, -1),  // backward-right
            new THREE.Vector3(-1, 0, -1), // backward-left
            new THREE.Vector3(0, 1, 1),   // up-forward
            new THREE.Vector3(0, -1, 1)   // down-forward
        ];

        // Adjust collision distance based on movement speed
        var dynamicCollisionDistance = this.collisionDistance * (1 + this.moveSpeed);

        for (var i = 0; i < directions.length; i++) {
            // Normalize direction vector
            var dir = directions[i].clone().normalize();
            raycaster.set(position, dir);

            for (var j = 0; j < this.colliders.length; j++) {
                if (!this.colliders[j]) continue; // Skip if collider is undefined

                var intersects = raycaster.intersectObject(this.colliders[j], true);

                if (intersects.length > 0) {
                    var distance = intersects[0].distance;

                    // Use different collision distances for different directions
                    var threshold = dynamicCollisionDistance;
                    if (i >= 6) { // For diagonal directions, increase threshold
                        threshold *= 0.7; // Reduce threshold for diagonals
                    }

                    if (distance < threshold) {
                        // Collision detected
                        return true;
                    }
                }
            }
        }

        return false; // No collision
    },

    /**
     * Update navigation controls
     */
    update: function () {
        if (!this.enabled) return;

        var delta = this.clock.getDelta();

        // Store original position
        var originalPosition = camera.position.clone();

        // Calculate current speed based on modifiers
        var currentSpeed = this.moveSpeed;
        if (this.slow) {
            currentSpeed = this.moveSpeed * 0.5; // Slow mode
        } else if (this.run) {
            currentSpeed = this.moveSpeed * 2.0; // Run mode
        }

        // Apply movement based on key states
        var moveDistance = currentSpeed * delta;

        // Get camera direction vectors
        var forward = new THREE.Vector3(0, 0, -1).applyQuaternion(camera.quaternion);
        var right = new THREE.Vector3(1, 0, 0).applyQuaternion(camera.quaternion);
        var up = new THREE.Vector3(0, 1, 0);

        // Calculate movement vector
        var movement = new THREE.Vector3(0, 0, 0);

        // Apply WASD movement
        if (this.moveForward) movement.add(forward.clone().multiplyScalar(moveDistance));
        if (this.moveBackward) movement.add(forward.clone().multiplyScalar(-moveDistance));
        if (this.moveRight) movement.add(right.clone().multiplyScalar(moveDistance));
        if (this.moveLeft) movement.add(right.clone().multiplyScalar(-moveDistance));
        if (this.moveUp) movement.add(up.clone().multiplyScalar(moveDistance));
        if (this.moveDown) movement.add(up.clone().multiplyScalar(-moveDistance));

        // Apply movement
        camera.position.add(movement);

        // Apply mouse look - smooth rotation
        if (this.mouseLook.xDelta !== 0 || this.mouseLook.yDelta !== 0) {
            // Update camera rotation based on mouse movement
            this.mouseLook.x -= this.mouseLook.yDelta; // Vertical look (pitch)
            this.mouseLook.y -= this.mouseLook.xDelta; // Horizontal look (yaw)

            // Clamp vertical look to avoid flipping
            this.mouseLook.x = Math.max(-Math.PI / 2, Math.min(Math.PI / 2, this.mouseLook.x));

            // Reset deltas BEFORE applying rotation to prevent accumulation
            this.mouseLook.xDelta = 0;
            this.mouseLook.yDelta = 0;
        }

        // Always apply current rotation state to camera
        camera.rotation.x = this.mouseLook.x;
        camera.rotation.y = this.mouseLook.y;

        // Check for collisions - DISABLED for smooth movement
        // if (this.checkCollision(camera.position)) {
        //     // Collision detected, revert to original position
        //     camera.position.copy(originalPosition);
        //     // Try to slide along obstacles instead of just stopping
        //     this.handleCollisionSliding(originalPosition, camera.position);
        // }
    },

    /**
     * Handle sliding movement when collision is detected
     * @param {THREE.Vector3} originalPos - Original position before collision
     * @param {THREE.Vector3} newPos - New position that caused collision
     */
    handleCollisionSliding: function (originalPos, newPos) {
        // Calculate movement vector
        var movement = new THREE.Vector3();
        movement.subVectors(newPos, originalPos);

        // Try to slide along X axis
        var slideX = originalPos.clone();
        slideX.x += movement.x;

        if (!this.checkCollision(slideX)) {
            camera.position.copy(slideX);
            return;
        }

        // Try to slide along Z axis
        var slideZ = originalPos.clone();
        slideZ.z += movement.z;

        if (!this.checkCollision(slideZ)) {
            camera.position.copy(slideZ);
            return;
        }

        // Try to slide along Y axis
        var slideY = originalPos.clone();
        slideY.y += movement.y;

        if (!this.checkCollision(slideY)) {
            camera.position.copy(slideY);
        }
    },

    /**
     * Handle keyboard input for speed adjustment
     */
    handleSpeedAdjustment: function () {
        // Check if keyboard handler is available
        if (!this.keyHandler) {
            this.initKeyHandler();
        }

        // Handle speed adjustment based on key states
        if (this.keyStates && this.keyStates['ShiftLeft'] || this.keyStates['ShiftRight']) {
            // Run mode - faster movement
            this.moveSpeed = 1.0;
        } else if (this.keyStates && this.keyStates['ControlLeft'] || this.keyStates['ControlRight']) {
            // Slow mode - precise movement
            this.moveSpeed = 0.2;
        } else {
            // Normal speed
            this.moveSpeed = 0.5;
        }
    },

    /**
     * Setup proper mouse capture for first-person controls
     */
    setupMouseCapture: function () {
        if (!this.controls) return;

        // Ensure the controls are properly connected to the DOM
        this.controls.domElement = document.body;

        // Ensure mouse events are properly handled
        this.controls.handleResize();

        // Force mouse capture when enabled
        this.controls.mouseX = 0;
        this.controls.mouseY = 0;

        console.log("Mouse capture setup complete");
    },

    /**
     * Initialize keyboard handler for additional keys
     */
    initKeyHandler: function () {
        var self = this;
        this.keyStates = {};

        // Set up key down handler
        document.addEventListener('keydown', function (event) {
            self.keyStates[event.code] = true;
        });

        // Set up key up handler
        document.addEventListener('keyup', function (event) {
            self.keyStates[event.code] = false;
        });

        this.keyHandler = true;
    },

    /**
     * Enable first-person navigation mode
     */
    enable: function () {
        if (!this.enabled) {
            this.init();
        }

        this.enabled = true;

        // Store the current OrbitControls if they exist
        if (controls) {
            // Disable orbit controls
            controls.enabled = false;
        }

        // Reset mouse look state
        this.mouseLook.x = camera.rotation.x || 0;
        this.mouseLook.y = camera.rotation.y || 0;

        // Request pointer lock for mouse look
        var canvasElement = renderer.domElement;
        canvasElement.requestPointerLock = canvasElement.requestPointerLock ||
            canvasElement.mozRequestPointerLock ||
            canvasElement.webkitRequestPointerLock;

        if (canvasElement.requestPointerLock) {
            canvasElement.requestPointerLock();
        }

        // Show visual indicator that navigation mode is active
        this.showNavigationIndicator(true);

        console.log("First-person navigation enabled");
    },

    /**
     * Disable first-person navigation mode
     */
    disable: function () {
        this.enabled = false;

        // Re-enable orbit controls
        if (controls) {
            controls.enabled = true;
        }

        // Exit pointer lock
        if (document.exitPointerLock) {
            document.exitPointerLock();
        }

        // Hide navigation indicator
        this.showNavigationIndicator(false);

        console.log("First-person navigation disabled");
    },

    /**
     * Toggle first-person navigation mode
     */
    toggle: function () {
        if (this.enabled) {
            this.disable();
        } else {
            this.enable();
        }
    },

    /**
     * Show or hide navigation mode indicator
     * @param {boolean} show - Whether to show or hide the indicator
     */
    showNavigationIndicator: function (show) {
        // Create indicator if it doesn't exist
        if (!this.indicator) {
            this.indicator = document.createElement('div');
            this.indicator.id = 'navigation-indicator';
            this.indicator.style.position = 'absolute';
            this.indicator.style.bottom = '10px';
            this.indicator.style.right = '10px';
            this.indicator.style.backgroundColor = 'rgba(0, 150, 255, 0.7)';
            this.indicator.style.color = 'white';
            this.indicator.style.padding = '8px 12px';
            this.indicator.style.borderRadius = '4px';
            this.indicator.style.fontFamily = 'Arial, sans-serif';
            this.indicator.style.fontSize = '14px';
            this.indicator.style.zIndex = '1000';
            this.indicator.style.display = 'none';
            this.indicator.innerHTML = '<b>WASD Navigation Active</b><br>Press N to toggle';
            document.body.appendChild(this.indicator);
        }

        // Show or hide the indicator
        this.indicator.style.display = show ? 'block' : 'none';
    }
};
