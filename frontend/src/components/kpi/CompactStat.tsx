import type { ReactNode } from 'react'

type StatTone = 'green' | 'cyan' | 'amber' | 'red' | 'slate'

interface CompactStatProps {
  label: string
  value: ReactNode
  meta?: ReactNode
  tone?: StatTone
}

export function CompactStat({ label, value, meta, tone = 'slate' }: CompactStatProps) {
  return (
    <article className={`compact-stat tone-${tone}`}>
      <span className="compact-stat-label">{label}</span>
      <strong className="compact-stat-value">{value}</strong>
      {meta && <span className="compact-stat-meta">{meta}</span>}
    </article>
  )
}

export function StatCluster({ title, tag, children }: { title: string; tag?: ReactNode; children: ReactNode }) {
  return (
    <section className="stat-cluster">
      <div className="stat-cluster-head">
        <h3>{title}</h3>
        {tag && <span className="panel-tag">{tag}</span>}
      </div>
      <div className="compact-stat-grid">{children}</div>
    </section>
  )
}
