import { Fragment, useRef } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from '../../../lib/animation/gsap'
import { useSectionReveal } from '../../../lib/animation/effects/SectionReveal'
import { useModuleT } from '../../../i18n/useModuleT'
import { originT } from '../../../i18n/modules/origin'
import type { OriginChapterT } from '../../../i18n/modules/origin'
import { NorthmineLogo } from '../../brand/NorthmineLogo'
import { LanguageSwitcher } from '../../common/LanguageSwitcher'
import { modules } from '../saas/moduleData'
import '../../../styles/northmine-origin-story.css'

function OriginHeader() {
  const t = useModuleT(originT)
  return (
    <header className="no-header">
      <div className="no-header__inner">
        <a className="no-brand" href="/" aria-label={t.header.ariaBrand}>
          <NorthmineLogo className="no-brand__logo" variant="horizontal" />
        </a>
        <nav className="no-nav" aria-label={t.header.ariaNav}>
          <a href="#historia">{t.header.navOrigen}</a>
          <a href="#preguntas">{t.header.navPreguntas}</a>
          <a href="#northmine">{t.header.navPlataforma}</a>
        </nav>
        <div className="no-header__actions">
          <LanguageSwitcher ariaLabel="Idioma / Language" />
          <a href="/acceso-demo">{t.header.acceder}</a>
          <a className="no-button no-button--compact" href="/solicitar-demo">{t.header.solicitarDemo}</a>
        </div>
      </div>
    </header>
  )
}

function StoryChapter({ chapter, number, image, reverse }: { chapter: OriginChapterT; number: string; image: string; reverse?: boolean }) {
  const t = useModuleT(originT)
  const scope = useSectionReveal<HTMLElement>({ targets: '[data-reveal]', stagger: 0.08, distance: 30 })
  return (
    <section ref={scope} className={`no-chapter${reverse ? ' no-chapter--reverse' : ''}`}>
      <figure className="no-chapter__media" data-reveal>
        <img src={image} alt={chapter.alt} loading="lazy" />
        <figcaption>{number} / 03 · {t.chaptersCaption}</figcaption>
      </figure>
      <div className="no-chapter__copy">
        <p className="no-kicker" data-reveal>{number} · {chapter.era}</p>
        <h2 data-reveal>{chapter.title}</h2>
        {chapter.body.map((paragraph) => <p key={paragraph} data-reveal>{paragraph}</p>)}
        <blockquote data-reveal>{chapter.quote}</blockquote>
      </div>
    </section>
  )
}

