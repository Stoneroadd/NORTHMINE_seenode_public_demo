import type { ModuleDict } from '../useModuleT'

export interface AerialT {
  // OrthomosaicViewer
  viewer_kicker: string
  viewer_title: (fileName: string) => string
  viewer_hint: string
  zoom_out_aria: string
  zoom_in_aria: string
  generating_preview: string
  preview_error: string
  orthomosaic_alt: (fileName: string) => string

  // AerialPage
  loading_label: string
  error_detail: string
  eyebrow: string
  title: string
  description: string
  drive_connected: string
  drive_not_configured: string
  auto_sync: (intervalMin: number, lastRunSuffix: string) => string
  auto_sync_last_run_suffix: (time: string) => string
  syncing: string
  sync_button: string
  drive_error_default: string
  files_downloaded: (count: number, names: string) => string
  no_new_files: (detail: string) => string
  checked_suffix: (folder: string) => string
  sync_failed: string

  kpi_status_title: string
  kpi_files_title: string
  kpi_files_subtitle: string
  kpi_files_trend_none: string
  kpi_caex_title: string
  kpi_caex_subtitle: string
  kpi_caex_trend: (loaders: number) => string
  kpi_last_title: string
  kpi_last_subtitle_none: string
  kpi_last_trend_validating: string
  tif_loaded: string
  tif_not_loaded: string

  orthomosaic_kicker: string
  last_file_available: string
  file_label: string
  format_label: string
  size_label: string
  date_label: string
  heavy_viewer_hint: string
  no_operational_data: string

  coverage_kicker: string
  layer_status: string
  no_internal_routes_hint: string

  files_kicker: string
  files_metadata: string
}

export const aerialT: ModuleDict<AerialT> = {
  es: {
    viewer_kicker: 'Visor',
    viewer_title: (fileName) => `Ortomosaico ${fileName}`,
    viewer_hint: 'Rueda: zoom / Arrastrar: mover / Doble clic: acercar',
    zoom_out_aria: 'Alejar',
    zoom_in_aria: 'Acercar',
    generating_preview: 'Generando vista previa del TIF... la primera vez puede tardar unos segundos.',
    preview_error: 'No se pudo generar la vista previa. Reintenta recargando la pagina.',
    orthomosaic_alt: (fileName) => `Ortomosaico ${fileName}`,

    loading_label: 'Cargando estado aereo...',
    error_detail: 'No se pudo cargar el modulo de vista aerea.',
    eyebrow: 'Vista Aerea',
    title: 'Ortomosaicos y cobertura operacional',
    description: 'Ortomosaicos reales de vuelo. El visor muestra la preview JPEG (3000 px); el TIF original queda en el servidor.',
    drive_connected: 'Drive vuelos: conectado',
    drive_not_configured: 'Drive sin configurar',
    auto_sync: (intervalMin, lastRunSuffix) => `Auto cada ${intervalMin} min${lastRunSuffix}`,
    auto_sync_last_run_suffix: (time) => ` / ultima ${time}`,
    syncing: 'Sincronizando...',
    sync_button: 'Buscar ortomosaico',
    drive_error_default: 'Error al revisar la carpeta Drive.',
    files_downloaded: (count, names) => `${count} archivo(s) descargados: ${names}`,
    no_new_files: (detail) => `Sin ortomosaicos nuevos en la carpeta Drive${detail}.`,
    checked_suffix: (folder) => ` (${folder})`,
    sync_failed: 'No se pudo sincronizar. Reintenta.',

    kpi_status_title: 'Estado',
    kpi_files_title: 'Archivos',
    kpi_files_subtitle: 'Ortomosaicos detectados',
    kpi_files_trend_none: 'sin archivo',
    kpi_caex_title: 'CAEX',
    kpi_caex_subtitle: 'Cobertura operacional',
    kpi_caex_trend: (loaders) => `${loaders} palas`,
    kpi_last_title: 'Ultimo',
    kpi_last_subtitle_none: 'Sin ortomosaico',
    kpi_last_trend_validating: 'en validacion',
    tif_loaded: 'TIF cargado',
    tif_not_loaded: 'TIF no cargado',

    orthomosaic_kicker: 'Ortomosaico',
    last_file_available: 'Ultimo archivo disponible',
    file_label: 'Archivo',
    format_label: 'Formato',
    size_label: 'Tamano',
    date_label: 'Fecha',
    heavy_viewer_hint: 'Visor pesado en validacion. Estado actual: metadata-only.',
    no_operational_data: 'Sin datos suficientes para evaluacion operacional',

    coverage_kicker: 'Cobertura',
    layer_status: 'Estado de capas',
    no_internal_routes_hint: 'No se exponen rutas internas del servidor al frontend.',

    files_kicker: 'Archivos',
    files_metadata: 'Metadatos disponibles',
  },
  en: {
    viewer_kicker: 'Viewer',
    viewer_title: (fileName) => `Orthomosaic ${fileName}`,
    viewer_hint: 'Wheel: zoom / Drag: pan / Double click: zoom in',
    zoom_out_aria: 'Zoom out',
    zoom_in_aria: 'Zoom in',
    generating_preview: 'Generating TIF preview... the first time may take a few seconds.',
    preview_error: 'Could not generate the preview. Retry by reloading the page.',
    orthomosaic_alt: (fileName) => `Orthomosaic ${fileName}`,

    loading_label: 'Loading aerial status...',
    error_detail: 'Could not load the aerial view module.',
    eyebrow: 'Aerial View',
    title: 'Orthomosaics and operational coverage',
    description: 'Real flight orthomosaics. The viewer shows the JPEG preview (3000 px); the original TIF stays on the server.',
    drive_connected: 'Flight Drive: connected',
    drive_not_configured: 'Drive not configured',
    auto_sync: (intervalMin, lastRunSuffix) => `Auto every ${intervalMin} min${lastRunSuffix}`,
    auto_sync_last_run_suffix: (time) => ` / last ${time}`,
    syncing: 'Syncing...',
    sync_button: 'Search orthomosaic',
    drive_error_default: 'Error checking the Drive folder.',
    files_downloaded: (count, names) => `${count} file(s) downloaded: ${names}`,
    no_new_files: (detail) => `No new orthomosaics in the Drive folder${detail}.`,
    checked_suffix: (folder) => ` (${folder})`,
    sync_failed: 'Could not sync. Retry.',

    kpi_status_title: 'Status',
    kpi_files_title: 'Files',
    kpi_files_subtitle: 'Orthomosaics detected',
    kpi_files_trend_none: 'no file',
    kpi_caex_title: 'CAEX',
    kpi_caex_subtitle: 'Operational coverage',
    kpi_caex_trend: (loaders) => `${loaders} loaders`,
    kpi_last_title: 'Latest',
    kpi_last_subtitle_none: 'No orthomosaic',
    kpi_last_trend_validating: 'in validation',
    tif_loaded: 'TIF loaded',
    tif_not_loaded: 'TIF not loaded',

    orthomosaic_kicker: 'Orthomosaic',
    last_file_available: 'Latest file available',
    file_label: 'File',
    format_label: 'Format',
    size_label: 'Size',
    date_label: 'Date',
    heavy_viewer_hint: 'Heavy viewer in validation. Current status: metadata-only.',
    no_operational_data: 'Not enough data for operational evaluation',

    coverage_kicker: 'Coverage',
    layer_status: 'Layer status',
    no_internal_routes_hint: 'Internal server routes are not exposed to the frontend.',

    files_kicker: 'Files',
    files_metadata: 'Available metadata',
  },
}
