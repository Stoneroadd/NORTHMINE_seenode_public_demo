import type { ModuleDict } from '../useModuleT'
import type { SectionId } from '../../components/layout/Sidebar'

export interface DashboardT {
  section_label: Record<SectionId, string>
  error_title_401: string
  error_title_generic: string
  error_message_401: string
  error_message_network: string
  error_message_server: string
  reload_button: string
  section_placeholder_title: string
  section_placeholder_desc: string
  filters_title: string
  data_confidence_aria: string
  confidence_backend: string
  confidence_shift_data: string
  confidence_monthly_plan: string
  confidence_f02_apart: string
  confidence_alerts: string
  confidence_updated: string
  status_online: string
  status_checking: string
  status_not_configured: string
  status_configured: string
  status_no_f02: string
  status_partial: string
  status_syncing: string
  status_ok: string
  hero_kicker: string
  hero_title: string
  hero_configure_plan: string
  hero_status_label: string
  hero_no_plan: string
  hero_vs_accumulated: (pct: string) => string
  hero_plan_required: string
  hero_required_remaining: string
  hero_required_remaining_small: string
  hero_current_average: string
  hero_current_average_small: string
  hero_accumulated_diff: string
  hero_accumulated_diff_small_positive: string
  hero_accumulated_diff_small_negative: string
  market_strip_aria: string
  plan_kicker: string
  plan_title: string
  causes_kicker: string
  causes_title: string
  causes_tag: (n: number) => string
  causes_vs_reference: (pct: string) => string
  causes_impact_detail: (impact: string, detail: string) => string
  causes_empty: string
  standby_kicker: string
  standby_title: string
  standby_tag: (n: number) => string
  standby_operator: (op: string) => string
  standby_no_operator: string
  standby_minutes_inactive: (min: number) => string
  standby_empty: string
  standby_note: string
  insight_kicker: string
  insight_title: string
  insight_empty: string
  scope_kicker: string
  scope_title: string
  scope_note_cockpit: string
  scope_note_dashboard: string
  scope_note_f02: string
  kpi_shift_title: string
  kpi_shift_subtitle: (turno: string, ciclos: string, avance: string | null) => string
  kpi_shift_trend: (compliance: string, inProgress: boolean) => string
  kpi_status_on_track: string
  kpi_status_close_risk: string
  kpi_status_in_control: string
  kpi_status_attention: string
  kpi_comparison_projected: (v: string) => string
  kpi_comparison_expected_now: (v: string) => string
  kpi_comparison_target: (v: string) => string
  kpi_comparison_shift_target: string
  kpi_day_title: string
  kpi_day_subtitle: (date: string) => string
  kpi_day_subtitle_no_data: string
  kpi_day_no_plan: string
  kpi_day_status_over_plan: string
  kpi_day_status_preventive: string
  kpi_day_status_critical: string
  kpi_day_status_no_daily_plan: string
  kpi_day_comparison_daily_target: (v: string) => string
  kpi_day_comparison_real_only: string
  kpi_accumulated_title: string
  kpi_accumulated_subtitle: (days: number) => string
  kpi_accumulated_no_plan: string
  kpi_accumulated_status_over: string
  kpi_accumulated_status_under: string
  kpi_accumulated_status_not_configured: string
  kpi_accumulated_comparison: (v: string) => string
  monthly_kpi_planned_title: string
  monthly_kpi_planned_subtitle: (days: number) => string
  monthly_kpi_planned_trend: (v: string) => string
  monthly_kpi_planned_status: string
  monthly_kpi_planned_comparison: (v: string) => string
  monthly_kpi_diff_title: string
  monthly_kpi_diff_subtitle: string
  monthly_kpi_diff_trend_over: string
  monthly_kpi_diff_trend_recover: string
  monthly_kpi_diff_status_green: string
  monthly_kpi_diff_status_preventive: string
  monthly_kpi_diff_status_critical: string
  monthly_kpi_diff_comparison: (pct: string) => string
  monthly_kpi_required_title: string
  monthly_kpi_required_subtitle: (days: number) => string
  monthly_kpi_required_trend_ok: string
  monthly_kpi_required_trend_raise: string
  monthly_kpi_required_status_ok: string
  monthly_kpi_required_status_risk: string
  monthly_kpi_required_comparison: (v: string) => string
  monthly_kpi_no_plan_title: string
  monthly_kpi_no_plan_value: string
  monthly_kpi_no_plan_subtitle: string
  monthly_kpi_no_plan_trend: string
  monthly_kpi_no_plan_status: string
  monthly_kpi_no_plan_comparison: string
  driver_f01_label: string
  driver_f01_meta: (v: string) => string
  driver_f02_label: string
  driver_f02_meta: (v: string) => string
  driver_projection_label: string
  driver_projection_meta: (v: string) => string
  action_maintain_rate: (v: string) => string
  action_raise_rate: (v: string) => string
  action_configure_plan: string
  action_correct_equipment: (equipment: string, impact: string) => string
  action_maintain_loading: string
  action_maintain_shift: string
  action_recover_shift: string
  green_status_no_plan: string
  green_status_on_green: string
  green_status_recoverable: string
  green_status_at_risk: string
  green_summary: (status: string, requiredDaily: string, monthlyTarget: string, currentAvg: string) => string
}

