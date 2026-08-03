import { OriginStoryPage } from '../components/brand-prototype/origin/OriginStoryPage'
import { PublicPageMeta } from '../components/landing/PublicPageMeta'

export function OriginPage() {
  return (
    <>
      <PublicPageMeta
        title="Origen | La historia de NORTHMINE Intelligence"
        description="La trayectoria operacional que dio origen a NORTHMINE Intelligence, desde la primera línea minera hasta el desarrollo de una plataforma de decisión."
        robots="index,follow"
      />
      <OriginStoryPage />
    </>
  )
}
