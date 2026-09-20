import { Vector3 } from 'three'
import { gameAuthors, gameLevels, gameLocations } from '@/data/game'
import type { Attempt, authors, Difficulty, ImagePanorama, level, problem } from '@/types/game'
import type { GameMode, GameRound, GameState, Snapshot } from '@/types/gamestore'
import {
  isBuiltinPanoramaAsset,
  isCompatibleUvAsset,
  isSafeAssetUrl,
  STORY_LIMITS,
} from '@/utils/runtimeSource'

export function questionFingerprint(levels: level[]): string {
  // Presentation and explanation edits do not invalidate answers or shuffled indexes.
  return JSON.stringify(
    levels.map((entry) =>
      entry.problems.map(({ title, select, true_answer, true_answers }) => ({
        title,
        select,
        true_answer,
        true_answers,
      })),
    ),
  )
}

export function defaultLocationId(): string {
  return gameLocations[0]?.id ?? ''
}

export function locationLevels(locationId: string): level[] | undefined {
  if (gameLocations.length === 0 && locationId === '') return gameLevels
  return gameLocations.find((entry) => entry.id === locationId)?.levels
}

function copyClue(item: level['clues'][number]): level['clues'][number] {
  return {
    ...item,
    problem_indexes: item.problem_indexes ? [...item.problem_indexes] : undefined,
    dialogue: item.dialogue
      ? {
          start: item.dialogue.start,
          nodes: item.dialogue.nodes.map((node) => ({
            ...node,
            options: node.options?.map((option) => ({ ...option })),
          })),
        }
      : undefined,
    subclues: item.subclues?.map(copyClue),
  }
}

export function copyLevels(source: level[]): level[] {
  return source.map((entry) => ({
    ...entry,
    panorama: entry.panorama.map((panorama) => ({
      ...panorama,
      initial_view: panorama.initial_view ? { ...panorama.initial_view } : undefined,
      click_points: panorama.click_points.map((point) => ({
        ...point,
        vec: new Vector3(point.vec.x, point.vec.y, point.vec.z),
      })),
    })),
    timeline: entry.timeline?.map((item) => ({
      ...item,
      clue_indexes: [...item.clue_indexes],
    })),
    hotspots: entry.hotspots?.map((item) =>
      item.vec ? { ...item, vec: new Vector3(item.vec.x, item.vec.y, item.vec.z) } : { ...item },
    ),
    clues: entry.clues.map(copyClue),
    problems: entry.problems.map((item) => ({
      ...item,
      select: [...item.select],
      true_answers: item.true_answers ? [...item.true_answers] : undefined,
    })),
  }))
}

export function copyAuthors(source: authors): authors {
  return source.map((entry) => ({ ...entry }))
}

export function copyConfig(
  locationId = defaultLocationId(),
): Pick<GameState, 'levels' | 'authors'> {
  return {
    levels: copyLevels(locationLevels(locationId) ?? []),
    authors: copyAuthors(gameAuthors),
  }
}

export function countFor(total: number, difficulty: Difficulty): number {
  return difficulty === 1 ? Math.min(1, total) : difficulty === 2 ? Math.ceil(total / 2) : total
}

export function shuffle(total: number): number[] {
  const indexes = Array.from({ length: total }, (_, index) => index)
  for (let index = indexes.length - 1; index > 0; index -= 1) {
    const otherIndex = Math.floor(Math.random() * (index + 1))
    const current = indexes[index]
    const other = indexes[otherIndex]
    if (current !== undefined && other !== undefined) {
      indexes[index] = other
      indexes[otherIndex] = current
    }
  }
  return indexes
}

export function clickPointKey(
  levelIndex: number,
  panoramaIndex: number,
  pointIndex: number,
): string {
  return `${levelIndex}:${panoramaIndex}:${pointIndex}`
}

export function validClickPointKey(levels: level[], key: string): boolean {
  if (!/^\d+:\d+:\d+$/.test(key)) return false
  const [levelIndex, panoramaIndex, pointIndex] = key.split(':').map(Number)
  return (
    levels[levelIndex ?? -1]?.panorama[panoramaIndex ?? -1]?.click_points[pointIndex ?? -1] !==
    undefined
  )
}

