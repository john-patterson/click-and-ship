import { describe, expect, it } from 'vitest'
import {
  expireCandidates,
  fireReport,
  generateCandidate,
  hireCandidate,
} from './recruiting'
import { resolveSprint } from './sprint'
import { createInitialGameState, type Candidate, type GameState } from './save/schema'

function baseState(overrides: Partial<GameState> = {}): GameState {
  return { ...createInitialGameState(1, 42), ...overrides }
}

function someCandidate(overrides: Partial<Candidate> = {}): Candidate {
  const [candidate] = generateCandidate(7, 1, new Set())
  return { ...candidate, ...overrides }
}

describe('generateCandidate', () => {
  it('is deterministic and stat-consistent with its role', () => {
    const [a] = generateCandidate(123, 1, new Set())
    const [b] = generateCandidate(123, 1, new Set())
    expect(a).toEqual(b)

    const statsByRole = {
      Junior: { baseSp: 3, salaryHours: 1 },
      'SWE II': { baseSp: 5, salaryHours: 2 },
      Senior: { baseSp: 7, salaryHours: 3 },
      Specialist: { baseSp: 5, salaryHours: 2 },
    } as const
    for (let seed = 0; seed < 50; seed += 1) {
      const [candidate] = generateCandidate(seed, 3, new Set())
      const stats = statsByRole[candidate.role as keyof typeof statsByRole]
      expect(candidate.baseSp).toBe(stats.baseSp)
      expect(candidate.salaryHours).toBe(stats.salaryHours)
      expect(candidate.hiringCost).toBe(4)
      expect(candidate.hiddenTraits.length).toBeGreaterThanOrEqual(1)
      expect(candidate.hiddenTraits.length).toBeLessThanOrEqual(2)
      expect(candidate.expiresAtEndOfQuarter).toBe(4) // quarter + 1
    }
  })

  it('always yields a Senior for referrals', () => {
    for (let seed = 0; seed < 20; seed += 1) {
      const [candidate] = generateCandidate(seed, 1, new Set(), 'Senior')
      expect(candidate.role).toBe('Senior')
      expect(candidate.baseSp).toBe(7)
    }
  })
})

describe('interview activity', () => {
  it('adds one candidate to the pool at sprint end', () => {
    const next = resolveSprint(baseState({ selectedActivities: ['planning', 'interview'] }))
    expect(next.candidatePool).toHaveLength(1)
  })

  it('adds nothing without the interview activity', () => {
    const next = resolveSprint(baseState({ selectedActivities: ['planning'] }))
    expect(next.candidatePool).toHaveLength(0)
  })
})

describe('candidate expiry', () => {
  it('keeps candidates through their second quarter and drops them after', () => {
    const fresh = someCandidate({ expiresAtEndOfQuarter: 3 }) // generated in Q2
    // End of Q2: stays. End of Q3: gone ("they took another offer").
    expect(expireCandidates([fresh], 2)).toEqual([fresh])
    expect(expireCandidates([fresh], 3)).toEqual([])
  })
})

describe('hireCandidate', () => {
  function poolState(overrides: Partial<GameState> = {}): GameState {
    return baseState({ candidatePool: [someCandidate({ id: 'cand-x' })], ...overrides })
  }

  it('spends hiring hours and moves the candidate onto the roster', () => {
    const next = hireCandidate(poolState(), 'cand-x')

    expect(next.candidatePool).toHaveLength(0)
    expect(next.committedHours).toBe(4)
    expect(next.reports).toHaveLength(5)
    const hire = next.reports[4]
    expect(hire.sprintsWithTeam).toBe(0) // joins next sprint
    expect(hire.traitsRevealed).toBe(false)
    expect(hire.morale).toBe(70) // starts at team morale
  })

  it('refuses at the IC headcount cap of 6', () => {
    const state = poolState()
    const stuffed = {
      ...state,
      reports: [
        ...state.reports,
        { ...state.reports[0], id: 'r5', name: 'Eve' },
        { ...state.reports[0], id: 'r6', name: 'Frank' },
      ],
    }
    expect(hireCandidate(stuffed, 'cand-x')).toBe(stuffed)
  })

  it('refuses when the hiring hours don\'t fit the sprint budget', () => {
    const fullPlan = poolState({
      selectedActivities: ['planning', 'ones', 'reviews', 'unblock', 'product', 'design', 'triage'],
    })
    expect(hireCandidate(fullPlan, 'cand-x')).toBe(fullPlan)
  })

  it('ramps the hire at 50% for exactly one sprint and reveals traits after it', () => {
    // Hire during sprint 1; they sit out sprint 1, ramp in sprint 2, and
    // their traits reveal when sprint 2 resolves.
    let state = hireCandidate(poolState(), 'cand-x')
    const hireId = state.reports[4].id

    state = resolveSprint(state) // sprint 1 resolves: not contributing yet
    let hire = state.reports.find((r) => r.id === hireId)!
    expect(hire.sprintsWithTeam).toBe(1)
    expect(hire.traitsRevealed).toBe(false)

    state = resolveSprint({ ...state, currentEvent: null }) // sprint 2: ramping at 50%
    hire = state.reports.find((r) => r.id === hireId)!
    expect(hire.sprintsWithTeam).toBe(2)
    expect(hire.traitsRevealed).toBe(true)
    expect(state.notices.some((n) => n.includes(hire.name))).toBe(true)
  })
})

describe('fireReport', () => {
  it('firing without cause costs 1 political capital and hits morale', () => {
    const state = baseState()
    const next = fireReport(state, 'bob')

    expect(next.reports.map((r) => r.id)).toEqual(['alice', 'carol', 'dave'])
    expect(next.politicalCapital).toBe(2)
    expect(next.morale).toBe(62) // -8 team-wide
    // Survivors: -8 team-wide plus the -3 aftershock.
    expect(next.reports.every((r) => r.morale === 70 - 8 - 3)).toBe(true)
  })

  it('is blocked without cause at 0 political capital', () => {
    const state = baseState({ politicalCapital: 0 })
    expect(fireReport(state, 'bob')).toBe(state)
  })

  it('firing a soft-PIP report is free of political capital', () => {
    const state = baseState({ politicalCapital: 0 })
    state.reports = state.reports.map((r) =>
      r.id === 'bob' ? { ...r, onSoftPIP: true, consecutiveNI: 1 } : r,
    )
    const next = fireReport(state, 'bob')
    expect(next.reports).toHaveLength(3)
    expect(next.politicalCapital).toBe(0)
  })
})
