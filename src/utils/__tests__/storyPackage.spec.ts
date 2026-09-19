import { beforeEach, describe, expect, it } from 'vitest'
import { Vector3 } from 'three'
import {
  createBlankStory,
  isStoryPackage,
  normalizeStory,
  readStories,
  saveStory,
} from '@/utils/storyPackage'

describe('story packages', () => {
  beforeEach(() => localStorage.clear())

  it('creates an independent editable story with one starter level', () => {
    const story = createBlankStory()
    expect(story.version).toBe(1)
    expect(story.levels).toHaveLength(1)
    expect(story.levels[0]?.panorama[0]?.url).toBe('/art/cave-01.svg')
  })

  it('normalizes imported vector coordinates back to Three vectors', () => {
    const story = createBlankStory()
    story.levels[0]!.panorama[0]!.click_points.push({
      vec: { x: 1, y: 2, z: 3 } as Vector3,
      accept_click_range: 1,
      name: '点',
      description: '说明',
      in_uv: false,
    })
    const normalized = normalizeStory(JSON.parse(JSON.stringify(story)))
    expect(normalized.levels[0]?.panorama[0]?.click_points[0]?.vec).toBeInstanceOf(Vector3)
  })

  it('persists and validates story packages separately from game saves', () => {
    const story = createBlankStory()
    saveStory(story)
    expect(readStories()).toHaveLength(1)
    expect(isStoryPackage(readStories()[0])).toBe(true)
    expect(isStoryPackage({ version: 1, levels: [] })).toBe(false)
    expect(
      isStoryPackage({
        ...story,
        levels: [{ name: '坏关卡', panorama: null, clues: [], problems: [] }],
      }),
    ).toBe(false)
  })
})
