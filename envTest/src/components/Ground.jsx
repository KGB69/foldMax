import { Grid } from '@react-three/drei'
import { useRef, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import { useControls } from 'leva'

export default function Ground() {
    const groundSize = 50
    const pulseRef = useRef()
    const { camera } = useThree()

    const { pulseSpeed, pulseIntensity, breatheSpeed, hexSize } = useControls('Pulse Effect', {
        pulseSpeed: { value: 4.0, min: 0, max: 10, step: 0.1, label: 'Pulse Speed' },
        pulseIntensity: { value: 2.5, min: 0, max: 5, step: 0.1, label: 'Pulse Intensity' },
        breatheSpeed: { value: 0.8, min: 0, max: 3, step: 0.1, label: 'Breathe Speed' },
        hexSize: { value: 10.0, min: 1, max: 20, step: 0.5, label: 'Hex Size' },
    })

    const uniforms = useMemo(
        () => ({
            uTime: { value: 0 },
            uGridSize: { value: 10.0 },
            uPulseSpeed: { value: 4.0 },
            uPulseIntensity: { value: 2.5 },
            uBreatheSpeed: { value: 0.8 },
            uPlayerPos: { value: new THREE.Vector2(0, 0) },
        }),
        []
    )

    useFrame((state) => {
        if (pulseRef.current) {
            pulseRef.current.uniforms.uTime.value = state.clock.elapsedTime
            pulseRef.current.uniforms.uPulseSpeed.value = pulseSpeed
            pulseRef.current.uniforms.uPulseIntensity.value = pulseIntensity
            pulseRef.current.uniforms.uBreatheSpeed.value = breatheSpeed
            pulseRef.current.uniforms.uGridSize.value = hexSize
        }
    })

    return (
        <>
            {/* Main Ground Plane with subtle reflection */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2, 0]}>
                <planeGeometry args={[groundSize, groundSize]} />
                <meshStandardMaterial
                    color="#101010"
                    roughness={0.6}
                    metalness={0.4}
                    envMapIntensity={0.3}
                />
            </mesh>

            {/* Grid Pattern with Pulse Effect */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.99, 0]}>
                <planeGeometry args={[groundSize, groundSize, 100, 100]} />
                <shaderMaterial
                    ref={pulseRef}
                    transparent
                    uniforms={uniforms}
                    vertexShader={`
                        varying vec2 vUv;
                        varying vec3 vWorldPos;
                        void main() {
                            vUv = uv;
                            vec4 worldPosition = modelMatrix * vec4(position, 1.0);
                            vWorldPos = worldPosition.xyz;
                            gl_Position = projectionMatrix * viewMatrix * worldPosition;
                        }
                    `}
                    fragmentShader={`
                        uniform float uTime;
                        uniform float uGridSize;
                        uniform float uPulseSpeed;
                        uniform float uPulseIntensity;
                        uniform float uBreatheSpeed;
                        varying vec2 vUv;
                        varying vec3 vWorldPos;

                        // Hexagon distance function
                        float hexDist(vec2 p) {
                            p = abs(p);
                            float c = dot(p, normalize(vec2(1.0, 1.73)));
                            c = max(c, p.x);
                            return c;
                        }

                        vec4 getHex(vec2 p) {
                            vec2 r = vec2(1.0, 1.73);
                            vec2 h = r * 0.5;
                            vec2 a = mod(p, r) - h;
                            vec2 b = mod(p - h, r) - h;
                            vec2 gv = dot(a, a) < dot(b, b) ? a : b;
                            float x = atan(gv.x, gv.y);
                            float y = 0.5 - hexDist(gv);
                            vec2 id = p - gv;
                            return vec4(x, y, id.x, id.y);
                        }

                        void main() {
                            vec2 uv = vWorldPos.xz / uGridSize;
                            vec4 hex = getHex(uv);
                            
                            // Hexagon borders
                            float border = smoothstep(0.02, 0.05, hex.y);
                            
                            // Distance from center
                            float dist = length(vWorldPos.xz);
                            
                            // Pulse effect
                            float breathe = sin(uTime * uBreatheSpeed) * 0.5 + 0.5;
                            float pulse = sin(dist * 0.2 - uTime * uPulseSpeed) * 0.5 + 0.5;
                            pulse = pow(pulse, 3.0);
                            pulse *= smoothstep(40.0, 0.0, dist);
                            
                            // Scanning line effect
                            float scan = sin(vWorldPos.z * 0.1 + uTime * 0.5) * 0.5 + 0.5;
                            scan = pow(scan, 8.0) * 0.5;

                            // Cell color variation
                            float cellRand = sin(hex.z * 12.9898 + hex.w * 78.233) * 43758.5453;
                            float cellFlicker = sin(uTime * 2.0 + cellRand) * 0.5 + 0.5;
                            
                            // Combine effects
                            vec3 baseColor = vec3(0.05, 0.05, 0.08);
                            vec3 gridColor = vec3(0.2, 0.4, 0.8); // Cyan/Blueish
                            vec3 pulseColor = vec3(1.0, 0.2, 0.2); // Red pulse
                            
                            vec3 finalColor = baseColor;
                            
                            // Add grid lines
                            finalColor += gridColor * (1.0 - border) * 0.5;
                            
                            // Add pulse
                            finalColor += pulseColor * pulse * uPulseIntensity * (1.0 - border);
                            
                            // Add cell flicker to some cells
                            if (fract(cellRand) > 0.9) {
                                finalColor += gridColor * cellFlicker * 0.3;
                            }
                            
                            // Add scan line
                            finalColor += vec3(0.5, 0.8, 1.0) * scan * 0.2;

                            // Fade out at edges
                            float alpha = smoothstep(25.0, 10.0, dist);
                            
                            gl_FragColor = vec4(finalColor, 0.8 * alpha);
                        }
                    `}
                />
            </mesh>

            {/* Visual Border */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.98, 0]}>
                <ringGeometry args={[groundSize / 2 - 0.5, groundSize / 2, 4]} />
                <meshBasicMaterial color="#ff0000" opacity={0.5} transparent />
            </mesh>
        </>
    )
}
