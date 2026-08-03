import { useT } from '../../store'
import { NorthmineLogo } from '../brand/NorthmineLogo'

export function BrandHero() {
  const t = useT()

  return (
    <div className="brand-hero nm-brand-hero">
      <div className="brand-hero-copy nm-brand-title-wrap">
        <h1 className="sr-only">NORTHMINE Intelligence Hub</h1>
        <div className="brand-hero-mark nm-brand-logo">
          <NorthmineLogo className="nm-login-brand-logo" />
        </div>
        <p className="nm-brand-system-subtitle">{t.auth.subtitulo}</p>
      </div>
    </div>
  )
}
