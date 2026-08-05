import type { ModuleDict } from '../useModuleT'

export interface LoginT {
  err_campos_vacios: string
  err_api_no_disponible: string
  err_credenciales_invalidas: string
  err_demasiados_intentos: string
  err_auth_no_disponible: string
  err_servicio_generico: string

  visual_aria_label: string
  hud_diseno_mina_real: string
  hud_dxf_vista_3d: string

  acceso_titulo: string
  placeholder_usuario: string
  placeholder_password: string

  status_produccion: string
  status_demo_local: string

  mine_canvas_aria_label: string
  wireframe_aria_label: string
}

export const loginT: ModuleDict<LoginT> = {
  es: {
    err_campos_vacios: 'Ingresa usuario y contrasena.',
    err_api_no_disponible: 'API no disponible. Revisa que NORTHMINE este iniciado.',
    err_credenciales_invalidas: 'Credenciales invalidas.',
    err_demasiados_intentos: 'Demasiados intentos. Espera antes de volver a ingresar.',
    err_auth_no_disponible: 'Autenticacion no disponible para este entorno.',
    err_servicio_generico: 'El servicio no pudo procesar el inicio de sesion.',

    visual_aria_label: 'Diseno real de rajo minero (DXF) girando, vista decorativa',
    hud_diseno_mina_real: 'DISEÑO DE MINA REAL',
    hud_dxf_vista_3d: 'DXF · VISTA 3D',

    acceso_titulo: 'Acceso operacional seguro',
    placeholder_usuario: 'usuario',
    placeholder_password: 'contrasena',

    status_produccion: 'Produccion',
    status_demo_local: 'Demo local',

    mine_canvas_aria_label: 'Rajo minero a cielo abierto con bermas poligonales, rutas de acarreo y equipos en movimiento',
    wireframe_aria_label: 'Plano tecnico wireframe de mina a cielo abierto',
  },
  en: {
    err_campos_vacios: 'Enter your username and password.',
    err_api_no_disponible: 'API not available. Check that NORTHMINE has started.',
    err_credenciales_invalidas: 'Invalid credentials.',
    err_demasiados_intentos: 'Too many attempts. Wait before signing in again.',
    err_auth_no_disponible: 'Authentication not available for this environment.',
    err_servicio_generico: 'The service could not process the sign in.',

    visual_aria_label: 'Real open-pit mine design (DXF) rotating, decorative view',
    hud_diseno_mina_real: 'REAL MINE DESIGN',
    hud_dxf_vista_3d: 'DXF · 3D VIEW',

    acceso_titulo: 'Secure operational access',
    placeholder_usuario: 'username',
    placeholder_password: 'password',

    status_produccion: 'Production',
    status_demo_local: 'Local demo',

    mine_canvas_aria_label: 'Open-pit mine with polygonal benches, haul routes and moving equipment',
    wireframe_aria_label: 'Technical wireframe blueprint of an open-pit mine',
  },
  de: {
    err_campos_vacios: 'Bitte Benutzername und Passwort eingeben.',
    err_api_no_disponible: 'API nicht verfügbar. Prüfen Sie, dass NORTHMINE gestartet ist.',
    err_credenciales_invalidas: 'Ungültige Anmeldedaten.',
    err_demasiados_intentos: 'Zu viele Versuche. Bitte warten Sie, bevor Sie sich erneut anmelden.',
    err_auth_no_disponible: 'Authentifizierung für diese Umgebung nicht verfügbar.',
    err_servicio_generico: 'Der Dienst konnte die Anmeldung nicht verarbeiten.',

    visual_aria_label: 'Reale Tagebaudesign (DXF) in Rotation, dekorative Ansicht',
    hud_diseno_mina_real: 'REALES MINENDESIGN',
    hud_dxf_vista_3d: 'DXF · 3D-ANSICHT',

    acceso_titulo: 'Sicherer operativer Zugriff',
    placeholder_usuario: 'Benutzer',
    placeholder_password: 'Passwort',

    status_produccion: 'Produktion',
    status_demo_local: 'Lokale Demo',

    mine_canvas_aria_label: 'Tagebaumine mit polygonalen Bermen, Förderwegen und beweglichen Geräten',
    wireframe_aria_label: 'Technischer Wireframe-Plan einer Tagebaumine',
  },
}
