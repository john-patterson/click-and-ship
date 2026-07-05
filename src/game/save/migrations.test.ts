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

  it('migrates a v2 real-time save into a fresh v3 run, keeping seed and run number', () => {
    const v2 = {
      version: 2,
      state: { rngSeed: 987654, runNumber: 3, team: [], sprintElapsedMs: 5000 },
      lastSaveTimestamp: 2000,
    }

    const result = migrate(v2)

    expect(result.version).toBe(3)
    expect(result.lastSaveTimestamp).toBe(2000)
    expect(result.state.rngSeed).toBe(987654)
    expect(result.state.runNumber).toBe(3)
    expect(result.state.phase).toBe('planning')
    expect(result.state.sprint).toBe(1)
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
