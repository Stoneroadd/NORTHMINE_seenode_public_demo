import { useEffect, useRef, useState } from 'react'
import {
  Check, Eye, Hexagon, KeyRound, Languages, MousePointer2,
  Palette, Rows3, Settings, ShieldCheck, Sparkles, Wand2, X,
} from 'lucide-react'
import { useAppStore, useT } from '../../store'
import type { ThemeId } from '../../store'
import type { LangId } from '../../i18n/translations'
import type { Translations } from '../../i18n/translations'
import { secureApi } from '../../lib/secureApi'
import { MFASetupModal } from '../auth/MFASetupModal'

interface Props {
  open: boolean
  onClose: () => void
}

// ── Theme previews (hardcoded, NOT using CSS vars of active theme) ─────────
const THEME_PREVIEWS: Record<ThemeId, { bg: string; mid: string; accent: string; text: string }> = {
  dark:        { bg: '#050810', mid: '#0C1220', accent: '#00FF88', text: 'rgba(255,255,255,0.9)' },
  operational: { bg: '#050607', mid: '#17191C', accent: '#B8C0C8', text: 'rgba(245,247,250,0.94)' },
  light:       { bg: '#EEF1F5', mid: '#FFFFFF', accent: '#0052CC', text: 'rgba(0,0,0,0.87)' },
  futuristic:  { bg: '#000308', mid: '#020818', accent: '#00FFCC', text: 'rgba(0,255,255,0.95)' },
  minimal:     { bg: '#FAFAFA', mid: '#FFFFFF', accent: '#0055FF', text: '#111111' },
  carbon:      { bg: '#0A0A0A', mid: '#161616', accent: '#FFD700', text: 'rgba(255,255,255,0.92)' },
}

const LANG_OPTIONS: Array<{ id: LangId; flag: string; label: string; native: string }> = [
  { id: 'es', flag: '🇨🇱', label: 'ES', native: 'Español' },
  { id: 'en', flag: '🇺🇸', label: 'EN', native: 'English' },
  { id: 'fr', flag: '🇫🇷', label: 'FR', native: 'Français' },
  { id: 'de', flag: '🇩🇪', label: 'DE', native: 'Deutsch' },
  { id: 'pt', flag: '🇧🇷', label: 'PT', native: 'Português' },
  { id: 'zh', flag: '🇨🇳', label: 'ZH', native: '中文' },
  { id: 'ar', flag: '🇸🇦', label: 'AR', native: 'العربية' },
  { id: 'ru', flag: '🇷🇺', label: 'RU', native: 'Русский' },
]

const EFFECT_ICONS = {
  scanlines: Rows3,
  hexgrid: Hexagon,
  glow: Sparkles,
  cursor: MousePointer2,
  animations: Wand2,
} as const

function themeLabel(t: Translations, id: ThemeId): string {
  const map: Record<ThemeId, string> = {
    dark: t.settings.tema_dark, operational: 'OSCURO NEGRO', light: t.settings.tema_light, futuristic: t.settings.tema_futuristic,
    minimal: t.settings.tema_minimal, carbon: t.settings.tema_carbon,
  }
  return map[id]
}

function themeDesc(t: Translations, id: ThemeId): string {
  const map: Record<ThemeId, string> = {
    dark: t.settings.tema_dark_desc, operational: 'Negro, gris y superficies transparentes', light: t.settings.tema_light_desc, futuristic: t.settings.tema_futuristic_desc,
    minimal: t.settings.tema_minimal_desc, carbon: t.settings.tema_carbon_desc,
  }
  return map[id]
}

function SectionHeader({ icon: Icon, label }: { icon: typeof Settings; label: string }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
      <span style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        width: 22, height: 22, borderRadius: 6,
        background: 'color-mix(in srgb, var(--accent, #00FF88) 14%, transparent)',
        color: 'var(--accent, #00FF88)',
      }}>
        <Icon size={13} />
      </span>
      <span style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--text-tertiary)' }}>
        {label}
      </span>
    </div>
  )
}

function PasswordStrengthBar({ password, t }: { password: string; t: Translations }) {
  const strength = () => {
    let score = 0
    if (password.length >= 10) score++
    if (password.length >= 14) score++
    if (/[A-Z]/.test(password)) score++
    if (/[0-9]/.test(password)) score++
    if (/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) score++
    return score
  }
  const s = strength()
  const label = s <= 2 ? t.settings.pw_fuerza_debil : s <= 4 ? t.settings.pw_fuerza_medio : t.settings.pw_fuerza_fuerte
  const color = s <= 2 ? '#FF2D55' : s <= 4 ? '#FFD700' : '#00FF88'
  const pct = (s / 6) * 100
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 4 }}>
      <div style={{ flex: 1, height: 4, borderRadius: 2, background: 'rgba(255,255,255,0.1)', overflow: 'hidden' }}>
        <div style={{ width: `${pct}%`, height: '100%', background: color, borderRadius: 2, transition: 'width 200ms ease' }} />
      </div>
      <span style={{ fontSize: 10, fontWeight: 700, color, letterSpacing: '0.06em' }}>{label}</span>
    </div>
  )
}

