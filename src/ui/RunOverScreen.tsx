import { useGameStore } from '../game/store'
import type { RunOverReason } from '../game/save/schema'

const HEADLINES: Record<RunOverReason, { title: string; detail: string }> = {
  promoted: {
    title: 'Promoted to Manager of Managers',
    detail:
      'The next rung of the ladder is coming in a future update. For now, enjoy the view from here.',
  },
  fired: {
    title: 'Fired',
    detail: 'A C or worse while on a PIP was the end of the road. Security has your badge.',
  },
  capped: {
    title: 'Career capped',
    detail:
      '24 quarters without a promotion. You retire as the longest-tenured IC Manager in company history.',
  },
}

export function RunOverScreen() {
  const runOverReason = useGameStore((s) => s.runOverReason)
  const runNumber = useGameStore((s) => s.runNumber)
  const gradeHistory = useGameStore((s) => s.gradeHistory)
  const totalSpRun = useGameStore((s) => s.totalSpRun)
  const careerPoints = useGameStore((s) => s.careerPoints)
  const restartRun = useGameStore((s) => s.restartRun)

  if (!runOverReason) return null

  const { title, detail } = HEADLINES[runOverReason]

  return (
    <div className="flex w-full max-w-md flex-col gap-4 rounded-lg border border-neutral-200 p-6 text-left dark:border-neutral-800">
      <div>
        <p className="text-xs uppercase tracking-wide text-neutral-500">Run #{runNumber} over</p>
        <h2
          className={`text-2xl font-bold ${
            runOverReason === 'promoted'
              ? 'text-emerald-600 dark:text-emerald-400'
              : 'text-red-600 dark:text-red-400'
          }`}
        >
          {title}
        </h2>
      </div>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">{detail}</p>

      <ul className="flex flex-col gap-1 text-sm">
        <li className="flex justify-between gap-2">
          <span>Quarters played</span>
          <span className="tabular-nums">{gradeHistory.length}</span>
        </li>
        <li className="flex justify-between gap-2">
          <span>Total SP shipped</span>
          <span className="tabular-nums">{totalSpRun}</span>
        </li>
        <li className="flex justify-between gap-2">
          <span>Career points</span>
          <span className="tabular-nums">{careerPoints}</span>
        </li>
      </ul>

      {gradeHistory.length > 0 && (
        <div className="flex flex-wrap gap-1">
          {gradeHistory.map((grade, index) => (
            <span
              key={`${index}-${grade}`}
              className="rounded border border-neutral-300 px-2 py-0.5 text-xs font-semibold dark:border-neutral-700"
            >
              Q{index + 1}: {grade}
            </span>
          ))}
        </div>
      )}

      <button
        type="button"
        onClick={restartRun}
        className="rounded bg-sky-600 px-4 py-2 text-sm font-medium text-white hover:bg-sky-500"
      >
        Start a new run
      </button>
    </div>
  )
}
