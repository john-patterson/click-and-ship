import { describe, expect, it } from 'vitest'
import { migrate } from './migrations'
import { createInitialGameState, CURRENT_SAVE_VERSION } from './schema'

describe('migrate', () => {
  it('walks a v1 clicker save all the way to the current version', () => {
    const v1 = { version: 1, state: { clicks: 42 }, lastSaveTimestamp: 1000 }

    const result = migrate(v1)

    expect(result.version).toBe(CURRENT_SAVE_VERSION)
    expect(result.lastSaveTimestamp).toBe(1000)
    expect(result.state.phase).toBe('planning')
    expect(result.state.quarter).toBe(1)
    expect(result.state.morale).toBe(70)
  })

  it('migrates a v2 real-time save into a fresh run, keeping seed and run number', () => {
    const v2 = {
      version: 2,
      state: { rngSeed: 987654, runNumber: 3, team: [], sprintElapsedMs: 5000 },
      lastSaveTimestamp: 2000,
    }

    const result = migrate(v2)

    expect(result.version).toBe(CURRENT_SAVE_VERSION)
    expect(result.lastSaveTimestamp).toBe(2000)
    expect(result.state.rngSeed).toBe(987654)
    expect(result.state.runNumber).toBe(3)
    expect(result.state.phase).toBe('planning')
    expect(result.state.sprint).toBe(1)
  })

  it('migrates a v3 save to v4, keeping the run and adding Phase 2 defaults', () => {
    // A v3 save is the v4 GameState minus every Phase 2 field.
    const v3State = {
      quarter: 7,
      sprint: 3,
      morale: 55,
      techDebt: 33,
      careerPoints: 4,
      selectedActivities: ['planning', 'ones'],
      currentEvent: 'storm',
      quarterSp: 40,
      quarterIncidents: 3,
      sprintHistory: [],
      lastQuarterResult: null,
      onPip: true,
      consecutiveDs: 1,
      gradeHistory: ['C', 'B', 'C', 'D', 'B', 'C'],
      totalSpRun: 512,
      rngSeed: 111,
      phase: 'planning',
      runOverReason: null,
      runNumber: 2,
    }
    const result = migrate({ version: 3, state: v3State, lastSaveTimestamp: 3000 })

    expect(result.version).toBe(4)
    // The run is untouched...
    expect(result.state.quarter).toBe(7)
    expect(result.state.morale).toBe(55)
    expect(result.state.careerPoints).toBe(4)
    expect(result.state.onPip).toBe(true)
    expect(result.state.gradeHistory).toHaveLength(6)
    // ...and the Phase 2 fields arrive with defaults.
    expect(result.state.tier).toBe('IC')
    expect(result.state.politicalCapital).toBe(3)
    expect(result.state.candidatePool).toEqual([])
    expect(result.state.metaProgression).toEqual({ peakTier: 'IC', careerCount: 2 })
    expect(result.state.reports).toHaveLength(4)
    for (const report of result.state.reports) {
      expect(report.morale).toBe(55) // starts at team morale
      expect(report.ratingHistory).toEqual([])
      expect(report.consecutiveNI).toBe(0)
      expect(report.loyalty).toBe(0)
      expect(report.salaryHours).toBe(0)
      expect(report.traitsRevealed).toBe(true)
    }
  })

  it('is a no-op for an already-current save', () => {
    const current = {
      version: CURRENT_SAVE_VERSION,
      state: createInitialGameState(1, 123),
      lastSaveTimestamp: 500,
    }

    const result = migrate(current)

    expect(result).toEqual(current)
  })

  it('throws on an unknown future version gap', () => {
    // A version below current with no registered step would indicate a
    // deleted migration; simulate with version 0.
    expect(() => migrate({ version: 0, state: {}, lastSaveTimestamp: 0 })).toThrow(
      /No migration registered/,
    )
  })
})
