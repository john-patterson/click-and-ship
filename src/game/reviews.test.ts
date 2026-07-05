import { describe, expect, it } from 'vitest'
import {
  acknowledgeCalibration,
  curvedReports,
  ratingQuotas,
  submitRatings,
  validateRatings,
} from './reviews'
import { createInitialGameState, type GameState, type Rating } from './save/schema'

// State as it looks when the rating screen opens: sprint 6 resolved, phase
// 'rating', default 4-person roster.
function ratingState(overrides: Partial<GameState> = {}): GameState {
  return {
    ...createInitialGameState(1, 42),
    sprint: 6,
    quarterSp: 100,
    quarterIncidents: 5,
    morale: 60,
    techDebt: 40,
    phase: 'rating',
    ...overrides,
  }
}

// The canonical valid curve for the default roster (4 curved reports:
// 1 EE + 2 ME + 1 NI).
const VALID: Record<string, Rating> = { alice: 'EE', bob: 'ME', carol: 'ME', dave: 'NI' }

describe('ratingQuotas', () => {
  it('matches the spec examples', () => {
    expect(ratingQuotas(4)).toEqual({ nEE: 1, nME: 2, nNI: 1 })
    expect(ratingQuotas(6)).toEqual({ nEE: 1, nME: 4, nNI: 1 })
    expect(ratingQuotas(10)).toEqual({ nEE: 2, nME: 6, nNI: 2 })
  })

  it('degrades sanely at tiny team sizes', () => {
    expect(ratingQuotas(2)).toEqual({ nEE: 1, nME: 0, nNI: 1 })
    expect(ratingQuotas(1)).toEqual({ nEE: 0, nME: 0, nNI: 1 })
    expect(ratingQuotas(0)).toEqual({ nEE: 0, nME: 0, nNI: 0 })
  })
})

describe('validateRatings — forced curve', () => {
  it('accepts a submission that meets the quotas exactly', () => {
    expect(validateRatings(ratingState(), VALID)).toBeNull()
  })

  it('rejects a missing rating', () => {
    const { dave: _dave, ...partial } = VALID
    expect(validateRatings(ratingState(), partial)).toMatch(/no rating/)
  })

  it('rejects everyone-meets-expectations (no skip option)', () => {
    const all: Record<string, Rating> = { alice: 'ME', bob: 'ME', carol: 'ME', dave: 'ME' }
    expect(validateRatings(ratingState(), all)).toMatch(/Curve not met/)
  })

  it('rejects too many EEs even when NI quota is met', () => {
    const generous: Record<string, Rating> = { alice: 'EE', bob: 'EE', carol: 'ME', dave: 'NI' }
    expect(validateRatings(ratingState(), generous)).toMatch(/Curve not met/)
  })

  it('excludes soft-PIP reports from the curve', () => {
    const state = ratingState()
    state.reports = state.reports.map((r) =>
      r.id === 'dave' ? { ...r, onSoftPIP: true, consecutiveNI: 1 } : r,
    )
    // 3 curved reports -> 1 EE + 1 ME + 1 NI; dave is auto-NI outside it.
    expect(curvedReports(state).map((r) => r.id)).toEqual(['alice', 'bob', 'carol'])
    expect(
      validateRatings(state, { alice: 'EE', bob: 'ME', carol: 'NI' }),
    ).toBeNull()
  })
})

