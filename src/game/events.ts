import {
  INCIDENT_CHANCE_PER_BEAT,
  INCIDENT_PROGRESS_LOSS,
  JUNIOR_BLOCK_CHANCE_PER_BEAT,
  SENIOR_PROPOSAL_CHANCE_PER_BEAT,
} from './constants'
import { nextRandom } from './rng'
import type { GameState, PendingEvent } from './save/schema'
import { appendLog, updateSubtask, updateTeamMember } from './state-helpers'

const specializationLabel: Record<string, string> = {
  product: 'product',
  design: 'design',
  fe: 'frontend',
  be: 'backend',
}

// Rolled once per 30s "beat" (4 per sprint). The same fixed slots are rolled
// every beat regardless of eligibility (junior-1, junior-2, senior, incident)
// so RNG draw order never depends on game state.
export function resolveBeat(state: GameState): GameState {
  let next = state
  next = rollJuniorBlocked(next, 'junior-1')
  next = rollJuniorBlocked(next, 'junior-2')
  next = rollSeniorProposal(next)
  next = rollIncident(next)
  return next
}

function rollJuniorBlocked(state: GameState, devId: string): GameState {
  const [roll, rngSeed] = nextRandom(state.rngSeed)
  const next = { ...state, rngSeed }
  const dev = next.team.find((m) => m.id === devId)
  if (!dev) return next

  const eligible = dev.assignedSubtaskId != null && !dev.blocked
  if (!eligible || roll >= JUNIOR_BLOCK_CHANCE_PER_BEAT) return next

  const subtask = next.project.subtasks.find((t) => t.id === dev.assignedSubtaskId)
  const blocked = updateTeamMember(next, devId, { blocked: true, unblockHoldProgress: 0 })
  return appendLog(
    blocked,
    `${dev.name} is stuck on ${specializationLabel[subtask?.specialization ?? ''] ?? 'their task'} and needs help.`,
    'warning',
  )
}

function rollSeniorProposal(state: GameState): GameState {
  const [roll, rngSeed] = nextRandom(state.rngSeed)
  const next = { ...state, rngSeed }
  const senior = next.team.find((m) => m.id === 'senior-1')
  if (!senior) return next

  const eligible = senior.assignedSubtaskId != null && next.pendingEvent === null
  if (!eligible || roll >= SENIOR_PROPOSAL_CHANCE_PER_BEAT) return next

  const subtask = next.project.subtasks.find((t) => t.id === senior.assignedSubtaskId)
  if (!subtask) return next

  const pendingEvent: PendingEvent = {
    id: `event-${next.quarter}-${next.sprint}-${next.eventLog.length}`,
    type: 'senior-refactor-proposal',
    subtaskId: subtask.id,
  }
  return appendLog(
    { ...next, pendingEvent },
    `${senior.name} proposes a quick refactor on ${specializationLabel[subtask.specialization]}.`,
    'info',
  )
}

function rollIncident(state: GameState): GameState {
  const [roll, rngSeed] = nextRandom(state.rngSeed)
  const next = { ...state, rngSeed }

  const eligible = next.project.subtasks.filter((t) => t.progress > 0 && !t.done)
  if (eligible.length === 0 || roll >= INCIDENT_CHANCE_PER_BEAT) return next

  const [targetRoll, targetSeed] = nextRandom(next.rngSeed)
  const withSeed = { ...next, rngSeed: targetSeed }
  const index = Math.min(Math.floor(targetRoll * eligible.length), eligible.length - 1)
  const target = eligible[index]

  const damaged = updateSubtask(withSeed, target.id, {
    progress: Math.max(0, target.progress - INCIDENT_PROGRESS_LOSS),
  })
  const withCount = {
    ...damaged,
    incidentsThisQuarter: damaged.incidentsThisQuarter + 1,
  }
  return appendLog(
    withCount,
    `Incident: a bug surfaced in ${specializationLabel[target.specialization]}, setting progress back.`,
    'danger',
  )
}
