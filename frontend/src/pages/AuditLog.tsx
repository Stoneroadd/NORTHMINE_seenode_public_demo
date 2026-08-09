import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useAppStore } from '../store'
import { apiFetch } from '../lib/api'
import { useModuleT } from '../i18n/useModuleT'
import { auditLogT } from '../i18n/modules/auditLog'

interface AuditEntry {
  id: number
  timestamp: string
  usuario: string
  accion: string
  metodo: string
  endpoint: string
  status_code: number
  user_agent: string
  duracion_ms: number
  detalle: string
}

const PAGE_SIZE = 100

async function fetchAuditLog(params: Record<string, string>, offset: number): Promise<{ count: number; items: AuditEntry[] }> {
  const q = new URLSearchParams({ limit: String(PAGE_SIZE), offset: String(offset), ...params }).toString()
  return apiFetch<{ count: number; items: AuditEntry[] }>(`/api/admin/audit-log?${q}`)
}

function statusColor(code: number): string {
  if (code >= 500) return 'var(--danger-red, #FF2D55)'
  if (code >= 400) return 'var(--warn-yellow, #FFD100)'
  if (code >= 300) return 'var(--warn-yellow, #FFD100)'
  return 'var(--op-green, #00FF88)'
}

export function AuditLog() {
  const t = useModuleT(auditLogT)
  const usuario        = useAppStore(s => s.usuario)
  const [filterUser,   setFilterUser]   = useState('')
  const [filterEndpt,  setFilterEndpt]  = useState('')
  const [filterAccion, setFilterAccion] = useState('')
  const [filterDesde,  setFilterDesde]  = useState('')
  const [offset,       setOffset]       = useState(0)

  const token = usuario?.token ?? ''

  const params: Record<string, string> = {}
  if (filterUser)   params.usuario  = filterUser
  if (filterEndpt)  params.endpoint = filterEndpt
  if (filterAccion) params.accion   = filterAccion
  if (filterDesde)  params.desde    = filterDesde

  const resetPage = () => setOffset(0)

  const { data, isLoading, error } = useQuery({
    queryKey: ['audit-log', token, filterUser, filterEndpt, filterAccion, filterDesde, offset],
    queryFn:  () => fetchAuditLog(params, offset),
    enabled:  !!token && usuario?.rol === 'admin',
    refetchInterval: 30_000,
  })

  if (usuario?.rol !== 'admin') {
    return (
      <div className="section-placeholder">
        <span style={{ fontSize: 32 }}>🔒</span>
        <h2>{t.acceso_restringido}</h2>
        <p>{t.acceso_restringido_desc}</p>
      </div>
    )
  }

  function exportCsv() {
    if (!data?.items) return
    const header = 'timestamp,usuario,metodo,endpoint,status_code,duracion_ms\n'
    const rows = data.items.map(r =>
      `"${r.timestamp}","${r.usuario}","${r.metodo}","${r.endpoint}",${r.status_code},${r.duracion_ms}`
    ).join('\n')
    const blob = new Blob([header + rows], { type: 'text/csv' })
    const url  = URL.createObjectURL(blob)
    const a    = document.createElement('a')
    a.href     = url
    a.download = `northmine_audit_${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div style={{ padding: '24px 28px', maxWidth: 1200 }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <div>
          <div style={{ fontSize: 11, fontWeight: 800, letterSpacing: '0.12em', color: 'var(--text-tertiary)', textTransform: 'uppercase' }}>
            {t.eyebrow}
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 800, margin: '4px 0 0', fontFamily: 'var(--font-display)' }}>
            {t.titulo}
          </h1>
          <p style={{ margin: '6px 0 0', maxWidth: 620, color: 'var(--text-secondary)', fontSize: 12 }}>
            {t.privacy_notice}
          </p>
        </div>
        <button
          onClick={exportCsv}
          style={{
            padding: '8px 16px', borderRadius: 7, border: '1px solid var(--border-bright)',
            background: 'rgba(0,255,136,0.08)', color: 'var(--op-green)', cursor: 'pointer',
            fontSize: 13, fontWeight: 700,
          }}
        >
          {t.btn_exportar_csv}
        </button>
      </div>

      {/* Filtros */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
        {([
          [t.label_usuario, filterUser,  setFilterUser,  t.placeholder_usuario],
          [t.label_endpoint, filterEndpt, setFilterEndpt, t.placeholder_endpoint],
          [t.label_accion, filterAccion, setFilterAccion, t.placeholder_accion],
          [t.label_desde, filterDesde, setFilterDesde, t.placeholder_desde],
        ] as const).map(([label, val, setter, ph]) => (
          <label key={label} style={{ display: 'flex', flexDirection: 'column', gap: 4, fontSize: 11, color: 'var(--text-tertiary)', fontWeight: 700 }}>
            {label}
            <input
              value={val}
              onChange={e => { setter(e.target.value); resetPage() }}
              placeholder={ph}
              style={{
                padding: '6px 10px', borderRadius: 6, fontSize: 13,
                border: '1px solid var(--border-mid)', background: 'var(--bg-card)',
                color: 'var(--text-primary)', fontFamily: 'var(--font-mono)', width: 200,
              }}
            />
          </label>
        ))}
      </div>

      {/* Tabla */}
      {isLoading && <div style={{ color: 'var(--text-secondary)', padding: 20 }}>{t.cargando}</div>}
      {error    && <div style={{ color: 'var(--danger-red)', padding: 20 }}>{t.error_cargar}</div>}

      {data && (
        <>
          <div style={{ overflowX: 'auto', borderRadius: 8, border: '1px solid var(--border-dim)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, fontFamily: 'var(--font-mono)' }}>
              <thead>
                <tr style={{ background: 'var(--bg-elevated)', borderBottom: '1px solid var(--border-mid)' }}>
                  {[t.col_timestamp, t.col_usuario, t.col_accion, t.col_metodo, t.col_endpoint, t.col_status, t.col_ms].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', fontSize: 10, letterSpacing: '0.1em', color: 'var(--text-tertiary)', fontWeight: 800 }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {data.items.map(row => (
                  <tr key={row.id} style={{ borderBottom: '1px solid var(--border-dim)' }}>
                    <td style={{ padding: '7px 12px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>
                      {row.timestamp.replace('T', ' ').slice(0, 19)}
                    </td>
                    <td style={{ padding: '7px 12px', color: 'var(--op-green)' }}>{row.usuario}</td>
                    <td style={{ padding: '7px 12px', color: 'var(--amber)', maxWidth: 220, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{row.accion || '—'}</td>
                    <td style={{ padding: '7px 12px', color: 'var(--data-cyan)' }}>{row.metodo}</td>
                    <td style={{ padding: '7px 12px', color: 'var(--text-primary)', maxWidth: 300, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {row.endpoint}
                    </td>
                    <td style={{ padding: '7px 12px', color: statusColor(row.status_code), fontWeight: 700 }}>
                      {row.status_code}
                    </td>
                    <td style={{ padding: '7px 12px', color: 'var(--text-tertiary)' }}>{row.duracion_ms}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div style={{ marginTop: 12, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
            <div style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>
              {t.mostrando_de_eventos(data.items.length, data.count)}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 12, color: 'var(--text-tertiary)' }}>{t.paginacion(offset, data.count)}</span>
              <button
                type="button"
                disabled={offset <= 0}
                onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
                style={{
                  padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  border: '1px solid var(--border-mid)', background: 'var(--bg-card)', color: 'var(--text-secondary)',
                  opacity: offset <= 0 ? 0.4 : 1, fontFamily: 'var(--font-mono)',
                }}
              >
                {t.btn_anterior}
              </button>
              <button
                type="button"
                disabled={offset + data.items.length >= data.count}
                onClick={() => setOffset(offset + PAGE_SIZE)}
                style={{
                  padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 700, cursor: 'pointer',
                  border: '1px solid var(--border-mid)', background: 'var(--bg-card)', color: 'var(--text-secondary)',
                  opacity: offset + data.items.length >= data.count ? 0.4 : 1, fontFamily: 'var(--font-mono)',
                }}
              >
                {t.btn_siguiente}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}
