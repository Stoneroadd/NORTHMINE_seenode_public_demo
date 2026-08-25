import { Suspense, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import { PitShell } from '../mindmap3d/PitShell'

// Fondo decorativo del login: el mismo diseño de rajo real (DXF -> pit-shell.json,
// componente PitShell reusado del mapa mental 3D) girando lento. Puramente visual:
// sin OrbitControls, sin picking, sin overlays de datos - solo atmosfera de marca.

function RotatingPit() {
  const groupRef = useRef<Group>(null)

  useFrame((_, delta) => {
    if (!groupRef.current) return
    groupRef.current.rotation.y += delta * 0.32
    groupRef.current.rotation.x = Math.sin(Date.now() * 0.00008) * 0.12
  })

  return (
    <group ref={groupRef}>
      <PitShell radius={280} position={[0, 40, 0]} rimColor="#ffffff" deepColor="#9a9a9a" />
    </group>
  )
}

export function PitShellVisual() {
  return (
    <Canvas
      className="login-pit-canvas"
      camera={{ position: [0, 160, 520], fov: 42 }}
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: 'high-performance' }}
      style={{ pointerEvents: 'none' }}
    >
      <color attach="background" args={['#0d0d0d']} />
      <fog attach="fog" args={['#0d0d0d', 500, 1400]} />
      <ambientLight intensity={0.48} color="#b9dcf5" />
      <directionalLight position={[320, 360, 280]} intensity={1.25} color="#2fd4ff" />
      <pointLight position={[-280, -80, -220]} intensity={0.58} color="#7c3aed" />

      <Suspense fallback={null}>
        <RotatingPit />
      </Suspense>
    </Canvas>
  )
}
