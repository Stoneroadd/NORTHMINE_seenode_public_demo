import { Suspense, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Sparkles, Stars } from '@react-three/drei'
import { Bloom, EffectComposer } from '@react-three/postprocessing'
import type { Group } from 'three'
import { PitShell } from '../mindmap3d/PitShell'

// Fondo decorativo del login: el mismo diseño de rajo real (DXF -> pit-shell.json,
// componente PitShell reusado del mapa mental 3D) girando lento. Puramente visual:
// sin OrbitControls, sin picking, sin overlays de datos - solo atmosfera de marca.

function RotatingPit() {
  const groupRef = useRef<Group>(null)

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.32
      groupRef.current.rotation.x = Math.sin(Date.now() * 0.00008) * 0.12
    }
  })

  return (
    <group ref={groupRef}>
      <PitShell radius={280} position={[0, 40, 0]} />
    </group>
  )
}

export function PitShellVisual() {
  return (
    <Canvas
      className="login-pit-canvas"
      camera={{ position: [0, 160, 520], fov: 42 }}
      dpr={[1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      style={{ pointerEvents: 'none' }}
    >
      <color attach="background" args={['#050B14']} />
      <fog attach="fog" args={['#050B14', 500, 1400]} />
      <ambientLight intensity={0.5} />
      <pointLight position={[300, 300, 300]} intensity={1.1} color="#2FD4FF" />
      <pointLight position={[-300, -100, -200]} intensity={0.7} color="#7C3AED" />

      <Suspense fallback={null}>
        <RotatingPit />
        <Sparkles count={70} scale={[900, 400, 900]} size={1.6} speed={0.25} color="#7DD3FC" opacity={0.5} />
        <Stars radius={700} depth={60} count={1400} factor={2.2} saturation={0} fade speed={0.4} />
      </Suspense>

      <EffectComposer multisampling={0}>
        <Bloom intensity={0.65} luminanceThreshold={0.15} luminanceSmoothing={0.4} mipmapBlur />
      </EffectComposer>
    </Canvas>
  )
}
