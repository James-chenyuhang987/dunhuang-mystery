import { describe, expect, it } from 'vitest'
import { gameLocations } from '@/data/game'

describe('built-in Dunhuang ultraviolet resources', () => {
  it('uses dedicated UV textures and exposes the gilded inscription discovery', () => {
    const dunhuang = gameLocations.find((location) => location.id === 'dunhuang')
    expect(dunhuang).toBeDefined()

    const firstPanorama = dunhuang?.levels[0]?.panorama[0]
    expect(firstPanorama?.ultraviolet_url).toBe('/art/dunhuang-gilded-uv.svg')
    expect(firstPanorama?.click_points).toContainEqual(
      expect.objectContaining({ name: '镀金题记', in_uv: true }),
    )

    expect(dunhuang?.levels.slice(1).map((level) => level.panorama[0]?.ultraviolet_url)).toEqual([
      '/art/dunhuang-uv.svg',
      '/art/dunhuang-uv.svg',
    ])
  })
})
