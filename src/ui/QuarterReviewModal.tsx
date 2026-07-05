import { useGameStore } from '../game/store'
import type { QuarterOutcome } from '../game/save/schema'

const OUTCOME_MESSAGES: Record<QuarterOutcome, string | null> = {
  continue: null,
  warning: 'That D goes in your file. Another one in a row means a PIP.',
  'pip-start': 'Leadership has seen enough: you start next quarter on a PIP.',
  'pip-lifted': 'You clawed your way off the PIP. Back to normal next quarter.',
  fired: 'A grade like that while on a PIP only ends one way.',
  promoted: 'You hit the promotion bar!',
  capped: '24 quarters at the same level. HR gently suggests retirement.',
}

export function QuarterReviewModal() {
  const result = useGameStore((s) => s.lastQuarterResult)
  const endQuarter = useGameStore((s) => s.endQuarter)

  if (!result) return null

  const runEnds =
    result.outcome === 'fired' || result.outcome === 'promoted' || result.outcome === 'capped'
  const message = OUTCOME_MESSAGES[result.outcome]

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-full w-full max-w-sm flex-col gap-3 overflow-y-auto rounded-lg bg-white p-6 text-left dark:bg-neutral-900">
        <h2 className="text-lg font-semibold">Quarter {result.quarter} Review</h2>
        <p className="text-5xl font-bold">{result.grade}</p>

        <ul className="flex flex-col gap-0.5 text-sm text-neutral-600 dark:text-neutral-400">
          {result.reasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>

        <p className="text-sm">
          Career points:{' '}
          <span className="font-semibold">
            {result.pointsEarned >= 0 ? '+' : ''}
            {result.pointsEarned}
          </span>{' '}
          → {result.careerPointsAfter}/6
          {result.onPipDuringQuarter && (
            <span className="text-neutral-500"> (PIP quarter)</span>
          )}
        </p>

        {message && (
          <p
            className={`text-sm ${
              result.outcome === 'promoted' || result.outcome === 'pip-lifted'
                ? 'text-emerald-600 dark:text-emerald-400'
                : 'text-red-600 dark:text-red-400'
            }`}
          >
            {message}
          </p>
        )}

        <button
          type="button"
          onClick={endQuarter}
          className="rounded bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
        >
          {runEnds ? 'See run summary' : `Start Quarter ${result.quarter + 1}`}
        </button>
      </div>
    </div>
  )
}
