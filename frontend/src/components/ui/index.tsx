import React from 'react'
import { useModuleT } from '../../i18n/useModuleT'
import { uiT } from '../../i18n/modules/ui'

// ── TIPOS ──────────────────────────────────────────────────────────────────
type Color = 'green' | 'cyan' | 'orange' | 'yellow' | 'red' | 'purple' | 'white'

const COLOR_MAP: Record<Color, string> = {
  green:  'var(--op-green)',
  cyan:   'var(--data-cyan)',
  orange: 'var(--alert-orange)',
  yellow: 'var(--warn-yellow)',
  red:    'var(--danger-red)',
  purple: '#BF5FFF',
  white:  'rgba(255,255,255,0.85)',
}
const GLOW_MAP: Record<Color, string> = {
  green:  'var(--op-green-glow)',
  cyan:   'var(--data-cyan-glow)',
  orange: 'var(--alert-glow)',
  yellow: '0 0 20px rgba(255,209,0,0.4)',
  red:    '0 0 20px rgba(255,45,85,0.4)',
  purple: '0 0 20px rgba(191,95,255,0.4)',
  white:  'none',
}

// ── SPINNER ────────────────────────────────────────────────────────────────
export const Spinner: React.FC<{ size?: number; color?: Color }> = ({
  size = 24, color = 'cyan'
}) => (
  <div style={{
    width: size, height: size, borderRadius: '50%',
    border: `2px solid var(--border-dim)`,
    borderTopColor: COLOR_MAP[color],
    animation: 'spin 0.7s linear infinite',
    flexShrink: 0,
  }}/>
)

// ── LOADING STATE ──────────────────────────────────────────────────────────
export const LoadingPanel: React.FC<{ msg?: string }> = ({ msg }) => {
  const t = useModuleT(uiT)
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 16, padding: '60px 0',
      color: 'var(--text-tertiary)',
      fontFamily: 'var(--font-mono)', fontSize: 13,
    }}>
      <Spinner size={32}/>
      <span>{msg ?? t.loading}</span>
    </div>
  )
}

// ── BADGE ──────────────────────────────────────────────────────────────────
export const Badge: React.FC<{
  children: React.ReactNode
  color?: Color
  variant?: 'solid' | 'outline' | 'glow'
  size?: 'sm' | 'md' | 'lg'
  pulse?: boolean
}> = ({ children, color = 'green', variant = 'outline', size = 'md', pulse }) => {
  const c = COLOR_MAP[color]
  const sizes = { sm: '10px 8px', md: '13px 12px', lg: '14px 16px' }
  const pad   = { sm: '2px 8px', md: '4px 12px', lg: '6px 16px' }

  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: pad[size],
      borderRadius: 'var(--r-sm)',
      fontSize: sizes[size],
      fontFamily: 'var(--font-label)',
      fontWeight: 700,
      letterSpacing: '1.5px',
      textTransform: 'uppercase',
      color: variant === 'solid' ? '#000' : c,
      background: variant === 'solid' ? c : `${c}18`,
      border: `1px solid ${variant === 'solid' ? c : `${c}44`}`,
      boxShadow: variant === 'glow' ? GLOW_MAP[color] : 'none',
      animation: pulse ? 'pulseGlow 2s ease-in-out infinite' : 'none',
    }}>
      {pulse && (
        <span style={{
          width: 6, height: 6, borderRadius: '50%',
          background: c, flexShrink: 0,
          animation: 'pulse 1.5s ease-in-out infinite',
        }}/>
      )}
      {children}
    </span>
  )
}

// ── PROGRESS BAR ───────────────────────────────────────────────────────────
export const ProgressBar: React.FC<{
  pct: number
  color?: Color
  height?: number
  showLabel?: boolean
  animated?: boolean
}> = ({ pct, color = 'green', height = 8, showLabel, animated = true }) => {
  const c  = COLOR_MAP[color]
  const cp = Math.min(Math.max(pct, 0), 100)

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      {showLabel && (
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          fontSize: 11, fontFamily: 'var(--font-mono)',
          color: 'var(--text-tertiary)',
        }}>
          <span>0</span>
          <span style={{ color: c, fontWeight: 600 }}>{pct.toFixed(1)}%</span>
          <span>100%</span>
        </div>
      )}
      <div style={{
        background: 'rgba(255,255,255,0.06)',
        borderRadius: height, height,
        overflow: 'hidden',
        position: 'relative',
      }}>
        {/* Scanline effect */}
        <div style={{
          position: 'absolute', inset: 0,
          background: `repeating-linear-gradient(
            90deg,
            transparent, transparent 4px,
            rgba(0,0,0,0.1) 4px, rgba(0,0,0,0.1) 5px
          )`,
          zIndex: 1,
        }}/>
        <div style={{
          width: `${cp}%`, height: '100%',
          background: `linear-gradient(90deg, ${c}cc, ${c})`,
          borderRadius: height,
          boxShadow: `0 0 ${height * 2}px ${c}66`,
          animation: animated ? `barGrow var(--dur-slow) var(--ease-out)` : 'none',
          position: 'relative', zIndex: 2,
        }}/>
      </div>
    </div>
  )
}

