import { describe, expect, it } from 'vitest'
import { nextInt, nextRandom } from './rng'
import { createInitialGameState, type ActivityId, type GameState } from './save/schema'
import { resolveSprint, selectedActivityCost } from './sprint'

// A 40h plan covering everything except interview/debtwork:
// 4 + 8 + 4 + 4 + 8 + 8 + 4 = 40.
const FULL_PLAN: ActivityId[] = [
  'planning',
  'ones',
  'reviews',
  'unblock',
  'product',
  'design',
  'triage',
]

function baseState(overrides: Partial<GameState> = {}): GameState {
  return { ...createInitialGameState(1, 42), ...overrides }
}

// The default roster carries no extra salary hours, so costs match Phase 1.
const REPORTS = createInitialGameState(1, 42).reports

// Replays the two in-sprint RNG calls (incident roll, then morale jitter) so
// tests can compute expected values without duplicating game logic.
function sprintRolls(seed: number) {
  const [incidentRoll, s1] = nextRandom(seed)
  const [jitter] = nextInt(s1, -2, 2)
  return { rngIncident: incidentRoll < 0.3 ? 1 : 0, jitter }
}

describe('selectedActivityCost', () => {
  it('sums activity hour costs', () => {
    expect(selectedActivityCost([], REPORTS)).toBe(0)
    expect(selectedActivityCost(['planning', 'ones'], REPORTS)).toBe(12)
    expect(selectedActivityCost(FULL_PLAN, REPORTS)).toBe(40)
  })

  it('adds report salary hours to the 1:1 cost', () => {
    const raised = REPORTS.map((r, i) => (i === 0 ? { ...r, salaryHours: 2 } : r))
    expect(selectedActivityCost(['ones'], raised)).toBe(10)
    expect(selectedActivityCost(['planning'], raised)).toBe(4)
  })
})

