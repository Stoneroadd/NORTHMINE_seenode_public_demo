import { useEffect, useRef } from 'react'
import { usePrefersReducedMotion } from '../../hooks/usePrefersReducedMotion'

export function MatrixRain() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const prefersReducedMotion = usePrefersReducedMotion()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || prefersReducedMotion) return

    const context = canvas.getContext('2d')
    if (!context) return

    const media = window.matchMedia('(max-width: 760px)')
    if (media.matches) return

    let frame = 0
    let width = 0
    let height = 0
    let columns: number[] = []
    const chars = '01NORTHMINEEXCAEX'
    const fontSize = 14

    const resize = () => {
      const ratio = window.devicePixelRatio || 1
      width = window.innerWidth
      height = window.innerHeight
      canvas.width = Math.floor(width * ratio)
      canvas.height = Math.floor(height * ratio)
      canvas.style.width = `${width}px`
      canvas.style.height = `${height}px`
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      columns = Array.from({ length: Math.ceil(width / fontSize) }, () => Math.random() * -40)
    }

    const draw = () => {
      context.fillStyle = 'rgba(7, 11, 20, 0.14)'
      context.fillRect(0, 0, width, height)
      context.font = `${fontSize}px "JetBrains Mono", monospace`
      context.fillStyle = 'rgba(99, 102, 241, 0.09)'

      columns.forEach((y, index) => {
        const char = chars[Math.floor(Math.random() * chars.length)]
        context.fillText(char, index * fontSize, y * fontSize)
        columns[index] = y * fontSize > height && Math.random() > 0.985 ? 0 : y + 0.28
      })

      frame = window.requestAnimationFrame(draw)
    }

    resize()
    draw()
    window.addEventListener('resize', resize)

    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener('resize', resize)
    }
  }, [prefersReducedMotion])

  return <canvas ref={canvasRef} className="matrix-rain" aria-hidden="true" />
}
