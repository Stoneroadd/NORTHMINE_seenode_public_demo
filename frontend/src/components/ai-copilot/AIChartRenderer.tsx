import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { PremiumBarChart } from '../charts/premium/PremiumBarChart'
import type { CopilotChartSpec } from '../../lib/aiCopilot'
import { gsap } from '../../lib/animation/gsap'

/**
 * Renderiza una ChartSpec ya validada por el backend (chart_type cerrado,
 * datos deterministicos salidos de una herramienta, nunca generados por el
 * modelo). Delega en los componentes Premium* existentes para heredar tema,
 * i18n y estados de carga/error de forma gratuita.
 */
export function AIChartRenderer({ spec }: { spec: CopilotChartSpec }) {
  const rootRef = useRef<HTMLDivElement>(null)

  useGSAP(() => {
    const root = rootRef.current
    if (!root || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return

    const title = root.querySelector<HTMLElement>('.ai-copilot-chart-title')
    const chartSurface = root.querySelector<HTMLElement>('.echarts-for-react')
    const values = Array.from(root.querySelectorAll<HTMLElement>('[data-agent-value]'))
    const timeline = gsap.timeline({ defaults: { ease: 'power3.out' } })

    if (title) {
      timeline.fromTo(title, { autoAlpha: 0.55 }, { autoAlpha: 1, duration: 0.24, clearProps: 'opacity,visibility' })
    }
    if (chartSurface) {
      timeline.fromTo(chartSurface, {
        clipPath: 'inset(0 100% 0 0)',
        filter: 'brightness(1.12)',
      }, {
        clipPath: 'inset(0 0% 0 0)',
        filter: 'brightness(1)',
        duration: 0.58,
        clearProps: 'clipPath,filter',
      }, 0.04)
    }
    if (values.length) {
      timeline.fromTo(values, { autoAlpha: 0.4, x: -5 }, {
        autoAlpha: 1,
        x: 0,
        duration: 0.3,
        stagger: 0.035,
        clearProps: 'transform,opacity,visibility',
      }, 0.08)
    }
  }, { scope: rootRef, dependencies: [spec], revertOnUpdate: true })

  if (spec.chart_type === 'bar' && spec.x_field && spec.y_field) {
    const data = spec.data as Array<Record<string, number | string>>
    return (
      <div ref={rootRef} className="ai-copilot-chart ai-copilot-chart--visualizing">
        <span className="ai-copilot-chart-title">{spec.title}</span>
        <PremiumBarChart
          data={data}
          xKey={spec.x_field}
          series={[{ key: spec.y_field, name: spec.unit ? `${spec.title} (${spec.unit})` : spec.title }]}
          height={220}
        />
      </div>
    )
  }

  return (
    <div ref={rootRef} className="ai-copilot-chart ai-copilot-chart--table ai-copilot-chart--visualizing">
      <span className="ai-copilot-chart-title">{spec.title}</span>
      <table className="ai-copilot-chart-fallback-table">
        <tbody>
          {spec.data.slice(0, 12).map((row, index) => (
            <tr key={index}>
              {Object.entries(row).map(([key, value]) => (
                <td key={key} data-agent-value={typeof value === 'number' ? 'true' : undefined}>
                  {String(value)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
