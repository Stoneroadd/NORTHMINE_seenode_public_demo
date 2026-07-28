import { useT } from '../../store'

export function BrandHero() {
  const t = useT()

  return (
    <div className="brand-hero nm-brand-hero">
      <div className="brand-hero-copy nm-brand-title-wrap">
        <h1 className="login-brand-name nm-brand-title">NORTHMINE</h1>
        <div className="brand-intelligence nm-brand-subtitle">INTELLIGENCE</div>
        <p className="nm-brand-system-subtitle">{t.auth.subtitulo}</p>
      </div>
    </div>
  )
}
