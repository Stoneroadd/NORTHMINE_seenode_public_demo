import { PublicPageMeta } from '../components/landing/PublicPageMeta'
import { PublicPageShell } from '../components/landing/PublicPageShell'

export function DemoPrivacyPage() {
  return (
    <PublicPageShell compactHeader>
      <PublicPageMeta
        title="Privacidad de solicitudes demo | NORTHMINE Intelligence"
        description="Informacion sobre el uso de datos enviados para solicitar una demostracion de NORTHMINE."
        robots="noindex,follow"
      />
      <main id="contenido" className="nm-public-interior nm-privacy-page">
        <article className="nm-public-shell">
          <header>
            <p className="nm-public-eyebrow">Privacidad</p>
            <h1>Solicitudes de demostracion</h1>
            <p>Version informativa: 31 de julio de 2026.</p>
          </header>

          <section>
            <h2>Que informacion se solicita</h2>
            <p>
              Nombre, apellido, correo, empresa, cargo, pais, intereses y
              consentimiento. El telefono, tipo de operacion, tamano de flota y
              mensaje son opcionales.
            </p>
          </section>
          <section>
            <h2>Para que se utiliza</h2>
            <p>
              Para revisar la solicitud, comprender el contexto de evaluacion,
              decidir si corresponde habilitar acceso y coordinar una
              demostracion de NORTHMINE.
            </p>
          </section>
          <section>
            <h2>Que no debes enviar</h2>
            <p>
              No solicitamos ni debes enviar contrasenas, credenciales SQL,
              direcciones IP privadas, nombres de servidores, archivos ni datos
              operacionales confidenciales.
            </p>
          </section>
          <section>
            <h2>Separacion del entorno</h2>
            <p>
              Las solicitudes se mantienen separadas de los datos
              operacionales y de las cuentas del producto. El demo publico
              utiliza informacion sintetica y no esta conectado a bases
              productivas reales.
            </p>
          </section>
          <section>
            <h2>Conservacion y eliminacion</h2>
            <p>
              El plazo exacto de conservacion y el procedimiento permanente de
              eliminacion deben ser definidos por el responsable antes del
              lanzamiento comercial. Mientras este demo se encuentre en
              evaluacion, no envies informacion sensible o confidencial.
            </p>
          </section>
          <section className="nm-privacy-page__pending">
            <h2>Bloqueos de privacidad pendientes</h2>
            <p>
              Antes de un lanzamiento comercial definitivo, el propietario
              debe publicar aqui su identidad legal, un canal permanente para
              solicitudes de privacidad, el plazo de conservacion y el
              procedimiento de eliminacion o anonimizacion. Este demo no
              afirma cumplimiento certificado ni una jurisdiccion legal no
              verificada.
            </p>
          </section>
        </article>
      </main>
    </PublicPageShell>
  )
}
