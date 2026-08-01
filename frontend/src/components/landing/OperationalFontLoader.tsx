import { useEffect } from 'react'

const operationalFontStylesheets = [
  'https://fonts.googleapis.com/css2?family=Orbitron:wght@400;700;900&family=Share+Tech+Mono&family=Exo+2:wght@300;400;600;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;600;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700&display=swap',
  'https://fonts.googleapis.com/css2?family=Rajdhani:wght@300;400;500;600;700&family=IBM+Plex+Mono:wght@400;500;600;700&family=Barlow+Condensed:wght@300;400;500;600;700&display=swap',
  'https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap',
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
