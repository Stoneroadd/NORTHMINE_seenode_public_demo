export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min
  return Math.min(Math.max(value, min), max)
}

export function hashString(value: string): number {
  let hash = 2166136261
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index)
    hash = Math.imul(hash, 16777619)
  }
  return Math.abs(hash >>> 0)
}

export function formatNumber(value: number | null | undefined, digits = 0): string {
  if (value === null || value === undefined || Number.isNaN(value)) return 'No disponible'
  return new Intl.NumberFormat('es-CL', {
    maximumFractionDigits: digits,
    minimumFractionDigits: digits,
  }).format(value)
}

export function formatCompact(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return 'No disponible'
  return new Intl.NumberFormat('es-CL', {
    notation: 'compact',
    maximumFractionDigits: digits,
  }).format(value)
}

export function formatTonnes(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return 'No disponible'
  return `${formatNumber(value)} t`
}

export function formatCurrency(value: number | null | undefined): string {
  if (value === null || value === undefined || Number.isNaN(value)) return 'No disponible'
  return `USD ${formatCompact(value, 1)}`
}

export function formatPercent(value: number | null | undefined, digits = 1): string {
  if (value === null || value === undefined || Number.isNaN(value)) return 'No disponible'
  return `${formatNumber(value, digits)}%`
}

export function asNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string' && value.trim()) {
    const parsed = Number(value.replace(',', '.'))
    return Number.isFinite(parsed) ? parsed : null
  }
  return null
}

export function normalizeStatus(value: string | null | undefined): 'NORMAL' | 'ATTENTION' | 'CRITICAL' | 'INACTIVE' | 'UNKNOWN' {
  const normalized = (value ?? '').toUpperCase()
  if (['CRITICA', 'CRITICAL', 'ALTA', 'HIGH', 'ERROR', 'FALLA', 'NO_DISPONIBLE'].some(token => normalized.includes(token))) {
    return 'CRITICAL'
  }
  if (['ATENCION', 'ATTENTION', 'MEDIA', 'MEDIO', 'WARNING', 'STALE', 'PARCIAL', 'ESTIMADO'].some(token => normalized.includes(token))) {
    return 'ATTENTION'
  }
  if (['INACTIVO', 'INACTIVE', 'SIN ACTIVIDAD', 'SIN_HISTORIAL', 'SIN_DATOS'].some(token => normalized.includes(token))) {
    return 'INACTIVE'
  }
  if (['OK', 'REAL', 'OPERATIVO', 'NORMAL', 'CONNECTED', 'CONECTADO', 'EJECUTADA'].some(token => normalized.includes(token))) {
    return 'NORMAL'
  }
  return normalized ? 'ATTENTION' : 'UNKNOWN'
}

export function riskFromStatus(status: string | null | undefined): number {
  switch (normalizeStatus(status)) {
    case 'CRITICAL':
      return 0.9
    case 'ATTENTION':
      return 0.58
    case 'INACTIVE':
      return 0.4
    case 'NORMAL':
      return 0.18
    default:
      return 0.34
  }
}

export function shortLabel(label: string, max = 28): string {
  return label.length > max ? `${label.slice(0, Math.max(0, max - 3))}...` : label
}

export function uniqueId(base: string, existing: Set<string>): string {
  const normalized = base
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '') || 'node'

  if (!existing.has(normalized)) return normalized

  let index = 2
  let candidate = `${normalized}-${index}`
  while (existing.has(candidate)) {
    index += 1
    candidate = `${normalized}-${index}`
  }
  return candidate
}
