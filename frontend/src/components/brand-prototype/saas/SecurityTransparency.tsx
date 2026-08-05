import { useModuleT } from '../../../i18n/useModuleT'
import { landingT } from '../../../i18n/modules/landing'

export function SecurityTransparency() {
  const t = useModuleT(landingT)

  return (
    <section className="ns-security" id="seguridad" aria-labelledby="ns-security-title">
      <div className="ns-saas__shell ns-security__inner">
        <div className="ns-security__head">
          <p className="mono-label">{t.security.kicker}</p>
          <h2 id="ns-security-title" className="ns-security__title">
            {t.security.title}
          </h2>
        </div>

        <dl className="ns-security__grid">
          {t.security.points.map((point) => (
            <div key={point.label}>
              <dt>{point.label}</dt>
              <dd>{point.detail}</dd>
            </div>
          ))}
        </dl>

        {t.security.disclaimer && <p className="ns-security__disclaimer">{t.security.disclaimer}</p>}
      </div>
    </section>
  )
}
