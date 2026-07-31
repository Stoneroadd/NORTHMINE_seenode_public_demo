import { DemoRequestForm } from '../components/landing/DemoRequestForm'
import { PublicPageMeta } from '../components/landing/PublicPageMeta'
import { PublicPageShell } from '../components/landing/PublicPageShell'

export function DemoRequestPage() {
  return (
    <PublicPageShell compactHeader>
      <PublicPageMeta
        title="Solicitar acceso al demo | NORTHMINE Intelligence"
        description="Solicita acceso controlado al demo interactivo de NORTHMINE Intelligence con datos operacionales sinteticos."
        robots="noindex,follow"
      />
      <main id="contenido" className="nm-public-interior">
        <div className="nm-public-shell nm-request-layout">
          <aside className="nm-request-intro">
            <p className="nm-public-eyebrow">Solicitud de acceso</p>
            <h1>Evalua NORTHMINE en un entorno controlado.</h1>
            <p>
              Completa el formulario para que podamos revisar tu contexto y
              habilitar el acceso adecuado. No se solicitan credenciales ni
              informacion operacional sensible.
            </p>
            <dl>
              <div><dt>Entorno</dt><dd>Demo con datos sinteticos</dd></div>
              <div><dt>Revision</dt><dd>Manual, antes de habilitar acceso</dd></div>
              <div><dt>Integraciones</dt><dd>Disponibles solo en entornos privados</dd></div>
            </dl>
          </aside>
          <section className="nm-request-form-panel" aria-labelledby="request-form-title">
            <header>
              <span>Paso unico</span>
              <h2 id="request-form-title">Informacion para la demostracion</h2>
              <p>Los campos marcados con * son obligatorios.</p>
            </header>
            <DemoRequestForm />
          </section>
        </div>
      </main>
    </PublicPageShell>
  )
}
