// In-memory ring buffer of every named action dispatched through the store,
// for debugging. Deliberately not part of save state — it resets on reload.

export interface ActionLogEntry {
  seq: number
  timestamp: number
  action: string
  payload?: unknown
}

const MAX_ENTRIES = 200

const buffer: ActionLogEntry[] = []
let seq = 0

export function logAction(action: string, payload?: unknown): void {
  buffer.push({ seq: seq++, timestamp: Date.now(), action, payload })
  if (buffer.length > MAX_ENTRIES) buffer.shift()
}

export function getActionBuffer(): readonly ActionLogEntry[] {
  return buffer
}

export function clearActionBuffer(): void {
  buffer.length = 0
}
