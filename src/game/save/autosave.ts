import { storage } from '../../storage'
import { OFFLINE_PROGRESS_CAP_MS } from '../constants'
import { getGameState, useGameStore } from '../store'
import { migrate } from './migrations'
import { CURRENT_SAVE_VERSION, type SaveFile } from './schema'

const SAVE_KEY = 'click-and-ship-save'
const DEFAULT_AUTOSAVE_INTERVAL_MS = 15_000

let lastSaveTimestamp = Date.now()

export function elapsedSinceLastSave(): number {
  return Date.now() - lastSaveTimestamp
}

export async function saveGame(): Promise<void> {
  lastSaveTimestamp = Date.now()
  const save: SaveFile = {
    version: CURRENT_SAVE_VERSION,
    state: getGameState(),
    lastSaveTimestamp,
  }
  await storage.save(SAVE_KEY, JSON.stringify(save))
}

export async function loadGame(): Promise<void> {
  const raw = await storage.load(SAVE_KEY)
  if (!raw) return

  const save = migrate(JSON.parse(raw))
  lastSaveTimestamp = save.lastSaveTimestamp
  useGameStore.getState().hydrate(save.state)

  // Capped rather than fully simulated: at most one sprint's worth of
  // progress resolves silently on load, so a long-absent player never comes
  // back to a quarter (and grade) that happened invisibly.
  const elapsed = Math.min(elapsedSinceLastSave(), OFFLINE_PROGRESS_CAP_MS)
  useGameStore.getState().advanceTick(elapsed)
}

export function startAutosave(
  intervalMs = DEFAULT_AUTOSAVE_INTERVAL_MS,
): () => void {
  const interval = setInterval(() => {
    void saveGame()
  }, intervalMs)

  const onVisibilityChange = () => {
    if (document.visibilityState === 'hidden') {
      void saveGame()
    }
  }
  document.addEventListener('visibilitychange', onVisibilityChange)

  return () => {
    clearInterval(interval)
    document.removeEventListener('visibilitychange', onVisibilityChange)
  }
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
  lastSaveTimestamp = save.lastSaveTimestamp
  useGameStore.getState().hydrate(save.state)
  await storage.save(SAVE_KEY, JSON.stringify(save))
}
