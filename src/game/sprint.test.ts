import { describe, expect, it } from 'vitest'
import { createInitialGameState, type GameState } from './save/schema'
import { computeQuarterReview } from './sprint'

function stateWith(overrides: Partial<GameState>): GameState {
  return { ...createInitialGameState(), ...overrides }
}

describe('computeQuarterReview', () => {
  it('grades a perfect quarter as A', () => {
    const result = computeQuarterReview(
      stateWith({ subtasksCompletedThisQuarter: 4, incidentsThisQuarter: 0, managerFillSpendThisQuarter: 0 }),
    )

    expect(result.score).toBe(100)
    expect(result.grade).toBe('A')
    expect(result.passed).toBe(true)
  })

  it('grades a quarter with nothing shipped as F', () => {
    const result = computeQuarterReview(
      stateWith({ subtasksCompletedThisQuarter: 0, incidentsThisQuarter: 0, managerFillSpendThisQuarter: 0 }),
    )

    expect(result.score).toBe(0)
    expect(result.grade).toBe('F')
    expect(result.passed).toBe(false)
  })

  it('incidents and manager-fill spend pull the score down', () => {
    const result = computeQuarterReview(
      stateWith({ subtasksCompletedThisQuarter: 4, incidentsThisQuarter: 2, managerFillSpendThisQuarter: 100 }),
    )

    // 4*25 - 2*10 - min(100,100)*0.2 = 100 - 20 - 20 = 60
    expect(result.score).toBe(60)
    expect(result.grade).toBe('C')
    expect(result.passed).toBe(true)
  })
})