export const dashboardT: ModuleDict<DashboardT> = {
  es: {
    section_label: {
      cockpit: 'Decision Cockpit',
      operationalMap3d: 'Mapa Operacional 3D',
      dashboard: 'Dashboard ejecutivo',
      turno: 'Turno actual',
      produccion: 'Produccion',
      rendimiento: 'Rendimiento',
      flota: 'Flota',
      carguio: 'Carguio',
      averias: 'Averias',
      analisis: 'Analisis Experto',
      aerea: 'Vista Aerea',
      alertas: 'Alertas',
      reportes: 'Reportes',
      admin: 'Admin',
    },
    error_title_401: 'Sesion no valida',
    error_title_generic: 'No fue posible cargar el dashboard',
    error_message_401: 'Tu sesion expiro. Recarga la pagina para iniciar sesion nuevamente.',
    error_message_network: 'No se puede conectar al backend en http://localhost:8001. Verifica que el servidor real este corriendo.',
    error_message_server: 'Error del servidor. Intenta recargar la pagina.',
    reload_button: 'Recargar',
    section_placeholder_title: 'Modulo preparado para Sprint 1.2',
    section_placeholder_desc: 'La navegacion ya esta definida. Los modulos especializados consumen FastAPI con datos reales WENCO/SQL.',
    filters_title: 'Filtros dashboard',
    data_confidence_aria: 'Estado de datos del dashboard',
    confidence_backend: 'Backend',
    confidence_shift_data: 'Datos turno',
    confidence_monthly_plan: 'Plan mensual',
    confidence_f02_apart: 'F02 aparte',
    confidence_alerts: 'Alertas',
    confidence_updated: 'Actualizado',
    status_online: 'ONLINE',
    status_checking: 'VERIFICANDO',
    status_not_configured: 'NO CONFIGURADO',
    status_configured: 'CONFIGURADO',
    status_no_f02: 'Sin F02',
    status_partial: 'PARCIAL',
    status_syncing: 'SINCRONIZANDO',
    status_ok: 'OK',
    hero_kicker: 'Plan & Performance Center',
    hero_title: 'Que necesito para cerrar en numeros verdes',
    hero_configure_plan: 'Configura el plan mensual F01 para evaluar cierre en verde.',
    hero_status_label: 'Estado cierre F01',
    hero_no_plan: 'Sin plan',
    hero_vs_accumulated: (pct) => `${pct} vs acumulado`,
    hero_plan_required: 'Plan requerido',
    hero_required_remaining: 'Requerido restante',
    hero_required_remaining_small: 'Ritmo actual vs requerido',
    hero_current_average: 'Promedio actual',
    hero_current_average_small: 'Proyeccion contra meta mes',
    hero_accumulated_diff: 'Diferencia acumulada',
    hero_accumulated_diff_small_positive: 'Sobre ritmo acumulado',
    hero_accumulated_diff_small_negative: 'Brecha acumulada',
    market_strip_aria: 'Pulso de cumplimiento mensual',
    plan_kicker: 'Cumplimiento acumulado',
    plan_title: 'F01 / F02 / Proyeccion',
    causes_kicker: 'Causas que pueden romper el plan',
    causes_title: 'Prioridad ejecutiva',
    causes_tag: (n) => `${n} focos`,
    causes_vs_reference: (pct) => `${pct} vs referencia`,
    causes_impact_detail: (impact, detail) => `Impacto estimado ${impact} - ${detail}`,
    causes_empty: 'Sin desviaciones relevantes contra referencia.',
    standby_kicker: 'Standby justificado',
    standby_title: 'Flota fuera de rendimiento',
    standby_tag: (n) => `${n} equipos`,
    standby_operator: (op) => `Operador ${op}`,
    standby_no_operator: 'Sin operador registrado',
    standby_minutes_inactive: (min) => ` · ${min} min sin ciclo`,
    standby_empty: 'Sin equipos en standby WENCO. Los equipos sin aporte se evaluan como bajo rendimiento o mantencion.',
    standby_note: 'Estos equipos se excluyen del ranking de bajo rendimiento porque WENCO los registra como standby/subestado de gestion de flota.',
    insight_kicker: 'Lectura ejecutiva',
    insight_title: 'Que explica la desviacion',
    insight_empty: 'Operacion sin desviaciones ejecutivas relevantes.',
    scope_kicker: 'Notas de alcance',
    scope_title: 'No duplica el Cockpit',
    scope_note_cockpit: 'Cockpit: operar el turno y equipos en vivo.',
    scope_note_dashboard: 'Dashboard: confirmar cumplimiento de plan y cierre mensual.',
    scope_note_f02: 'F02 se informa aparte y se suma solo como total operacional.',
    kpi_shift_title: 'Produccion turno',
    kpi_shift_subtitle: (turno, ciclos, avance) => `${turno} / ${ciclos} ciclos${avance ? ` / ${avance} avance` : ''}`,
    kpi_shift_trend: (compliance, inProgress) => inProgress ? `${compliance} meta final` : compliance,
    kpi_status_on_track: 'En ritmo',
    kpi_status_close_risk: 'Riesgo cierre',
    kpi_status_in_control: 'En control',
    kpi_status_attention: 'Atencion',
    kpi_comparison_projected: (v) => `Proy. ${v}`,
    kpi_comparison_expected_now: (v) => `Esperado ahora ${v}`,
    kpi_comparison_target: (v) => `Meta ${v}`,
    kpi_comparison_shift_target: 'Meta turno',
    kpi_day_title: 'Produccion dia',
    kpi_day_subtitle: (date) => `F01 ${date}`,
    kpi_day_subtitle_no_data: 'Sin dato diario',
    kpi_day_no_plan: 'Sin plan',
    kpi_day_status_over_plan: 'Sobre plan',
    kpi_day_status_preventive: 'Preventivo',
    kpi_day_status_critical: 'Critico',
    kpi_day_status_no_daily_plan: 'Sin plan diario',
    kpi_day_comparison_daily_target: (v) => `Meta diaria ${v}`,
    kpi_day_comparison_real_only: 'Solo real observado',
    kpi_accumulated_title: 'Acumulado F01',
    kpi_accumulated_subtitle: (days) => `${days} dias evaluados`,
    kpi_accumulated_no_plan: 'Sin plan',
    kpi_accumulated_status_over: 'Sobre acumulado',
    kpi_accumulated_status_under: 'Bajo acumulado',
    kpi_accumulated_status_not_configured: 'Plan no configurado',
    kpi_accumulated_comparison: (v) => `Prog. acum. ${v}`,
    monthly_kpi_planned_title: 'Programado acumulado',
    monthly_kpi_planned_subtitle: (days) => `${days} dias x meta diaria F01`,
    monthly_kpi_planned_trend: (v) => `${v}/dia`,
    monthly_kpi_planned_status: 'Plan vigente',
    monthly_kpi_planned_comparison: (v) => `Meta mes ${v}`,
    monthly_kpi_diff_title: 'Diferencia acumulada',
    monthly_kpi_diff_subtitle: 'F01 real vs programado al dia',
    monthly_kpi_diff_trend_over: 'Sobre ritmo',
    monthly_kpi_diff_trend_recover: 'Recuperar',
    monthly_kpi_diff_status_green: 'Verde',
    monthly_kpi_diff_status_preventive: 'Preventivo',
    monthly_kpi_diff_status_critical: 'Critico',
    monthly_kpi_diff_comparison: (pct) => `${pct} acumulado`,
    monthly_kpi_required_title: 'Requerido para verde',
    monthly_kpi_required_subtitle: (days) => `${days} dias restantes`,
    monthly_kpi_required_trend_ok: 'Ritmo suficiente',
    monthly_kpi_required_trend_raise: 'Subir ritmo',
    monthly_kpi_required_status_ok: 'En verde',
    monthly_kpi_required_status_risk: 'Riesgo cierre',
    monthly_kpi_required_comparison: (v) => `Prom. actual ${v}/dia`,
    monthly_kpi_no_plan_title: 'Plan mensual',
    monthly_kpi_no_plan_value: 'No configurado',
    monthly_kpi_no_plan_subtitle: 'La evaluacion mensual queda desactivada',
    monthly_kpi_no_plan_trend: 'Sin meta',
    monthly_kpi_no_plan_status: 'No evaluable',
    monthly_kpi_no_plan_comparison: 'Cargar plan mensual oficial',
    driver_f01_label: 'F01 real acumulado',
    driver_f01_meta: (v) => `vs ${v} programado`,
    driver_f02_label: 'F02 aparte',
    driver_f02_meta: (v) => `Total operacional ${v}`,
    driver_projection_label: 'Proyeccion F01',
    driver_projection_meta: (v) => `${v} vs meta mes`,
    action_maintain_rate: (v) => `Mantener al menos ${v}/dia F01 para cerrar en verde.`,
    action_raise_rate: (v) => `Subir ritmo a ${v}/dia F01 para cerrar en verde.`,
    action_configure_plan: 'Configurar plan mensual oficial para habilitar cumplimiento y proyeccion mensual.',
    action_correct_equipment: (equipment, impact) => `Corregir ${equipment}; impacto estimado ${impact}.`,
    action_maintain_loading: 'Mantener continuidad de carguio y revisar desviaciones al cierre.',
    action_maintain_shift: 'Mantener continuidad del turno; la proyeccion supera la meta actual.',
    action_recover_shift: 'Recuperar ritmo del turno antes del siguiente corte horario.',
    green_status_no_plan: 'Sin plan',
    green_status_on_green: 'En verde',
    green_status_recoverable: 'Recuperable',
    green_status_at_risk: 'En riesgo',
    green_summary: (status, requiredDaily, monthlyTarget, currentAvg) => `${status}: necesitas ${requiredDaily} F01/dia para llegar a ${monthlyTarget}. Ritmo actual ${currentAvg}/dia.`,
  },
  en: {
    section_label: {
      cockpit: 'Decision Cockpit',
      operationalMap3d: '3D Operational Map',
      dashboard: 'Executive dashboard',
      turno: 'Current shift',
      produccion: 'Production',
      rendimiento: 'Performance',
      flota: 'Fleet',
      carguio: 'Loading',
      averias: 'Breakdowns',
      analisis: 'Expert Analysis',
      aerea: 'Aerial View',
      alertas: 'Alerts',
      reportes: 'Reports',
      admin: 'Admin',
    },
    error_title_401: 'Invalid session',
    error_title_generic: 'Could not load the dashboard',
    error_message_401: 'Your session expired. Reload the page to sign in again.',
    error_message_network: 'Cannot connect to the backend at http://localhost:8001. Verify the real server is running.',
    error_message_server: 'Server error. Try reloading the page.',
    reload_button: 'Reload',
    section_placeholder_title: 'Module scheduled for Sprint 1.2',
    section_placeholder_desc: 'Navigation is already defined. Specialized modules consume FastAPI with real WENCO/SQL data.',
    filters_title: 'Dashboard filters',
    data_confidence_aria: 'Dashboard data status',
    confidence_backend: 'Backend',
    confidence_shift_data: 'Shift data',
    confidence_monthly_plan: 'Monthly plan',
    confidence_f02_apart: 'F02 apart',
    confidence_alerts: 'Alerts',
    confidence_updated: 'Updated',
    status_online: 'ONLINE',
    status_checking: 'CHECKING',
    status_not_configured: 'NOT CONFIGURED',
    status_configured: 'CONFIGURED',
    status_no_f02: 'No F02',
    status_partial: 'PARTIAL',
    status_syncing: 'SYNCING',
    status_ok: 'OK',
    hero_kicker: 'Plan & Performance Center',
    hero_title: 'What I need to close in the green',
    hero_configure_plan: 'Configure the monthly F01 plan to evaluate a green close.',
    hero_status_label: 'F01 close status',
    hero_no_plan: 'No plan',
    hero_vs_accumulated: (pct) => `${pct} vs accumulated`,
    hero_plan_required: 'Plan required',
    hero_required_remaining: 'Required remaining',
    hero_required_remaining_small: 'Current pace vs required',
    hero_current_average: 'Current average',
    hero_current_average_small: 'Projection against monthly target',
    hero_accumulated_diff: 'Accumulated difference',
    hero_accumulated_diff_small_positive: 'Above accumulated pace',
    hero_accumulated_diff_small_negative: 'Accumulated gap',
    market_strip_aria: 'Monthly compliance pulse',
    plan_kicker: 'Accumulated compliance',
    plan_title: 'F01 / F02 / Projection',
    causes_kicker: 'Causes that can break the plan',
    causes_title: 'Executive priority',
    causes_tag: (n) => `${n} hotspots`,
    causes_vs_reference: (pct) => `${pct} vs reference`,
    causes_impact_detail: (impact, detail) => `Estimated impact ${impact} - ${detail}`,
    causes_empty: 'No relevant deviations against reference.',
    standby_kicker: 'Justified standby',
    standby_title: 'Fleet outside performance',
    standby_tag: (n) => `${n} equipment`,
    standby_operator: (op) => `Operator ${op}`,
    standby_no_operator: 'No operator recorded',
    standby_minutes_inactive: (min) => ` · ${min} min without cycle`,
    standby_empty: 'No equipment on WENCO standby. Equipment with no contribution is evaluated as low performance or maintenance.',
    standby_note: 'This equipment is excluded from the low-performance ranking because WENCO registers it as standby/fleet management substatus.',
    insight_kicker: 'Executive reading',
    insight_title: 'What explains the deviation',
    insight_empty: 'Operation with no relevant executive deviations.',
    scope_kicker: 'Scope notes',
    scope_title: "Doesn't duplicate the Cockpit",
    scope_note_cockpit: 'Cockpit: operate the shift and equipment live.',
    scope_note_dashboard: 'Dashboard: confirm plan compliance and monthly close.',
    scope_note_f02: 'F02 is reported separately and only added as operational total.',
    kpi_shift_title: 'Shift production',
    kpi_shift_subtitle: (turno, ciclos, avance) => `${turno} / ${ciclos} cycles${avance ? ` / ${avance} progress` : ''}`,
    kpi_shift_trend: (compliance, inProgress) => inProgress ? `${compliance} final target` : compliance,
    kpi_status_on_track: 'On track',
    kpi_status_close_risk: 'Close risk',
    kpi_status_in_control: 'In control',
    kpi_status_attention: 'Attention',
    kpi_comparison_projected: (v) => `Proj. ${v}`,
    kpi_comparison_expected_now: (v) => `Expected now ${v}`,
    kpi_comparison_target: (v) => `Target ${v}`,
    kpi_comparison_shift_target: 'Shift target',
    kpi_day_title: 'Day production',
    kpi_day_subtitle: (date) => `F01 ${date}`,
    kpi_day_subtitle_no_data: 'No daily data',
    kpi_day_no_plan: 'No plan',
    kpi_day_status_over_plan: 'Over plan',
    kpi_day_status_preventive: 'Preventive',
    kpi_day_status_critical: 'Critical',
    kpi_day_status_no_daily_plan: 'No daily plan',
    kpi_day_comparison_daily_target: (v) => `Daily target ${v}`,
    kpi_day_comparison_real_only: 'Real observed only',
    kpi_accumulated_title: 'Accumulated F01',
    kpi_accumulated_subtitle: (days) => `${days} days evaluated`,
    kpi_accumulated_no_plan: 'No plan',
    kpi_accumulated_status_over: 'Over accumulated',
    kpi_accumulated_status_under: 'Under accumulated',
    kpi_accumulated_status_not_configured: 'Plan not configured',
    kpi_accumulated_comparison: (v) => `Acc. plan ${v}`,
    monthly_kpi_planned_title: 'Accumulated planned',
    monthly_kpi_planned_subtitle: (days) => `${days} days x F01 daily target`,
    monthly_kpi_planned_trend: (v) => `${v}/day`,
    monthly_kpi_planned_status: 'Plan in effect',
    monthly_kpi_planned_comparison: (v) => `Month target ${v}`,
    monthly_kpi_diff_title: 'Accumulated difference',
    monthly_kpi_diff_subtitle: 'F01 real vs planned to date',
    monthly_kpi_diff_trend_over: 'Above pace',
    monthly_kpi_diff_trend_recover: 'Recover',
    monthly_kpi_diff_status_green: 'Green',
    monthly_kpi_diff_status_preventive: 'Preventive',
    monthly_kpi_diff_status_critical: 'Critical',
    monthly_kpi_diff_comparison: (pct) => `${pct} accumulated`,
    monthly_kpi_required_title: 'Required to go green',
    monthly_kpi_required_subtitle: (days) => `${days} days remaining`,
    monthly_kpi_required_trend_ok: 'Sufficient pace',
    monthly_kpi_required_trend_raise: 'Raise pace',
    monthly_kpi_required_status_ok: 'In the green',
    monthly_kpi_required_status_risk: 'Close risk',
    monthly_kpi_required_comparison: (v) => `Current avg. ${v}/day`,
    monthly_kpi_no_plan_title: 'Monthly plan',
    monthly_kpi_no_plan_value: 'Not configured',
    monthly_kpi_no_plan_subtitle: 'Monthly evaluation is disabled',
    monthly_kpi_no_plan_trend: 'No target',
    monthly_kpi_no_plan_status: 'Not assessable',
    monthly_kpi_no_plan_comparison: 'Load the official monthly plan',
    driver_f01_label: 'F01 accumulated real',
    driver_f01_meta: (v) => `vs ${v} planned`,
    driver_f02_label: 'F02 apart',
    driver_f02_meta: (v) => `Operational total ${v}`,
    driver_projection_label: 'F01 projection',
    driver_projection_meta: (v) => `${v} vs month target`,
    action_maintain_rate: (v) => `Maintain at least ${v}/day F01 to close in the green.`,
    action_raise_rate: (v) => `Raise pace to ${v}/day F01 to close in the green.`,
    action_configure_plan: 'Configure the official monthly plan to enable compliance and monthly projection.',
    action_correct_equipment: (equipment, impact) => `Correct ${equipment}; estimated impact ${impact}.`,
    action_maintain_loading: 'Maintain loading continuity and review deviations at close.',
    action_maintain_shift: 'Maintain shift continuity; the projection exceeds the current target.',
    action_recover_shift: 'Recover shift pace before the next hourly cutoff.',
    green_status_no_plan: 'No plan',
    green_status_on_green: 'In the green',
    green_status_recoverable: 'Recoverable',
    green_status_at_risk: 'At risk',
    green_summary: (status, requiredDaily, monthlyTarget, currentAvg) => `${status}: you need ${requiredDaily} F01/day to reach ${monthlyTarget}. Current pace ${currentAvg}/day.`,
  },
}
