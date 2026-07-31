import { useEffect } from 'react'

interface PublicPageMetaProps {
  title: string
  description: string
  robots?: string
}

function setMeta(name: string, content: string, property = false) {
  const attribute = property ? 'property' : 'name'
  let element = document.head.querySelector<HTMLMetaElement>(`meta[${attribute}="${name}"]`)
  if (!element) {
    element = document.createElement('meta')
    element.setAttribute(attribute, name)
    document.head.appendChild(element)
  }
  element.content = content
}

export function PublicPageMeta({
  title,
  description,
  robots = 'index,follow',
}: PublicPageMetaProps) {
  useEffect(() => {
    document.title = title
    setMeta('description', description)
    setMeta('robots', robots)
    setMeta('og:title', title, true)
    setMeta('og:description', description, true)
    setMeta('og:type', 'website', true)
    setMeta('og:image', `${window.location.origin}/assets/brand/fondo_login.png`, true)
  }, [description, robots, title])

  return null
}
