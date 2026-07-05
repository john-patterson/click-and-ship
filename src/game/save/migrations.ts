import { CURRENT_SAVE_VERSION, type SaveFile } from './schema'

// Add an entry here whenever CURRENT_SAVE_VERSION is bumped: the key is the
// version being migrated FROM, and the function returns a save shaped like
// the next version. migrate() applies these sequentially until it reaches
// CURRENT_SAVE_VERSION.
//
// Example, when bumping from 1 to 2:
// 1: (save) => ({ ...save, version: 2, state: { ...save.state, gold: 0 } }),
const migrationSteps: Record<number, (save: never) => unknown> = {}

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
