import { useRef, useState } from 'react'
import { archiveChapters } from './chapterData'
import { OperationalChapter } from './OperationalChapter'

export function OperationalArchive() {
  const [activeIndex, setActiveIndex] = useState(0)
  const tabRefs = useRef<(HTMLButtonElement | null)[]>([])
  const activeChapter = archiveChapters[activeIndex]

  const focusTab = (index: number) => {
    const wrapped = (index + archiveChapters.length) % archiveChapters.length
    setActiveIndex(wrapped)
    tabRefs.current[wrapped]?.focus()
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === 'ArrowDown' || event.key === 'ArrowRight') {
      event.preventDefault()
      focusTab(activeIndex + 1)
    } else if (event.key === 'ArrowUp' || event.key === 'ArrowLeft') {
      event.preventDefault()
      focusTab(activeIndex - 1)
    } else if (event.key === 'Home') {
      event.preventDefault()
      focusTab(0)
    } else if (event.key === 'End') {
      event.preventDefault()
      focusTab(archiveChapters.length - 1)
    }
  }

  return (
    <section className="nmp-archive" id="momento-4" aria-labelledby="nmp-archive-title">
      <div className="nmp-archive__head">
        <p className="mono-label">Archivo operacional</p>
        <h2 id="nmp-archive-title" className="nmp-archive__title">
          La operación como un sistema conectado
        </h2>
      </div>

      <div className="nmp-archive__body">
        <div
          className="nmp-archive__chapters"
          role="tablist"
          aria-label="Capítulos del archivo operacional"
          aria-orientation="vertical"
          onKeyDown={onKeyDown}
        >
          {archiveChapters.map((chapter, index) => (
            <button
              key={chapter.id}
              ref={(el) => {
                tabRefs.current[index] = el
              }}
              type="button"
              role="tab"
              id={`nmp-chapter-tab-${chapter.id}`}
              aria-selected={index === activeIndex}
              aria-controls={`nmp-chapter-panel-${chapter.id}`}
              tabIndex={index === activeIndex ? 0 : -1}
              className="nmp-archive__chapter-tab"
              onClick={() => setActiveIndex(index)}
            >
              <span className="mono-label">{chapter.number}</span>
              <span>{chapter.title}</span>
            </button>
          ))}
        </div>

        <OperationalChapter chapter={activeChapter} />
      </div>
    </section>
  )
}
