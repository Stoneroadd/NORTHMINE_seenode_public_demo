import { FormEvent, lazy, Suspense, useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { CirclePlay, LockKeyhole, RadioTower } from 'lucide-react'
import { ApiError, type AuthSession } from '../lib/api'
import { sanitize } from '../lib/sanitize'
import * as authService from '../services/authService'
import { CommandCenterBackground } from '../components/effects/CommandCenterBackground'
import { CursorGlow } from '../components/effects/CursorGlow'
import { BrandHero } from '../components/login/BrandHero'
import { CommandButton } from '../components/ui/CommandButton'
import { useTilt3D } from '../hooks/useTilt3D'
import { useT } from '../store'
import { settingsService } from '../services/settingsService'
import { useModuleT } from '../i18n/useModuleT'
import { loginT } from '../i18n/modules/login'

const PitShellVisual = lazy(() => import('../components/login/PitShellVisual').then(m => ({ default: m.PitShellVisual })))

interface Props {
  onAuthenticated: (session: AuthSession) => void
}

export function Login({ onAuthenticated }: Props) {
  const t = useT()
  const tl = useModuleT(loginT)
  const [username, setUsername] = useState(settingsService.isDemoLike ? 'admin' : '')
  const [password, setPassword] = useState(settingsService.isDemoLike ? 'admin' : '')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPitVisual, setShowPitVisual] = useState(!settingsService.demoLite)
  const tilt = useTilt3D({ maxTilt: 3, scale: 1.01 })

  useEffect(() => {
    if (showPitVisual) return
    const timer = window.setTimeout(() => setShowPitVisual(true), 650)
    return () => window.clearTimeout(timer)
  }, [showPitVisual])

  const submitCredentials = async (credentials: { username: string; password: string }) => {
    setLoading(true)
    try {
      const session = await authService.login(credentials)
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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')

    if (!username.trim() || !password.trim()) {
      setError(tl.err_campos_vacios)
      return
    }

    await submitCredentials({ username, password })
  }

  const handleDemoAccess = async () => {
    setError('')
    setUsername('admin')
    setPassword('admin')
    await submitCredentials({ username: 'admin', password: 'admin' })
  }

  return (
    <main className="login-page nm-login-shell nm-responsive-compact">
      <CommandCenterBackground />
      <CursorGlow />
      <div className="login-backdrop" />

      <div className="login-command-layout nm-login-layout">
        <section className="login-canvas-panel nm-login-visual nm-wireframe-panel" aria-label={tl.visual_aria_label}>
          <div className="login-pit-placeholder" aria-hidden="true" />
          {showPitVisual && (
            <Suspense fallback={null}>
              <PitShellVisual compact={settingsService.demoLite} />
            </Suspense>
          )}
          <div className="mine-pit-hud mine-pit-hud-bl" aria-hidden="true">
            <span>RAJO DEMO / COMPAÑÍA DEMO</span>
            <strong>{tl.hud_diseno_mina_real}</strong>
            <small>{tl.hud_dxf_vista_3d}</small>
          </div>
        </section>

        <motion.section
          className="login-card nm-login-panel"
          initial={{ opacity: 0, y: 18, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.45, ease: 'easeOut' }}
        >
          <div style={tilt.style} onPointerMove={tilt.onPointerMove} onPointerLeave={tilt.onPointerLeave}>
            <BrandHero />

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
              {settingsService.isDemoLike && (
                <CommandButton className="demo-quick-access" variant="secondary" type="button" icon={CirclePlay} loading={loading} onClick={handleDemoAccess}>
                  {tl.demo_quick_access}
                </CommandButton>
              )}
            </form>

            <div className="login-status">
              <span><RadioTower size={14} /> API FastAPI</span>
              <span>{settingsService.isProduction ? tl.status_produccion : tl.status_demo_local}</span>
            </div>
          </div>
        </motion.section>
      </div>
    </main>
  )
}
