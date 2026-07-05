import { ACTIVITY_BY_ID, SPRINTS_PER_QUARTER, TEAM_BASE_SP } from './constants'
import { effectiveTimeBudget, rollSprintEvent } from './events'
import { computeQuarterResult } from './quarter'
import { nextInt, nextRandom } from './rng'
import type { ActivityId, GameState, SprintResult } from './save/schema'

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function selectedActivityCost(activities: readonly ActivityId[]): number {
  return activities.reduce((total, id) => total + ACTIVITY_BY_ID[id].cost, 0)
}

// Resolves the current sprint per the spec pseudocode, then advances to the
// next sprint (rolling its event) or into quarter review after sprint 6.
// Pure: all randomness threads through state.rngSeed. RNG call order is
// fixed (incident roll, morale jitter, then next sprint's event roll) so a
// given save replays identically.
export function resolveSprint(state: GameState): GameState {
  const selected = new Set(state.selectedActivities)
  const event = state.currentEvent
  let seed = state.rngSeed

  // Story points
  let sp = TEAM_BASE_SP
  if (!selected.has('planning')) sp *= 0.7
  if (!selected.has('product')) sp -= 4
  if (!selected.has('design')) sp -= 4
  if (!selected.has('unblock')) sp -= 6
  if (selected.has('debtwork')) sp -= 2
  if (event === 'sick') sp -= 3

  // Incidents
  const baseIncidents = Math.floor(state.techDebt / 15)
  const moraleIncident = state.morale < 40 ? 1 : 0
  let incidentRoll: number
  ;[incidentRoll, seed] = nextRandom(seed)
  const rngIncident = incidentRoll < 0.3 ? 1 : 0
  const stormIncident = event === 'storm' ? 2 : 0
  const incidents = baseIncidents + moraleIncident + rngIncident + stormIncident
  const incidentSpCost = selected.has('triage')
    ? Math.max(0, incidents - 2) * 2
    : incidents * 2
  sp -= incidentSpCost

  // Morale multiplier (0.5 to 1.2)
  const moraleMult = 0.5 + (state.morale / 100) * 0.7
  sp = Math.max(0, Math.round(sp * moraleMult))

  // Morale delta
  let moraleDelta = -2 // baseline grind
  moraleDelta += selected.has('ones') ? 4 : -10
  if (!selected.has('triage') && incidents > 0) moraleDelta -= 4
  if (!selected.has('planning')) moraleDelta -= 6
  if (event === 'offsite') moraleDelta += 6
  if (event === 'kudos') moraleDelta += 4
  let moraleJitter: number
  ;[moraleJitter, seed] = nextInt(seed, -2, 2)
  moraleDelta += moraleJitter

  // Tech debt delta
  let techDebtDelta = 5 // baseline growth
  if (!selected.has('reviews')) techDebtDelta += 8
  if (selected.has('debtwork')) techDebtDelta -= 8

  const morale = clamp(state.morale + moraleDelta, 0, 100)
  const techDebt = clamp(state.techDebt + techDebtDelta, 0, 100)

  const result: SprintResult = {
    quarter: state.quarter,
    sprint: state.sprint,
    event,
    activities: [...state.selectedActivities],
    sp,
    incidents,
    incidentSpCost,
    moraleDelta,
    techDebtDelta,
    moraleAfter: morale,
    techDebtAfter: techDebt,
  }

  const resolved: GameState = {
    ...state,
    morale,
    techDebt,
    quarterSp: state.quarterSp + sp,
    quarterIncidents: state.quarterIncidents + incidents,
    totalSpRun: state.totalSpRun + sp,
    sprintHistory: [...state.sprintHistory, result],
    rngSeed: seed,
  }

  if (state.sprint >= SPRINTS_PER_QUARTER) {
    // Quarter over: grade it and wait for the player to acknowledge the
    // review before anything (PIP, promotion, firing) takes effect.
    const quarterResult = computeQuarterResult(resolved)
    return {
      ...resolved,
      phase: 'quarter-review',
      currentEvent: null,
      lastQuarterResult: quarterResult,
    }
  }

  // Advance to the next sprint and roll its event now, so the player sees it
  // while planning.
  let nextEvent
  ;[nextEvent, seed] = rollSprintEvent(seed)

  // DESIGN NOTE: the activity selection carries over between sprints as a
  // convenience (most sprints look alike). If a CEO-demo event shrinks the
  // budget below the carried-over cost, the selection resets so the player
  // re-plans from scratch rather than starting over-budget.
  const carriedSelection =
    selectedActivityCost(state.selectedActivities) <= effectiveTimeBudget(nextEvent)
      ? state.selectedActivities
      : []

  return {
    ...resolved,
    sprint: state.sprint + 1,
    currentEvent: nextEvent,
    selectedActivities: carriedSelection,
    rngSeed: seed,
  }
}
