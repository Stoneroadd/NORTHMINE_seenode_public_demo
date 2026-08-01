import type { ReactNode } from 'react'
import { LandingFooter } from './LandingFooter'
import { LandingHeader } from './LandingHeader'
import '../../styles/demo-brand-system.css'
import '../../styles/demo-landing.css'
import '../../styles/demo-landing-strata.css'

interface PublicPageShellProps {
  children: ReactNode
  compactHeader?: boolean
}

export function PublicPageShell({ children, compactHeader = false }: PublicPageShellProps) {
  return (
    <div className={`nm-public-page${compactHeader ? ' nm-public-page--interior' : ''}`}>
      <LandingHeader />
      {children}
      <LandingFooter />
    </div>
  )
}
