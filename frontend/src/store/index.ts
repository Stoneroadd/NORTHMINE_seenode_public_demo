import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { LangId } from '../i18n/translations'

// backward-compat
export type Lang = LangId

// ── TIPOS TEMA ─────────────────────────────────────────────────────────────
export type ThemeId = 'dark' | 'light' | 'futuristic' | 'minimal' | 'carbon'

export interface Effects {
  scanlines:  boolean
  hexgrid:    boolean
  glow:       boolean
  cursor:     boolean
  animations: boolean
}

const DEFAULT_EFFECTS: Effects = {
  scanlines: true, hexgrid: true, glow: true, cursor: true, animations: true,
}

// ── TIPOS ──────────────────────────────────────────────────────────────────
export type Rol = 'admin' | 'supervisor' | 'operador' | 'viewer'
export type TurnoId = 'DIA' | 'NOCHE' | 'AMBOS'
export type PageId =
  | 'resumen' | 'turno' | 'flota' | 'rendimiento' | 'comparativa'
  | 'alertas' | 'velocidades' | 'averias' | 'prediccion'
  | 'simulador' | 'aerea' | 'calidad'

export interface Usuario {
  id: string
  nombre: string
  rol: Rol
  faena: string
  empresa: string
  token: string
}

export interface FiltroGlobal {
  fechaDesde: string
  fechaHasta: string
  turno: TurnoId
  equipo?: string
}

export interface EstadoSistema {
  modo: 'produccion' | 'sql'
  conexionSQL: boolean
  ultimaActualizacion: string | null
  autoRefresh: boolean
  intervaloMinutos: number
}

// ── STORE PRINCIPAL ────────────────────────────────────────────────────────
interface AppStore {
  // Auth
  usuario: Usuario | null
  setUsuario: (u: Usuario | null) => void
  logout: () => void

  // Idioma
  lang: LangId
  setLang: (l: LangId) => void
  toggleLang: () => void

  // Tema
  themeId: ThemeId
  setTheme: (id: ThemeId) => void

  // Efectos visuales
  effects: Effects
  toggleEffect: (key: keyof Effects) => void
  resetEffects: () => void

  // Página activa
  pagina: PageId
  setPagina: (p: PageId) => void

  // Filtros globales
  filtro: FiltroGlobal
  setFiltro: (f: Partial<FiltroGlobal>) => void
  resetFiltro: () => void

  // Estado del sistema
  sistema: EstadoSistema
  setSistema: (s: Partial<EstadoSistema>) => void

  // UI
  sidebarCollapsed: boolean
  toggleSidebar: () => void
  settingsOpen: boolean
  setSettingsOpen: (v: boolean) => void

  // Rate limit
  rateLimitError: number | null
  setRateLimitError: (secs: number | null) => void

  // Backend inalcanzable (error de red, sin respuesta del servidor)
  backendUnreachable: boolean
  setBackendUnreachable: (v: boolean) => void

  // Datos obsoletos (backend respondio pero con "stale": true - WENCO caido,
  // se esta sirviendo el ultimo dataset valido cacheado, ver HU-2.3)
  datosObsoletos: boolean
  setDatosObsoletos: (v: boolean) => void

  // Password change modal
  passwordChangeOpen: boolean
  setPasswordChangeOpen: (v: boolean) => void

  // Idle timeout
  idleWarning: boolean
  setIdleWarning: (v: boolean) => void
  idleExpired: boolean
  setIdleExpired: (v: boolean) => void
  lastActivity: number
  setLastActivity: (t: number) => void
}

const hoy = new Date().toISOString().split('T')[0]
const mesInicio = `${hoy.slice(0, 7)}-01`

const filtroDefault: FiltroGlobal = {
  fechaDesde: mesInicio,
  fechaHasta: hoy,
  turno: 'AMBOS',
}

