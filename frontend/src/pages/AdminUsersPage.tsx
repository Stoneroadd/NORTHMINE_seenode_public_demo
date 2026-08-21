import { FormEvent, useMemo, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { KeyRound, Pencil, Power, RefreshCw, Save, ShieldCheck, UserPlus, Users } from 'lucide-react'
import { northmineApi, type UserCreateRequest, type UserPublic, type UserRole, type UserUpdateRequest } from '../lib/api'
import { useAppStore } from '../store'
import { useModuleT } from '../i18n/useModuleT'
import { adminUsersT, type AdminUsersT } from '../i18n/modules/adminUsers'

const ROLE_OPTIONS: UserRole[] = ['admin', 'supervisor', 'operador', 'viewer']

type PanelMode = 'create' | 'edit' | 'password' | null

interface UserFormState {
  username: string
  full_name: string
  email: string
  password: string
  role: UserRole
  is_active: boolean
  faena: string
  empresa: string
}

interface Notice {
  type: 'success' | 'error'
  text: string
}

const emptyForm: UserFormState = {
  username: '',
  full_name: '',
  email: '',
  password: '',
  role: 'operador',
  is_active: true,
  faena: 'MINA CHILE DEMO',
  empresa: 'NORTHMINE DEMO',
}

function formatDate(value: string | null, t: AdminUsersT): string {
  if (!value) return t.sin_registro
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value.slice(0, 19)
  return date.toLocaleString()
}

function apiMessage(_error: unknown, t: AdminUsersT): string {
  return t.operacion_no_disponible
}

function passwordIsStrong(password: string): boolean {
  if (password.length < 10) return false
  const classes = [
    /[a-z]/.test(password),
    /[A-Z]/.test(password),
    /\d/.test(password),
    /[^a-zA-Z0-9]/.test(password),
  ]
  return classes.filter(Boolean).length >= 3
}

function validateForm(form: UserFormState, mode: PanelMode, t: AdminUsersT): string | null {
  if (mode === 'create' && form.username.trim().length < 3) return t.err_username_requerido
  if ((mode === 'create' || mode === 'edit') && form.full_name.trim().length < 2) return t.err_nombre_requerido
  if (form.email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) return t.err_email_invalido
  if (mode === 'create' && !passwordIsStrong(form.password)) return t.err_password_debil
  if (mode === 'password' && !passwordIsStrong(form.password)) return t.err_password_debil
  if ((mode === 'create' || mode === 'edit') && !form.role) return t.err_rol_requerido
  return null
}

function Pill({ children, tone }: { children: string; tone: 'green' | 'yellow' | 'red' | 'blue' | 'muted' }) {
  const color = {
    green: 'var(--op-green)',
    yellow: 'var(--warn-yellow)',
    red: 'var(--danger-red)',
    blue: 'var(--data-cyan)',
    muted: 'var(--text-tertiary)',
  }[tone]
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', border: `1px solid ${color}`, color, borderRadius: 6, padding: '3px 7px', fontSize: 11, fontWeight: 800 }}>
      {children}
    </span>
  )
}

