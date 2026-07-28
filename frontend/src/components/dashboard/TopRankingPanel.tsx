import type { FleetEquipment, LoadingUnit, RankingItem } from '../../lib/api'

// ── Types ──────────────────────────────────────────────────────────────
export interface RankingRow {
  id: string
  label?: string
  value: number
  unit: string
  secondary?: string
  pct?: number
  estado?: string
  highlight?: boolean
  lowlight?: boolean
}

// ── Row component ──────────────────────────────────────────────────────
function RankRow({ row, rank, maxValue, variant }: {
  row: RankingRow
  rank: number
  maxValue: number
  variant: 'top' | 'bottom'
}) {
  const barPct = maxValue > 0 ? Math.min(100, (row.value / maxValue) * 100) : 0
  const barColor = variant === 'bottom'
    ? row.pct !== undefined && row.pct < -30 ? '#ef4444' : '#f59e0b'
    : rank === 1 ? '#10b981' : rank <= 3 ? '#38bdf8' : '#6366f1'

  return (
    <div className={`rank-row ${row.lowlight ? 'rank-row-low' : ''} ${row.highlight ? 'rank-row-hi' : ''}`}>
      <span className="rank-pos" style={{ color: rank <= 3 ? barColor : 'var(--text-tertiary)' }}>
        {String(rank).padStart(2, '0')}
      </span>
      <div className="rank-main">
        <div className="rank-top-line">
          <span className="rank-id">{row.id}</span>
          {row.label && <span className="rank-label">{row.label}</span>}
          {row.estado && (
            <span className="rank-estado" style={{
              color: row.estado === 'ACTIVO' ? '#10b981' : row.estado === 'MANTENCION' ? '#ef4444' : '#f59e0b',
            }}>
              {row.estado}
            </span>
          )}
        </div>
        <div className="rank-bar-track">
          <div className="rank-bar-fill" style={{ width: `${barPct}%`, background: barColor }} />
        </div>
      </div>
      <div className="rank-values">
        <span className="rank-val" style={{ color: barColor }}>
          {row.value.toLocaleString('es-CL')}
        </span>
        <span className="rank-unit">{row.unit}</span>
        {row.secondary && <span className="rank-secondary">{row.secondary}</span>}
      </div>
    </div>
  )
}

// ── Panel ─────────────────────────────────────────────────────────────
interface Props {
  title: string
  kicker: string
  rows: RankingRow[]
  variant?: 'top' | 'bottom'
  loading?: boolean
  emptyText?: string
}

export function TopRankingPanel({ title, kicker, rows, variant = 'top', loading, emptyText = 'Sin datos' }: Props) {
  const maxValue = Math.max(...rows.map(r => Math.abs(r.value)), 1)

  return (
    <div className="top-ranking-panel panel">
      <div className="panel-header">
        <div>
          <span className="panel-kicker">{kicker}</span>
          <h2>{title}</h2>
        </div>
        {!loading && <span className="panel-tag">{rows.length} equipos</span>}
      </div>

      {loading ? (
        <div className="ranking-loading">
          {Array.from({ length: 5 }, (_, i) => (
            <div key={i} className="rank-row">
              <span className="skeleton-line short" style={{ width: 28 }} />
              <div className="rank-main" style={{ flex: 1 }}>
                <span className="skeleton-line" />
                <span className="skeleton-line short" style={{ height: 4, marginTop: 4 }} />
              </div>
              <span className="skeleton-line short" style={{ width: 60 }} />
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="ranking-empty">
          <span>{emptyText}</span>
        </div>
      ) : (
        <div className="ranking-rows">
          {rows.map((row, i) => (
            <RankRow key={row.id} row={row} rank={i + 1} maxValue={maxValue} variant={variant} />
          ))}
        </div>
      )}
    </div>
  )
}

// ── Adapters ───────────────────────────────────────────────────────────
export function caexToRankingRows(items: FleetEquipment[], max = 5): RankingRow[] {
  return [...items]
    .sort((a, b) => b.toneladas - a.toneladas)
    .slice(0, max)
    .map((item) => ({
      id: item.caex_id,
      label: item.modelo,
      value: item.toneladas,
      unit: 't',
      secondary: `${item.ciclos} ciclos`,
      estado: item.estado,
    }))
}

export function ucToRankingRows(items: LoadingUnit[], max = 5): RankingRow[] {
  return [...items]
    .sort((a, b) => b.toneladas - a.toneladas)
    .slice(0, max)
    .map((item) => ({
      id: item.carguio_id,
      label: item.modelo,
      value: item.toneladas,
      unit: 't',
      secondary: `${item.rendimiento_tph.toFixed(0)} TPH`,
      estado: item.estado,
    }))
}

export function caexBajoPromedioRows(items: FleetEquipment[], avgToneladas: number, max = 5): RankingRow[] {
  return [...items]
    .filter(i => i.toneladas < avgToneladas * 0.85)
    .sort((a, b) => a.toneladas - b.toneladas)
    .slice(0, max)
    .map((item) => {
      const desvPct = avgToneladas > 0 ? ((item.toneladas - avgToneladas) / avgToneladas * 100) : 0
      return {
        id: item.caex_id,
        label: item.modelo,
        value: Math.round(Math.abs(desvPct)),
        unit: '%',
        secondary: `${item.toneladas.toLocaleString('es-CL')} t · ${item.ciclos} ciclos`,
        pct: desvPct,
        estado: item.estado,
        lowlight: true,
      }
    })
}

export function summaryItemsToRows(items: RankingItem[], idKey: 'caex_id' | 'carguio_id', max = 5): RankingRow[] {
  return [...items]
    .sort((a, b) => b.tonelaje - a.tonelaje)
    .slice(0, max)
    .map((item) => ({
      id: (idKey === 'caex_id' ? item.caex_id : item.carguio_id) ?? item.destino ?? '?',
      value: item.tonelaje,
      unit: 't',
      secondary: `${item.ciclos} ciclos`,
    }))
}
