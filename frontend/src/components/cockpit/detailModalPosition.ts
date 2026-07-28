import type { CSSProperties } from 'react'

export interface DetailModalAnchor {
  x: number
  y: number
  viewportY: number
  documentHeight: number
}

export function getDetailModalAnchor(element: HTMLElement): DetailModalAnchor {
  const rect = element.getBoundingClientRect()
  const documentElement = document.documentElement
  return {
    x: window.scrollX + window.innerWidth / 2,
    y: window.scrollY + rect.top,
    viewportY: rect.top,
    documentHeight: Math.max(
      documentElement.scrollHeight,
      document.body.scrollHeight,
      window.innerHeight,
    ),
  }
}

export function getDetailModalStyle(anchor?: DetailModalAnchor | null): CSSProperties | undefined {
  if (!anchor || typeof window === 'undefined') return undefined

  const verticalOffset = 180
  const top = Math.max(anchor.y - verticalOffset, 12)

  return {
    '--nmcp-detail-anchor-top': `${Math.round(top)}px`,
    '--nmcp-detail-anchor-left': `${Math.round(anchor.x)}px`,
    '--nmcp-detail-document-height': `${Math.round(anchor.documentHeight)}px`,
  } as CSSProperties
}
