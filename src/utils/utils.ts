import { Vector3 } from 'three'
import { gameAuthors, gameLevels, gameLocations } from '@/data/game'
import type { Attempt, Difficulty, ImagePanorama, level, problem } from '@/types/game'
import type { GameMode, GameRound, GameState, Snapshot } from '@/types/gamestore'

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

export function copyConfig(
  locationId = defaultLocationId(),
): Pick<GameState, 'levels' | 'authors'> {
  return {
    levels: (locationLevels(locationId) ?? []).map((entry) => ({
      ...entry,
      panorama: entry.panorama.map((panorama) => ({
        ...panorama,
        click_points: panorama.click_points.map((point) => ({
          ...point,
          vec: new Vector3(point.vec.x, point.vec.y, point.vec.z),
        })),
      })),
      hotspots: entry.hotspots?.map((item) => ({ ...item })),
      clues: entry.clues.map((item) => ({
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
        subclues: item.subclues?.map((subclue) => ({
          ...subclue,
          problem_indexes: subclue.problem_indexes ? [...subclue.problem_indexes] : undefined,
          dialogue: subclue.dialogue
            ? {
                start: subclue.dialogue.start,
                nodes: subclue.dialogue.nodes.map((node) => ({
                  ...node,
                  options: node.options?.map((option) => ({ ...option })),
                })),
              }
            : undefined,
        })),
      })),
      problems: entry.problems.map((item) => ({ ...item, select: [...item.select] })),
    })),
    authors: gameAuthors.map((entry) => ({ ...entry })),
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
    typeof value.title === 'string' &&
    typeof value.reason === 'string' &&
    Array.isArray(value.select) &&
    value.select.length === 4 &&
    value.select.every((entry: unknown) => typeof entry === 'string') &&
    isInteger(value.true_answer, 0, 3) &&
    (value.true_answers === undefined ||
      (Array.isArray(value.true_answers) &&
        value.true_answers.length > 0 &&
        value.true_answers.every((entry: unknown) => isInteger(entry, 0, 3))))
  )
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === 'string'
}

function isVector(value: unknown): value is { x: number; y: number; z: number } {
  return (
    isRecord(value) &&
    typeof value.x === 'number' &&
    Number.isFinite(value.x) &&
    typeof value.y === 'number' &&
    Number.isFinite(value.y) &&
    typeof value.z === 'number' &&
    Number.isFinite(value.z)
  )
}

function isPanorama(value: unknown): value is ImagePanorama {
  return (
    isRecord(value) &&
    typeof value.name === 'string' &&
    typeof value.url === 'string' &&
    isOptionalString(value.ultraviolet_url) &&
    Array.isArray(value.click_points) &&
    value.click_points.every(
      (point: unknown) =>
        isRecord(point) &&
        isVector(point.vec) &&
        typeof point.accept_click_range === 'number' &&
        Number.isFinite(point.accept_click_range) &&
        point.accept_click_range >= 0 &&
        typeof point.name === 'string' &&
        typeof point.description === 'string' &&
        isOptionalString(point.image) &&
        typeof point.in_uv === 'boolean' &&
        isOptionalString(point.dialogue_id),
    )
  )
}

function isClue(value: unknown, problemCount: number): value is import('@/types/game').clue {
  if (
    !isRecord(value) ||
    !['image', 'audio', 'text', 'video', 'combination', 'dialogue'].includes(String(value.type)) ||
    typeof value.name !== 'string' ||
    typeof value.data !== 'string' ||
    !isOptionalString(value.hint) ||
    !isOptionalString(value.dialogue_id) ||
    (value.problem_indexes !== undefined &&
      (!Array.isArray(value.problem_indexes) ||
        !value.problem_indexes.every((index: unknown) => isInteger(index, 0, problemCount - 1))))
  )
    return false
  if (value.dialogue !== undefined) {
    const dialogue = value.dialogue as Record<string, unknown>
    if (
      !isRecord(dialogue) ||
      typeof dialogue.start !== 'string' ||
      !Array.isArray(dialogue.nodes) ||
      !dialogue.nodes.every((entry: unknown) => {
        if (
          !isRecord(entry) ||
          typeof entry.id !== 'string' ||
          typeof entry.speaker !== 'string' ||
          typeof entry.text !== 'string'
        )
          return false
        if (entry.avatar !== undefined && typeof entry.avatar !== 'string') return false
        if (entry.next !== undefined && entry.next !== null && typeof entry.next !== 'string')
          return false
        return (
          entry.options === undefined ||
          (Array.isArray(entry.options) &&
            entry.options.every(
              (option: unknown) =>
                isRecord(option) &&
                typeof option.label === 'string' &&
                (option.next === null || typeof option.next === 'string'),
            ))
        )
      })
    )
      return false
    const ids = new Set(dialogue.nodes.map((entry) => (entry as Record<string, unknown>).id))
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
  return (
    value.subclues === undefined ||
    (Array.isArray(value.subclues) &&
      value.subclues.every((entry: unknown) => isClue(entry, problemCount)))
  )
}

function isLevel(value: unknown): value is level {
  if (
    !isRecord(value) ||
    typeof value.name !== 'string' ||
    !Array.isArray(value.panorama) ||
    !value.panorama.every(isPanorama) ||
    !isOptionalString(value.thumbnail_url) ||
    !isOptionalString(value.subtitle) ||
    !isOptionalString(value.description) ||
    !Array.isArray(value.problems) ||
    !value.problems.every(isProblem) ||
    !Array.isArray(value.clues)
  )
    return false

  const problemCount = value.problems.length
  if (!value.clues.every((entry: unknown) => isClue(entry, problemCount))) return false

  const clueCount = value.clues.length
  return (
    value.hotspots === undefined ||
    (Array.isArray(value.hotspots) &&
      value.hotspots.every((entry: unknown) => {
        if (!isRecord(entry) || !isInteger(entry.clue_index, 0, clueCount - 1)) return false
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
        return hasVector || hasAngles || hasPercentages
      }))
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
    value.version !== 1 ||
    !(value.mode === undefined || value.mode === 'single' || value.mode === 'campaign') ||
    !(value.locationId === undefined || typeof value.locationId === 'string') ||
    !(value.completionRule === undefined || value.completionRule === 'first-attempt') ||
    !Array.isArray(value.levels) ||
    !value.levels.every(isLevel) ||
    !Array.isArray(value.authors) ||
    !value.authors.every(
      (entry: unknown) =>
        isRecord(entry) && typeof entry.name === 'string' && typeof entry.job === 'string',
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
      if (
        !isInteger(entry.selectedAnswer, 0, 3) ||
        !question ||
        entry.correct !== (entry.selectedAnswer === question.true_answer) ||
        correctQuestions.has(key)
      )
        return false
      if (entry.correct) correctQuestions.add(key)
      attempts.push({
        levelIndex: entry.levelIndex,
        problemIndex: entry.problemIndex,
        selectedAnswer: entry.selectedAnswer,
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
