/**
 * Procedural Environment Loader
 * Ported from envTest (React/Three-fiber) to Vanilla Three.js
 */

var environmentUniforms = {
    uTime: { value: 0 },
    uRingSpacing: { value: 21.0 },
    uPulseSpeed: { value: 0.3 },
    uPulseIntensity: { value: 0.3 },
    uBreatheSpeed: { value: 0.3 },
    uScannerSpeed: { value: 0.0 },
    uTimeOfDay: { value: 0.35 }, // 0.0 = night, 0.25-0.5 = twilight, 1.0 = day
    uPlayerPos: { value: new THREE.Vector2(0, 0) }
};

// Export globally so UI can access
window.environmentUniforms = environmentUniforms;

var clock = new THREE.Clock();

function loadEnvironmentModel() {
    console.log('[ENV] Initializing Procedural Environment...');

    if (typeof THREE === 'undefined') {
        console.error('[ENV] THREE is not defined!');
        return;
    }

    addProceduralGround();
    addLighting();
    addFog();
    addStars();

    // Initialize bio-floor interface (hidden by default)
    if (typeof window.BioFloorInterface !== 'undefined') {
        window.bioFloorInstance = new window.BioFloorInterface();
        console.log('[ENV] Bio-Floor Interface initialized');
    }

    console.log('[ENV] Procedural Environment initialized.');
}

function addProceduralGround() {
    var groundRadius = 250;
    window.GROUND_RADIUS = groundRadius;

    var baseGeometry = new THREE.CircleGeometry(groundRadius, 64);
    var baseMaterial = new THREE.MeshStandardMaterial({
        color: 0x101010,
        roughness: 0.6,
        metalness: 0.4,
        envMapIntensity: 0.3
    });
    var baseMesh = new THREE.Mesh(baseGeometry, baseMaterial);
    baseMesh.rotation.x = -Math.PI / 2;
    baseMesh.position.y = -50;
    baseMesh.receiveShadow = true;
    scene.add(baseMesh);

    var gridGeometry = new THREE.CircleGeometry(groundRadius, 128);

    var vertexShader = `
        varying vec2 vUv;
        varying vec3 vWorldPos;
        void main() {
            vUv = uv;
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vWorldPos = worldPosition.xyz;
            gl_Position = projectionMatrix * viewMatrix * worldPosition;
        }
    `;

    var fragmentShader = `
        uniform float uTime;
        uniform float uRingSpacing;
        uniform float uPulseSpeed;
        uniform float uPulseIntensity;
        uniform float uBreatheSpeed;
        uniform float uScannerSpeed;
        uniform float uTimeOfDay;
        
        varying vec2 vUv;
        varying vec3 vWorldPos;
        
        void main() {
            float dist = length(vWorldPos.xz);
            float angle = atan(vWorldPos.z, vWorldPos.x);
            
            float rings = fract(dist / uRingSpacing);
            float ringLine = smoothstep(0.45, 0.5, rings) - smoothstep(0.5, 0.55, rings);
            
            float segments = 32.0;
            float radialPattern = fract(angle * segments / (2.0 * 3.14159));
            float radialLine = smoothstep(0.48, 0.5, radialPattern) - smoothstep(0.5, 0.52, radialPattern);
            
            float pulseWave = sin(dist * 0.3 - uTime * uPulseSpeed) * 0.5 + 0.5;
            pulseWave = pow(pulseWave, 2.0);
            pulseWave *= smoothstep(250.0, 50.0, dist);
            
            float breathe = sin(uTime * uBreatheSpeed) * 0.5 + 0.5;
            
            float scanAngle = mod(angle + uTime * uScannerSpeed, 6.28318);
            float scanWave = smoothstep(0.0, 0.1, scanAngle) * smoothstep(0.3, 0.1, scanAngle);
            
            // TIME-OF-DAY COLOR SYSTEM
            vec3 baseColor = vec3(0.02, 0.02, 0.05);
            vec3 ringColor = vec3(0.1, 0.3, 0.6);
            
            // Dynamic pulse color based on time of day
            vec3 dayPulseColor = vec3(1.0, 0.7, 0.3);    // Warm orange (sunlight)
            vec3 duskPulseColor = vec3(1.0, 0.3, 0.4);   // Pink/magenta (sunset)
            vec3 nightPulseColor = vec3(0.3, 0.5, 1.0);  // Cool blue (moonlight)
            
            vec3 pulseColor;
            if (uTimeOfDay > 0.7) {
                // Day
                pulseColor = dayPulseColor;
            } else if (uTimeOfDay > 0.3) {
                // Dusk/Dawn transition
                float duskFactor = (uTimeOfDay - 0.3) / 0.4;
                pulseColor = mix(duskPulseColor, dayPulseColor, duskFactor);
            } else {
                // Night
                pulseColor = nightPulseColor;
            }
            
            vec3 scanColor = vec3(0.3, 0.6, 1.0);
            
            vec3 finalColor = baseColor;
            finalColor += ringColor * ringLine * 0.8;
            finalColor += ringColor * radialLine * 0.3;
            finalColor += pulseColor * pulseWave * uPulseIntensity; // Dynamic color!
            finalColor += scanColor * scanWave * 0.5;
            finalColor += ringColor * breathe * 0.1;
            
            float edgeDist = 250.0 - dist;
            float edgeGlow = smoothstep(0.0, 20.0, edgeDist);
            float boundaryWarning = smoothstep(30.0, 10.0, edgeDist);
            
            // Dynamic boundary warning color (same as pulse)
            finalColor += pulseColor * boundaryWarning * 0.5;
            
            float alpha = smoothstep(250.0, 240.0, dist);
            alpha *= edgeGlow;
            
            vec3 fogColor = vec3(0.15, 0.02, 0.05);
            float fogAmount = 1.0 - smoothstep(200.0, 250.0, dist);
            finalColor = mix(fogColor, finalColor, fogAmount);
            
            gl_FragColor = vec4(finalColor, alpha * 0.9);
        }
    `;

    var gridMaterial = new THREE.ShaderMaterial({
        uniforms: environmentUniforms,
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        transparent: true,
        side: THREE.DoubleSide
    });

    var gridMesh = new THREE.Mesh(gridGeometry, gridMaterial);
    gridMesh.rotation.x = -Math.PI / 2;
    gridMesh.position.y = -49.9;
    scene.add(gridMesh);

    var ringGeometry = new THREE.RingGeometry(groundRadius - 5, groundRadius, 64);
    var ringMaterial = new THREE.MeshBasicMaterial({
        color: 0xff0000,
        opacity: 0.5,
        transparent: true,
        side: THREE.DoubleSide
    });
    var ringMesh = new THREE.Mesh(ringGeometry, ringMaterial);
    ringMesh.rotation.x = -Math.PI / 2;
    ringMesh.position.y = -49.8;
    scene.add(ringMesh);
}