export function validClueKey(levels: level[], key: string): boolean {
  if (!/^\d+:\d+$/.test(key)) return false
  const [levelIndex, clueIndex] = key.split(':').map(Number)
  return levels[levelIndex ?? -1]?.clues[clueIndex ?? -1] !== undefined
}

export function clueKey(levelIndex: number, clueIndex: number): string {
  return `${levelIndex}:${clueIndex}`
}

export function selectedIndexes(
  state: Pick<GameState, 'levels' | 'rounds' | 'difficulty'>,
  index: number,
): number[] {
  const entry = state.levels[index]
  const round = state.rounds.find((item) => item.levelIndex === index)
  return entry && round
    ? round.questionOrder.slice(
        0,
        countFor(entry.problems.length, round.completedDifficulty ?? state.difficulty),
      )
    : []
}

export function solvedIndexes(
  state: Pick<GameState, 'levels' | 'rounds' | 'difficulty' | 'attempts'>,
): number[] {
  return state.levels.flatMap((_, levelIndex) => {
    const selected = selectedIndexes(state, levelIndex)
    return state.rounds.some((round) => round.levelIndex === levelIndex) &&
      selected.every((problemIndex) =>
        state.attempts.some(
          (attempt) => attempt.levelIndex === levelIndex && attempt.problemIndex === problemIndex,
        ),
      )
      ? [levelIndex]
      : []
  })
}

export function correctlySolvedIndexes(
  state: Pick<GameState, 'levels' | 'rounds' | 'difficulty' | 'attempts'>,
): number[] {
  return state.levels.flatMap((_, levelIndex) => {
    const selected = selectedIndexes(state, levelIndex)
    return state.rounds.some((round) => round.levelIndex === levelIndex) &&
      selected.every((problemIndex) =>
        state.attempts.some(
          (attempt) =>
            attempt.levelIndex === levelIndex &&
            attempt.problemIndex === problemIndex &&
            attempt.correct,
        ),
      )
      ? [levelIndex]
      : []
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function hasOnlyKeys(value: Record<string, unknown>, allowed: readonly string[]): boolean {
  const keys = new Set(allowed)
  return Object.keys(value).every((key) => keys.has(key))
}

function isBoundedString(value: unknown): value is string {
  return typeof value === 'string' && value.length <= STORY_LIMITS.maxStringCharacters
}

function isWithinPackageLimit(value: unknown): boolean {
  try {
    const serialized = JSON.stringify(value)
    return typeof serialized === 'string' && serialized.length <= STORY_LIMITS.maxPackageCharacters
  } catch {
    return false
  }
}

export function isInteger(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max
}

function isDifficulty(value: unknown): value is Difficulty {
  return value === 1 || value === 2 || value === 3
}

function isTime(value: unknown): value is number {
  return (
    typeof value === 'number' &&
    Number.isFinite(value) &&
    value >= 0 &&
    value <= Number.MAX_SAFE_INTEGER
  )
}

function isProblem(value: unknown): value is problem {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ['title', 'select', 'true_answer', 'true_answers', 'reason']) &&
    isBoundedString(value.title) &&
    isBoundedString(value.reason) &&
    Array.isArray(value.select) &&
    value.select.length === 4 &&
    value.select.every((entry: unknown) => isBoundedString(entry)) &&
    isInteger(value.true_answer, 0, 3) &&
    (value.true_answers === undefined ||
      (Array.isArray(value.true_answers) &&
        value.true_answers.length > 0 &&
        value.true_answers.length <= 4 &&
        new Set(value.true_answers).size === value.true_answers.length &&
        value.true_answers.every((entry: unknown) => isInteger(entry, 0, 3))))
  )
}

/** Normalize a persisted answer while preserving whether it was a multi-select value. */
function attemptAnswerIndexes(value: unknown): number[] | null {
  const values = Array.isArray(value) ? value : [value]
  if (
    values.length === 0 ||
    values.length > 4 ||
    !values.every((entry: unknown) => isInteger(entry, 0, 3))
  )
    return null
  const sorted = [...(values as number[])].sort((left, right) => left - right)
  return new Set(sorted).size === sorted.length ? sorted : null
}

function expectedAnswerIndexes(question: problem): number[] {
  return [...(question.true_answers?.length ? question.true_answers : [question.true_answer])].sort(
    (left, right) => left - right,
  )
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || isBoundedString(value)
}

function isOptionalAssetUrl(value: unknown): boolean {
  return value === undefined || value === '' || (isBoundedString(value) && isSafeAssetUrl(value))
}

function isVector(value: unknown): value is { x: number; y: number; z: number } {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ['x', 'y', 'z']) &&
    typeof value.x === 'number' &&
    Number.isFinite(value.x) &&
    typeof value.y === 'number' &&
    Number.isFinite(value.y) &&
    typeof value.z === 'number' &&
    Number.isFinite(value.z)
  )
}

