import { useQuery } from '@tanstack/react-query'
import {
  Activity,
  AlertTriangle,
  Inbox,
  LockKeyhole,
  Server,
  ShieldAlert,
  Users,
  type LucideIcon,
} from 'lucide-react'
import { apiFetch, northmineApi } from '../lib/api'
import { listDemoAccessRequests } from '../services/demoAccessService'

interface SecurityMetrics {
  blocked_ips: string[]
  failed_logins_last_hour: number
  active_sessions: number
  audit_log_size_mb: number
  most_active_user: string | null
  suspicious_activity: boolean
}

function StatCard({ icon: Icon, label, value, tone = 'var(--text-primary)' }: {
  icon: LucideIcon
  label: string
  value: string | number
  tone?: string
}) {
  return (
    <div className="command-card" style={{ minHeight: 96 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-secondary)' }}>
        <Icon size={17} />
        <span style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0 }}>{label}</span>
      </div>
      <strong style={{ display: 'block', marginTop: 12, fontSize: 22, color: tone }}>{value}</strong>
    </div>
  )
}

const adminLinks: Array<{ href: string; icon: LucideIcon; title: string; caption: string; tone: string }> = [
  { href: '/admin/users', icon: Users, title: 'Usuarios', caption: 'Roles, acceso y estados de cuenta', tone: 'var(--data-cyan)' },
  { href: '/admin/demo-access', icon: Inbox, title: 'Solicitudes', caption: 'Pedidos de acceso al demo', tone: 'var(--amber)' },
  { href: '/admin/auditoria', icon: ShieldAlert, title: 'Auditoría', caption: 'Log de seguridad del sistema', tone: 'var(--op-green)' },
  { href: '/admin/sistema', icon: Server, title: 'Sistema', caption: 'Salud, conectividad y errores', tone: 'var(--mineral)' },
]

export function AdminHubPage() {
  const usersQuery = useQuery({ queryKey: ['admin-hub-users'], queryFn: northmineApi.getUsers })
  const pendingQuery = useQuery({ queryKey: ['admin-hub-pending'], queryFn: () => listDemoAccessRequests('pending') })
  const metricsQuery = useQuery({ queryKey: ['admin-hub-metrics'], queryFn: () => apiFetch<SecurityMetrics>('/api/admin/metrics') })

  const totalUsers = usersQuery.data?.count ?? 0
  const activeUsers = usersQuery.data?.items.filter(u => u.is_active).length ?? 0
  const pendingCount = pendingQuery.data?.items.length ?? 0
  const metrics = metricsQuery.data

  return (
    <section className="page-content">
      <div className="module-header">
        <div>
          <span className="eyebrow">Administración</span>
          <h2>Centro de Administración</h2>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, color: 'var(--dim)', fontSize: 12 }}>
          <LockKeyhole size={14} />
          <span>Acceso restringido a rol admin</span>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
        <StatCard icon={Inbox} label="Solicitudes pendientes" value={pendingQuery.isLoading ? '…' : pendingCount} tone="var(--amber)" />
        <StatCard icon={Users} label="Usuarios activos" value={usersQuery.isLoading ? '…' : `${activeUsers} / ${totalUsers}`} tone="var(--data-cyan)" />
        <StatCard icon={Activity} label="Sesiones activas" value={metrics?.active_sessions ?? '…'} tone="var(--op-green)" />
        <StatCard icon={AlertTriangle} label="Intentos fallidos (1h)" value={metrics?.failed_logins_last_hour ?? '…'} tone={metrics && metrics.failed_logins_last_hour > 0 ? 'var(--red)' : 'var(--op-green)'} />
      </div>

      <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 12 }}>
        {adminLinks.map(({ href, icon: Icon, title, caption, tone }) => (
          <a key={href} href={href} className="command-card" style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: 14 }}>
            <span style={{
              width: 42, height: 42, borderRadius: 10, display: 'grid', placeItems: 'center', flexShrink: 0,
              border: `1px solid ${tone}`,
              color: tone,
              background: 'rgba(255,255,255,0.04)',
            }}>
              <Icon size={20} />
            </span>
            <span>
              <strong style={{ display: 'block', color: 'var(--text-primary)', fontSize: 15 }}>{title}</strong>
              <span style={{ color: 'var(--text-secondary)', fontSize: 12 }}>{caption}</span>
            </span>
          </a>
        ))}
      </div>
    </section>
  )
}
