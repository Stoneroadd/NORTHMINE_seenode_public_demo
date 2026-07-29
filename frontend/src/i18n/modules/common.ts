import type { ModuleDict } from '../useModuleT'

export interface CommonT {
  emptyStateTitle: string
  emptyStateDetail: string
  errorStateTitle: string
  errorStateDetail: string
  loadingStateLabel: string
}

export const commonT: ModuleDict<CommonT> = {
  es: {
    emptyStateTitle: 'Sin datos disponibles',
    emptyStateDetail: 'No hay registros para el filtro seleccionado.',
    errorStateTitle: 'No fue posible cargar el modulo',
    errorStateDetail: 'Verifica que la API FastAPI este disponible.',
    loadingStateLabel: 'Cargando datos operacionales...',
  },
  en: {
    emptyStateTitle: 'No data available',
    emptyStateDetail: 'No records for the selected filter.',
    errorStateTitle: 'Could not load the module',
    errorStateDetail: 'Check that the FastAPI backend is available.',
    loadingStateLabel: 'Loading operational data...',
  },
}
