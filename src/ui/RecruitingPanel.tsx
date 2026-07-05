import { HEADCOUNT_CAP_IC } from '../game/constants'
import { availableHours } from '../game/events'
import { atHeadcountCap } from '../game/recruiting'
import { useGameStore } from '../game/store'
import { selectedActivityCost } from '../game/team'

export function RecruitingPanel() {
  const candidatePool = useGameStore((s) => s.candidatePool)
  const reports = useGameStore((s) => s.reports)
  const quarter = useGameStore((s) => s.quarter)
  const phase = useGameStore((s) => s.phase)
  const selectedActivities = useGameStore((s) => s.selectedActivities)
  const committedHours = useGameStore((s) => s.committedHours)
  const currentEvent = useGameStore((s) => s.currentEvent)
  const hireCandidate = useGameStore((s) => s.hireCandidate)

  const state = useGameStore.getState()
  const atCap = atHeadcountCap(state)
  const hoursLeft =
    availableHours({ currentEvent, committedHours }) -
    selectedActivityCost(selectedActivities, reports)

  return (
    <div className="flex w-full flex-col gap-2 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <div className="flex items-baseline justify-between">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          Recruiting
        </h2>
        <span className="text-xs tabular-nums text-neutral-500">
          {reports.length}/{HEADCOUNT_CAP_IC} headcount
        </span>
      </div>

      {candidatePool.length === 0 ? (
        <p className="text-sm text-neutral-500">
          The pipeline is empty. Run the "Interview candidate" activity to source someone.
        </p>
      ) : (
        <ul className="flex flex-col gap-2 text-sm">
          {candidatePool.map((candidate) => {
            const quartersLeft = candidate.expiresAtEndOfQuarter - quarter + 1
            const tooExpensive = hoursLeft < candidate.hiringCost
            const disabled = phase !== 'planning' || atCap || tooExpensive
            return (
              <li
                key={candidate.id}
                className="flex flex-col gap-1 rounded border border-neutral-200 p-2 dark:border-neutral-800"
              >
                <div className="flex items-baseline justify-between gap-2">
                  <span>
                    <span className="font-medium">{candidate.name}</span>{' '}
                    <span className="text-neutral-500">
                      — {candidate.role}
                      {candidate.spec ? ` (${candidate.spec})` : ''}
                    </span>
                  </span>
                  <span className="tabular-nums text-neutral-500">{candidate.baseSp} SP</span>
                </div>
                <div className="flex flex-wrap items-center gap-x-2 text-xs text-neutral-500">
                  <span className="tabular-nums">+{candidate.salaryHours}h 1:1s</span>
                  <span className="rounded border border-neutral-300 px-1 dark:border-neutral-700">
                    hidden traits: ?
                  </span>
                  <span className={quartersLeft <= 1 ? 'text-amber-600 dark:text-amber-400' : ''}>
                    {quartersLeft <= 1 ? 'leaving the market this quarter' : `${quartersLeft} quarters left`}
                  </span>
                  <button
                    type="button"
                    onClick={() => hireCandidate(candidate.id)}
                    disabled={disabled}
                    title={
                      atCap
                        ? 'You need to fire someone or wait for promotion'
                        : tooExpensive
                          ? `Hiring needs ${candidate.hiringCost}h free this sprint`
                          : `Costs ${candidate.hiringCost}h this sprint; joins next sprint`
                    }
                    className="ml-auto rounded bg-sky-600 px-2 py-0.5 font-medium text-white hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    Hire ({candidate.hiringCost}h)
                  </button>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <p className="border-t border-neutral-200 pt-2 text-xs text-neutral-500 dark:border-neutral-800">
        New hires join next sprint at 50% capacity. Whatever they're really like shows up a
        sprint after that.
      </p>
    </div>
  )
}
