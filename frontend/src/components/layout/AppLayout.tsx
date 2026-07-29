import React, { useState, useEffect } from 'react'
import { useAppStore, useT, PERMISOS, type PageId } from '../../store'
import { Badge, Button, Spinner } from '../ui'

// ── ESTRUCTURA DE NAVEGACIÓN ───────────────────────────────────────────────
const NAV_STRUCTURE = [
  {
    groupKey: 'operacion' as const,
    color: 'var(--op-green)',
    pages: [
      { id: 'resumen'     as PageId, icon: '◈', labelKey: 'resumen'     },
      { id: 'turno'       as PageId, icon: '⊡', labelKey: 'turno'       },
      { id: 'flota'       as PageId, icon: '◉', labelKey: 'flota'       },
      { id: 'alertas'     as PageId, icon: '⚠', labelKey: 'alertas'     },
    ],
  },
  {
    groupKey: 'analisis' as const,
    color: 'var(--data-cyan)',
    pages: [
      { id: 'rendimiento' as PageId, icon: '▲', labelKey: 'rendimiento' },
      { id: 'comparativa' as PageId, icon: '⊞', labelKey: 'comparativa' },
      { id: 'prediccion'  as PageId, icon: '◎', labelKey: 'prediccion'  },
      { id: 'simulador'   as PageId, icon: '⊕', labelKey: 'simulador'   },
    ],
  },
  {
    groupKey: 'herramientas' as const,
    color: 'var(--warn-yellow)',
    pages: [
      { id: 'aerea'       as PageId, icon: '⊛', labelKey: 'aerea'       },
      { id: 'velocidades' as PageId, icon: '◌', labelKey: 'velocidades' },
      { id: 'averias'     as PageId, icon: '⊘', labelKey: 'averias'     },
      { id: 'calidad'     as PageId, icon: '◆', labelKey: 'calidad'     },
    ],
  },
]

// ── TOPBAR ──────────────────────────────────────────────────────────────────
const Topbar: React.FC = () => {
  const { usuario, sistema, lang, toggleLang, logout } = useAppStore()
  const t = useT()
  const [hora, setHora] = useState(new Date())

  useEffect(() => {
    const timer = setInterval(() => setHora(new Date()), 1000)
    return () => clearInterval(timer)
  }, [])

  const horaStr  = hora.toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
  const fechaStr = hora.toLocaleDateString(lang === 'es' ? 'es-CL' : 'en-US', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
  }).toUpperCase()

  return (
    <header style={{
      position: 'fixed', top: 0, left: 0, right: 0,
      height: 56, zIndex: 100,
      background: 'rgba(8, 13, 24, 0.95)',
      borderBottom: '1px solid var(--border-dim)',
      backdropFilter: 'blur(20px)',
      display: 'flex', alignItems: 'center',
      padding: '0 20px', gap: 16,
    }}>
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
        <div style={{
          width: 32, height: 32,
          background: 'linear-gradient(135deg, var(--op-green-dim), var(--data-cyan-dim))',
          border: '1px solid var(--data-cyan)',
          borderRadius: 'var(--r-sm)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 16, position: 'relative',
          boxShadow: 'var(--data-cyan-glow)',
        }}>
          ⛏
          <div style={{
            position: 'absolute', bottom: -1, right: -1,
            width: 8, height: 8, borderRadius: '50%',
            background: 'var(--op-green)',
            animation: 'pulseGlow 2s ease-in-out infinite',
          }}/>
        </div>
        <div>
          <div style={{
            fontFamily: 'var(--font-display)',
            fontSize: 16, fontWeight: 700,
            letterSpacing: '3px', color: 'var(--text-primary)',
            lineHeight: 1,
          }}>
            NORTHMINE
          </div>
          <div style={{
            fontFamily: 'var(--font-mono)',
            fontSize: 8, letterSpacing: '2px',
            color: 'var(--data-cyan)',
            lineHeight: 1,
          }}>
            INTELLIGENCE HUB · v2.0
          </div>
        </div>
      </div>

      {/* Status sistema */}
      <div style={{
        height: 32, width: 1,
        background: 'var(--border-dim)',
        margin: '0 4px',
      }}/>

      <Badge
        color={sistema.conexionSQL ? 'green' : 'yellow'}
        variant="outline"
        size="sm"
        pulse={sistema.conexionSQL}
      >
        {`◈ ${sistema.conexionSQL ? 'SQL LIVE' : 'OFFLINE'}`}
      </Badge>

      {/* Spacer */}
      <div style={{ flex: 1 }}/>

      {/* Reloj */}
      <div style={{
        fontFamily: 'var(--font-mono)',
        display: 'flex', flexDirection: 'column', alignItems: 'flex-end',
        gap: 1,
      }}>
        <div style={{
          fontSize: '1.1rem', fontWeight: 700,
          color: 'rgba(255,255,255,0.15)',
          letterSpacing: '2px', lineHeight: 1,
        }}>
          {horaStr}
        </div>
        <div style={{
          fontSize: 9, color: 'var(--text-disabled)',
          letterSpacing: '1px',
        }}>
          {fechaStr}
        </div>
      </div>

      <div style={{ height: 32, width: 1, background: 'var(--border-dim)' }}/>

      {/* Lang toggle */}
      <button
        onClick={toggleLang}
        style={{
          background: 'var(--data-cyan-dim)',
          border: '1px solid var(--border-mid)',
          borderRadius: 'var(--r-sm)',
          padding: '4px 10px',
          fontFamily: 'var(--font-mono)',
          fontSize: 11, fontWeight: 700,
          color: 'var(--data-cyan)',
          cursor: 'pointer',
          letterSpacing: '1px',
          transition: 'all var(--dur-fast)',
        }}
      >
        {lang.toUpperCase()}
      </button>

      {/* Usuario */}
      {usuario && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10,
        }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{
              fontSize: 12, fontFamily: 'var(--font-label)',
              fontWeight: 600, color: 'var(--text-secondary)',
              letterSpacing: '0.5px',
            }}>
              {usuario.nombre}
            </div>
            <div style={{
              fontSize: 9, fontFamily: 'var(--font-mono)',
              color: 'var(--op-green)', letterSpacing: '1px',
              textTransform: 'uppercase',
            }}>
              {usuario.rol} · {usuario.faena}
            </div>
          </div>
          <button
            onClick={logout}
            title={t.auth.salir}
            style={{
              background: 'var(--alert-dim)',
              border: '1px solid var(--alert-orange)44',
              borderRadius: 'var(--r-sm)',
              padding: '6px 10px', cursor: 'pointer',
              color: 'var(--alert-orange)',
              fontSize: 12, fontFamily: 'var(--font-mono)',
              transition: 'all var(--dur-fast)',
            }}
          >
            ⏻
          </button>
        </div>
      )}
    </header>
  )
}

