import { useState } from 'react'
import { Download, FileText, Loader2 } from 'lucide-react'
import type { CopilotContext, CopilotReportDraft } from '../../lib/aiCopilot'
import { secureApi } from '../../lib/secureApi'

function safeFilename(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase()
}

function reportManifest(executive: boolean): string[] {
  return executive
    ? ['Resumen ejecutivo y cumplimiento', 'Riesgos, alertas y decisiones', 'Equipos, demoras y acciones']
    : ['Producción, meta y ciclos', 'Detalle CAEX y unidades de carguío', 'Orígenes, destinos y distribución']
}

export function AIReportDraftCard({ report, context }: { report: CopilotReportDraft; context: CopilotContext }) {
  const [downloading, setDownloading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const executive = report.kind.includes('executive')
  const manifest = reportManifest(executive)

  const downloadReport = async () => {
    if (downloading) return
    setDownloading(true)
    setError(null)
    try {
      const endpoint = executive ? '/api/report/cockpit-executive-pdf' : '/api/report/shift-pdf'
      const params = new URLSearchParams()
      if (context.selected_date) params.set('fecha', context.selected_date)
      if (context.shift) params.set('turno', context.shift)
      const response = await secureApi.get<Blob>(`${endpoint}${params.size ? `?${params.toString()}` : ''}`, {
        responseType: 'blob',
        timeout: 60_000,
        headers: { Accept: 'application/pdf' },
      })
      if (!(response.data instanceof Blob) || response.data.size === 0) {
        throw new Error('El servidor no entregó un PDF válido.')
      }
      const url = URL.createObjectURL(response.data)
      const link = document.createElement('a')
      link.href = url
      link.download = `${safeFilename(report.title) || 'informe-jarvis'}.pdf`
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => URL.revokeObjectURL(url), 1_000)
    } catch (downloadError) {
      setError(downloadError instanceof Error ? downloadError.message : 'No se pudo generar el informe completo.')
    } finally {
      setDownloading(false)
    }
  }

  return (
    <article className="ai-copilot-report-card">
      <div className="ai-copilot-report-icon" aria-hidden="true"><FileText size={18} /></div>
      <div className="ai-copilot-report-content">
        <span className="ai-copilot-report-status">Informe completo preparado</span>
        <h3>{report.title}</h3>
        <p>{executive ? 'Formato ejecutivo de Cockpit' : 'Formato operacional de turno'} · PDF A4 · requiere validación humana</p>
        <table className="ai-copilot-report-manifest">
          <thead><tr><th>Tablas incluidas</th><th>Estado</th></tr></thead>
          <tbody>
            {manifest.map((item) => <tr key={item}><td>{item}</td><td>Incluido</td></tr>)}
          </tbody>
        </table>
        <button type="button" onClick={() => void downloadReport()} disabled={downloading}>
          {downloading ? <Loader2 size={14} className="ai-copilot-spin" /> : <Download size={14} />}
          {downloading ? 'Generando informe…' : 'Descargar informe completo'}
        </button>
        {error && <p className="ai-copilot-report-error" role="alert">{error} Inténtelo nuevamente.</p>}
      </div>
    </article>
  )
}
