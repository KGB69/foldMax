/**
 * Load FBX environment model and add to scene
 * The protein will be positioned at the center of the environment
 */
var environmentModel = null; // Global reference to the environment model

function loadEnvironmentModel() {
    console.log('[ENV] loadEnvironmentModel function called');

    if (typeof THREE === 'undefined') {
        console.error('[ENV] THREE is not defined!');
        return;
    }

    console.log('[ENV] THREE.js version:', THREE.REVISION);

    if (typeof THREE.FBXLoader === 'undefined') {
        console.error('[ENV] FBXLoader not available');
        return;
    }

    if (typeof scene === 'undefined') {
        console.error('[ENV] Scene is not defined yet!');
        return;
    }

    console.log('[ENV] Creating FBXLoader instance...');
    const fbxLoader = new THREE.FBXLoader();

    // Add cache-busting parameter to ensure updated model is loaded
    const cacheBuster = '?t=' + new Date().getTime();
    const fbxUrl = 'env3.0.fbx' + cacheBuster;

    console.log('[ENV] Loading env3.0.fbx with cache buster...');
    fbxLoader.load(fbxUrl, function (object) {
        console.log('[ENV] FBX model loaded successfully!', object);

        // Store reference globally
        environmentModel = object;
        window.environmentModel = object;

        // Start with smaller scale since the model is too big
        object.scale.set(0.1, 0.1, 0.1);

        // Position: Y always at -49.5, X and Z at 0
        object.position.set(0, -49.5, 0);

        // Add the environment to the scene
        scene.add(object);

        console.log('[ENV] Environment model added to scene successfully');

        // Add enhanced lighting for better visual quality
        addEnhancedLighting();

        // Add daytime environment (Fog & Skybox)
        addDaytimeEnvironment();

        // List all meshes in the model for debugging
        listAllMeshes(object);

        // Apply procedural materials to all meshes
        applyTextureToMesh(object, 'Cylinder.003');

        // Initialize controls after model is loaded
        initializeEnvironmentControls();
    }, function (xhr) {
        const percentComplete = (xhr.loaded / xhr.total * 100);
        console.log('[ENV] Loading progress: ' + percentComplete.toFixed(2) + '%');
    }, function (error) {
        console.error('[ENV] Error loading environment model:', error);
    });
}

function addEnhancedLighting() {
    console.log('[ENV] Adding enhanced lighting...');

    // 1. Ambient Light - Deep blue-grey for sci-fi atmosphere
    const ambientLight = new THREE.AmbientLight(0x202030, 0.6);
    scene.add(ambientLight);

    // 2. Main Directional Light - Crisp white sunlight, reduced intensity to prevent blowout
    const mainLight = new THREE.DirectionalLight(0xffffff, 0.8);
    mainLight.position.set(10, 20, 10);
    mainLight.castShadow = true;
    mainLight.shadow.camera.near = 0.1;
    mainLight.shadow.camera.far = 500;
    mainLight.shadow.camera.left = -50;
    mainLight.shadow.camera.right = 50;
    mainLight.shadow.camera.top = 50;
    mainLight.shadow.camera.bottom = -50;
    mainLight.shadow.mapSize.width = 2048;
    mainLight.shadow.mapSize.height = 2048;
    mainLight.shadow.bias = -0.0001;
    scene.add(mainLight);

    // 3. Fill Light - Soft cool blue to fill shadows
    const fillLight = new THREE.DirectionalLight(0x4455ff, 0.4);
    fillLight.position.set(-10, 5, -10);
    scene.add(fillLight);

    // 4. Rim/Back Light - Strong cyan rim for definition
    const rimLight = new THREE.DirectionalLight(0x00ffff, 0.6);
    rimLight.position.set(0, 5, -20);
    scene.add(rimLight);

    // 5. Center Glow - Warm orange glow from the center/top
    const centerLight = new THREE.PointLight(0xffaa00, 0.8, 50);
    centerLight.position.set(0, 55, 0); // Just above the dome
    scene.add(centerLight);

    // 6. Hemisphere Light - Ground reflection
    const hemiLight = new THREE.HemisphereLight(0xddeeff, 0x202020, 0.3);
    hemiLight.position.set(0, 50, 0);
    scene.add(hemiLight);

    // Enable shadows on renderer if available
    if (typeof renderer !== 'undefined' && renderer.shadowMap) {
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        console.log('[ENV] Shadow mapping enabled');
    }

    // Set tone mapping for better color reproduction
    if (typeof renderer !== 'undefined') {
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.0; // Reduced exposure
        console.log('[ENV] Tone mapping configured');
    }

    console.log('[ENV] Enhanced lighting added successfully');
}

