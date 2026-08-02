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
          <svg className="nmp-header__mark" viewBox="0 0 64 64" aria-hidden="true">
            <path d="M8,8 L18,8 L18,56 L13,56 L8,51 Z" fill="currentColor" />
            <path d="M46,8 L51,8 L56,13 L56,56 L46,56 Z" fill="currentColor" />
            <path
              d="M18,16 L34,16 L34,32 L46,32"
              fill="none"
              stroke="currentColor"
              strokeWidth={10}
              strokeLinecap="butt"
              strokeLinejoin="miter"
            />
          </svg>
          <span className="nmp-header__word">NORTHMINE</span>
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
