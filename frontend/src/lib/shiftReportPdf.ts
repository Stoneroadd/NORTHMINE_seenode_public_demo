import jsPDF from 'jspdf'
import autoTable, { type RowInput } from 'jspdf-autotable'
import {
  northmineApi,
  type CaexModelRoutesGroup,
  type CurrentShiftLoadingUnit,
  type ShiftCaexRankingItem,
  type ShiftComparisonDistributionEntry,
  type ShiftComparisonEquipmentPoint,
} from './api'
import { formatTons } from './format'

// Fuente del encabezado del reporte: sirve tanto el turno vigente
// (ShiftCurrentResponse) como un snapshot historico (ShiftReportSnapshot).
export interface ShiftReportHeaderSource {
  fecha: string
  turno: string
  shift_label: string
  elapsed_minutes: number
  historic?: boolean
  caex_model_routes?: CaexModelRoutesGroup[]
}

// Reporte PDF del turno actual en UNA pagina A4:
// - CAEX en dos columnas lado a lado (descargas + tonelaje, total al cierre)
// - Resumen de movimientos por origen y por destino, lado a lado
// - Detalle por UC con una fila por destino y subtotal por unidad
// Enriquecido desde /api/shift-comparison (desglose exacto por ciclos WENCO).

const MARGIN = 12
const GUTTER = 6

function formatInt(value: number): string {
  return Math.round(value).toLocaleString('es-CL')
}

function formatKm(value?: number | null): string {
  if (value == null) return '-'
  return `${value.toLocaleString('es-CL', { maximumFractionDigits: 1 })} km`
}

function splitBench(value?: string | null): { origen: string; banco: string; malla: string } {
  if (!value) return { origen: 'Sin dato', banco: 'Sin dato', malla: 'Sin dato' }
  const parts = value.split('/').map(part => part.trim()).filter(Boolean)
  return {
    origen: parts[0] ?? 'Sin dato',
    banco: parts[1] ?? 'Sin dato',
    malla: parts.slice(2).join('/') || 'Sin dato',
  }
}

function shiftEntries(
  item: ShiftComparisonEquipmentPoint | undefined,
  shift: 'DIA' | 'NOCHE',
  kind: 'destination' | 'origin',
): ShiftComparisonDistributionEntry[] {
  if (!item) return []
  const byShift = shift === 'DIA'
    ? (kind === 'destination' ? item.dia_destination_breakdown : item.dia_origin_breakdown)
    : (kind === 'destination' ? item.noche_destination_breakdown : item.noche_origin_breakdown)
  if (byShift?.length) return byShift
  return (kind === 'destination' ? item.destination_breakdown : item.origin_breakdown) ?? []
}

function shiftBench(item: ShiftComparisonEquipmentPoint | undefined, shift: 'DIA' | 'NOCHE'): string | null {
  if (!item) return null
  if (shift === 'DIA') return item.dia_bench_mesh ?? item.bench_mesh ?? null
  return item.noche_bench_mesh ?? item.bench_mesh ?? null
}

function shiftCaexList(item: ShiftComparisonEquipmentPoint | undefined, shift: 'DIA' | 'NOCHE'): string[] {
  if (!item) return []
  const byShift = shift === 'DIA' ? item.dia_caex_id_list : item.noche_caex_id_list
  if (byShift?.length) return byShift
  return item.caex_id_list ?? []
}

const tableTheme = {
  theme: 'grid' as const,
  styles: { fontSize: 7.2, cellPadding: 1.3, textColor: [30, 41, 59] as [number, number, number] },
  headStyles: {
    fillColor: [8, 22, 38] as [number, number, number],
    textColor: [125, 211, 252] as [number, number, number],
    fontStyle: 'bold' as const,
    fontSize: 7.2,
  },
  footStyles: {
    fillColor: [16, 33, 49] as [number, number, number],
    textColor: [244, 247, 250] as [number, number, number],
    fontStyle: 'bold' as const,
    fontSize: 7.2,
  },
  alternateRowStyles: { fillColor: [241, 245, 249] as [number, number, number] },
}

const subtotalStyle = {
  fontStyle: 'bold' as const,
  fillColor: [222, 231, 240] as [number, number, number],
  textColor: [15, 23, 42] as [number, number, number],
}

function lastTableY(doc: jsPDF): number {
  return (doc as unknown as { lastAutoTable?: { finalY: number } }).lastAutoTable?.finalY ?? 26
}

