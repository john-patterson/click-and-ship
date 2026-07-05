import { SPRINT_DURATION_MS, SPRINTS_PER_QUARTER } from '../game/constants'
import { useGameStore } from '../game/store'

export function SprintControls() {
  const sprint = useGameStore((s) => s.sprint)
  const quarter = useGameStore((s) => s.quarter)
  const sprintElapsedMs = useGameStore((s) => s.sprintElapsedMs)
  const managerTimeBudget = useGameStore((s) => s.managerTimeBudget)
  const managerTimeBudgetMax = useGameStore((s) => s.managerTimeBudgetMax)

  const sprintProgress = Math.min(100, (sprintElapsedMs / SPRINT_DURATION_MS) * 100)

  return (
    <div className="flex w-full max-w-md flex-col gap-2 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex items-center justify-between text-sm">
        <span>
          Quarter {quarter} — Sprint {sprint}/{SPRINTS_PER_QUARTER}
        </span>
        <span>
          Manager time: {Math.round(managerTimeBudget)}/{managerTimeBudgetMax}
        </span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded bg-neutral-200 dark:bg-neutral-800">
        <div className="h-full bg-sky-500" style={{ width: `${sprintProgress}%` }} />
      </div>
    </div>
  )
}