function isPanorama(value: unknown, portableAssets = false): value is ImagePanorama {
  return (
    isRecord(value) &&
    hasOnlyKeys(value, ['name', 'url', 'ultraviolet_url', 'initial_view', 'click_points']) &&
    isBoundedString(value.name) &&
    isBoundedString(value.url) &&
    (!portableAssets || isBuiltinPanoramaAsset(value.url)) &&
    isOptionalAssetUrl(value.ultraviolet_url) &&
    (!portableAssets ||
      isCompatibleUvAsset(
        value.url,
        typeof value.ultraviolet_url === 'string' ? value.ultraviolet_url : '',
      )) &&
    (value.initial_view === undefined ||
      (isRecord(value.initial_view) &&
        hasOnlyKeys(value.initial_view, ['longitude', 'latitude', 'fov']) &&
        typeof value.initial_view.longitude === 'number' &&
        Number.isFinite(value.initial_view.longitude) &&
        value.initial_view.longitude >= -180 &&
        value.initial_view.longitude <= 180 &&
        typeof value.initial_view.latitude === 'number' &&
        Number.isFinite(value.initial_view.latitude) &&
        value.initial_view.latitude >= -90 &&
        value.initial_view.latitude <= 90 &&
        (value.initial_view.fov === undefined ||
          (typeof value.initial_view.fov === 'number' &&
            Number.isFinite(value.initial_view.fov) &&
            value.initial_view.fov >= 30 &&
            value.initial_view.fov <= 100)))) &&
    Array.isArray(value.click_points) &&
    value.click_points.length <= STORY_LIMITS.maxClickPointsPerPanorama &&
    value.click_points.every(
      (point: unknown) =>
        isRecord(point) &&
        hasOnlyKeys(point, [
          'vec',
          'accept_click_range',
          'name',
          'description',
          'image',
          'in_uv',
          'dialogue_id',
        ]) &&
        isVector(point.vec) &&
        typeof point.accept_click_range === 'number' &&
        Number.isFinite(point.accept_click_range) &&
        point.accept_click_range >= 0 &&
        isBoundedString(point.name) &&
        isBoundedString(point.description) &&
        isOptionalAssetUrl(point.image) &&
        typeof point.in_uv === 'boolean' &&
        isOptionalString(point.dialogue_id),
    )
  )
}

