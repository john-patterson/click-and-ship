import {
  MAX_QUARTERS,
  PROMOTION_POINTS_REQUIRED,
  SPRINTS_PER_QUARTER,
  TIER_TITLES,
} from '../game/constants'
import { useGameStore } from '../game/store'

function moraleColor(morale: number): string {
  if (morale >= 70) return 'text-emerald-600 dark:text-emerald-400'
  if (morale >= 40) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

function debtColor(techDebt: number): string {
  if (techDebt < 25) return 'text-emerald-600 dark:text-emerald-400'
  if (techDebt <= 60) return 'text-amber-600 dark:text-amber-400'
  return 'text-red-600 dark:text-red-400'
}

export function StatsHeader() {
  const quarter = useGameStore((s) => s.quarter)
  const sprint = useGameStore((s) => s.sprint)
  const morale = useGameStore((s) => s.morale)
  const techDebt = useGameStore((s) => s.techDebt)
  const careerPoints = useGameStore((s) => s.careerPoints)
  const quarterSp = useGameStore((s) => s.quarterSp)
  const quarterIncidents = useGameStore((s) => s.quarterIncidents)
  const onPip = useGameStore((s) => s.onPip)
  const tier = useGameStore((s) => s.tier)
  const politicalCapital = useGameStore((s) => s.politicalCapital)

  return (
    <div className="flex w-full flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-sm font-medium">
          {TIER_TITLES[tier]} — Quarter {quarter}/{MAX_QUARTERS}, Sprint {sprint}/
          {SPRINTS_PER_QUARTER}
        </span>
        <div className="flex items-center gap-2">
          {onPip && (
            <span className="rounded bg-red-600 px-2 py-0.5 text-xs font-semibold uppercase text-white">
              On PIP
            </span>
          )}
          <span className="text-sm text-neutral-500" title="Political capital">
            ⚖ {politicalCapital}
          </span>
          <span className="text-sm text-neutral-500">
            Career: {careerPoints}/{PROMOTION_POINTS_REQUIRED} pts
          </span>
        </div>
      </div>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm sm:grid-cols-4">
        <div className="flex items-baseline justify-between gap-2 sm:flex-col sm:justify-start">
          <dt className="text-xs uppercase tracking-wide text-neutral-500">Morale</dt>
          <dd className={`font-semibold ${moraleColor(morale)}`}>{morale}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-2 sm:flex-col sm:justify-start">
          <dt className="text-xs uppercase tracking-wide text-neutral-500">Tech debt</dt>
          <dd className={`font-semibold ${debtColor(techDebt)}`}>{techDebt}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-2 sm:flex-col sm:justify-start">
          <dt className="text-xs uppercase tracking-wide text-neutral-500">Quarter SP</dt>
          <dd className="font-semibold">{quarterSp}</dd>
        </div>
        <div className="flex items-baseline justify-between gap-2 sm:flex-col sm:justify-start">
          <dt className="text-xs uppercase tracking-wide text-neutral-500">Incidents</dt>
          <dd className="font-semibold">{quarterIncidents}</dd>
        </div>
      </dl>
    </div>
  )
}
