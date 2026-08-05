import { AlertTriangle, CheckCircle2, Layers3, RadioTower } from 'lucide-react'
import { PitContourField } from './PitContourField'
import { useModuleT } from '../../i18n/useModuleT'
import { publicPagesT } from '../../i18n/modules/publicPages'

const readingIcons = [CheckCircle2, RadioTower, AlertTriangle]

export function ProductPreview() {
  const t = useModuleT(publicPagesT)
  return (
    <>
      <section id="demo" className="nm-public-band nm-product-preview" aria-labelledby="cockpit-title">
        <div className="nm-public-shell">
          <div className="nm-product-preview__heading">
            <div className="nm-public-section-heading">
              <p className="nm-public-eyebrow">{t.preview.eyebrow}</p>
              <h2 id="cockpit-title">{t.preview.title}</h2>
            </div>
            <ul aria-label={t.preview.ariaReadings}>
              {t.preview.readings.map((reading, index) => {
                const Icon = readingIcons[index] ?? CheckCircle2
                return (
                  <li key={reading}><Icon size={16} aria-hidden="true" /> {reading}</li>
                )
              })}
            </ul>
          </div>

          <figure className="nm-product-frame">
            <div className="nm-product-evidence" role="img" aria-label={t.preview.evidenceAria}>
              <div className="nm-product-evidence__brief">
                <div>
                  <span>{t.preview.briefLabel}</span>
                  <strong>{t.preview.briefTitle}</strong>
                </div>
                <p>
                  {t.preview.briefBody}
                </p>
              </div>
              <div className="nm-product-evidence__trace">
                {t.preview.trace.map((item) => (
                  <div key={item.label}><small>{item.label}</small><strong>{item.value}</strong><b /></div>
                ))}
              </div>
            </div>
            <figcaption>
              {t.preview.figcaption}
            </figcaption>
          </figure>
        </div>
      </section>

      <section className="nm-public-band nm-equipment-story" aria-labelledby="equipment-title">
        <div className="nm-public-shell nm-equipment-story__layout">
          <div className="nm-equipment-story__visual" aria-label={t.preview.equipmentAria}>
            <figure className="nm-equipment-story__machine nm-equipment-story__machine--truck">
              <img
                src="/assets/landing/caex-haul-road-synthetic.webp"
                alt="CAEX sin marca circulando por una ruta de acarreo en un rajo abierto sintetico"
                width="1200"
                height="800"
                loading="lazy"
              />
              <figcaption>
                <div>
                  <strong>{t.preview.equipmentTruckTitle}</strong>
                  <span>{t.preview.equipmentTruckSub}</span>
                </div>
                <small>{t.preview.equipmentScene}</small>
              </figcaption>
            </figure>
            <figure className="nm-equipment-story__machine nm-equipment-story__machine--shovel">
              <img
                src="/assets/landing/electric-shovel-loading-synthetic.webp"
                alt="Pala electrica sin marca cargando un CAEX en un banco minero sintetico"
                width="1200"
                height="800"
                loading="lazy"
              />
              <figcaption>
                <div>
                  <strong>{t.preview.equipmentShovelTitle}</strong>
                  <span>{t.preview.equipmentShovelSub}</span>
                </div>
                <small>{t.preview.equipmentScene}</small>
              </figcaption>
            </figure>
          </div>

          <div className="nm-public-section-heading nm-public-section-heading--plain">
            <h2 id="equipment-title">{t.preview.equipmentTitle}</h2>
            <p>
              {t.preview.equipmentBody}
            </p>
            <dl className="nm-equipment-story__facts">
              {t.preview.equipmentFacts.map((fact) => (
                <div key={fact.label}><dt>{fact.label}</dt><dd>{fact.value}</dd></div>
              ))}
            </dl>
          </div>
        </div>
      </section>

      <section className="nm-public-band nm-map-story" aria-labelledby="map-title">
        <div className="nm-public-shell nm-map-story__layout">
          <div className="nm-public-section-heading">
            <p className="nm-public-eyebrow">{t.preview.mapEyebrow}</p>
            <h2 id="map-title">{t.preview.mapTitle}</h2>
            <p>
              {t.preview.mapBody}
            </p>
            <div className="nm-map-story__note">
              <Layers3 size={19} aria-hidden="true" />
              <span>{t.preview.mapNote}</span>
            </div>
          </div>
          <figure className="nm-product-frame nm-product-frame--map">
            <div
              className="nm-map-geometry"
              role="img"
              aria-label={t.preview.mapAria}
            >
              <img
                className="nm-map-geometry__orthomosaic"
                src="/assets/landing/open-pit-orthomosaic-synthetic.webp"
                alt=""
                width="1600"
                height="1000"
                loading="lazy"
                aria-hidden="true"
              />
              <PitContourField />
              <div className="nm-map-geometry__source" aria-hidden="true">
                <span>ORTOMOSAICO SINTETICO</span>
                <span>CAPA DXF DEMO</span>
              </div>
              <div className="nm-map-geometry__axis" aria-hidden="true">
                <span>E 489 033 - 491 496</span>
                <span>N 7 446 732 - 7 449 154</span>
                <span>RL 1 960 - 2 424</span>
              </div>
              <div className="nm-map-geometry__legend">
                <strong>{t.preview.mapLegendTitle}</strong>
                <span>{t.preview.mapLegendSub}</span>
              </div>
            </div>
            <figcaption>
              {t.preview.mapFigcaption}
            </figcaption>
          </figure>
        </div>
      </section>
    </>
  )
}
