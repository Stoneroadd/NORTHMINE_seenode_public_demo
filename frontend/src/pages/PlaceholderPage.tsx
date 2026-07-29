import React from 'react'
import { useAppStore, useT } from '../store'
import { Panel, SectionTitle, Badge } from '../components/ui'

// ── TURNO ACTUAL ───────────────────────────────────────────────────────────
export const TurnoPage: React.FC = () => {
  const t = useT()
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
        {[
          { l: '⚡ TON DEL TURNO', v: '61,650 t', c: 'var(--op-green)' },
          { l: '🎯 % META TURNO',  v: '85.3%',   c: 'var(--warn-yellow)' },
          { l: '🔄 CICLOS',        v: '283',       c: 'var(--data-cyan)' },
          { l: '🚧 CAEX ACTIVOS',  v: '20 / 38',  c: 'var(--warn-yellow)' },
          { l: '⌀ PROM/CICLO',     v: '218 t',    c: '#BF5FFF' },
        ].map(item => (
          <div key={item.l} style={{
            background: 'var(--bg-card)',
            border: '1px solid var(--border-dim)',
            borderTop: `2px solid ${item.c}`,
            borderRadius: 'var(--r-lg)', padding: '16px 20px',
            transition: 'all var(--dur-med) var(--ease-out)',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform='translateY(-3px)'; e.currentTarget.style.boxShadow=`0 12px 32px rgba(0,0,0,0.4)` }}
          onMouseLeave={e => { e.currentTarget.style.transform='translateY(0)'; e.currentTarget.style.boxShadow='none' }}>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '2px', color: 'var(--text-tertiary)', marginBottom: 10, textTransform: 'uppercase' }}>{item.l}</div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2rem', fontWeight: 700, color: item.c, textShadow: `0 0 20px ${item.c}44` }}>{item.v}</div>
          </div>
        ))}
      </div>
      <ComingSoonSection name="Turno Actual" desc="Gráficos hora a hora, estado de equipos, producción por pala y análisis IA del turno." icon="⊡"/>
    </div>
  )
}

// ── FLOTA ──────────────────────────────────────────────────────────────────
export const FlotaPage: React.FC = () => (
  <ComingSoonSection name="Flota y Equipos" desc="Estado en tiempo real de cada CAEX, disponibilidad, utilización y factor operacional." icon="◉"/>
)

// ── ALERTAS ────────────────────────────────────────────────────────────────
export const AlertasPage: React.FC = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
      {[
        { label: '🔴 CRÍTICAS', value: '2', color: 'var(--danger-red)' },
        { label: '🟠 ALTAS',    value: '8', color: 'var(--alert-orange)' },
        { label: '🟡 MEDIAS',   value: '15', color: 'var(--warn-yellow)' },
      ].map(a => (
        <div key={a.label} style={{
          background: 'var(--bg-card)',
          border: `1px solid ${a.color}33`,
          borderLeft: `4px solid ${a.color}`,
          borderRadius: 'var(--r-lg)', padding: '20px',
        }}>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, letterSpacing: '2px', color: a.color, marginBottom: 8 }}>{a.label}</div>
          <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2.5rem', fontWeight: 700, color: a.color }}>{a.value}</div>
        </div>
      ))}
    </div>
    <ComingSoonSection name="Alertas Operacionales" desc="Sistema de alertas con SLA, gestión y historial de eventos." icon="⚠"/>
  </div>
)

// ── RENDIMIENTO ────────────────────────────────────────────────────────────
export const RendimientoPage: React.FC = () => (
  <ComingSoonSection name="Rendimiento" desc="Análisis de rendimiento por período, comparativas y tendencias operacionales." icon="▲"/>
)

// ── PLACEHOLDER ────────────────────────────────────────────────────────────
export const PlaceholderPage: React.FC = () => {
  const { pagina } = useAppStore()
  const t = useT()
  const label = (t.nav as Record<string, string>)[pagina] ?? pagina
  return <ComingSoonSection name={label} desc="Módulo en desarrollo. Disponible en próxima actualización." icon="◈"/>
}

// ── COMING SOON ────────────────────────────────────────────────────────────
const ComingSoonSection: React.FC<{ name: string; desc: string; icon: string }> = ({ name, desc, icon }) => (
  <Panel style={{
    display: 'flex', flexDirection: 'column',
    alignItems: 'center', justifyContent: 'center',
    minHeight: 320, textAlign: 'center', gap: 20,
  }}>
    <div style={{
      width: 72, height: 72,
      background: 'var(--data-cyan-dim)',
      border: '1px solid var(--data-cyan)',
      borderRadius: 'var(--r-xl)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 32, boxShadow: 'var(--data-cyan-glow)',
      animation: 'pulseGlow 3s ease-in-out infinite',
    }}>
      {icon}
    </div>
    <div>
      <div style={{
        fontFamily: 'var(--font-display)', fontSize: '1.4rem',
        fontWeight: 700, letterSpacing: '3px',
        color: 'var(--text-primary)', marginBottom: 8,
      }}>
        {name.toUpperCase()}
      </div>
      <div style={{
        fontFamily: 'var(--font-label)', fontSize: 14,
        color: 'var(--text-tertiary)', maxWidth: 400, lineHeight: 1.6,
      }}>
        {desc}
      </div>
    </div>
    <Badge color="cyan" variant="outline" size="md">En desarrollo</Badge>
  </Panel>
)