function MFASection() {
  const t = useT()
  const [open, setOpen] = useState(false)
  return (
    <>
      <SectionHeader icon={ShieldCheck} label={t.settings.mfa_titulo} />
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="nm-settings-cta"
        style={{
          padding: '8px 16px', borderRadius: 7,
          border: '1px solid var(--border-bright, rgba(0,255,136,0.3))',
          background: 'rgba(0,255,136,0.12)',
          color: 'var(--accent, #00FF88)', cursor: 'pointer',
          fontSize: 12, fontWeight: 700, fontFamily: 'inherit',
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}
      >
        <ShieldCheck size={14} /> {t.settings.mfa_boton}
      </button>
      <MFASetupModal open={open} onClose={() => setOpen(false)} />
    </>
  )
}

function PasswordChangeForm() {
  const t = useT()
  const [currentPw, setCurrentPw] = useState('')
  const [newPw, setNewPw] = useState('')
  const [confirmPw, setConfirmPw] = useState('')
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null)
  const [loading, setLoading] = useState(false)

  const validate = (): string | null => {
    if (!currentPw) return t.settings.pw_err_actual
    if (!newPw) return t.settings.pw_err_nueva
    if (newPw.length < 10) return t.settings.pw_err_min
    if (!/[A-Z]/.test(newPw)) return t.settings.pw_err_mayus
    if (!/[0-9]/.test(newPw)) return t.settings.pw_err_numero
    if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(newPw)) return t.settings.pw_err_especial
    if (newPw !== confirmPw) return t.settings.pw_err_no_coincide
    return null
  }

  const handleSubmit = async () => {
    const error = validate()
    if (error) {
      setMessage({ type: 'error', text: error })
      return
    }
    setLoading(true)
    setMessage(null)
    try {
      await secureApi.post('/api/auth/change-password', {
        current_password: currentPw,
        new_password: newPw,
      })
      setMessage({ type: 'ok', text: t.settings.pw_exito })
      setCurrentPw('')
      setNewPw('')
      setConfirmPw('')
    } catch (err: any) {
      const detail = err?.response?.data?.detail || t.settings.pw_error_generico
      setMessage({ type: 'error', text: detail })
    } finally {
      setLoading(false)
    }
  }

  const inputStyle: React.CSSProperties = {
    width: '100%',
    padding: '8px 10px',
    borderRadius: 6,
    border: '1px solid var(--border-dim, rgba(255,255,255,0.15))',
    background: 'rgba(0,0,0,0.3)',
    color: 'var(--text-primary, #fff)',
    fontSize: 13,
    fontFamily: 'var(--font-mono, monospace)',
    outline: 'none',
    boxSizing: 'border-box',
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <input style={inputStyle} type="password" placeholder={t.settings.pw_actual} value={currentPw} onChange={(e) => setCurrentPw(e.target.value)} />
      <div>
        <input style={inputStyle} type="password" placeholder={t.settings.pw_nueva} value={newPw} onChange={(e) => setNewPw(e.target.value)} />
        {newPw && <PasswordStrengthBar password={newPw} t={t} />}
      </div>
      <div>
        <input style={inputStyle} type="password" placeholder={t.settings.pw_confirmar} value={confirmPw} onChange={(e) => setConfirmPw(e.target.value)} />
        {confirmPw && newPw !== confirmPw && (
          <span style={{ fontSize: 10, color: '#FF2D55', marginTop: 2, display: 'block' }}>{t.settings.pw_err_no_coincide}</span>
        )}
      </div>
      {message && (
        <div style={{ fontSize: 12, color: message.type === 'ok' ? 'var(--accent, #00FF88)' : '#FF2D55', padding: '4px 0' }}>
          {message.text}
        </div>
      )}
      <button
        type="button"
        disabled={loading}
        className="nm-settings-cta"
        style={{
          padding: '8px 16px',
          borderRadius: 7,
          border: '1px solid var(--border-bright, rgba(0,255,136,0.3))',
          background: loading ? 'rgba(0,255,136,0.05)' : 'rgba(0,255,136,0.12)',
          color: loading ? 'var(--text-secondary)' : 'var(--accent, #00FF88)',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: 12,
          fontWeight: 700,
          alignSelf: 'flex-start',
          display: 'inline-flex', alignItems: 'center', gap: 6,
        }}
        onClick={handleSubmit}
      >
        <KeyRound size={14} /> {loading ? t.settings.pw_cambiando : t.settings.pw_boton}
      </button>
    </div>
  )
}

