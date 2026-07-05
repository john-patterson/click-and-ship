import { create } from 'zustand'
import {
  acknowledgeQuarterReview,
  assignDev,
  assignManagerFill,
  holdUnblockTick,
  releaseUnblockHold,
  respondToEvent,
  restartRun,
} from './actions'
import { createInitialGameState, type GameState } from './save/schema'
import { tick } from './tick'

interface GameStore extends GameState {
  hydrate: (state: GameState) => void
  advanceTick: (deltaMs: number) => void
  assignDev: (devId: string, subtaskId: string | null) => void
  assignManagerFill: (subtaskId: string) => void
  holdUnblockTick: (devId: string, deltaMs: number) => void
  releaseUnblockHold: (devId: string) => void
  respondToEvent: (choice: 'approve' | 'deny') => void
  acknowledgeQuarterReview: () => void
  restartRun: () => void
}

// Only the GameState-shaped fields, never the action closures above - keeps
// the pure src/game/ functions (tick, actions) operating on plain,
// JSON-serializable state, and is what gets persisted to a save file.
function extractGameState(store: GameStore): GameState {
  return {
    team: store.team,
    project: store.project,
    managerTimeBudget: store.managerTimeBudget,
    managerTimeBudgetMax: store.managerTimeBudgetMax,
    sprint: store.sprint,
    quarter: store.quarter,
    sprintElapsedMs: store.sprintElapsedMs,
    eventLog: store.eventLog,
    pendingEvent: store.pendingEvent,
    rngSeed: store.rngSeed,
    phase: store.phase,
    lastQuarterResult: store.lastQuarterResult,
    runNumber: store.runNumber,
    subtasksCompletedThisQuarter: store.subtasksCompletedThisQuarter,
    incidentsThisQuarter: store.incidentsThisQuarter,
    managerFillSpendThisQuarter: store.managerFillSpendThisQuarter,
  }
}

export const useGameStore = create<GameStore>((set) => ({
  ...createInitialGameState(),
  hydrate: (state) => set(state),
  advanceTick: (deltaMs) => set((s) => tick(extractGameState(s), deltaMs)),
  assignDev: (devId, subtaskId) => set((s) => assignDev(extractGameState(s), devId, subtaskId)),
  assignManagerFill: (subtaskId) => set((s) => assignManagerFill(extractGameState(s), subtaskId)),
  holdUnblockTick: (devId, deltaMs) =>
    set((s) => holdUnblockTick(extractGameState(s), devId, deltaMs)),
  releaseUnblockHold: (devId) => set((s) => releaseUnblockHold(extractGameState(s), devId)),
  respondToEvent: (choice) => set((s) => respondToEvent(extractGameState(s), choice)),
  acknowledgeQuarterReview: () => set((s) => acknowledgeQuarterReview(extractGameState(s))),
  restartRun: () => set((s) => restartRun(extractGameState(s))),
}))

export function getGameState(): GameState {
  return extractGameState(useGameStore.getState())
}
