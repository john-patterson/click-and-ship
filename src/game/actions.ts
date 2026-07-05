import { REFACTOR_COST_HOURS } from './constants'
import { availableHours } from './events'
import { applyQuarterOutcome } from './quarter'
import { createRngSeed } from './rng'
import { createInitialGameState, type ActivityId, type GameState } from './save/schema'
import { resolveSprint } from './sprint'
import { activityCost, selectedActivityCost } from './team'

// Named action: 'sprint:allocate'. Toggles one activity in the sprint plan.
// Selecting is rejected when it would blow the (event- and commitment-
// adjusted) time budget, so the plan on screen is always runnable.
export function toggleActivity(state: GameState, activityId: ActivityId): GameState {
  if (state.phase !== 'planning') return state

  if (state.selectedActivities.includes(activityId)) {
    return {
      ...state,
      selectedActivities: state.selectedActivities.filter((id) => id !== activityId),
    }
  }

  const cost =
    selectedActivityCost(state.selectedActivities, state.reports) +
    activityCost(activityId, state.reports)
  if (cost > availableHours(state)) return state

  return { ...state, selectedActivities: [...state.selectedActivities, activityId] }
}

// Named action: 'sprint:run'. Resolves the current sprint.
export function runSprint(state: GameState): GameState {
  if (state.phase !== 'planning') return state
  // toggleActivity already enforces the budget; this guards imported saves.
  if (selectedActivityCost(state.selectedActivities, state.reports) > availableHours(state)) {
    return state
  }
  return resolveSprint(state)
}

// Named action: 'quarter:end'. Acknowledges the boss review and applies its
// outcome (promotion decisions, ceremony, next quarter, or run over).
export function endQuarter(state: GameState): GameState {
  return applyQuarterOutcome(state)
}

// Named action: 'refactor:accept'. A refactor-addict's pet project: costs
// hours, does nothing.
export function acceptRefactor(state: GameState): GameState {
  if (state.phase !== 'planning' || !state.pendingRefactor) return state
  const selectedCost = selectedActivityCost(state.selectedActivities, state.reports)
  if (selectedCost + REFACTOR_COST_HOURS > availableHours(state)) return state
  return {
    ...state,
    committedHours: state.committedHours + REFACTOR_COST_HOURS,
    pendingRefactor: null,
  }
}

// Named action: 'refactor:decline'.
// DESIGN NOTE: declining is free in this phase; the social cost of shooting
// down pet projects belongs to a later political-capital pass.
export function declineRefactor(state: GameState): GameState {
  if (!state.pendingRefactor) return state
  return { ...state, pendingRefactor: null }
}

// Named action: 'run:restart'. Starts a fresh run with a new seed. Meta-
// progression is the one thing that survives between careers.
export function restartRun(state: GameState): GameState {
  return createInitialGameState(state.runNumber + 1, createRngSeed(), {
    ...state.metaProgression,
    careerCount: state.metaProgression.careerCount + 1,
  })
}
