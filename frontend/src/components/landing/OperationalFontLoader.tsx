import { useEffect } from 'react'

// Orbitron, Share Tech Mono, Exo 2, Rajdhani and Barlow Condensed were
// requested here but appear in zero `font-family` declarations anywhere
// in src/ -- dropped. Inter and JetBrains Mono at these exact weights are
// already covered by tokens.css's own @import. IBM Plex Sans/Mono weights
// 400/500/600 are already self-hosted locally (northmine-fonts.css); only
// weight 700 is an actual gap, so that's all that's requested here.
const operationalFontStylesheets = [
  'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700&display=swap',
  'https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@700&family=IBM+Plex+Sans:wght@700&display=swap',
]

export function OperationalFontLoader() {
  useEffect(() => {
    operationalFontStylesheets.forEach((href, index) => {
      const id = `northmine-operational-fonts-${index}`
      if (document.getElementById(id)) return

      const link = document.createElement('link')
      link.id = id
      link.rel = 'stylesheet'
      link.href = href
      document.head.appendChild(link)
    })
  }, [])

  return null
}