describe('resolveSprint', () => {
  it('is deterministic: the same state resolves identically', () => {
    const state = baseState({ selectedActivities: FULL_PLAN })
    expect(resolveSprint(state)).toEqual(resolveSprint(state))
  })

  it('resolves a fully-covered starting sprint at spec baseline numbers', () => {
    const state = baseState({ selectedActivities: FULL_PLAN })
    const { rngIncident, jitter } = sprintRolls(state.rngSeed)

    const next = resolveSprint(state)
    const result = next.sprintHistory[0]

    // sp = 18, no skip penalties; morale mult at 70 = 0.99 -> rounds back to 18.
    // Base incidents floor(20/15)=1, plus the rng roll; triage absorbs both.
    expect(result.incidents).toBe(1 + rngIncident)
    expect(result.incidentSpCost).toBe(0)
    expect(result.sp).toBe(18)
    // dMorale = -2 baseline + 4 (1:1s) + jitter; triage covered incidents.
    expect(result.moraleDelta).toBe(2 + jitter)
    expect(next.morale).toBe(72 + jitter)
    // dDebt = 5 baseline (reviews done, no debtwork).
    expect(next.techDebt).toBe(25)
    expect(next.quarterSp).toBe(18)
    expect(next.quarterIncidents).toBe(1 + rngIncident)
    expect(next.totalSpRun).toBe(18)
  })

  it('applies every skip penalty when nothing is selected', () => {
    const state = baseState({ selectedActivities: [] })
    const { rngIncident, jitter } = sprintRolls(state.rngSeed)

    const next = resolveSprint(state)
    const result = next.sprintHistory[0]

    // sp = 18*0.7 - 4 - 4 - 6 = -1.4, minus incident costs, floored at 0.
    expect(result.sp).toBe(0)
    expect(result.incidents).toBe(1 + rngIncident)
    expect(result.incidentSpCost).toBe((1 + rngIncident) * 2)
    // dMorale = -2 - 10 (no 1:1s) - 4 (unhandled incidents) - 6 (no planning).
    expect(result.moraleDelta).toBe(-22 + jitter)
    // dDebt = 5 + 8 (no reviews).
    expect(next.techDebt).toBe(33)
  })

  it('triage absorbs only the first two incidents', () => {
    // techDebt 45 -> 3 base incidents.
    const withTriage = resolveSprint(
      baseState({ techDebt: 45, selectedActivities: FULL_PLAN }),
    )
    const noTriage = resolveSprint(
      baseState({
        techDebt: 45,
        selectedActivities: FULL_PLAN.filter((id) => id !== 'triage'),
      }),
    )
    const { rngIncident } = sprintRolls(42)

    const incidents = 3 + rngIncident
    expect(withTriage.sprintHistory[0].incidentSpCost).toBe((incidents - 2) * 2)
    expect(noTriage.sprintHistory[0].incidentSpCost).toBe(incidents * 2)
  })

  it('debtwork trades 2 SP for -8 tech debt', () => {
    const plan: ActivityId[] = ['planning', 'ones', 'reviews', 'unblock', 'triage', 'debtwork']
    const next = resolveSprint(baseState({ selectedActivities: plan }))

    // dDebt = 5 - 8 = -3.
    expect(next.techDebt).toBe(17)
    // sp = 18 - 4 (product) - 4 (design) - 2 (debtwork) = 8, ×0.99 -> 8.
    expect(next.sprintHistory[0].sp).toBe(8)
  })

  it('applies the sick event as -3 SP', () => {
    const next = resolveSprint(
      baseState({ sprint: 2, currentEvent: 'sick', selectedActivities: FULL_PLAN }),
    )
    // sp = (18 - 3) * 0.99 = 14.85 -> 15.
    expect(next.sprintHistory[0].sp).toBe(15)
  })

  it('applies the storm event as +2 incidents', () => {
    const next = resolveSprint(
      baseState({ sprint: 2, currentEvent: 'storm', selectedActivities: FULL_PLAN }),
    )
    const { rngIncident } = sprintRolls(42)
    expect(next.sprintHistory[0].incidents).toBe(3 + rngIncident)
  })

  it('applies offsite and kudos morale bonuses', () => {
    const { jitter } = sprintRolls(42)
    const offsite = resolveSprint(
      baseState({ sprint: 2, currentEvent: 'offsite', selectedActivities: FULL_PLAN }),
    )
    const kudos = resolveSprint(
      baseState({ sprint: 2, currentEvent: 'kudos', selectedActivities: FULL_PLAN }),
    )
    expect(offsite.morale).toBe(70 + 2 + 6 + jitter)
    expect(kudos.morale).toBe(70 + 2 + 4 + jitter)
  })

  it('adds a low-morale incident below 40', () => {
    const next = resolveSprint(baseState({ morale: 39, selectedActivities: FULL_PLAN }))
    const { rngIncident } = sprintRolls(42)
    expect(next.sprintHistory[0].incidents).toBe(1 + 1 + rngIncident)
  })

  it('clamps morale and tech debt to [0, 100]', () => {
    const next = resolveSprint(
      baseState({ morale: 3, techDebt: 95, selectedActivities: [] }),
    )
    expect(next.morale).toBe(0)
    expect(next.techDebt).toBe(100)
  })

  it('advances to the next sprint and rolls a visible event', () => {
    const next = resolveSprint(baseState({ selectedActivities: FULL_PLAN }))

    expect(next.sprint).toBe(2)
    expect(next.phase).toBe('planning')
    expect(next.currentEvent).not.toBeNull()
    // Selection carries over when it still fits the next sprint's budget.
    if (next.currentEvent === 'ceo') {
      expect(next.selectedActivities).toEqual([])
    } else {
      expect(next.selectedActivities).toEqual(FULL_PLAN)
    }
  })

  it('enters the rating stage after sprint 6', () => {
    const next = resolveSprint(
      baseState({ sprint: 6, quarterSp: 90, selectedActivities: FULL_PLAN }),
    )

    // The boss review is graded only after the player rates the team, so no
    // quarter result exists yet.
    expect(next.phase).toBe('rating')
    expect(next.currentEvent).toBeNull()
    expect(next.lastQuarterResult).toBeNull()
  })

  it('skips the rating stage after sprint 6 when the roster is empty', () => {
    const next = resolveSprint(
      baseState({ sprint: 6, quarterSp: 90, reports: [], selectedActivities: [] }),
    )

    expect(next.phase).toBe('quarter-review')
    expect(next.lastQuarterResult).not.toBeNull()
  })
})
