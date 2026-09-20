import { Vector3 } from 'three'
import type { StoryPackage, level } from '@/types/game'
import { DEFAULT_PANORAMA_FOV } from '@/utils/panorama'
import { isLevel } from '@/utils/utils'
import {
  GAME_STORAGE_PREFIX,
  isSafeAssetUrl,
  STORY_LIMITS,
  storyRevision as revisionForStory,
} from '@/utils/runtimeSource'

export const STORY_STORAGE_KEY = 'dunhuang-mystery:stories:v1'

export type StoryImportErrorCode =
  'invalid-json' | 'invalid-package' | 'unsupported-version' | 'duplicate-id-renamed'

export interface StoryImportIssue {
  code: StoryImportErrorCode
  message: string
  originalId?: string
}

export interface StoryImportResult {
  story: StoryPackage | null
  issue?: StoryImportIssue
}

function withinPackageLimit(value: unknown): boolean {
  try {
    const serialized = JSON.stringify(value)
    return typeof serialized === 'string' && serialized.length <= STORY_LIMITS.maxPackageCharacters
  } catch {
    return false
  }
}

function newId(prefix: string): string {
  const randomId =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID().replace(/-/g, '').slice(0, 16)
      : Math.random().toString(36).slice(2, 12)
  return `${prefix}-${Date.now().toString(36)}-${randomId}`
}

export function createBlankLevel(index = 0): level {
  return {
    name: `未命名关卡 ${index + 1}`,
    subtitle: '新章节',
    description: '写下这一关的探索目标。',
    panorama: [
      {
        name: '默认画面',
        url: '/art/cave-01.svg',
        initial_view: { longitude: 0, latitude: 0, fov: DEFAULT_PANORAMA_FOV },
        click_points: [],
      },
    ],
    clues: [],
    problems: [],
  }
}

export function createBlankStory(): StoryPackage {
  return {
    version: 1,
    id: newId('story'),
    name: '我的第一段故事',
    subtitle: '一场属于你的探索',
    introduction: '在这里写下故事的开场。',
    coordinates: 'MY STORY',
    background_url: '/art/landscape.svg',
    cover_url: '/art/landscape.svg',
    levels: [createBlankLevel()],
    authors: [{ name: '故事作者', job: 'Creator' }],
  }
}

function normalizeClue(value: level['clues'][number]): level['clues'][number] {
  return {
    ...value,
    problem_indexes: value.problem_indexes ? [...value.problem_indexes] : undefined,
    dialogue: value.dialogue
      ? {
          start: value.dialogue.start,
          nodes: value.dialogue.nodes.map((node) => ({
            ...node,
            options: node.options?.map((option) => ({ ...option })),
          })),
        }
      : undefined,
    subclues: value.subclues?.map(normalizeClue),
  }
}

function normalizeLevel(value: level): level {
  return {
    ...value,
    panorama: value.panorama.map((panorama) => ({
      ...panorama,
      initial_view: panorama.initial_view ? { ...panorama.initial_view } : undefined,
      click_points: panorama.click_points.map((point) => ({
        ...point,
        vec: new Vector3(point.vec.x, point.vec.y, point.vec.z),
      })),
    })),
    timeline: value.timeline?.map((entry) => ({
      ...entry,
      clue_indexes: [...entry.clue_indexes],
    })),
    hotspots: value.hotspots?.map((hotspot) =>
      hotspot.vec
        ? { ...hotspot, vec: new Vector3(hotspot.vec.x, hotspot.vec.y, hotspot.vec.z) }
        : { ...hotspot },
    ),
    clues: value.clues.map(normalizeClue),
    problems: value.problems.map((problem) => ({
      ...problem,
      select: [...problem.select],
      true_answers: problem.true_answers ? [...problem.true_answers] : undefined,
    })),
  }
}

export function normalizeStory(value: StoryPackage): StoryPackage {
  return {
    ...value,
    version: 1,
    levels: value.levels.map(normalizeLevel),
    authors: value.authors.map((author) => ({ ...author })),
  }
}

/** Return an isolated normalized copy of a stored story, if it exists. */
export function getStory(id: string): StoryPackage | undefined {
  const story = readStories().find((entry) => entry.id === id)
  return story ? normalizeStory(story) : undefined
}

function importIssue(
  code: Exclude<StoryImportErrorCode, 'duplicate-id-renamed'>,
  message: string,
): StoryImportResult {
  return { story: null, issue: { code, message } }
}

function uniqueImportedStoryId(existing: ReadonlySet<string>): string {
  let candidate = newId('story')
  let suffix = 0
  while (existing.has(candidate)) {
    suffix += 1
    candidate = `${newId('story')}-${suffix.toString(36)}`
  }
  return candidate
}

/** Parse, validate and normalize a JSON string or decoded story package. */
export function importStoryResult(raw: unknown): StoryImportResult {
  let parsed: unknown
  if (typeof raw === 'string') {
    if (raw.length > STORY_LIMITS.maxPackageCharacters)
      return importIssue('invalid-package', '故事包文件过大。')
    try {
      parsed = JSON.parse(raw) as unknown
    } catch {
      return importIssue('invalid-json', '故事包 JSON 无法解析。')
    }
  } else {
    parsed = raw
  }

  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
    return importIssue('invalid-package', '故事包格式无效。')
  if (!withinPackageLimit(parsed)) return importIssue('invalid-package', '故事包文件过大。')
  if ((parsed as { version?: unknown }).version !== 1)
    return importIssue('unsupported-version', '故事包版本不受支持。')
  if (!isStoryPackage(parsed)) return importIssue('invalid-package', '故事包格式无效。')

  let story = normalizeStory(parsed)
  const existing = new Set(readStories().map((entry) => entry.id))
  if (existing.has(story.id)) {
    const originalId = story.id
    story = { ...story, id: uniqueImportedStoryId(existing) }
    return {
      story,
      issue: {
        code: 'duplicate-id-renamed',
        message: '故事 ID 已存在，已生成新的本地 ID。',
        originalId,
      },
    }
  }
  return { story }
}

