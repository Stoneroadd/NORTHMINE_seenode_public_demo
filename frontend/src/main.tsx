import React from 'react'
import ReactDOM from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import './styles/themes.css'
import './styles/tokens.css'
import './styles/northmine-tokens.css'
import App from './App'
import { FAST_PUBLIC_DEMO } from './demo/fastDemo'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // No reintentar en 401/403 — el token no cambia con el retry
      retry: (failureCount, error: any) => {
        const status = error?.status ?? error?.response?.status
        if (status === 401 || status === 403) return false
        return failureCount < 1
      },
      staleTime: FAST_PUBLIC_DEMO ? 10 * 60 * 1000 : 15000,
      gcTime: FAST_PUBLIC_DEMO ? 30 * 60 * 1000 : 5 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnReconnect: !FAST_PUBLIC_DEMO,
      refetchOnMount: !FAST_PUBLIC_DEMO,
    },
  },
})

interface RootErrorBoundaryState {
  hasError: boolean
  errorMessage: string
}

class RootErrorBoundary extends React.Component<
  { children: React.ReactNode },
  RootErrorBoundaryState
> {
  state: RootErrorBoundaryState = { hasError: false, errorMessage: '' }

  static getDerivedStateFromError(error: unknown): RootErrorBoundaryState {
    return {
      hasError: Boolean(error),
      errorMessage: error instanceof Error ? error.message : 'Error de interfaz no identificado',
    }
  }

  componentDidCatch(error: unknown) {
    console.error('NORTHMINE frontend boot error', error)
  }

  private resetInterface = () => {
    localStorage.removeItem('northmine-store')
    window.location.assign('/cockpit')
  }

  private closeSession = () => {
    localStorage.removeItem('northmine-store')
    localStorage.removeItem('northmine2.auth.session')
    window.location.assign('/')
  }

  render() {
    if (this.state.hasError) {
      return (
        <main
          style={{
            minHeight: '100vh',
            display: 'grid',
            placeItems: 'center',
            background: '#050810',
            color: '#e9f2f0',
            fontFamily: 'Inter, Segoe UI, Arial, sans-serif',
            padding: 24,
          }}
        >
          <section
            style={{
              width: 'min(100%, 520px)',
              border: '1px solid rgba(239, 176, 77, 0.32)',
              background: 'rgba(10, 15, 22, 0.92)',
              borderRadius: 10,
              padding: 28,
              boxShadow: '0 24px 70px rgba(0, 0, 0, 0.36)',
            }}
          >
            <p style={{ color: '#75d6a0', fontWeight: 800, letterSpacing: '0.08em' }}>
              NORTHMINE
            </p>
            <h1 style={{ marginTop: 10, fontSize: 24 }}>No fue posible iniciar la interfaz</h1>
            <p style={{ marginTop: 12, color: '#9aa8a8', lineHeight: 1.6 }}>
              Se detecto una configuracion local incompatible o un error de runtime. Puedes restaurar la interfaz sin perder datos operacionales.
            </p>
            {import.meta.env.DEV && this.state.errorMessage && (
              <code style={{ display: 'block', marginTop: 14, padding: 10, borderRadius: 6, background: '#050810', color: '#efb04d', fontSize: 12 }}>
                {this.state.errorMessage}
              </code>
            )}
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, marginTop: 20 }}>
              <button type="button" onClick={this.resetInterface} style={{ border: '1px solid #29e76f', borderRadius: 6, background: 'rgba(41,231,111,0.12)', color: '#f4f7fa', padding: '10px 14px', cursor: 'pointer', fontWeight: 700 }}>
                Restaurar interfaz
              </button>
              <button type="button" onClick={this.closeSession} style={{ border: '1px solid #1d3448', borderRadius: 6, background: '#102131', color: '#9eadba', padding: '10px 14px', cursor: 'pointer', fontWeight: 700 }}>
                Cerrar sesion
              </button>
            </div>
          </section>
        </main>
      )
    }

    return this.props.children
  }
}

const rootElement = document.getElementById('root')

if (!rootElement) {
  throw new Error('Missing NORTHMINE root element')
}

ReactDOM.createRoot(rootElement).render(
  <React.StrictMode>
    <RootErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </RootErrorBoundary>
  </React.StrictMode>,
)
