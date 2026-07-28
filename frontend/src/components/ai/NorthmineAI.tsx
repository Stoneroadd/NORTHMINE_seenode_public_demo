import { useEffect, useRef, useState } from 'react'
import { apiFetch } from '../../lib/api'

interface Props {
  tipo: string
  contexto: Record<string, unknown>
  label?: string
}

export function NorthmineAI({ tipo, contexto, label }: Props) {
  const [fullText, setFullText] = useState('')
  const [displayText, setDisplayText] = useState('')
  const [loading, setLoading] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [timestamp, setTimestamp] = useState('')
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const startTypewriter = (text: string) => {
    if (timerRef.current) clearInterval(timerRef.current)
    let i = 0
    setDisplayText('')
    timerRef.current = setInterval(() => {
      i++
      setDisplayText(text.slice(0, i))
      if (i >= text.length) {
        if (timerRef.current) clearInterval(timerRef.current)
        setTimestamp(
          new Date().toLocaleString('es-CL', {
            day: '2-digit', month: '2-digit',
            hour: '2-digit', minute: '2-digit',
          })
        )
      }
    }, 18)
  }

  const analyze = async () => {
    setLoading(true)
    setHasError(false)
    try {
      const result = await apiFetch<{ texto: string; source: string }>('/api/ai/analysis', {
        method: 'POST',
        body: JSON.stringify({ tipo, contexto }),
      })
      setFullText(result.texto)
      startTypewriter(result.texto)
    } catch {
      setHasError(true)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [])

  const buttonLabel = loading
    ? '⟳ Analizando...'
    : fullText
    ? 'Actualizar análisis'
    : label ?? 'Analizar'

  return (
    <div style={{
      background: 'rgba(0,212,255,0.04)',
      border: '1px solid rgba(0,212,255,0.15)',
      borderLeft: '3px solid var(--nm-cyan)',
      borderRadius: 8,
      padding: '14px 16px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 10 }}>
        <span style={{
          display: 'flex', alignItems: 'center', gap: 8,
          fontWeight: 800, fontSize: 11, letterSpacing: '0.1em',
          textTransform: 'uppercase', color: 'var(--nm-cyan)',
        }}>
          🤖 NORTHMINE AI
        </span>
        <button
          type="button"
          className="command-button command-button-secondary"
          style={{ minHeight: 28, fontSize: 11, padding: '4px 10px' }}
          disabled={loading}
          onClick={analyze}
        >
          {buttonLabel}
        </button>
      </div>

      <div style={{
        minHeight: 80, fontSize: 13,
        color: 'var(--nm-muted)', lineHeight: 1.7,
        fontFamily: 'Inter, system-ui, sans-serif',
        whiteSpace: 'pre-wrap',
      }}>
        {loading && !displayText && (
          <span style={{ color: 'rgba(0,212,255,0.5)', fontStyle: 'italic' }}>
            Analizando operación...
          </span>
        )}
        {hasError && (
          <span style={{ color: 'var(--nm-red)' }}>
            Error al conectar con el servicio de análisis.
          </span>
        )}
        {displayText}
        {!loading && !hasError && !fullText && (
          <span style={{ color: 'rgba(245,255,250,0.22)', fontStyle: 'italic' }}>
            Haz clic en "Analizar" para obtener el análisis ejecutivo de IA.
          </span>
        )}
      </div>

      {timestamp && (
        <div style={{
          marginTop: 8, textAlign: 'right',
          color: 'rgba(0,212,255,0.45)', fontSize: 10,
          fontFamily: '"JetBrains Mono", monospace',
        }}>
          {timestamp} · IA
        </div>
      )}
    </div>
  )
}
