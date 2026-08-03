import { useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from '../../../lib/animation/gsap'
import { useSectionReveal } from '../../../lib/animation/effects/SectionReveal'
import { NorthmineLogo } from '../../brand/NorthmineLogo'
import { modules } from '../saas/moduleData'
import '../../../styles/northmine-origin-story.css'

const chapters = [
  {
    number: '01',
    era: 'La primera línea',
    title: 'Donde todo comenzó.',
    body: [
      'Tenía 19 años cuando ingresé por primera vez a la minería. No llegué como ingeniero, analista ni desarrollador.',
      'Mi primera herramienta no fue un computador. Fue una pala. Comencé realizando limpieza industrial al interior de chancadores, molinos, espesadores y distintas áreas de una planta concentradora.',
    ],
    quote: 'Aquí no nació NORTHMINE. Aquí nació mi forma de entender la minería.',
    image: '/assets/landing/origin/planta-concentradora.png',
    alt: 'Planta concentradora donde comenzó la experiencia operacional que dio origen a NORTHMINE',
  },
  {
    number: '02',
    era: 'El rajo',
    title: 'La operación en toda su magnitud.',
    body: [
      'Pasé del interior de la planta a operar equipos de carguío, bulldozers y excavadoras. Cada minuto, cada maniobra y cada espera impactaban directamente en la productividad.',
      'Operar un equipo enseña lo que ningún reporte puede mostrar: cada ciclo tiene una razón, cada detención un costo y cada decisión una consecuencia.',
    ],
    quote: 'La mirada cambió: de observar un equipo aislado a comprender una cadena interdependiente.',
    image: '/assets/landing/origin/simon-operador.png',
    alt: 'Simón junto a un cargador frontal en una operación minera',
  },
  {
    number: '03',
    era: 'Despacho mina',
    title: 'Donde nacieron las preguntas.',
    body: [
      'Mientras estudiaba Ingeniería en Informática asumí el desafío de convertirme en Despachador Mina. Desde la sala de control debía coordinar operadores, mantenimiento, taller, planificación, topografía y sistemas FMS.',
      'El sistema mostraba información. La operación necesitaba respuestas inmediatas, comparables y comprensibles.',
    ],
    quote: 'Aquí no se mueve una sola roca. Pero aquí se decide cómo se moverán millones de toneladas.',
    image: '/assets/landing/origin/simon-despacho.png',
    alt: 'Simón en una sala de despacho minero rodeado de sistemas operacionales',
  },
] as const

const questions = [
  '¿Cuál es el rendimiento real de la Pala 1?',
  '¿Por qué la Pala 2 produce menos?',
  '¿Cuánto llevábamos ayer a esta misma hora?',
  '¿Cuál fue la mejor hora del turno?',
  '¿Cuánto demora realmente el ciclo?',
  '¿Por qué no hay camiones en ese frente?',
]

const formation = [
  ['PLANTA', 'Conocer el proceso'],
  ['RAJO', 'Entender la escala'],
  ['DESPACHO', 'Coordinar el sistema'],
  ['SQL', 'Extraer respuestas'],
  ['AUTOMATIZACIÓN', 'Reducir fricción'],
  ['IA', 'Reconocer patrones'],
] as const

function OriginHeader() {
  return (
    <header className="no-header">
      <div className="no-header__inner">
        <a className="no-brand" href="/" aria-label="NORTHMINE, inicio">
          <NorthmineLogo className="no-brand__logo" variant="horizontal" />
        </a>
        <nav className="no-nav" aria-label="Navegación principal">
          <a href="#historia">Origen</a>
          <a href="#preguntas">Preguntas</a>
          <a href="#northmine">Plataforma</a>
        </nav>
        <div className="no-header__actions">
          <a href="/acceso-demo">Acceder</a>
          <a className="no-button no-button--compact" href="/solicitar-demo">Solicitar demo</a>
        </div>
      </div>
    </header>
  )
}

function StoryChapter({ chapter, reverse }: { chapter: (typeof chapters)[number]; reverse?: boolean }) {
  const scope = useSectionReveal<HTMLElement>({ targets: '[data-reveal]', stagger: 0.08, distance: 30 })
  return (
    <section ref={scope} className={`no-chapter${reverse ? ' no-chapter--reverse' : ''}`}>
      <figure className="no-chapter__media" data-reveal>
        <img src={chapter.image} alt={chapter.alt} loading="lazy" />
        <figcaption>{chapter.number} / 03 · EXPERIENCIA OPERACIONAL</figcaption>
      </figure>
      <div className="no-chapter__copy">
        <p className="no-kicker" data-reveal>{chapter.number} · {chapter.era}</p>
        <h2 data-reveal>{chapter.title}</h2>
        {chapter.body.map((paragraph) => <p key={paragraph} data-reveal>{paragraph}</p>)}
        <blockquote data-reveal>{chapter.quote}</blockquote>
      </div>
    </section>
  )
}

export function OriginStoryPage() {
  const heroRef = useRef<HTMLElement>(null)
  const questionsRef = useSectionReveal<HTMLElement>({ targets: '[data-question]', stagger: 0.07, distance: 18 })
  const productRef = useSectionReveal<HTMLElement>({ targets: '[data-product]', stagger: 0.06, distance: 24 })

  useGSAP(() => {
    if (!heroRef.current) return
    const mm = gsap.matchMedia()
    mm.add({
      reduce: '(prefers-reduced-motion: reduce)',
      animate: '(prefers-reduced-motion: no-preference)',
    }, (context) => {
      const { reduce } = context.conditions as { reduce: boolean }
      const targets = heroRef.current?.querySelectorAll<HTMLElement>('[data-hero]')
      if (!targets) return
      if (reduce) {
        gsap.set(targets, { opacity: 1, y: 0 })
        return
      }
      gsap.set(targets, { opacity: 0, y: 28 })
      gsap.to(targets, {
        opacity: 1,
        y: 0,
        duration: 0.8,
        stagger: 0.1,
        ease: 'power3.out',
      })
      const image = heroRef.current?.querySelector<HTMLElement>('.no-hero__image')
      if (image) {
        gsap.to(image, {
          yPercent: 8,
          ease: 'none',
          scrollTrigger: {
            trigger: heroRef.current,
            start: 'top top',
            end: 'bottom top',
            scrub: 0.7,
          },
        })
      }
    })
  }, { scope: heroRef })

  return (
    <div className="no-page">
      <OriginHeader />
      <main id="historia">
        <section ref={heroRef} className="no-hero">
          <div className="no-hero__image" aria-hidden="true" />
          <div className="no-hero__veil" aria-hidden="true" />
          <div className="no-hero__content">
            <p className="no-kicker" data-hero>ORIGIN · THE MAKING OF NORTHMINE</p>
            <h1 data-hero>No comencé desarrollando software.<br /><em>Comencé moviendo mineral.</em></h1>
            <p className="no-hero__lead" data-hero>
              Cómo quince años en minería —desde la primera línea de planta hasta una sala de despacho—
              dieron origen a una plataforma de inteligencia operacional.
            </p>
            <div className="no-hero__actions" data-hero>
              <a className="no-button" href="#origen">Comenzar historia</a>
              <a className="no-text-link" href="#northmine">Ver NORTHMINE <span aria-hidden="true">↘</span></a>
            </div>
            <div className="no-hero__proof" data-hero>
              <strong>15 años</strong>
              <span>Operación</span><i>+</i><span>Datos</span><i>+</i><span>Software</span>
            </div>
          </div>
          <a className="no-scroll" href="#origen" aria-label="Continuar hacia la historia">
            <span>Desplázate</span><i aria-hidden="true" />
          </a>
        </section>

        <section className="no-origin-intro" id="origen">
          <p className="no-origin-intro__statement">Construido desde la operación.</p>
          <p>No desde una oficina ni una incubadora.</p>
          <div aria-label="Experiencias que forman NORTHMINE">
            <span>PLANTA</span><span>RAJO</span><span>DESPACHO</span><span>INTELIGENCIA</span>
          </div>
        </section>

        <section className="no-thesis">
          <p className="no-kicker">UNA TRAYECTORIA, UNA LECTURA</p>
          <h2>NorthMine es el resultado de haber vivido la minería desde múltiples perspectivas.</h2>
          <div className="no-thesis__line" aria-hidden="true" />
        </section>

        {chapters.map((chapter, index) => (
          <StoryChapter key={chapter.number} chapter={chapter} reverse={index % 2 === 1} />
        ))}

        <section ref={questionsRef} className="no-questions" id="preguntas">
          <div className="no-questions__intro">
            <p className="no-kicker" data-question>06 · PREGUNTAS APARENTEMENTE SIMPLES</p>
            <h2 data-question>El sistema mostraba información.<br />La operación necesitaba respuestas.</h2>
          </div>
          <ol>
            {questions.map((question, index) => (
              <li key={question} data-question>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <p>{question}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="no-formation">
          <div className="no-formation__copy">
            <p className="no-kicker">07 · CONSTRUIR LAS RESPUESTAS</p>
            <h2>No pensé en crear una empresa.</h2>
            <p>Pensé en reducir el tiempo entre una pregunta y una decisión.</p>
          </div>
          <ol>
            {formation.map(([stage, meaning], index) => (
              <li key={stage}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{stage}</strong>
                <p>{meaning}</p>
              </li>
            ))}
            <li className="is-result">
              <span>07</span><strong>NORTHMINE</strong><p>Integrar la visión</p>
            </li>
          </ol>
        </section>

        <section className="no-turning-point">
          <div>
            <p className="no-kicker">08 · EL PUNTO DE INFLEXIÓN</p>
            <h2>Producir más no siempre significa generar más valor.</h2>
            <p>Una sola pregunta cambió el foco: ¿cuánto costó producir esas toneladas?</p>
          </div>
          <div className="no-equation" aria-label="Relación entre producción, costo y margen">
            <div><span>+ t</span><p>Más producción</p></div>
            <b>≠</b>
            <div><span>+ USD</span><p>Mayor costo operacional</p></div>
            <b>→</b>
            <div className="is-negative"><span>− margen</span><p>Menor valor generado</p></div>
          </div>
        </section>

        <section ref={productRef} className="no-product" id="northmine">
          <div className="no-product__head" data-product>
            <p className="no-kicker">09 · NORTHMINE INTELLIGENCE</p>
            <h2>Antes veía equipos.<br />Hoy veo relaciones.</h2>
            <p>
              NORTHMINE no nació para mostrar dashboards. Nació para conectar operación,
              costos, restricciones y decisiones en una misma lectura operacional.
            </p>
          </div>
          <figure className="no-product__hero" data-product>
            <img
              src="/assets/landing/prototype/product/cockpit-operational-demo-capture.webp"
              srcSet="/assets/landing/prototype/product/cockpit-operational-demo-capture-900.webp 900w, /assets/landing/prototype/product/cockpit-operational-demo-capture.webp 1600w"
              sizes="(max-width: 900px) 100vw, 86vw"
              alt="Decision Cockpit de NORTHMINE con datos sintéticos identificados"
              loading="lazy"
            />
            <figcaption><strong>Decision Cockpit</strong><span>La operación convertida en una lectura ejecutiva.</span></figcaption>
          </figure>
          <div className="no-product__modules">
            {modules.slice(1, 7).map((module) => (
              <article key={module.id} data-product>
                <img
                  src={module.imageMobile}
                  srcSet={`${module.imageMobile} 600w, ${module.image} 1200w`}
                  sizes="(max-width: 720px) 100vw, 48vw"
                  alt={module.imageAlt}
                  loading="lazy"
                />
                <div><span>{module.category}</span><h3>{module.name}</h3><p>{module.description}</p></div>
              </article>
            ))}
          </div>
        </section>

        <section className="no-final">
          <p className="no-kicker">10 · ESTADO ACTUAL</p>
          <h2>Una plataforma en desarrollo, basada en problemas reales.</h2>
          <p>
            El mayor desafío de la minería no es obtener más datos. Es comprender qué significan.
            NORTHMINE es el resultado de quince años recorriendo distintos niveles de la operación.
          </p>
          <div className="no-final__actions">
            <a className="no-button" href="/solicitar-demo">Solicitar acceso al demo</a>
            <a className="no-text-link" href="/acceso-demo">Ya tengo acceso <span aria-hidden="true">↗</span></a>
          </div>
          <footer>
            <span className="no-final__brand">
              <NorthmineLogo variant="symbol" alt="" aria-hidden="true" />
              <strong>NORTHMINE Intelligence</strong>
            </span>
            <span>Simón Mazuela Robles · Founder</span>
          </footer>
        </section>
      </main>
    </div>
  )
}