function isClue(
  value: unknown,
  problemCount: number,
  depth = 0,
  budget = { count: 0 },
): value is import('@/types/game').clue {
  if (depth > STORY_LIMITS.maxSubclueDepth || budget.count >= STORY_LIMITS.maxCluesPerLevel)
    return false
  budget.count += 1
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      'type',
      'name',
      'data',
      'subclues',
      'problem_indexes',
      'hint',
      'placement',
      'media_note',
      'dialogue_id',
      'dialogue',
    ]) ||
    !['image', 'audio', 'text', 'video', 'combination', 'dialogue'].includes(String(value.type)) ||
    !isBoundedString(value.name) ||
    !isBoundedString(value.data) ||
    !isOptionalString(value.hint) ||
    !isOptionalString(value.placement) ||
    !isOptionalString(value.media_note) ||
    !isOptionalString(value.dialogue_id) ||
    (value.problem_indexes !== undefined &&
      (!Array.isArray(value.problem_indexes) ||
        !value.problem_indexes.every(
          (index: unknown) =>
            isInteger(index, 0, Number.MAX_SAFE_INTEGER) &&
            (problemCount === 0 || index < problemCount),
        )))
  )
    return false
  if (value.dialogue !== undefined) {
    const dialogue = value.dialogue as Record<string, unknown>
    if (
      !isRecord(dialogue) ||
      !hasOnlyKeys(dialogue, ['start', 'nodes']) ||
      !isBoundedString(dialogue.start) ||
      !Array.isArray(dialogue.nodes) ||
      dialogue.nodes.length > STORY_LIMITS.maxDialogueNodes ||
      !dialogue.nodes.every((entry: unknown) => {
        if (
          !isRecord(entry) ||
          !hasOnlyKeys(entry, ['id', 'speaker', 'text', 'avatar', 'options', 'next']) ||
          !isBoundedString(entry.id) ||
          !isBoundedString(entry.speaker) ||
          !isBoundedString(entry.text)
        )
          return false
        if (entry.avatar !== undefined && !isOptionalAssetUrl(entry.avatar)) return false
        if (entry.next !== undefined && entry.next !== null && typeof entry.next !== 'string')
          return false
        return (
          entry.options === undefined ||
          (Array.isArray(entry.options) &&
            entry.options.every(
              (option: unknown) =>
                isRecord(option) &&
                hasOnlyKeys(option, ['label', 'next']) &&
                isBoundedString(option.label) &&
                (option.next === null || typeof option.next === 'string'),
            ))
        )
      })
    )
      return false
    const ids = new Set(dialogue.nodes.map((entry) => (entry as Record<string, unknown>).id))
    if (ids.size !== dialogue.nodes.length) return false
    if (!ids.has(dialogue.start)) return false
    for (const entry of dialogue.nodes as Record<string, unknown>[]) {
      if (
        entry.next !== undefined &&
        entry.next !== null &&
        (typeof entry.next !== 'string' || !ids.has(entry.next))
      )
        return false
      for (const option of (entry.options as Record<string, unknown>[] | undefined) ?? []) {
        if (option.next !== null && (typeof option.next !== 'string' || !ids.has(option.next)))
          return false
      }
    }
  } else if (value.type === 'dialogue') {
    return false
  }
  if (value.type !== 'dialogue' && value.dialogue !== undefined) return false
  if (
    value.type === 'dialogue' &&
    (typeof value.dialogue_id !== 'string' || value.dialogue_id.trim().length === 0)
  )
    return false
  if (value.type !== 'dialogue' && value.dialogue_id !== undefined) return false
  return (
    value.subclues === undefined ||
    (Array.isArray(value.subclues) &&
      value.subclues.every((entry: unknown) => isClue(entry, problemCount, depth + 1, budget)))
  )
}

