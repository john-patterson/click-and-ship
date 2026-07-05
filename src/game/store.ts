import { create } from 'zustand'
import { createInitialGameState, type GameState } from './save/schema'

interface GameStore extends GameState {
  hydrate: (state: GameState) => void
}

export const useGameStore = create<GameStore>((set) => ({
  ...createInitialGameState(),
  hydrate: (state) => set(state),
}))

export function getGameState(): GameState {
  const { hydrate, ...state } = useGameStore.getState()
  void hydrate
  return state
}
