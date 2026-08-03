import { useQuery } from '@tanstack/react-query'
import { Activity, AlertTriangle, Cpu, Database, HardDrive, RadioTower, Server, ShieldCheck, type LucideIcon } from 'lucide-react'
import { apiFetch, northmineApi, type HealthResponse } from '../lib/api'
import { settingsService } from '../services/settingsService'
import { useModuleT } from '../i18n/useModuleT'
import { systemPageT } from '../i18n/modules/systemPage'

interface SecurityMetrics {
  blocked_ips: string[]
  failed_logins_last_hour: number
  active_sessions: number
  audit_log_size_mb: number
  most_active_user: string | null
  suspicious_activity: boolean
}

interface AdminSystemStatus {
  health: HealthResponse
  backend: {
    service: string
    version: string
    environment: string
    pid: number
    uptime_seconds: number
    cpu_time_seconds: number
    memory_mb: number | null
    platform: string
    python: string
  }
  frontend: {
    expected_version: string
    expected_origin: string
  }
  logs: {
    directory: string
    recent_errors: string[]
  }
}

function Metric({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value: string | number }) {
  return (
    <div className="command-card" style={{ minHeight: 92 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: 'var(--text-secondary)' }}>
        <Icon size={17} />
        <span style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0 }}>{label}</span>
      </div>
      <strong style={{ display: 'block', marginTop: 12, fontSize: 18 }}>{value}</strong>
    </div>
  )
}

export function SystemPage() {
  const t = useModuleT(systemPageT)
  const healthQuery = useQuery({ queryKey: ['system-health'], queryFn: northmineApi.health, refetchInterval: 30000 })
  const metricsQuery = useQuery({ queryKey: ['security-metrics'], queryFn: () => apiFetch<SecurityMetrics>('/api/admin/metrics'), refetchInterval: 30000 })
  const systemQuery = useQuery({ queryKey: ['admin-system'], queryFn: () => apiFetch<AdminSystemStatus>('/api/admin/system'), refetchInterval: 30000 })

  const health = systemQuery.data?.health ?? healthQuery.data
  const metrics = metricsQuery.data
  const system = systemQuery.data
  const recentErrors = system?.logs.recent_errors ?? []

  return (
    <section className="page-content">
      <div className="module-header">
        <div>
          <span className="eyebrow">{t.eyebrow}</span>
          <h2>{t.titulo}</h2>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: 12 }}>
        <Metric icon={RadioTower} label={t.metric_backend} value={health?.service ?? 'northmine-api'} />
        <Metric icon={ShieldCheck} label={t.metric_version} value={health?.version ?? settingsService.version} />
        <Metric icon={Database} label={t.metric_base_datos} value={health?.database ?? t.verificando} />
        <Metric icon={Server} label={t.metric_usuarios} value={health?.identity_store ?? t.verificando} />
        <Metric icon={Activity} label={t.metric_entorno} value={health?.environment ?? settingsService.environment} />
        <Metric icon={Cpu} label={t.metric_cpu_proceso} value={system ? `${system.backend.cpu_time_seconds}s` : t.verificando} />
        <Metric icon={HardDrive} label={t.metric_memoria} value={system?.backend.memory_mb ? `${system.backend.memory_mb} MB` : t.no_disponible} />
      </div>

      <div style={{ marginTop: 18, display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
        <div className="command-card">
          <h3 style={{ marginBottom: 12 }}>{t.conectividad_titulo}</h3>
          <p>{t.conectividad_api}: {t.conectividad_api_protegida}</p>
          <p>{t.conectividad_estado}: {health?.status ?? t.verificando}</p>
          <p>{t.conectividad_produccion_lista}: {health?.production_ready ? t.conectividad_si : t.conectividad_no}</p>
          <p>{t.conectividad_frontend_esperado}: {system?.frontend.expected_origin ?? t.conectividad_local}</p>
        </div>

        <div className="command-card">
          <h3 style={{ marginBottom: 12 }}>{t.seguridad_titulo}</h3>
          <p>{t.seguridad_sesiones_activas}: {metrics?.active_sessions ?? 0}</p>
          <p>{t.seguridad_intentos_fallidos}: {metrics?.failed_logins_last_hour ?? 0}</p>
          <p>{t.seguridad_ips_bloqueadas}: {metrics?.blocked_ips.length ?? 0}</p>
          <p>{t.seguridad_audit_log}: {metrics?.audit_log_size_mb ?? 0} MB</p>
        </div>
      </div>

      <div className="command-card" style={{ marginTop: 18 }}>
        <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
          <AlertTriangle size={17} />
          {t.ultimos_errores_titulo}
        </h3>
        {recentErrors.length ? (
          <div style={{ display: 'grid', gap: 8 }}>
            {recentErrors.map((item, index) => (
              <code key={`${index}-${item}`} style={{ whiteSpace: 'pre-wrap', color: 'var(--warn-yellow)' }}>{item}</code>
            ))}
          </div>
        ) : (
          <p>{t.sin_errores}</p>
        )}
      </div>
    </section>
  )
}
