import { describe, expect, it } from 'vitest'
import { applyQuarterOutcome, computeQuarterResult } from './quarter'
import { createInitialGameState, type GameState } from './save/schema'

// Builds a state as it looks right after sprint 6 resolves, just before
// computeQuarterResult runs.
function quarterEndState(overrides: Partial<GameState> = {}): GameState {
  return {
    ...createInitialGameState(1, 42),
    sprint: 6,
    quarterSp: 100,
    quarterIncidents: 5,
    morale: 60,
    techDebt: 40,
    ...overrides,
  }
}

describe('computeQuarterResult — grading', () => {
  it('grades a neutral quarter as C', () => {
    // SP 100 (>=80: +0), morale 60, debt 40, incidents 5 -> score 0.
    const result = computeQuarterResult(quarterEndState())
    expect(result.score).toBe(0)
    expect(result.grade).toBe('C')
    expect(result.pointsEarned).toBe(0)
  })

  it('grades a perfect quarter as S (score clamped into the ladder)', () => {
    const result = computeQuarterResult(
      quarterEndState({ quarterSp: 140, morale: 80, techDebt: 10, quarterIncidents: 2 }),
    )
    expect(result.score).toBe(4)
    expect(result.grade).toBe('S')
    expect(result.pointsEarned).toBe(3)
  })

  it('grades a disaster quarter as F (score clamped into the ladder)', () => {
    const result = computeQuarterResult(
      quarterEndState({ quarterSp: 40, morale: 30, techDebt: 70, quarterIncidents: 20 }),
    )
    expect(result.score).toBe(-5)
    expect(result.grade).toBe('F')
    expect(result.pointsEarned).toBe(-2)
  })

  it('applies each SP threshold', () => {
    const gradeFor = (quarterSp: number) =>
      computeQuarterResult(quarterEndState({ quarterSp })).grade
    expect(gradeFor(130)).toBe('A')
    expect(gradeFor(105)).toBe('B')
    expect(gradeFor(80)).toBe('C')
    expect(gradeFor(55)).toBe('D')
    expect(gradeFor(54)).toBe('F')
  })

  it('penalizes more than 14 cumulative incidents', () => {
    expect(computeQuarterResult(quarterEndState({ quarterIncidents: 15 })).grade).toBe('D')
    expect(computeQuarterResult(quarterEndState({ quarterIncidents: 14 })).grade).toBe('C')
  })

  it('floors career points at zero', () => {
    // D on 0 career points would go to -1.
    const result = computeQuarterResult(quarterEndState({ quarterSp: 55 }))
    expect(result.grade).toBe('D')
    expect(result.pointsEarned).toBe(-1)
    expect(result.careerPointsAfter).toBe(0)
  })
})

describe('computeQuarterResult — PIP state machine', () => {
  it('a single D outside PIP is only a warning', () => {
    const result = computeQuarterResult(quarterEndState({ quarterSp: 55 }))
    expect(result.outcome).toBe('warning')
  })

  it('an F outside PIP starts a PIP', () => {
    const result = computeQuarterResult(
      quarterEndState({ quarterSp: 40, morale: 30, techDebt: 70 }),
    )
    expect(result.grade).toBe('F')
    expect(result.outcome).toBe('pip-start')
  })

  it('two consecutive Ds start a PIP', () => {
    const result = computeQuarterResult(quarterEndState({ quarterSp: 55, consecutiveDs: 1 }))
    expect(result.grade).toBe('D')
    expect(result.outcome).toBe('pip-start')
  })

  it('C or worse while on PIP means fired', () => {
    for (const quarterSp of [80, 55, 40]) {
      const result = computeQuarterResult(quarterEndState({ quarterSp, onPip: true }))
      expect(result.outcome).toBe('fired')
    }
  })

  it('B or better while on PIP lifts the PIP', () => {
    const result = computeQuarterResult(quarterEndState({ quarterSp: 105, onPip: true }))
    expect(result.grade).toBe('B')
    expect(result.outcome).toBe('pip-lifted')
  })

  it('earns zero career points while on PIP regardless of grade', () => {
    const result = computeQuarterResult(
      quarterEndState({ quarterSp: 140, morale: 80, techDebt: 10, onPip: true }),
    )
    expect(result.grade).toBe('S')
    expect(result.pointsEarned).toBe(0)
  })
})