export function isLevel(value: unknown, portableAssets = false): value is level {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      'name',
      'panorama',
      'timeline',
      'thumbnail_url',
      'subtitle',
      'description',
      'hotspots',
      'clues',
      'problems',
    ]) ||
    !isBoundedString(value.name) ||
    !Array.isArray(value.panorama) ||
    value.panorama.length === 0 ||
    !value.panorama.every((panorama) => isPanorama(panorama, portableAssets)) ||
    !isOptionalString(value.thumbnail_url) ||
    !isOptionalString(value.subtitle) ||
    !isOptionalString(value.description) ||
    !Array.isArray(value.problems) ||
    value.problems.length > STORY_LIMITS.maxProblemsPerLevel ||
    !value.problems.every(isProblem) ||
    !Array.isArray(value.clues) ||
    value.clues.length > STORY_LIMITS.maxCluesPerLevel ||
    (value.timeline !== undefined &&
      Array.isArray(value.timeline) &&
      value.timeline.length > STORY_LIMITS.maxTimelineEntriesPerLevel) ||
    (Array.isArray(value.panorama) && value.panorama.length > STORY_LIMITS.maxPanoramasPerLevel)
  )
    return false

  const problemCount = value.problems.length
  const clueBudget = { count: 0 }
  if (!value.clues.every((entry: unknown) => isClue(entry, problemCount, 0, clueBudget)))
    return false

  const panoramaCount = value.panorama.length
  const clueCount = value.clues.length
  if (
    value.timeline !== undefined &&
    (!Array.isArray(value.timeline) ||
      !value.timeline.every(
        (entry: unknown) =>
          isRecord(entry) &&
          hasOnlyKeys(entry, ['label', 'panorama_index', 'clue_indexes']) &&
          isBoundedString(entry.label) &&
          entry.label.trim().length > 0 &&
          isInteger(entry.panorama_index, 0, panoramaCount - 1) &&
          Array.isArray(entry.clue_indexes) &&
          entry.clue_indexes.every((index: unknown) => isInteger(index, 0, clueCount - 1)) &&
          new Set(entry.clue_indexes).size === entry.clue_indexes.length,
      ))
  )
    return false

  return (
    (value.hotspots === undefined ||
      (Array.isArray(value.hotspots) &&
        value.hotspots.every((entry: unknown) => {
          if (
            !isRecord(entry) ||
            !hasOnlyKeys(entry, ['clue_index', 'vec', 'yaw', 'pitch', 'x', 'y']) ||
            !isInteger(entry.clue_index, 0, clueCount - 1)
          )
            return false
          const hasVector = isVector(entry.vec)
          const hasAngles =
            typeof entry.yaw === 'number' &&
            Number.isFinite(entry.yaw) &&
            entry.yaw >= -180 &&
            entry.yaw <= 180 &&
            typeof entry.pitch === 'number' &&
            Number.isFinite(entry.pitch) &&
            entry.pitch >= -90 &&
            entry.pitch <= 90
          const hasPercentages =
            typeof entry.x === 'number' &&
            Number.isFinite(entry.x) &&
            entry.x >= 0 &&
            entry.x <= 100 &&
            typeof entry.y === 'number' &&
            Number.isFinite(entry.y) &&
            entry.y >= 0 &&
            entry.y <= 100
          return Number(hasVector) + Number(hasAngles) + Number(hasPercentages) === 1
        }))) &&
    dialogueReferencesAreValid(value)
  )
}

function dialogueReferencesAreValid(value: Record<string, unknown>): boolean {
  const clues = value.clues as Array<Record<string, unknown>>
  const dialogueIds = new Set<string>()
  const collectDialogueIds = (items: Array<Record<string, unknown>>): boolean => {
    for (const clue of items) {
      if (clue.type === 'dialogue') {
        const id = clue.dialogue_id
        if (typeof id !== 'string' || id.length === 0 || dialogueIds.has(id)) return false
        dialogueIds.add(id)
      }
      if (clue.subclues !== undefined) {
        if (
          !Array.isArray(clue.subclues) ||
          !collectDialogueIds(clue.subclues as Array<Record<string, unknown>>)
        )
          return false
      }
    }
    return true
  }
  if (!collectDialogueIds(clues)) return false
  for (const panorama of value.panorama as Array<Record<string, unknown>>) {
    for (const point of panorama.click_points as Array<Record<string, unknown>>) {
      if (point.dialogue_id !== undefined) {
        if (typeof point.dialogue_id !== 'string' || !dialogueIds.has(point.dialogue_id))
          return false
      }
    }
  }
  return true
}

