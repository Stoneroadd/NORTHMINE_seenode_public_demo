/**
 * Single source of truth for how operational hours/timestamps are displayed
 * across NORTHMINE. All values are real clock hours in the mine's operating
 * timezone -- never a synthetic H1/H2/H3 sequence and never a hardcoded
 * fallback like "12:00".
 */

export const OPERATIONAL_TIME_ZONE = 'America/Santiago'

const hourMinuteFormatter = new Intl.DateTimeFormat('es-CL', {
  timeZone: OPERATIONAL_TIME_ZONE,
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

/**
 * Formats a bucket's clock hour (0-23, as already returned by the backend)
 * as "HH:00". Does not invent an hour for missing/duplicate buckets --
 * callers pass whatever hour value the bucket actually carries.
 */
export function formatHourLabel(hour: number): string {
  const clamped = Number.isFinite(hour) ? Math.trunc(hour) : 0
  return `${String(clamped).padStart(2, '0')}:00`
}

/**
 * Formats an ISO timestamp as "HH:mm" in the operational timezone. Returns
 * null for missing/invalid input so callers can show their own placeholder
 * instead of a misleading default time.
 */
export function formatShiftTime(iso: string | null | undefined): string | null {
  if (!iso) return null
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return null
  return hourMinuteFormatter.format(parsed)
}
