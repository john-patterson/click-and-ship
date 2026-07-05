import { useGameStore } from '../game/store'

export function ClickerButton() {
  const clicks = useGameStore((s) => s.clicks)
  const increment = useGameStore((s) => s.increment)

  return (
    <div className="flex flex-col items-center gap-4">
      <button
        type="button"
        onClick={increment}
        className="rounded-lg bg-violet-600 px-6 py-3 text-lg font-medium text-white transition hover:bg-violet-500 active:scale-95"
      >
        Ship it
      </button>
      <p className="text-sm text-neutral-500 dark:text-neutral-400">
        Clicks: <span className="font-mono text-neutral-900 dark:text-neutral-100">{clicks}</span>
      </p>
    </div>
  )
}
