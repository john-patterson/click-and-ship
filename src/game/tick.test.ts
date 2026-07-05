import { describe, expect, it } from 'vitest'
import { SPRINT_DURATION_MS, TICK_INTERVAL_MS } from './constants'
import { createInitialGameState, type GameState } from './save/schema'
import { tick } from './tick'

function seniorAssignedState(): GameState {
  const state = createInitialGameState()
  return {
    ...state,
    rngSeed: 42,
    team: state.team.map((m) => (m.id === 'senior-1' ? { ...m, assignedSubtaskId: 'subtask-be' } : m)),
  }
}

describe('tick', () => {
  it('drives an assigned subtask to completion and advances the sprint', () => {
    let state = seniorAssignedState()
    // Run for 3 sprints' worth of ticks: at 100 progress/sprint solo, the
    // senior finishes in ~1 sprint, but random incidents can knock a few
    // points off along the way, so give it generous headroom rather than
    // asserting on the exact tick the subtask crosses 100.
    const steps = 3 * Math.ceil(SPRINT_DURATION_MS / TICK_INTERVAL_MS)

    for (let i = 0; i < steps; i++) {
      state = tick(state, TICK_INTERVAL_MS)
    }

    const subtask = state.project.subtasks.find((t) => t.id === 'subtask-be')!
    expect(subtask.done).toBe(true)
    expect(subtask.progress).toBe(100)
    expect(state.sprint).toBeGreaterThan(1)
  })

  it('is a no-op when the run is not active', () => {
    const state = { ...seniorAssignedState(), phase: 'game-over' as const }
    const result = tick(state, TICK_INTERVAL_MS)
    expect(result).toBe(state)
  })

  it('is deterministic: identical tick sequences from the same state produce identical results', () => {
    const start = seniorAssignedState()
    const run = (initial: GameState) => {
      let state = initial
      for (let i = 0; i < 50; i++) {
        state = tick(state, TICK_INTERVAL_MS)
      }
      return state
    }

    expect(JSON.stringify(run(start))).toBe(JSON.stringify(run(start)))
  })
})