// ── SIDEBAR ─────────────────────────────────────────────────────────────────
const Sidebar: React.FC = () => {
  const { pagina, setPagina, usuario, sidebarCollapsed, toggleSidebar } = useAppStore()
  const t  = useT()
  const rol = usuario?.rol ?? 'viewer'
  const paginasOk = PERMISOS[rol] ?? []

  const collapsed = sidebarCollapsed
  const W = collapsed ? 56 : 220

  return (
    <aside style={{
      position: 'fixed', top: 56, left: 0, bottom: 0,
      width: W, zIndex: 90,
      background: 'var(--bg-deep)',
      borderRight: '1px solid var(--border-dim)',
      display: 'flex', flexDirection: 'column',
      transition: `width var(--dur-med) var(--ease-out)`,
      overflow: 'hidden',
    }}>
      {/* Collapse toggle */}
      <button
        onClick={toggleSidebar}
        style={{
          height: 36, width: '100%',
          background: 'transparent',
          border: 'none',
          borderBottom: '1px solid var(--border-dim)',
          color: 'var(--text-tertiary)',
          cursor: 'pointer',
          fontSize: 14,
          display: 'flex', alignItems: 'center',
          justifyContent: collapsed ? 'center' : 'flex-end',
          padding: collapsed ? 0 : '0 14px',
          transition: 'all var(--dur-fast)',
        }}
      >
        {collapsed ? '›' : '‹'}
      </button>

      {/* Navegación */}
      <nav style={{
        flex: 1, overflowY: 'auto', overflowX: 'hidden',
        padding: '8px 0',
      }}>
        {NAV_STRUCTURE.map((grupo) => {
          const paginasGrupo = grupo.pages.filter(p => paginasOk.includes(p.id))
          if (!paginasGrupo.length) return null

          return (
            <div key={grupo.groupKey} style={{ marginBottom: 4 }}>
              {/* Group label */}
              {!collapsed && (
                <div style={{
                  padding: '10px 14px 4px',
                  fontSize: 9, fontFamily: 'var(--font-label)',
                  fontWeight: 700, letterSpacing: '2.5px',
                  color: grupo.color,
                  opacity: 0.7,
                  display: 'flex', alignItems: 'center', gap: 8,
                }}>
                  <div style={{
                    flex: 1, height: 1,
                    background: `${grupo.color}33`,
                  }}/>
                  {(t.nav as Record<string, string>)[grupo.groupKey]}
                  <div style={{
                    flex: 1, height: 1,
                    background: `${grupo.color}33`,
                  }}/>
                </div>
              )}

              {/* Pages */}
              {paginasGrupo.map((page) => {
                const active = pagina === page.id
                const label  = (t.nav as Record<string, string>)[page.labelKey] ?? page.labelKey

                return (
                  <button
                    key={page.id}
                    onClick={() => setPagina(page.id)}
                    title={collapsed ? label : undefined}
                    style={{
                      width: '100%',
                      display: 'flex', alignItems: 'center',
                      gap: 10,
                      padding: collapsed ? '10px 0' : '9px 14px',
                      justifyContent: collapsed ? 'center' : 'flex-start',
                      background: active
                        ? `${grupo.color}14`
                        : 'transparent',
                      border: 'none',
                      borderLeft: active
                        ? `2px solid ${grupo.color}`
                        : '2px solid transparent',
                      cursor: 'pointer',
                      transition: `all var(--dur-fast)`,
                      color: active ? grupo.color : 'var(--text-tertiary)',
                    }}
                    onMouseEnter={e => {
                      if (!active) {
                        e.currentTarget.style.background = `${grupo.color}08`
                        e.currentTarget.style.color = `${grupo.color}bb`
                      }
                    }}
                    onMouseLeave={e => {
                      if (!active) {
                        e.currentTarget.style.background = 'transparent'
                        e.currentTarget.style.color = 'var(--text-tertiary)'
                      }
                    }}
                  >
                    <span style={{
                      fontSize: 14, lineHeight: 1, flexShrink: 0,
                      textShadow: active ? `0 0 8px ${grupo.color}` : 'none',
                    }}>
                      {page.icon}
                    </span>
                    {!collapsed && (
                      <span style={{
                        fontSize: 13, fontFamily: 'var(--font-label)',
                        fontWeight: active ? 600 : 400,
                        letterSpacing: '0.5px',
                        whiteSpace: 'nowrap', overflow: 'hidden',
                      }}>
                        {label}
                      </span>
                    )}
                    {active && !collapsed && (
                      <div style={{
                        marginLeft: 'auto',
                        width: 5, height: 5, borderRadius: '50%',
                        background: grupo.color,
                        boxShadow: `0 0 8px ${grupo.color}`,
                        flexShrink: 0,
                      }}/>
                    )}
                  </button>
                )
              })}
            </div>
          )
        })}
      </nav>

      {/* Footer sidebar */}
      <div style={{
        padding: collapsed ? '12px 0' : '12px 14px',
        borderTop: '1px solid var(--border-dim)',
        display: 'flex',
        justifyContent: collapsed ? 'center' : 'space-between',
        alignItems: 'center',
      }}>
        {!collapsed && (
          <span style={{
            fontSize: 9, fontFamily: 'var(--font-mono)',
            color: 'var(--text-disabled)', letterSpacing: '1px',
          }}>
            NORTHMINE © 2026
          </span>
        )}
        <div style={{
          width: 6, height: 6, borderRadius: '50%',
          background: 'var(--op-green)',
          animation: 'pulseGlow 3s ease-in-out infinite',
        }}/>
      </div>
    </aside>
  )
}

