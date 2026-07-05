import { del, get, set } from 'idb-keyval'
import type { StorageAdapter } from './StorageAdapter'

export class IdbAdapter implements StorageAdapter {
  async load(key: string): Promise<string | null> {
    const value = await get<string>(key)
    return value ?? null
  }

  async save(key: string, value: string): Promise<void> {
    await set(key, value)
  }

  async remove(key: string): Promise<void> {
    await del(key)
  }
}