export function AdminUsersPage() {
  const t = useModuleT(adminUsersT)
  const usuario = useAppStore(s => s.usuario)
  const queryClient = useQueryClient()
  const [panelMode, setPanelMode] = useState<PanelMode>(null)
  const [selected, setSelected] = useState<UserPublic | null>(null)
  const [form, setForm] = useState<UserFormState>(emptyForm)
  const [notice, setNotice] = useState<Notice | null>(null)

  const usersQuery = useQuery({
    queryKey: ['admin-users'],
    queryFn: northmineApi.getUsers,
    enabled: usuario?.rol === 'admin',
    refetchInterval: 30_000,
  })

  const users = usersQuery.data?.items ?? []

  const stats = useMemo(() => ({
    total: users.length,
    active: users.filter(item => item.is_active).length,
    admins: users.filter(item => item.is_active && item.role === 'admin').length,
    demo: users.filter(item => item.is_demo).length,
  }), [users])

  const refreshUsers = async () => {
    await queryClient.invalidateQueries({ queryKey: ['admin-users'] })
  }

  const createMutation = useMutation({
    mutationFn: (payload: UserCreateRequest) => northmineApi.createUser(payload),
    onSuccess: async () => {
      setNotice({ type: 'success', text: t.notice_usuario_creado })
      closePanel()
      await refreshUsers()
    },
    onError: (error) => setNotice({ type: 'error', text: apiMessage(error, t) }),
  })

  const updateMutation = useMutation({
    mutationFn: ({ userId, payload }: { userId: string; payload: UserUpdateRequest }) => northmineApi.updateUser(userId, payload),
    onSuccess: async () => {
      setNotice({ type: 'success', text: t.notice_usuario_actualizado })
      closePanel()
      await refreshUsers()
    },
    onError: (error) => setNotice({ type: 'error', text: apiMessage(error, t) }),
  })

  const roleMutation = useMutation({
    mutationFn: ({ userId, role }: { userId: string; role: UserRole }) => northmineApi.updateUserRole(userId, { role }),
    onSuccess: async () => {
      setNotice({ type: 'success', text: t.notice_rol_actualizado })
      await refreshUsers()
    },
    onError: (error) => setNotice({ type: 'error', text: apiMessage(error, t) }),
  })

  const statusMutation = useMutation({
    mutationFn: ({ userId, isActive }: { userId: string; isActive: boolean }) => northmineApi.updateUserStatus(userId, { is_active: isActive }),
    onSuccess: async () => {
      setNotice({ type: 'success', text: t.notice_estado_actualizado })
      await refreshUsers()
    },
    onError: (error) => setNotice({ type: 'error', text: apiMessage(error, t) }),
  })

  const passwordMutation = useMutation({
    mutationFn: ({ userId, password }: { userId: string; password: string }) => northmineApi.resetUserPassword(userId, { new_password: password }),
    onSuccess: async () => {
      setNotice({ type: 'success', text: t.notice_password_reseteada })
      closePanel()
      await refreshUsers()
    },
    onError: (error) => setNotice({ type: 'error', text: apiMessage(error, t) }),
  })

  const busy = createMutation.isPending || updateMutation.isPending || roleMutation.isPending || statusMutation.isPending || passwordMutation.isPending

  function openCreate() {
    setNotice(null)
    setSelected(null)
    setForm(emptyForm)
    setPanelMode('create')
  }

  function openEdit(user: UserPublic) {
    setNotice(null)
    setSelected(user)
    setForm({
      username: user.username,
      full_name: user.full_name,
      email: user.email ?? '',
      password: '',
      role: user.role,
      is_active: user.is_active,
      faena: user.faena,
      empresa: user.empresa,
    })
    setPanelMode('edit')
  }

  function openPassword(user: UserPublic) {
    setNotice(null)
    setSelected(user)
    setForm({ ...emptyForm, username: user.username, full_name: user.full_name, password: '' })
    setPanelMode('password')
  }

  function closePanel() {
    setPanelMode(null)
    setSelected(null)
    setForm(emptyForm)
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const error = validateForm(form, panelMode, t)
    if (error) {
      setNotice({ type: 'error', text: error })
      return
    }

    if (panelMode === 'create') {
      await createMutation.mutateAsync({
        username: form.username.trim().toLowerCase(),
        full_name: form.full_name.trim(),
        email: form.email.trim() || null,
        password: form.password,
        role: form.role,
        is_active: form.is_active,
        faena: form.faena.trim(),
        empresa: form.empresa.trim(),
      })
    }

    if (panelMode === 'edit' && selected) {
      await updateMutation.mutateAsync({
        userId: selected.id,
        payload: {
          full_name: form.full_name.trim(),
          email: form.email.trim() || null,
          faena: form.faena.trim(),
          empresa: form.empresa.trim(),
        },
      })
    }

    if (panelMode === 'password' && selected) {
      await passwordMutation.mutateAsync({ userId: selected.id, password: form.password })
    }
  }

  async function changeRole(user: UserPublic, role: UserRole) {
    if (role === user.role) return
    const ok = window.confirm(t.confirm_cambiar_rol(user.username, t.role_label(role)))
    if (!ok) return
    await roleMutation.mutateAsync({ userId: user.id, role })
  }

  async function toggleStatus(user: UserPublic) {
    const next = !user.is_active
    const ok = window.confirm(next ? t.confirm_activar(user.username) : t.confirm_desactivar(user.username))
    if (!ok) return
    await statusMutation.mutateAsync({ userId: user.id, isActive: next })
  }

  if (usuario?.rol !== 'admin') {
    return (
      <section className="page-content">
        <div className="section-placeholder">
          <ShieldCheck size={34} />
          <span>{t.acceso_restringido}</span>
          <h2>{t.acceso_restringido_titulo}</h2>
          <p>{t.acceso_restringido_desc}</p>
        </div>
      </section>
    )
  }

  return (
    <section className="page-content">
      <div className="module-header admin-users-header">
        <div>
          <span className="eyebrow">{t.eyebrow}</span>
          <h2>{t.titulo}</h2>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button className="command-button" type="button" onClick={() => usersQuery.refetch()} disabled={usersQuery.isFetching}>
            <RefreshCw size={16} /> {t.btn_actualizar}
          </button>
          <button className="command-button command-button--primary" type="button" onClick={openCreate}>
            <UserPlus size={16} /> {t.btn_crear_usuario}
          </button>
        </div>
      </div>

      {notice && (
        <div className="command-card" style={{ marginBottom: 12, borderColor: notice.type === 'success' ? 'var(--op-green)' : 'var(--danger-red)', color: notice.type === 'success' ? 'var(--op-green)' : 'var(--danger-red)' }}>
          {notice.text}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(170px, 1fr))', gap: 12, marginBottom: 14 }}>
        <div className="command-card"><strong>{stats.total}</strong><p>{t.stat_total}</p></div>
        <div className="command-card"><strong>{stats.active}</strong><p>{t.stat_activos}</p></div>
        <div className="command-card"><strong>{stats.admins}</strong><p>{t.stat_admins_activos}</p></div>
        <div className="command-card"><strong>{stats.demo}</strong><p>{t.stat_demo}</p></div>
      </div>

      {usersQuery.isLoading && <div className="command-card">{t.cargando_usuarios}</div>}
      {usersQuery.error && <div className="command-card" style={{ color: 'var(--danger-red)' }}>{t.error_cargar_usuarios}</div>}
      {!usersQuery.isLoading && !users.length && <div className="command-card">{t.sin_usuarios}</div>}

      {!!users.length && (
        <div className="command-card" style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 980, fontSize: 13 }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-mid)', color: 'var(--text-tertiary)' }}>
                {[t.col_usuario, t.col_nombre, t.col_email, t.col_rol, t.col_estado, t.col_tipo, t.col_ultimo_login, t.col_creado, t.col_acciones].map(header => (
                  <th key={header} style={{ padding: '10px 8px', textAlign: 'left', fontSize: 11, textTransform: 'uppercase', letterSpacing: 0 }}>{header}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id} style={{ borderBottom: '1px solid var(--border-dim)' }}>
                  <td style={{ padding: '10px 8px', fontWeight: 800 }}>{user.username}</td>
                  <td style={{ padding: '10px 8px' }}>{user.full_name}</td>
                  <td style={{ padding: '10px 8px', color: 'var(--text-secondary)' }}>{user.email || t.sin_email}</td>
                  <td style={{ padding: '10px 8px' }}>
                    <select value={user.role} onChange={(event) => changeRole(user, event.target.value as UserRole)} disabled={busy || user.is_demo} style={{ minWidth: 120 }}>
                      {ROLE_OPTIONS.map(role => <option key={role} value={role}>{t.role_label(role)}</option>)}
                    </select>
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    <Pill tone={user.is_active ? 'green' : 'red'}>{user.is_active ? t.pill_activo : t.pill_inactivo}</Pill>
                  </td>
                  <td style={{ padding: '10px 8px' }}>
                    <Pill tone={user.is_demo ? 'yellow' : 'blue'}>{user.is_demo ? t.pill_demo : t.pill_real}</Pill>
                  </td>
                  <td style={{ padding: '10px 8px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{formatDate(user.last_login_at, t)}</td>
                  <td style={{ padding: '10px 8px', color: 'var(--text-secondary)', whiteSpace: 'nowrap' }}>{formatDate(user.created_at, t)}</td>
                  <td style={{ padding: '10px 8px' }}>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <button className="command-button" type="button" onClick={() => openEdit(user)} disabled={busy}>
                        <Pencil size={14} /> {t.btn_editar}
                      </button>
                      <button className="command-button" type="button" onClick={() => openPassword(user)} disabled={busy || user.is_demo}>
                        <KeyRound size={14} /> {t.btn_reset}
                      </button>
                      <button className="command-button" type="button" onClick={() => toggleStatus(user)} disabled={busy || user.is_demo}>
                        <Power size={14} /> {user.is_active ? t.btn_desactivar : t.btn_activar}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {panelMode && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 90, background: 'rgba(0,0,0,0.55)', display: 'flex', justifyContent: 'flex-end' }} onClick={closePanel}>
          <aside className="command-card" style={{ width: 'min(520px, 100vw)', height: '100%', borderRadius: 0, padding: 22, overflowY: 'auto' }} onClick={(event) => event.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, alignItems: 'center', marginBottom: 16 }}>
              <div>
                <span className="eyebrow">{panelMode === 'create' ? t.panel_titulo_nuevo : panelMode === 'edit' ? t.panel_titulo_editar : t.panel_titulo_password}</span>
                <h3 style={{ marginTop: 4 }}>{selected?.username ?? t.panel_usuario_fallback}</h3>
              </div>
              <button className="command-button" type="button" onClick={closePanel}>{t.btn_cerrar}</button>
            </div>

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 12 }}>
              {panelMode === 'create' && (
                <label>
                  {t.field_username}
                  <input value={form.username} onChange={(event) => setForm({ ...form, username: event.target.value })} autoComplete="off" />
                </label>
              )}

              {(panelMode === 'create' || panelMode === 'edit') && (
                <>
                  <label>
                    {t.field_nombre_completo}
                    <input value={form.full_name} onChange={(event) => setForm({ ...form, full_name: event.target.value })} />
                  </label>
                  <label>
                    {t.field_email}
                    <input value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} placeholder={t.placeholder_email} />
                  </label>
                  <label>
                    {t.field_rol}
                    <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value as UserRole })}>
                      {ROLE_OPTIONS.map(role => <option key={role} value={role}>{t.role_label(role)}</option>)}
                    </select>
                  </label>
                  <label>
                    {t.field_faena}
                    <input value={form.faena} onChange={(event) => setForm({ ...form, faena: event.target.value })} />
                  </label>
                  <label>
                    {t.field_empresa}
                    <input value={form.empresa} onChange={(event) => setForm({ ...form, empresa: event.target.value })} />
                  </label>
                </>
              )}

              {(panelMode === 'create' || panelMode === 'password') && (
                <label>
                  {t.field_nueva_password}
                  <input value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} type="password" autoComplete="new-password" />
                </label>
              )}

              {panelMode === 'create' && (
                <label style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <input checked={form.is_active} onChange={(event) => setForm({ ...form, is_active: event.target.checked })} type="checkbox" />
                  {t.field_usuario_activo}
                </label>
              )}

              <button className="command-button command-button--primary" type="submit" disabled={busy}>
                <Save size={16} /> {busy ? t.btn_guardando : t.btn_guardar}
              </button>
            </form>
          </aside>
        </div>
      )}
    </section>
  )
}