function addDaytimeEnvironment() {
    console.log('[ENV] Adding daytime environment (Fog & Skybox)...');

    // 1. Add Fog
    // White fog to blend the floor with the background
    // Adjust near/far values based on the scene scale
    scene.fog = new THREE.Fog(0xffffff, 50, 300);
    scene.background = new THREE.Color(0xffffff); // Fallback background color

    // 2. Add Skybox (Gradient)
    const vertexShader = `
        varying vec3 vWorldPosition;
        void main() {
            vec4 worldPosition = modelMatrix * vec4( position, 1.0 );
            vWorldPosition = worldPosition.xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4( position, 1.0 );
        }
    `;

    const fragmentShader = `
        uniform vec3 topColor;
        uniform vec3 bottomColor;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        void main() {
            float h = normalize( vWorldPosition + offset ).y;
            gl_FragColor = vec4( mix( bottomColor, topColor, max( pow( max( h , 0.0), exponent ), 0.0 ) ), 1.0 );
        }
    `;

    const uniforms = {
        topColor: { value: new THREE.Color(0x0077ff) }, // Sky blue
        bottomColor: { value: new THREE.Color(0xffffff) }, // White horizon
        offset: { value: 33 },
        exponent: { value: 0.6 }
    };

    // Create a large sphere for the skybox
    const skyGeo = new THREE.SphereGeometry(1000, 32, 15);
    const skyMat = new THREE.ShaderMaterial({
        uniforms: uniforms,
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        side: THREE.BackSide
    });

    const sky = new THREE.Mesh(skyGeo, skyMat);
    scene.add(sky);

    console.log('[ENV] Daytime environment added');
}

function listAllMeshes(object) {
    console.log('[ENV] Listing all meshes in the model:');
    const meshes = [];
    object.traverse(function (child) {
        if (child.isMesh) {
            meshes.push({
                name: child.name,
                type: child.type,
                geometry: child.geometry ? child.geometry.type : 'none',
                material: child.material ? child.material.type : 'none'
            });
            console.log('[ENV] - Mesh:', child.name, '| Type:', child.type, '| Material:', child.material ? child.material.type : 'none');
        }
    });
    console.log('[ENV] Total meshes found:', meshes.length);
    return meshes;
}

function applyTextureToMesh(object, meshName) {
    console.log('[ENV] Applying procedural materials to all meshes...');

    let texturedMeshes = 0;

    // Traverse the object hierarchy
    object.traverse(function (child) {
        if (child.isMesh) {
            const name = child.name;
            console.log('[ENV] Processing mesh:', name);

            // Apply different materials based on mesh name
            if (name.includes('Cylinder')) {
                applyProceduralCylinderMaterial(child, name);
                texturedMeshes++;
            } else if (name === 'Plane') {
                applyProceduralPlaneMaterial(child);
                texturedMeshes++;
            } else {
                // Catch-all for other meshes (like the interior if it's not named Cylinder)
                // Apply dark structure material to fix "white interior" without z-fighting
                console.log('[ENV] Applying default dark material to unidentified mesh:', name);
                child.material = createCeramicMaterial(0x222222);
                child.castShadow = true;
                child.receiveShadow = true;
                texturedMeshes++;
            }
        }
    });

    console.log('[ENV] Applied procedural materials to', texturedMeshes, 'mesh(es)');
}

