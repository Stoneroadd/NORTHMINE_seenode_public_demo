import type { SmartAlert } from '../../lib/api'

export function normalizeSeverity(alert: SmartAlert): string {
  const raw = (alert.severidad ?? alert.severity ?? 'BAJA').toUpperCase()
  const map: Record<string, string> = {
    CRITICAL: 'CRITICA',
    HIGH: 'ALTA',
    MEDIUM: 'MEDIA',
    LOW: 'BAJA',
    INFO: 'BAJA',
  }
  return map[raw] ?? raw
}

export function AlertSeverityBadge({ severity }: { severity: string }) {
  const normalized = severity.toUpperCase()
  return <span className={`severity-badge severity-${normalized.toLowerCase().replace(/\s+/g, '-')}`}>{normalized}</span>
}

