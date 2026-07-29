import { useQuery } from '@tanstack/react-query'
import { useState } from 'react'
import { Factory, Gauge, HardHat } from 'lucide-react'
import { getLoadingUnitsSummary } from '../services/loadingUnitsService'
import { ModuleHeader } from '../components/common/ModuleHeader'
import { LoadingState } from '../components/common/LoadingState'
import { ErrorState } from '../components/common/ErrorState'
import { ExecutiveKpiCard } from '../components/kpi/ExecutiveKpiCard'
import { PremiumLoadingRankingChart } from '../components/charts/premium'
import { EquipmentCommandGrid } from '../components/equipment/EquipmentCommandGrid'
import { EquipmentDetailDrawer } from '../components/equipment/detail/EquipmentDetailDrawer'
import { AnalysisFilterBar } from '../components/filters/AnalysisFilterBar'
import { useAnalysisFilters } from '../hooks/useAnalysisFilters'

function tons(value: number) {
  return `${Math.round(value).toLocaleString('es-CL')} t`
}

export function LoadingUnits() {
  const [selectedEquipmentId, setSelectedEquipmentId] = useState<string | null>(null)
  const analysisFilters = useAnalysisFilters({}, 'northmine:filters:loading-units')
  const { appliedFilters } = analysisFilters
  const query = useQuery({ queryKey: ['loading-units', appliedFilters], queryFn: () => getLoadingUnitsSummary('ACTUAL', appliedFilters) })

  if (query.isLoading) return <LoadingState label="Cargando rendimiento de carguio..." />
  if (query.isError || !query.data) return <ErrorState detail="No se pudo cargar /api/loading-units/summary." />

  const data = query.data
  const best = data.items[0]

  return (
    <>
      <div className="module-page">
      <ModuleHeader
        icon={Factory}
        eyebrow="Carguio"
        title="Rendimiento por pala y cargador"
        description="Comparativo de toneladas, ciclos, camiones atendidos y tph por unidad de carguio."
        meta={`${data.count} unidades operacionales`}
      />

      <AnalysisFilterBar
        title="Filtros carguio"
        fields={['startDate', 'endDate', 'shift', 'loadingUnitId', 'phase', 'origin', 'status', 'material', 'caexId']}
        loading={query.isFetching}
        {...analysisFilters}
      />

      <section className="kpi-grid compact">
        <ExecutiveKpiCard title="Tonelaje carguio" value={tons(data.total_toneladas)} subtitle="Turno actual" trend={`${data.count} unidades`} tone="green" icon={Factory} />
        <ExecutiveKpiCard title="Rendimiento prom." value={`${data.rendimiento_promedio_tph.toLocaleString('es-CL')} tph`} subtitle="Promedio operacional" trend="WENCO" tone="cyan" icon={Gauge} />
        <ExecutiveKpiCard title="Top unidad" value={best?.carguio_id ?? '-'} subtitle={best ? tons(best.toneladas) : 'Sin datos'} trend={best ? `${best.camiones_atendidos} CAEX` : '-'} tone="green" icon={HardHat} />
      </section>

      <section className="two-column">
        <div className="panel">
          <div className="panel-header"><div><span className="panel-kicker">Ranking</span><h2>Toneladas y tph</h2></div></div>
          <PremiumLoadingRankingChart data={data.items} />
        </div>
        <div className="panel">
          <div className="panel-header"><div><span className="panel-kicker">Unidades</span><h2>Palas y cargadores interactivos</h2></div></div>
          <EquipmentCommandGrid
            items={data.items}
            variant="loading"
            limit={8}
            onSelect={(equipmentId) => setSelectedEquipmentId(equipmentId)}
            selectedEquipmentId={selectedEquipmentId}
          />
        </div>
      </section>
      </div>
      <EquipmentDetailDrawer
        equipmentId={selectedEquipmentId}
        open={Boolean(selectedEquipmentId)}
        onClose={() => setSelectedEquipmentId(null)}
      />
    </>
  )
}