const VALID_LANGS: LangId[] = ['es', 'en', 'fr', 'de', 'pt', 'zh', 'ar', 'ru']
const VALID_THEMES: ThemeId[] = ['dark', 'light', 'futuristic', 'minimal', 'carbon']
const VALID_PAGES: PageId[] = [
  'resumen', 'turno', 'flota', 'rendimiento', 'comparativa', 'alertas',
  'velocidades', 'averias', 'prediccion', 'simulador', 'aerea', 'calidad',
]
const VALID_SHIFTS: TurnoId[] = ['DIA', 'NOCHE', 'AMBOS']

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function booleanOr(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

export const useAppStore = create<AppStore>()(
  persist(
    (set, get) => ({
      // Auth
      usuario: null,
      setUsuario: (u) => set({ usuario: u }),
      logout: () => set({ usuario: null }),

      // Idioma
      lang: 'es',
      setLang: (l) => set({ lang: l }),
      toggleLang: () => set({ lang: get().lang === 'es' ? 'en' : 'es' }),

      // Tema
      themeId: 'dark',
      setTheme: (id) => set({ themeId: id }),

      // Efectos
      effects: { ...DEFAULT_EFFECTS },
      toggleEffect: (key) => set((s) => ({ effects: { ...s.effects, [key]: !s.effects[key] } })),
      resetEffects: () => set({ effects: { ...DEFAULT_EFFECTS } }),

      // Página
      pagina: 'resumen',
      setPagina: (p) => set({ pagina: p }),

      // Filtros
      filtro: filtroDefault,
      setFiltro: (f) => set({ filtro: { ...get().filtro, ...f } }),
      resetFiltro: () => set({ filtro: filtroDefault }),

      // Sistema
      sistema: {
        modo: 'sql',
        conexionSQL: true,
        ultimaActualizacion: null,
        autoRefresh: false,
        intervaloMinutos: 5,
      },
      setSistema: (s) => set({ sistema: { ...get().sistema, ...s } }),

      // UI
      sidebarCollapsed: false,
      toggleSidebar: () => set({ sidebarCollapsed: !get().sidebarCollapsed }),
      settingsOpen: false,
      setSettingsOpen: (v) => set({ settingsOpen: v }),

      // Rate limit
      rateLimitError: null,
      setRateLimitError: (secs) => set({ rateLimitError: secs }),

      // Backend inalcanzable
      backendUnreachable: false,
      setBackendUnreachable: (v) => set({ backendUnreachable: v }),

      // Datos obsoletos
      datosObsoletos: false,
      setDatosObsoletos: (v) => set({ datosObsoletos: v }),

      // Password change modal
      passwordChangeOpen: false,
      setPasswordChangeOpen: (v) => set({ passwordChangeOpen: v }),

      // Idle timeout
      idleWarning: false,
      setIdleWarning: (v) => set({ idleWarning: v }),
      idleExpired: false,
      setIdleExpired: (v) => set({ idleExpired: v }),
      lastActivity: Date.now(),
      setLastActivity: (t) => set({ lastActivity: t }),
    }),
    {
      name: 'northmine-store',
      version: 2,
      merge: (persistedState, currentState) => {
        const persisted = isRecord(persistedState) ? persistedState : {}
        const storedEffects = isRecord(persisted.effects) ? persisted.effects : {}
        const storedFilter = isRecord(persisted.filtro) ? persisted.filtro : {}
        const storedSystem = isRecord(persisted.sistema) ? persisted.sistema : {}
        const interval = Number(storedSystem.intervaloMinutos)

        return {
          ...currentState,
          lang: VALID_LANGS.includes(persisted.lang as LangId) ? persisted.lang as LangId : currentState.lang,
          themeId: VALID_THEMES.includes(persisted.themeId as ThemeId) ? persisted.themeId as ThemeId : currentState.themeId,
          effects: {
            scanlines: booleanOr(storedEffects.scanlines, currentState.effects.scanlines),
            hexgrid: booleanOr(storedEffects.hexgrid, currentState.effects.hexgrid),
            glow: booleanOr(storedEffects.glow, currentState.effects.glow),
            cursor: booleanOr(storedEffects.cursor, currentState.effects.cursor),
            animations: booleanOr(storedEffects.animations, currentState.effects.animations),
          },
          pagina: VALID_PAGES.includes(persisted.pagina as PageId) ? persisted.pagina as PageId : currentState.pagina,
          filtro: {
            fechaDesde: typeof storedFilter.fechaDesde === 'string' ? storedFilter.fechaDesde : currentState.filtro.fechaDesde,
            fechaHasta: typeof storedFilter.fechaHasta === 'string' ? storedFilter.fechaHasta : currentState.filtro.fechaHasta,
            turno: VALID_SHIFTS.includes(storedFilter.turno as TurnoId) ? storedFilter.turno as TurnoId : currentState.filtro.turno,
            ...(typeof storedFilter.equipo === 'string' ? { equipo: storedFilter.equipo } : {}),
          },
          sistema: {
            modo: storedSystem.modo === 'produccion' || storedSystem.modo === 'sql' ? storedSystem.modo : currentState.sistema.modo,
            conexionSQL: booleanOr(storedSystem.conexionSQL, currentState.sistema.conexionSQL),
            ultimaActualizacion: null,
            autoRefresh: booleanOr(storedSystem.autoRefresh, currentState.sistema.autoRefresh),
            intervaloMinutos: Number.isFinite(interval) && interval > 0 ? interval : currentState.sistema.intervaloMinutos,
          },
          sidebarCollapsed: booleanOr(persisted.sidebarCollapsed, currentState.sidebarCollapsed),
        }
      },
      partialize: (s) => ({
        lang: s.lang,
        themeId: s.themeId,
        effects: s.effects,
        pagina: s.pagina,
        filtro: s.filtro,
        sidebarCollapsed: s.sidebarCollapsed,
        sistema: { ...s.sistema, ultimaActualizacion: null },
      }),
    }
  )
)

// ── HOOK DE TRADUCCIÓN ─────────────────────────────────────────────────────
import { translations } from '../i18n/translations'
export type { LangId } from '../i18n/translations'

export const useT = () => {
  const lang = useAppStore((s) => s.lang)
  return translations[lang] ?? translations['es']
}

// ── PERMISOS POR ROL ───────────────────────────────────────────────────────
export const PERMISOS: Record<Rol, PageId[]> = {
  admin:      ['resumen','turno','flota','rendimiento','comparativa','alertas',
               'velocidades','averias','prediccion','simulador','aerea','calidad'],
  supervisor: ['resumen','turno','flota','rendimiento','comparativa','alertas',
               'velocidades','averias'],
  operador:   ['resumen','turno','flota','alertas'],
  viewer:     ['resumen'],
}

export const tienePagina = (rol: Rol, pagina: PageId): boolean =>
  PERMISOS[rol]?.includes(pagina) ?? false
