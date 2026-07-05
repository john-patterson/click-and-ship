// Deterministic PRNG (mulberry32) seeded from save state, so random events
// are reproducible: replaying the same tick/deltaMs sequence from the same
// seed always produces the same rolls.

export function createRngSeed(): number {
  return Date.now() >>> 0
}

// Returns [value in [0, 1), nextSeed]. Threading nextSeed back into state
// before the next call keeps the sequence deterministic and JSON-serializable.
export function nextRandom(seed: number): [number, number] {
  let t = (seed + 0x6d2b79f5) >>> 0
  t = Math.imul(t ^ (t >>> 15), t | 1)
  t = (t + Math.imul(t ^ (t >>> 7), t | 61)) ^ t
  const value = ((t ^ (t >>> 14)) >>> 0) / 4294967296
  return [value, t >>> 0]
}
