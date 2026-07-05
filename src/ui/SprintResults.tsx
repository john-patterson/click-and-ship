import { EVENT_BY_ID } from '../game/constants'
import { useGameStore } from '../game/store'

function signed(n: number): string {
  return n > 0 ? `+${n}` : `${n}`
}

// Breakdown of the most recently resolved sprint of this quarter.
export function SprintResults() {
  const sprintHistory = useGameStore((s) => s.sprintHistory)
  const last = sprintHistory[sprintHistory.length - 1]

  if (!last) {
    return (
      <div className="flex w-full flex-col gap-2 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Last sprint
        </h2>
        <p className="text-sm text-neutral-500">
          Nothing resolved yet this quarter. Pick your activities and run sprint 1.
        </p>
      </div>
    )
  }

  return (
    <div className="flex w-full flex-col gap-2 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
        Sprint {last.sprint} results
      </h2>
      <ul className="flex flex-col gap-1 text-sm">
        <li className="flex justify-between gap-2">
          <span>Story points shipped</span>
          <span className="font-semibold tabular-nums">{last.sp} SP</span>
        </li>
        <li className="flex justify-between gap-2">
          <span>Incidents</span>
          <span className="tabular-nums">
            {last.incidents}
            {last.incidentSpCost > 0 ? ` (−${last.incidentSpCost} SP)` : ''}
          </span>
        </li>
        <li className="flex justify-between gap-2">
          <span>Morale</span>
          <span className="tabular-nums">
            {signed(last.moraleDelta)} → {last.moraleAfter}
          </span>
        </li>
        <li className="flex justify-between gap-2">
          <span>Tech debt</span>
          <span className="tabular-nums">
            {signed(last.techDebtDelta)} → {last.techDebtAfter}
          </span>
        </li>
        {last.event && (
          <li className="flex justify-between gap-2 text-neutral-500">
            <span>Event</span>
            <span>{EVENT_BY_ID[last.event].label}</span>
          </li>
        )}
      </ul>
    </div>
  )
}
