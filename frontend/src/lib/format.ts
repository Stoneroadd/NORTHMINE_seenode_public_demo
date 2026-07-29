// Formateadores compartidos. Antes se reimplementaba la misma funcion
// formatTons(value) => `${Math.round(value).toLocaleString('es-CL')} t` de
// forma identica en 5 archivos distintos (pages/OperatorRanking.tsx,
// pages/ExpertAnalysisPage.tsx, components/equipment/EquipmentVisualCard.tsx,
// components/equipment/MachineStatusOverlay.tsx, lib/shiftReportPdf.ts).
//
// Nota: otros modulos (Dashboard.tsx, cockpitModel.ts, mindMapUtils.ts,
// chartTheme.ts, OperatorRankingDrawer.tsx) tienen variantes de formatTons/
// formatNumber con comportamiento deliberadamente distinto (manejo de nulos,
// abreviacion Mt para numeros grandes, decimales) — esas NO se tocaron aca
// para no cambiar textos visibles sin una decision de diseno explicita.
export function formatTons(value: number): string {
  return `${Math.round(value || 0).toLocaleString('es-CL')} t`
}