// ── BREADCRUMB ─────────────────────────────────────────────────────────────
const Breadcrumb: React.FC = () => {
  const { pagina, filtro, sistema } = useAppStore()
  const t = useT()

  const navAll = NAV_STRUCTURE.flatMap(g => g.pages.map(p => ({ ...p, color: g.color })))
  const page   = navAll.find(p => p.id === pagina)
  const label  = page ? (t.nav as Record<string, string>)[page.labelKey] : pagina

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 12,
      padding: '0 24px', height: 40,
      borderBottom: '1px solid var(--border-dim)',
      background: 'rgba(8,13,24,0.6)',
    }}>
      {/* Page indicator */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {page && (
          <span style={{
            fontSize: 14, color: page.color,
            textShadow: `0 0 8px ${page.color}`,
          }}>
            {page.icon}
          </span>
        )}
        <span style={{
          fontFamily: 'var(--font-display)',
          fontSize: 14, fontWeight: 600,
          letterSpacing: '2px', textTransform: 'uppercase',
          color: 'var(--text-primary)',
        }}>
          {label}
        </span>
      </div>

      <div style={{ height: 16, width: 1, background: 'var(--border-dim)' }}/>

      {/* Filtro activo */}
      <span style={{
        fontSize: 11, fontFamily: 'var(--font-mono)',
        color: 'var(--text-tertiary)',
      }}>
        {filtro.fechaDesde} → {filtro.fechaHasta}
        {filtro.turno !== 'AMBOS' && ` · ${filtro.turno}`}
      </span>

      <div style={{ flex: 1 }}/>

      {/* Modo */}
      <span style={{
        fontSize: 9, fontFamily: 'var(--font-mono)',
        color: 'var(--text-disabled)', letterSpacing: '1px',
      }}>
        {`◈ ${sistema.conexionSQL ? 'LIVE DATA' : 'REAL DATA OFFLINE'}`}
      </span>
    </div>
  )
}

// ── LAYOUT PRINCIPAL ───────────────────────────────────────────────────────
export const AppLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { sidebarCollapsed } = useAppStore()
  const W = sidebarCollapsed ? 56 : 220

  return (
    <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
      <Topbar/>
      <Sidebar/>

      {/* Main content */}
      <div style={{
        marginLeft: W, marginTop: 56,
        width: `calc(100vw - ${W}px)`,
        maxWidth: `calc(100vw - ${W}px)`,
        minWidth: 0,
        overflowX: 'hidden',
        transition: `margin-left var(--dur-med) var(--ease-out)`,
        display: 'flex', flexDirection: 'column', flex: 1,
      }}>
        <Breadcrumb/>
        <main style={{
          flex: 1, padding: '24px',
          width: '100%',
          maxWidth: '100%',
          minWidth: 0,
          overflowX: 'hidden',
          animation: 'fadeUp var(--dur-slow) var(--ease-out)',
        }}>
          {children}
        </main>
      </div>
    </div>
  )
}
