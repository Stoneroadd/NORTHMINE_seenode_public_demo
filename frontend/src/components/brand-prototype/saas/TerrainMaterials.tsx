import { motion, useReducedMotion } from 'framer-motion'
import { terrainPhotos } from './terrainData'

export function TerrainMaterials() {
  const reduceMotion = useReducedMotion()

  return (
    <section className="py-[100px] border-t border-[color:var(--ns-border)]" id="terreno" aria-labelledby="ns-terrain-title">
      <div className="ns-saas__shell">
        <div className="max-w-[640px] mx-auto text-center mb-11">
          <p className="mono-label">Terreno</p>
          <h2 id="ns-terrain-title" className="text-[clamp(28px,3.4vw,40px)] font-semibold mt-2.5 mb-3.5">
            El terreno detrás de los datos
          </h2>
          <p className="text-[16px] leading-relaxed text-[color:var(--ns-text-secondary)]">
            Fotografías reales de operación minera con licencia libre — no ilustraciones
            genéricas de plantilla. Créditos y licencia de cada una abajo.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-7">
          {terrainPhotos.map((photo, index) => (
            <motion.figure
              key={photo.id}
              className="group m-0"
              initial={reduceMotion ? false : { opacity: 0, y: 18 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-40px' }}
              transition={{ duration: 0.55, delay: (index % 3) * 0.08, ease: [0.22, 1, 0.36, 1] }}
            >
              <div
                className="ns-terrain__frame relative overflow-hidden rounded-[var(--ns-radius-md)] border border-[color:var(--ns-border)] bg-[color:var(--ns-graphite)] shadow-[var(--ns-shadow-card)] transition-[border-color,box-shadow] duration-200 group-hover:border-[color:var(--ns-border-strong)]"
                style={{ aspectRatio: photo.id === 'topografia' ? '16 / 9' : '4 / 3' }}
              >
                <img
                  className="ns-terrain__photo absolute inset-0 h-full w-full object-cover transition-transform duration-[900ms] ease-[cubic-bezier(0.22,1,0.36,1)] group-hover:scale-[1.05]"
                  src={photo.image}
                  srcSet={`${photo.imageMobile} 700w, ${photo.image} 1400w`}
                  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                  alt={photo.imageAlt}
                  loading="lazy"
                  width={photo.id === 'topografia' ? 1400 : 1000}
                  height={photo.id === 'topografia' ? 788 : 750}
                />
                <span className="mono-label absolute left-2.5 top-2.5 rounded-[var(--ns-radius-sm)] border border-[color:var(--ns-border)] bg-black/70 px-2 py-1 text-[color:var(--ns-copper)] backdrop-blur-sm">
                  {photo.category}
                </span>
              </div>
              <figcaption className="mt-3.5">
                <h3 className="text-[16px] font-semibold m-0 mb-1">{photo.title}</h3>
                <p className="text-[13px] leading-relaxed text-[color:var(--ns-text-secondary)] m-0 mb-2 max-w-[42ch]">
                  {photo.description}
                </p>
                <a
                  className="text-[12px] text-[color:var(--ns-text-muted)] hover:text-[color:var(--ns-copper)] underline decoration-[color:var(--ns-border-strong)] underline-offset-2"
                  href={photo.creditUrl}
                  target="_blank"
                  rel="noreferrer noopener"
                >
                  Foto: {photo.credit}
                </a>
              </figcaption>
            </motion.figure>
          ))}
        </div>
      </div>
    </section>
  )
}
