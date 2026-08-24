import { lazy, Suspense, useEffect } from 'react'
import { OperationalFontLoader } from './components/landing/OperationalFontLoader'
import { PublicAnalytics } from './components/landing/PublicAnalytics'
import { PublicPageMeta } from './components/landing/PublicPageMeta'
import { useModuleT } from './i18n/useModuleT'
import { publicPagesT } from './i18n/modules/publicPages'

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
const OriginPage = lazy(() => (
  import('./pages/OriginPage').then((module) => ({ default: module.OriginPage }))
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
  const t = useModuleT(publicPagesT)
  return (
    <>
      <OperationalFontLoader />
      <PublicPageMeta
        title={t.meta.access.title}
        description={t.meta.access.description}
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
    '/': <BrandPrototypePage />,
    '/landing-anterior': <DemoLandingPage />,
    '/solicitar-demo': <DemoRequestPage />,
    '/solicitud-recibida': <DemoRequestSuccessPage />,
    '/privacy': <DemoPrivacyPage />,
    '/brand-prototype': <BrandPrototypePage />,
    '/origen': <OriginPage />,
  }[path]

  return (
    <Suspense fallback={<PublicRouteFallback />}>
      {publicRoute ? (
        <>
          <PublicAnalytics />
          {publicRoute}
        </>
      ) : (
        <>
          <OperationalFontLoader />
          <OperationalApplication />
        </>
      )}
    </Suspense>
  )
}
