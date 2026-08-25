import { FormEvent, lazy, Suspense, useState } from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { LockKeyhole, RadioTower } from 'lucide-react'
import { ApiError, type AuthSession } from '../lib/api'
import { sanitize } from '../lib/sanitize'
import * as authService from '../services/authService'
import { CommandCenterBackground } from '../components/effects/CommandCenterBackground'
import { BrandHero } from '../components/login/BrandHero'
import { CommandButton } from '../components/ui/CommandButton'
import { useT } from '../store'
import { settingsService } from '../services/settingsService'
import { useModuleT } from '../i18n/useModuleT'
import { loginT } from '../i18n/modules/login'
import { publicPagesT } from '../i18n/modules/publicPages'
import '../styles/demo-brand-system.css'
import '../styles/demo-access-entry.css'
import '../styles/login-mono-preview.css'

// Purely decorative (rotating 3D pit-shell background, no data/interaction),
// so it's split off `three`/`@react-three/fiber` (~280KB gzip) as its own
// chunk instead of blocking the login form's initial render/interactivity.
const PitShellVisual = lazy(() =>
  import('../components/login/PitShellVisual').then((m) => ({ default: m.PitShellVisual })),
)

interface Props {
  onAuthenticated: (session: AuthSession) => void
}

export function Login({ onAuthenticated }: Props) {
  const t = useT()
  const tl = useModuleT(loginT)
  const tp = useModuleT(publicPagesT)
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const reduceMotion = useReducedMotion()
  const isPublicDemoAccess = window.location.pathname.replace(/\/+$/, '') === '/acceso-demo'

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    if (!username.trim() || !password.trim()) {
      setError(tl.err_campos_vacios)
      return
    }

    setLoading(true)
    try {
      const session = await authService.login({ username, password })
      onAuthenticated(session)
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 0) {
          setError(tl.err_api_no_disponible)
        } else if (error.status === 401) {
          setError(tl.err_credenciales_invalidas)
        } else if (error.status === 429) {
          setError(tl.err_demasiados_intentos)
        } else if (error.status === 403 || error.status === 503) {
          setError(tl.err_auth_no_disponible)
        } else {
          setError(tl.err_servicio_generico)
        }
      } else {
        setError(tl.err_api_no_disponible)
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <main className={`login-page nm-login-shell nm-responsive-compact login-preview-mono${isPublicDemoAccess ? ' nm-demo-entry' : ''}`}>
      {isPublicDemoAccess && (
        <a className="nm-demo-entry__return" href="/">
          {tp.login.back}
        </a>
      )}
      <CommandCenterBackground />
      <div className="login-backdrop" />

      <div className="login-command-layout nm-login-layout">
        <section className="login-canvas-panel nm-login-visual nm-wireframe-panel" aria-label={tl.visual_aria_label}>
          <Suspense fallback={<div className="login-pit-canvas-fallback" aria-hidden="true" />}>
            <PitShellVisual />
          </Suspense>
          <div className="mine-pit-hud mine-pit-hud-bl" aria-hidden="true">
            <span>RAJO DEMO / COMPAÑÍA DEMO</span>
            <strong>{tl.hud_diseno_mina_real}</strong>
            <small>{tl.hud_dxf_vista_3d}</small>
            <div className="cst-trust-row">
              <div><div className="n">98.4%</div><div className="l">Disponibilidad</div></div>
              <div><div className="n">34/36</div><div className="l">Equipos activos</div></div>
            </div>
          </div>
        </section>

        <motion.section
          className="login-card nm-login-panel"
          initial={reduceMotion ? false : { opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={reduceMotion ? { duration: 0 } : { duration: 0.45, ease: 'easeOut' }}
        >
          <BrandHero />
          {isPublicDemoAccess && (
            <p className="nm-demo-entry__disclosure">
              {tp.login.disclosure}
            </p>
          )}

          <div className="login-copy">
            <h2>{tl.acceso_titulo}</h2>
          </div>

          <form className="login-form" onSubmit={handleSubmit}>
            <label>
              {t.auth.usuario}
              <input
                value={username}
                onChange={(event) => setUsername(sanitize.username(event.target.value))}
                autoComplete="username"
                placeholder={tl.placeholder_usuario}
              />
            </label>
            <label>
              {t.auth.password}
              <input
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                type="password"
                autoComplete="current-password"
                placeholder={tl.placeholder_password}
              />
            </label>

            {error && <div className="login-error">{error}</div>}

            <CommandButton variant="matrix" type="submit" icon={LockKeyhole} loading={loading} disabled={!username.trim() || !password.trim()}>
              {loading ? t.general.cargando : t.auth.ingresar}
            </CommandButton>
          </form>

          <div className="login-status">
            <span><RadioTower size={14} /> Plataforma segura</span>
            <span>{settingsService.isProduction ? tl.status_produccion : tl.status_demo_local}</span>
          </div>
        </motion.section>
      </div>
    </main>
  )
}