/** Parse, normalize and persist an imported story package. */
export function importStory(raw: unknown): StoryPackage | null {
  const result = importStoryResult(raw)
  if (!result.story || !saveStory(result.story)) return null
  return result.story
}

export const parseStoryPackage = importStoryResult

export function storyRevision(story: StoryPackage): string {
  return revisionForStory(normalizeStory(story))
}

export const getStoryRevision = storyRevision

export function removeClueFromLevel(target: level, index: number): boolean {
  if (!Number.isInteger(index) || index < 0 || index >= target.clues.length) return false
  const [removed] = target.clues.splice(index, 1)
  target.timeline = target.timeline?.map((entry) => ({
    ...entry,
    clue_indexes: entry.clue_indexes.flatMap((clueIndex) =>
      clueIndex === index ? [] : [clueIndex > index ? clueIndex - 1 : clueIndex],
    ),
  }))
  target.hotspots = target.hotspots
    ?.filter((hotspot) => hotspot.clue_index !== index)
    .map((hotspot) => ({
      ...hotspot,
      clue_index: hotspot.clue_index > index ? hotspot.clue_index - 1 : hotspot.clue_index,
    }))
  if (removed?.dialogue_id) {
    for (const panorama of target.panorama) {
      for (const point of panorama.click_points) {
        if (point.dialogue_id === removed.dialogue_id) delete point.dialogue_id
      }
    }
  }
  return true
}

export function isStoryPackage(value: unknown): value is StoryPackage {
  if (!value || typeof value !== 'object') return false
  if (!withinPackageLimit(value)) return false
  const item = value as Partial<StoryPackage>
  const keys = new Set([
    'version',
    'id',
    'name',
    'subtitle',
    'introduction',
    'coordinates',
    'background_url',
    'cover_url',
    'levels',
    'authors',
  ])
  return (
    Object.keys(value).every((key) => keys.has(key)) &&
    item.version === 1 &&
    typeof item.id === 'string' &&
    item.id.length > 0 &&
    item.id.length <= STORY_LIMITS.maxStringCharacters &&
    typeof item.name === 'string' &&
    item.name.length <= STORY_LIMITS.maxStringCharacters &&
    typeof item.subtitle === 'string' &&
    item.subtitle.length <= STORY_LIMITS.maxStringCharacters &&
    typeof item.introduction === 'string' &&
    item.introduction.length <= STORY_LIMITS.maxStringCharacters &&
    typeof item.coordinates === 'string' &&
    item.coordinates.length <= STORY_LIMITS.maxStringCharacters &&
    typeof item.background_url === 'string' &&
    isSafeAssetUrl(item.background_url) &&
    (item.cover_url === undefined ||
      item.cover_url === '' ||
      (typeof item.cover_url === 'string' && isSafeAssetUrl(item.cover_url))) &&
    Array.isArray(item.levels) &&
    item.levels.length > 0 &&
    item.levels.length <= STORY_LIMITS.maxLevels &&
    item.levels.every((entry: unknown) => isLevel(entry, true)) &&
    Array.isArray(item.authors) &&
    item.authors.length <= STORY_LIMITS.maxAuthors &&
    item.authors.every(
      (author) =>
        !!author &&
        typeof author === 'object' &&
        Object.keys(author).every((key) => key === 'name' || key === 'job') &&
        typeof (author as { name?: unknown }).name === 'string' &&
        (author as { name: string }).name.length <= STORY_LIMITS.maxStringCharacters &&
        typeof (author as { job?: unknown }).job === 'string' &&
        (author as { job: string }).job.length <= STORY_LIMITS.maxStringCharacters,
    )
  )
}

export function readStories(): StoryPackage[] {
  try {
    const raw = localStorage.getItem(STORY_STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed)
      ? parsed.filter(isStoryPackage).map((entry) => normalizeStory(entry))
      : []
  } catch {
    return []
  }
}

export function saveStory(story: StoryPackage): boolean {
  if (!isStoryPackage(story)) return false
  try {
    const stories = readStories().filter((entry) => entry.id !== story.id)
    stories.push(normalizeStory(story))
    localStorage.setItem(STORY_STORAGE_KEY, JSON.stringify(stories))
    return true
  } catch {
    return false
  }
}

export function removeStory(id: string): void {
  try {
    localStorage.setItem(
      STORY_STORAGE_KEY,
      JSON.stringify(readStories().filter((story) => story.id !== id)),
    )
  } catch {
    /* A full or disabled storage should not break the editor. */
  } finally {
    removeStoryGameSaves(id)
  }
}

/** Remove every revision-isolated game save belonging to a story. */
export function removeStoryGameSaves(id: string): void {
  const prefix = `${GAME_STORAGE_PREFIX}:ugc:${encodeURIComponent(id)}:`
  try {
    const keys: string[] = []
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index)
      if (key?.startsWith(prefix)) keys.push(key)
    }
    for (const key of keys) localStorage.removeItem(key)
  } catch {
    /* A full or disabled storage should not break the editor. */
  }
}

export function downloadStory(story: StoryPackage): void {
  const blob = new Blob([JSON.stringify(story, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${story.name || '我的故事'}.json`
  link.click()
  URL.revokeObjectURL(url)
}
