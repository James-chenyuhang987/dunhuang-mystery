import { Vector3 } from 'three'
import type { StoryPackage, level } from '@/types/game'

export const STORY_STORAGE_KEY = 'dunhuang-mystery:stories:v1'

function newId(prefix: string): string {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`
}

export function createBlankLevel(index = 0): level {
  return {
    name: `未命名关卡 ${index + 1}`,
    subtitle: '新章节',
    description: '写下这一关的探索目标。',
    panorama: [{ name: '默认画面', url: '/art/cave-01.svg', click_points: [] }],
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

function normalizeLevel(value: level): level {
  return {
    ...value,
    panorama: value.panorama.map((panorama) => ({
      ...panorama,
      click_points: panorama.click_points.map((point) => ({
        ...point,
        vec: new Vector3(point.vec.x, point.vec.y, point.vec.z),
      })),
    })),
    clues: value.clues.map((clue) => ({
      ...clue,
      problem_indexes: clue.problem_indexes ? [...clue.problem_indexes] : undefined,
      dialogue: clue.dialogue
        ? {
            start: clue.dialogue.start,
            nodes: clue.dialogue.nodes.map((node) => ({
              ...node,
              options: node.options?.map((option) => ({ ...option })),
            })),
          }
        : undefined,
    })),
    problems: value.problems.map((problem) => ({ ...problem, select: [...problem.select] })),
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

function isStoryLevel(value: unknown): boolean {
  if (!value || typeof value !== 'object') return false
  const entry = value as Partial<level>
  if (
    typeof entry.name !== 'string' ||
    !Array.isArray(entry.panorama) ||
    !Array.isArray(entry.clues) ||
    !Array.isArray(entry.problems)
  )
    return false
  return entry.panorama.every((panorama) => {
    if (!panorama || typeof panorama !== 'object') return false
    const item = panorama as Partial<level['panorama'][number]>
    return (
      typeof item.name === 'string' &&
      typeof item.url === 'string' &&
      Array.isArray(item.click_points)
    )
  })
}

export function isStoryPackage(value: unknown): value is StoryPackage {
  if (!value || typeof value !== 'object') return false
  const item = value as Partial<StoryPackage>
  return (
    item.version === 1 &&
    typeof item.id === 'string' &&
    typeof item.name === 'string' &&
    typeof item.subtitle === 'string' &&
    typeof item.introduction === 'string' &&
    typeof item.coordinates === 'string' &&
    typeof item.background_url === 'string' &&
    Array.isArray(item.levels) &&
    item.levels.length > 0 &&
    item.levels.every(isStoryLevel) &&
    Array.isArray(item.authors) &&
    item.authors.every(
      (author) =>
        !!author &&
        typeof author === 'object' &&
        typeof (author as { name?: unknown }).name === 'string' &&
        typeof (author as { job?: unknown }).job === 'string',
    )
  )
}

export function readStories(): StoryPackage[] {
  try {
    const raw = localStorage.getItem(STORY_STORAGE_KEY)
    if (!raw) return []
    const parsed: unknown = JSON.parse(raw)
    return Array.isArray(parsed) && parsed.every(isStoryPackage)
      ? parsed.map((entry) => normalizeStory(entry))
      : []
  } catch {
    return []
  }
}

export function saveStory(story: StoryPackage): boolean {
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
