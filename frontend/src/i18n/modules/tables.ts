import type { ModuleDict } from '../useModuleT'

export interface TablesT {
  // OperationalSummaryTable
  notAvailable: string
  mineOperation: string
  executiveSummaryByFront: string
  top5Units: string
  colLoadingUnit: string
  colTonnage: string
  colCycles: string
  colFeaturedCaex: string
  colDominantDestination: string
}

export const tablesT: ModuleDict<TablesT> = {
  es: {
    notAvailable: 'N/D',
    mineOperation: 'Operacion mina',
    executiveSummaryByFront: 'Resumen ejecutivo por frente',
    top5Units: 'Top 5 unidades',
    colLoadingUnit: 'Unidad carguio',
    colTonnage: 'Tonelaje',
    colCycles: 'Ciclos',
    colFeaturedCaex: 'CAEX destacado',
    colDominantDestination: 'Destino dominante',
  },
  en: {
    notAvailable: 'N/A',
    mineOperation: 'Mine operation',
    executiveSummaryByFront: 'Executive summary by front',
    top5Units: 'Top 5 units',
    colLoadingUnit: 'Loading unit',
    colTonnage: 'Tonnage',
    colCycles: 'Cycles',
    colFeaturedCaex: 'Featured CAEX',
    colDominantDestination: 'Dominant destination',
  },
  de: {
    notAvailable: 'N/V',
    mineOperation: 'Minenbetrieb',
    executiveSummaryByFront: 'Managementübersicht nach Front',
    top5Units: 'Top 5 Geräte',
    colLoadingUnit: 'Ladegerät',
    colTonnage: 'Tonnen',
    colCycles: 'Zyklen',
    colFeaturedCaex: 'Hervorgehobener CAEX',
    colDominantDestination: 'Dominantes Ziel',
  },
}
