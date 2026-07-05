import { describe, expect, it } from 'vitest'
import { restartRun, runSprint, toggleActivity } from './actions'
import { createInitialGameState, type ActivityId, type GameState } from './save/schema'
import { selectedActivityCost } from './sprint'

function baseState(overrides: Partial<GameState> = {}): GameState {
  return { ...createInitialGameState(1, 42), ...overrides }
}

describe('toggleActivity', () => {
  it('selects and deselects an activity', () => {
    const selected = toggleActivity(baseState(), 'planning')
    expect(selected.selectedActivities).toEqual(['planning'])
    expect(toggleActivity(selected, 'planning').selectedActivities).toEqual([])
  })

  it('rejects a selection that exceeds the 40h budget', () => {
    // 40h plan; adding 4h more must be refused.
    const fullPlan: ActivityId[] = [
      'planning',
      'ones',
      'reviews',
      'unblock',
      'product',
      'design',
      'triage',
    ]
    const state = baseState({ selectedActivities: fullPlan })
    expect(selectedActivityCost(fullPlan, state.reports)).toBe(40)
    expect(toggleActivity(state, 'interview')).toBe(state)
  })

  it('shrinks the budget by 8h under a CEO-demo event', () => {
    // 36h selected; adding 8h fits 40h but not 32h.
    const plan: ActivityId[] = ['planning', 'ones', 'reviews', 'unblock', 'design', 'triage', 'interview']
    expect(selectedActivityCost(plan, baseState().reports)).toBe(36)
    const calm = baseState({ sprint: 2, selectedActivities: plan.slice(0, -1) })
    const demo = { ...calm, currentEvent: 'ceo' as const }
    expect(toggleActivity(calm, 'interview').selectedActivities).toContain('interview')
    expect(toggleActivity(demo, 'interview')).toBe(demo)
  })

  it('ignores toggles outside the planning phase', () => {
    const state = baseState({ phase: 'quarter-review' })
    expect(toggleActivity(state, 'planning')).toBe(state)
  })
})

describe('runSprint', () => {
  it('only runs during planning', () => {
    const state = baseState({ phase: 'run-over' })
    expect(runSprint(state)).toBe(state)
  })

  it('resolves the sprint during planning', () => {
    const next = runSprint(baseState())
    expect(next.sprintHistory).toHaveLength(1)
  })
})

describe('restartRun', () => {
  it('starts fresh with an incremented run number', () => {
    const ended = baseState({ phase: 'run-over', runNumber: 2, quarter: 9 })
    const next = restartRun(ended)
    expect(next.runNumber).toBe(3)
    expect(next.quarter).toBe(1)
    expect(next.phase).toBe('planning')
  })

  it('keeps meta-progression across careers, bumping the career count', () => {
    const ended = baseState({
      phase: 'run-over',
      runNumber: 2,
      metaProgression: { peakTier: 'MoM', careerCount: 2 },
    })
    const next = restartRun(ended)
    expect(next.metaProgression).toEqual({ peakTier: 'MoM', careerCount: 3 })
    expect(next.politicalCapital).toBe(3)
    expect(next.tier).toBe('IC')
  })
})
