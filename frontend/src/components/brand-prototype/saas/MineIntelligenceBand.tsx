import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from '../../../lib/animation/gsap'

const signals = ['Producción', 'Flota', 'Carguío', 'Riesgo', 'Plan']

export function MineIntelligenceBand() {
  const scope = useRef<HTMLElement>(null)

  useGSAP(() => {
    const media = scope.current?.querySelector<HTMLElement>('[data-mine-media]')
    const copy = scope.current?.querySelectorAll<HTMLElement>('[data-mine-copy]')
    if (!media || !copy?.length) return

    const mm = gsap.matchMedia()
    mm.add('(prefers-reduced-motion: no-preference) and (min-width: 721px)', () => {
      gsap.to(media, {
        yPercent: 10,
        scale: 1.05,
        ease: 'none',
        scrollTrigger: {
          trigger: scope.current,
          start: 'top bottom',
          end: 'bottom top',
          scrub: 0.8,
        },
      })
    })
    mm.add('(prefers-reduced-motion: no-preference)', () => {
      gsap.set(copy, { autoAlpha: 0, y: 28 })
      gsap.to(copy, {
        autoAlpha: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: 'power3.out',
        scrollTrigger: {
          trigger: scope.current,
          start: 'top 72%',
          once: true,
        },
      })
    })
  }, { scope })

  return (
    <section ref={scope} className="ns-mine-band" aria-labelledby="ns-mine-band-title">
      <div className="ns-mine-band__media" data-mine-media aria-hidden="true">
        <img
          src="/assets/landing/saas/connected-operation-loader.webp"
          alt=""
          width={1672}
          height={941}
          loading="lazy"
        />
      </div>
      <div className="ns-mine-band__veil" aria-hidden="true" />
      <div className="ns-saas__shell ns-mine-band__content">
        <p className="mono-label" data-mine-copy>INTELIGENCIA OPERACIONAL CONECTADA</p>
        <h2 id="ns-mine-band-title" data-mine-copy>
          Una operación.<br />Una lectura compartida.
        </h2>
        <p data-mine-copy>
          NORTHMINE reúne las señales que normalmente llegan separadas y las
          convierte en contexto para decidir durante el turno.
        </p>
        <div className="ns-mine-band__signals" data-mine-copy aria-label="Señales conectadas por NORTHMINE">
          {signals.map((signal) => <span key={signal}>{signal}</span>)}
        </div>
      </div>
    </section>
  )
}
