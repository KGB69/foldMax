import { Canvas } from '@react-three/fiber'
import { OrbitControls, Stars, Environment, Float } from '@react-three/drei'
import { Suspense } from 'react'
import { useControls } from 'leva'

export default function Scene({ children }) {
  const { fogColor, fogNear, fogFar } = useControls('Fog', {
    fogColor: { value: '#1a0505', label: 'Fog Color' },
    fogNear: { value: 20, min: -50, max: 50, step: 1, label: 'Fog Start' },
    fogFar: { value: -5, min: -50, max: 50, step: 1, label: 'Fog End' },
  })

  return (
    <Canvas camera={{ position: [0, 0, 6], fov: 45 }}>
      <color attach="background" args={['#050505']} />

      {/* Lighting */}
      <ambientLight intensity={0.4} />
      <spotLight position={[10, 10, 10]} angle={0.15} penumbra={1} intensity={1} />
      <pointLight position={[-10, -10, -10]} intensity={0.5} />

      {/* Environment */}
      <Suspense fallback={null}>
        <Stars radius={100} depth={50} count={500} factor={4} saturation={0} fade speed={1} />
      </Suspense>

      {/* Fog from inspiration (inverted near/far for constant haze) */}
      <fog attach="fog" args={[fogColor, fogNear, fogFar]} />

      {/* Content */}
      <group>
        {children}
      </group>
    </Canvas>
  )
}