function sectionTitle(doc: jsPDF, text: string, y: number, x = MARGIN): number {
  doc.setTextColor(15, 23, 42)
  doc.setFontSize(9.5)
  doc.setFont('helvetica', 'bold')
  doc.text(text, x, y)
  return y + 2
}

export async function downloadShiftPdfReport({
  current,
  caex,
  loadingUnits,
}: {
  current: ShiftReportHeaderSource
  caex: ShiftCaexRankingItem[]
  loadingUnits: CurrentShiftLoadingUnit[]
}): Promise<void> {
  const shift: 'DIA' | 'NOCHE' = current.turno === 'DIA' ? 'DIA' : 'NOCHE'

  let comparisonUnits: ShiftComparisonEquipmentPoint[] = []
  try {
    const comparison = await northmineApi.shiftComparison({ date: current.fecha })
    comparisonUnits = comparison.loading_units ?? []
  } catch {
    comparisonUnits = []
  }
  const comparisonById = new Map(comparisonUnits.map(item => [item.id.toUpperCase(), item]))

  const doc = new jsPDF({ unit: 'mm', format: 'a4' })
  const pageWidth = doc.internal.pageSize.getWidth()
  const contentWidth = pageWidth - MARGIN * 2
  const halfWidth = (contentWidth - GUTTER) / 2
  const rightX = MARGIN + halfWidth + GUTTER

  // Encabezado compacto
  doc.setFillColor(5, 13, 27)
  doc.rect(0, 0, pageWidth, 19, 'F')
  doc.setTextColor(47, 212, 255)
  doc.setFontSize(13)
  doc.setFont('helvetica', 'bold')
  doc.text('NORTHMINE - Reporte de turno', MARGIN, 8)
  doc.setTextColor(244, 247, 250)
  doc.setFontSize(7.8)
  doc.setFont('helvetica', 'normal')
  doc.text(
    `${current.shift_label} / ${current.fecha} / ${current.historic ? 'Turno completo (reporte historico)' : `${current.elapsed_minutes} min transcurridos`}`,
    MARGIN,
    13,
  )
  doc.text(
    `Generado: ${new Date().toLocaleString('es-CL')} / Fuente: /api/shift/current + /api/shift-comparison`,
    MARGIN,
    17,
  )

  // 1. CAEX en dos columnas lado a lado.
  const caexSorted = [...caex].sort((a, b) => b.toneladas - a.toneladas)
  const totalCaexTons = caexSorted.reduce((sum, item) => sum + item.toneladas, 0)
  const totalCaexCycles = caexSorted.reduce((sum, item) => sum + item.ciclos, 0)
  const splitIndex = Math.ceil(caexSorted.length / 2)
  const caexHalves = [caexSorted.slice(0, splitIndex), caexSorted.slice(splitIndex)]

  const caexTitleY = 25
  sectionTitle(doc, 'Ciclos por CAEX', caexTitleY)
  const caexTableY = caexTitleY + 2
  const caexHead = [['#', 'CAEX', 'Modelo', 'Desc.', 'Toneladas']]
  const caexRow = (item: ShiftCaexRankingItem, index: number, offset: number) => [
    String(offset + index + 1),
    item.caex_id,
    item.modelo ?? 'Sin dato',
    formatInt(item.ciclos),
    formatTons(item.toneladas),
  ]

  autoTable(doc, {
    ...tableTheme,
    startY: caexTableY,
    margin: { left: MARGIN },
    tableWidth: halfWidth,
    columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' } },
    head: caexHead,
    body: caexHalves[0].map((item, index) => caexRow(item, index, 0)),
  })
  const leftCaexY = lastTableY(doc)

  if (caexHalves[1].length) {
    autoTable(doc, {
      ...tableTheme,
      startY: caexTableY,
      margin: { left: rightX },
      tableWidth: halfWidth,
      columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right' } },
      head: caexHead,
      body: caexHalves[1].map((item, index) => caexRow(item, index, splitIndex)),
    })
  }
  const caexEndY = Math.max(leftCaexY, lastTableY(doc))

  autoTable(doc, {
    ...tableTheme,
    startY: caexEndY + 1,
    margin: { left: MARGIN },
    tableWidth: contentWidth,
    columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
    body: [[
      { content: `TOTAL CAEX (${caexSorted.length} equipos)`, styles: { ...subtotalStyle } },
      { content: `${formatInt(totalCaexCycles)} descargas`, styles: { ...subtotalStyle, halign: 'right' as const } },
      { content: formatTons(totalCaexTons), styles: { ...subtotalStyle, halign: 'right' as const } },
    ]],
  })

  // Datos por UC: bench + desglose de destinos del turno vigente.
  const unitsSorted = [...loadingUnits].sort((a, b) => b.toneladas - a.toneladas)
  const unitRows = unitsSorted.map(unit => {
    const comparisonItem = comparisonById.get(unit.carguio_id.toUpperCase())
    const destinations = shiftEntries(comparisonItem, shift, 'destination')
    const origins = shiftEntries(comparisonItem, shift, 'origin')
    return { unit, comparisonItem, destinations, origins }
  })
  const hasBreakdown = unitRows.some(row => row.destinations.length > 0)

  // 2. Resumenes por origen y destino, lado a lado.
  if (hasBreakdown) {
    const faseTotals = new Map<string, { tonnes: number; cycles: number }>()
    const destinoTotals = new Map<string, { tonnes: number; cycles: number }>()
    for (const row of unitRows) {
      for (const entry of row.origins) {
        const fase = splitBench(entry.name).origen
        const bucket = faseTotals.get(fase) ?? { tonnes: 0, cycles: 0 }
        bucket.tonnes += entry.tonnes
        bucket.cycles += entry.cycles
        faseTotals.set(fase, bucket)
      }
      for (const entry of row.destinations) {
        const bucket = destinoTotals.get(entry.name) ?? { tonnes: 0, cycles: 0 }
        bucket.tonnes += entry.tonnes
        bucket.cycles += entry.cycles
        destinoTotals.set(entry.name, bucket)
      }
    }
    const faseRows = [...faseTotals.entries()].sort((a, b) => b[1].tonnes - a[1].tonnes)
    const destinoRows = [...destinoTotals.entries()].sort((a, b) => b[1].tonnes - a[1].tonnes)

    const summaryTitleY = lastTableY(doc) + 6
    sectionTitle(doc, 'Movimiento por origen', summaryTitleY)
    sectionTitle(doc, 'Movimiento por destino', summaryTitleY, rightX)
    const summaryTableY = summaryTitleY + 2

    autoTable(doc, {
      ...tableTheme,
      startY: summaryTableY,
      margin: { left: MARGIN },
      tableWidth: halfWidth,
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
      head: [['Origen (fase)', 'Desc.', 'Toneladas']],
      body: faseRows.map(([fase, bucket]) => [fase, formatInt(bucket.cycles), formatTons(bucket.tonnes)]),
      foot: [[
        'Total mina',
        formatInt(faseRows.reduce((sum, [, bucket]) => sum + bucket.cycles, 0)),
        formatTons(faseRows.reduce((sum, [, bucket]) => sum + bucket.tonnes, 0)),
      ]],
    })
    const leftSummaryY = lastTableY(doc)

    autoTable(doc, {
      ...tableTheme,
      startY: summaryTableY,
      margin: { left: rightX },
      tableWidth: halfWidth,
      columnStyles: { 1: { halign: 'right' }, 2: { halign: 'right' } },
      head: [['Destino', 'Desc.', 'Toneladas']],
      body: destinoRows.map(([destino, bucket]) => [destino, formatInt(bucket.cycles), formatTons(bucket.tonnes)]),
      foot: [[
        'Total',
        formatInt(destinoRows.reduce((sum, [, bucket]) => sum + bucket.cycles, 0)),
        formatTons(destinoRows.reduce((sum, [, bucket]) => sum + bucket.tonnes, 0)),
      ]],
    })
    if (leftSummaryY > lastTableY(doc)) {
      // startY de la siguiente seccion se toma del mas alto de los dos.
      ;(doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY = leftSummaryY
    }
  }

  // 3. Rutas por modelo de CAEX: fase/banco/malla -> destino + distancia por ciclo.
  const modelRoutes = current.caex_model_routes ?? []
  if (modelRoutes.length) {
    const modelBody: RowInput[] = []
    for (const group of modelRoutes) {
      group.rutas.forEach((ruta, index) => {
        modelBody.push([
          index === 0 ? group.modelo : '',
          ruta.fase,
          ruta.banco,
          ruta.malla,
          ruta.destino,
          formatInt(ruta.ciclos),
          formatTons(ruta.toneladas),
          formatKm(ruta.avg_distance_km),
        ])
      })
      modelBody.push([
        {
          content: `Total ${group.modelo} (${group.equipos} equipos)`,
          colSpan: 5,
          styles: subtotalStyle,
        },
        { content: formatInt(group.ciclos), styles: { ...subtotalStyle, halign: 'right' as const } },
        { content: formatTons(group.toneladas), styles: { ...subtotalStyle, halign: 'right' as const } },
        { content: formatKm(group.avg_distance_km), styles: { ...subtotalStyle, halign: 'right' as const } },
      ])
    }
    const modelTitleY = lastTableY(doc) + 6
    sectionTitle(doc, 'Rutas por modelo de CAEX', modelTitleY)
    autoTable(doc, {
      ...tableTheme,
      startY: modelTitleY + 2,
      margin: { left: MARGIN },
      tableWidth: contentWidth,
      columnStyles: { 5: { halign: 'right' }, 6: { halign: 'right' }, 7: { halign: 'right' } },
      head: [['Modelo', 'Fase', 'Banco', 'Malla', 'Destino', 'Desc.', 'Toneladas', 'Dist./ciclo']],
      body: modelBody,
    })
  }

  // 4. Detalle por UC: una fila por destino con subtotal por unidad.
  const detailBody: RowInput[] = []
  let grandTons = 0
  let grandCycles = 0
  for (const row of unitRows) {
    const bench = splitBench(shiftBench(row.comparisonItem, shift) ?? row.unit.ubicacion)
    const entries = row.destinations.length
      ? row.destinations
      : [{ name: 'Sin dato', tonnes: row.unit.toneladas, cycles: row.unit.ciclos, pct: 100 }]
    entries.forEach((entry, index) => {
      detailBody.push([
        index === 0 ? row.unit.carguio_id : '',
        index === 0 ? (row.unit.modelo ?? 'Sin dato') : '',
        index === 0 ? bench.origen : '',
        index === 0 ? bench.banco : '',
        index === 0 ? bench.malla : '',
        entry.name,
        formatInt(entry.cycles),
        formatTons(entry.tonnes),
      ])
    })
    const caexList = shiftCaexList(row.comparisonItem, shift)
    if (caexList.length) {
      detailBody.push([{
        content: `CAEX: ${caexList.join(', ')}`,
        colSpan: 8,
        styles: {
          fontSize: 6.6,
          fontStyle: 'italic' as const,
          textColor: [71, 85, 105] as [number, number, number],
          fillColor: [248, 250, 252] as [number, number, number],
        },
      }])
    }
    const subtotalTons = entries.reduce((sum, entry) => sum + entry.tonnes, 0)
    const subtotalCycles = entries.reduce((sum, entry) => sum + entry.cycles, 0)
    grandTons += subtotalTons
    grandCycles += subtotalCycles
    const unitAvgKm = (shift === 'DIA'
      ? row.comparisonItem?.dia_avg_distance_km
      : row.comparisonItem?.noche_avg_distance_km)
      ?? row.comparisonItem?.avg_distance_km
      ?? row.unit.avg_distance_km
    detailBody.push([
      {
        content: `Total ${row.unit.carguio_id}${unitAvgKm != null ? ` - dist. media ${formatKm(unitAvgKm)}/ciclo` : ''}`,
        colSpan: 6,
        styles: subtotalStyle,
      },
      { content: formatInt(subtotalCycles), styles: { ...subtotalStyle, halign: 'right' as const } },
      { content: formatTons(subtotalTons), styles: { ...subtotalStyle, halign: 'right' as const } },
    ])
  }

  const detailTitleY = lastTableY(doc) + 6
  sectionTitle(doc, 'Origen y destino por unidad de carguio', detailTitleY)
  autoTable(doc, {
    ...tableTheme,
    startY: detailTitleY + 2,
    margin: { left: MARGIN },
    tableWidth: contentWidth,
    columnStyles: { 6: { halign: 'right' }, 7: { halign: 'right' } },
    head: [['UC', 'Modelo', 'Origen', 'Banco', 'Malla', 'Destino', 'Desc.', 'Toneladas']],
    body: detailBody,
    foot: [['TOTAL', `${unitRows.length} UC`, '', '', '', '', formatInt(grandCycles), formatTons(grandTons)]],
  })

  const pageCount = doc.getNumberOfPages()
  for (let page = 1; page <= pageCount; page += 1) {
    doc.setPage(page)
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(100, 116, 139)
    doc.text(
      `NORTHMINE Intelligence v2.0 - Datos reales WENCO${pageCount > 1 ? ` - Pagina ${page}/${pageCount}` : ''}`,
      MARGIN,
      doc.internal.pageSize.getHeight() - 5,
    )
  }

  doc.save(`northmine_reporte_turno_${current.fecha}_${shift}.pdf`)
}
