import jsPDF from 'jspdf'
import autoTable from 'jspdf-autotable'
import type { FlowNode, OperationalFlowSnapshot } from '../mission-control/operational-flow/types'
import { assertionShortLabel, entityKindLabel } from '../mission-control/operational-flow/presentation'

const MARGIN = 12

const CONDITION_COLOR: Record<FlowNode['condition'], [number, number, number]> = {
  CRITICAL: [225, 125, 117],
  ATTENTION: [224, 178, 103],
  RECOVERING: [154, 168, 213],
  UNKNOWN: [161, 167, 162],
  NORMAL: [143, 194, 157],
}

const CONDITION_LABEL: Record<FlowNode['condition'], string> = {
  CRITICAL: 'Critico',
  ATTENTION: 'Atencion',
  RECOVERING: 'Recuperando',
  UNKNOWN: 'Sin dato',
  NORMAL: 'Normal',
}

function formatTimestamp(value: string): string {
  return new Intl.DateTimeFormat('es-CL', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    timeZone: 'America/Santiago',
  }).format(new Date(value))
}

export function downloadOperationalFlowReport(snapshot: OperationalFlowSnapshot, tourNodes: FlowNode[]): void {
  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const contentWidth = pageWidth - MARGIN * 2
  const event = snapshot.active_event
  const operationStable = !event

  doc.setFillColor(9, 11, 11)
  doc.rect(0, 0, pageWidth, 22, 'F')
  doc.setTextColor(196, 129, 75)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('NORTHMINE - Recorrido Operational Flow', MARGIN, 9)
  doc.setTextColor(244, 247, 250)
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.text(`${snapshot.site_id.toUpperCase()} / ${snapshot.shift_label} / ${formatTimestamp(snapshot.effective_at)}`, MARGIN, 15)
  doc.text(`Generado: ${new Date().toLocaleString('es-CL')} - Escenario: ${snapshot.scenario_label}`, MARGIN, 19.5)

  let cursorY = 30
  doc.setTextColor(15, 23, 42)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.text(operationStable ? 'Operacion estable' : event.title, MARGIN, cursorY)
  cursorY += 5.5
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  const summaryLines = doc.splitTextToSize(operationStable ? snapshot.stable_summary : snapshot.impact_summary, contentWidth)
  doc.text(summaryLines, MARGIN, cursorY)
  cursorY += summaryLines.length * 4.2 + 4

  autoTable(doc, {
    startY: cursorY,
    margin: { left: MARGIN },
    tableWidth: contentWidth,
    theme: 'grid',
    styles: { fontSize: 7.4, cellPadding: 1.8, textColor: [30, 41, 59] },
    headStyles: { fillColor: [9, 11, 11], textColor: [196, 129, 75], fontStyle: 'bold', fontSize: 7.4 },
    columnStyles: { 0: { cellWidth: 16 }, 1: { cellWidth: 42 }, 4: { cellWidth: 26 } },
    head: [['Estado', 'Nodo', 'Que muestra', 'Afirmacion', 'Ultima lectura']],
    body: tourNodes.map((node) => {
      const lastDetail = node.technical_details[0]
      return [
        CONDITION_LABEL[node.condition],
        `${node.label}\n${entityKindLabel(node.entity_kind)}`,
        node.summary,
        assertionShortLabel(node.assertion_type),
        lastDetail ? formatTimestamp(lastDetail.observed_at) : '-',
      ]
    }),
    didParseCell: (data) => {
      if (data.section === 'body' && data.column.index === 0) {
        const node = tourNodes[data.row.index]
        if (node) data.cell.styles.textColor = CONDITION_COLOR[node.condition]
        data.cell.styles.fontStyle = 'bold'
      }
    },
  })

  const afterTableY = (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? cursorY
  let detailY = afterTableY + 8

  for (const node of tourNodes) {
    if (!node.technical_details.length) continue
    if (detailY > 265) { doc.addPage(); detailY = 20 }
    doc.setTextColor(15, 23, 42)
    doc.setFontSize(9.5)
    doc.setFont('helvetica', 'bold')
    doc.text(node.label, MARGIN, detailY)
    detailY += 2
    autoTable(doc, {
      startY: detailY,
      margin: { left: MARGIN },
      tableWidth: contentWidth,
      theme: 'striped',
      styles: { fontSize: 7, cellPadding: 1.4, textColor: [51, 65, 85] },
      headStyles: { fillColor: [17, 20, 20], textColor: [244, 247, 250], fontStyle: 'bold', fontSize: 7 },
      columnStyles: { 2: { halign: 'right' } },
      head: [['Variable', 'Grupo', 'Valor']],
      body: node.technical_details.map((detail) => [
        detail.label,
        detail.group,
        `${detail.value}${detail.unit ? ` ${detail.unit}` : ''}`,
      ]),
    })
    detailY = ((doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? detailY) + 7
  }

  if (event) {
    if (detailY > 255) { doc.addPage(); detailY = 20 }
    doc.setTextColor(225, 125, 117)
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.text('Recomendacion', MARGIN, detailY)
    detailY += 5
    doc.setTextColor(51, 65, 85)
    doc.setFontSize(9)
    doc.setFont('helvetica', 'normal')
    const recommendation = `Evento "${event.title}" en estado ${event.status.toLowerCase()}. Nodo origen: ${nodeLabel(tourNodes, event.primary_node_id)}. Revisar los nodos marcados como Critico/Atencion antes de continuar el turno.`
    const recLines = doc.splitTextToSize(recommendation, contentWidth)
    doc.text(recLines, MARGIN, detailY)
  }

  const pageCount = doc.getNumberOfPages()
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139)
    doc.text(
      `NORTHMINE Intelligence - Escenario sintetico${pageCount > 1 ? ` - Pagina ${page}/${pageCount}` : ''}`,
      MARGIN,
      doc.internal.pageSize.getHeight() - 5,
    )
  }

  doc.save(`northmine_operational_flow_${snapshot.site_id}_${snapshot.shift_id}.pdf`)
}

function nodeLabel(nodes: FlowNode[], nodeId: string): string {
  return nodes.find((node) => node.node_id === nodeId)?.label ?? nodeId
}
