import { lazy, Suspense, useEffect } from 'react'
import { OperationalFontLoader } from './components/landing/OperationalFontLoader'
import { PublicPageMeta } from './components/landing/PublicPageMeta'

const OperationalApplication = lazy(() => import('./App'))
const DemoLandingPage = lazy(() => (
  import('./pages/DemoLandingPage').then((module) => ({ default: module.DemoLandingPage }))
))
const DemoRequestPage = lazy(() => (
  import('./pages/DemoRequestPage').then((module) => ({ default: module.DemoRequestPage }))
))
const DemoRequestSuccessPage = lazy(() => (
  import('./pages/DemoRequestSuccessPage').then((module) => ({ default: module.DemoRequestSuccessPage }))
))
const DemoPrivacyPage = lazy(() => (
  import('./pages/DemoPrivacyPage').then((module) => ({ default: module.DemoPrivacyPage }))
))
const BrandPrototypePage = lazy(() => (
  import('./pages/BrandPrototypePage').then((module) => ({ default: module.BrandPrototypePage }))
))

function PublicRouteFallback() {
  return (
    <main style={{
      minHeight: '100vh',
      display: 'grid',
      placeItems: 'center',
      background: '#0b0d0e',
      color: '#f2f3ef',
      fontFamily: '"IBM Plex Mono", monospace',
    }}>
      NORTHMINE
    </main>
  )
}

function RedirectToCockpit() {
  useEffect(() => {
    window.location.replace('/cockpit')
  }, [])
  return <PublicRouteFallback />
}

function DemoAccessLoginRoute() {
  return (
    <>
      <PublicPageMeta
        title="Acceso al demo | NORTHMINE Intelligence"
        description="Acceso protegido al demo interactivo de NORTHMINE Intelligence."
        robots="noindex,nofollow"
      />
      <OperationalApplication />
    </>
  )
}

export function PublicRouter() {
  const rawPath = window.location.pathname
  const path = rawPath.length > 1 ? rawPath.replace(/\/+$/, '') : rawPath

  if (path === '/app') return <RedirectToCockpit />
  if (path === '/acceso-demo') {
    return (
      <Suspense fallback={<PublicRouteFallback />}>
        <DemoAccessLoginRoute />
      </Suspense>
    )
  }

  const publicRoute = {
    '/': <DemoLandingPage />,
    '/solicitar-demo': <DemoRequestPage />,
    '/solicitud-recibida': <DemoRequestSuccessPage />,
    '/privacy': <DemoPrivacyPage />,
    '/brand-prototype': <BrandPrototypePage />,
  }[path]

  return (
    <Suspense fallback={<PublicRouteFallback />}>
      {publicRoute ?? (
        <>
          <OperationalFontLoader />
          <OperationalApplication />
        </>
      )}
    </Suspense>
  )
}
