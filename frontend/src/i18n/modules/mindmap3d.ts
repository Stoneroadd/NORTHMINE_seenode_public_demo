import type { ModuleDict } from '../useModuleT'

export interface MindMap3dT {
  controls_aria_label: string
  controls_modo: string
  controls_calidad: string
  view_constelacion: string
  view_radial: string
  view_flujo: string
  view_riesgo: string
  view_economia: string
  quality_auto: string
  quality_alta: string
  quality_media: string
  quality_baja: string
  controls_sin_alertas_title: string
  controls_enfocar_title: string
  controls_sin_alertas: string
  controls_recorrer_alertas: (n: number) => string
  controls_reanudar: string
  controls_pausar: string
  controls_reset: string

  filters_categorias: string
  filters_centro: string
  filters_criticidad: string
  status_normal: string
  status_atencion: string
  status_critico: string
  status_inactivo: string
  status_sin_dato: string

  cat_operation: string
  cat_production: string
  cat_fleet: string
  cat_loading: string
  cat_economy: string
  cat_risk: string
  cat_intelligence: string
  cat_monthly_target: string

  inspector_aria_label: string
  inspector_sin_nodos: string
  inspector_sin_valor: string
  inspector_ver_cockpit: string
  inspector_estado: string
  inspector_riesgo: string
  inspector_importancia: string
  inspector_fuente: string
  inspector_fuente_agregada: string
  inspector_evidencia: string
  inspector_relaciones: string
  inspector_sin_relaciones: string
  inspector_si: string
  inspector_no: string
  inspector_no_disponible: string

  legend_modulos: (loaded: number, requested: number) => string
  legend_formas_aria: string
  legend_formas_titulo: string
  legend_shape_caex: string
  legend_shape_pala_uc: string
  legend_shape_destino: string
  legend_shape_riesgo_alerta: string
  legend_shape_meta: string
  legend_shape_kpi: string
  legend_partial_note: (n: number) => string

  search_label: string
  search_clear_aria: string

  scene_webgl_no_disponible: string
  scene_webgl_fallback_desc: string
  scene_hint: string

  page_titulo: string
  page_desc: string
  page_backend: string
  page_wenco: string
  page_datos: string
  page_actualizado: string
  page_conectado_fallback: string
  page_refresh_aria: string
  page_loading_titulo: string
  page_loading_desc: string
  page_warning: (status: string) => string
  page_selecciona_nodo: string
  page_modulo_no_disponible: string
}