function applyProceduralCylinderMaterial(mesh, meshName) {
    let material;

    if (meshName === 'Cylinder003') {
        // Sci-Fi Panel (Blue/Grey)
        material = createSciFiPanelMaterial(0x446688);
    } else if (meshName === 'Cylinder001') {
        // Rich Gold Cap
        material = createMetallicMaterial(0xFFD700, 0.95, 0.1);
    } else if (meshName === 'Cylinder004') {
        // Dark Sci-Fi Structure
        material = createCeramicMaterial(0x222222);
    } else if (meshName === 'Cylinder005') {
        // Dark Tech Hexagon
        material = createHexagonMaterial();
    } else if (meshName === 'Cylinder006') {
        // Warning Orange Panel
        material = createSciFiPanelMaterial(0xff6600);
    } else {
        // Default: Brushed Steel
        material = createBrushedMetalMaterial();
    }

    // Re-enable DoubleSide to ensure interior is visible (fixes "white" issue)
    material.side = THREE.DoubleSide;

    // Enable Polygon Offset to prevent z-fighting ("dazzling" effect)
    // This tells the GPU to slightly offset the depth calculation
    material.polygonOffset = true;
    material.polygonOffsetFactor = 1;
    material.polygonOffsetUnits = 1;

    mesh.material = material;
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    console.log('[ENV] Applied', material.name || 'procedural', 'material to', meshName);
}

function createCeramicMaterial(color) {
    return new THREE.MeshStandardMaterial({
        color: color,
        metalness: 0.4,
        roughness: 0.2,
        envMapIntensity: 1.0,
        side: THREE.DoubleSide, // Ensure visibility
        name: 'Ceramic/Structure'
    });
}

function createSciFiPanelMaterial(color) {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Base color
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Panel lines
    ctx.strokeStyle = '#aaaaaa';
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, 492, 492);

    // Tech details
    ctx.fillStyle = '#cccccc';
    ctx.fillRect(20, 20, 100, 20);
    ctx.fillRect(392, 472, 100, 20);

    const texture = new THREE.CanvasTexture(canvas);
    // Enable anisotropic filtering
    if (typeof renderer !== 'undefined') {
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    }

    return new THREE.MeshStandardMaterial({
        color: color,
        map: texture,
        metalness: 0.6,
        roughness: 0.4,
        name: 'Sci-Fi Panel'
    });
}

function createHexagonMaterial() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Dark background
    ctx.fillStyle = '#111111';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Hexagon pattern
    ctx.strokeStyle = '#333333';
    ctx.lineWidth = 2;

    const r = 32;
    const w = r * 2;
    const h = Math.sqrt(3) * r;

    for (let y = -h; y < canvas.height + h; y += h) {
        for (let x = -w; x < canvas.width + w; x += w * 1.5) {
            const yOffset = (Math.floor(x / (w * 1.5)) % 2) * (h / 2);
            drawHexagon(ctx, x, y + yOffset, r);
        }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    // Enable anisotropic filtering
    if (typeof renderer !== 'undefined') {
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    }

    return new THREE.MeshStandardMaterial({
        map: texture,
        metalness: 0.8,
        roughness: 0.3,
        name: 'Tech Hexagon'
    });
}

function drawHexagon(ctx, x, y, r) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
        const angle = 2 * Math.PI / 6 * i;
        const x_i = x + r * Math.cos(angle);
        const y_i = y + r * Math.sin(angle);
        if (i === 0) ctx.moveTo(x_i, y_i);
        else ctx.lineTo(x_i, y_i);
    }
    ctx.closePath();
    ctx.stroke();
}

function createMetallicMaterial(color, metalness, roughness) {
    return new THREE.MeshStandardMaterial({
        color: color,
        metalness: metalness,
        roughness: roughness,
        envMapIntensity: 1.5,
        name: 'Metallic'
    });
}

