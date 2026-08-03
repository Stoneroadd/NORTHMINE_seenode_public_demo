import { motion, useReducedMotion } from 'framer-motion'
import type { ArchiveChapter } from './chapterData'

interface OperationalChapterProps {
  chapter: ArchiveChapter
}

export function OperationalChapter({ chapter }: OperationalChapterProps) {
  const reduceMotion = useReducedMotion()

  return (
    <motion.div
      className="nmp-archive__evidence"
      key={chapter.id}
      initial={reduceMotion ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.35 }}
      role="tabpanel"
      id={`nmp-chapter-panel-${chapter.id}`}
      aria-labelledby={`nmp-chapter-tab-${chapter.id}`}
    >
      <div className="nmp-archive__evidence-frame">
        <img
          className="nmp-archive__evidence-image"
          src={chapter.image}
          alt={chapter.imageAlt}
          style={chapter.imagePosition ? { objectPosition: chapter.imagePosition } : undefined}
          width="1600"
          height="900"
          loading="lazy"
        />
        <div className="nmp-archive__evidence-plate mono-label">{chapter.evidenceLabel}</div>
        <div className="nmp-archive__evidence-coord mono-label">{chapter.coordinate}</div>
      </div>
      <p className="mono-label nmp-archive__eyebrow">{chapter.eyebrow}</p>
      <h3 className="nmp-archive__chapter-title">{chapter.title}</h3>
      <p className="nmp-archive__chapter-description">{chapter.description}</p>
      <dl className="nmp-archive__facts">
        {chapter.facts.map((fact) => (
          <div key={fact.label}>
            <dt className="mono-label">{fact.label}</dt>
            <dd>{fact.value}</dd>
          </div>
        ))}
      </dl>
      <a className="nmp-archive__evidence-link" href="/solicitar-demo">
        Ver evidencia →
      </a>
    </motion.div>
  )
}
