import { CEO_EVENT_BUDGET_PENALTY, MANAGER_TIME_BUDGET, SPRINT_EVENTS } from './constants'
import { nextInt } from './rng'
import type { SprintEventId } from './save/schema'

// Uniform roll over the event pool. Called at the start of sprints 2-6
// (sprint 1 never has an event) so the player can plan around the result.
export function rollSprintEvent(seed: number): [SprintEventId, number] {
  const [index, nextSeed] = nextInt(seed, 0, SPRINT_EVENTS.length - 1)
  return [SPRINT_EVENTS[index].id, nextSeed]
}

// The CEO demo event eats manager hours before planning even starts; every
// other event leaves the budget alone.
export function effectiveTimeBudget(event: SprintEventId | null): number {
  return MANAGER_TIME_BUDGET - (event === 'ceo' ? CEO_EVENT_BUDGET_PENALTY : 0)
}

// Hours left for activities after event penalties and one-off commitments
// (hires, accepted refactors, promo case prep).
export function availableHours(state: {
  currentEvent: SprintEventId | null
  committedHours: number
}): number {
  return effectiveTimeBudget(state.currentEvent) - state.committedHours
}
