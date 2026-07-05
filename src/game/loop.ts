import { TICK_INTERVAL_MS } from './constants'
import { useGameStore } from './store'

// Drives real-time sprint/quarter progression and event rolls. Player
// actions (assignments, manager-fill, unblock holds, event responses) are
// applied instantly elsewhere and take effect on the next tick.
export function startGameLoop(intervalMs = TICK_INTERVAL_MS): () => void {
  let last = performance.now()
  const id = setInterval(() => {
    const now = performance.now()
    const deltaMs = now - last
    last = now
    useGameStore.getState().advanceTick(deltaMs)
  }, intervalMs)

  return () => clearInterval(id)
}