// ── STAT CARD ──────────────────────────────────────────────────────────────
export const StatCard: React.FC<{
  label: string
  value: string | number
  sub?: string
  color?: Color
  icon?: string
  trend?: number
  onClick?: () => void
  style?: React.CSSProperties
}> = ({ label, value, sub, color = 'cyan', icon, trend, onClick, style }) => {
  const c = COLOR_MAP[color]
  const [hovered, setHovered] = React.useState(false)

  return (
    <div
      onClick={onClick}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        background: hovered ? 'var(--bg-elevated)' : 'var(--bg-card)',
        border: `1px solid ${hovered ? `${c}44` : 'var(--border-dim)'}`,
        borderTop: `2px solid ${c}`,
        borderRadius: 'var(--r-lg)',
        padding: '16px 20px',
        cursor: onClick ? 'pointer' : 'default',
        transition: `all var(--dur-med) var(--ease-out)`,
        transform: hovered ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: hovered ? `0 12px 32px rgba(0,0,0,0.4), 0 0 24px ${c}22` : 'none',
        position: 'relative',
        overflow: 'hidden',
        ...style,
      }}
    >
      {/* Corner accent */}
      <div style={{
        position: 'absolute', top: 0, right: 0,
        width: 40, height: 40,
        background: `linear-gradient(225deg, ${c}22, transparent)`,
        clipPath: 'polygon(100% 0, 0 0, 100% 100%)',
      }}/>

      <div style={{
        fontSize: 10, fontFamily: 'var(--font-label)',
        fontWeight: 600, letterSpacing: '2px',
        textTransform: 'uppercase',
        color: 'var(--text-tertiary)',
        marginBottom: 10,
        display: 'flex', alignItems: 'center', gap: 6,
      }}>
        {icon && <span style={{ fontSize: 12 }}>{icon}</span>}
        {label}
      </div>

      <div style={{
        fontFamily: 'var(--font-mono)',
        fontSize: typeof value === 'string' && value.length > 8 ? '1.8rem' : '2.2rem',
        fontWeight: 700,
        color: c,
        lineHeight: 1,
        marginBottom: 6,
        textShadow: hovered ? `0 0 24px ${c}88` : 'none',
        transition: 'text-shadow var(--dur-med)',
        animation: 'countUp var(--dur-slow) var(--ease-out)',
      }}>
        {value}
      </div>

      {(sub || trend !== undefined) && (
        <div style={{
          fontSize: 12, fontFamily: 'var(--font-label)',
          color: 'var(--text-tertiary)',
          display: 'flex', alignItems: 'center', gap: 8,
        }}>
          {trend !== undefined && (
            <span style={{
              color: trend >= 0 ? 'var(--op-green)' : 'var(--danger-red)',
              fontWeight: 600,
            }}>
              {trend >= 0 ? '▲' : '▼'} {Math.abs(trend).toFixed(1)}%
            </span>
          )}
          {sub && <span>{sub}</span>}
        </div>
      )}
    </div>
  )
}

// ── SECTION TITLE ──────────────────────────────────────────────────────────
export const SectionTitle: React.FC<{
  children: React.ReactNode
  color?: Color
  right?: React.ReactNode
  sub?: string
}> = ({ children, color = 'cyan', right, sub }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'flex-start', marginBottom: 20,
  }}>
    <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <div style={{
          width: 2, height: 18,
          background: COLOR_MAP[color],
          boxShadow: GLOW_MAP[color],
          borderRadius: 1,
          flexShrink: 0,
        }}/>
        <h2 style={{
          fontFamily: 'var(--font-display)',
          fontSize: 17,
          fontWeight: 600,
          letterSpacing: '2px',
          textTransform: 'uppercase',
          color: 'var(--text-primary)',
        }}>
          {children}
        </h2>
      </div>
      {sub && (
        <span style={{
          fontSize: 11, fontFamily: 'var(--font-mono)',
          color: 'var(--text-tertiary)', marginLeft: 12,
        }}>
          {sub}
        </span>
      )}
    </div>
    {right}
  </div>
)

// ── PANEL ──────────────────────────────────────────────────────────────────
export const Panel: React.FC<{
  children: React.ReactNode
  style?: React.CSSProperties
  accent?: Color
  className?: string
}> = ({ children, style, accent }) => (
  <div style={{
    background: 'var(--bg-panel)',
    border: `1px solid var(--border-dim)`,
    borderLeft: accent ? `2px solid ${COLOR_MAP[accent]}` : undefined,
    borderRadius: 'var(--r-lg)',
    padding: 'var(--gap-lg)',
    position: 'relative',
    overflow: 'hidden',
    ...style,
  }}>
    {/* Top shine */}
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0,
      height: 1,
      background: 'linear-gradient(90deg, transparent, rgba(0,212,255,0.15), transparent)',
    }}/>
    {children}
  </div>
)

