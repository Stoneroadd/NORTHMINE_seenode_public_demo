import { useCallback, useEffect, useState } from 'react'
import { Check, Clock3, LoaderCircle, RefreshCw, X } from 'lucide-react'
import {
  listDemoAccessRequests,
  reviewDemoAccessRequest,
} from '../services/demoAccessService'
import type {
  DemoAccessRequestAdminRecord,
  DemoAccessRequestStatus,
} from '../types/demoAccess'
import '../styles/demo-access-admin.css'

const filters: Array<{ label: string; value: DemoAccessRequestStatus | 'all' }> = [
  { label: 'Todas', value: 'all' },
  { label: 'Pendientes', value: 'pending' },
  { label: 'Aprobadas', value: 'approved' },
  { label: 'Rechazadas', value: 'rejected' },
]

function formatDate(value: string) {
  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value))
}

export function DemoAccessAdminPage() {
  const [filter, setFilter] = useState<DemoAccessRequestStatus | 'all'>('pending')
  const [items, setItems] = useState<DemoAccessRequestAdminRecord[]>([])
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [notes, setNotes] = useState('')
  const [loading, setLoading] = useState(true)
  const [reviewing, setReviewing] = useState(false)
  const [error, setError] = useState('')

  const selected = items.find((item) => item.id === selectedId) ?? null

  const loadRequests = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const result = await listDemoAccessRequests(filter === 'all' ? undefined : filter)
      setItems(result.items)
      setSelectedId((current) => (
        current && result.items.some((item) => item.id === current)
          ? current
          : result.items[0]?.id ?? null
      ))
    } catch {
      setError('No fue posible cargar las solicitudes.')
    } finally {
      setLoading(false)
    }
  }, [filter])

  useEffect(() => {
    void loadRequests()
  }, [loadRequests])

  useEffect(() => {
    setNotes(selected?.internal_notes ?? '')
  }, [selected?.id, selected?.internal_notes])

  const review = async (action: 'approve' | 'reject') => {
    if (!selected || reviewing) return
    setReviewing(true)
    setError('')
    try {
      await reviewDemoAccessRequest(selected.id, action, notes)
      await loadRequests()
    } catch {
      setError('No fue posible actualizar la solicitud.')
    } finally {
      setReviewing(false)
    }
  }

  return (
    <section className="nm-demo-access-admin" aria-labelledby="demo-access-admin-title">
      <header className="nm-demo-access-admin__header">
        <div>
          <span>Administracion</span>
          <h1 id="demo-access-admin-title">Solicitudes de acceso al demo</h1>
          <p>Revision manual. Aprobar una solicitud no crea una cuenta.</p>
        </div>
        <button type="button" onClick={() => void loadRequests()} disabled={loading}>
          <RefreshCw size={16} aria-hidden="true" /> Actualizar
        </button>
      </header>

      <div className="nm-demo-access-admin__filters" aria-label="Filtrar solicitudes">
        {filters.map((item) => (
          <button
            key={item.value}
            type="button"
            aria-pressed={filter === item.value}
            onClick={() => setFilter(item.value)}
          >
            {item.label}
          </button>
        ))}
      </div>

      {error && <div className="nm-demo-access-admin__error" role="alert">{error}</div>}

      <div className="nm-demo-access-admin__workspace">
        <div className="nm-demo-access-admin__list" aria-busy={loading}>
          {loading ? (
            <div className="nm-demo-access-admin__state">
              <LoaderCircle size={22} aria-hidden="true" /> Cargando solicitudes
            </div>
          ) : items.length === 0 ? (
            <div className="nm-demo-access-admin__state">
              No hay solicitudes en este estado.
            </div>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                type="button"
                className={selectedId === item.id ? 'is-selected' : ''}
                onClick={() => setSelectedId(item.id)}
              >
                <span className={`is-${item.status}`}>{item.status}</span>
                <strong>{item.first_name} {item.last_name}</strong>
                <small>{item.company} · {item.role}</small>
                <time dateTime={item.created_at}>{formatDate(item.created_at)}</time>
              </button>
            ))
          )}
        </div>

        <div className="nm-demo-access-admin__detail">
          {selected ? (
            <>
              <header>
                <div>
                  <span className={`is-${selected.status}`}>{selected.status}</span>
                  <h2>{selected.first_name} {selected.last_name}</h2>
                  <p>{selected.email_normalized}</p>
                </div>
                <time dateTime={selected.created_at}>{formatDate(selected.created_at)}</time>
              </header>

              <dl>
                <div><dt>Empresa</dt><dd>{selected.company}</dd></div>
                <div><dt>Cargo</dt><dd>{selected.role}</dd></div>
                <div><dt>Pais</dt><dd>{selected.country}</dd></div>
                <div><dt>Operacion</dt><dd>{selected.operation_type || 'No indicada'}</dd></div>
                <div><dt>Flota</dt><dd>{selected.fleet_size_range || 'No indicada'}</dd></div>
                <div><dt>Telefono</dt><dd>{selected.phone_optional || 'No indicado'}</dd></div>
              </dl>

              <section>
                <h3>Intereses</h3>
                <ul>{selected.interests.map((interest) => <li key={interest}>{interest}</li>)}</ul>
              </section>

              <section>
                <h3>Mensaje</h3>
                <p>{selected.message || 'Sin mensaje adicional.'}</p>
              </section>

              <label>
                Notas internas
                <textarea
                  value={notes}
                  onChange={(event) => setNotes(event.target.value)}
                  maxLength={1000}
                  rows={4}
                />
              </label>

              <div className="nm-demo-access-admin__actions">
                <button
                  type="button"
                  className="is-approve"
                  onClick={() => void review('approve')}
                  disabled={reviewing}
                >
                  <Check size={16} aria-hidden="true" /> Aprobar
                </button>
                <button
                  type="button"
                  className="is-reject"
                  onClick={() => void review('reject')}
                  disabled={reviewing}
                >
                  <X size={16} aria-hidden="true" /> Rechazar
                </button>
              </div>

              {selected.reviewed_at && (
                <p className="nm-demo-access-admin__reviewed">
                  <Clock3 size={14} aria-hidden="true" />
                  Revisada por {selected.reviewed_by || 'admin'} el {formatDate(selected.reviewed_at)}
                </p>
              )}
            </>
          ) : (
            <div className="nm-demo-access-admin__state">
              Selecciona una solicitud para revisar el detalle.
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
