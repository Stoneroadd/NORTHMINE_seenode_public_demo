import { useEffect, useMemo, useState } from 'react'
import { Clipboard, Download, RotateCcw, Wand2 } from 'lucide-react'
import { getShiftStatusSources } from '../../lib/api'
import { useModuleT } from '../../i18n/useModuleT'
import { fleetT } from '../../i18n/modules/fleet'

type ChecklistStatus = 'OP' | 'FS' | 'PM' | 'DEM'

interface ChecklistEquipmentSeed {
  id: string
  label: string
  group: string
  status: ChecklistStatus
  location: string
  note?: string
}

interface ChecklistEquipment extends ChecklistEquipmentSeed {
  updatedAt?: string
}

const CHECK = '\u2705'
const CROSS = '\u274C'
const STORAGE_KEY = 'northmine:fleet-shift-checklist:v1'

const DEFAULT_EQUIPMENT: ChecklistEquipmentSeed[] = [
  { group: 'Pala', id: 'EX3600', label: '3600', status: 'OP', location: 'DES' },
  { group: 'Pala', id: 'EX3470', label: '3470', status: 'FS', location: 'P.PALA' },
  { group: 'Pala', id: 'EX3420', label: '3420', status: 'FS', location: 'DES' },
  { group: 'Pala', id: 'EX3517', label: '3517', status: 'OP', location: 'DES' },
  { group: 'Cargador', id: 'CF3672', label: 'CF3672', status: 'OP', location: 'DES' },
  { group: 'Cargador', id: 'CF3449', label: 'CF3449', status: 'OP', location: 'DES' },
  { group: 'Motoniveladora', id: 'MOTO4087', label: 'Moto 4087', status: 'OP', location: 'DES' },
  { group: 'Motoniveladora', id: 'MOTO4108', label: 'Moto 4108', status: 'OP', location: 'TALLER' },
  { group: 'Bulldozer', id: 'BULL1318', label: 'Bull 1318', status: 'OP', location: 'TALLER' },
  { group: 'Bulldozer', id: 'BULL304', label: 'Bull 304', status: 'OP', location: '2440' },
  { group: 'Bulldozer', id: 'BULL1303', label: 'Bull 1303', status: 'FS', location: 'SIN DATO' },
  { group: 'Bulldozer', id: 'BULL1320', label: 'Bull 1320', status: 'OP', location: '2440' },
  { group: 'Wheeldozer', id: 'WHEEL264', label: 'Wheel 264', status: 'OP', location: 'BUEN' },
  { group: 'Aljibe', id: 'ALJIBE359', label: 'Aljibe 359', status: 'OP', location: 'TALLER' },
  { group: 'Aljibe', id: 'ALJIBE330', label: 'Aljibe 330', status: 'OP', location: 'DES' },
  { group: 'Aljibe', id: 'ALJIBE331', label: 'Aljibe 331', status: 'OP', location: 'DES' },
  { group: 'Aljibe', id: 'ALJIBE034', label: 'Aljibe 034', status: 'OP', location: 'DES' },
  { group: 'Aljibe', id: 'ALJIBE088', label: 'Aljibe 088', status: 'OP', location: 'DES' },
  { group: 'Aljibe', id: 'ALJIBE042', label: 'Aljibe 042', status: 'OP', location: 'DES' },
  { group: 'Petrolero', id: '63016', label: '63016', status: 'OP', location: 'DES' },
  { group: 'Petrolero', id: '63026', label: '63026', status: 'FS', location: 'NANOCHIP' },
  { group: 'Petrolero', id: '63029', label: '63029', status: 'OP', location: 'DES', note: 'SIN CAS.' },
  { group: 'Perforadora', id: '9277', label: '9277', status: 'OP', location: 'DES' },
  { group: 'Perforadora', id: '9245', label: '9245', status: 'PM', location: 'TALLER' },
  { group: 'Perforadora', id: '9272', label: '9272', status: 'FS', location: 'DES' },
  { group: 'Perforadora', id: '9274', label: '9274', status: 'FS', location: 'DES' },
  { group: 'Perforadora', id: '9339', label: '9339', status: 'OP', location: 'DES' },
  { group: 'Perforadora', id: '9259', label: '9259', status: 'OP', location: 'DES' },
  { group: 'Perforadora', id: '9271', label: '9271', status: 'FS', location: 'DES' },
  { group: 'Caex 793 F (8)', id: 'CA0933', label: 'Caex 933', status: 'OP', location: 'DES' },
  { group: 'Caex 793 F (8)', id: 'CA0934', label: 'Caex 934', status: 'OP', location: 'DES' },
  { group: 'Caex 793 F (8)', id: 'CA0935', label: 'Caex 935', status: 'OP', location: 'TALLER' },
  { group: 'Caex 793 F (8)', id: 'CA0136', label: 'Caex 136', status: 'OP', location: 'DES' },
  { group: 'Caex 793 F (8)', id: 'CA0139', label: 'Caex 139', status: 'OP', location: 'DES' },
  { group: 'Caex 793 F (8)', id: 'CA0141', label: 'Caex 141', status: 'OP', location: 'DES' },
  { group: 'Caex 793 F (8)', id: 'CA0165', label: 'Caex 165', status: 'OP', location: 'DES' },
  { group: 'Caex 793 F (8)', id: 'CA0168', label: 'Caex 168', status: 'OP', location: 'DES' },
  { group: 'Caex 789 D (20)', id: 'CA2912', label: 'Caex 912', status: 'OP', location: 'DES' },
  { group: 'Caex 789 D (20)', id: 'CA2915', label: 'Caex 915', status: 'FS', location: '2440' },
  { group: 'Caex 789 D (20)', id: 'CA2916', label: 'Caex 916', status: 'OP', location: 'DES' },
  { group: 'Caex 789 D (20)', id: 'CA2917', label: 'Caex 917', status: 'FS', location: 'TALLER' },
  { group: 'Caex 789 D (20)', id: 'CA2918', label: 'Caex 918', status: 'OP', location: 'DES' },
  { group: 'Caex 789 D (20)', id: 'CA2919', label: 'Caex 919', status: 'OP', location: 'DES' },
  { group: 'Caex 789 D (20)', id: 'CA2920', label: 'Caex 920', status: 'OP', location: 'DES' },
  { group: 'Caex 789 D (20)', id: 'CA2922', label: 'Caex 922', status: 'OP', location: 'DES' },
  { group: 'Caex 789 D (20)', id: 'CA2929', label: 'Caex 929', status: 'OP', location: 'DES' },
  { group: 'Caex 789 D (20)', id: 'CA0930', label: 'Caex 930', status: 'OP', location: 'DES' },
  { group: 'Caex 789 D (20)', id: 'CA2931', label: 'Caex 931', status: 'OP', location: 'TALLER' },
  { group: 'Caex 789 D (20)', id: 'CA2943', label: 'Caex 943', status: 'OP', location: 'DES' },
  { group: 'Caex 789 D (20)', id: 'CA2944', label: 'Caex 944', status: 'OP', location: 'DES' },
  { group: 'Caex 789 D (20)', id: 'CA2954', label: 'Caex 954', status: 'OP', location: 'DES' },
  { group: 'Caex 789 D (20)', id: 'CA2955', label: 'Caex 955', status: 'OP', location: 'DES' },
  { group: 'Caex 789 D (20)', id: 'CA2956', label: 'Caex 956', status: 'OP', location: 'DES' },
  { group: 'Caex 789 D (20)', id: 'CA2957', label: 'Caex 957', status: 'OP', location: '2440' },
  { group: 'Caex 789 D (20)', id: 'CA2958', label: 'Caex 958', status: 'OP', location: 'DES' },
  { group: 'Caex 789 D (20)', id: 'CA2960', label: 'Caex 960', status: 'OP', location: 'DES' },
  { group: 'Caex 789 D (20)', id: 'CA2961', label: 'Caex 961', status: 'OP', location: 'P.TEPSAC' },
  { group: 'Caex 793D (4)', id: 'CA2967', label: 'Caex 2967', status: 'OP', location: 'DES' },
  { group: 'Caex 793D (4)', id: 'CA2968', label: 'Caex 2968', status: 'OP', location: 'TALLER' },
  { group: 'Caex 793D (4)', id: 'CA2969', label: 'Caex 2969', status: 'FS', location: 'TALLER' },
  { group: 'Caex 793D (4)', id: 'CA2971', label: 'Caex 2971', status: 'OP', location: 'DES' },
  { group: 'CAEX 980 (2)', id: 'CA0413', label: 'CAEX 413', status: 'OP', location: 'DES' },
  { group: 'CAEX 980 (2)', id: 'CA0414', label: 'CAEX 414', status: 'OP', location: 'DES' },
]

