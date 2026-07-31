import { CheckCircle2, LogIn } from 'lucide-react'
import { PublicPageMeta } from '../components/landing/PublicPageMeta'
import { PublicPageShell } from '../components/landing/PublicPageShell'

export function DemoRequestSuccessPage() {
  const reference = sessionStorage.getItem('northmine.demo-access.reference')

  return (
    <PublicPageShell compactHeader>
      <PublicPageMeta
        title="Solicitud recibida | NORTHMINE Intelligence"
        description="Confirmacion de solicitud de acceso al demo de NORTHMINE Intelligence."
        robots="noindex,nofollow"
      />
      <main id="contenido" className="nm-public-interior nm-request-success">
        <section className="nm-request-success__panel">
          <CheckCircle2 size={42} aria-hidden="true" />
          <p className="nm-public-eyebrow">Solicitud recibida</p>
          <h1>Gracias. Revisaremos la informacion enviada.</h1>
          <p>
            El envio no crea credenciales automaticamente. Si la solicitud es
            aprobada, recibiras instrucciones de acceso por un canal acordado.
          </p>
          {reference && (
            <dl>
              <dt>Referencia</dt>
              <dd>{reference}</dd>
            </dl>
          )}
          <div>
            <a className="nm-public-button nm-public-button--primary" href="/">
              Volver a NORTHMINE
            </a>
            <a className="nm-public-button nm-public-button--quiet" href="/acceso-demo">
              <LogIn size={18} aria-hidden="true" /> Ya tengo acceso
            </a>
          </div>
        </section>
      </main>
    </PublicPageShell>
  )
}