describe('submitRatings — effects', () => {
  // A seed where the calibration roll misses, so effects are pure.
  function submitClean(state: GameState, ratings: Record<string, Rating>): GameState {
    for (let seed = 1; seed < 1000; seed += 1) {
      const result = submitRatings({ ...state, rngSeed: seed }, ratings)
      if (!result.calibrationEvent) return result
    }
    throw new Error('no calibration-free seed found')
  }

  it('rejects an invalid curve outright', () => {
    const state = ratingState()
    const bad: Record<string, Rating> = { alice: 'ME', bob: 'ME', carol: 'ME', dave: 'ME' }
    expect(submitRatings(state, bad)).toBe(state)
  })

  it('applies EE effects: +10 personal, +5 team, loyalty, salary hours', () => {
    const state = ratingState()
    const next = submitClean(state, VALID)
    const alice = next.reports.find((r) => r.id === 'alice')!

    expect(next.phase).toBe('quarter-review')
    // Team morale: +5 (EE) - 3 (NI) = +2.
    expect(next.morale).toBe(62)
    // Personal: +10 EE shock, +2 team-wide drift.
    expect(alice.morale).toBe(82)
    expect(alice.loyalty).toBe(1)
    expect(alice.salaryHours).toBe(2)
    expect(alice.ratingHistory).toEqual([{ quarter: 1, rating: 'EE' }])
    expect(alice.consecutiveNI).toBe(0)
    expect(alice.onSoftPIP).toBe(false)
  })

  it('applies NI effects: -8 personal, -3 team, soft PIP flag', () => {
    const next = submitClean(ratingState(), VALID)
    const dave = next.reports.find((r) => r.id === 'dave')!

    // Personal: -8 NI shock, +2 team-wide drift.
    expect(dave.morale).toBe(64)
    expect(dave.consecutiveNI).toBe(1)
    expect(dave.onSoftPIP).toBe(true)
    expect(dave.ratingHistory).toEqual([{ quarter: 1, rating: 'NI' }])
  })

  it('auto-NIs soft-PIP reports and stacks consecutive NIs', () => {
    const state = ratingState()
    state.reports = state.reports.map((r) =>
      r.id === 'dave' ? { ...r, onSoftPIP: true, consecutiveNI: 1 } : r,
    )
    const next = submitClean(state, { alice: 'EE', bob: 'ME', carol: 'NI' })
    const dave = next.reports.find((r) => r.id === 'dave')!

    expect(dave.consecutiveNI).toBe(2)
    expect(dave.ratingHistory).toEqual([{ quarter: 1, rating: 'NI' }])
  })

  it('grades the quarter on post-rating morale', () => {
    const next = submitClean(ratingState(), VALID)
    expect(next.lastQuarterResult).not.toBeNull()
    expect(next.lastQuarterResult?.endMorale).toBe(next.morale)
  })

  it('does nothing outside the rating phase', () => {
    const state = ratingState({ phase: 'planning' })
    expect(submitRatings(state, VALID)).toBe(state)
  })
})

describe('calibration override', () => {
  it('fires at roughly 15% over 1000 submissions', () => {
    const state = ratingState()
    let fired = 0
    for (let seed = 0; seed < 1000; seed += 1) {
      const next = submitRatings({ ...state, rngSeed: seed }, VALID)
      if (next.calibrationEvent) fired += 1
    }
    // 15% ± sampling noise (3 sigma ≈ ±34 over 1000 trials).
    expect(fired).toBeGreaterThan(110)
    expect(fired).toBeLessThan(190)
  })

  it('bumping down refunds the EE effects and rewrites history to ME', () => {
    const state = ratingState()
    for (let seed = 0; seed < 2000; seed += 1) {
      const next = submitRatings({ ...state, rngSeed: seed }, VALID)
      if (next.calibrationEvent?.direction !== 'down') continue

      expect(next.phase).toBe('calibration')
      expect(next.calibrationEvent.reportId).toBe('alice')
      const alice = next.reports.find((r) => r.id === 'alice')!
      expect(alice.ratingHistory).toEqual([{ quarter: 1, rating: 'ME' }])
      expect(alice.loyalty).toBe(0)
      expect(alice.salaryHours).toBe(0)
      // Team morale loses the EE's +5: net -3 from the NI alone.
      expect(next.morale).toBe(57)
      return
    }
    throw new Error('no bump-down seed found')
  })

  it('bumping up applies full NI effects to an ME', () => {
    const state = ratingState()
    for (let seed = 0; seed < 2000; seed += 1) {
      const next = submitRatings({ ...state, rngSeed: seed }, VALID)
      if (next.calibrationEvent?.direction !== 'up') continue

      const victim = next.reports.find((r) => r.id === next.calibrationEvent?.reportId)!
      expect(['bob', 'carol']).toContain(victim.id)
      expect(victim.ratingHistory).toEqual([{ quarter: 1, rating: 'NI' }])
      expect(victim.onSoftPIP).toBe(true)
      expect(victim.consecutiveNI).toBe(1)
      // Team morale: +5 EE - 3 NI - 3 extra NI = -1.
      expect(next.morale).toBe(59)
      return
    }
    throw new Error('no bump-up seed found')
  })

  it('acknowledging the override advances to the boss review', () => {
    const state = ratingState()
    for (let seed = 0; seed < 2000; seed += 1) {
      const next = submitRatings({ ...state, rngSeed: seed }, VALID)
      if (!next.calibrationEvent) continue
      const acked = acknowledgeCalibration(next)
      expect(acked.phase).toBe('quarter-review')
      expect(acked.lastQuarterResult).not.toBeNull()
      return
    }
    throw new Error('no calibration seed found')
  })
})
