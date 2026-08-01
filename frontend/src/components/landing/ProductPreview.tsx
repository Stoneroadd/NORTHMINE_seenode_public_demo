import { AlertTriangle, CheckCircle2, Layers3, RadioTower } from 'lucide-react'
import { PitContourField } from './PitContourField'

export function ProductPreview() {
  return (
    <>
      <section id="demo" className="nm-public-band nm-product-preview" aria-labelledby="cockpit-title">
        <div className="nm-public-shell">
          <div className="nm-product-preview__heading">
            <div className="nm-public-section-heading">
              <p className="nm-public-eyebrow">Cockpit operacional</p>
              <h2 id="cockpit-title">La primera pantalla responde que ocurre y que hacer ahora.</h2>
            </div>
            <ul aria-label="Lecturas disponibles">
              <li><CheckCircle2 size={16} aria-hidden="true" /> Produccion, meta y proyeccion</li>
              <li><RadioTower size={16} aria-hidden="true" /> Carguio y CAEX en contexto</li>
              <li><AlertTriangle size={16} aria-hidden="true" /> Riesgo y recomendacion priorizada</li>
            </ul>
          </div>

          <figure className="nm-product-frame">
            <div className="nm-product-evidence" role="img" aria-label="Diagrama conceptual de la lectura del Decision Cockpit; no es una captura del producto">
              <div className="nm-product-evidence__brief">
                <div>
                  <span>Diagrama de lectura</span>
                  <strong>Del estado del turno a una accion verificable.</strong>
                </div>
                <p>
                  Representacion conceptual. La captura real se incorporara
                  despues de validar el ultimo build del demo.
                </p>
              </div>
              <div className="nm-product-evidence__trace">
                <div><small>Estado</small><strong>Produccion y meta</strong><b /></div>
                <div><small>Brecha</small><strong>Proyeccion y ritmo</strong><b /></div>
                <div><small>Causa</small><strong>CAEX, carguio y riesgo</strong><b /></div>
                <div><small>Accion</small><strong>Recomendacion y evidencia</strong><b /></div>
              </div>
            </div>
            <figcaption>
              Diagrama conceptual, no captura de producto. Captura real pendiente.
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="nm-public-band nm-equipment-story" aria-labelledby="equipment-title">
        <div className="nm-public-shell nm-equipment-story__layout">
          <div className="nm-equipment-story__visual" aria-label="Equipos representados en NORTHMINE">
            <figure className="nm-equipment-story__machine nm-equipment-story__machine--truck">
              <img
                src="/assets/equipment/camion_komatsu980.png"
                alt="Camion de extraccion Komatsu 980E representado en la interfaz demo"
                width="1920"
                height="1080"
                loading="lazy"
              />
              <figcaption><strong>CAEX</strong><span>Estado, ciclos, frente y destino</span></figcaption>
            </figure>
            <figure className="nm-equipment-story__machine nm-equipment-story__machine--shovel">
              <img
                src="/assets/equipment/pala_1.png"
                alt="Pala electrica representada en la interfaz demo"
                width="1254"
                height="1254"
                loading="lazy"
              />
              <figcaption><strong>Carguio</strong><span>Rendimiento, cola, operador y alertas</span></figcaption>
            </figure>
          </div>

          <div className="nm-public-section-heading nm-public-section-heading--plain">
            <h2 id="equipment-title">Cada unidad conserva su contexto operacional.</h2>
            <p>
              La seleccion de una pala o CAEX abre su detalle sin perder el
              turno: disponibilidad, ciclos, origen, destino, alertas y
              recomendacion quedan vinculados al mismo equipo.
            </p>
            <dl className="nm-equipment-story__facts">
              <div><dt>Disponibilidad</dt><dd>Estado y ultima actividad</dd></div>
              <div><dt>Movimiento</dt><dd>Ciclos, tonelaje y ruta</dd></div>
              <div><dt>Decision</dt><dd>Alerta, prioridad y accion</dd></div>
            </dl>
          </div>
        </div>
      </section>

      <section className="nm-public-band nm-map-story" aria-labelledby="map-title">
        <div className="nm-public-shell nm-map-story__layout">
          <div className="nm-public-section-heading">
            <p className="nm-public-eyebrow">Mapa operacional 3D</p>
            <h2 id="map-title">La geometria de la mina como contexto para la operacion.</h2>
            <p>
              El mapa relaciona modulos, decisiones y fuentes sobre una escena
              3D basada en geometria DXF. En una integracion privada, la
              geometria puede provenir de la operacion real; los valores
              mostrados en este demo son sinteticos.
            </p>
            <div className="nm-map-story__note">
              <Layers3 size={19} aria-hidden="true" />
              <span>DXF y relaciones espaciales sin exponer datos operacionales privados.</span>
            </div>
          </div>
          <figure className="nm-product-frame nm-product-frame--map">
            <div className="nm-map-geometry" role="img" aria-label="Vista tecnica bidimensional derivada de la geometria pit-shell incluida en el demo">
              <PitContourField />
              <div className="nm-map-geometry__axis" aria-hidden="true">
                <span>E 489 033 - 491 496</span>
                <span>N 7 446 732 - 7 449 154</span>
                <span>RL 1 960 - 2 424</span>
              </div>
              <div className="nm-map-geometry__legend">
                <strong>Pit shell del demo</strong>
                <span>4.823 polilineas / geometria de referencia</span>
              </div>
            </div>
            <figcaption>
              Motivo 2D derivado de pit-shell.json. La captura de la escena 3D sigue pendiente.
            </figcaption>
          </figure>
        </div>
      </section>
    </>
  )
}
