import { Download, FileText } from 'lucide-react'
import { jsPDF } from 'jspdf'
import type { CopilotReportDraft } from '../../lib/aiCopilot'

function safeFilename(value: string): string {
  return value.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9_-]+/g, '-').replace(/^-+|-+$/g, '').toLowerCase()
}

function downloadPdf(report: CopilotReportDraft): void {
  const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
  const margin = 18
  const contentWidth = 210 - margin * 2
  let y = 20
  pdf.setTextColor(9, 27, 36)
  pdf.setFont('helvetica', 'bold')
  pdf.setFontSize(17)
  pdf.text('NORTHMINE · JARVIS', margin, y)
  y += 9
  pdf.setFontSize(13)
  pdf.text(pdf.splitTextToSize(report.title, contentWidth), margin, y)
  y += 12
  pdf.setFont('helvetica', 'normal')
  pdf.setFontSize(8)
  pdf.setTextColor(78, 91, 99)
  pdf.text('BORRADOR · DATOS SINTETICOS DE DEMOSTRACION · REQUIERE VALIDACION HUMANA', margin, y)
  y += 10

  for (const [heading, body] of Object.entries(report.sections)) {
    const bodyLines = pdf.splitTextToSize(body, contentWidth)
    if (y + 9 + bodyLines.length * 4.6 > 280) {
      pdf.addPage()
      y = 20
    }
    pdf.setTextColor(9, 100, 122)
    pdf.setFont('helvetica', 'bold')
    pdf.setFontSize(10)
    pdf.text(heading.toUpperCase(), margin, y)
    y += 6
    pdf.setTextColor(22, 32, 38)
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(9)
    pdf.text(bodyLines, margin, y)
    y += bodyLines.length * 4.6 + 7
  }

  const pages = pdf.getNumberOfPages()
  for (let page = 1; page <= pages; page += 1) {
    pdf.setPage(page)
    pdf.setFontSize(8)
    pdf.setTextColor(110, 120, 126)
    pdf.text(`Generado por JARVIS · ${new Date().toLocaleString('es-CL')} · Pagina ${page}/${pages}`, margin, 291)
  }
  pdf.save(`${safeFilename(report.title) || 'reporte-jarvis'}.pdf`)
}

export function AIReportDraftCard({ report }: { report: CopilotReportDraft }) {
  return (
    <article className="ai-copilot-report-card">
      <div className="ai-copilot-report-icon" aria-hidden="true"><FileText size={18} /></div>
      <div className="ai-copilot-report-content">
        <span className="ai-copilot-report-status">Borrador generado</span>
        <h3>{report.title}</h3>
        <p>{Object.keys(report.sections).length} secciones · PDF local · datos de demostracion</p>
        <button type="button" onClick={() => downloadPdf(report)}><Download size={14} /> Descargar PDF</button>
      </div>
    </article>
  )
}
