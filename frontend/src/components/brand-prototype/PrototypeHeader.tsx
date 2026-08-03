import { NorthmineLogo } from '../brand/NorthmineLogo'

interface PrototypeHeaderProps {
  intensity: 'pure' | 'premium'
  onIntensityChange: (intensity: 'pure' | 'premium') => void
}

export function PrototypeHeader({ intensity, onIntensityChange }: PrototypeHeaderProps) {
  return (
    <header className="nmp-header">
      <a className="nmp-header__skip" href="#nmp-contenido">
        Saltar al contenido
      </a>
      <div className="nmp-header__inner">
        <a className="nmp-header__brand" href="/" aria-label="NORTHMINE Intelligence, inicio">
          <NorthmineLogo className="nmp-header__logo" variant="horizontal" />
        </a>

        <nav className="nmp-header__nav" aria-label="Navegación del prototipo">
          <a href="#momento-2">Manifiesto</a>
          <a href="#momento-4">Archivo</a>
          <a href="#momento-5">Evidencia</a>
        </nav>

        <div
          className="nmp-header__intensity"
          role="group"
          aria-label="Intensidad visual del prototipo"
        >
          <span className="mono-label">Intensidad</span>
          <div className="nmp-header__switch">
            <button
              type="button"
              aria-pressed={intensity === 'pure'}
              onClick={() => onIntensityChange('pure')}
            >
              Pura
            </button>
            <button
              type="button"
              aria-pressed={intensity === 'premium'}
              onClick={() => onIntensityChange('premium')}
            >
              Premium
            </button>
          </div>
        </div>
      </div>
    </header>
  )
}