describe('computeQuarterResult — promotion and retirement', () => {
  it('promotes at 6 career points', () => {
    const result = computeQuarterResult(
      quarterEndState({ quarterSp: 130, careerPoints: 4 }),
    )
    expect(result.grade).toBe('A')
    expect(result.careerPointsAfter).toBe(6)
    expect(result.outcome).toBe('promoted')
  })

  it('caps the career at the end of Q24', () => {
    const result = computeQuarterResult(quarterEndState({ quarter: 24 }))
    expect(result.outcome).toBe('capped')
  })

  it('promotion beats the Q24 cap', () => {
    const result = computeQuarterResult(
      quarterEndState({ quarter: 24, quarterSp: 130, careerPoints: 4 }),
    )
    expect(result.outcome).toBe('promoted')
  })

  it('firing beats promotion checks while on PIP', () => {
    // On PIP the quarter earns 0 points, so promotion can't trigger anyway;
    // a C grade fires even at high banked points.
    const result = computeQuarterResult(
      quarterEndState({ onPip: true, careerPoints: 5, quarterSp: 80 }),
    )
    expect(result.outcome).toBe('fired')
  })
})

describe('applyQuarterOutcome', () => {
  function reviewedState(overrides: Partial<GameState> = {}): GameState {
    const atEnd = quarterEndState(overrides)
    return {
      ...atEnd,
      phase: 'quarter-review',
      lastQuarterResult: computeQuarterResult(atEnd),
    }
  }

  it('does nothing outside the quarter-review phase', () => {
    const state = quarterEndState()
    expect(applyQuarterOutcome(state)).toBe(state)
  })

  it('starts the next quarter with reset accumulators and books the grade', () => {
    const next = applyQuarterOutcome(reviewedState())

    expect(next.phase).toBe('planning')
    expect(next.quarter).toBe(2)
    expect(next.sprint).toBe(1)
    expect(next.quarterSp).toBe(0)
    expect(next.quarterIncidents).toBe(0)
    expect(next.sprintHistory).toEqual([])
    expect(next.currentEvent).toBeNull()
    expect(next.gradeHistory).toEqual(['C'])
    expect(next.consecutiveDs).toBe(0)
  })

  it('tracks consecutive Ds across quarters', () => {
    const next = applyQuarterOutcome(reviewedState({ quarterSp: 55 }))
    expect(next.consecutiveDs).toBe(1)
    expect(next.onPip).toBe(false) // warning only
  })

  it('starting a PIP costs 10 morale at the new quarter start', () => {
    const next = applyQuarterOutcome(
      reviewedState({ quarterSp: 40, morale: 30, techDebt: 70 }),
    )
    expect(next.onPip).toBe(true)
    expect(next.morale).toBe(20)
    expect(next.phase).toBe('planning')
  })

  it('clamps the PIP morale penalty at zero', () => {
    const next = applyQuarterOutcome(
      reviewedState({ quarterSp: 40, morale: 5, techDebt: 70 }),
    )
    expect(next.morale).toBe(0)
  })

  it('lifting a PIP clears the flag without the morale penalty', () => {
    const next = applyQuarterOutcome(reviewedState({ quarterSp: 105, onPip: true }))
    expect(next.onPip).toBe(false)
    expect(next.morale).toBe(60)
  })

  it('being fired ends the run', () => {
    const next = applyQuarterOutcome(reviewedState({ quarterSp: 80, onPip: true }))
    expect(next.phase).toBe('run-over')
    expect(next.runOverReason).toBe('fired')
    expect(next.gradeHistory).toEqual(['C'])
  })

  it('promotion ends the run with the points booked', () => {
    const next = applyQuarterOutcome(reviewedState({ quarterSp: 130, careerPoints: 4 }))
    expect(next.phase).toBe('run-over')
    expect(next.runOverReason).toBe('promoted')
    expect(next.careerPoints).toBe(6)
  })

  it('the Q24 cap ends the run', () => {
    const next = applyQuarterOutcome(reviewedState({ quarter: 24 }))
    expect(next.phase).toBe('run-over')
    expect(next.runOverReason).toBe('capped')
  })
})
