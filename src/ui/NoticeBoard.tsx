import { REFACTOR_COST_HOURS } from '../game/constants'
import { useGameStore } from '../game/store'

// Transient messages from the last resolution (trait reveals, quits,
// auto-fires) plus any pending refactor pitch. Cleared when the next sprint
// resolves.
export function NoticeBoard() {
  const notices = useGameStore((s) => s.notices)
  const pendingRefactor = useGameStore((s) => s.pendingRefactor)
  const acceptRefactor = useGameStore((s) => s.acceptRefactor)
  const declineRefactor = useGameStore((s) => s.declineRefactor)

  if (notices.length === 0 && !pendingRefactor) return null

  return (
    <div className="flex w-full flex-col gap-2">
      {notices.length > 0 && (
        <ul className="flex w-full flex-col gap-1 rounded-lg border border-neutral-200 px-4 py-2 text-sm text-neutral-600 dark:border-neutral-800 dark:text-neutral-400">
          {notices.map((notice) => (
            <li key={notice}>{notice}</li>
          ))}
        </ul>
      )}
      {pendingRefactor && (
        <div className="flex w-full flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-300 bg-amber-50 px-4 py-2 text-sm dark:border-amber-900 dark:bg-amber-950">
          <span>
            <span className="font-semibold">{pendingRefactor.reportName}</span> wants to rewrite a
            perfectly fine module "properly this time".
          </span>
          <span className="flex gap-2">
            <button
              type="button"
              onClick={acceptRefactor}
              className="rounded border border-amber-400 px-2 py-0.5 text-xs hover:bg-amber-100 dark:border-amber-800 dark:hover:bg-amber-900"
            >
              Humor them ({REFACTOR_COST_HOURS}h)
            </button>
            <button
              type="button"
              onClick={declineRefactor}
              className="rounded border border-neutral-300 px-2 py-0.5 text-xs hover:bg-neutral-100 dark:border-neutral-700 dark:hover:bg-neutral-800"
            >
              Not this sprint
            </button>
          </span>
        </div>
      )}
    </div>
  )
}
