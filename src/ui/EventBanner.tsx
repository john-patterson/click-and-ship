import { EVENT_BY_ID } from '../game/constants'
import { useGameStore } from '../game/store'

// Shows the event rolled for this sprint, so the player can plan around it.
export function EventBanner() {
  const currentEvent = useGameStore((s) => s.currentEvent)

  if (!currentEvent) {
    return (
      <p className="w-full rounded-lg border border-dashed border-neutral-300 px-4 py-2 text-sm text-neutral-500 dark:border-neutral-700">
        No surprises this sprint.
      </p>
    )
  }

  const event = EVENT_BY_ID[currentEvent]
  const positive = currentEvent === 'offsite' || currentEvent === 'kudos'

  return (
    <div
      className={`flex w-full flex-wrap items-baseline justify-between gap-x-4 gap-y-1 rounded-lg border px-4 py-2 ${
        positive
          ? 'border-emerald-300 bg-emerald-50 dark:border-emerald-900 dark:bg-emerald-950'
          : 'border-amber-300 bg-amber-50 dark:border-amber-900 dark:bg-amber-950'
      }`}
    >
      <span className="text-sm font-semibold">{event.label}</span>
      <span className="text-xs text-neutral-600 dark:text-neutral-400">{event.effectHint}</span>
    </div>
  )
}
