const sources = [
  'Producción',
  'Flota',
  'Carguío',
  'Riesgo',
  'Decisión',
  'Plan mensual',
  'Mapa 3D',
]

const stats = [
  { value: '7', label: 'fuentes operacionales conectadas en el demo' },
  { value: '8', label: 'módulos operacionales navegables' },
  { value: '100%', label: 'datos sintéticos, identificados en cada pantalla' },
]

export function TrustStrip() {
  return (
    <section className="ns-trust" aria-label="Fuentes y arquitectura del demo">
      <div className="ns-saas__shell ns-trust__inner">
        <div className="ns-trust__ticker" role="list" aria-label="Módulos conectados en el entorno demostrativo">
          {[...sources, ...sources].map((source, index) => (
            <span role="listitem" key={`${source}-${index}`}>
              {source}
            </span>
          ))}
        </div>

        <div className="ns-trust__stats">
          {stats.map((stat) => (
            <div key={stat.label} className="ns-trust__stat">
              <strong>{stat.value}</strong>
              <span>{stat.label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
