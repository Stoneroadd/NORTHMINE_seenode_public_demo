import type { ModuleDict } from '../useModuleT'

export interface CommonT {
  emptyStateTitle: string
  emptyStateDetail: string
  errorStateTitle: string
  errorStateDetail: string
  loadingStateLabel: string
  retryAction: string
}

export const commonT: ModuleDict<CommonT> = {
  es: {
    emptyStateTitle: 'Sin datos disponibles',
    emptyStateDetail: 'No hay registros para el filtro seleccionado.',
    errorStateTitle: 'No fue posible cargar el modulo',
    errorStateDetail: 'No pudimos actualizar esta seccion. Reintenta en unos segundos.',
    loadingStateLabel: 'Cargando datos operacionales...',
    retryAction: 'Reintentar',
  },
  en: {
    emptyStateTitle: 'No data available',
    emptyStateDetail: 'No records for the selected filter.',
    errorStateTitle: 'Could not load the module',
    errorStateDetail: 'We could not refresh this section. Try again in a few seconds.',
    loadingStateLabel: 'Loading operational data...',
    retryAction: 'Retry',
  },
  de: {
    emptyStateTitle: 'Keine Daten verfügbar',
    emptyStateDetail: 'Keine Einträge für den ausgewählten Filter.',
    errorStateTitle: 'Das Modul konnte nicht geladen werden',
    errorStateDetail: 'Dieser Bereich konnte nicht aktualisiert werden. Versuchen Sie es in Kürze erneut.',
    loadingStateLabel: 'Betriebsdaten werden geladen...',
    retryAction: 'Erneut versuchen',
  },
}