function createBrushedMetalMaterial() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Base color
    ctx.fillStyle = '#888888';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Brushed lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    for (let i = 0; i < canvas.height; i += 2) {
        ctx.beginPath();
        ctx.moveTo(0, i);
        ctx.lineTo(canvas.width, i);
        ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(2, 2);
    // Enable anisotropic filtering
    if (typeof renderer !== 'undefined') {
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    }

    return new THREE.MeshStandardMaterial({
        map: texture,
        metalness: 0.8,
        roughness: 0.3,
        name: 'Brushed Metal'
    });
}

function createCarbonFiberMaterial() {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const ctx = canvas.getContext('2d');

    // Carbon fiber weave pattern
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const weaveSize = 32;
    for (let x = 0; x < canvas.width; x += weaveSize) {
        for (let y = 0; y < canvas.height; y += weaveSize) {
            // Horizontal weave
            ctx.fillStyle = '#2a2a2a';
            ctx.fillRect(x, y, weaveSize, weaveSize / 2);

            // Vertical weave
            ctx.fillStyle = '#252525';
            ctx.fillRect(x, y + weaveSize / 2, weaveSize / 2, weaveSize / 2);
        }
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(8, 8);
    // Enable anisotropic filtering
    if (typeof renderer !== 'undefined') {
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    }

    return new THREE.MeshStandardMaterial({
        map: texture,
        metalness: 0.5,
        roughness: 0.4,
        name: 'Carbon Fiber'
    });
}

function applyProceduralPlaneMaterial(mesh) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 1024;
    const ctx = canvas.getContext('2d');

    // Dark floor
    ctx.fillStyle = '#050510';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Glowing Grid
    ctx.strokeStyle = '#0044aa';
    ctx.lineWidth = 4;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#0088ff';

    const gridSize = 128;
    for (let x = 0; x <= canvas.width; x += gridSize) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, canvas.height);
        ctx.stroke();
    }
    for (let y = 0; y <= canvas.height; y += gridSize) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(canvas.width, y);
        ctx.stroke();
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(20, 20);
    // Enable anisotropic filtering
    if (typeof renderer !== 'undefined') {
        texture.anisotropy = renderer.capabilities.getMaxAnisotropy();
    }

    const material = new THREE.MeshStandardMaterial({
        map: texture,
        metalness: 0.5,
        roughness: 0.2,
        emissive: 0x001133,
        emissiveIntensity: 0.2,
        name: 'Sci-Fi Floor'
    });

    mesh.material = material;
    mesh.receiveShadow = true;

    console.log('[ENV] Applied Sci-Fi floor material to Plane');
}