function isEmbeddedStory(value: unknown): boolean {
  if (
    !isRecord(value) ||
    !isWithinPackageLimit(value) ||
    !hasOnlyKeys(value, [
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
    ]) ||
    value.version !== 1 ||
    !isBoundedString(value.id) ||
    value.id.length === 0 ||
    !isBoundedString(value.name) ||
    !isBoundedString(value.subtitle) ||
    !isBoundedString(value.introduction) ||
    !isBoundedString(value.coordinates) ||
    !isBoundedString(value.background_url) ||
    !isSafeAssetUrl(value.background_url) ||
    !(
      value.cover_url === undefined ||
      value.cover_url === '' ||
      (isBoundedString(value.cover_url) && isSafeAssetUrl(value.cover_url))
    ) ||
    !Array.isArray(value.levels) ||
    value.levels.length === 0 ||
    value.levels.length > STORY_LIMITS.maxLevels ||
    !value.levels.every((entry: unknown) => isLevel(entry, true)) ||
    !Array.isArray(value.authors) ||
    value.authors.length > STORY_LIMITS.maxAuthors
  )
    return false
  return value.authors.every(
    (author: unknown) =>
      isRecord(author) &&
      hasOnlyKeys(author, ['name', 'job']) &&
      isBoundedString(author.name) &&
      isBoundedString(author.job),
  )
}

export function migrateSnapshot(value: unknown): unknown {
  if (!isRecord(value) || !Array.isArray(value.levels)) return value
  let migrated = false
  const levels = value.levels.map((entry: unknown) => {
    if (!isRecord(entry) || Array.isArray(entry.panorama) || typeof entry.panorama_url !== 'string')
      return entry
    migrated = true
    const replacement: Record<string, unknown> = { ...entry }
    delete replacement.panorama_url
    replacement.panorama = [{ name: entry.name, url: entry.panorama_url, click_points: [] }]
    return replacement
  })
  return migrated ? { ...value, levels, currentPanoramaIndex: 0, discoveredClickPoints: [] } : value
}

