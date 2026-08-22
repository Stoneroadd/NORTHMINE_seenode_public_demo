import { CircleAlert, Inbox, LoaderCircle, RadioTower, ShieldCheck } from 'lucide-react'

type MissionStateKind = 'stable' | 'empty' | 'loading' | 'error' | 'connection'

const STATE_ICONS = {
  stable: ShieldCheck,
  empty: Inbox,
  loading: LoaderCircle,
  error: CircleAlert,
  connection: RadioTower,
} satisfies Record<MissionStateKind, typeof ShieldCheck>

interface MissionStateProps {
  kind: MissionStateKind
  title: string
  detail: string
  actionLabel?: string
  onAction?: () => void
  actionDisabled?: boolean
  announce?: 'polite' | 'assertive'
}

export function MissionState({
  kind,
  title,
  detail,
  actionLabel,
  onAction,
  actionDisabled = false,
  announce,
}: MissionStateProps) {
  const Icon = STATE_ICONS[kind]
  return (
    <section
      className={`mc-mission-state mc-mission-state--${kind}`}
      aria-busy={kind === 'loading'}
      aria-atomic={announce ? 'true' : undefined}
      aria-live={announce}
      role={announce ? (announce === 'assertive' ? 'alert' : 'status') : undefined}
    >
      <Icon aria-hidden="true" className={kind === 'loading' ? 'mc-motion-spin' : ''} size={28} />
      <div>
        <h3>{title}</h3>
        <p>{detail}</p>
      </div>
      {actionLabel && onAction && (
        <button
          type="button"
          className="mc-action mc-action--quiet"
          aria-disabled={actionDisabled}
          onClick={() => {
            if (!actionDisabled) onAction()
          }}
        >
          {actionLabel}
        </button>
      )}
    </section>
  )
}
