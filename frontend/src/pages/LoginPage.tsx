import React, { useState } from 'react'
import { useAppStore, useT } from '../store'
import { Spinner } from '../components/ui'
import { secureApi } from '../lib/secureApi'

export const LoginPage: React.FC = () => {
  const { setUsuario, setSistema, lang, toggleLang } = useAppStore()
  const t = useT()

  const [usuario,  setUsuarioInput] = useState('')
  const [password, setPassword]     = useState('')
  const [loading,  setLoading]      = useState(false)
  const [error,    setError]        = useState('')
  const [focused,  setFocused]      = useState<'u'|'p'|null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!usuario || !password) return
    setLoading(true)
    setError('')

    try {
      const { data } = await secureApi.post('/api/auth/login', { username: usuario, password })
      setUsuario({
        id:      data.user_id ?? usuario,
        nombre:  data.nombre  ?? usuario,
        rol:     data.rol     ?? 'admin',
        faena:   data.faena   ?? 'Rajo DES',
        empresa: data.empresa ?? 'TEPSAC',
        token:   data.access_token,
      })
      setSistema({
        modo: data.modo === 'sql' ? 'sql' : 'produccion',
        conexionSQL: data.sql_disponible ?? false,
        ultimaActualizacion: new Date().toISOString(),
      })
    } catch {
      setError(t.auth.error_login)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden',
    }}>
      {/* Background radial */}
      <div style={{
        position: 'absolute', inset: 0,
        background: `
          radial-gradient(ellipse 60% 50% at 50% 50%,
            rgba(0,212,255,0.07) 0%, transparent 70%),
          radial-gradient(ellipse 40% 30% at 20% 80%,
            rgba(0,255,136,0.04) 0%, transparent 60%)
        `,
      }}/>

      {/* Scan line animada */}
      <div style={{
        position: 'absolute', left: 0, right: 0,
        height: 2,
        background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.3), transparent)',
        animation: 'scanLine 6s linear infinite',
        pointerEvents: 'none',
      }}/>

      {/* Lang toggle */}
      <button
        onClick={toggleLang}
        style={{
          position: 'absolute', top: 20, right: 20,
          background: 'var(--data-cyan-dim)',
          border: '1px solid var(--border-mid)',
          borderRadius: 'var(--r-sm)',
          padding: '5px 12px',
          fontFamily: 'var(--font-mono)',
          fontSize: 11, fontWeight: 700,
          color: 'var(--data-cyan)',
          cursor: 'pointer', letterSpacing: '1px',
        }}
      >
        {lang === 'es' ? 'EN' : 'ES'}
      </button>

      {/* Card */}
      <div style={{
        width: '100%', maxWidth: 420,
        position: 'relative',
        animation: 'fadeUp 0.6s var(--ease-out)',
      }}>
        {/* HUD corners */}
        {(['tl','tr','bl','br'] as const).map(pos => (
          <div key={pos} style={{
            position: 'absolute',
            width: 16, height: 16,
            ...(pos.includes('t') ? { top: -2 } : { bottom: -2 }),
            ...(pos.includes('l') ? { left: -2 } : { right: -2 }),
            borderTop:    pos.includes('t') ? '2px solid var(--data-cyan)' : undefined,
            borderBottom: pos.includes('b') ? '2px solid var(--data-cyan)' : undefined,
            borderLeft:   pos.includes('l') ? '2px solid var(--data-cyan)' : undefined,
            borderRight:  pos.includes('r') ? '2px solid var(--data-cyan)' : undefined,
          }}/>
        ))}

        <div style={{
          background: 'var(--bg-panel)',
          border: '1px solid var(--border-dim)',
          borderRadius: 'var(--r-xl)',
          padding: '48px 40px',
          backdropFilter: 'blur(20px)',
        }}>
          {/* Logo */}
          <div style={{ textAlign: 'center', marginBottom: 40 }}>
            <div style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
              width: 56, height: 56,
              background: 'linear-gradient(135deg, var(--op-green-dim), var(--data-cyan-dim))',
              border: '1px solid var(--data-cyan)',
              borderRadius: 'var(--r-lg)',
              fontSize: 28, marginBottom: 16,
              boxShadow: 'var(--data-cyan-glow)',
              animation: 'pulseGlow 3s ease-in-out infinite',
            }}>
              ⛏
            </div>

            <h1 style={{
              fontFamily: 'var(--font-display)',
              fontSize: '2rem', fontWeight: 700,
              letterSpacing: '4px',
              color: 'var(--text-primary)',
              lineHeight: 1, marginBottom: 6,
            }}>
              NORTHMINE
            </h1>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: 10, letterSpacing: '3px',
              color: 'var(--data-cyan)',
            }}>
              {t.auth.subtitulo.toUpperCase()}
            </div>
          </div>

          {/* Línea decorativa */}
          <div style={{
            height: 1, marginBottom: 32,
            background: 'linear-gradient(90deg, transparent, var(--border-mid), transparent)',
          }}/>

          {/* Form */}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Usuario */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{
                fontFamily: 'var(--font-mono)', fontSize: 10,
                letterSpacing: '2px', color: 'var(--text-tertiary)',
                textTransform: 'uppercase',
              }}>
                {t.auth.usuario}
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: 12, top: '50%',
                  transform: 'translateY(-50%)',
                  color: focused === 'u' ? 'var(--data-cyan)' : 'var(--text-disabled)',
                  fontSize: 14, transition: 'color var(--dur-fast)',
                }}>◈</span>
                <input
                  type="text"
                  value={usuario}
                  onChange={e => setUsuarioInput(e.target.value)}
                  onFocus={() => setFocused('u')}
                  onBlur={() => setFocused(null)}
                  placeholder="usuario"
                  autoComplete="username"
                  style={{
                    width: '100%',
                    background: focused === 'u' ? 'var(--bg-elevated)' : 'var(--bg-card)',
                    border: `1px solid ${focused === 'u' ? 'var(--data-cyan)' : 'var(--border-dim)'}`,
                    borderRadius: 'var(--r-md)',
                    padding: '11px 12px 11px 36px',
                    fontFamily: 'var(--font-mono)', fontSize: 14,
                    color: 'var(--text-primary)',
                    outline: 'none',
                    transition: 'all var(--dur-fast)',
                    boxShadow: focused === 'u' ? 'var(--data-cyan-glow)' : 'none',
                  }}
                />
              </div>
            </div>

            {/* Password */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <label style={{
                fontFamily: 'var(--font-mono)', fontSize: 10,
                letterSpacing: '2px', color: 'var(--text-tertiary)',
                textTransform: 'uppercase',
              }}>
                {t.auth.password}
              </label>
              <div style={{ position: 'relative' }}>
                <span style={{
                  position: 'absolute', left: 12, top: '50%',
                  transform: 'translateY(-50%)',
                  color: focused === 'p' ? 'var(--data-cyan)' : 'var(--text-disabled)',
                  fontSize: 14, transition: 'color var(--dur-fast)',
                }}>◉</span>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onFocus={() => setFocused('p')}
                  onBlur={() => setFocused(null)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  style={{
                    width: '100%',
                    background: focused === 'p' ? 'var(--bg-elevated)' : 'var(--bg-card)',
                    border: `1px solid ${focused === 'p' ? 'var(--data-cyan)' : 'var(--border-dim)'}`,
                    borderRadius: 'var(--r-md)',
                    padding: '11px 12px 11px 36px',
                    fontFamily: 'var(--font-mono)', fontSize: 14,
                    color: 'var(--text-primary)',
                    outline: 'none',
                    transition: 'all var(--dur-fast)',
                    boxShadow: focused === 'p' ? 'var(--data-cyan-glow)' : 'none',
                  }}
                />
              </div>
            </div>

            {/* Error */}
            {error && (
              <div style={{
                padding: '10px 14px',
                background: 'var(--danger-dim)',
                border: '1px solid var(--danger-red)44',
                borderRadius: 'var(--r-md)',
                fontFamily: 'var(--font-mono)', fontSize: 12,
                color: 'var(--danger-red)',
                animation: 'fadeIn var(--dur-fast)',
              }}>
                ⚠ {error}
              </div>
            )}

            {/* Submit */}
            <button
              type="submit"
              disabled={loading || !usuario || !password}
              style={{
                marginTop: 8,
                background: loading || !usuario || !password
                  ? 'var(--bg-elevated)'
                  : 'linear-gradient(135deg, var(--op-green), var(--data-cyan))',
                border: 'none',
                borderRadius: 'var(--r-md)',
                padding: '13px',
                fontFamily: 'var(--font-display)',
                fontSize: 15, fontWeight: 700,
                letterSpacing: '3px', textTransform: 'uppercase',
                color: loading || !usuario || !password
                  ? 'var(--text-disabled)'
                  : '#000',
                cursor: loading || !usuario || !password ? 'not-allowed' : 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
                transition: 'all var(--dur-med)',
                boxShadow: !loading && usuario && password
                  ? '0 4px 24px rgba(0,255,136,0.3)'
                  : 'none',
              }}
            >
              {loading ? <Spinner size={16} color="green"/> : null}
              {loading ? '...' : t.auth.ingresar}
            </button>
          </form>

          {/* Real-only login */}
          <div style={{
            display: 'none',
            marginTop: 24,
            padding: '10px 14px',
            background: 'var(--warn-dim)',
            border: '1px solid var(--warn-yellow)33',
            borderRadius: 'var(--r-md)',
            fontFamily: 'var(--font-mono)', fontSize: 10,
            color: 'var(--warn-yellow)', letterSpacing: '0.5px',
            lineHeight: 1.6,
          }}>
            Autenticacion real requerida.
          </div>
        </div>
      </div>
    </div>
  )
}
