const points = [
  { label: 'Entorno demostrativo', detail: 'Separado del producto real, sin acceso a bases operacionales.' },
  { label: 'Datos sintéticos', detail: 'Valores representativos, identificados en cada pantalla del demo.' },
  { label: 'Autenticación', detail: 'Acceso individual, revisado antes de habilitarse.' },
  { label: 'Control administrativo', detail: 'Roles y permisos gestionados desde el panel de administración.' },
  { label: 'Persistencia', detail: 'Solicitudes almacenadas por separado de los datos operacionales.' },
  { label: 'Privacidad', detail: 'Tratamiento de datos documentado y disponible para revisión.' },
]

export function SecurityTransparency() {
  return (
    <section className="ns-security" id="seguridad" aria-labelledby="ns-security-title">
      <div className="ns-saas__shell ns-security__inner">
        <div className="ns-security__head">
          <p className="mono-label">Seguridad y transparencia</p>
          <h2 id="ns-security-title" className="ns-security__title">
            Acceso controlado, sin mezclar entornos.
          </h2>
        </div>

        <dl className="ns-security__grid">
          {points.map((point) => (
            <div key={point.label}>
              <dt>{point.label}</dt>
              <dd>{point.detail}</dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  )
}
