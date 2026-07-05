import { GOOD_TRAITS, TRAIT_LABELS } from '../game/constants'
import { useGameStore } from '../game/store'
import { effectiveSalaryHours, isRamping, isWorking, teamBaseSp } from '../game/team'
import type { Report } from '../game/save/schema'

const RATING_COLORS = {
  EE: 'text-emerald-600 dark:text-emerald-400',
  ME: 'text-neutral-500',
  NI: 'text-red-600 dark:text-red-400',
} as const

function statusBadge(report: Report): { label: string; className: string } | null {
  if (!isWorking(report)) return { label: 'starts next sprint', className: 'text-sky-600 dark:text-sky-400' }
  if (isRamping(report)) return { label: 'ramping (50%)', className: 'text-sky-600 dark:text-sky-400' }
  if (report.onSoftPIP) return { label: 'on PIP', className: 'text-red-600 dark:text-red-400' }
  if (report.promotionDenied) return { label: 'passed over', className: 'text-amber-600 dark:text-amber-400' }
  return null
}

export function TeamPanel() {
  const reports = useGameStore((s) => s.reports)
  const politicalCapital = useGameStore((s) => s.politicalCapital)
  const phase = useGameStore((s) => s.phase)
  const fireReport = useGameStore((s) => s.fireReport)

  const baseline = Math.round(teamBaseSp(reports) * 10) / 10

  return (
    <div className="flex w-full flex-col gap-2 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Team</h2>
      {reports.length === 0 && (
        <p className="text-sm text-neutral-500">Nobody left. Managers without teams don't stay managers.</p>
      )}
      <ul className="flex flex-col gap-2 text-sm">
        {reports.map((report) => {
          const badge = statusBadge(report)
          const canFire = report.onSoftPIP || politicalCapital > 0
          const salary = effectiveSalaryHours(report)
          return (
            <li key={report.id} className="flex flex-col gap-0.5 border-b border-neutral-100 pb-2 last:border-b-0 last:pb-0 dark:border-neutral-800/60">
              <div className="flex items-baseline justify-between gap-2">
                <span>
                  <span className="font-medium">{report.name}</span>{' '}
                  <span className="text-neutral-500">
                    — {report.role}
                    {report.spec ? ` (${report.spec})` : ''}
                  </span>
                </span>
                <span className="tabular-nums text-neutral-500">{report.baseSp} SP</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-neutral-500">
                <span className="tabular-nums">morale {report.morale}</span>
                {salary > 0 && <span className="tabular-nums">+{salary}h 1:1s</span>}
                {report.ratingHistory.length > 0 && (
                  <span className="tabular-nums">
                    {report.ratingHistory.slice(-6).map((entry, index) => (
                      <span key={`${entry.quarter}-${index}`} className={RATING_COLORS[entry.rating]}>
                        {index > 0 && '·'}
                        {entry.rating}
                      </span>
                    ))}
                  </span>
                )}
                {report.traitsRevealed &&
                  report.hiddenTraits.map((trait) => (
                    <span
                      key={trait}
                      className={`rounded border px-1 ${
                        (GOOD_TRAITS as readonly string[]).includes(trait)
                          ? 'border-emerald-300 text-emerald-600 dark:border-emerald-900 dark:text-emerald-400'
                          : 'border-amber-300 text-amber-600 dark:border-amber-900 dark:text-amber-400'
                      }`}
                    >
                      {TRAIT_LABELS[trait]}
                    </span>
                  ))}
                {!report.traitsRevealed && report.hiddenTraits.length > 0 && (
                  <span className="rounded border border-neutral-300 px-1 dark:border-neutral-700">traits: ?</span>
                )}
                {badge && <span className={badge.className}>{badge.label}</span>}
                {phase === 'planning' && (
                  <button
                    type="button"
                    onClick={() => fireReport(report.id)}
                    disabled={!canFire}
                    title={
                      canFire
                        ? report.onSoftPIP
                          ? 'With cause (on PIP): free'
                          : 'Without cause: costs 1 political capital'
                        : 'No political capital to fire without cause'
                    }
                    className="ml-auto rounded border border-red-300 px-1.5 py-0.5 text-red-600 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-40 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
                  >
                    Let go
                  </button>
                )}
              </div>
            </li>
          )
        })}
      </ul>
      <p className="border-t border-neutral-200 pt-2 text-xs text-neutral-500 dark:border-neutral-800">
        Baseline {baseline} SP/sprint. Product and design are uncovered — someone (you) has to
        fill those gaps.
      </p>
    </div>
  )
}
