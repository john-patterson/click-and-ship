import { createInitialGameState, CURRENT_SAVE_VERSION, type SaveFile } from './schema'

// The pre-v2 save shape (a single clicker counter). Kept here, not in
// schema.ts, since schema.ts only needs to describe the current version.
interface SaveFileV1 {
  version: 1
  state: { clicks: number }
  lastSaveTimestamp: number
}

// Add an entry here whenever CURRENT_SAVE_VERSION is bumped: the key is the
// version being migrated FROM, and the function returns a save shaped like
// the next version. migrate() applies these sequentially until it reaches
// CURRENT_SAVE_VERSION.
const migrationSteps: Record<number, (save: never) => unknown> = {
  1: (save: SaveFileV1) => ({
    version: 2,
    state: createInitialGameState(),
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
