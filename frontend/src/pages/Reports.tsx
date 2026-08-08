import { useQuery } from '@tanstack/react-query'
import { useMemo, useRef, useState } from 'react'
import { ClipboardList, RefreshCcw } from 'lucide-react'
import { getShiftReport } from '../services/reportsService'
import { ModuleHeader } from '../components/common/ModuleHeader'
import { LoadingState } from '../components/common/LoadingState'
import { ErrorState } from '../components/common/ErrorState'
import { ExecutiveShiftReport } from '../components/reports/ExecutiveShiftReport'
import { EquipmentDetailDrawer } from '../components/equipment/detail/EquipmentDetailDrawer'
import { AnalysisFilterBar } from '../components/filters/AnalysisFilterBar'
import { useAnalysisFilters } from '../hooks/useAnalysisFilters'
import { useModuleT } from '../i18n/useModuleT'
import { reportsT } from '../i18n/modules/reports'
import { useAgentWidget } from '../lib/agentRegistry/useAgentWidget'

export function Reports() {
  const t = useModuleT(reportsT)
  const filters = [
    { label: t.filtro_actual, value: 'ACTUAL' },
    { label: t.filtro_dia, value: 'DIA' },
    { label: t.filtro_noche, value: 'NOCHE' },
    { label: t.filtro_todos, value: 'TODOS' },
  ]
  const [turno, setTurno] = useState('ACTUAL')
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null)
  const analysisFilters = useAnalysisFilters({}, 'northmine:filters:reports:v2')
  const { appliedFilters } = analysisFilters
  const reportFilters = useMemo(() => {
    const filtersWithoutShift = { ...appliedFilters }
    delete filtersWithoutShift.shift
    return filtersWithoutShift
  }, [appliedFilters])
  const query = useQuery({
    queryKey: ['shift-report', turno, reportFilters],
    queryFn: () => getShiftReport(turno, reportFilters),
    refetchInterval: 60000,
  })

  const reportDataRef = useRef(query.data)
  reportDataRef.current = query.data
  const reportStatusWidget = useAgentWidget({
    id: 'reportes-turno-actual',
    moduleId: 'reportes',
    type: 'panel',
    label: 'Informe de turno',
    description: 'Estado, fuente y generacion del informe de turno actual.',
    supportedActions: ['focus_widget', 'explain_widget'],
    getSnapshot: () => {
      const current = reportDataRef.current
      return {
        widgetId: 'reportes-turno-actual',
        type: 'panel',
        label: 'Informe de turno',
        updatedAt: new Date().toISOString(),
        turno,
        fuente: current?.data_source ?? current?.source ?? null,
        generadoEn: current?.generado_en ?? null,
        warnings: current?.warnings ?? [],
      }
    },
  })

  if (query.isLoading) return <LoadingState label={t.loading_reporte} />
  if (query.isError || !query.data) {
    const detail = query.error instanceof Error
      ? t.error_con_mensaje(query.error.message)
      : t.error_generico
    return <ErrorState detail={`${detail}${t.error_sufijo}`} onRetry={() => query.refetch()} />
  }

  const dataSource = query.data.data_source ?? (query.data.source === 'demo' ? 'DEMO' : 'REAL')
  const connectionLabel = query.data.stale ? t.fuente_cache_real : dataSource === 'DEMO' ? t.fuente_modo_demo : t.fuente_datos_reales
  const lastRecord = query.data.last_real_record
    ? new Date(query.data.last_real_record).toLocaleString('es-CL')
    : t.sin_registro

  return (
    <>
      <div className="module-page">
      <ModuleHeader
        icon={ClipboardList}
        eyebrow={t.eyebrow}
        title={t.titulo}
        description={t.descripcion}
        meta={`${connectionLabel} - ${query.data.source_system ?? query.data.source}`}
        actions={
          <div className="filter-bar">
            {filters.map((filter) => (
              <button key={filter.value} className={turno === filter.value ? 'active' : ''} onClick={() => setTurno(filter.value)}>
                {filter.label}
              </button>
            ))}
            <button type="button" onClick={() => query.refetch()} aria-label={t.btn_actualizar_aria}>
              <RefreshCcw size={15} className={query.isFetching ? 'is-spinning' : undefined} />
              {t.btn_actualizar}
            </button>
          </div>
        }
      />
        <AnalysisFilterBar
          title={t.filtros_titulo}
          fields={['startDate', 'endDate', 'phase', 'origin', 'destination', 'material', 'caexId', 'loadingUnitId', 'status', 'severity']}
          loading={query.isFetching}
          {...analysisFilters}
        />
        <section className="report-kpis" aria-label={t.estado_conexion_aria} ref={reportStatusWidget.ref}>
          <span><small>{t.label_fuente}</small><strong>{dataSource}</strong></span>
          <span><small>{t.label_sistema}</small><strong>{query.data.source_system ?? query.data.source}</strong></span>
          <span><small>{t.label_ultimo_registro}</small><strong>{lastRecord}</strong></span>
          <span><small>{t.label_generado}</small><strong>{new Date(query.data.generado_en).toLocaleString('es-CL')}</strong></span>
        </section>
        {!!query.data.warnings?.length && (
          <section className="cockpit-source-stale">
            {query.data.warnings.slice(0, 2).join(' ')}
          </section>
        )}
        <ExecutiveShiftReport report={query.data} onSelectEquipment={setSelectedEquipmentId} t={t} />
      </div>
      <EquipmentDetailDrawer
        equipmentId={selectedEquipmentId}
        open={Boolean(selectedEquipmentId)}
        onClose={() => setSelectedEquipmentId(null)}
      />
    </>
  )
}
