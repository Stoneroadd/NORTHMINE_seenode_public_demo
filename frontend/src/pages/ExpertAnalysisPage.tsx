import { useState, type CSSProperties } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Brain, Database } from 'lucide-react'
import { ModuleHeader } from '../components/common/ModuleHeader'
import { LoadingState } from '../components/common/LoadingState'
import { ErrorState } from '../components/common/ErrorState'
import { EmptyState } from '../components/common/EmptyState'
import { getCyclesHistoryStatus, getExpertAnalysis } from '../lib/api'

// Analisis Experto: cruces produccion x mantencion presentados en lenguaje
// simple. Cada hallazgo es una tarjeta con un numero grande y una explicacion
// que se entiende sin conocimientos de estadistica.

const TONE_COLORS: Record<string, string> = {
  rojo: '#F87171',
  ambar: '#FBBF24',
  verde: '#4ADE80',
}

function formatTons(value: number): string {
  return `${Math.round(value).toLocaleString('es-CL')} t`
}

export function ExpertAnalysisPage() {
  const [days, setDays] = useState(90)

  const query = useQuery({
    queryKey: ['expert-analysis', days],
    queryFn: async () => {
      const [analysis, cycles] = await Promise.all([
        getExpertAnalysis(days),
        getCyclesHistoryStatus().catch(() => null),
      ])
      return { analysis, cycles }
    },
    refetchInterval: 300000,
  })

  if (query.isLoading) return <LoadingState label="Cruzando produccion y mantencion..." />
  if (query.isError || !query.data) return <ErrorState detail="No se pudo cargar el analisis experto." />

  const { analysis, cycles } = query.data
  const perdidas = analysis.toneladas_perdidas

  return (
    <div className="module-page">
      <ModuleHeader
        icon={Brain}
        eyebrow="Analisis Experto"
        title="Produccion x Mantencion, en simple"
        description="Cada tarjeta responde una pregunta de negocio con datos históricos sintéticos de la demo."
        meta="Demo sintética · API /api/analysis/expert"
        actions={
          <>
            {cycles && (
              <span className="panel-tag">
                <Database size={12} style={{ verticalAlign: 'text-top', marginRight: 4 }} />
                {cycles.total_ciclos.toLocaleString('es-CL')} ciclos historizados ({cycles.desde} a {cycles.hasta})
              </span>
            )}
            <span style={{ display: 'inline-flex', gap: 4 }}>
              {[30, 90, 180, 240].map((option) => (
                <button
                  key={option}
                  type="button"
                  className={`command-button command-button-secondary nm-avr-filter-btn ${days === option ? 'is-active' : ''}`}
                  onClick={() => setDays(option)}
                >
                  {option}d
                </button>
              ))}
            </span>
          </>
        }
      />

      {/* Hallazgos principales: una tarjeta = una respuesta */}
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 14, marginBottom: 16 }}>
        {analysis.hallazgos.map((hallazgo, index) => {
          const color = TONE_COLORS[hallazgo.tono] ?? '#94A3B8'
          return (
            <article
              key={hallazgo.titulo}
              className="nm-avr-chart-card"
              style={{ borderLeft: `3px solid ${color}`, '--d': `${index * 90}ms` } as CSSProperties}
            >
              <span className="panel-kicker">{hallazgo.titulo}</span>
              <div style={{ fontSize: '1.55rem', fontWeight: 800, color, margin: '6px 0 8px', fontVariantNumeric: 'tabular-nums' }}>
                {hallazgo.valor}
              </div>
              <p style={{ color: 'var(--nm-muted)', fontSize: '0.84rem', lineHeight: 1.55, margin: 0 }}>
                {hallazgo.detalle}
              </p>
            </article>
          )
        })}
        {!analysis.hallazgos.length && (
          <EmptyState title="Aun no hay suficiente historia para el analisis. Los ciclos se acumulan automaticamente." />
        )}
      </section>

      {/* Toneladas perdidas por equipo */}
      {perdidas.equipos.length > 0 && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">Costo de indisponibilidad</span>
              <h2>Toneladas perdidas por averias, por equipo</h2>
            </div>
            <span className="panel-tag">Total: {formatTons(perdidas.total)}</span>
          </div>
          <p style={{ color: 'var(--nm-muted)', fontSize: '0.8rem', margin: '0 0 10px' }}>
            Como se calcula: lo que el equipo mueve en un dia normal x los dias que estuvo detenido por averia.
            Es un techo teorico (parte de la carga la absorben otros equipos), pero ordena las prioridades por plata, no por horas.
          </p>
          {perdidas.equipos.map((item, index) => (
            <div key={item.equipment_id} className="nm-avr-hbar">
              <small title={item.equipment_id}>{item.equipment_id}</small>
              <span className="nm-avr-hbar-track">
                <i
                  className="nm-avr-hbar-fill"
                  style={{
                    width: `${Math.min(100, (item.ton_perdidas / Math.max(perdidas.equipos[0]?.ton_perdidas ?? 1, 1)) * 100)}%`,
                    '--c': '#F87171',
                    '--d': `${index * 60}ms`,
                  } as CSSProperties}
                />
              </span>
              <small className="nm-avr-hbar-value">{formatTons(item.ton_perdidas)}</small>
            </div>
          ))}
          <small style={{ color: 'var(--nm-muted)', display: 'block', marginTop: 8 }}>
            Detalle: dias detenido x produccion diaria promedio de cada equipo (solo averias correctivas).
          </small>
        </section>
      )}

      <section className="two-column" style={{ marginTop: 14 }}>
        {/* Post-PM */}
        <div className="panel">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">Calidad de mantencion</span>
              <h2>Averias justo despues de una PM</h2>
            </div>
            <span className="panel-tag">
              {analysis.post_pm.pct_dentro_7_dias != null ? `${analysis.post_pm.pct_dentro_7_dias}% en 7 dias` : 'sin datos'}
            </span>
          </div>
          <p style={{ color: 'var(--nm-muted)', fontSize: '0.8rem', lineHeight: 1.5 }}>
            Si un equipo se avería a los pocos dias de salir de mantencion programada, la intervencion
            probablemente no resolvio el problema de fondo. Estos son los equipos donde mas se repite:
          </p>
          {analysis.post_pm.equipos_repetidos.length ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {analysis.post_pm.equipos_repetidos.map((item) => (
                <span key={item.equipment_id} className="panel-tag" style={{ borderColor: '#FBBF2488', color: '#FBBF24' }}>
                  {item.equipment_id}: {item.casos} {item.casos === 1 ? 'caso' : 'casos'}
                </span>
              ))}
            </div>
          ) : (
            <EmptyState title="Sin casos repetidos en la ventana." />
          )}
        </div>

        {/* Meta */}
        <div className="panel">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">Backtesting</span>
              <h2>La meta de turno contra la realidad</h2>
            </div>
            <span className="panel-tag">{analysis.meta ? `${analysis.meta.turnos_analizados} turnos` : 'sin datos'}</span>
          </div>
          {analysis.meta ? (
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--nm-muted)' }}>Meta actual</span>
                <strong>{formatTons(analysis.meta.meta_turno)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--nm-muted)' }}>Turno tipico (mediana real)</span>
                <strong>{formatTons(analysis.meta.mediana_turno)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--nm-muted)' }}>Veces que se cumplio</span>
                <strong>{analysis.meta.pct_turnos_cumplidos}%</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--nm-muted)' }}>Exigencia (percentil)</span>
                <strong>{analysis.meta.percentil_meta} de 100</strong>
              </div>
              <small style={{ color: 'var(--nm-muted)', lineHeight: 1.5 }}>
                Lectura: percentil bajo = meta facil (casi todos los turnos la superan); percentil 40-75 = exigente
                pero alcanzable; sobre 75 = se cumple pocas veces y desmotiva.
              </small>
            </div>
          ) : (
            <EmptyState title="Se necesitan al menos 10 turnos historizados." />
          )}
        </div>
      </section>
    </div>
  )
}
