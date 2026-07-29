import React, { useState } from 'react'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis,
  CartesianGrid, Tooltip, ResponsiveContainer, Cell, ReferenceLine,
} from 'recharts'
import { useAppStore, useT } from '../store'
import {
  StatCard, SectionTitle, Panel, ProgressBar,
  Badge, Button, ChartTooltip, Divider, HudCorner, LoadingPanel,
} from '../components/ui'

// ── MOCK DATA (reemplazar con useQuery cuando API esté lista) ──────────────
const useMockData = () => {
  const hoy  = new Date()
  const dias  = Array.from({ length: hoy.getDate() }, (_, i) => {
    const d = new Date(hoy.getFullYear(), hoy.getMonth(), i + 1)
    const plan = [143789,147235,148298,146846,145075,149567,141082,143868,146200,
                  146254,147609,138740,140333,140294,141408,142406,143731,141658,
                  143646,143303,143289,143741,146506,145075,144737,146878,149885,
                  144570,147926,153275,152774][i] ?? 145000
    const real = Math.round(plan * (0.95 + Math.random() * 0.25))
    return {
      fecha: d.toLocaleDateString('es-CL', { day: 'numeric', month: 'short' }),
      real,
      plan,
      dif: real - plan,
      pct: +((real / plan) * 100).toFixed(1),
    }
  })

  const totalReal = dias.reduce((s, d) => s + d.real, 0)
  const totalPlan = dias.reduce((s, d) => s + d.plan, 0)

  const horaHora = Array.from({ length: 12 }, (_, i) => ({
    hora: `${(19 + i) % 24}:00`,
    tonelaje: Math.round(5000 + Math.random() * 15000),
    ciclos: Math.round(20 + Math.random() * 80),
  }))

  const palas = [
    { id: 'EX3470', tipo: 'Pala', ton: 45360, ciclos: 245, f01: true },
    { id: 'EX3517', tipo: 'Pala', ton: 47020, ciclos: 242, f01: true },
    { id: 'EX3600', tipo: 'Pala', ton: 40190, ciclos: 181, f01: true },
    { id: 'CF3672', tipo: 'Cargador', ton: 43240, ciclos: 217, f01: true },
    { id: 'CF3449', tipo: 'Cargador', ton: 23080, ciclos: 121, f01: false },
  ]

  return {
    dias,
    totalReal,
    totalPlan,
    pct: +((totalReal / totalPlan) * 100).toFixed(1),
    dif: totalReal - totalPlan,
    tonDia: Math.round(totalReal * 0.46),
    tonNoche: Math.round(totalReal * 0.54),
    diasRestantes: 31 - hoy.getDate(),
    diasConDatos: hoy.getDate(),
    f01: Math.round(totalReal * 0.64),
    f02: Math.round(totalReal * 0.33),
    chan: Math.round(totalReal * 0.03),
    horaHora,
    palas,
    proyeccion: Math.round(totalReal / hoy.getDate() * 31),
    ritmoNecesario: Math.round((totalPlan - totalReal) / (31 - hoy.getDate())),
  }
}