export const mindmap3dT: ModuleDict<MindMap3dT> = {
  es: {
    controls_aria_label: 'Controles del mapa operacional 3D',
    controls_modo: 'Modo',
    controls_calidad: 'Calidad',
    view_constelacion: 'Constelacion',
    view_radial: 'Radial',
    view_flujo: 'Flujo operacional',
    view_riesgo: 'Riesgo',
    view_economia: 'Economia',
    quality_auto: 'Auto',
    quality_alta: 'Alta',
    quality_media: 'Media',
    quality_baja: 'Baja',
    controls_sin_alertas_title: 'Sin nodos en atencion o criticos',
    controls_enfocar_title: 'Enfocar el siguiente nodo en alerta',
    controls_sin_alertas: 'Sin alertas',
    controls_recorrer_alertas: (n) => `Recorrer alertas (${n})`,
    controls_reanudar: 'Reanudar',
    controls_pausar: 'Pausar',
    controls_reset: 'Reset',

    filters_categorias: 'Categorias',
    filters_centro: 'Centro',
    filters_criticidad: 'Criticidad',
    status_normal: 'Normal',
    status_atencion: 'Atencion',
    status_critico: 'Critico',
    status_inactivo: 'Inactivo',
    status_sin_dato: 'Sin dato',

    cat_operation: 'Operacion',
    cat_production: 'Produccion',
    cat_fleet: 'Flota',
    cat_loading: 'Carguio',
    cat_economy: 'Economia',
    cat_risk: 'Riesgos',
    cat_intelligence: 'Inteligencia',
    cat_monthly_target: 'Plan Mensual',

    inspector_aria_label: 'Detalle del nodo seleccionado',
    inspector_sin_nodos: 'Sin nodos disponibles.',
    inspector_sin_valor: 'Sin valor asociado',
    inspector_ver_cockpit: 'Ver en cockpit',
    inspector_estado: 'Estado',
    inspector_riesgo: 'Riesgo',
    inspector_importancia: 'Importancia',
    inspector_fuente: 'Fuente',
    inspector_fuente_agregada: 'Fuente agregada',
    inspector_evidencia: 'Evidencia',
    inspector_relaciones: 'Relaciones',
    inspector_sin_relaciones: 'Sin relaciones visibles.',
    inspector_si: 'Si',
    inspector_no: 'No',
    inspector_no_disponible: 'No disponible',

    legend_modulos: (loaded, requested) => `Modulos ${loaded}/${requested}`,
    legend_formas_aria: 'Formas por tipo de nodo',
    legend_formas_titulo: 'Formas',
    legend_shape_caex: 'CAEX',
    legend_shape_pala_uc: 'Pala / UC',
    legend_shape_destino: 'Destino',
    legend_shape_riesgo_alerta: 'Riesgo / Alerta',
    legend_shape_meta: 'Meta',
    legend_shape_kpi: 'KPI / Indicador',
    legend_partial_note: (n) => `${n} modulo(s) sin respuesta. La red se muestra en estado parcial.`,

    search_label: 'Buscar nodo',
    search_clear_aria: 'Limpiar busqueda',

    scene_webgl_no_disponible: 'WebGL no disponible',
    scene_webgl_fallback_desc: 'El navegador no expone WebGL. Se muestra una lista operacional de respaldo.',
    scene_hint: 'WebGL activo - Rotar: arrastrar - Pan: click derecho - Zoom: rueda - Seleccionar: click',

    page_titulo: 'Mapa Mental Operacional 3D',
    page_desc: 'Constelacion dinamica de produccion, flota, riesgos, economia, inteligencia y plan mensual.',
    page_backend: 'Backend',
    page_wenco: 'WENCO',
    page_datos: 'Datos',
    page_actualizado: 'Actualizado',
    page_conectado_fallback: 'CONECTADO',
    page_refresh_aria: 'Actualizar mapa 3D',
    page_loading_titulo: 'Construyendo mapa operacional 3D',
    page_loading_desc: 'Consultando APIs NORTHMINE con fuente real o estado parcial declarado.',
    page_warning: (status) => `Estado ${status}. El mapa mantiene datos disponibles y marca modulos faltantes sin cambiar a demo silencioso.`,
    page_selecciona_nodo: 'Selecciona un nodo para inspeccionar.',
    page_modulo_no_disponible: 'Modulo no disponible',
  },
  en: {
    controls_aria_label: '3D operational map controls',
    controls_modo: 'Mode',
    controls_calidad: 'Quality',
    view_constelacion: 'Constellation',
    view_radial: 'Radial',
    view_flujo: 'Operational flow',
    view_riesgo: 'Risk',
    view_economia: 'Economy',
    quality_auto: 'Auto',
    quality_alta: 'High',
    quality_media: 'Medium',
    quality_baja: 'Low',
    controls_sin_alertas_title: 'No nodes in attention or critical state',
    controls_enfocar_title: 'Focus the next alert node',
    controls_sin_alertas: 'No alerts',
    controls_recorrer_alertas: (n) => `Cycle alerts (${n})`,
    controls_reanudar: 'Resume',
    controls_pausar: 'Pause',
    controls_reset: 'Reset',

    filters_categorias: 'Categories',
    filters_centro: 'Center',
    filters_criticidad: 'Criticality',
    status_normal: 'Normal',
    status_atencion: 'Attention',
    status_critico: 'Critical',
    status_inactivo: 'Inactive',
    status_sin_dato: 'No data',

    cat_operation: 'Operation',
    cat_production: 'Production',
    cat_fleet: 'Fleet',
    cat_loading: 'Loading',
    cat_economy: 'Economy',
    cat_risk: 'Risks',
    cat_intelligence: 'Intelligence',
    cat_monthly_target: 'Monthly Plan',

    inspector_aria_label: 'Selected node detail',
    inspector_sin_nodos: 'No nodes available.',
    inspector_sin_valor: 'No associated value',
    inspector_ver_cockpit: 'View in cockpit',
    inspector_estado: 'Status',
    inspector_riesgo: 'Risk',
    inspector_importancia: 'Importance',
    inspector_fuente: 'Source',
    inspector_fuente_agregada: 'Aggregated source',
    inspector_evidencia: 'Evidence',
    inspector_relaciones: 'Relations',
    inspector_sin_relaciones: 'No visible relations.',
    inspector_si: 'Yes',
    inspector_no: 'No',
    inspector_no_disponible: 'Not available',

    legend_modulos: (loaded, requested) => `Modules ${loaded}/${requested}`,
    legend_formas_aria: 'Shapes by node type',
    legend_formas_titulo: 'Shapes',
    legend_shape_caex: 'CAEX',
    legend_shape_pala_uc: 'Shovel / LU',
    legend_shape_destino: 'Destination',
    legend_shape_riesgo_alerta: 'Risk / Alert',
    legend_shape_meta: 'Target',
    legend_shape_kpi: 'KPI / Indicator',
    legend_partial_note: (n) => `${n} module(s) not responding. The network is shown in partial state.`,

    search_label: 'Search node',
    search_clear_aria: 'Clear search',

    scene_webgl_no_disponible: 'WebGL not available',
    scene_webgl_fallback_desc: 'The browser does not expose WebGL. Showing a fallback operational list.',
    scene_hint: 'WebGL active - Rotate: drag - Pan: right click - Zoom: wheel - Select: click',

    page_titulo: '3D Operational Mind Map',
    page_desc: 'Dynamic constellation of production, fleet, risks, economy, intelligence and monthly plan.',
    page_backend: 'Backend',
    page_wenco: 'WENCO',
    page_datos: 'Data',
    page_actualizado: 'Updated',
    page_conectado_fallback: 'CONNECTED',
    page_refresh_aria: 'Refresh 3D map',
    page_loading_titulo: 'Building 3D operational map',
    page_loading_desc: 'Querying NORTHMINE APIs with real source or declared partial state.',
    page_warning: (status) => `Status ${status}. The map keeps available data and flags missing modules without silently switching to demo.`,
    page_selecciona_nodo: 'Select a node to inspect.',
    page_modulo_no_disponible: 'Module not available',
  },
  de: {
    controls_aria_label: 'Steuerung der operationalen 3D-Karte',
    controls_modo: 'Modus',
    controls_calidad: 'Qualität',
    view_constelacion: 'Konstellation',
    view_radial: 'Radial',
    view_flujo: 'Operativer Fluss',
    view_riesgo: 'Risiko',
    view_economia: 'Wirtschaft',
    quality_auto: 'Auto',
    quality_alta: 'Hoch',
    quality_media: 'Mittel',
    quality_baja: 'Niedrig',
    controls_sin_alertas_title: 'Keine Knoten mit Aufmerksamkeit oder kritischem Status',
    controls_enfocar_title: 'Nächsten Knoten mit Alarm fokussieren',
    controls_sin_alertas: 'Keine Alarme',
    controls_recorrer_alertas: (n) => `Alarme durchgehen (${n})`,
    controls_reanudar: 'Fortsetzen',
    controls_pausar: 'Pausieren',
    controls_reset: 'Zurücksetzen',

    filters_categorias: 'Kategorien',
    filters_centro: 'Zentrum',
    filters_criticidad: 'Kritikalität',
    status_normal: 'Normal',
    status_atencion: 'Aufmerksamkeit',
    status_critico: 'Kritisch',
    status_inactivo: 'Inaktiv',
    status_sin_dato: 'Keine Daten',

    cat_operation: 'Betrieb',
    cat_production: 'Produktion',
    cat_fleet: 'Flotte',
    cat_loading: 'Beladung',
    cat_economy: 'Wirtschaft',
    cat_risk: 'Risiken',
    cat_intelligence: 'Intelligenz',
    cat_monthly_target: 'Monatsplan',

    inspector_aria_label: 'Detail des ausgewählten Knotens',
    inspector_sin_nodos: 'Keine Knoten verfügbar.',
    inspector_sin_valor: 'Kein zugehöriger Wert',
    inspector_ver_cockpit: 'Im Cockpit anzeigen',
    inspector_estado: 'Status',
    inspector_riesgo: 'Risiko',
    inspector_importancia: 'Bedeutung',
    inspector_fuente: 'Quelle',
    inspector_fuente_agregada: 'Aggregierte Quelle',
    inspector_evidencia: 'Beleg',
    inspector_relaciones: 'Beziehungen',
    inspector_sin_relaciones: 'Keine sichtbaren Beziehungen.',
    inspector_si: 'Ja',
    inspector_no: 'Nein',
    inspector_no_disponible: 'Nicht verfügbar',

    legend_modulos: (loaded, requested) => `Module ${loaded}/${requested}`,
    legend_formas_aria: 'Formen nach Knotentyp',
    legend_formas_titulo: 'Formen',
    legend_shape_caex: 'CAEX',
    legend_shape_pala_uc: 'Schaufelbagger / UC',
    legend_shape_destino: 'Ziel',
    legend_shape_riesgo_alerta: 'Risiko / Alarm',
    legend_shape_meta: 'Ziel',
    legend_shape_kpi: 'KPI / Kennzahl',
    legend_partial_note: (n) => `${n} Modul(e) ohne Antwort. Das Netz wird im Teilstatus angezeigt.`,

    search_label: 'Knoten suchen',
    search_clear_aria: 'Suche löschen',

    scene_webgl_no_disponible: 'WebGL nicht verfügbar',
    scene_webgl_fallback_desc: 'Der Browser stellt kein WebGL bereit. Es wird eine operative Ersatzliste angezeigt.',
    scene_hint: 'WebGL aktiv - Drehen: ziehen - Verschieben: rechte Maustaste - Zoomen: Mausrad - Auswählen: Klick',

    page_titulo: 'Operative 3D-Mindmap',
    page_desc: 'Dynamische Konstellation von Produktion, Flotte, Risiken, Wirtschaft, Intelligenz und Monatsplan.',
    page_backend: 'Backend',
    page_wenco: 'WENCO',
    page_datos: 'Daten',
    page_actualizado: 'Aktualisiert',
    page_conectado_fallback: 'VERBUNDEN',
    page_refresh_aria: '3D-Karte aktualisieren',
    page_loading_titulo: 'Operative 3D-Karte wird erstellt',
    page_loading_desc: 'NORTHMINE-APIs werden mit realer Quelle oder deklariertem Teilstatus abgefragt.',
    page_warning: (status) => `Status ${status}. Die Karte behält verfügbare Daten und markiert fehlende Module, ohne stillschweigend auf Demo umzuschalten.`,
    page_selecciona_nodo: 'Wählen Sie einen Knoten aus, um ihn zu prüfen.',
    page_modulo_no_disponible: 'Modul nicht verfügbar',
  },
}
