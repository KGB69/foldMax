/**
 * CSS3D UI Manager for VR
 * Creates and manages floating 3D HTML panels in VR space
 */

var CSS3DUI = {
    renderer: null,
    scene: null,
    panels: {},
    interactionObjects: [], // Meshes for raycasting
    interactionGroup: null,

    /**
     * Initialize CSS3D rendering system
     */
    init: function () {
        console.log('[CSS3D-UI] Initializing...');

        // Create CSS3D renderer
        this.renderer = new THREE.CSS3DRenderer();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.domElement.style.position = 'absolute';
        this.renderer.domElement.style.top = '0';
        this.renderer.domElement.style.pointerEvents = 'none';

        // Append after WebGL renderer
        document.body.appendChild(this.renderer.domElement);

        // Create CSS3D scene
        this.scene = new THREE.Scene();

        // Create a group in the main WebGL scene to hold interaction planes
        this.interactionGroup = new THREE.Group();
        if (typeof scene !== 'undefined') {
            scene.add(this.interactionGroup);
        }

        console.log('[CSS3D-UI] Initialized');
    },

    /**
     * Create a floating menu panel
     */
    createMenuPanel: function () {
        var width = 600;
        var height = 500; // Approximate height

        var panelDiv = document.createElement('div');
        panelDiv.className = 'css3d-panel css3d-menu-panel';
        panelDiv.style.width = width + 'px';

        panelDiv.innerHTML = `
            <div class="css3d-panel-header">
                <h2>VR Menu</h2>
                <button class="css3d-close-btn" onclick="CSS3DUI.hidePanel('menu')">×</button>
            </div>
            <div class="css3d-panel-content">
                <button class="css3d-btn" onclick="ImmersiveMenuExt.showFileDialog()">
                    📁 Load File
                </button>
                <button class="css3d-btn" onclick="PDB.render.changeToThreeMode(PDB.MODE_THREE, false)">
                    🖥️ Exit VR
                </button>
                <hr class="css3d-divider">
                <div class="css3d-section">
                    <h3>Visualization</h3>
                    <button class="css3d-btn-small" onclick="PDB.render.changeStructure(PDB.SPHERE)">Sphere</button>
                    <button class="css3d-btn-small" onclick="PDB.render.changeStructure(PDB.STICK)">Stick</button>
                    <button class="css3d-btn-small" onclick="PDB.render.changeStructure(PDB.BALL_ROD)">Ball & Rod</button>
                </div>
                <hr class="css3d-divider">
                <div class="css3d-section">
                    <h3>Environment</h3>
                    <button class="css3d-btn-small" onclick="window.toggleBioFloor()">Toggle Bio-Floor</button>
                </div>
            </div>
        `;

        var object = new THREE.CSS3DObject(panelDiv);

        // Scale down: 1px = 0.01 units
        // 600px -> 6 units wide
        var scale = 0.01;
        object.scale.set(scale, scale, scale);

        object.visible = false;
        this.scene.add(object);
        this.panels.menu = object;

        // Create interaction plane (invisible mesh)
        // Size matches scaled panel: 600 * 0.01 = 6
        var geometry = new THREE.PlaneGeometry(width * scale, height * scale);
        var material = new THREE.MeshBasicMaterial({
            color: 0x000000,
            opacity: 0.0,
            transparent: true,
            side: THREE.DoubleSide
        });
        var plane = new THREE.Mesh(geometry, material);
        plane.visible = false; // Initially hidden
        plane.userData = {
            isCSS3DInteraction: true,
            panel: object,
            element: panelDiv,
            width: width,
            height: height
        };

        this.interactionGroup.add(plane);
        this.interactionObjects.push(plane);

        // Link plane to object so they move together
        object.userData.interactionPlane = plane;

        console.log('[CSS3D-UI] Menu panel created');
        return object;
    },

    /**
     * Position panel in front of camera
     */
    positionPanelInFrontOfCamera: function (panel, distance, camera) {
        if (!panel || !camera) return;

        distance = distance || 2.0;  // 2 meters in front

        // Get camera direction
        var cameraDirection = new THREE.Vector3();
        camera.getWorldDirection(cameraDirection);

        // Position panel in front of camera
        var position = new THREE.Vector3();
        position.copy(camera.position);
        position.add(cameraDirection.multiplyScalar(distance));

        panel.position.copy(position);
        panel.lookAt(camera.position);  // Face camera

        // Sync interaction plane
        if (panel.userData.interactionPlane) {
            panel.userData.interactionPlane.position.copy(panel.position);
            panel.userData.interactionPlane.quaternion.copy(panel.quaternion);
        }
    },

    /**
     * Show a panel
     */
    showPanel: function (panelName) {
        var panel = this.panels[panelName];
        if (!panel) {
            console.warn('[CSS3D-UI] Panel not found:', panelName);
            return;
        }

        panel.visible = true;
        if (panel.userData.interactionPlane) {
            panel.userData.interactionPlane.visible = true;
        }

        // Position in front of camera
        if (typeof camera !== 'undefined') {
            this.positionPanelInFrontOfCamera(panel, 2.0, camera);
        }

        console.log('[CSS3D-UI] Panel shown:', panelName);
    },

    /**
     * Hide a panel
     */
    hidePanel: function (panelName) {
        var panel = this.panels[panelName];
        if (!panel) return;

        panel.visible = false;
        if (panel.userData.interactionPlane) {
            panel.userData.interactionPlane.visible = false;
        }
        console.log('[CSS3D-UI] Panel hidden:', panelName);
    },

    /**
     * Toggle a panel
     */
    togglePanel: function (panelName) {
        var panel = this.panels[panelName];
        if (!panel) return;

        if (panel.visible) {
            this.hidePanel(panelName);
        } else {
            this.showPanel(panelName);
        }
    },

    /**
     * Handle click on a panel at UV coordinates
     */
    handleClick: function (panel, uv) {
        if (!panel || !uv || !panel.element) return;

        var element = panel.element;

        // Calculate coordinates in panel space
        var x = uv.x * element.offsetWidth;
        var y = (1 - uv.y) * element.offsetHeight;

        // Find target element
        var target = this.elementFromPointRelative(element, x, y);

        if (target) {
            console.log('[CSS3D-UI] Clicking:', target);
            target.click();
            if (target.tagName === 'INPUT') {
                target.focus();
            }
        }
    },

    /**
     * Find element at (x, y) relative to root
     */
    elementFromPointRelative: function (root, x, y) {
        var candidates = [];

        function traverse(node) {
            if (node.nodeType !== 1) return; // Element nodes only

            // Calculate node's bounds relative to root
            var el = node;
            var elX = 0;
            var elY = 0;
            var current = el;

            // Climb up to root to get cumulative offset
            while (current && current !== root) {
                elX += current.offsetLeft;
                elY += current.offsetTop;
                current = current.offsetParent;
            }

            // If we reached root (or node is child of root)
            if (current === root) {
                if (x >= elX && x <= elX + node.offsetWidth &&
                    y >= elY && y <= elY + node.offsetHeight) {
                    candidates.push(node);
                }
            }

            for (var i = 0; i < node.children.length; i++) {
                traverse(node.children[i]);
            }
        }

        traverse(root);

        // Return the last one (deepest/on top)
        return candidates.length > 0 ? candidates[candidates.length - 1] : root;
    },

    /**
     * Update CSS3D renderer (call in animation loop)
     */
    render: function (camera) {
        if (this.renderer && this.scene && camera) {
            this.renderer.render(this.scene, camera);
        }
    },

    /**
     * Handle window resize
     */
    onWindowResize: function () {
        if (this.renderer) {
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        }
    }
};

// Initialize when ready
window.CSS3DUI = CSS3DUI;
