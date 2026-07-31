import { Database, FileCheck2, LockKeyhole, ServerCog, ShieldCheck } from 'lucide-react'

const disclosure = [
  {
    icon: Database,
    title: 'Datos sinteticos',
    copy: 'Valores representativos creados para demostrar flujos y visualizaciones.',
  },
  {
    icon: LockKeyhole,
    title: 'Sin credenciales reales',
    copy: 'El entorno publico no contiene claves SQL ni acceso a sistemas productivos.',
  },
  {
    icon: ServerCog,
    title: 'Integracion privada',
    copy: 'Conectores y fuentes operacionales se configuran en entornos controlados.',
  },
]

export function DemoDisclosure() {
  return (
    <>
      <section className="nm-public-band nm-demo-disclosure" aria-labelledby="disclosure-title">
        <div className="nm-public-shell nm-demo-disclosure__layout">
          <div className="nm-public-section-heading">
            <p className="nm-public-eyebrow">Honestidad del entorno</p>
            <h2 id="disclosure-title">Que contiene este demo</h2>
            <p>
              El objetivo es evaluar la experiencia, las relaciones entre
              modulos y la forma en que NORTHMINE estructura una decision.
            </p>
          </div>
          <div className="nm-demo-disclosure__items">
            {disclosure.map(({ icon: Icon, title, copy }) => (
              <article key={title}>
                <Icon size={20} aria-hidden="true" />
                <div>
                  <h3>{title}</h3>
                  <p>{copy}</p>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="nm-public-band nm-security-band" aria-labelledby="security-title">
        <div className="nm-public-shell nm-security-band__layout">
          <div>
            <h2 id="security-title">Acceso controlado sin mezclar entornos.</h2>
          </div>
          <div className="nm-security-band__principles">
            <span><ShieldCheck size={18} aria-hidden="true" /> Roles y acceso protegido</span>
            <span><FileCheck2 size={18} aria-hidden="true" /> Auditoria de acciones</span>
            <span><ServerCog size={18} aria-hidden="true" /> Integraciones privadas separadas</span>
          </div>
        </div>
      </section>
    </>
  )
}
