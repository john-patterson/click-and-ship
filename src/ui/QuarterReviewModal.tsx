import { useGameStore } from '../game/store'

export function QuarterReviewModal() {
  const phase = useGameStore((s) => s.phase)
  const result = useGameStore((s) => s.lastQuarterResult)
  const runNumber = useGameStore((s) => s.runNumber)
  const acknowledgeQuarterReview = useGameStore((s) => s.acknowledgeQuarterReview)
  const restartRun = useGameStore((s) => s.restartRun)

  if (phase === 'active' || !result) return null

  const passed = phase === 'quarter-review'

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 p-4">
      <div className="flex w-full max-w-sm flex-col gap-3 rounded-lg bg-white p-6 text-left dark:bg-neutral-900">
        <h2 className="text-lg font-semibold">Quarter {result.quarter} Review</h2>
        <p className="text-4xl font-bold">{result.grade}</p>
        <ul className="text-sm text-neutral-600 dark:text-neutral-400">
          <li>Score: {Math.round(result.score)}</li>
          <li>Subtasks shipped: {result.subtasksCompleted}</li>
          <li>Incidents: {result.incidents}</li>
          <li>Manager-fill spend: {result.managerFillSpend}</li>
        </ul>
        {passed ? (
          <button
            type="button"
            onClick={acknowledgeQuarterReview}
            className="rounded bg-violet-600 px-4 py-2 text-sm font-medium text-white"
          >
            Start Quarter {result.quarter + 1}
          </button>
        ) : (
          <>
            <p className="text-sm text-red-600 dark:text-red-400">
              Run #{runNumber} is over on that grade.
            </p>
            <button
              type="button"
              onClick={restartRun}
              className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white"
            >
              Start New Run
            </button>
          </>
        )}
      </div>
    </div>
  )
}
