import { useGameStore } from '../game/store'

// The rare (15%) calibration override, shown between ratings and the boss
// review. The effects already applied; this is the memorable moment.
export function CalibrationDialog() {
  const calibrationEvent = useGameStore((s) => s.calibrationEvent)
  const acknowledgeCalibration = useGameStore((s) => s.acknowledgeCalibration)

  if (!calibrationEvent) return null

  const { direction, reportName } = calibrationEvent

  return (
    <div className="fixed inset-0 z-10 flex items-center justify-center bg-black/50 p-4">
      <div className="flex w-full max-w-sm flex-col gap-3 rounded-lg bg-white p-6 text-left dark:bg-neutral-900">
        <h2 className="text-lg font-semibold">Calibration override</h2>
        {direction === 'down' ? (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            "We can't meet the raise budget this cycle." Upstairs bumped{' '}
            <span className="font-medium text-neutral-900 dark:text-neutral-100">{reportName}</span>
            's EE down to an ME. You get to deliver the news.
          </p>
        ) : (
          <p className="text-sm text-neutral-600 dark:text-neutral-400">
            "Cross-team calibration adjusted this rating."{' '}
            <span className="font-medium text-neutral-900 dark:text-neutral-100">{reportName}</span>
            's ME just became an NI. Nobody in the room voted for it, apparently.
          </p>
        )}
        <button
          type="button"
          onClick={acknowledgeCalibration}
          className="rounded bg-violet-600 px-4 py-2 text-sm font-medium text-white hover:bg-violet-500"
        >
          Deliver the news
        </button>
      </div>
    </div>
  )
}