export function isSnapshot(value: unknown): value is Snapshot {
  if (
    !isRecord(value) ||
    !hasOnlyKeys(value, [
      'version',
      'mode',
      'locationId',
      'sourceKind',
      'sourceId',
      'sourceRevision',
      'story',
      'activeStory',
      'capturedFrame',
      'completionRule',
      'questionFingerprint',
      'levels',
      'authors',
      'difficulty',
      'currentLevelIndex',
      'selectedLevelIndex',
      'currentPanoramaIndex',
      'discoveredClickPoints',
      'unlockedClues',
      'startedAt',
      'elapsedMs',
      'completed',
      'attempts',
      'completedLevelIndexes',
      'rounds',
      'hasStarted',
      'persistenceError',
    ]) ||
    (value.version !== 1 && value.version !== 2) ||
    !(value.mode === undefined || value.mode === 'single' || value.mode === 'campaign') ||
    !(value.locationId === undefined || isBoundedString(value.locationId)) ||
    !(
      value.sourceKind === undefined ||
      value.sourceKind === 'builtin' ||
      value.sourceKind === 'ugc'
    ) ||
    !(
      value.sourceId === undefined ||
      (isBoundedString(value.sourceId) && value.sourceId.length > 0)
    ) ||
    !(
      value.sourceRevision === undefined ||
      (isBoundedString(value.sourceRevision) && value.sourceRevision.length > 0)
    ) ||
    !(value.story === undefined || isEmbeddedStory(value.story)) ||
    !(
      value.activeStory === undefined ||
      value.activeStory === null ||
      isEmbeddedStory(value.activeStory)
    ) ||
    (value.sourceKind === 'ugc' &&
      (value.version !== 2 ||
        !isBoundedString(value.sourceId) ||
        value.sourceId.length === 0 ||
        !isBoundedString(value.sourceRevision) ||
        value.sourceRevision.length === 0)) ||
    (value.sourceKind !== undefined &&
      value.sourceKind !== 'ugc' &&
      (!isBoundedString(value.sourceId) ||
        value.sourceId.length === 0 ||
        !isBoundedString(value.sourceRevision) ||
        value.sourceRevision.length === 0)) ||
    !(value.completionRule === undefined || value.completionRule === 'first-attempt') ||
    !Array.isArray(value.levels) ||
    !value.levels.every((entry: unknown) => isLevel(entry)) ||
    !Array.isArray(value.authors) ||
    !value.authors.every(
      (entry: unknown) =>
        isRecord(entry) &&
        hasOnlyKeys(entry, ['name', 'job']) &&
        isBoundedString(entry.name) &&
        isBoundedString(entry.job),
    ) ||
    !isDifficulty(value.difficulty) ||
    !isInteger(value.currentLevelIndex, 0, Math.max(0, value.levels.length - 1)) ||
    !isInteger(value.selectedLevelIndex, 0, Math.max(0, value.levels.length - 1)) ||
    !(
      value.currentPanoramaIndex === undefined ||
      isInteger(
        value.currentPanoramaIndex,
        0,
        Math.max(
          0,
          ((value.levels[value.currentLevelIndex] as level | undefined)?.panorama.length ?? 1) - 1,
        ),
      )
    ) ||
    !(value.discoveredClickPoints === undefined || Array.isArray(value.discoveredClickPoints)) ||
    !(value.unlockedClues === undefined || Array.isArray(value.unlockedClues)) ||
    !(value.startedAt === null || isTime(value.startedAt)) ||
    !isTime(value.elapsedMs) ||
    typeof value.completed !== 'boolean' ||
    typeof value.hasStarted !== 'boolean' ||
    !Array.isArray(value.attempts) ||
    !Array.isArray(value.rounds) ||
    !Array.isArray(value.completedLevelIndexes)
  )
    return false

  const savedLevels: level[] = value.levels
  const discovered = value.discoveredClickPoints ?? []
  if (
    new Set(discovered).size !== discovered.length ||
    !discovered.every(
      (key: unknown) => typeof key === 'string' && validClickPointKey(savedLevels, key),
    )
  )
    return false
  const unlocked = value.unlockedClues ?? []
  if (
    new Set(unlocked).size !== unlocked.length ||
    !unlocked.every((key: unknown) => typeof key === 'string' && validClueKey(savedLevels, key))
  )
    return false
  const rounds: GameRound[] = []
  const visited = new Set<number>()
  for (const entry of value.rounds as unknown[]) {
    if (
      !isRecord(entry) ||
      !hasOnlyKeys(entry, ['levelIndex', 'questionOrder', 'completedDifficulty']) ||
      !isInteger(entry.levelIndex, 0, savedLevels.length - 1) ||
      visited.has(entry.levelIndex) ||
      !Array.isArray(entry.questionOrder) ||
      (entry.completedDifficulty !== undefined && !isDifficulty(entry.completedDifficulty))
    )
      return false
    const count = savedLevels[entry.levelIndex]?.problems.length ?? 0
    if (
      entry.questionOrder.length !== count ||
      !entry.questionOrder.every((index: unknown) => isInteger(index, 0, count - 1)) ||
      new Set(entry.questionOrder).size !== count
    )
      return false
    visited.add(entry.levelIndex)
    rounds.push({
      levelIndex: entry.levelIndex,
      questionOrder: entry.questionOrder,
      ...(isDifficulty(entry.completedDifficulty)
        ? { completedDifficulty: entry.completedDifficulty }
        : {}),
    })
  }

  const attempts: Attempt[] = []
  const answeredQuestions = new Set<string>()
  const legacyQuestions = new Set<string>()
  const correctQuestions = new Set<string>()
  const firstAttemptRules =
    value.completionRule === 'first-attempt' ||
    (value.attempts as unknown[]).some((entry) => isRecord(entry) && entry.skipped !== undefined)
  for (const entry of value.attempts as unknown[]) {
    if (
      !isRecord(entry) ||
      !hasOnlyKeys(entry, [
        'levelIndex',
        'problemIndex',
        'selectedAnswer',
        'correct',
        'skipped',
        'legacy',
        'at',
      ]) ||
      !isInteger(entry.levelIndex, 0, savedLevels.length - 1) ||
      !visited.has(entry.levelIndex) ||
      typeof entry.correct !== 'boolean' ||
      !isTime(entry.at) ||
      !(entry.skipped === undefined || typeof entry.skipped === 'boolean') ||
      !(entry.legacy === undefined || entry.legacy === true)
    )
      return false
    const questions = savedLevels[entry.levelIndex]?.problems
    if (!questions || !isInteger(entry.problemIndex, 0, questions.length - 1)) return false
    const question = questions[entry.problemIndex]
    const key = `${entry.levelIndex}:${entry.problemIndex}`
    const persistedLegacy = entry.legacy === true
    const legacyAttempt = !firstAttemptRules || persistedLegacy
    if (
      (!firstAttemptRules && (entry.skipped !== undefined || entry.legacy !== undefined)) ||
      (firstAttemptRules && entry.skipped === undefined && !persistedLegacy) ||
      (answeredQuestions.has(key) && !(legacyAttempt && legacyQuestions.has(key)))
    )
      return false
    if (entry.skipped === true) {
      if (legacyAttempt || entry.selectedAnswer !== null || entry.correct) return false
      attempts.push({
        levelIndex: entry.levelIndex,
        problemIndex: entry.problemIndex,
        selectedAnswer: null,
        correct: false,
        skipped: true,
        at: entry.at,
      })
    } else {
      if (!question) return false
      const selectedAnswer = attemptAnswerIndexes(entry.selectedAnswer)
      const expectedAnswer = expectedAnswerIndexes(question)
      const correct =
        selectedAnswer !== null &&
        selectedAnswer.length === expectedAnswer.length &&
        selectedAnswer.every((answer, index) => answer === expectedAnswer[index])
      if (selectedAnswer === null || entry.correct !== correct || correctQuestions.has(key))
        return false
      if (entry.correct) correctQuestions.add(key)
      attempts.push({
        levelIndex: entry.levelIndex,
        problemIndex: entry.problemIndex,
        selectedAnswer: selectedAnswer.length === 1 ? selectedAnswer[0]! : selectedAnswer,
        correct: entry.correct,
        ...(entry.skipped === false ? { skipped: false as const } : {}),
        ...(legacyAttempt ? { legacy: true as const } : {}),
        at: entry.at,
      })
    }
    answeredQuestions.add(key)
    if (legacyAttempt) legacyQuestions.add(key)
  }

  const completedIndexes: number[] = []
  for (const index of value.completedLevelIndexes as unknown[]) {
    if (!isInteger(index, 0, savedLevels.length - 1) || completedIndexes.includes(index))
      return false
    completedIndexes.push(index)
  }
  const solved = (firstAttemptRules ? solvedIndexes : correctlySolvedIndexes)({
    levels: savedLevels,
    rounds,
    attempts,
    difficulty: value.difficulty,
  })
  if (
    completedIndexes.length !== solved.length ||
    !completedIndexes.every((index) => solved.includes(index))
  )
    return false
  if (
    !value.hasStarted &&
    (rounds.length > 0 ||
      attempts.length > 0 ||
      value.elapsedMs !== 0 ||
      value.startedAt !== null ||
      value.completed)
  )
    return false
  if (value.hasStarted && !visited.has(value.currentLevelIndex)) return false
  if (value.completed && (!solved.includes(value.currentLevelIndex) || value.startedAt !== null))
    return false
  if (value.mode === 'campaign') {
    const currentLevelIndex = value.currentLevelIndex
    if (
      value.hasStarted &&
      (rounds.length !== currentLevelIndex + 1 ||
        rounds.some((round, index) => round.levelIndex !== index) ||
        rounds.some(
          (round) =>
            round.levelIndex < currentLevelIndex &&
            (round.completedDifficulty === undefined || !solved.includes(round.levelIndex)),
        ) ||
        rounds.some(
          (round) =>
            round.levelIndex === currentLevelIndex && round.completedDifficulty !== undefined,
        ))
    )
      return false
    if (value.completed && currentLevelIndex !== savedLevels.length - 1) return false
  } else if (value.mode === 'single') {
    if (
      rounds.length !== (value.hasStarted ? 1 : 0) ||
      rounds.some(
        (round) =>
          round.levelIndex !== value.currentLevelIndex || round.completedDifficulty !== undefined,
      )
    )
      return false
  } else if (rounds.some((round) => round.completedDifficulty !== undefined)) return false
  if (
    value.questionFingerprint !== undefined &&
    value.questionFingerprint !== questionFingerprint(savedLevels)
  )
    return false
  return true
}
