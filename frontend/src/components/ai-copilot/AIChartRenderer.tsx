import { PremiumBarChart } from '../charts/premium/PremiumBarChart'
import type { CopilotChartSpec } from '../../lib/aiCopilot'

/**
 * Renderiza una ChartSpec ya validada por el backend (chart_type cerrado,
 * datos deterministicos salidos de una herramienta, nunca generados por el
 * modelo). Delega en los componentes Premium* existentes para heredar tema,
 * i18n y estados de carga/error de forma gratuita.
 */
export function AIChartRenderer({ spec }: { spec: CopilotChartSpec }) {
  if (spec.chart_type === 'bar' && spec.x_field && spec.y_field) {
    const data = spec.data as Array<Record<string, number | string>>
    return (
      <div className="ai-copilot-chart">
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
    <div className="ai-copilot-chart ai-copilot-chart--table">
      <span className="ai-copilot-chart-title">{spec.title}</span>
      <table className="ai-copilot-chart-fallback-table">
        <tbody>
          {spec.data.slice(0, 12).map((row, index) => (
            <tr key={index}>
              {Object.entries(row).map(([key, value]) => (
                <td key={key}>
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
