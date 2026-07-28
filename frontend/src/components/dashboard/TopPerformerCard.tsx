import { ChevronRight } from 'lucide-react'

export interface TopPerformerRow {
  id: string
  label: string
  value: string
  meta: string
  secondary: string
  progress: number
  severity?: 'critical' | 'high' | 'medium' | 'low' | 'success'
}

interface Props {
  kicker: string
  title: string
  rows: TopPerformerRow[]
  emptyLabel?: string
}

export function TopPerformerCard({ kicker, title, rows, emptyLabel = 'Sin datos para el filtro activo.' }: Props) {
  return (
    <section className="top-performer-card">
      <div className="panel-header">
        <div>
          <span className="panel-kicker">{kicker}</span>
          <h2>{title}</h2>
        </div>
        <span className="panel-tag">Top {Math.min(rows.length, 5)}</span>
      </div>

      <div className="top-performer-list">
        {rows.length ? rows.map((row, index) => (
          <article key={row.id} className={`performer-row performer-${row.severity ?? 'success'}`}>
            <div className="performer-rank">{index + 1}</div>
            <div className="performer-main">
              <div className="performer-title">
                <strong>{row.label}</strong>
                <span>{row.value}</span>
              </div>
              <div className="performer-bar" aria-hidden="true">
                <i style={{ width: `${Math.max(4, Math.min(row.progress, 100))}%` }} />
              </div>
              <div className="performer-meta">
                <span>{row.meta}</span>
                <span>{row.secondary}</span>
              </div>
            </div>
            <ChevronRight size={16} />
          </article>
        )) : (
          <div className="executive-empty-state">{emptyLabel}</div>
        )}
      </div>
    </section>
  )
}
