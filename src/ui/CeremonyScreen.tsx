import { useState } from 'react'
import { TIER_TITLES } from '../game/constants'
import type { LegacyPick } from '../game/promotion'
import { useGameStore } from '../game/store'

type PickType = LegacyPick['type']

// Full-screen promotion ceremony: title change, boss flavor, legacy pick.
export function CeremonyScreen() {
  const reports = useGameStore((s) => s.reports)
  const pickLegacy = useGameStore((s) => s.pickLegacy)
  const [pickType, setPickType] = useState<PickType | null>(null)
  const [allyId, setAllyId] = useState<string | null>(null)

  const canConfirm = pickType !== null && (pickType !== 'ally' || allyId !== null)

  const confirm = () => {
    if (pickType === 'ally' && allyId) pickLegacy({ type: 'ally', reportId: allyId })
    else if (pickType === 'capital') pickLegacy({ type: 'capital' })
    else if (pickType === 'reputation') pickLegacy({ type: 'reputation' })
  }

  const optionClass = (selected: boolean) =>
    `flex w-full flex-col gap-1 rounded-lg border p-4 text-left transition-colors ${
      selected
        ? 'border-violet-500 bg-violet-50 dark:border-violet-600 dark:bg-violet-950'
        : 'border-neutral-200 hover:bg-neutral-50 dark:border-neutral-800 dark:hover:bg-neutral-900'
    }`

  return (
    <div className="flex w-full max-w-md flex-col gap-4 rounded-lg border border-violet-300 p-6 text-left dark:border-violet-900">
      <div>
        <p className="text-xs uppercase tracking-wide text-violet-600 dark:text-violet-400">
          Promotion
        </p>
        <h2 className="text-2xl font-bold">
          {TIER_TITLES.IC} → {TIER_TITLES.MoM}
        </h2>
      </div>
      <p className="text-sm text-neutral-600 dark:text-neutral-400">
        "Six points of sustained impact. The org is restructuring around you — three teams,
        three managers, all yours. Don't make me regret this." Your boss almost smiles.
      </p>
      <p className="text-sm font-medium">Take one thing with you:</p>

      <div className="flex flex-col gap-2">
        <button type="button" onClick={() => setPickType('ally')} className={optionClass(pickType === 'ally')} disabled={reports.length === 0}>
          <span className="text-sm font-semibold">Bring an ally</span>
          <span className="text-xs text-neutral-500">
            One report follows you up as a manager on your new team (+2 loyalty).
          </span>
          {pickType === 'ally' && (
            <span className="mt-1 flex flex-wrap gap-1">
              {reports.map((report) => (
                <span
                  key={report.id}
                  role="button"
                  tabIndex={0}
                  onClick={(e) => {
                    e.stopPropagation()
                    setAllyId(report.id)
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') setAllyId(report.id)
                  }}
                  className={`cursor-pointer rounded border px-2 py-0.5 text-xs ${
                    allyId === report.id
                      ? 'border-violet-500 bg-violet-100 font-semibold dark:bg-violet-900'
                      : 'border-neutral-300 dark:border-neutral-700'
                  }`}
                >
                  {report.name}
                </span>
              ))}
            </span>
          )}
        </button>
        <button type="button" onClick={() => setPickType('capital')} className={optionClass(pickType === 'capital')}>
          <span className="text-sm font-semibold">Cash in goodwill</span>
          <span className="text-xs text-neutral-500">+3 political capital heading into the new tier.</span>
        </button>
        <button type="button" onClick={() => setPickType('reputation')} className={optionClass(pickType === 'reputation')}>
          <span className="text-sm font-semibold">Ride the reputation</span>
          <span className="text-xs text-neutral-500">
            Your first quarter at the new tier gets +1 to its boss grade.
          </span>
        </button>
      </div>

      <button
        type="button"
        onClick={confirm}
        disabled={!canConfirm}
        className="rounded bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500 disabled:cursor-not-allowed disabled:opacity-40"
      >
        Accept the promotion
      </button>
    </div>
  )
}
