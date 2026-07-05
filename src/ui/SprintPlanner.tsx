import { ACTIVITIES } from '../game/constants'
import { availableHours } from '../game/events'
import { useGameStore } from '../game/store'
import { activityCost, selectedActivityCost } from '../game/team'

export function SprintPlanner() {
  const selectedActivities = useGameStore((s) => s.selectedActivities)
  const currentEvent = useGameStore((s) => s.currentEvent)
  const committedHours = useGameStore((s) => s.committedHours)
  const reports = useGameStore((s) => s.reports)
  const sprint = useGameStore((s) => s.sprint)
  const toggleActivity = useGameStore((s) => s.toggleActivity)
  const runSprint = useGameStore((s) => s.runSprint)

  const budget = availableHours({ currentEvent, committedHours })
  const used = selectedActivityCost(selectedActivities, reports)

  return (
    <div className="flex w-full flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Plan your week
        </h2>
        <span className="text-sm tabular-nums">
          {used}/{budget}h
          {committedHours > 0 && (
            <span className="text-xs text-neutral-500"> (+{committedHours}h committed)</span>
          )}
        </span>
      </div>

      <div className="h-2 w-full overflow-hidden rounded bg-neutral-200 dark:bg-neutral-800">
        <div
          className="h-full bg-sky-500 transition-[width]"
          style={{ width: `${budget <= 0 ? 100 : Math.min(100, (used / budget) * 100)}%` }}
        />
      </div>

      <ul className="flex flex-col gap-1.5">
        {ACTIVITIES.map((activity) => {
          const cost = activityCost(activity.id, reports)
          const selected = selectedActivities.includes(activity.id)
          const fits = selected || used + cost <= budget
          return (
            <li key={activity.id}>
              <button
                type="button"
                onClick={() => toggleActivity(activity.id)}
                disabled={!fits}
                aria-pressed={selected}
                className={`flex w-full items-baseline justify-between gap-3 rounded border px-3 py-2 text-left text-sm transition-colors ${
                  selected
                    ? 'border-sky-500 bg-sky-50 dark:border-sky-600 dark:bg-sky-950'
                    : 'border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900'
                } disabled:cursor-not-allowed disabled:opacity-40`}
              >
                <span className="flex flex-col">
                  <span className="font-medium">
                    {activity.label}{' '}
                    <span className="font-normal text-neutral-500">({cost}h)</span>
                  </span>
                  <span className="text-xs text-neutral-500">
                    {selected ? activity.selectedHint : `Skipped: ${activity.skippedHint}`}
                  </span>
                </span>
                <span aria-hidden className="text-sky-600 dark:text-sky-400">
                  {selected ? '✓' : ''}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <button
        type="button"
        onClick={runSprint}
        className="rounded bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
      >
        Run sprint {sprint}
      </button>
    </div>
  )
}
