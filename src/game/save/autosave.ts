import { storage } from '../../storage'
import { getGameState, useGameStore } from '../store'
import { migrate } from './migrations'
import { CURRENT_SAVE_VERSION, type SaveFile } from './schema'

const SAVE_KEY = 'click-and-ship-save'

export async function saveGame(): Promise<void> {
  const save: SaveFile = {
    version: CURRENT_SAVE_VERSION,
    state: getGameState(),
    lastSaveTimestamp: Date.now(),
  }
  await storage.save(SAVE_KEY, JSON.stringify(save))
}

export async function loadGame(): Promise<void> {
  const raw = await storage.load(SAVE_KEY)
  if (!raw) return

  const save = migrate(JSON.parse(raw))
  useGameStore.getState().hydrate(save.state)
}

// The game is fully turn-based, so state only changes on discrete player
// actions — persisting after every store change is cheap and means a closed
// tab never loses more than nothing.
export function startAutosave(): () => void {
  return useGameStore.subscribe(() => {
    void saveGame()
  })
}

function toBase64(json: string): string {
  const bytes = new TextEncoder().encode(json)
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })
  return btoa(binary)
}

function fromBase64(base64: string): string {
  const binary = atob(base64)
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

export async function exportSaveBase64(): Promise<string> {
  const save: SaveFile = {
    version: CURRENT_SAVE_VERSION,
    state: getGameState(),
    lastSaveTimestamp: Date.now(),
  }
  return toBase64(JSON.stringify(save))
}

export async function importSaveBase64(base64: string): Promise<void> {
  const save = migrate(JSON.parse(fromBase64(base64)))
  useGameStore.getState().hydrate(save.state)
  await storage.save(SAVE_KEY, JSON.stringify(save))
}
