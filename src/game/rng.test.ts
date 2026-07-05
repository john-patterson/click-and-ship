import { describe, expect, it } from 'vitest'
import { nextInt, nextRandom } from './rng'

describe('nextRandom', () => {
  it('produces an identical sequence from the same seed', () => {
    const seedA = 12345
    const seedB = 12345

    const seqA: number[] = []
    let s = seedA
    for (let i = 0; i < 10; i++) {
      const [value, next] = nextRandom(s)
      seqA.push(value)
      s = next
    }

    const seqB: number[] = []
    s = seedB
    for (let i = 0; i < 10; i++) {
      const [value, next] = nextRandom(s)
      seqB.push(value)
      s = next
    }

    expect(seqA).toEqual(seqB)
  })

  it('diverges for different seeds', () => {
    const [valueA] = nextRandom(1)
    const [valueB] = nextRandom(2)
    expect(valueA).not.toEqual(valueB)
  })

  it('always returns a value in [0, 1)', () => {
    let seed = 42
    for (let i = 0; i < 1000; i++) {
      const [value, next] = nextRandom(seed)
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThan(1)
      seed = next
    }
  })
})

describe('nextInt', () => {
  it('stays within [min, max] inclusive and hits both ends', () => {
    let seed = 7
    const seen = new Set<number>()
    for (let i = 0; i < 1000; i++) {
      const [value, next] = nextInt(seed, -2, 2)
      expect(value).toBeGreaterThanOrEqual(-2)
      expect(value).toBeLessThanOrEqual(2)
      seen.add(value)
      seed = next
    }
    expect(seen).toEqual(new Set([-2, -1, 0, 1, 2]))
  })
})
