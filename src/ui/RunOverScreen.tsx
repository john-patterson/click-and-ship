import { TIER_TITLES } from '../game/constants'
import { useGameStore } from '../game/store'
import type { RunOverReason } from '../game/save/schema'

const HEADLINES: Record<RunOverReason, { title: string; detail: string }> = {
  promoted: {
    title: 'Promoted to Manager of Managers',
    detail:
      'Three teams, three managers, and problems you can no longer fix by opening the editor. The MoM tier arrives in a future update — for now, savor the corner office.',
  },
  fired: {
    title: 'Fired',
    detail: 'A C or worse while on a PIP was the end of the road. Security has your badge.',
  },
  capped: {
    title: 'Forced retirement',
    detail:
      '24 quarters without making the next rung. HR throws a modest party; the cake says "Thanks for everything!". You retire as the longest-tenured IC Manager in company history.',
  },
  retired: {
    title: 'Retired',
    detail: 'You walked out on your own terms. Almost nobody gets to do that.',
  },
}

const LEGACY_LABELS = {
  ally: 'Brought an ally',
  capital: 'Cashed in goodwill',
  reputation: 'Rode the reputation',
} as const

// End-of-career screen: retirement (voluntary or Q24-forced), firing, or the
// promotion "coming soon" landing. Meta-progression survives the New Career
// button; nothing else does.
export function RunOverScreen() {
  const runOverReason = useGameStore((s) => s.runOverReason)
  const gradeHistory = useGameStore((s) => s.gradeHistory)
  const totalSpRun = useGameStore((s) => s.totalSpRun)
  const legacyPicks = useGameStore((s) => s.legacyPicks)
  const metaProgression = useGameStore((s) => s.metaProgression)
  const reports = useGameStore((s) => s.reports)
  const restartRun = useGameStore((s) => s.restartRun)

  if (!runOverReason) return null

  const { title, detail } = HEADLINES[runOverReason]

  // Best grade streak: longest run of B-or-better quarters.
  let bestStreak = 0
  let streak = 0
  for (const grade of gradeHistory) {
    streak = grade === 'B' || grade === 'A' || grade === 'S' ? streak + 1 : 0
    bestStreak = Math.max(bestStreak, streak)
  }

  const bestHire = [...reports].sort((a, b) => b.baseSp - a.baseSp)[0]
  const mostPromoted = [...reports].sort((a, b) => b.timesPromoted - a.timesPromoted)[0]

  return (
    <div className="flex w-full max-w-md flex-col gap-4 rounded-lg border border-neutral-200 p-6 text-left dark:border-neutral-800">
      <div>
        <p className="text-xs uppercase tracking-wide text-neutral-500">
          Career #{metaProgression.careerCount} over
        </p>
        <h2
          className={`text-2xl font-bold ${
            runOverReason === 'promoted' || runOverReason === 'retired'
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
          <span>Best grade streak (B+)</span>
          <span className="tabular-nums">{bestStreak}</span>
        </li>
        <li className="flex justify-between gap-2">
          <span>Peak tier reached</span>
          <span>{TIER_TITLES[metaProgression.peakTier]}</span>
        </li>
        {legacyPicks.length > 0 && (
          <li className="flex justify-between gap-2">
            <span>Legacy picks</span>
            <span>{legacyPicks.map((pick) => LEGACY_LABELS[pick]).join(', ')}</span>
          </li>
        )}
        {bestHire && (
          <li className="flex justify-between gap-2">
            <span>Strongest team member</span>
            <span>
              {bestHire.name} ({bestHire.baseSp} SP)
            </span>
          </li>
        )}
        {mostPromoted && mostPromoted.timesPromoted > 0 && (
          <li className="flex justify-between gap-2">
            <span>Most promoted</span>
            <span>
              {mostPromoted.name} (×{mostPromoted.timesPromoted})
            </span>
          </li>
        )}
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
        Start a new career
      </button>
    </div>
  )
}
