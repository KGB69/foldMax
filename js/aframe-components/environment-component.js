/**
 * Procedural Environment Component for A-Frame
 * Ported from libs/environment-loader.js
 */
AFRAME.registerComponent('environment-loader', {
    schema: {
        timeOfDay: { type: 'number', default: 0.35 }
    },

    init: function () {
        console.log('[EnvironmentLoader] Initializing...');
        this.scene = this.el.sceneEl.object3D;
        this.clock = new THREE.Clock();

        // Setup Uniforms
        this.uniforms = {
            uTime: { value: 0 },
            uRingSpacing: { value: 21.0 },
            uPulseSpeed: { value: 0.3 },
            uPulseIntensity: { value: 0.3 },
            uBreatheSpeed: { value: 0.3 },
            uScannerSpeed: { value: 0.0 },
            uTimeOfDay: { value: this.data.timeOfDay },
            uPlayerPos: { value: new THREE.Vector2(0, 0) }
        };

        // Expose globally for UI or other scripts if needed
        window.environmentUniforms = this.uniforms;

        this.addProceduralGround();
        this.addLighting();
        this.addFog();
        this.addSky(); // Renamed from addStars/addFog combination
    },

    tick: function (time, timeDelta) {
        // Update uniforms
        var delta = timeDelta / 1000;
        this.uniforms.uTime.value += delta;

        // Update time of day if changed via schema (not implemented in tick for perf, but could be)
    },

    addProceduralGround: function () {
        var groundRadius = 250;
        var geometry = new THREE.CircleGeometry(groundRadius, 128);

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
                
                vec3 dayPulseColor = vec3(1.0, 0.7, 0.3);
                vec3 duskPulseColor = vec3(1.0, 0.3, 0.4);
                vec3 nightPulseColor = vec3(0.3, 0.5, 1.0);
                
                vec3 pulseColor;
                if (uTimeOfDay > 0.7) {
                    pulseColor = dayPulseColor;
                } else if (uTimeOfDay > 0.3) {
                    float duskFactor = (uTimeOfDay - 0.3) / 0.4;
                    pulseColor = mix(duskPulseColor, dayPulseColor, duskFactor);
                } else {
                    pulseColor = nightPulseColor;
                }
                
                vec3 scanColor = vec3(0.3, 0.6, 1.0);
                
                vec3 finalColor = baseColor;
                finalColor += ringColor * ringLine * 0.8;
                finalColor += ringColor * radialLine * 0.3;
                finalColor += pulseColor * pulseWave * uPulseIntensity;
                finalColor += scanColor * scanWave * 0.5;
                finalColor += ringColor * breathe * 0.1;
                
                float edgeDist = 250.0 - dist;
                float edgeGlow = smoothstep(0.0, 20.0, edgeDist);
                float boundaryWarning = smoothstep(30.0, 10.0, edgeDist);
                
                finalColor += pulseColor * boundaryWarning * 0.5;
                
                float alpha = smoothstep(250.0, 240.0, dist);
                alpha *= edgeGlow;
                
                vec3 fogColor = vec3(0.15, 0.02, 0.05);
                float fogAmount = 1.0 - smoothstep(200.0, 250.0, dist);
                finalColor = mix(fogColor, finalColor, fogAmount);
                
                gl_FragColor = vec4(finalColor, alpha * 0.9);
            }
        `;

        var material = new THREE.ShaderMaterial({
            uniforms: this.uniforms,
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            transparent: true,
            side: THREE.DoubleSide
        });

        var mesh = new THREE.Mesh(geometry, material);
        mesh.rotation.x = -Math.PI / 2;
        mesh.position.y = -50; // Keep original offset
        this.scene.add(mesh);

        // Add base circle
        var baseGeo = new THREE.CircleGeometry(groundRadius, 64);
        var baseMat = new THREE.MeshStandardMaterial({
            color: 0x101010,
            roughness: 0.6,
            metalness: 0.4
        });
        var baseMesh = new THREE.Mesh(baseGeo, baseMat);
        baseMesh.rotation.x = -Math.PI / 2;
        baseMesh.position.y = -50.5;
        this.scene.add(baseMesh);
    },

    addLighting: function () {
        var ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        this.scene.add(ambientLight);

        var sunLight = new THREE.DirectionalLight(0xfff5e6, 1.2);
        sunLight.position.set(50, 100, 50);
        this.scene.add(sunLight);

        var skyLight = new THREE.HemisphereLight(0xaaccff, 0x666666, 0.5);
        this.scene.add(skyLight);
    },

    addFog: function () {
        this.scene.fog = new THREE.Fog(0xccddff, 100, 500);
    },

    addSky: function () {
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
                
                vec3 topColor = mix(nightTopColor, dayTopColor, timeOfDay);
                vec3 bottomColor = mix(nightBottomColor, dayBottomColor, timeOfDay);
                vec3 skyColor = mix(bottomColor, topColor, max(pow(max(h, 0.0), exponent), 0.0));
                
                float horizonFactor = 1.0 - abs(h);
                horizonFactor = pow(horizonFactor, 3.0);
                
                vec3 glowColor;
                if (timeOfDay > 0.7) {
                    glowColor = dayHorizonGlow;
                } else if (timeOfDay > 0.3) {
                    float duskFactor = (timeOfDay - 0.3) / 0.4;
                    glowColor = mix(duskHorizonGlow, dayHorizonGlow, duskFactor);
                } else {
                    glowColor = nightHorizonGlow;
                }
                
                float glowIntensity = horizonFactor * 0.6;
                skyColor = mix(skyColor, glowColor, glowIntensity);
                
                float bands = sin(h * 15.0) * 0.02;
                skyColor += bands * timeOfDay * 0.3;
                
                gl_FragColor = vec4(skyColor, 1.0);
            }
        `;

        var skyGeo = new THREE.SphereGeometry(4000, 32, 15);
        var skyMat = new THREE.ShaderMaterial({
            uniforms: {
                dayTopColor: { value: new THREE.Color(0x0077ff) },
                dayBottomColor: { value: new THREE.Color(0xaaccff) },
                nightTopColor: { value: new THREE.Color(0x000033) },
                nightBottomColor: { value: new THREE.Color(0x001144) },
                dayHorizonGlow: { value: new THREE.Color(0xffffee) },
                duskHorizonGlow: { value: new THREE.Color(0xff6644) },
                nightHorizonGlow: { value: new THREE.Color(0x4433ff) },
                timeOfDay: { value: this.data.timeOfDay },
                offset: { value: 33 },
                exponent: { value: 0.6 }
            },
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
            side: THREE.BackSide
        });

        var sky = new THREE.Mesh(skyGeo, skyMat);
        this.scene.add(sky);
    }
});
