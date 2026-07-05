export const CURRENT_SAVE_VERSION = 1

export interface GameState {
  clicks: number
}

export interface SaveFileV1 {
  version: 1
  state: GameState
  lastSaveTimestamp: number
}

// Union this with SaveFileV2, SaveFileV3, etc. as the schema evolves.
export type SaveFile = SaveFileV1

export function createInitialGameState(): GameState {
  return { clicks: 0 }
}
