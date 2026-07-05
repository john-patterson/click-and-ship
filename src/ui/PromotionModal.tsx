import { PROMO_POLITICAL_CAPITAL_COST } from '../game/constants'
import { promotionTarget } from '../game/promotion'
import { useGameStore } from '../game/store'

// One promotion case at a time, from the end-of-quarter queue.
export function PromotionModal() {
  const promotionQueue = useGameStore((s) => s.promotionQueue)
  const reports = useGameStore((s) => s.reports)
  const politicalCapital = useGameStore((s) => s.politicalCapital)
  const decidePromotion = useGameStore((s) => s.decidePromotion)

  const report = reports.find((r) => r.id === promotionQueue[0])
  if (!report) return null

  const target = promotionTarget(report.role)
  const canApprove = politicalCapital >= PROMO_POLITICAL_CAPITAL_COST
  const willQuitOnDefer = report.deferredPromotions >= 1

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/50 p-4">
      <div className="flex w-full max-w-sm flex-col gap-3 rounded-lg bg-white p-6 text-left dark:bg-neutral-900">
        <h2 className="text-lg font-semibold">Promotion case: {report.name}</h2>
        <p className="text-sm text-neutral-600 dark:text-neutral-400">
          {report.name} has the ratings for {report.role} → {target}. Your call.
        </p>
        {willQuitOnDefer && (
          <p className="text-sm text-amber-600 dark:text-amber-400">
            You already promised "next cycle" once. There won't be a third conversation.
          </p>
        )}

        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={() => decidePromotion('approve')}
            disabled={!canApprove}
            title={canApprove ? undefined : 'No political capital left'}
            className="rounded bg-emerald-600 px-4 py-2 text-sm font-medium text-white hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Approve — 4h prep next quarter, 1 political capital
          </button>
          <button
            type="button"
            onClick={() => decidePromotion('defer')}
            className="rounded border border-neutral-300 px-4 py-2 text-sm hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
          >
            Defer — "next cycle, I promise"
          </button>
          <button
            type="button"
            onClick={() => decidePromotion('deny')}
            className="rounded border border-red-300 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:border-red-900 dark:text-red-400 dark:hover:bg-red-950"
          >
            Deny — −10 morale, flight risk until their next EE
          </button>
        </div>
      </div>
    </div>
  )
}
