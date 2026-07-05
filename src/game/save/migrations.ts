import { createRngSeed } from '../rng'
import { createInitialGameState, CURRENT_SAVE_VERSION, type SaveFile } from './schema'

// Old save shapes are frozen here, not in schema.ts, since schema.ts only
// needs to describe the current version. Each interface declares just the
// fields the migration steps actually read.

// v1: the original clicker prototype (a single counter).
interface SaveFileV1 {
  version: 1
  state: { clicks: number }
  lastSaveTimestamp: number
}

// v2: the real-time prototype (team assignments, tick-driven sprints). Only
// rngSeed and runNumber survive into v3, so only those are declared.
interface SaveFileV2 {
  version: 2
  state: { rngSeed?: number; runNumber?: number }
  lastSaveTimestamp: number
}

// Add an entry here whenever CURRENT_SAVE_VERSION is bumped: the key is the
// version being migrated FROM, and the function returns a save shaped like
// the next version. migrate() applies these sequentially until it reaches
// CURRENT_SAVE_VERSION.
const migrationSteps: Record<number, (save: never) => unknown> = {
  1: (save: SaveFileV1): SaveFileV2 => ({
    version: 2,
    // Nothing in a v1 save maps onto v2 state; the v2->v3 step fills in
    // defaults for the fields it needs.
    state: {},
    lastSaveTimestamp: save.lastSaveTimestamp,
  }),
  2: (save: SaveFileV2) => ({
    version: 3,
    // DESIGN NOTE: v2 was a real-time game with a completely different state
    // shape (per-dev assignments, tick timers), so there is no meaningful
    // mapping onto the turn-based v3 run. The run restarts fresh; the RNG
    // seed and run number carry over so the save keeps its identity.
    state: {
      ...createInitialGameState(save.state.runNumber ?? 1, save.state.rngSeed ?? createRngSeed()),
    },
    lastSaveTimestamp: save.lastSaveTimestamp,
  }),
}

export function migrate(save: unknown): SaveFile {
  let current = save as { version: number }

  while (current.version < CURRENT_SAVE_VERSION) {
    const step = migrationSteps[current.version]
    if (!step) {
      throw new Error(
        `No migration registered for save version ${current.version} (current version is ${CURRENT_SAVE_VERSION})`,
      )
    }
    current = step(current as never) as { version: number }
  }

  return current as SaveFile
}
