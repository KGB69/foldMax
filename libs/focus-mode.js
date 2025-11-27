/**
 * Protein Focus Mode
 * Allows users to select and manipulate individual proteins
 * - F key to enter/exit focus mode
 * - Mouse drag to rotate protein
 * - Scroll wheel or +/- keys to scale
 * - ESC to exit focus mode
 */

(function () {
    'use strict';

    // State management
    const FocusMode = {
        active: false,
        focusedProtein: null,
        originalCameraPos: null,
        originalProteinPos: null,
        originalProteinRot: null,
        originalProteinScale: null,
        highlightHelper: null,

        // Mouse interaction state
        mouseDown: false,
        lastMouseX: 0,
        lastMouseY: 0,

        // Raycaster for protein detection
        raycaster: null,
        mouse: new THREE.Vector2(),

        // Scale limits
        minScale: 0.1,
        maxScale: 5.0,
        scaleStep: 0.1
    };

    /**
     * Initialize focus mode system
     */
    function init() {
        FocusMode.raycaster = new THREE.Raycaster();

        // Keyboard event listeners
        document.addEventListener('keydown', onKeyDown);

        // Mouse event listeners for rotation (non-passive to allow preventDefault)
        document.addEventListener('mousedown', onMouseDown, { passive: false });
        document.addEventListener('mousemove', onMouseMove, { passive: false });
        document.addEventListener('mouseup', onMouseUp, { passive: false });

        // Scroll event for scaling (non-passive to allow preventDefault)
        document.addEventListener('wheel', onWheel, { passive: false });

        console.log('Focus Mode initialized');
    }

    /**
     * Detect protein under mouse cursor using raycasting
     */
    function detectProteinUnderCursor() {
        if (!window.camera || !window.scene) return null;

        // Get mouse position in normalized device coordinates
        FocusMode.raycaster.setFromCamera(FocusMode.mouse, window.camera);

        // Check all protein groups
        const proteinGroups = [];

        // Add all chain groups
        if (window.PDB && window.PDB.GROUP_STRUCTURE_INDEX) {
            for (let i = 0; i < window.PDB.GROUP_STRUCTURE_INDEX.length; i++) {
                const groupIndex = window.PDB.GROUP_STRUCTURE_INDEX[i];
                if (window.PDB.GROUP[groupIndex] && window.PDB.GROUP[groupIndex].children.length > 0) {
                    proteinGroups.push(window.PDB.GROUP[groupIndex]);
                }
            }
        }

        if (proteinGroups.length === 0) return null;

        // Find intersections
        const intersects = FocusMode.raycaster.intersectObjects(proteinGroups, true);

        if (intersects.length > 0) {
            // Find the parent group of the intersected object
            let obj = intersects[0].object;
            while (obj.parent && obj.parent.type === 'Group' && obj.parent !== window.scene) {
                obj = obj.parent;
            }

            // Return the top-level protein group
            return obj;
        }

        return null;
    }

    /**
     * Enter focus mode on selected protein
     */
    function enterFocusMode(protein) {
        if (!protein || FocusMode.active) return;

        FocusMode.active = true;
        FocusMode.focusedProtein = protein;

        // Store original states
        FocusMode.originalCameraPos = window.camera.position.clone();
        FocusMode.originalProteinPos = protein.position.clone();
        FocusMode.originalProteinRot = protein.rotation.clone();
        FocusMode.originalProteinScale = protein.scale.clone();

        // Lock player movement
        if (window.playerControls && window.playerControls.lockMovement) {
            window.playerControls.lockMovement();
        }

        // Add visual highlight
        addHighlight(protein);

        // Show UI indicator
        showFocusModeUI(true);

        console.log('Entered focus mode on protein:', protein.name || protein.userData.group);
    }

    /**
     * Exit focus mode
     */
    function exitFocusMode() {
        if (!FocusMode.active) return;

        FocusMode.active = false;

        // Unlock player movement
        if (window.playerControls && window.playerControls.unlockMovement) {
            window.playerControls.unlockMovement();
        }

        // Remove visual highlight
        removeHighlight();

        // Hide UI indicator
        showFocusModeUI(false);

        FocusMode.focusedProtein = null;

        console.log('Exited focus mode');
    }

    /**
     * Add visual highlight to focused protein
     */
    function addHighlight(protein) {
        removeHighlight(); // Remove any existing highlight

        // Create a bounding box helper
        const box = new THREE.Box3().setFromObject(protein);
        FocusMode.highlightHelper = new THREE.Box3Helper(box, 0x00ffff); // Cyan
        window.scene.add(FocusMode.highlightHelper);
    }

    /**
     * Remove visual highlight
     */
    function removeHighlight() {
        if (FocusMode.highlightHelper) {
            window.scene.remove(FocusMode.highlightHelper);
            FocusMode.highlightHelper = null;
        }
    }

    /**
     * Update highlight position/size (recreates helper)
     */
    function updateHighlight() {
        if (!FocusMode.focusedProtein) return;

        // Remove old highlight
        if (FocusMode.highlightHelper) {
            window.scene.remove(FocusMode.highlightHelper);
        }

        // Create new highlight with updated bounds
        const box = new THREE.Box3().setFromObject(FocusMode.focusedProtein);
        FocusMode.highlightHelper = new THREE.Box3Helper(box, 0x00ffff);
        window.scene.add(FocusMode.highlightHelper);
    }

    /**
     * Show/hide focus mode UI indicator
     */
    function showFocusModeUI(show) {
        let indicator = document.getElementById('focus-mode-indicator');

        if (show) {
            if (!indicator) {
                indicator = document.createElement('div');
                indicator.id = 'focus-mode-indicator';
                indicator.style.position = 'fixed';
                indicator.style.top = '20px';
                indicator.style.left = '50%';
                indicator.style.transform = 'translateX(-50%)';
                indicator.style.padding = '10px 20px';
                indicator.style.backgroundColor = 'rgba(0, 255, 255, 0.8)';
                indicator.style.color = '#000';
                indicator.style.borderRadius = '5px';
                indicator.style.fontFamily = 'Arial, sans-serif';
                indicator.style.fontSize = '14px';
                indicator.style.fontWeight = 'bold';
                indicator.style.zIndex = '10000';
                indicator.innerHTML = 'FOCUS MODE | Drag: Rotate | Scroll: Scale | ESC: Exit';
                document.body.appendChild(indicator);
            }
        } else {
            if (indicator) {
                document.body.removeChild(indicator);
            }
        }
    }

    /**
     * Rotate focused protein
     */
    function rotateProtein(deltaX, deltaY) {
        if (!FocusMode.focusedProtein) return;

        const rotationSpeed = 0.01; // Increased for more responsive feel

        // Invert Y for more intuitive left-right rotation
        FocusMode.focusedProtein.rotation.y -= deltaX * rotationSpeed;
        FocusMode.focusedProtein.rotation.x -= deltaY * rotationSpeed;

        // Update highlight by recreating it
        updateHighlight();
    }

    /**
     * Scale focused protein
     */
    function scaleProtein(delta) {
        if (!FocusMode.focusedProtein) return;

        const currentScale = FocusMode.focusedProtein.scale.x;
        let newScale = currentScale + (delta * FocusMode.scaleStep);

        // Clamp to limits
        newScale = Math.max(FocusMode.minScale, Math.min(FocusMode.maxScale, newScale));

        FocusMode.focusedProtein.scale.set(newScale, newScale, newScale);

        // Update highlight by recreating it
        updateHighlight();
    }

    /**
     * Keyboard event handler
     */
    function onKeyDown(event) {
        // F key - Toggle focus mode
        if (event.key === 'f' || event.key === 'F') {
            if (FocusMode.active) {
                exitFocusMode();
            } else {
                // Try to use crosshair target first (UniversalPointer system)
                let protein = null;

                if (window.UniversalPointer && window.UniversalPointer.getCurrentTarget) {
                    const crosshairTarget = window.UniversalPointer.getCurrentTarget();
                    if (crosshairTarget && crosshairTarget.object) {
                        // Find the parent group of the intersected object
                        let obj = crosshairTarget.object;
                        while (obj.parent && obj.parent.type === 'Group' && obj.parent !== window.scene) {
                            obj = obj.parent;
                        }
                        protein = obj;
                        console.log('[FOCUS-MODE] Using crosshair target:', protein.name || protein.userData.group);
                    }
                }

                // Fallback to mouse-based detection if crosshair didn't find anything
                if (!protein) {
                    protein = detectProteinUnderCursor();
                }

                if (protein) {
                    enterFocusMode(protein);
                } else {
                    console.log('No protein detected under crosshair or cursor');
                }
            }
            event.preventDefault();
        }

        // ESC key - Exit focus mode
        if ((event.key === 'Escape' || event.keyCode === 27) && FocusMode.active) {
            exitFocusMode();
            event.preventDefault();
        }

        // +/- keys - Scale protein
        if (FocusMode.active) {
            if (event.key === '+' || event.key === '=') {
                scaleProtein(1);
                event.preventDefault();
            } else if (event.key === '-' || event.key === '_') {
                scaleProtein(-1);
                event.preventDefault();
            }
        }
    }

    /**
     * Mouse down handler
     */
    function onMouseDown(event) {
        if (!FocusMode.active) return;

        FocusMode.mouseDown = true;
        FocusMode.lastMouseX = event.clientX;
        FocusMode.lastMouseY = event.clientY;

        event.preventDefault();
    }

    /**
     * Mouse move handler
     */
    function onMouseMove(event) {
        // Update mouse position for raycasting
        FocusMode.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        FocusMode.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

        // Rotate protein if in focus mode and mouse is down
        if (FocusMode.active && FocusMode.mouseDown) {
            const deltaX = event.clientX - FocusMode.lastMouseX;
            const deltaY = event.clientY - FocusMode.lastMouseY;

            rotateProtein(deltaX, deltaY);

            FocusMode.lastMouseX = event.clientX;
            FocusMode.lastMouseY = event.clientY;

            event.preventDefault();
        }
    }

    /**
     * Mouse up handler
     */
    function onMouseUp(event) {
        FocusMode.mouseDown = false;
    }

    /**
     * Mouse wheel handler for scaling
     */
    function onWheel(event) {
        if (!FocusMode.active) return;

        const delta = event.deltaY > 0 ? -1 : 1;
        scaleProtein(delta);

        event.preventDefault();
    }

    // Initialize when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }

    // Export to window for external access
    window.FocusMode = {
        isActive: function () { return FocusMode.active; },
        enter: enterFocusMode,
        exit: exitFocusMode,
        detect: detectProteinUnderCursor
    };

})();
