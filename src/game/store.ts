import { create } from 'zustand'
import { logAction } from './actionBuffer'
import { endQuarter, restartRun, runSprint, toggleActivity } from './actions'
import { createInitialGameState, type ActivityId, type GameState } from './save/schema'

// Thin Zustand bridge: every mutation goes through a named action (logged to
// the in-memory action buffer) and a pure reducer from src/game/.

interface GameStore extends GameState {
  hydrate: (state: GameState) => void
  toggleActivity: (activityId: ActivityId) => void
  runSprint: () => void
  endQuarter: () => void
  restartRun: () => void
}

// Only the GameState-shaped fields, never the action closures above — keeps
// the pure src/game/ reducers operating on plain, JSON-serializable state,
// and is what gets persisted to a save file.
function extractGameState(store: GameStore): GameState {
  return {
    quarter: store.quarter,
    sprint: store.sprint,
    morale: store.morale,
    techDebt: store.techDebt,
    careerPoints: store.careerPoints,
    selectedActivities: store.selectedActivities,
    currentEvent: store.currentEvent,
    quarterSp: store.quarterSp,
    quarterIncidents: store.quarterIncidents,
    sprintHistory: store.sprintHistory,
    lastQuarterResult: store.lastQuarterResult,
    onPip: store.onPip,
    consecutiveDs: store.consecutiveDs,
    gradeHistory: store.gradeHistory,
    totalSpRun: store.totalSpRun,
    rngSeed: store.rngSeed,
    phase: store.phase,
    runOverReason: store.runOverReason,
    runNumber: store.runNumber,
  }
}

export const useGameStore = create<GameStore>((set) => {
  const dispatch = (action: string, reducer: (state: GameState) => GameState, payload?: unknown) =>
    set((store) => {
      logAction(action, payload)
      return reducer(extractGameState(store))
    })

  return {
    ...createInitialGameState(),
    hydrate: (state) => dispatch('save:hydrate', () => state),
    toggleActivity: (activityId) =>
      dispatch('sprint:allocate', (s) => toggleActivity(s, activityId), { activityId }),
    runSprint: () => dispatch('sprint:run', runSprint),
    endQuarter: () => dispatch('quarter:end', endQuarter),
    restartRun: () => dispatch('run:restart', restartRun),
  }
})

export function getGameState(): GameState {
  return extractGameState(useGameStore.getState())
}
