import { beforeEach, describe, expect, it } from 'vitest'
import { Vector3 } from 'three'
import type { StoryPackage } from '@/types/game'
import {
  createBlankStory,
  importStoryResult,
  isStoryPackage,
  normalizeStory,
  parseStoryPackage,
  readStories,
  removeClueFromLevel,
  removeStory,
  removeStoryGameSaves,
  saveStory,
  STORY_STORAGE_KEY,
} from '@/utils/storyPackage'
import { sourceStorageKey } from '@/utils/runtimeSource'

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

  it('validates, clones and restores timeline and initial-view config', () => {
    const story = createBlankStory()
    const configured = story.levels[0]!
    configured.panorama[0]!.initial_view = { longitude: 180, latitude: 30, fov: 70 }
    configured.clues.push({ type: 'text', name: '朝代线索', data: '石窟营造记录' })
    configured.timeline = [{ label: '北魏', panorama_index: 0, clue_indexes: [0] }]
    configured.hotspots = [{ clue_index: 0, vec: new Vector3(-5, 8, -2) }]

    const imported = JSON.parse(JSON.stringify(story))
    expect(isStoryPackage(imported)).toBe(true)
    const normalized = normalizeStory(imported)
    expect(normalized.levels[0]?.panorama[0]?.initial_view).toEqual({
      longitude: 180,
      latitude: 30,
      fov: 70,
    })
    expect(normalized.levels[0]?.timeline).toEqual([
      { label: '北魏', panorama_index: 0, clue_indexes: [0] },
    ])
    expect(normalized.levels[0]?.hotspots?.[0]?.vec).toBeInstanceOf(Vector3)

    normalized.levels[0]!.panorama[0]!.initial_view!.latitude = 20
    normalized.levels[0]!.timeline![0]!.clue_indexes.push(0)
    expect(imported.levels[0].panorama[0].initial_view.latitude).toBe(30)
    expect(imported.levels[0].timeline[0].clue_indexes).toEqual([0])

    expect(saveStory(story)).toBe(true)
    const restored = readStories()[0]
    expect(restored?.levels[0]?.panorama[0]?.initial_view?.fov).toBe(70)
    expect(restored?.levels[0]?.timeline?.[0]?.label).toBe('北魏')
    expect(restored?.levels[0]?.hotspots?.[0]?.vec).toBeInstanceOf(Vector3)
  })

  it('keeps older UGC without a semantic timeline compatible', () => {
    const story = createBlankStory()
    story.levels[0]!.clues.push({
      type: 'text',
      name: '旧线索',
      data: '旧编辑器允许暂存尚未创建的题目关联。',
      problem_indexes: [0],
    })
    const imported = JSON.parse(JSON.stringify(story))
    expect(imported.levels[0].timeline).toBeUndefined()
    expect(isStoryPackage(imported)).toBe(true)
    expect(normalizeStory(imported).levels[0]?.timeline).toBeUndefined()
  })

  it('rejects invalid timeline and initial-view references', () => {
    const story = createBlankStory()
    story.levels[0]!.clues.push({ type: 'text', name: '线索', data: '内容' })
    story.levels[0]!.timeline = [{ label: '节点', panorama_index: 1, clue_indexes: [0] }]
    expect(isStoryPackage(story)).toBe(false)

    story.levels[0]!.timeline = [{ label: '节点', panorama_index: 0, clue_indexes: [1] }]
    expect(isStoryPackage(story)).toBe(false)

    story.levels[0]!.timeline = [{ label: '节点', panorama_index: 0, clue_indexes: [0] }]
    story.levels[0]!.panorama[0]!.initial_view = { longitude: 180, latitude: 30, fov: 120 }
    expect(isStoryPackage(story)).toBe(false)
  })

  it('remaps timeline, hotspots and dialogue points when deleting a clue', () => {
    const story = createBlankStory()
    const level = story.levels[0]!
    level.clues.push(
      { type: 'text', name: '第一条', data: '一' },
      {
        type: 'dialogue',
        name: '人物对话',
        data: '对话',
        dialogue_id: 'guide',
        dialogue: {
          start: 'start',
          nodes: [{ id: 'start', speaker: '向导', text: '你好', next: null }],
        },
      },
      { type: 'text', name: '第三条', data: '三' },
    )
    level.timeline = [
      { label: '前段', panorama_index: 0, clue_indexes: [0, 1] },
      { label: '后段', panorama_index: 0, clue_indexes: [2] },
    ]
    level.hotspots = [
      { clue_index: 0, x: 20, y: 20 },
      { clue_index: 1, x: 50, y: 50 },
      { clue_index: 2, x: 80, y: 80 },
    ]
    level.panorama[0]!.click_points.push({
      vec: new Vector3(10, 0, 0),
      accept_click_range: 1,
      name: '向导',
      description: '开始对话',
      in_uv: false,
      dialogue_id: 'guide',
    })

    expect(removeClueFromLevel(level, 1)).toBe(true)
    expect(level.clues.map((clue) => clue.name)).toEqual(['第一条', '第三条'])
    expect(level.timeline?.map((entry) => entry.clue_indexes)).toEqual([[0], [1]])
    expect(level.hotspots?.map((hotspot) => hotspot.clue_index)).toEqual([0, 1])
    expect(level.panorama[0]?.click_points[0]?.dialogue_id).toBeUndefined()
    expect(isStoryPackage(story)).toBe(true)
  })

  it('isolates corrupt stored entries and rejects invalid saves without overwriting data', () => {
    const valid = createBlankStory()
    const invalid = { ...createBlankStory(), levels: [] }
    localStorage.setItem(STORY_STORAGE_KEY, JSON.stringify([valid, invalid]))

    expect(readStories().map((story) => story.id)).toEqual([valid.id])
    expect(saveStory(invalid as StoryPackage)).toBe(false)
    const stored = JSON.parse(localStorage.getItem(STORY_STORAGE_KEY) ?? '[]')
    expect(stored).toHaveLength(2)
    expect(readStories().map((story) => story.id)).toEqual([valid.id])
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

  it('reports import failures and renames an existing local id', () => {
    expect(importStoryResult('{broken')).toMatchObject({
      story: null,
      issue: { code: 'invalid-json' },
    })
    expect(importStoryResult(JSON.stringify({ version: 2 }))).toMatchObject({
      story: null,
      issue: { code: 'unsupported-version' },
    })
    expect(parseStoryPackage('x'.repeat(4_000_001))).toMatchObject({
      story: null,
      issue: { code: 'invalid-package' },
    })

    const story = createBlankStory()
    expect(saveStory(story)).toBe(true)
    const imported = importStoryResult(JSON.stringify(story))
    expect(imported.issue?.code).toBe('duplicate-id-renamed')
    expect(imported.issue?.originalId).toBe(story.id)
    expect(imported.story?.id).toBeTruthy()
    expect(imported.story?.id).not.toBe(story.id)
  })

  it('cleans all revision-isolated saves when a story is removed', () => {
    const story = createBlankStory()
    expect(saveStory(story)).toBe(true)
    const first = sourceStorageKey({
      sourceKind: 'ugc',
      sourceId: story.id,
      sourceRevision: 'r1-a',
    })
    const second = sourceStorageKey({
      sourceKind: 'ugc',
      sourceId: story.id,
      sourceRevision: 'r1-b',
    })
    const other = sourceStorageKey({ sourceKind: 'ugc', sourceId: 'other', sourceRevision: 'r1-a' })
    localStorage.setItem(first, '{}')
    localStorage.setItem(second, '{}')
    localStorage.setItem(other, '{}')

    removeStoryGameSaves(story.id)
    expect(localStorage.getItem(first)).toBeNull()
    expect(localStorage.getItem(second)).toBeNull()
    expect(localStorage.getItem(other)).toBe('{}')

    localStorage.setItem(first, '{}')
    removeStory(story.id)
    expect(readStories()).toEqual([])
    expect(localStorage.getItem(first)).toBeNull()
  })
})