function ThemePreviewCard({ themeId, isActive, label, desc, onSelect, hovered, onHover, onLeave }: {
  themeId: ThemeId; isActive: boolean; label: string; desc: string
  onSelect: () => void
  hovered: boolean
  onHover: () => void
  onLeave: () => void
}) {
  const p = THEME_PREVIEWS[themeId]
  return (
    <button
      type="button"
      onClick={onSelect}
      onMouseEnter={onHover}
      onMouseLeave={onLeave}
      title={desc}
      style={{
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
        background: 'transparent', border: 'none', cursor: 'pointer', padding: 4,
      }}
    >
      {/* Mini preview */}
      <div style={{
        width: 88, height: 56,
        borderRadius: 6,
        overflow: 'hidden',
        border: `2px solid ${isActive || hovered ? p.accent : 'rgba(255,255,255,0.1)'}`,
        background: p.bg,
        position: 'relative',
        transition: 'border-color 180ms ease, transform 180ms ease',
        transform: hovered && !isActive ? 'translateY(-2px)' : 'none',
        boxShadow: isActive ? `0 0 12px ${p.accent}55` : 'none',
      }}>
        {/* Simulated topbar */}
        <div style={{ height: 10, background: p.mid, borderBottom: `1px solid ${p.accent}44`, display: 'flex', alignItems: 'center', paddingLeft: 5, gap: 3 }}>
          <div style={{ width: 16, height: 5, borderRadius: 2, background: p.accent, opacity: 0.9 }} />
          <div style={{ width: 10, height: 3, borderRadius: 1, background: p.text, opacity: 0.3 }} />
        </div>
        {/* Simulated content */}
        <div style={{ display: 'flex', height: 'calc(100% - 10px)' }}>
          {/* Sidebar sim */}
          <div style={{ width: 18, background: p.mid, borderRight: `1px solid ${p.accent}22` }}>
            {[1,2,3].map(i => <div key={i} style={{ height: 5, margin: '3px 3px', borderRadius: 1, background: p.text, opacity: 0.15 }} />)}
          </div>
          {/* Content sim */}
          <div style={{ flex: 1, padding: '3px 4px', display: 'flex', flexDirection: 'column', gap: 3 }}>
            <div style={{ height: 8, borderRadius: 2, background: p.accent, opacity: 0.9, width: '60%' }} />
            <div style={{ height: 5, borderRadius: 1, background: p.text, opacity: 0.2, width: '80%' }} />
            <div style={{ height: 5, borderRadius: 1, background: p.text, opacity: 0.12, width: '50%' }} />
          </div>
        </div>
        {isActive && (
          <span style={{
            position: 'absolute', top: 3, right: 3,
            width: 12, height: 12, borderRadius: '50%', background: p.accent,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Check size={8} color={p.bg} strokeWidth={4} />
          </span>
        )}
      </div>
      {/* Label */}
      <span style={{ fontSize: 9, fontWeight: 700, letterSpacing: '0.08em', color: isActive ? p.accent : 'rgba(255,255,255,0.5)' }}>
        {label}
      </span>
      <span style={{ fontSize: 8, color: 'rgba(255,255,255,0.35)', maxWidth: 90, textAlign: 'center', lineHeight: 1.2 }}>
        {desc}
      </span>
    </button>
  )
}

function Toggle({ checked, onChange, icon: Icon }: { checked: boolean; onChange: () => void; icon: typeof Settings }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={onChange}
      style={{
        width: 38, height: 21, borderRadius: 11, padding: 2, border: 'none', cursor: 'pointer',
        background: checked ? 'var(--op-green, #00FF88)' : 'rgba(255,255,255,0.15)',
        boxShadow: checked ? `0 0 8px var(--op-green, #00FF88)66` : 'none',
        transition: 'background 200ms ease, box-shadow 200ms ease',
        position: 'relative', flexShrink: 0,
      }}
    >
      <div style={{
        width: 17, height: 17, borderRadius: '50%', background: '#fff',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        position: 'absolute', top: 2,
        left: checked ? 19 : 2,
        transition: 'left 200ms ease',
        boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
      }}>
        <Icon size={10} color={checked ? '#059669' : '#94a3b8'} strokeWidth={2.5} />
      </div>
    </button>
  )
}

export function SettingsPanel({ open, onClose }: Props) {
  const t = useT()
  const themeId = useAppStore((s) => s.themeId)
  const setTheme = useAppStore((s) => s.setTheme)
  const effects = useAppStore((s) => s.effects)
  const toggleEffect = useAppStore((s) => s.toggleEffect)
  const resetEffects = useAppStore((s) => s.resetEffects)
  const lang = useAppStore((s) => s.lang)
  const setLang = useAppStore((s) => s.setLang)
  const [hovered, setHovered] = useState<ThemeId | null>(null)
  const panelRef = useRef<HTMLDivElement>(null)

  // Close on Escape or outside click
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  // Ctrl+Shift+S shortcut (handled in parent — just consume here)

  if (!open) return null

  const previewTheme = hovered ?? themeId
  const activeEffectCount = Object.values(effects).filter(Boolean).length

  return (
    <div
      style={{
        position: 'fixed', inset: 0, zIndex: 600,
        background: 'rgba(0,0,0,0.72)',
        backdropFilter: 'blur(4px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        ref={panelRef}
        style={{
          width: 'min(540px, 95vw)',
          maxHeight: '90vh',
          overflowY: 'auto',
          borderRadius: 16,
          background:
            'radial-gradient(circle at 100% 0%, color-mix(in srgb, var(--accent, #00FF88) 5%, transparent), transparent 40%),'
            + 'var(--bg-panel, #0C1220)',
          border: '1px solid var(--border-mid, rgba(0,212,255,0.18))',
          boxShadow: '0 24px 80px rgba(0,0,0,0.6)',
          padding: '22px 24px',
          display: 'flex',
          flexDirection: 'column',
          gap: 20,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 8, fontWeight: 800, fontSize: 14, letterSpacing: '0.12em', textTransform: 'uppercase', color: 'var(--data-cyan, #00D4FF)' }}>
            <Settings size={16} /> {t.settings.titulo}
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label={t.action.cerrar}
            style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'transparent', border: '1px solid var(--border-dim)', borderRadius: 6, color: 'var(--text-secondary)', cursor: 'pointer', padding: '4px 8px', fontSize: 12 }}
          >
            <X size={13} /> {t.action.cerrar}
          </button>
        </div>

        <div style={{ height: 1, background: 'var(--border-dim)' }} />

        {/* SECCIÓN 1: Apariencia */}
        <div>
          <SectionHeader icon={Palette} label={t.settings.apariencia} />
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {(Object.keys(THEME_PREVIEWS) as ThemeId[]).map(tid => (
              <ThemePreviewCard
                key={tid}
                themeId={tid}
                isActive={themeId === tid}
                label={themeLabel(t, tid)}
                desc={themeDesc(t, tid)}
                onSelect={() => setTheme(tid)}
                hovered={hovered === tid}
                onHover={() => setHovered(tid)}
                onLeave={() => setHovered(null)}
              />
            ))}
          </div>
        </div>

        {/* SECCIÓN 2: Efectos */}
        <div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <SectionHeader icon={Sparkles} label={t.settings.efectos_visuales} />
            <span style={{ fontSize: 10, color: 'var(--text-tertiary)', fontWeight: 700 }}>{activeEffectCount}/5</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px 16px' }}>
            {(Object.keys(EFFECT_ICONS) as Array<keyof typeof EFFECT_ICONS>).map(key => (
              <div key={key} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 10 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 7, fontSize: 13, color: 'var(--text-secondary)' }}>
                  {(() => { const Icon = EFFECT_ICONS[key]; return <Icon size={13} style={{ opacity: 0.7 }} /> })()}
                  {t.settings[`fx_${key}` as const]}
                </span>
                <Toggle checked={effects[key]} onChange={() => toggleEffect(key)} icon={EFFECT_ICONS[key]} />
              </div>
            ))}
          </div>
        </div>

        {/* SECCIÓN 3: Idioma */}
        <div>
          <SectionHeader icon={Languages} label={t.settings.idioma} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 6 }}>
            {LANG_OPTIONS.map(opt => {
              const isActive = lang === opt.id
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setLang(opt.id)}
                  style={{
                    display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 2,
                    padding: '8px 6px',
                    border: `1px solid ${isActive ? 'var(--accent, #00FF88)' : 'var(--border-dim)'}`,
                    borderRadius: 8,
                    background: isActive ? 'rgba(var(--accent-rgb, 0,255,136),0.08)' : 'transparent',
                    cursor: 'pointer',
                    transition: 'all 160ms ease',
                  }}
                >
                  <span style={{ fontSize: 20 }}>{opt.flag}</span>
                  <span style={{ fontSize: 9, fontWeight: 800, color: isActive ? 'var(--accent, #00FF88)' : 'var(--text-secondary)', letterSpacing: '0.06em' }}>{opt.label}</span>
                  <span style={{ fontSize: 9, color: 'var(--text-tertiary)' }}>{opt.native}</span>
                </button>
              )
            })}
          </div>
        </div>

        {/* SECCIÓN 4: Vista previa */}
        <div>
          <SectionHeader icon={Eye} label={t.settings.vista_previa} />
          <div style={{
            height: 90, borderRadius: 8, overflow: 'hidden',
            border: `1px solid ${THEME_PREVIEWS[previewTheme].accent}44`,
            background: THEME_PREVIEWS[previewTheme].bg,
            position: 'relative',
            display: 'flex',
            transition: 'all 300ms ease',
          }}>
            {effects.hexgrid && (
              <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.35,
                backgroundImage: `radial-gradient(${THEME_PREVIEWS[previewTheme].accent}33 1px, transparent 1px)`,
                backgroundSize: '10px 10px',
              }} />
            )}
            {effects.scanlines && (
              <div style={{
                position: 'absolute', inset: 0, pointerEvents: 'none', opacity: 0.25,
                backgroundImage: `repeating-linear-gradient(0deg, ${THEME_PREVIEWS[previewTheme].accent}22 0px, transparent 1px, transparent 3px)`,
              }} />
            )}
            {/* Sidebar sim */}
            <div style={{ width: 50, background: THEME_PREVIEWS[previewTheme].mid, borderRight: `1px solid ${THEME_PREVIEWS[previewTheme].accent}33`, position: 'relative' }}>
              <div style={{ height: 20, borderBottom: `1px solid ${THEME_PREVIEWS[previewTheme].accent}22`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{
                  fontSize: 10, color: THEME_PREVIEWS[previewTheme].accent, fontWeight: 700,
                  textShadow: effects.glow ? `0 0 6px ${THEME_PREVIEWS[previewTheme].accent}` : 'none',
                }}>NM</span>
              </div>
              {[1,2,3,4].map(i => (
                <div key={i} style={{ margin: '5px 6px', height: 7, borderRadius: 2, background: THEME_PREVIEWS[previewTheme].text, opacity: 0.15 }} />
              ))}
            </div>
            {/* Content sim */}
            <div style={{ flex: 1, padding: 10, position: 'relative' }}>
              <div style={{
                fontSize: 10, color: THEME_PREVIEWS[previewTheme].accent, fontWeight: 700, marginBottom: 6,
                textShadow: effects.glow ? `0 0 8px ${THEME_PREVIEWS[previewTheme].accent}` : 'none',
              }}>{t.nav.turno}</div>
              <div style={{ display: 'flex', gap: 6 }}>
                {[1,2,3].map(i => (
                  <div key={i} style={{ flex: 1, height: 40, borderRadius: 5, background: THEME_PREVIEWS[previewTheme].mid, border: `1px solid ${THEME_PREVIEWS[previewTheme].accent}33`, display: 'flex', alignItems: 'flex-end', padding: '4px 6px' }}>
                    <div style={{ height: 6, width: '60%', borderRadius: 2, background: THEME_PREVIEWS[previewTheme].accent, opacity: 0.9 }} />
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* SECCIÓN 5: MFA */}
        <MFASection />

        {/* SECCIÓN 6: Cambiar Contraseña */}
        <div>
          <SectionHeader icon={KeyRound} label={t.settings.cambiar_password} />
          <PasswordChangeForm />
        </div>

        {/* Footer */}
        <div style={{ display: 'flex', justifyContent: 'space-between', gap: 10 }}>
          <button
            type="button"
            style={{
              padding: '8px 14px', borderRadius: 7, border: '1px solid var(--border-dim)',
              background: 'transparent', color: 'var(--text-secondary)', cursor: 'pointer', fontSize: 12,
            }}
            onClick={() => {
              setTheme('dark')
              resetEffects()
              setLang('es')
            }}
          >
            {t.action.restablecer}
          </button>
          <button
            type="button"
            style={{
              padding: '8px 20px', borderRadius: 7,
              border: '1px solid var(--border-bright)',
              background: 'rgba(var(--accent-rgb,0,255,136),0.12)',
              color: 'var(--accent, #00FF88)', cursor: 'pointer', fontSize: 12, fontWeight: 700,
            }}
            onClick={onClose}
          >
            {t.action.cerrar}
          </button>
        </div>
      </div>
    </div>
  )
}
