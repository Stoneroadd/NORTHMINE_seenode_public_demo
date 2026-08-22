import type { ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

interface DetailDisclosureProps {
  label: string
  description?: string
  children: ReactNode
  defaultOpen?: boolean
}

export function DetailDisclosure({ label, description, children, defaultOpen = false }: DetailDisclosureProps) {
  return (
    <details className="mc-disclosure" open={defaultOpen}>
      <summary>
        <span>
          <strong>{label}</strong>
          {description && <small>{description}</small>}
        </span>
        <ChevronDown aria-hidden="true" size={18} />
      </summary>
      <div className="mc-disclosure__content">{children}</div>
    </details>
  )
}
