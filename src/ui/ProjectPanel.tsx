import { MANAGER_FILL_COST } from '../game/constants'
import { specializationLabel } from '../game/labels'
import { useGameStore } from '../game/store'

export function ProjectPanel() {
  const project = useGameStore((s) => s.project)
  const team = useGameStore((s) => s.team)
  const managerTimeBudget = useGameStore((s) => s.managerTimeBudget)
  const assignManagerFill = useGameStore((s) => s.assignManagerFill)

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
        {project.name}
      </h2>
      {project.subtasks.map((t) => {
        const assignedDev = team.find((m) => m.assignedSubtaskId === t.id)
        const canFill =
          !t.done && !assignedDev && !t.managerFilling && managerTimeBudget >= MANAGER_FILL_COST

        return (
          <div
            key={t.id}
            className="flex flex-col gap-1 rounded border border-neutral-200 p-3 dark:border-neutral-800"
          >
            <div className="flex items-center justify-between">
              <span className="font-medium">{specializationLabel[t.specialization]}</span>
              <span className="text-xs text-neutral-500">
                {assignedDev ? assignedDev.name : t.managerFilling ? 'Manager filling' : 'Unassigned'}
              </span>
            </div>
            <div className="h-2 w-full overflow-hidden rounded bg-neutral-200 dark:bg-neutral-800">
              <div
                className={`h-full ${t.done ? 'bg-emerald-500' : 'bg-violet-500'}`}
                style={{ width: `${t.progress}%` }}
              />
            </div>
            {!t.done && !assignedDev && (
              <button
                type="button"
                disabled={!canFill}
                onClick={() => assignManagerFill(t.id)}
                className="self-start rounded border border-neutral-300 px-2 py-1 text-xs disabled:opacity-50 dark:border-neutral-700"
              >
                Fill with manager time ({MANAGER_FILL_COST})
              </button>
            )}
          </div>
        )
      })}
    </div>
  )
}
