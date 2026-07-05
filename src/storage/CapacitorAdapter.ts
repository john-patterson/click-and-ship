import type { StorageAdapter } from './StorageAdapter'

// TODO: implement with @capacitor/preferences once native (iOS) builds are
// set up. Swap this in for IdbAdapter in src/storage/index.ts at that point.
export class CapacitorAdapter implements StorageAdapter {
  async load(_key: string): Promise<string | null> {
    throw new Error('CapacitorAdapter is not implemented yet')
  }

  async save(_key: string, _value: string): Promise<void> {
    throw new Error('CapacitorAdapter is not implemented yet')
  }

  async remove(_key: string): Promise<void> {
    throw new Error('CapacitorAdapter is not implemented yet')
  }
}
