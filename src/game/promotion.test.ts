import { describe, expect, it } from 'vitest'
import {
  applyLegacyPick,
  buildPromotionQueue,
  decidePromotion,
  eeSincePromotion,
  promotionEligible,
  retire,
} from './promotion'
import { computeQuarterResult } from './quarter'
import { createInitialGameState, type GameState, type RatingEntry, type Report } from './save/schema'

function ee(quarter: number): RatingEntry {
  return { quarter, rating: 'EE' }
}

function withHistory(report: Report, history: RatingEntry[]): Report {
  return { ...report, ratingHistory: history }
}

function baseState(overrides: Partial<GameState> = {}): GameState {
  return { ...createInitialGameState(1, 42), ...overrides }
}

// State sitting in the promotions phase with the given report first in queue.
function promoState(mutate: (r: Report) => Report, reportId: string): GameState {
  const base = baseState({ quarter: 4, phase: 'promotions' })
  const state = {
    ...base,
    reports: base.reports.map((r) => (r.id === reportId ? mutate(r) : r)),
  }
  const result = computeQuarterResult({ ...state, quarterSp: 100 })
  return { ...state, promotionQueue: [reportId], lastQuarterResult: result }
}

describe('promotion eligibility', () => {
  const alice = createInitialGameState(1, 1).reports[0] // Junior
  const carol = createInitialGameState(1, 1).reports[2] // SWE II
  const dave = createInitialGameState(1, 1).reports[3] // Senior

  it('requires 2 EEs for Junior -> SWE II', () => {
    expect(promotionEligible(withHistory(alice, [ee(1)]))).toBe(false)
    expect(promotionEligible(withHistory(alice, [ee(1), ee(2)]))).toBe(true)
  })

  it('requires 2 EEs for SWE II -> Senior', () => {
    expect(promotionEligible(withHistory(carol, [ee(1), { quarter: 2, rating: 'ME' }]))).toBe(false)
    expect(promotionEligible(withHistory(carol, [ee(1), ee(3)]))).toBe(true)
  })

  it('requires 3 EEs for Senior -> Staff', () => {
    expect(promotionEligible(withHistory(dave, [ee(1), ee(2)]))).toBe(false)
    expect(promotionEligible(withHistory(dave, [ee(1), ee(2), ee(3)]))).toBe(true)
  })

  it('only counts EEs earned since the last promotion', () => {
    const promoted = withHistory(
      { ...carol, lastPromotedQuarter: 2 },
      [ee(1), ee(2), ee(3)],
    )
    expect(eeSincePromotion(promoted)).toBe(1)
    expect(promotionEligible(promoted)).toBe(false)
  })

  it('builds the queue from eligible reports only', () => {
    const state = baseState()
    state.reports = state.reports.map((r) =>
      r.id === 'alice' ? withHistory(r, [ee(1), ee(2)]) : r,
    )
    expect(buildPromotionQueue(state)).toEqual(['alice'])
  })
})

describe('decidePromotion', () => {
  const eligibleJunior = (r: Report) => withHistory(r, [ee(2), ee(3)])

  it('approve: role/SP bump, +1 salary hour, loyalty, morale, costs booked', () => {
    const state = promoState(eligibleJunior, 'alice')
    const next = decidePromotion(state, 'approve')
    const alice = next.reports.find((r) => r.id === 'alice')!

    expect(alice.role).toBe('SWE II')
    expect(alice.baseSp).toBe(5)
    expect(alice.salaryHours).toBe(1)
    expect(alice.loyalty).toBe(2)
    expect(alice.lastPromotedQuarter).toBe(4)
    expect(alice.timesPromoted).toBe(1)
    expect(next.politicalCapital).toBe(2)
    // Queue empty -> quarter wrapped up; promo prep hits next quarter's
    // sprint 1 budget.
    expect(next.phase).toBe('planning')
    expect(next.quarter).toBe(5)
    expect(next.committedHours).toBe(4)
  })

  it('approve is refused at 0 political capital', () => {
    const state = { ...promoState(eligibleJunior, 'alice'), politicalCapital: 0 }
    expect(decidePromotion(state, 'approve')).toBe(state)
  })

  it('deny: -10 personal morale and a flight-risk flag', () => {
    const state = promoState(eligibleJunior, 'alice')
    const next = decidePromotion(state, 'deny')
    const alice = next.reports.find((r) => r.id === 'alice')!

    expect(alice.morale).toBe(60)
    expect(alice.promotionDenied).toBe(true)
    expect(alice.role).toBe('Junior')
  })

  it('defer once: hidden waiting counter, no other effect', () => {
    const state = promoState(eligibleJunior, 'alice')
    const next = decidePromotion(state, 'defer')
    const alice = next.reports.find((r) => r.id === 'alice')!

    expect(alice.deferredPromotions).toBe(1)
    expect(alice.morale).toBe(70)
  })

  it('defer twice: they leave', () => {
    const state = promoState((r) => ({ ...eligibleJunior(r), deferredPromotions: 1 }), 'alice')
    const next = decidePromotion(state, 'defer')

    expect(next.reports.find((r) => r.id === 'alice')).toBeUndefined()
    expect(next.notices.some((n) => n.includes('Alice'))).toBe(true)
  })

  it('Senior promotes to Staff at 7 SP', () => {
    const state = promoState((r) => withHistory(r, [ee(1), ee(2), ee(3)]), 'dave')
    const next = decidePromotion(state, 'approve')
    const dave = next.reports.find((r) => r.id === 'dave')!

    expect(dave.role).toBe('Staff')
    expect(dave.baseSp).toBe(7)
  })
})

describe('applyLegacyPick', () => {
  function ceremonyState(): GameState {
    return baseState({ phase: 'ceremony', careerPoints: 6, quarter: 8 })
  }

  it('ally: keeps the report with +2 loyalty and records the pick', () => {
    const next = applyLegacyPick(ceremonyState(), { type: 'ally', reportId: 'carol' })

    expect(next.phase).toBe('run-over')
    expect(next.runOverReason).toBe('promoted')
    expect(next.tier).toBe('MoM')
    expect(next.careerPoints).toBe(0)
    expect(next.metaProgression.peakTier).toBe('MoM')
    expect(next.legacyPicks).toEqual(['ally'])
    expect(next.allyReportId).toBe('carol')
    expect(next.reports.find((r) => r.id === 'carol')?.loyalty).toBe(2)
  })

  it('capital: +3 political capital into the new tier', () => {
    const next = applyLegacyPick(ceremonyState(), { type: 'capital' })
    expect(next.politicalCapital).toBe(6)
    expect(next.legacyPicks).toEqual(['capital'])
  })

  it('reputation: first quarter at the new tier gets the +1 flag', () => {
    const next = applyLegacyPick(ceremonyState(), { type: 'reputation' })
    expect(next.reputationBoost).toBe(true)
  })

  it('does nothing outside the ceremony', () => {
    const state = baseState()
    expect(applyLegacyPick(state, { type: 'capital' })).toBe(state)
  })
})

describe('retire', () => {
  it('is locked below VP tier', () => {
    const state = baseState({ tier: 'MoM' })
    expect(retire(state)).toBe(state)
  })

  it('ends the run cleanly at VP+, banking the peak tier', () => {
    const state = baseState({ tier: 'VP', quarter: 12 })
    const next = retire(state)
    expect(next.phase).toBe('run-over')
    expect(next.runOverReason).toBe('retired')
    expect(next.metaProgression.peakTier).toBe('VP')
  })
})
