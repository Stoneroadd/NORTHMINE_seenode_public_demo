export function ProductEvidence() {
  return (
    <section className="nmp-evidence" id="momento-5" aria-labelledby="nmp-evidence-title">
      <div className="nmp-evidence__head">
        <p className="mono-label">Evidencia</p>
        <h2 id="nmp-evidence-title" className="nmp-evidence__title">
          No mostramos una promesa abstracta.
          <br />
          Mostramos cómo se conecta una decisión.
        </h2>
      </div>

      <figure className="nmp-evidence__frame">
        <img
          className="nmp-evidence__image"
          src="/assets/landing/prototype/product/cockpit-operational-demo-capture.webp"
          srcSet="/assets/landing/prototype/product/cockpit-operational-demo-capture-900.webp 900w, /assets/landing/prototype/product/cockpit-operational-demo-capture.webp 1600w"
          sizes="(max-width: 900px) 100vw, 80vw"
          alt="Captura del Decision Cockpit de NORTHMINE mostrando la lectura ejecutiva del turno con datos de demostración sintéticos"
          width="1760"
          height="1010"
          loading="lazy"
        />
        <figcaption className="mono-label nmp-evidence__caption">
          Captura real del demo público · datos sintéticos identificados
        </figcaption>
      </figure>

      <div className="nmp-evidence__actions">
        <a className="nmp-btn nmp-btn--primary" href="/solicitar-demo">
          Solicitar acceso al entorno demostrativo
        </a>
        <a className="nmp-evidence__link" href="/privacy">
          Conocer el tratamiento de datos
        </a>
      </div>
    </section>
  )
}
