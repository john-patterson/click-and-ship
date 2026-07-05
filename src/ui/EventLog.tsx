import type { EventLogKind } from '../game/save/schema'
import { useGameStore } from '../game/store'

const kindColor: Record<EventLogKind, string> = {
  info: 'text-neutral-500 dark:text-neutral-400',
  warning: 'text-amber-600 dark:text-amber-400',
  success: 'text-emerald-600 dark:text-emerald-400',
  danger: 'text-red-600 dark:text-red-400',
}

export function EventLog() {
  const eventLog = useGameStore((s) => s.eventLog)

  return (
    <div className="flex w-full max-w-md flex-col gap-1 rounded-lg border border-neutral-200 p-4 text-left dark:border-neutral-800">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Event log</h2>
      <ul className="flex max-h-48 flex-col gap-1 overflow-y-auto text-sm">
        {eventLog.length === 0 && <li className="text-neutral-500">Nothing yet.</li>}
        {eventLog.map((entry) => (
          <li key={entry.id} className={kindColor[entry.kind]}>
            <span className="text-neutral-400">
              Q{entry.quarter} S{entry.sprint}
            </span>{' '}
            {entry.message}
          </li>
        ))}
      </ul>
    </div>
  )
}
