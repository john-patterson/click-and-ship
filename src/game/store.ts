import { create } from 'zustand'
import { CLICK_VALUE } from './constants'
import { createInitialGameState, type GameState } from './save/schema'

interface GameStore extends GameState {
  increment: () => void
  hydrate: (state: GameState) => void
}

export const useGameStore = create<GameStore>((set) => ({
  ...createInitialGameState(),
  increment: () => set((s) => ({ clicks: s.clicks + CLICK_VALUE })),
  hydrate: (state) => set(state),
}))

export function getGameState(): GameState {
  const { clicks } = useGameStore.getState()
  return { clicks }
}
