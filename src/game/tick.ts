import {
  EVENT_RESOLUTION_INTERVAL_MS,
  JUNIOR_PROGRESS_RATE,
  MANAGER_FILL_PROGRESS_RATE,
  MAX_SPRINT_RESOLUTIONS_PER_TICK,
  SENIOR_PROGRESS_RATE,
  SPRINT_DURATION_MS,
} from './constants'
import { resolveBeat } from './events'
import type { GameState, Specialization } from './save/schema'
import { resolveSprintEnd } from './sprint'
import { appendLog, updateSubtask } from './state-helpers'

const specializationLabel: Record<Specialization, string> = {
  product: 'Product',
  design: 'Design',
  fe: 'Frontend',
  be: 'Backend',
}

// Called on an interval with the elapsed time (ms) since the last tick.
// Player actions (assigning devs, spending manager time, click-hold
// unblocking, responding to events) are applied instantly elsewhere via
// store actions; this function only advances what's driven by the clock:
// event beats, subtask progress, and sprint/quarter boundaries.
export function tick(state: GameState, deltaMs: number): GameState {
  if (state.phase !== 'active') return state

  let next = state

  const prevBeat = Math.floor(next.sprintElapsedMs / EVENT_RESOLUTION_INTERVAL_MS)
  next = { ...next, sprintElapsedMs: next.sprintElapsedMs + deltaMs }
  const newBeat = Math.floor(next.sprintElapsedMs / EVENT_RESOLUTION_INTERVAL_MS)
  for (let i = prevBeat; i < newBeat; i++) {
    next = resolveBeat(next)
  }

  next = accrueProgress(next, deltaMs)

  let resolutions = 0
  while (next.sprintElapsedMs >= SPRINT_DURATION_MS && resolutions < MAX_SPRINT_RESOLUTIONS_PER_TICK) {
    next = { ...next, sprintElapsedMs: next.sprintElapsedMs - SPRINT_DURATION_MS }
    next = resolveSprintEnd(next)
    resolutions++
    if (next.phase !== 'active') break
  }

  return next
}

function accrueProgress(state: GameState, deltaMs: number): GameState {
  let next = state
  for (const subtask of state.project.subtasks) {
    if (subtask.done) continue

    const rate = progressRateFor(next, subtask.id)
    if (rate <= 0) continue

    const progress = Math.min(100, subtask.progress + (rate * deltaMs) / 1000)
    const done = progress >= 100
    next = updateSubtask(next, subtask.id, { progress, done })

    if (done) {
      next = { ...next, subtasksCompletedThisQuarter: next.subtasksCompletedThisQuarter + 1 }
      next = appendLog(next, `${specializationLabel[subtask.specialization]} work shipped.`, 'success')
    }
  }
  return next
}

function progressRateFor(state: GameState, subtaskId: string): number {
  const dev = state.team.find((m) => m.assignedSubtaskId === subtaskId)
  if (dev && !dev.blocked) {
    return dev.archetype === 'senior' ? SENIOR_PROGRESS_RATE : JUNIOR_PROGRESS_RATE
  }

  const subtask = state.project.subtasks.find((t) => t.id === subtaskId)
  return subtask?.managerFilling ? MANAGER_FILL_PROGRESS_RATE : 0
}