export function OriginStoryPage() {
  const t = useModuleT(originT)
  const heroRef = useRef<HTMLElement>(null)
  const questionsRef = useSectionReveal<HTMLElement>({ targets: '[data-question]', stagger: 0.07, distance: 18 })
  const productRef = useSectionReveal<HTMLElement>({ targets: '[data-product]', stagger: 0.06, distance: 24 })
  const chapterImages = ['/assets/landing/origin/planta-concentradora.webp', '/assets/landing/origin/simon-operador.webp', '/assets/landing/origin/simon-despacho.webp']
  const chapterKeys = ['chapter01', 'chapter02', 'chapter03'] as const

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
            <p className="no-kicker" data-hero>{t.hero.kicker}</p>
            <h1 data-hero>{t.hero.title1}<br /><em>{t.hero.title2}</em></h1>
            <p className="no-hero__lead" data-hero>{t.hero.lead}</p>
            <div className="no-hero__actions" data-hero>
              <a className="no-button" href="#origen">{t.hero.ctaHistoria}</a>
              <a className="no-text-link" href="#northmine">{t.hero.ctaPlataforma} <span aria-hidden="true">↘</span></a>
            </div>
            <div className="no-hero__proof" data-hero>
              <strong>{t.hero.proofLabel}</strong>
              {t.hero.proofItems.map((item, i) => (
                <Fragment key={item}>{i > 0 ? <i>+</i> : null}<span>{item}</span></Fragment>
              ))}
            </div>
          </div>
          <a className="no-scroll" href="#origen" aria-label={t.hero.ariaScroll}>
            <span>{t.hero.scroll}</span><i aria-hidden="true" />
          </a>
        </section>

        <section className="no-origin-intro" id="origen">
          <p className="no-origin-intro__statement">{t.intro.statement}</p>
          <p>{t.intro.body}</p>
          <div aria-label={t.intro.aria}>
            {t.intro.items.map((item) => <span key={item}>{item}</span>)}
          </div>
        </section>

        <section className="no-thesis">
          <p className="no-kicker">{t.thesis.kicker}</p>
          <h2>{t.thesis.title}</h2>
          <div className="no-thesis__line" aria-hidden="true" />
        </section>

        {chapterKeys.map((key, index) => (
          <StoryChapter key={key} number={String(index + 1).padStart(2, '0')} chapter={t.chapters[key]} image={chapterImages[index]} reverse={index % 2 === 1} />
        ))}

        <section ref={questionsRef} className="no-questions" id="preguntas">
          <div className="no-questions__intro">
            <p className="no-kicker" data-question>{t.questions.kicker}</p>
            <h2 data-question>{t.questions.title1}<br />{t.questions.title2}</h2>
          </div>
          <ol>
            {t.questions.items.map((question, index) => (
              <li key={question} data-question>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <p>{question}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="no-formation">
          <div className="no-formation__copy">
            <p className="no-kicker">{t.formation.kicker}</p>
            <h2>{t.formation.title}</h2>
            <p>{t.formation.body}</p>
          </div>
          <ol>
            {t.formation.stages.map((stage, index) => (
              <li key={stage.stage}>
                <span>{String(index + 1).padStart(2, '0')}</span>
                <strong>{stage.stage}</strong>
                <p>{stage.meaning}</p>
              </li>
            ))}
            <li className="is-result">
              <span>07</span><strong>{t.formation.result.stage}</strong><p>{t.formation.result.meaning}</p>
            </li>
          </ol>
        </section>

        <section className="no-turning-point">
          <div>
            <p className="no-kicker">{t.turning.kicker}</p>
            <h2>{t.turning.title}</h2>
            <p>{t.turning.body}</p>
          </div>
          <div className="no-equation" aria-label={t.turning.aria}>
            {t.turning.equation.map((item, index) => (
              <Fragment key={item.value}>
                {index === 1 ? <b>≠</b> : null}
                {index === 2 ? <b>→</b> : null}
                <div className={index === 2 ? 'is-negative' : undefined}><span>{item.value}</span><p>{item.label}</p></div>
              </Fragment>
            ))}
          </div>
        </section>

        <section ref={productRef} className="no-product" id="northmine">
          <div className="no-product__head" data-product>
            <p className="no-kicker">{t.product.kicker}</p>
            <h2>{t.product.title1}<br />{t.product.title2}</h2>
            <p>{t.product.body}</p>
          </div>
          <figure className="no-product__hero" data-product>
            <img
              src="/assets/landing/prototype/product/cockpit-operational-demo-capture.webp"
              srcSet="/assets/landing/prototype/product/cockpit-operational-demo-capture-900.webp 900w, /assets/landing/prototype/product/cockpit-operational-demo-capture.webp 1600w"
              sizes="(max-width: 900px) 100vw, 86vw"
              alt={t.product.alt}
              loading="lazy"
            />
            <figcaption><strong>{t.product.figcaptionTitle}</strong><span>{t.product.figcaption}</span></figcaption>
          </figure>
          <div className="no-product__modules">
            {modules.slice(1, 7).map((module) => {
              const m = t.modules[module.id]
              return (
                <article key={module.id} data-product>
                  <img
                    src={module.imageMobile}
                    srcSet={`${module.imageMobile} 600w, ${module.image} 1200w`}
                    sizes="(max-width: 720px) 100vw, 48vw"
                    alt={m.alt}
                    loading="lazy"
                  />
                  <div><span>{m.category}</span><h3>{m.name}</h3><p>{m.description}</p></div>
                </article>
              )
            })}
          </div>
        </section>

        <section className="no-final">
          <p className="no-kicker">{t.final.kicker}</p>
          <h2>{t.final.title}</h2>
          <p>{t.final.body}</p>
          <div className="no-final__actions">
            <a className="no-button" href="/solicitar-demo">{t.final.ctaDemo}</a>
            <a className="no-text-link" href="/acceso-demo">{t.final.ctaAcceso} <span aria-hidden="true">↗</span></a>
          </div>
          <footer>
            <span className="no-final__brand">
              <NorthmineLogo variant="symbol" alt="" aria-hidden="true" />
              <strong>{t.final.brand}</strong>
            </span>
            <span>{t.final.founder}</span>
          </footer>
        </section>
      </main>
    </div>
  )
}
