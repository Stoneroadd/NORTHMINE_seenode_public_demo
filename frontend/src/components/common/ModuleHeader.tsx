import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

interface Props {
  icon: LucideIcon
  eyebrow: string
  title: string
  description: string
  meta?: string
  actions?: ReactNode
}

export function ModuleHeader({ icon: Icon, eyebrow, title, description, meta, actions }: Props) {
  return (
    <section className="module-header">
      <div className="module-icon"><Icon size={24} /></div>
      <div>
        <span className="module-eyebrow">{eyebrow}</span>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <div className="module-header-side">
        {meta && <span className="module-meta">{meta}</span>}
        {actions}
      </div>
    </section>
  )
}
