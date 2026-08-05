import { useSectionReveal } from '../../../lib/animation/effects'
import { useModuleT } from '../../../i18n/useModuleT'
import { landingT } from '../../../i18n/modules/landing'

interface ProblemGroup {
  label?: string
  startIndex: number
  items: { title: string; description: string }[]
}

function groupProblemItems(items: { title: string; description: string; group?: string }[]): ProblemGroup[] {
  const groups: ProblemGroup[] = []
  items.forEach((item, index) => {
    if (item.group || groups.length === 0) {
      groups.push({ label: item.group, startIndex: index, items: [] })
    }
    groups[groups.length - 1].items.push(item)
  })
  return groups
}

export function ProblemSolution() {
  const t = useModuleT(landingT)
  const groups = groupProblemItems(t.problem.items)
  const scope = useSectionReveal<HTMLElement>({
    targets: '[data-problem-reveal]',
    distance: 20,
    stagger: 0.06,
    duration: 0.55,
  })

  return (
    <section ref={scope} className="ns-problem" id="problema" aria-labelledby="ns-problem-title">
      <div className="ns-saas__shell">
        <div className="ns-problem__head" data-problem-reveal>
          <p className="mono-label">{t.problem.kicker}</p>
          <h2 id="ns-problem-title">{t.problem.title}</h2>
          <p>
            {t.problem.body}
          </p>
        </div>

        <div className="ns-problem__layout">
          <div className="ns-problem__groups">
            {groups.map((group) => (
              <div className="ns-problem__group" key={group.label ?? group.startIndex}>
                {group.label && <p className="mono-label ns-problem__group-label">{group.label}</p>}
                <ol className="ns-problem__list" start={group.startIndex + 1}>
                  {group.items.map((problem, i) => (
                    <li key={problem.title} data-problem-reveal>
                      <span className="mono-label">{String(group.startIndex + i + 1).padStart(2, '0')}</span>
                      <div>
                        <h3>{problem.title}</h3>
                        <p>{problem.description}</p>
                      </div>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>

          <div className="ns-problem__answer" data-problem-reveal>
            <p className="mono-label">{t.problem.answerKicker}</p>
            <h3>{t.problem.answerTitle}</h3>
            <dl>
              {t.problem.transformations.map((transformation) => (
                <div key={transformation.before}>
                  <dt>{transformation.before}</dt>
                  <dd>{transformation.after}</dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {t.problem.impact && <p className="ns-problem__impact">{t.problem.impact}</p>}
      </div>
    </section>
  )
}
