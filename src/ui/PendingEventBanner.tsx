import { SENIOR_REFACTOR_APPROVE_COST } from '../game/constants'
import { specializationLabel } from '../game/labels'
import { useGameStore } from '../game/store'

export function PendingEventBanner() {
  const pendingEvent = useGameStore((s) => s.pendingEvent)
  const subtasks = useGameStore((s) => s.project.subtasks)
  const managerTimeBudget = useGameStore((s) => s.managerTimeBudget)
  const respondToEvent = useGameStore((s) => s.respondToEvent)

  if (!pendingEvent) return null

  const subtask = subtasks.find((t) => t.id === pendingEvent.subtaskId)
  const canApprove = managerTimeBudget >= SENIOR_REFACTOR_APPROVE_COST

  return (
    <div className="flex w-full max-w-md flex-col gap-2 rounded-lg border border-violet-400 bg-violet-50 p-4 text-left dark:border-violet-700 dark:bg-violet-950">
      <p className="text-sm">
        Refactor proposal on {subtask ? specializationLabel[subtask.specialization] : 'a subtask'} —
        approve for {SENIOR_REFACTOR_APPROVE_COST} manager time?
      </p>
      <div className="flex gap-2">
        <button
          type="button"
          disabled={!canApprove}
          onClick={() => respondToEvent('approve')}
          className="rounded bg-violet-600 px-3 py-1.5 text-sm text-white disabled:opacity-50"
        >
          Approve
        </button>
        <button
          type="button"
          onClick={() => respondToEvent('deny')}
          className="rounded border border-neutral-300 px-3 py-1.5 text-sm dark:border-neutral-700"
        >
          Deny
        </button>
      </div>
    </div>
  )
}