function addLighting() {
    window.ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
    scene.add(window.ambientLight);

    window.sunLight = new THREE.DirectionalLight(0xfff5e6, 1.2);
    window.sunLight.position.set(50, 100, 50);
    window.sunLight.castShadow = true;
    scene.add(window.sunLight);

    window.skyLight = new THREE.HemisphereLight(0xaaccff, 0x666666, 0.5);
    scene.add(window.skyLight);
}

function addFog() {
    window.sceneFog = new THREE.Fog(0xccddff, 100, 500);
    scene.fog = window.sceneFog;

    var vertexShader = `
        varying vec3 vWorldPosition;
        void main() {
            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
            vWorldPosition = worldPosition.xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `;

    var fragmentShader = `
        uniform vec3 dayTopColor;
        uniform vec3 dayBottomColor;
        uniform vec3 nightTopColor;
        uniform vec3 nightBottomColor;
        uniform vec3 dayHorizonGlow;
        uniform vec3 duskHorizonGlow;
        uniform vec3 nightHorizonGlow;
        uniform float timeOfDay;
        uniform float offset;
        uniform float exponent;
        varying vec3 vWorldPosition;
        
        void main() {
            float h = normalize(vWorldPosition + offset).y;
            
            // Base sky colors
            vec3 topColor = mix(nightTopColor, dayTopColor, timeOfDay);
            vec3 bottomColor = mix(nightBottomColor, dayBottomColor, timeOfDay);
            vec3 skyColor = mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0));
            
            // HORIZON GLOW EFFECT
            // Calculate how close we are to horizon (h near 0)
            float horizonFactor = 1.0 - abs(h);
            horizonFactor = pow(horizonFactor, 3.0); // Sharpen the glow
            
            // Choose glow color based on time of day
            vec3 glowColor;
            if (timeOfDay > 0.7) {
                // Day: Warm white/yellow glow
                glowColor = dayHorizonGlow;
            } else if (timeOfDay > 0.3) {
                // Dusk/Dawn: Orange/pink transition
                float duskFactor = (timeOfDay - 0.3) / 0.4;
                glowColor = mix(duskHorizonGlow, dayHorizonGlow, duskFactor);
            } else {
                // Night: Purple/blue glow
                glowColor = nightHorizonGlow;
            }
            
            // Apply horizon glow
            float glowIntensity = horizonFactor * 0.6;
            skyColor = mix(skyColor, glowColor, glowIntensity);
            
            // Add subtle atmospheric banding for depth
            float bands = sin(h * 15.0) * 0.02;
            skyColor += bands * timeOfDay * 0.3;
            
            gl_FragColor = vec4(skyColor, 1.0);
        }
    `;

    var skyGeo = new THREE.SphereGeometry(4000, 32, 15);
    window.skyMaterial = new THREE.ShaderMaterial({
        uniforms: {
            dayTopColor: { value: new THREE.Color(0x0077ff) },
            dayBottomColor: { value: new THREE.Color(0xaaccff) },
            nightTopColor: { value: new THREE.Color(0x000033) },
            nightBottomColor: { value: new THREE.Color(0x001144) },
            dayHorizonGlow: { value: new THREE.Color(0xffffee) }, // Warm white
            duskHorizonGlow: { value: new THREE.Color(0xff6644) }, // Orange/pink
            nightHorizonGlow: { value: new THREE.Color(0x4433ff) }, // Purple/blue
            timeOfDay: environmentUniforms.uTimeOfDay,
            offset: { value: 33 },
            exponent: { value: 0.6 }
        },
        vertexShader: vertexShader,
        fragmentShader: fragmentShader,
        side: THREE.BackSide
    });

    var sky = new THREE.Mesh(skyGeo, window.skyMaterial);
    scene.add(sky);
}

