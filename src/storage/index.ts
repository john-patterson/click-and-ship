import { IdbAdapter } from './IdbAdapter'
import type { StorageAdapter } from './StorageAdapter'

// TODO: swap for `new CapacitorAdapter()` when building the native iOS app.
export const storage: StorageAdapter = new IdbAdapter()

export type { StorageAdapter }
