import { useState } from 'react'
import { PrototypeHeader } from './PrototypeHeader'
import { MiningHero } from './MiningHero'
import { OperationalManifesto } from './OperationalManifesto'
import { TerrainDataTransition } from './TerrainDataTransition'
import { OperationalArchive } from './OperationalArchive'
import { ProductEvidence } from './ProductEvidence'
import '../../styles/northmine-prototype-tokens.css'
import '../../styles/northmine-prototype-layout.css'
import '../../styles/northmine-prototype-motion.css'
import '../../styles/northmine-prototype-responsive.css'

export function NorthminePrototype() {
  const [intensity, setIntensity] = useState<'pure' | 'premium'>(() => {
    const params = new URLSearchParams(window.location.search)
    return params.get('intensity') === 'premium' ? 'premium' : 'pure'
  })

  return (
    <div className={`nm-proto${intensity === 'premium' ? ' nm-proto--premium' : ''}`}>
      <PrototypeHeader intensity={intensity} onIntensityChange={setIntensity} />
      <main id="nmp-contenido">
        <MiningHero />
        <OperationalManifesto />
        <TerrainDataTransition />
        <OperationalArchive />
        <ProductEvidence />
      </main>
      <footer className="nmp-footer">
        <div className="nmp-footer__inner">
          <span className="mono-label">NORTHMINE Intelligence · prototipo interno, no publicado</span>
          <a href="/">Volver a NORTHMINE</a>
        </div>
      </footer>
    </div>
  )
}