// ── COMPONENTE PRINCIPAL ───────────────────────────────────────────────────
export const ResumenPage: React.FC = () => {
  const t = useT()
  const d = useMockData()
  const [vistaTabla, setVistaTabla] = useState<'diaria' | 'grafico'>('grafico')

  const cc = d.pct >= 100 ? 'green' : d.pct >= 90 ? 'yellow' : 'orange'
  const ccStr = d.pct >= 100 ? 'var(--op-green)' : d.pct >= 90 ? 'var(--warn-yellow)' : 'var(--alert-orange)'

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--gap-lg)' }}>

      {/* ── BANNER F01 PRINCIPAL ─────────────────────────────────────────── */}
      <div style={{
        background: `linear-gradient(135deg, var(--bg-panel), ${ccStr}06)`,
        border: `1px solid ${ccStr}33`,
        borderLeft: `4px solid ${ccStr}`,
        borderRadius: 'var(--r-xl)',
        padding: '24px 28px',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Decoración de fondo */}
        <div style={{
          position: 'absolute', right: -40, top: -40,
          width: 200, height: 200,
          background: `radial-gradient(circle, ${ccStr}08 0%, transparent 70%)`,
          pointerEvents: 'none',
        }}/>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
          <div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 9,
              letterSpacing: '3px', color: 'var(--text-tertiary)',
              marginBottom: 4,
            }}>
              PRODUCCIÓN TOTAL · {new Date().toLocaleDateString('es-CL', { month: 'long', year: 'numeric' }).toUpperCase()}
            </div>
            <div style={{
              fontFamily: 'var(--font-mono)', fontSize: 11,
              color: 'var(--text-tertiary)',
            }}>
              Plan acumulado al día {new Date().getDate()}:{' '}
              <b style={{ color: 'var(--text-secondary)' }}>{d.totalPlan.toLocaleString('es-CL')} t</b>
            </div>
          </div>
          <Badge color={cc} variant="glow" size="lg" pulse={d.pct >= 100}>
            {d.pct >= 100 ? '✓ CUMPLIDO' : d.pct >= 90 ? '⚠ EN RIESGO' : '✕ DÉFICIT'}
          </Badge>
        </div>

        {/* Grid principal */}
        <div style={{ display: 'grid', gridTemplateColumns: '200px 1fr 160px', gap: 24, alignItems: 'center' }}>
          {/* Número grande */}
          <div>
            <div style={{
              fontFamily: 'var(--font-mono)',
              fontSize: '3rem', fontWeight: 700,
              color: ccStr, lineHeight: 1,
              textShadow: `0 0 40px ${ccStr}44`,
              letterSpacing: '-1px',
            }}>
              {(d.totalReal / 1e6).toFixed(3)}
            </div>
            <div style={{ fontFamily: 'var(--font-label)', fontSize: 12, color: 'var(--text-tertiary)', marginTop: 4 }}>
              millones de toneladas · mes actual
            </div>
          </div>

          {/* Barra de progreso */}
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 11, fontFamily: 'var(--font-mono)', color: 'var(--text-tertiary)' }}>
              <span>0</span>
              <span style={{ color: ccStr, fontWeight: 700 }}>{d.pct}% vs plan</span>
              <span>{(d.totalPlan / 1e6).toFixed(2)}M t</span>
            </div>
            <ProgressBar pct={d.pct} color={cc} height={20}/>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 10, fontFamily: 'var(--font-mono)', color: 'var(--text-disabled)' }}>
              <span>INICIO MES</span>
              <span>META TOTAL: {d.totalPlan.toLocaleString('es-CL')} t</span>
            </div>
          </div>

          {/* KPIs derechos */}
          <div style={{ display: 'grid', gap: 8 }}>
            {[
              { label: 'DIFERENCIA', value: `${d.dif >= 0 ? '+' : ''}${d.dif.toLocaleString('es-CL')} t`, color: ccStr },
              { label: 'DÍAS REST.', value: `${d.diasRestantes} días`, color: 'rgba(255,255,255,0.7)' },
            ].map(item => (
              <div key={item.label} style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid var(--border-dim)',
                borderRadius: 'var(--r-md)',
                padding: '8px 12px',
              }}>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '2px', color: 'var(--text-tertiary)', marginBottom: 3 }}>
                  {item.label}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: item.color }}>
                  {item.value}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Desglose fases */}
        <Divider color="cyan" my={16}/>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 10 }}>
          {[
            { label: '🔵 F01 · NORTHMINE', value: d.f01, pct: +(d.f01/d.totalReal*100).toFixed(1), color: 'var(--f01-color)' },
            { label: '🟠 F02 · Cobro aparte', value: d.f02, pct: +(d.f02/d.totalReal*100).toFixed(1), color: 'var(--f02-color)' },
            { label: '🟡 CHANCADO',         value: d.chan, pct: +(d.chan/d.totalReal*100).toFixed(1), color: 'var(--chan-color)' },
            { label: '☀️ DÍA / 🌙 NOCHE',  value: null, pct: null, color: 'var(--op-green)', dia: d.tonDia, noche: d.tonNoche },
          ].map((item, i) => (
            <div key={i} style={{
              background: 'rgba(255,255,255,0.03)',
              border: `1px solid ${item.color}22`,
              borderRadius: 'var(--r-md)',
              padding: '10px 14px',
            }}>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '1px', color: item.color, marginBottom: 4 }}>
                {item.label}
              </div>
              {item.value !== null ? (
                <>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 18, fontWeight: 700, color: item.color }}>
                    {item.value!.toLocaleString('es-CL')} t
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-tertiary)', marginTop: 3 }}>
                    {item.pct}% del total
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--op-green)' }}>
                    {item.dia!.toLocaleString('es-CL')} t
                  </div>
                  <div style={{ fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, color: 'var(--data-cyan)' }}>
                    {item.noche!.toLocaleString('es-CL')} t
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── FILA DE CARDS ──────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
        <StatCard
          label={t.kpi.tonelaje} icon="⚡"
          value={`${(d.totalReal/1e6).toFixed(2)}M`}
          sub="mes actual" color="green"
        />
        <StatCard
          label={t.kpi.cumplimiento} icon="◎"
          value={`${d.pct}%`}
          sub={`Plan: ${d.totalPlan.toLocaleString('es-CL')} t`}
          color={cc}
        />
        <StatCard
          label={t.kpi.ciclos} icon="↺"
          value="28,430"
          sub="ciclos registrados" color="cyan"
        />
        <StatCard
          label={t.kpi.caex_activos} icon="▣"
          value="38 / 38"
          sub="disponibilidad 100%" color="green"
        />
        <StatCard
          label="Proyección fin mes" icon="→"
          value={`${(d.proyeccion/1e6).toFixed(2)}M`}
          sub={d.proyeccion >= d.totalPlan ? '✓ Llegarás' : `Déficit est.`}
          color={d.proyeccion >= d.totalPlan ? 'green' : 'orange'}
        />
      </div>

      {/* ── GRÁFICOS ─────────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Producción diaria */}
        <Panel>
          <SectionTitle color="green"
            right={
              <div style={{ display: 'flex', gap: 8 }}>
                {(['grafico','diaria'] as const).map(v => (
                  <Button key={v} size="sm"
                    color={vistaTabla === v ? 'green' : 'white'}
                    variant={vistaTabla === v ? 'outline' : 'ghost'}
                    onClick={() => setVistaTabla(v)}
                  >
                    {v === 'grafico' ? '▤' : '☰'}
                  </Button>
                ))}
              </div>
            }
          >
            {t.tiempo.mes} — Producción Diaria
          </SectionTitle>

          {vistaTabla === 'grafico' ? (
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={d.dias} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
                <XAxis dataKey="fecha" stroke="var(--text-tertiary)"
                  tick={{ fontSize: 10, fontFamily: 'var(--font-mono)' }}
                  tickLine={false} interval={3}/>
                <YAxis stroke="var(--text-tertiary)"
                  tick={{ fontSize: 10, fontFamily: 'var(--font-mono)' }}
                  tickFormatter={v => `${(v/1000).toFixed(0)}k`}/>
                <Tooltip content={<ChartTooltip/>}/>
                <ReferenceLine y={d.totalPlan / d.diasConDatos} stroke="var(--warn-yellow)"
                  strokeDasharray="4 4" label={{ value: 'Meta', fill: 'var(--warn-yellow)', fontSize: 10 }}/>
                <Bar dataKey="real" name={t.kpi.tonelaje} radius={[3,3,0,0]}>
                  {d.dias.map((entry, i) => (
                    <Cell key={i}
                      fill={entry.pct >= 100
                        ? 'var(--op-green)'
                        : entry.pct >= 90
                          ? 'var(--warn-yellow)'
                          : 'var(--alert-orange)'}
                      opacity={0.8}
                    />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ maxHeight: 240, overflowY: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid var(--border-dim)' }}>
                    {['FECHA','REAL','META','DIF','CUMPL.'].map(h => (
                      <th key={h} style={{ padding: '6px 8px', textAlign: h === 'FECHA' ? 'left' : 'right', color: 'var(--text-tertiary)', fontWeight: 600, fontSize: 9, letterSpacing: '1px' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {d.dias.map((row, i) => {
                    const c = row.pct >= 100 ? 'var(--op-green)' : row.pct >= 90 ? 'var(--warn-yellow)' : 'var(--alert-orange)'
                    return (
                      <tr key={i} style={{
                        borderBottom: '1px solid var(--border-dim)',
                        background: i%2 === 0 ? 'transparent' : 'rgba(0,0,0,0.15)',
                      }}>
                        <td style={{ padding: '7px 8px', color: 'var(--text-secondary)' }}>{row.fecha}</td>
                        <td style={{ padding: '7px 8px', textAlign: 'right', color: 'var(--text-primary)', fontWeight: 600 }}>{row.real.toLocaleString('es-CL')}</td>
                        <td style={{ padding: '7px 8px', textAlign: 'right', color: 'var(--text-tertiary)' }}>{row.plan.toLocaleString('es-CL')}</td>
                        <td style={{ padding: '7px 8px', textAlign: 'right', color: c, fontWeight: 600 }}>{row.dif >= 0 ? '+' : ''}{row.dif.toLocaleString('es-CL')}</td>
                        <td style={{ padding: '7px 8px', textAlign: 'right', color: c, fontWeight: 700 }}>{row.pct}%</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        {/* Hora a hora */}
        <Panel>
          <SectionTitle color="cyan">Producción Hora a Hora — Turno Noche</SectionTitle>
          <ResponsiveContainer width="100%" height={240}>
            <AreaChart data={d.horaHora} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="gradCyan" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--data-cyan)" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="var(--data-cyan)" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
              <XAxis dataKey="hora" stroke="var(--text-tertiary)"
                tick={{ fontSize: 10, fontFamily: 'var(--font-mono)' }} tickLine={false}/>
              <YAxis stroke="var(--text-tertiary)"
                tick={{ fontSize: 10, fontFamily: 'var(--font-mono)' }}
                tickFormatter={v => `${(v/1000).toFixed(0)}k`}/>
              <Tooltip content={<ChartTooltip/>}/>
              <Area
                type="monotone" dataKey="tonelaje" name={t.kpi.tonelaje}
                stroke="var(--data-cyan)" strokeWidth={2}
                fill="url(#gradCyan)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </Panel>
      </div>

      {/* ── PANEL PALAS ───────────────────────────────────────────────── */}
      <Panel>
        <SectionTitle color="yellow">Unidades de Carguío — Turno Activo</SectionTitle>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 12 }}>
          {d.palas.map((pala, i) => {
            const max = Math.max(...d.palas.map(p => p.ton))
            const pct = pala.ton / max * 100
            const colors = ['var(--op-green)','var(--data-cyan)','var(--warn-yellow)','var(--alert-orange)','#BF5FFF']
            const c = colors[i % colors.length]
            return (
              <div key={pala.id} style={{
                background: 'var(--bg-card)',
                border: `1px solid ${c}22`,
                borderTop: `2px solid ${c}`,
                borderRadius: 'var(--r-lg)',
                padding: '14px 16px',
                position: 'relative', overflow: 'hidden',
                transition: 'all var(--dur-med) var(--ease-out)',
                cursor: 'default',
              }}
              onMouseEnter={e => {
                e.currentTarget.style.transform = 'translateY(-4px)'
                e.currentTarget.style.boxShadow = `0 12px 32px rgba(0,0,0,0.4), 0 0 20px ${c}22`
                e.currentTarget.style.borderColor = `${c}55`
              }}
              onMouseLeave={e => {
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
                e.currentTarget.style.borderColor = `${c}22`
              }}>
                <HudCorner position="tr" color={pala.f01 ? 'cyan' : 'orange'} size={10}/>

                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 9, letterSpacing: '2px', color: c, marginBottom: 8 }}>
                  {pala.tipo.toUpperCase()}
                </div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--text-primary)', letterSpacing: '1px', marginBottom: 2 }}>
                  {pala.id}
                </div>
                <Badge color={pala.f01 ? 'cyan' : 'orange'} size="sm">
                  {pala.f01 ? 'F01' : 'F02'}
                </Badge>

                <div style={{ margin: '12px 0 4px', fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: 700, color: c }}>
                  {pala.ton.toLocaleString('es-CL')}
                </div>
                <div style={{ fontFamily: 'var(--font-mono)', fontSize: 10, color: 'var(--text-tertiary)', marginBottom: 10 }}>
                  toneladas · {pala.ciclos} ciclos
                </div>

                <ProgressBar pct={pct} color={i === 0 ? 'green' : i === 1 ? 'cyan' : i === 2 ? 'yellow' : i === 3 ? 'orange' : 'purple'} height={5}/>
              </div>
            )
          })}
        </div>
      </Panel>
    </div>
  )
}
