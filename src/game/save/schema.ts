export const CURRENT_SAVE_VERSION = 2

export type Specialization = 'product' | 'design' | 'fe' | 'be'
export type DevArchetype = 'junior' | 'senior'
export type RunPhase = 'active' | 'quarter-review' | 'game-over'
export type EventLogKind = 'info' | 'warning' | 'success' | 'danger'
export type PendingEventType = 'senior-refactor-proposal'

export interface TeamMember {
  id: string
  name: string
  archetype: DevArchetype
  assignedSubtaskId: string | null
  blocked: boolean
  unblockHoldProgress: number // 0..1, only meaningful while blocked
}

export interface SubTask {
  id: string
  specialization: Specialization
  progress: number // 0..100
  done: boolean
  managerFilling: boolean
}

export interface Project {
  id: string
  name: string
  subtasks: SubTask[] // always exactly one per Specialization
}

export interface EventLogEntry {
  id: string
  quarter: number
  sprint: number
  message: string
  kind: EventLogKind
}

export interface PendingEvent {
  id: string
  type: PendingEventType
  subtaskId: string
}

export interface QuarterReviewResult {
  quarter: number
  score: number
  grade: 'A' | 'B' | 'C' | 'D' | 'F'
  passed: boolean
  subtasksCompleted: number
  incidents: number
  managerFillSpend: number
}

export interface GameState {
  team: TeamMember[]
  project: Project
  managerTimeBudget: number
  managerTimeBudgetMax: number
  sprint: number
  quarter: number
  sprintElapsedMs: number
  eventLog: EventLogEntry[]
  pendingEvent: PendingEvent | null
  rngSeed: number
  phase: RunPhase
  lastQuarterResult: QuarterReviewResult | null
  runNumber: number
  subtasksCompletedThisQuarter: number
  incidentsThisQuarter: number
  managerFillSpendThisQuarter: number
}

export interface SaveFileV2 {
  version: 2
  state: GameState
  lastSaveTimestamp: number
}

// Union this with SaveFileV3, etc. as the schema evolves.
export type SaveFile = SaveFileV2

export function createInitialGameState(): GameState {
  return {
    team: [
      {
        id: 'junior-1',
        name: 'Alex',
        archetype: 'junior',
        assignedSubtaskId: null,
        blocked: false,
        unblockHoldProgress: 0,
      },
      {
        id: 'junior-2',
        name: 'Sam',
        archetype: 'junior',
        assignedSubtaskId: null,
        blocked: false,
        unblockHoldProgress: 0,
      },
      {
        id: 'senior-1',
        name: 'Priya',
        archetype: 'senior',
        assignedSubtaskId: null,
        blocked: false,
        unblockHoldProgress: 0,
      },
    ],
    project: createProject(1),
    managerTimeBudget: 100,
    managerTimeBudgetMax: 100,
    sprint: 1,
    quarter: 1,
    sprintElapsedMs: 0,
    eventLog: [],
    pendingEvent: null,
    rngSeed: Date.now() >>> 0,
    phase: 'active',
    lastQuarterResult: null,
    runNumber: 1,
    subtasksCompletedThisQuarter: 0,
    incidentsThisQuarter: 0,
    managerFillSpendThisQuarter: 0,
  }
}

export function createProject(quarter: number): Project {
  const specializations: Specialization[] = ['product', 'design', 'fe', 'be']
  return {
    id: `project-q${quarter}`,
    name: `Q${quarter} Launch`,
    subtasks: specializations.map((specialization) => ({
      id: `subtask-${specialization}`,
      specialization,
      progress: 0,
      done: false,
      managerFilling: false,
    })),
  }
}
