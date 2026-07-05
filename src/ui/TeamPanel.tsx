import { useEffect, useRef } from 'react'
import { specializationLabel } from '../game/labels'
import { useGameStore } from '../game/store'

const HOLD_TICK_MS = 50

export function TeamPanel() {
  const team = useGameStore((s) => s.team)
  const subtasks = useGameStore((s) => s.project.subtasks)
  const assignDev = useGameStore((s) => s.assignDev)
  const holdUnblockTick = useGameStore((s) => s.holdUnblockTick)
  const releaseUnblockHold = useGameStore((s) => s.releaseUnblockHold)

  return (
    <div className="flex flex-col gap-3 rounded-lg border border-neutral-200 p-4 dark:border-neutral-800">
      <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-500">Team</h2>
      {team.map((dev) => {
        const takenBySomeoneElse = (subtaskId: string) =>
          team.some((m) => m.id !== dev.id && m.assignedSubtaskId === subtaskId)

        return (
          <div
            key={dev.id}
            className="flex flex-col gap-2 rounded border border-neutral-200 p-3 dark:border-neutral-800"
          >
            <div className="flex items-center justify-between gap-2">
              <span className="font-medium">{dev.name}</span>
              <span className="text-xs uppercase text-neutral-500">{dev.archetype}</span>
            </div>
            <select
              value={dev.assignedSubtaskId ?? ''}
              onChange={(e) => assignDev(dev.id, e.target.value || null)}
              className="rounded border border-neutral-300 bg-transparent px-2 py-1 text-sm dark:border-neutral-700"
            >
              <option value="">Idle</option>
              {subtasks.map((t) => (
                <option key={t.id} value={t.id} disabled={takenBySomeoneElse(t.id)}>
                  {specializationLabel[t.specialization]}
                  {t.done ? ' (done)' : ''}
                </option>
              ))}
            </select>
            {dev.blocked && (
              <UnblockButton
                devId={dev.id}
                progress={dev.unblockHoldProgress}
                onHoldTick={holdUnblockTick}
                onRelease={releaseUnblockHold}
              />
            )}
          </div>
        )
      })}
    </div>
  )
}

function UnblockButton({
  devId,
  progress,
  onHoldTick,
  onRelease,
}: {
  devId: string
  progress: number
  onHoldTick: (devId: string, deltaMs: number) => void
  onRelease: (devId: string) => void
}) {
  const intervalRef = useRef<number | null>(null)

  useEffect(() => {
    return () => {
      if (intervalRef.current !== null) window.clearInterval(intervalRef.current)
    }
  }, [])

  const start = () => {
    if (intervalRef.current !== null) return
    intervalRef.current = window.setInterval(() => onHoldTick(devId, HOLD_TICK_MS), HOLD_TICK_MS)
  }

  const stop = () => {
    if (intervalRef.current !== null) {
      window.clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    onRelease(devId)
  }

  return (
    <button
      type="button"
      onPointerDown={start}
      onPointerUp={stop}
      onPointerLeave={stop}
      className="relative overflow-hidden rounded bg-amber-600 px-3 py-1.5 text-sm text-white select-none"
    >
      <span
        className="absolute inset-y-0 left-0 bg-amber-800/60"
        style={{ width: `${Math.min(100, progress * 100)}%` }}
      />
      <span className="relative">Hold to unblock</span>
    </button>
  )
}
