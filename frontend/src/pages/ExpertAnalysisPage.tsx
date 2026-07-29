import { useState, type CSSProperties } from 'react'
import { useQuery } from '@tanstack/react-query'
import { Brain, Database } from 'lucide-react'
import { ModuleHeader } from '../components/common/ModuleHeader'
import { LoadingState } from '../components/common/LoadingState'
import { ErrorState } from '../components/common/ErrorState'
import { EmptyState } from '../components/common/EmptyState'
import { getCyclesHistoryStatus, getExpertAnalysis } from '../lib/api'
import { useModuleT } from '../i18n/useModuleT'
import { expertAnalysisT } from '../i18n/modules/expertAnalysis'
import { formatTons } from '../lib/format'

// Analisis Experto: cruces produccion x mantencion presentados en lenguaje
// simple. Cada hallazgo es una tarjeta con un numero grande y una explicacion
// que se entiende sin conocimientos de estadistica.

const TONE_COLORS: Record<string, string> = {
  rojo: '#F87171',
  ambar: '#FBBF24',
  verde: '#4ADE80',
}

export function ExpertAnalysisPage() {
  const t = useModuleT(expertAnalysisT)
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

  if (query.isLoading) return <LoadingState label={t.loading_label} />
  if (query.isError || !query.data) return <ErrorState detail={t.error_detail} onRetry={() => query.refetch()} />

  const { analysis, cycles } = query.data
  const perdidas = analysis.toneladas_perdidas

  return (
    <div className="module-page">
      <ModuleHeader
        icon={Brain}
        eyebrow={t.eyebrow}
        title={t.title}
        description={t.description}
        meta="API /api/analysis/expert"
        actions={
          <>
            {cycles && (
              <span className="panel-tag">
                <Database size={12} style={{ verticalAlign: 'text-top', marginRight: 4 }} />
                {t.cycles_historized(cycles.total_ciclos.toLocaleString('es-CL'), cycles.desde ?? '', cycles.hasta ?? '')}
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
          <EmptyState title={t.no_history_yet} />
        )}
      </section>

      {/* Toneladas perdidas por equipo */}
      {perdidas.equipos.length > 0 && (
        <section className="panel">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">{t.cost_of_unavailability_kicker}</span>
              <h2>{t.lost_tons_by_breakdowns_title}</h2>
            </div>
            <span className="panel-tag">{t.total_label(formatTons(perdidas.total))}</span>
          </div>
          <p style={{ color: 'var(--nm-muted)', fontSize: '0.8rem', margin: '0 0 10px' }}>
            {t.lost_tons_explanation}
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
            {t.lost_tons_detail}
          </small>
        </section>
      )}

      <section className="two-column" style={{ marginTop: 14 }}>
        {/* Post-PM */}
        <div className="panel">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">{t.maintenance_quality_kicker}</span>
              <h2>{t.breakdowns_after_pm_title}</h2>
            </div>
            <span className="panel-tag">
              {analysis.post_pm.pct_dentro_7_dias != null ? t.pct_within_7_days(analysis.post_pm.pct_dentro_7_dias) : t.no_data_tag}
            </span>
          </div>
          <p style={{ color: 'var(--nm-muted)', fontSize: '0.8rem', lineHeight: 1.5 }}>
            {t.breakdowns_after_pm_explanation}
          </p>
          {analysis.post_pm.equipos_repetidos.length ? (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
              {analysis.post_pm.equipos_repetidos.map((item) => (
                <span key={item.equipment_id} className="panel-tag" style={{ borderColor: '#FBBF2488', color: '#FBBF24' }}>
                  {item.equipment_id}: {item.casos} {item.casos === 1 ? t.case_singular : t.case_plural}
                </span>
              ))}
            </div>
          ) : (
            <EmptyState title={t.no_repeated_cases} />
          )}
        </div>

        {/* Meta */}
        <div className="panel">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">{t.backtesting_kicker}</span>
              <h2>{t.shift_target_vs_reality_title}</h2>
            </div>
            <span className="panel-tag">{analysis.meta ? t.shifts_analyzed(analysis.meta.turnos_analizados) : t.no_data_tag}</span>
          </div>
          {analysis.meta ? (
            <div style={{ display: 'grid', gap: 8 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--nm-muted)' }}>{t.current_target}</span>
                <strong>{formatTons(analysis.meta.meta_turno)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--nm-muted)' }}>{t.typical_shift}</span>
                <strong>{formatTons(analysis.meta.mediana_turno)}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--nm-muted)' }}>{t.times_met}</span>
                <strong>{analysis.meta.pct_turnos_cumplidos}%</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--nm-muted)' }}>{t.demand_percentile}</span>
                <strong>{t.out_of_100(analysis.meta.percentil_meta)}</strong>
              </div>
              <small style={{ color: 'var(--nm-muted)', lineHeight: 1.5 }}>
                {t.percentile_reading_hint}
              </small>
            </div>
          ) : (
            <EmptyState title={t.needs_more_shifts} />
          )}
        </div>
      </section>
    </div>
  )
}