function today() {
  return new Date().toLocaleDateString('es-CL')
}

function statusOk(status: ChecklistStatus) {
  return status === 'OP'
}

function buildWhatsappText(rows: ChecklistEquipment[], shift: string, date: string) {
  const grouped = rows.reduce<Record<string, ChecklistEquipment[]>>((acc, item) => {
    acc[item.group] = acc[item.group] || []
    acc[item.group].push(item)
    return acc
  }, {})

  const lines = [`Turno ${shift} ${date}`, '']
  Object.entries(grouped).forEach(([group, items]) => {
    lines.push(`*${group}*`)
    items.forEach((item) => {
      const mark = statusOk(item.status) ? CHECK : CROSS
      const note = item.note ? ` ${item.note}` : ''
      lines.push(`${item.label}=${item.status}/${item.location}${mark}${note}`)
    })
    lines.push('')
  })

  return lines.join('\n').trim()
}

function loadInitialRows(): ChecklistEquipment[] {
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_EQUIPMENT
    const parsed = JSON.parse(raw) as ChecklistEquipment[]
    if (!Array.isArray(parsed) || !parsed.length) return DEFAULT_EQUIPMENT
    const byId = new Map(parsed.map((item) => [item.id, item]))
    return DEFAULT_EQUIPMENT.map((item) => ({ ...item, ...byId.get(item.id) }))
  } catch {
    return DEFAULT_EQUIPMENT
  }
}