function initializeEnvironmentControls() {
    console.log('[ENV] Initializing environment controls...');

    // Get all slider elements
    const scaleX = document.getElementById('scaleX');
    const scaleY = document.getElementById('scaleY');
    const scaleZ = document.getElementById('scaleZ');
    const posX = document.getElementById('posX');
    const posY = document.getElementById('posY');
    const posZ = document.getElementById('posZ');

    // Set initial values to match the model
    if (scaleX) scaleX.value = 0.1;
    if (scaleY) scaleY.value = 0.1;
    if (scaleZ) scaleZ.value = 0.1;
    if (posY) posY.value = -49.5;

    // Update display values
    updateSliderDisplays();

    // Add event listeners for scale sliders
    if (scaleX) scaleX.addEventListener('input', function () {
        if (environmentModel) {
            environmentModel.scale.x = parseFloat(this.value);
            document.getElementById('scaleXValue').textContent = parseFloat(this.value).toFixed(2);
        }
    });

    if (scaleY) scaleY.addEventListener('input', function () {
        if (environmentModel) {
            environmentModel.scale.y = parseFloat(this.value);
            document.getElementById('scaleYValue').textContent = parseFloat(this.value).toFixed(2);
        }
    });

    if (scaleZ) scaleZ.addEventListener('input', function () {
        if (environmentModel) {
            environmentModel.scale.z = parseFloat(this.value);
            document.getElementById('scaleZValue').textContent = parseFloat(this.value).toFixed(2);
        }
    });

    // Add event listeners for position sliders
    if (posX) posX.addEventListener('input', function () {
        if (environmentModel) {
            environmentModel.position.x = parseFloat(this.value);
            document.getElementById('posXValue').textContent = parseFloat(this.value).toFixed(2);
        }
    });

    if (posY) posY.addEventListener('input', function () {
        if (environmentModel) {
            environmentModel.position.y = parseFloat(this.value);
            document.getElementById('posYValue').textContent = parseFloat(this.value).toFixed(2);
        }
    });

    if (posZ) posZ.addEventListener('input', function () {
        if (environmentModel) {
            environmentModel.position.z = parseFloat(this.value);
            document.getElementById('posZValue').textContent = parseFloat(this.value).toFixed(2);
        }
    });

    // Reset button
    const resetBtn = document.getElementById('resetEnv');
    if (resetBtn) {
        resetBtn.addEventListener('click', function () {
            if (environmentModel) {
                environmentModel.scale.set(0.1, 0.1, 0.1);
                environmentModel.position.set(0, -49.5, 0);

                scaleX.value = 0.1;
                scaleY.value = 0.1;
                scaleZ.value = 0.1;
                posX.value = 0;
                posY.value = -49.5;
                posZ.value = 0;

                updateSliderDisplays();
                console.log('[ENV] Reset to default values');
            }
        });
    }

    // Toggle controls visibility
    const toggleBtn = document.getElementById('toggleEnvControls');
    const showBtn = document.getElementById('showEnvControls');
    const controlsPanel = document.getElementById('envControls');

    if (toggleBtn && controlsPanel && showBtn) {
        toggleBtn.addEventListener('click', function () {
            controlsPanel.style.display = 'none';
            showBtn.style.display = 'block';
        });

        showBtn.addEventListener('click', function () {
            controlsPanel.style.display = 'block';
            showBtn.style.display = 'none';
        });

        // Show controls panel by default when model loads
        controlsPanel.style.display = 'block';
        showBtn.style.display = 'none';
    }

    console.log('[ENV] Environment controls initialized');
}

function updateSliderDisplays() {
    const scaleX = document.getElementById('scaleX');
    const scaleY = document.getElementById('scaleY');
    const scaleZ = document.getElementById('scaleZ');
    const posX = document.getElementById('posX');
    const posY = document.getElementById('posY');
    const posZ = document.getElementById('posZ');

    if (scaleX) document.getElementById('scaleXValue').textContent = parseFloat(scaleX.value).toFixed(2);
    if (scaleY) document.getElementById('scaleYValue').textContent = parseFloat(scaleY.value).toFixed(2);
    if (scaleZ) document.getElementById('scaleZValue').textContent = parseFloat(scaleZ.value).toFixed(2);
    if (posX) document.getElementById('posXValue').textContent = parseFloat(posX.value).toFixed(2);
    if (posY) document.getElementById('posYValue').textContent = parseFloat(posY.value).toFixed(2);
    if (posZ) document.getElementById('posZValue').textContent = parseFloat(posZ.value).toFixed(2);
}

// Export the function to global scope
window.loadEnvironmentModel = loadEnvironmentModel;
console.log('[ENV] loadEnvironmentModel function exposed to global scope');

// Also export to PDB.render if available
if (typeof PDB !== 'undefined' && PDB.render) {
    PDB.render.loadEnvironment = loadEnvironmentModel;
    console.log('[ENV] loadEnvironment function attached to PDB.render');
}

// Automatically call the function after a delay to ensure scene is initialized
console.log('[ENV] Setting up automatic execution in 2 seconds...');
setTimeout(function () {
    console.log('[ENV] Attempting to load environment model automatically...');
    loadEnvironmentModel();
}, 2000);
