import type { EChartsOption } from 'echarts'

const darkPalette = {
  mineral: '#75D6A0',
  cyan: '#7AA7C7',
  amber: '#FFB84D',
  red: '#EF6F6C',
  steel: '#9AA8B5',
  slate: '#66717F',
  panel: '#0D121D',
  text: '#F4F7FB',
  muted: '#A2ADBA',
  grid: 'rgba(255,255,255,0.07)',
  border: 'rgba(255,255,255,0.12)',
}

const lightPalette = {
  mineral: '#15803D',
  cyan: '#0369A1',
  amber: '#B45309',
  red: '#DC2626',
  steel: '#475569',
  slate: '#64748B',
  panel: '#FFFFFF',
  text: '#0F172A',
  muted: '#475569',
  grid: 'rgba(15,23,42,0.12)',
  border: 'rgba(15,23,42,0.18)',
}

function activePalette() {
  return typeof document !== 'undefined' && document.documentElement.dataset.theme === 'light'
    ? lightPalette
    : darkPalette
}

// Charts read these values while building their options, so switching theme
// keeps labels, grids and tooltips legible without duplicating every chart.
export const premiumPalette = new Proxy(darkPalette, {
  get(_target, property: keyof typeof darkPalette) {
    return activePalette()[property]
  },
})

export function formatNumber(value: number, maximumFractionDigits = 0) {
  return new Intl.NumberFormat('es-CL', { maximumFractionDigits }).format(value)
}

export function formatTons(value: number) {
  return `${formatNumber(Math.round(value))} t`
}

export function tooltipBase(): EChartsOption['tooltip'] {
  return {
    trigger: 'axis',
    backgroundColor: 'rgba(9,13,20,0.96)',
    borderColor: premiumPalette.border,
    borderWidth: 1,
    padding: [10, 12],
    textStyle: {
      color: premiumPalette.text,
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: 12,
    },
    extraCssText: 'box-shadow: 0 20px 50px rgba(0,0,0,0.42); border-radius: 8px;',
  }
}

export const axisLabel = {
  get color() { return activePalette().muted },
  fontSize: 11,
  fontFamily: 'Inter, system-ui, sans-serif',
}

export const baseGrid = {
  top: 22,
  right: 18,
  bottom: 48,
  left: 72,
}

export function hasValues<T>(items: T[] | undefined | null) {
  return Array.isArray(items) && items.length > 0
}
