import type { GameState } from './save/schema'

// TODO: implement the real tick loop once game mechanics are designed.
// Intended to be called on a rAF/interval loop with the elapsed time (ms)
// since the last tick, and to return the next state.
export function tick(state: GameState, _deltaMs: number): GameState {
  return state
}
