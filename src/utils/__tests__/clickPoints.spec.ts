import { describe, expect, it } from 'vitest'
import { Vector3 } from 'three'
import type { ClickPoint } from '@/types/game'
import { findMatchingClickPoint } from '@/utils/clickPoints'

function point(x: number, range: number, inUv = false): ClickPoint {
  return {
    vec: new Vector3(x, 0, 0),
    accept_click_range: range,
    name: `点 ${x}`,
    description: '测试发现',
    in_uv: inUv,
  }
}

describe('findMatchingClickPoint', () => {
  it('includes the configured distance boundary and rejects positions outside it', () => {
    const points = [point(10, 1)]
    expect(findMatchingClickPoint(new Vector3(9, 0, 0), points, false)).toBe(0)
    expect(findMatchingClickPoint(new Vector3(8.999, 0, 0), points, false)).toBeNull()
  })

  it('only matches points for the active normal or ultraviolet mode', () => {
    const points = [point(10, 1), point(10, 1, true)]
    expect(findMatchingClickPoint(new Vector3(10, 0, 0), points, false)).toBe(0)
    expect(findMatchingClickPoint(new Vector3(10, 0, 0), points, true)).toBe(1)
  })

  it('selects the nearest eligible point when ranges overlap', () => {
    const points = [point(8, 4), point(9.5, 4), point(10, 4, true)]
    expect(findMatchingClickPoint(new Vector3(10, 0, 0), points, false)).toBe(1)
  })
})
