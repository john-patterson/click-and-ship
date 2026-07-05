import { ACTIVITY_BY_ID } from './constants'
import { effectiveTimeBudget } from './events'
import { applyQuarterOutcome } from './quarter'
import { createRngSeed } from './rng'
import { createInitialGameState, type ActivityId, type GameState } from './save/schema'
import { resolveSprint, selectedActivityCost } from './sprint'

// Named action: 'sprint:allocate'. Toggles one activity in the sprint plan.
// Selecting is rejected when it would blow the (event-adjusted) time budget,
// so the plan on screen is always runnable.
export function toggleActivity(state: GameState, activityId: ActivityId): GameState {
  if (state.phase !== 'planning') return state

  if (state.selectedActivities.includes(activityId)) {
    return {
      ...state,
      selectedActivities: state.selectedActivities.filter((id) => id !== activityId),
    }
  }

  const cost = selectedActivityCost(state.selectedActivities) + ACTIVITY_BY_ID[activityId].cost
  if (cost > effectiveTimeBudget(state.currentEvent)) return state

  return { ...state, selectedActivities: [...state.selectedActivities, activityId] }
}

// Named action: 'sprint:run'. Resolves the current sprint.
export function runSprint(state: GameState): GameState {
  if (state.phase !== 'planning') return state
  // toggleActivity already enforces the budget; this guards imported saves.
  if (selectedActivityCost(state.selectedActivities) > effectiveTimeBudget(state.currentEvent)) {
    return state
  }
  return resolveSprint(state)
}

// Named action: 'quarter:end'. Acknowledges the quarter review and applies
// its outcome (next quarter, PIP transition, or run over).
export function endQuarter(state: GameState): GameState {
  return applyQuarterOutcome(state)
}

// Named action: 'run:restart'. Starts a fresh run with a new seed.
export function restartRun(state: GameState): GameState {
  return createInitialGameState(state.runNumber + 1, createRngSeed())
}
