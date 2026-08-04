import { useAmbientScrollWash } from '../../../lib/animation/effects'

/**
 * A fixed, decorative color layer sitting behind every section (sections
 * themselves paint no background of their own, so this shows through the
 * gaps between cards). Purely atmospheric — never carries content, never
 * intercepts pointer events.
 */
export function AmbientWash() {
  const ref = useAmbientScrollWash<HTMLDivElement>()

  return (
    <div ref={ref} className="ns-ambient" aria-hidden="true">
      <div className="ns-ambient__blob ns-ambient__blob--copper" data-ambient-blob="a" />
      <div className="ns-ambient__blob ns-ambient__blob--amber" data-ambient-blob="b" />
    </div>
  )
}
