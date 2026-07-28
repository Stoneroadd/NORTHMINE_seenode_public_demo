import type { ExecutiveDiagnosis, OperationalInsight, InsightPriority } from '../../services/operationalInsights'

const PRIORITY_COLORS: Record<InsightPriority, string> = {
  CRITICA: '#ef4444',
  ALTA:    '#f59e0b',
  MEDIA:   '#38bdf8',
  BAJA:    '#10b981',
}

const CATEGORY_ICONS: Record<string, string> = {
  PRODUCCION: '📊',
  FLOTA:      '🚛',
  CARGUIO:    '⛏️',
  AVERIAS:    '🔧',
  SEGURIDAD:  '⚠️',
}

function InsightRow({ insight }: { insight: OperationalInsight }) {
  const color = PRIORITY_COLORS[insight.priority]
  return (
    <div className="insight-row">
      <div className="insight-row-header">
        <span className="insight-cat-icon">{CATEGORY_ICONS[insight.category] ?? '●'}</span>
        <span className="insight-priority-badge" style={{ color, borderColor: `${color}44`, background: `${color}12` }}>
          {insight.priority}
        </span>
        <span className="insight-title">{insight.title}</span>
      </div>
      {insight.impact && (
        <span className="insight-impact" style={{ color }}>
          {insight.impact}
        </span>
      )}
      <p className="insight-action">→ {insight.action}</p>
    </div>
  )
}

interface Props {
  diagnosis: ExecutiveDiagnosis
  loading?: boolean
}

export function ExecutiveMotorPanel({ diagnosis, loading }: Props) {
  if (loading) {
    return (
      <div className="executive-motor-panel panel">
        <div className="panel-header">
          <div><span className="panel-kicker">Motor Ejecutivo</span><h2>Diagnóstico operacional</h2></div>
        </div>
        <div className="motor-narrative">
          <span className="skeleton-line" /><span className="skeleton-line" /><span className="skeleton-line short" />
        </div>
      </div>
    )
  }

  const { narrative, topRisk, insights, statusColor } = diagnosis

  return (
    <div className="executive-motor-panel panel">
      <div className="panel-header">
        <div>
          <span className="panel-kicker">Motor Ejecutivo IA</span>
          <h2>Diagnóstico y recomendaciones</h2>
        </div>
        <span className="panel-tag" style={{ color: statusColor, borderColor: `${statusColor}44` }}>
          {insights.length} insight{insights.length !== 1 ? 's' : ''}
        </span>
      </div>

      <p className="motor-narrative">{narrative}</p>

      {topRisk && (
        <div className="motor-top-risk" style={{ borderColor: `${PRIORITY_COLORS[topRisk.priority]}44`, background: `${PRIORITY_COLORS[topRisk.priority]}08` }}>
          <div className="motor-risk-header">
            <span className="motor-risk-kicker">RIESGO PRINCIPAL</span>
            <span className="motor-risk-badge" style={{ background: PRIORITY_COLORS[topRisk.priority], color: '#fff' }}>
              {topRisk.priority}
            </span>
          </div>
          <strong className="motor-risk-title">{topRisk.title}</strong>
          <p className="motor-risk-exp">{topRisk.explanation}</p>
          <div className="motor-risk-action">
            <span>Acción recomendada:</span>
            <strong>{topRisk.action}</strong>
          </div>
        </div>
      )}

      {insights.length > 1 && (
        <div className="motor-insights-list">
          {insights.slice(1, 5).map(ins => (
            <InsightRow key={ins.id} insight={ins} />
          ))}
        </div>
      )}
    </div>
  )
}