// --- Autocompletado desde datos reales -------------------------------------
// Cruza el checklist con dos fuentes: estado WENCO en vivo (CAEX y palas) y
// el ultimo dia del reporte diario de mantencion (toda la flota auxiliar).
// El match es por digitos porque los IDs difieren entre sistemas
// (BULL1303 vs TC1303, Aljibe 034 vs CU64034, Caex 933 vs CA2933...).

function digitsOf(value: string): string {
  return value.replace(/\D/g, '').replace(/^0+/, '')
}

function digitsMatch(a: string, b: string): boolean {
  if (!a || !b) return false
  if (a === b) return true
  const short = a.length <= b.length ? a : b
  const long = a.length <= b.length ? b : a
  return short.length >= 3 && long.endsWith(short)
}

interface Suggestion {
  status: ChecklistStatus
  location?: string
  note?: string
  fuente: 'wenco' | 'reporte'
}

function suggestionFromWenco(item: { estado?: string | null; status_category?: string | null; status_desc?: string | null; destino?: string | null }): Suggestion {
  const category = (item.status_category ?? '').toUpperCase()
  const desc = (item.status_desc ?? '').toUpperCase()
  if (category === 'MANTENCION') {
    const programada = desc.includes('PROGRAMAD')
    return { status: programada ? 'PM' : 'FS', location: 'TALLER', note: item.status_desc ?? undefined, fuente: 'wenco' }
  }
  if (category === 'STANDBY') return { status: 'DEM', location: 'DES', note: item.status_desc ?? undefined, fuente: 'wenco' }
  if ((item.estado ?? '').toUpperCase() === 'POSIBLE AVERIA') {
    return { status: 'DEM', location: 'DES', note: 'sin actividad', fuente: 'wenco' }
  }
  return { status: 'OP', location: 'DES', fuente: 'wenco' }
}

