import { useState } from 'react'
import { secureApi } from '../../lib/secureApi'
import { useModuleT } from '../../i18n/useModuleT'
import { authModuleT } from '../../i18n/modules/auth'

interface Props {
  open: boolean
  onClose: () => void
}

export function MFASetupModal({ open, onClose }: Props) {
  const t = useModuleT(authModuleT)
  const [step, setStep] = useState<'loading' | 'setup' | 'verify' | 'done'>('loading')
  const [secret, setSecret] = useState('')
  const [qrBase64, setQrBase64] = useState('')
  const [backupCodes, setBackupCodes] = useState<string[]>([])
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)

  const startSetup = async () => {
    setStep('loading')
    setError('')
    try {
      const resp = await secureApi.post('/api/auth/mfa/setup', {})
      setSecret(resp.data.secret)
      setQrBase64(resp.data.qr_base64)
      setBackupCodes(resp.data.backup_codes || [])
      setStep('setup')
    } catch {
      setError(t.err_iniciar_config)
      setStep('setup')
    }
  }

  const verifyAndEnable = async () => {
    if (!code || code.length < 1) {
      setError(t.err_codigo_requerido)
      return
    }
    setSaving(true)
    setError('')
    try {
      await secureApi.post('/api/auth/mfa/verify', { code })
      setStep('done')
    } catch (err: any) {
      setError(err?.response?.data?.detail || t.err_codigo_invalido)
    } finally {
      setSaving(false)
    }
  }

  if (!open) return null

  if (step === 'loading') {
    startSetup()
  }

  const overlayStyle: React.CSSProperties = {
    position: 'fixed', inset: 0, zIndex: 700,
    background: 'rgba(0,0,0,0.72)',
    backdropFilter: 'blur(4px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
  }

  const panelStyle: React.CSSProperties = {
    width: 'min(420px, 92vw)',
    borderRadius: 16,
    background: 'var(--bg-panel, #0C1220)',
    border: '1px solid var(--border-mid, rgba(0,212,255,0.18))',
    boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
    padding: '22px 24px',
    display: 'flex', flexDirection: 'column', gap: 16,
  }

  return (
    <div style={overlayStyle} onClick={(e) => { if (e.target === e.currentTarget && step !== 'loading') onClose() }}>
      <div style={panelStyle} onClick={(e) => e.stopPropagation()}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ fontWeight: 800, fontSize: 14, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--data-cyan, #00D4FF)' }}>
            {t.mfa_titulo}
          </span>
          {step !== 'loading' && (
            <button onClick={onClose} style={{ background: 'transparent', border: '1px solid var(--border-dim)', borderRadius: 6, color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px 8px', fontSize: 12, fontFamily: 'inherit' }}>
              {t.cerrar}
            </button>
          )}
        </div>

        <div style={{ height: 1, background: 'var(--border-dim)' }} />

        {step === 'loading' && (
          <div style={{ textAlign: 'center', padding: '24px 0', color: 'var(--text-secondary)', fontSize: 13 }}>
            {t.configurando}
          </div>
        )}

        {step === 'setup' && (
          <>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', lineHeight: 1.5 }}>
              {t.escanear_qr}
            </div>

            {qrBase64 && (
              <div style={{ textAlign: 'center', padding: 8 }}>
                <img src={`data:image/png;base64,${qrBase64}`} alt={t.qr_alt} style={{ width: 160, height: 160, borderRadius: 8, border: '1px solid var(--border-dim)' }} />
              </div>
            )}

            <div style={{ fontSize: 12, color: 'var(--text-tertiary)', textAlign: 'center' }}>
              {t.ingresar_manual} <span style={{ fontFamily: 'monospace', color: 'var(--accent, #00FF88)', fontWeight: 700, fontSize: 13 }}>{secret}</span>
            </div>

            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 8 }}>
              {t.codigos_respaldo}
            </div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'center' }}>
              {backupCodes.map((bc, idx) => (
                <span key={idx} style={{ fontFamily: 'monospace', fontSize: 12, padding: '3px 8px', background: 'rgba(0,0,0,0.3)', borderRadius: 4, border: '1px solid var(--border-dim)', color: 'var(--text-secondary)' }}>
                  {bc}
                </span>
              ))}
            </div>

            <div style={{ height: 1, background: 'var(--border-dim)' }} />

            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 4 }}>
              {t.ingresar_codigo_activar}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                placeholder={t.placeholder_codigo}
                style={{
                  flex: 1, padding: '8px 10px', borderRadius: 6,
                  border: '1px solid var(--border-dim, rgba(255,255,255,0.15))',
                  background: 'rgba(0,0,0,0.3)', color: 'var(--text-primary, #fff)',
                  fontSize: 18, fontFamily: 'monospace', textAlign: 'center',
                  letterSpacing: '0.3em', outline: 'none',
                }}
                maxLength={6}
              />
            </div>

            {error && <div style={{ fontSize: 12, color: '#FF2D55', padding: '4px 0' }}>{error}</div>}

            <button
              type="button"
              disabled={saving}
              onClick={verifyAndEnable}
              style={{
                padding: '10px 20px', borderRadius: 7,
                border: '1px solid var(--border-bright, rgba(0,255,136,0.3))',
                background: saving ? 'rgba(0,255,136,0.05)' : 'rgba(0,255,136,0.12)',
                color: saving ? 'var(--text-secondary)' : 'var(--accent, #00FF88)',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: 13, fontWeight: 700, fontFamily: 'inherit',
              }}
            >
              {saving ? t.btn_verificando : t.btn_activar}
            </button>
          </>
        )}

        {step === 'done' && (
          <div style={{ textAlign: 'center', padding: '16px 0' }}>
            <div style={{ fontSize: 32, marginBottom: 8 }}>✅</div>
            <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--accent, #00FF88)', marginBottom: 8 }}>
              {t.mfa_activado_titulo}
            </div>
            <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 16 }}>
              {t.mfa_activado_desc}
            </div>
            <button
              type="button"
              onClick={onClose}
              style={{
                padding: '8px 24px', borderRadius: 7,
                border: '1px solid var(--border-bright)',
                background: 'rgba(var(--accent-rgb,0,255,136),0.12)',
                color: 'var(--accent, #00FF88)', cursor: 'pointer',
                fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
              }}
            >
              {t.cerrar}
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
