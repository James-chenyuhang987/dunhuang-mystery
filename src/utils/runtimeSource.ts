import type { author, level, StoryPackage } from '@/types/game'

export type SourceKind = 'builtin' | 'ugc'

export interface RuntimeSource {
  sourceKind: SourceKind
  sourceId: string
  sourceRevision: string
}

export interface RuntimeMetadata {
  id: string
  name: string
  subtitle: string
  coordinates: string
  background_url: string
  title?: string
  introduction?: string
  art_caption?: string
  art_caption_english?: string
}

export const GAME_STORAGE_PREFIX = 'dunhuang-mystery:game:v2'

export const STORY_LIMITS = {
  maxPackageCharacters: 4_000_000,
  maxStringCharacters: 200_000,
  maxLevels: 100,
  maxPanoramasPerLevel: 100,
  maxClickPointsPerPanorama: 1_000,
  maxCluesPerLevel: 1_000,
  maxProblemsPerLevel: 1_000,
  maxTimelineEntriesPerLevel: 1_000,
  maxAuthors: 100,
  maxSubclueDepth: 8,
  maxDialogueNodes: 500,
} as const

export const BUILTIN_ASSET_PREFIXES = ['/art/', '/dunhuang/', '/yungang/', '/entry/'] as const

/** Panorama/UV assets that are portable with an exported story package. */
export const BUILTIN_PANORAMA_ASSETS = new Set([
  '/art/cave-01.svg',
  '/art/cave-02.svg',
  '/art/cave-03.svg',
  '/dunhuang/panoramas/mogao-cave-172.png',
  '/dunhuang/panoramas/mogao-cave-322.png',
  '/dunhuang/panoramas/mogao-cave-420.png',
  '/yungang/yungang_cave3_pano.jpg',
  '/yungang/yungang_cave5_pano.jpg',
  '/yungang/yungang_cave6_pano.jpg',
])
export const BUILTIN_UV_ASSETS = new Set(['/art/dunhuang-gilded-uv.svg', '/art/dunhuang-uv.svg'])

export function isBuiltinPanoramaAsset(value: string): boolean {
  return BUILTIN_PANORAMA_ASSETS.has(value)
}

export function isCompatibleUvAsset(panorama: string, ultraviolet: string): boolean {
  if (!ultraviolet) return true
  if (!BUILTIN_UV_ASSETS.has(ultraviolet) || !BUILTIN_PANORAMA_ASSETS.has(panorama)) return false
  if (
    panorama === '/art/cave-01.svg' ||
    panorama === '/dunhuang/panoramas/mogao-cave-172.png'
  )
    return ultraviolet === '/art/dunhuang-gilded-uv.svg'
  if (
    panorama === '/art/cave-02.svg' ||
    panorama === '/art/cave-03.svg' ||
    panorama === '/dunhuang/panoramas/mogao-cave-322.png' ||
    panorama === '/dunhuang/panoramas/mogao-cave-420.png'
  )
    return ultraviolet === '/art/dunhuang-uv.svg'
  return false
}

export function isBuiltinAssetUrl(value: string): boolean {
  return BUILTIN_ASSET_PREFIXES.some((prefix) => value.startsWith(prefix))
}

export function isSafeAssetUrl(value: string): boolean {
  if (
    value.length === 0 ||
    value.length > STORY_LIMITS.maxStringCharacters ||
    /[\u0000-\u001f\u007f]/.test(value) ||
    value.startsWith('data:') ||
    value.startsWith('blob:') ||
    value.startsWith('//')
  )
    return false
  if (value.startsWith('/')) return !value.split('/').some((part) => part === '..')
  try {
    const url = new URL(value)
    return url.protocol === 'https:' && url.username === '' && url.password === ''
  } catch {
    return false
  }
}

export function createRuntimeSource(
  sourceKind: SourceKind,
  sourceId: string,
  sourceRevision: string,
): RuntimeSource {
  return { sourceKind, sourceId, sourceRevision }
}

export function sourceStorageKey(source: RuntimeSource): string {
  return `${GAME_STORAGE_PREFIX}:${source.sourceKind}:${encodeURIComponent(source.sourceId)}:${encodeURIComponent(source.sourceRevision)}`
}

export const gameStorageKey = sourceStorageKey

function canonicalize(value: unknown): unknown {
  if (value === undefined) return undefined
  if (typeof value === 'number' && !Number.isFinite(value)) return String(value)
  if (Array.isArray(value)) return value.map(canonicalize)
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>
    return Object.keys(record)
      .sort()
      .reduce<Record<string, unknown>>((result, key) => {
        const normalized = canonicalize(record[key])
        if (normalized !== undefined) result[key] = normalized
        return result
      }, {})
  }
  return value
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value))
}

function hash(text: string, seed: number, multiplier: number): number {
  let value = seed >>> 0
  for (let index = 0; index < text.length; index += 1) {
    value ^= text.charCodeAt(index)
    value = Math.imul(value, multiplier)
  }
  return value >>> 0
}

/** A deterministic, synchronous revision suitable for local storage keys. */
export function revisionFor(value: unknown): string {
  const serialized = canonicalJson(value)
  const first = hash(serialized, 2166136261, 16777619)
  const second = hash(serialized, 5381, 33)
  return `r1-${first.toString(16).padStart(8, '0')}-${second.toString(16).padStart(8, '0')}`
}

export function storyRevision(story: StoryPackage): string {
  return revisionFor(story)
}

export function configRevision(levels: level[], authors: author[] = []): string {
  return revisionFor({ levels, authors })
}

export function storyMetadata(story: StoryPackage): RuntimeMetadata {
  return {
    id: story.id,
    name: story.name,
    subtitle: story.subtitle,
    coordinates: story.coordinates,
    background_url: story.background_url,
    title: story.name,
    introduction: story.introduction,
  }
}

export function sourceEquals(left: RuntimeSource, right: RuntimeSource): boolean {
  return (
    left.sourceKind === right.sourceKind &&
    left.sourceId === right.sourceId &&
    left.sourceRevision === right.sourceRevision
  )
}