function suggestionFromReporte(item: { estado: string; tipo?: string | null; sistema?: string | null }): Suggestion {
  if (item.estado.toUpperCase().replace('/', '') === 'FS') {
    const planificado = (item.tipo ?? '').toLowerCase().includes('planificado')
    return {
      status: planificado ? 'PM' : 'FS',
      location: 'TALLER',
      note: item.sistema ? item.sistema.slice(0, 22) : undefined,
      fuente: 'reporte',
    }
  }
  return { status: 'OP', location: 'DES', fuente: 'reporte' }
}

function downloadText(filename: string, content: string) {
  const blob = new Blob([content], { type: 'text/plain;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

async function copyText(content: string) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(content)
    return
  }
  const area = document.createElement('textarea')
  area.value = content
  area.style.position = 'fixed'
  area.style.left = '-9999px'
  document.body.appendChild(area)
  area.select()
  document.execCommand('copy')
  document.body.removeChild(area)
}

export function FleetShiftChecklist() {
  const t = useModuleT(fleetT)
  const [rows, setRows] = useState<ChecklistEquipment[]>(loadInitialRows)
  const [shift, setShift] = useState('DIA')
  const [date, setDate] = useState(today)
  const [copied, setCopied] = useState(false)
  const [autofilling, setAutofilling] = useState(false)
  const [autofillMessage, setAutofillMessage] = useState<string | null>(null)

  const handleAutofill = async () => {
    setAutofilling(true)
    setAutofillMessage(null)
    try {
      const sources = await getShiftStatusSources()
      const wencoPool = [...sources.wenco_caex, ...sources.wenco_uc]
        .filter((item) => item.id)
        .map((item) => ({ digits: digitsOf(item.id), item }))
      const reportePool = sources.averias.items
        .map((item) => ({ digits: digitsOf(item.equipment_id), item }))
      let desdeWenco = 0
      let desdeReporte = 0
      let sinDato = 0
      setRows((current) => current.map((row) => {
        const rowDigits = digitsOf(row.id)
        const wenco = wencoPool.find((entry) => digitsMatch(entry.digits, rowDigits))
        if (wenco) {
          desdeWenco += 1
          const suggestion = suggestionFromWenco(wenco.item)
          return {
            ...row,
            status: suggestion.status,
            location: suggestion.status === 'OP' ? row.location : (suggestion.location ?? row.location),
            note: suggestion.status === 'OP' ? undefined : suggestion.note,
            updatedAt: new Date().toISOString(),
          }
        }
        const reporte = reportePool.find((entry) => digitsMatch(entry.digits, rowDigits))
        if (reporte) {
          desdeReporte += 1
          const suggestion = suggestionFromReporte(reporte.item)
          return {
            ...row,
            status: suggestion.status,
            location: suggestion.status === 'OP' ? row.location : (suggestion.location ?? row.location),
            note: suggestion.status === 'OP' ? undefined : suggestion.note,
            updatedAt: new Date().toISOString(),
          }
        }
        sinDato += 1
        return row
      }))
      const fechaReporte = sources.averias.report_date ? t.report_date_suffix(sources.averias.report_date.split('-').reverse().join('-')) : ''
      setAutofillMessage(
        t.autofill_success(desdeWenco, desdeReporte, fechaReporte, sinDato),
      )
    } catch {
      setAutofillMessage(t.autofill_error)
    } finally {
      setAutofilling(false)
    }
  }

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(rows))
  }, [rows])

  const grouped = useMemo(() => rows.reduce<Record<string, ChecklistEquipment[]>>((acc, item) => {
    acc[item.group] = acc[item.group] || []
    acc[item.group].push(item)
    return acc
  }, {}), [rows])
  const whatsappText = useMemo(() => buildWhatsappText(rows, shift, date), [date, rows, shift])
  const counts = useMemo(() => ({
    total: rows.length,
    ok: rows.filter((item) => statusOk(item.status)).length,
    out: rows.filter((item) => !statusOk(item.status)).length,
  }), [rows])

  const patchRow = (id: string, patch: Partial<ChecklistEquipment>) => {
    setRows((current) => current.map((item) => item.id === id ? { ...item, ...patch, updatedAt: new Date().toISOString() } : item))
  }

  const handleCopy = async () => {
    await copyText(whatsappText)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1400)
  }

  return (
    <section className="panel fleet-shift-checklist">
      <div className="panel-header">
        <div>
          <span className="panel-kicker">{t.checklist_kicker}</span>
          <h2>{t.checklist_title}</h2>
        </div>
        <span className="panel-tag">{t.checklist_tag}</span>
      </div>

      <div className="fleet-checklist-toolbar">
        <label>
          <span>{t.shift_label}</span>
          <select value={shift} onChange={(event) => setShift(event.target.value)}>
            <option value="DIA">DIA</option>
            <option value="NOCHE">NOCHE</option>
          </select>
        </label>
        <label>
          <span>{t.date_label}</span>
          <input value={date} onChange={(event) => setDate(event.target.value)} />
        </label>
        <button type="button" className="command-button" onClick={handleAutofill} disabled={autofilling}>
          <Wand2 size={15} />
          {autofilling ? t.autofill_loading : t.autofill_button}
        </button>
        <button type="button" className="command-button command-button-secondary" onClick={handleCopy}>
          <Clipboard size={15} />
          {copied ? t.copied : t.copy_wsp}
        </button>
        <button type="button" className="command-button command-button-secondary" onClick={() => downloadText(`status-flota-${date}.txt`, whatsappText)}>
          <Download size={15} />
          {t.download_txt}
        </button>
        <button type="button" className="command-button command-button-secondary" onClick={() => setRows(DEFAULT_EQUIPMENT)}>
          <RotateCcw size={15} />
          {t.reset}
        </button>
      </div>

      {autofillMessage && (
        <p style={{ color: 'var(--nm-muted)', fontSize: '0.82rem', margin: '6px 0 0' }}>{autofillMessage}</p>
      )}

      <div className="fleet-checklist-summary">
        <span><small>{t.total}</small><strong>{counts.total}</strong></span>
        <span><small>{t.operational}</small><strong>{counts.ok}</strong></span>
        <span><small>{t.out_of_service_short}</small><strong>{counts.out}</strong></span>
        <span><small>{t.format_label}</small><strong>WSP</strong></span>
      </div>

      <div className="fleet-checklist-layout">
        <div className="fleet-checklist-groups">
          {Object.entries(grouped).map(([group, items]) => (
            <section key={group} className="fleet-checklist-group">
              <div className="fleet-checklist-group-head">
                <strong>{group}</strong>
                <span>{t.equipos_count(items.length)}</span>
              </div>
              <div className="fleet-checklist-rows">
                {items.map((item) => (
                  <article key={item.id} className={!statusOk(item.status) ? 'is-out' : ''}>
                    <strong>{item.label}</strong>
                    <div className="fleet-checklist-status-buttons">
                      {(['OP', 'FS', 'PM', 'DEM'] as ChecklistStatus[]).map((option) => (
                        <button
                          key={option}
                          type="button"
                          className={item.status === option ? 'is-active' : ''}
                          onClick={() => patchRow(item.id, { status: option })}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                    <input value={item.location} onChange={(event) => patchRow(item.id, { location: event.target.value.toUpperCase() })} aria-label={t.location_aria(item.label)} />
                    <span>{statusOk(item.status) ? CHECK : CROSS}</span>
                  </article>
                ))}
              </div>
            </section>
          ))}
        </div>

        <aside className="fleet-checklist-preview">
          <div className="panel-header">
            <div>
              <span className="panel-kicker">{t.preview_kicker}</span>
              <h2>{t.preview_title}</h2>
            </div>
          </div>
          <textarea value={whatsappText} readOnly />
        </aside>
      </div>
    </section>
  )
}
