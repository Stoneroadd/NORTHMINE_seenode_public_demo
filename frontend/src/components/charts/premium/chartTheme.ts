import { useEffect, useState } from 'react'
import type { EChartsOption } from 'echarts'
import { useAppStore } from '../../../store'

// Misma paleta de acento que tokens.css / northmine-tokens.css (--mineral,
// --cyan, --amber, --red) para que los charts ECharts combinen con el resto
// de la interfaz en vez de usar tonos propios.
const darkPalette = {
  mineral: '#3EE58A',
  cyan: '#2FD4FF',
  amber: '#FFC94A',
  red: '#FF5C5C',
  steel: '#9AA8B5',
  slate: '#66717F',
  panel: '#0D121D',
  text: '#F4F7FB',
  muted: '#A2ADBA',
  grid: 'rgba(255,255,255,0.07)',
  border: 'rgba(255,255,255,0.12)',
  night: '#C98BFF',
}

// Cada apariencia (Startup Intelligence, Oscuro Negro, Light, Futur, Minimal,
// Carbon) define sus propias variables --op-green/--data-cyan/etc en
// themes.css. Leerlas en vivo desde :root permite que los gráficos ECharts
// (que no pueden usar var() de CSS) sigan el color exacto de la apariencia
// activa en lugar de solo distinguir claro/oscuro.
function readVar(name: string, fallback: string) {
  if (typeof document === 'undefined') return fallback
  const value = getComputedStyle(document.documentElement).getPropertyValue(name).trim()
  return value || fallback
}

function activePalette() {
  return {
    mineral: readVar('--op-green', darkPalette.mineral),
    cyan: readVar('--data-cyan', darkPalette.cyan),
    amber: readVar('--warn-yellow', darkPalette.amber),
    red: readVar('--danger-red', darkPalette.red),
    steel: readVar('--text-secondary', darkPalette.steel),
    slate: readVar('--text-tertiary', darkPalette.slate),
    panel: readVar('--bg-card', darkPalette.panel),
    text: readVar('--text-primary', darkPalette.text),
    muted: readVar('--text-secondary', darkPalette.muted),
    grid: readVar('--border-dim', darkPalette.grid),
    border: readVar('--border-mid', darkPalette.border),
    night: readVar('--vision-night', darkPalette.night),
  }
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
    backgroundColor: premiumPalette.panel,
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

/**
 * ECharts may provide either one parameter object or an array for tooltip
 * formatters, and transient pointer/resize frames can contain no parameter at
 * all. Normalize that boundary once so product charts never expose an
 * implementation error to the operator.
 */
export function firstChartParam(params: unknown): Record<string, unknown> | undefined {
  const candidate = Array.isArray(params) ? params[0] : params
  return candidate !== null && typeof candidate === 'object'
    ? candidate as Record<string, unknown>
    : undefined
}

export function chartDataIndex(params: unknown): number | undefined {
  const value = firstChartParam(params)?.dataIndex
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 ? value : undefined
}

// useTheme() aplica html[data-theme] dentro de un useLayoutEffect (para
// evitar parpadeos de tema en el resto de la UI). Si un chart recalculara
// sus colores con premiumPalette dentro de su propio render/useMemo al
// cambiar themeId, ese render corre en el MISMO commit, ANTES de que ese
// layout effect llegue a escribir el nuevo atributo en el DOM — por lo que
// getComputedStyle() aun devolvia el color del tema ANTERIOR (el chart
// quedaba "un tema atrasado"). React garantiza que los useEffect (pasivos)
// de todo el arbol corren despues de TODOS los useLayoutEffect del mismo
// commit, asi que este hook usa uno para recalcular una unica vez que el
// atributo ya fue aplicado. Los componentes de chart deben incluir el valor
// que retorna en el array de dependencias de su useMemo en vez de themeId.
export function useChartPaletteKey() {
  const themeId = useAppStore((s) => s.themeId)
  const [key, setKey] = useState(themeId)
  useEffect(() => {
    setKey(themeId)
  }, [themeId])
  return key
}