// ── BUTTON ─────────────────────────────────────────────────────────────────
export const Button: React.FC<{
  children: React.ReactNode
  onClick?: () => void
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger'
  color?: Color
  size?: 'sm' | 'md' | 'lg'
  disabled?: boolean
  loading?: boolean
  icon?: string
  style?: React.CSSProperties
}> = ({ children, onClick, variant = 'secondary', color = 'cyan',
        size = 'md', disabled, loading, icon, style }) => {
  const c   = COLOR_MAP[color]
  const [h, setH] = React.useState(false)
  const sizes = {
    sm: { padding: '6px 14px', fontSize: 11 },
    md: { padding: '9px 20px', fontSize: 13 },
    lg: { padding: '12px 28px', fontSize: 15 },
  }

  const bg = variant === 'primary'
    ? (h ? `${c}dd` : c)
    : variant === 'ghost'
      ? (h ? `${c}12` : 'transparent')
      : (h ? `${c}22` : `${c}12`)

  return (
    <button
      onClick={disabled || loading ? undefined : onClick}
      onMouseEnter={() => setH(true)}
      onMouseLeave={() => setH(false)}
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 8,
        ...sizes[size],
        background: bg,
        border: `1px solid ${variant === 'ghost' ? 'transparent' : `${c}44`}`,
        borderRadius: 'var(--r-sm)',
        color: variant === 'primary' ? '#000' : c,
        fontFamily: 'var(--font-label)',
        fontWeight: 700,
        letterSpacing: '1px',
        textTransform: 'uppercase',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        transition: `all var(--dur-fast) var(--ease-out)`,
        transform: h && !disabled ? 'translateY(-1px)' : 'none',
        boxShadow: h && !disabled ? `0 4px 16px ${c}33` : 'none',
        outline: 'none',
        ...style,
      }}
    >
      {loading ? <Spinner size={14} color={color}/> : icon && <span>{icon}</span>}
      {children}
    </button>
  )
}

// ── HUD CORNER ─────────────────────────────────────────────────────────────
export const HudCorner: React.FC<{
  position: 'tl' | 'tr' | 'bl' | 'br'
  color?: Color
  size?: number
}> = ({ position, color = 'cyan', size = 12 }) => {
  const c = COLOR_MAP[color]
  const pos = {
    tl: { top: 0, left: 0, borderTop: `2px solid ${c}`, borderLeft: `2px solid ${c}` },
    tr: { top: 0, right: 0, borderTop: `2px solid ${c}`, borderRight: `2px solid ${c}` },
    bl: { bottom: 0, left: 0, borderBottom: `2px solid ${c}`, borderLeft: `2px solid ${c}` },
    br: { bottom: 0, right: 0, borderBottom: `2px solid ${c}`, borderRight: `2px solid ${c}` },
  }
  return (
    <div style={{
      position: 'absolute',
      width: size, height: size,
      ...pos[position],
    }}/>
  )
}

// ── DIVIDER ────────────────────────────────────────────────────────────────
export const Divider: React.FC<{ color?: Color; my?: number }> = ({
  color = 'cyan', my = 20
}) => (
  <div style={{
    height: 1,
    margin: `${my}px 0`,
    background: `linear-gradient(90deg, transparent, ${COLOR_MAP[color]}33, transparent)`,
  }}/>
)

// ── TOOLTIP ────────────────────────────────────────────────────────────────
export const ChartTooltip: React.FC<{
  active?: boolean
  payload?: Array<{ name: string; value: number; color: string }>
  label?: string
}> = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null
  return (
    <div style={{
      background: 'var(--bg-elevated)',
      border: '1px solid var(--border-mid)',
      borderRadius: 'var(--r-md)',
      padding: '10px 14px',
      fontSize: 12,
      fontFamily: 'var(--font-mono)',
      boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
    }}>
      {label && (
        <div style={{
          color: 'var(--text-tertiary)',
          marginBottom: 6, fontSize: 11,
          fontFamily: 'var(--font-label)',
          letterSpacing: 1,
        }}>
          {label}
        </div>
      )}
      {payload.map((p, i) => (
        <div key={i} style={{
          color: p.color || 'var(--data-cyan)',
          fontWeight: 600,
          display: 'flex', justifyContent: 'space-between', gap: 16,
        }}>
          <span style={{ color: 'var(--text-tertiary)' }}>{p.name}</span>
          <span>{typeof p.value === 'number'
            ? p.value.toLocaleString('es-CL')
            : p.value}
          </span>
        </div>
      ))}
    </div>
  )
}
