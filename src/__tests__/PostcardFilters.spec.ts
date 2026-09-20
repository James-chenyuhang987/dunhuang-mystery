import { describe, expect, it } from 'vitest'
import {
  applyPostcardFilterPixels,
  randomPostcardFilter,
  STYLIZED_POSTCARD_FILTERS,
  type PostcardFilter,
  type PostcardPixelBuffer,
} from '@/utils/postcardFilters'

function fixture(): PostcardPixelBuffer {
  const width = 4
  const height = 4
  const data = new Uint8ClampedArray(width * height * 4)
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4
      data[offset] = x < 2 ? 24 + y * 8 : 214 - y * 6
      data[offset + 1] = y < 2 ? 48 + x * 12 : 184 - x * 9
      data[offset + 2] = (x + y) * 28
      data[offset + 3] = 140 + x * 10 + y
    }
  }
  return { data, width, height }
}

describe('postcard pixel filters', () => {
  it('keeps original pixels unchanged without returning the source array', () => {
    const source = fixture()
    const output = applyPostcardFilterPixels(source, 'original')
    expect(output.data).not.toBe(source.data)
    expect([...output.data]).toEqual([...source.data])
  })

  it.each<PostcardFilter>(['anime', 'line-art', 'ink-wash'])(
    'applies structural %s processing while preserving alpha',
    (filter) => {
      const source = fixture()
      const output = applyPostcardFilterPixels(source, filter)
      expect([...output.data]).not.toEqual([...source.data])
      for (let offset = 3; offset < output.data.length; offset += 4)
        expect(output.data[offset]).toBe(source.data[offset])
    },
  )

  it('produces visibly distinct stylized outputs', () => {
    const source = fixture()
    const signatures = STYLIZED_POSTCARD_FILTERS.map((filter) =>
      [...applyPostcardFilterPixels(source, filter).data].join(','),
    )
    expect(new Set(signatures).size).toBe(STYLIZED_POSTCARD_FILTERS.length)
  })

  it('randomizes only across stylized filters', () => {
    expect(randomPostcardFilter(() => 0)).toBe('anime')
    expect(randomPostcardFilter(() => 0.5)).toBe('line-art')
    expect(randomPostcardFilter(() => 0.999999)).toBe('ink-wash')
    expect(STYLIZED_POSTCARD_FILTERS).not.toContain('original')
  })

  it('rejects malformed pixel buffers', () => {
    expect(() =>
      applyPostcardFilterPixels({ data: new Uint8ClampedArray(3), width: 1, height: 1 }, 'anime'),
    ).toThrow(RangeError)
  })
})
