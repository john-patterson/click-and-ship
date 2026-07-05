import { useState } from 'react'
import { curvedReports, ratingQuotas, validateRatings } from '../game/reviews'
import type { Rating } from '../game/save/schema'
import { useGameStore } from '../game/store'

const RATING_OPTIONS: readonly Rating[] = ['EE', 'ME', 'NI']

const RATING_STYLES: Record<Rating, string> = {
  EE: 'border-emerald-500 bg-emerald-50 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300',
  ME: 'border-sky-500 bg-sky-50 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  NI: 'border-red-500 bg-red-50 text-red-700 dark:bg-red-950 dark:text-red-300',
}

// End-of-quarter forced-curve rating screen. Submission stays disabled until
// the quotas are met exactly — there is no skip.
export function RatingModal() {
  const quarter = useGameStore((s) => s.quarter)
  const reports = useGameStore((s) => s.reports)
  const submitRatings = useGameStore((s) => s.submitRatings)
  const [picks, setPicks] = useState<Record<string, Rating>>({})

  const state = useGameStore.getState()
  const curved = curvedReports(state)
  const quotas = ratingQuotas(curved.length)
  const error = validateRatings(state, picks)

  const count = (rating: Rating) =>
    curved.filter((report) => picks[report.id] === rating).length

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/50 p-4">
      <div className="flex max-h-full w-full max-w-md flex-col gap-3 overflow-y-auto rounded-lg bg-white p-6 text-left dark:bg-neutral-900">
        <h2 className="text-lg font-semibold">Quarter {quarter} — Rate your team</h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          HR runs a forced curve. Someone gets the short straw.
        </p>

        <div className="flex gap-3 text-sm tabular-nums">
          <span className={count('EE') === quotas.nEE ? 'text-emerald-600 dark:text-emerald-400' : ''}>
            EE {count('EE')}/{quotas.nEE}
          </span>
          <span className={count('ME') === quotas.nME ? 'text-emerald-600 dark:text-emerald-400' : ''}>
            ME {count('ME')}/{quotas.nME}
          </span>
          <span className={count('NI') === quotas.nNI ? 'text-emerald-600 dark:text-emerald-400' : ''}>
            NI {count('NI')}/{quotas.nNI}
          </span>
        </div>

        <ul className="flex flex-col gap-2">
          {reports.map((report) => (
            <li key={report.id} className="flex items-center justify-between gap-2">
              <span className="text-sm">
                <span className="font-medium">{report.name}</span>{' '}
                <span className="text-neutral-500">— {report.role}</span>
              </span>
              {report.onSoftPIP ? (
                <span className="rounded border border-red-500 bg-red-50 px-2 py-1 text-xs font-semibold text-red-700 dark:bg-red-950 dark:text-red-300">
                  NI (on PIP)
                </span>
              ) : (
                <div className="flex gap-1">
                  {RATING_OPTIONS.map((rating) => (
                    <button
                      key={rating}
                      type="button"
                      aria-pressed={picks[report.id] === rating}
                      onClick={() => setPicks({ ...picks, [report.id]: rating })}
                      className={`rounded border px-2 py-1 text-xs font-semibold transition-colors ${
                        picks[report.id] === rating
                          ? RATING_STYLES[rating]
                          : 'border-neutral-300 text-neutral-500 hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800'
                      }`}
                    >
                      {rating}
                    </button>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>

        <p className="text-xs text-neutral-500">
          EE: +10 morale, a raise (+2h 1:1s/sprint). NI: −8 morale, one step from the door.
        </p>

        <button
          type="button"
          onClick={() => submitRatings(picks)}
          disabled={error !== null}
          className="rounded bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          {error ?? 'Submit ratings'}
        </button>
      </div>
    </div>
  )
}
