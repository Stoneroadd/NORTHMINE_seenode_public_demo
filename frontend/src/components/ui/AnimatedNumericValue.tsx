import { useAnimatedNumber } from '../../hooks/useAnimatedNumber'

function parseNumericValue(value: string) {
  const match = value.match(/^([+-]?)(\d[\d.,]*)(.*)$/)
  if (!match) return null

  const [, sign, rawNumber, suffix] = match
  const hasComma = rawNumber.includes(',')
  const dotCount = (rawNumber.match(/\./g) ?? []).length
  const decimalDigits = hasComma
    ? rawNumber.split(',')[1]?.length ?? 0
    : dotCount === 1 && rawNumber.split('.')[1]?.length !== 3
      ? rawNumber.split('.')[1]?.length ?? 0
      : 0
  const normalized = hasComma
    ? rawNumber.replace(/\./g, '').replace(',', '.')
    : dotCount > 1 || rawNumber.split('.')[1]?.length === 3
      ? rawNumber.replace(/\./g, '')
      : rawNumber
  const numeric = Number(normalized) * (sign === '-' ? -1 : 1)

  if (!Number.isFinite(numeric)) return null
  return { numeric, suffix, decimalDigits }
}

interface Props {
  value: string
  enabled?: boolean
  durationMs?: number
}

export function AnimatedNumericValue({ value, enabled = true, durationMs = 900 }: Props) {
  const parsed = parseNumericValue(value)
  const animated = useAnimatedNumber(parsed?.numeric ?? 0, {
    enabled: Boolean(parsed) && enabled,
    initialValue: 0,
    durationMs,
  })

  if (!parsed) return <>{value}</>

  return (
    <>
      {animated.toLocaleString('es-CL', {
        minimumFractionDigits: parsed.decimalDigits,
        maximumFractionDigits: parsed.decimalDigits,
      })}
      {parsed.suffix}
    </>
  )
}
