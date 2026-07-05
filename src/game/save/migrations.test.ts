import { describe, expect, it } from 'vitest'
import { migrate } from './migrations'
import { CURRENT_SAVE_VERSION } from './schema'

describe('migrate', () => {
  it('migrates a v1 clicker save into a fresh v2 GameState', () => {
    const v1 = { version: 1, state: { clicks: 42 }, lastSaveTimestamp: 1000 }

    const result = migrate(v1)

    expect(result.version).toBe(2)
    expect(result.lastSaveTimestamp).toBe(1000)
    expect(result.state.team).toHaveLength(3)
    expect(result.state.project.subtasks).toHaveLength(4)
    expect(result.state.phase).toBe('active')
  })

  it('is a no-op for an already-current save', () => {
    const v2 = { version: CURRENT_SAVE_VERSION, state: { some: 'state' }, lastSaveTimestamp: 500 }

    const result = migrate(v2)

    expect(result).toEqual(v2)
  })
})