function addStars() {
    // No stars in daytime - function kept for compatibility
}

function updateEnvironment() {
    var delta = clock.getDelta();
    environmentUniforms.uTime.value += delta;
}

// Bio-Floor Interface Integration
var bioFloorEnabled = false;
var originalGroundMaterial = null;

function toggleBioFloor() {
    if (!window.bioFloorInstance) {
        console.error('[BIO-FLOOR] Bio-floor instance not initialized');
        return;
    }

    bioFloorEnabled = !bioFloorEnabled;

    // Find ground mesh
    var groundMesh = null;
    scene.traverse(function (object) {
        if (object instanceof THREE.Mesh && object.geometry instanceof THREE.CircleGeometry) {
            if (object.material.uniforms && object.material.uniforms.uTime) {
                groundMesh = object;
            }
        }
    });

    if (!groundMesh) {
        console.error('[BIO-FLOOR] Ground mesh not found');
        return;
    }

    if (bioFloorEnabled) {
        console.log('[BIO-FLOOR] Applying bio-floor texture...');

        // Save original material
        if (!originalGroundMaterial) {
            originalGroundMaterial = groundMesh.material;
        }

        // Get canvas from bio-floor interface
        var bioCanvas = window.bioFloorInstance.getCanvas();

        // Create Three.js texture
        var bioTexture = new THREE.CanvasTexture(bioCanvas);
        bioTexture.needsUpdate = true;

        // Create new material with bio texture
        var bioMaterial = new THREE.MeshStandardMaterial({
            map: bioTexture,
            emissive: new THREE.Color(0x062830),
            emissiveMap: bioTexture,
            emissiveIntensity: 0.5,
            roughness: 0.7,
            metalness: 0.3,
            transparent: true,
            opacity: 0.95
        });

        groundMesh.material = bioMaterial;
        groundMesh.material.needsUpdate = true;

        // Update texture every frame
        if (!window.bioFloorUpdateInterval) {
            window.bioFloorUpdateInterval = setInterval(function () {
                if (bioFloorEnabled && bioTexture) {
                    bioTexture.needsUpdate = true;
                }
            }, 50); // Update 20 times per second
        }

        console.log('[BIO-FLOOR] Bio-floor texture applied');
    } else {
        console.log('[BIO-FLOOR] Restoring procedural ground...');

        // Restore original material
        if (originalGroundMaterial) {
            groundMesh.material = originalGroundMaterial;
            groundMesh.material.needsUpdate = true;
        }

        // Stop update interval
        if (window.bioFloorUpdateInterval) {
            clearInterval(window.bioFloorUpdateInterval);
            window.bioFloorUpdateInterval = null;
        }

        console.log('[BIO-FLOOR] Procedural ground restored');
    }
}

window.loadEnvironmentModel = loadEnvironmentModel;
window.updateEnvironment = updateEnvironment;
window.toggleBioFloor = toggleBioFloor;

