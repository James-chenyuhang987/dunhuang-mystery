import { defineStore } from 'pinia'
import { gameAuthors, gameLevels, gameLocations } from '@/data/game'
import type { Attempt, author, Difficulty, level, problem, Round } from '@/types/game'

export const GAME_STORAGE_KEY = 'dunhuang-mystery:game:v1'

type GameMode = 'single' | 'campaign'
type GameRound = Round & { completedDifficulty?: Difficulty }

interface GameState {
  mode: GameMode
  locationId: string
  levels: level[]
  authors: author[]
  difficulty: Difficulty
  currentLevelIndex: number
  selectedLevelIndex: number
  startedAt: number | null
  elapsedMs: number
  completed: boolean
  persistenceError: string
  attempts: Attempt[]
  completedLevelIndexes: number[]
  rounds: GameRound[]
  hasStarted: boolean
}

type Snapshot = Omit<GameState, 'persistenceError' | 'mode' | 'locationId'> & {
  version: 1
  mode?: GameMode
  locationId?: string
  questionFingerprint?: string
  completionRule?: 'first-attempt'
}

function questionFingerprint(levels: level[]): string {
  // Presentation and explanation edits do not invalidate answers or shuffled indexes.
  return JSON.stringify(levels.map((entry) => entry.problems.map(({ title, select, true_answer }) =>
    ({ title, select, true_answer }),
  )))
}

function defaultLocationId(): string {
  return gameLocations[0]?.id ?? ''
}

function locationLevels(locationId: string): level[] | undefined {
  if (gameLocations.length === 0 && locationId === '') return gameLevels
  return gameLocations.find((entry) => entry.id === locationId)?.levels
}

function copyConfig(locationId = defaultLocationId()): Pick<GameState, 'levels' | 'authors'> {
  return {
    levels: (locationLevels(locationId) ?? []).map((entry) => ({
      ...entry,
      hotspots: entry.hotspots?.map((item) => ({ ...item })),
      comparison: entry.comparison ? { ...entry.comparison } : undefined,
      clues: entry.clues.map((item) => ({
        ...item,
        problem_indexes: item.problem_indexes ? [...item.problem_indexes] : undefined,
      })),
      problems: entry.problems.map((item) => ({ ...item, select: [...item.select] })),
    })),
    authors: gameAuthors.map((entry) => ({ ...entry })),
  }
}

function countFor(total: number, difficulty: Difficulty): number {
  return difficulty === 1 ? Math.min(1, total) : difficulty === 2 ? Math.ceil(total / 2) : total
}

function shuffle(total: number): number[] {
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

function selectedIndexes(state: Pick<GameState, 'levels' | 'rounds' | 'difficulty'>, index: number): number[] {
  const entry = state.levels[index]
  const round = state.rounds.find((item) => item.levelIndex === index)
  return entry && round ? round.questionOrder.slice(0, countFor(entry.problems.length, round.completedDifficulty ?? state.difficulty)) : []
}

function solvedIndexes(state: Pick<GameState, 'levels' | 'rounds' | 'difficulty' | 'attempts'>): number[] {
  return state.levels.flatMap((_, levelIndex) => {
    const selected = selectedIndexes(state, levelIndex)
    return state.rounds.some((round) => round.levelIndex === levelIndex) && selected.every((problemIndex) =>
      state.attempts.some((attempt) => attempt.levelIndex === levelIndex && attempt.problemIndex === problemIndex),
    ) ? [levelIndex] : []
  })
}

function correctlySolvedIndexes(state: Pick<GameState, 'levels' | 'rounds' | 'difficulty' | 'attempts'>): number[] {
  return state.levels.flatMap((_, levelIndex) => {
    const selected = selectedIndexes(state, levelIndex)
    return state.rounds.some((round) => round.levelIndex === levelIndex) && selected.every((problemIndex) =>
      state.attempts.some((attempt) => attempt.levelIndex === levelIndex && attempt.problemIndex === problemIndex && attempt.correct),
    ) ? [levelIndex] : []
  })
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function isInteger(value: unknown, min: number, max: number): value is number {
  return typeof value === 'number' && Number.isSafeInteger(value) && value >= min && value <= max
}

function isDifficulty(value: unknown): value is Difficulty {
  return value === 1 || value === 2 || value === 3
}

function isTime(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value) && value >= 0 && value <= Number.MAX_SAFE_INTEGER
}

function isProblem(value: unknown): value is problem {
  return isRecord(value) && typeof value.title === 'string' && typeof value.reason === 'string'
    && Array.isArray(value.select) && value.select.length === 4
    && value.select.every((entry: unknown) => typeof entry === 'string')
    && isInteger(value.true_answer, 0, 3)
}

function isOptionalString(value: unknown): boolean {
  return value === undefined || typeof value === 'string'
}

function isOptionalNumber(value: unknown): boolean {
  return value === undefined || (typeof value === 'number' && Number.isFinite(value))
}

function isLevel(value: unknown): value is level {
  if (!isRecord(value) || typeof value.name !== 'string' || typeof value.panorama_url !== 'string'
    || !isOptionalString(value.thumbnail_url) || !isOptionalString(value.subtitle) || !isOptionalString(value.description)
    || !Array.isArray(value.problems) || !value.problems.every(isProblem) || !Array.isArray(value.clues)) return false

  const problemCount = value.problems.length
  if (!value.clues.every((entry: unknown) =>
    isRecord(entry) && ['image', 'audio', 'text', 'video'].includes(String(entry.type))
    && typeof entry.name === 'string' && typeof entry.data === 'string' && isOptionalString(entry.hint)
    && (entry.problem_indexes === undefined || (Array.isArray(entry.problem_indexes)
      && entry.problem_indexes.every((index: unknown) => isInteger(index, 0, problemCount - 1)))),
  )) return false

  const clueCount = value.clues.length
  return (value.hotspots === undefined || (Array.isArray(value.hotspots) && value.hotspots.every((entry: unknown) =>
    isRecord(entry) && isInteger(entry.clue_index, 0, clueCount - 1)
    && ((typeof entry.yaw === 'number' && Number.isFinite(entry.yaw) && entry.yaw >= -180 && entry.yaw <= 180
      && typeof entry.pitch === 'number' && Number.isFinite(entry.pitch) && entry.pitch >= -90 && entry.pitch <= 90)
      || (typeof entry.x === 'number' && Number.isFinite(entry.x) && entry.x >= 0 && entry.x <= 100
      && typeof entry.y === 'number' && Number.isFinite(entry.y) && entry.y >= 0 && entry.y <= 100)),
  ))) && (value.comparison === undefined || (isRecord(value.comparison)
    && typeof value.comparison.reference_url === 'string' && typeof value.comparison.title === 'string'
    && isOptionalString(value.comparison.description) && isOptionalNumber(value.comparison.pass_score)))
}

function isSnapshot(value: unknown): value is Snapshot {
  if (!isRecord(value) || value.version !== 1
    || !(value.mode === undefined || value.mode === 'single' || value.mode === 'campaign')
    || !(value.locationId === undefined || typeof value.locationId === 'string')
    || !(value.completionRule === undefined || value.completionRule === 'first-attempt')
    || !Array.isArray(value.levels) || !value.levels.every(isLevel)
    || !Array.isArray(value.authors) || !value.authors.every((entry: unknown) =>
      isRecord(entry) && typeof entry.name === 'string' && typeof entry.job === 'string')
    || !isDifficulty(value.difficulty)
    || !isInteger(value.currentLevelIndex, 0, Math.max(0, value.levels.length - 1))
    || !isInteger(value.selectedLevelIndex, 0, Math.max(0, value.levels.length - 1))
    || !(value.startedAt === null || isTime(value.startedAt)) || !isTime(value.elapsedMs)
    || typeof value.completed !== 'boolean' || typeof value.hasStarted !== 'boolean'
    || !Array.isArray(value.attempts) || !Array.isArray(value.rounds)
    || !Array.isArray(value.completedLevelIndexes)) return false

  const savedLevels: level[] = value.levels
  const rounds: GameRound[] = []
  const visited = new Set<number>()
  for (const entry of value.rounds as unknown[]) {
    if (!isRecord(entry) || !isInteger(entry.levelIndex, 0, savedLevels.length - 1)
      || visited.has(entry.levelIndex) || !Array.isArray(entry.questionOrder)
      || (entry.completedDifficulty !== undefined && !isDifficulty(entry.completedDifficulty))) return false
    const count = savedLevels[entry.levelIndex]?.problems.length ?? 0
    if (entry.questionOrder.length !== count
      || !entry.questionOrder.every((index: unknown) => isInteger(index, 0, count - 1))
      || new Set(entry.questionOrder).size !== count) return false
    visited.add(entry.levelIndex)
    rounds.push({ levelIndex: entry.levelIndex, questionOrder: entry.questionOrder,
      ...(isDifficulty(entry.completedDifficulty) ? { completedDifficulty: entry.completedDifficulty } : {}),
    })
  }

  const attempts: Attempt[] = []
  const answeredQuestions = new Set<string>()
  const legacyQuestions = new Set<string>()
  const correctQuestions = new Set<string>()
  const firstAttemptRules = value.completionRule === 'first-attempt'
    || (value.attempts as unknown[]).some((entry) => isRecord(entry) && entry.skipped !== undefined)
  for (const entry of value.attempts as unknown[]) {
    if (!isRecord(entry) || !isInteger(entry.levelIndex, 0, savedLevels.length - 1)
      || !visited.has(entry.levelIndex) || typeof entry.correct !== 'boolean' || !isTime(entry.at)
      || !(entry.skipped === undefined || typeof entry.skipped === 'boolean')
      || !(entry.legacy === undefined || entry.legacy === true)) return false
    const questions = savedLevels[entry.levelIndex]?.problems
    if (!questions || !isInteger(entry.problemIndex, 0, questions.length - 1)) return false
    const question = questions[entry.problemIndex]
    const key = `${entry.levelIndex}:${entry.problemIndex}`
    const persistedLegacy = entry.legacy === true
    const legacyAttempt = !firstAttemptRules || persistedLegacy
    if ((!firstAttemptRules && (entry.skipped !== undefined || entry.legacy !== undefined))
      || (firstAttemptRules && entry.skipped === undefined && !persistedLegacy)
      || (answeredQuestions.has(key) && !(legacyAttempt && legacyQuestions.has(key)))) return false
    if (entry.skipped === true) {
      if (legacyAttempt || entry.selectedAnswer !== null || entry.correct) return false
      attempts.push({ levelIndex: entry.levelIndex, problemIndex: entry.problemIndex,
        selectedAnswer: null, correct: false, skipped: true, at: entry.at })
    } else {
      if (!isInteger(entry.selectedAnswer, 0, 3) || !question
        || entry.correct !== (entry.selectedAnswer === question.true_answer) || correctQuestions.has(key)) return false
      if (entry.correct) correctQuestions.add(key)
      attempts.push({ levelIndex: entry.levelIndex, problemIndex: entry.problemIndex,
        selectedAnswer: entry.selectedAnswer, correct: entry.correct,
        ...(entry.skipped === false ? { skipped: false as const } : {}),
        ...(legacyAttempt ? { legacy: true as const } : {}), at: entry.at })
    }
    answeredQuestions.add(key)
    if (legacyAttempt) legacyQuestions.add(key)
  }

  const completedIndexes: number[] = []
  for (const index of value.completedLevelIndexes as unknown[]) {
    if (!isInteger(index, 0, savedLevels.length - 1) || completedIndexes.includes(index)) return false
    completedIndexes.push(index)
  }
  const solved = (firstAttemptRules ? solvedIndexes : correctlySolvedIndexes)(
    { levels: savedLevels, rounds, attempts, difficulty: value.difficulty },
  )
  if (completedIndexes.length !== solved.length || !completedIndexes.every((index) => solved.includes(index))) return false
  if (!value.hasStarted && (rounds.length > 0 || attempts.length > 0 || value.elapsedMs !== 0 || value.startedAt !== null || value.completed)) return false
  if (value.hasStarted && !visited.has(value.currentLevelIndex)) return false
  if (value.completed && (!solved.includes(value.currentLevelIndex) || value.startedAt !== null)) return false
  if (value.mode === 'campaign') {
    const currentLevelIndex = value.currentLevelIndex
    if (value.hasStarted && (rounds.length !== currentLevelIndex + 1
      || rounds.some((round, index) => round.levelIndex !== index)
      || rounds.some((round) => round.levelIndex < currentLevelIndex
        && (round.completedDifficulty === undefined || !solved.includes(round.levelIndex)))
      || rounds.some((round) => round.levelIndex === currentLevelIndex && round.completedDifficulty !== undefined))) return false
    if (value.completed && currentLevelIndex !== savedLevels.length - 1) return false
  } else if (value.mode === 'single') {
    if (rounds.length !== (value.hasStarted ? 1 : 0)
      || rounds.some((round) => round.levelIndex !== value.currentLevelIndex || round.completedDifficulty !== undefined)) return false
  } else if (rounds.some((round) => round.completedDifficulty !== undefined)) return false
  if (value.questionFingerprint !== undefined
    && value.questionFingerprint !== questionFingerprint(savedLevels)) return false
  return true
}

export const useGameStore = defineStore('game', {
  state: (): GameState => ({
    ...copyConfig(),
    mode: 'single',
    locationId: defaultLocationId(),
    difficulty: 1,
    currentLevelIndex: 0,
    selectedLevelIndex: 0,
    startedAt: null,
    elapsedMs: 0,
    completed: false,
    persistenceError: '',
    attempts: [],
    completedLevelIndexes: [],
    rounds: [],
    hasStarted: false,
  }),
  getters: {
    currentLevel: (state): level | undefined => state.levels[state.currentLevelIndex],
    selectedQuestionIndexes: (state): number[] => selectedIndexes(state, state.currentLevelIndex),
    currentProblemIndex(): number | null {
      return this.selectedQuestionIndexes.find((index) => !this.attempts.some((attempt) =>
        attempt.levelIndex === this.currentLevelIndex && attempt.problemIndex === index,
      )) ?? null
    },
    currentProblem(): problem | null {
      return this.currentProblemIndex === null ? null : this.currentLevel?.problems[this.currentProblemIndex] ?? null
    },
    correctCount: (state): number => new Set(state.attempts.filter((entry) => entry.correct)
      .map((entry) => `${entry.levelIndex}:${entry.problemIndex}`)).size,
    wrongCount: (state): number => state.attempts.filter((entry) => !entry.correct && !entry.skipped).length,
    skippedCount: (state): number => state.attempts.filter((entry) => entry.skipped === true).length,
    levelSolved(): boolean {
      return this.hasStarted && this.rounds.some((round) => round.levelIndex === this.currentLevelIndex)
        && this.currentProblemIndex === null
    },
    isLastLevel: (state): boolean => state.mode === 'single' || state.currentLevelIndex === state.levels.length - 1,
    canAdvance(): boolean {
      return this.levelSolved && !this.completed
    },
    hasProgress: (state): boolean => state.hasStarted,
  },
  actions: {
    refreshConfig(): void {
      const config = copyConfig(this.locationId)
      if (questionFingerprint(this.levels) !== questionFingerprint(config.levels)) {
        const hadProgress = this.hasStarted
        const locationId = this.locationId
        this.$reset()
        this.locationId = locationId
        this.$patch(config)
        if (hadProgress) this.persistenceError = '题目配置已更新，旧进度不兼容，已重置。请重新开始。'
        return
      }
      this.$patch(config)
    },
    setDifficulty(value: Difficulty): void {
      if (!isInteger(value, 1, 3) || value === this.difficulty) return
      this.difficulty = value
      this.completedLevelIndexes = solvedIndexes(this)
      if (this.completed && !this.levelSolved) this.completed = false
      this.persist()
    },
    selectLocation(id: string): boolean {
      if (id === this.locationId || locationLevels(id) === undefined) return false
      const difficulty = this.difficulty
      this.pauseTimer()
      this.$reset()
      this.locationId = id
      this.difficulty = difficulty
      this.$patch(copyConfig(id))
      this.persist()
      return true
    },
    selectLevel(index: number): void {
      if (isInteger(index, 0, this.levels.length - 1)) this.selectedLevelIndex = index
    },
    startGame(requestedIndex?: number): void {
      const index = requestedIndex ?? this.selectedLevelIndex
      if (!isInteger(index, 0, this.levels.length - 1)) return
      this.pauseTimer()
      this.mode = 'single'
      this.currentLevelIndex = index
      this.selectedLevelIndex = index
      this.attempts = []
      this.completedLevelIndexes = []
      this.rounds = [{ levelIndex: index, questionOrder: shuffle(this.levels[index]?.problems.length ?? 0) }]
      this.completedLevelIndexes = solvedIndexes(this)
      this.elapsedMs = 0
      this.completed = false
      this.hasStarted = true
      this.persistenceError = ''
      this.resumeTimer()
      // An explicit new game replaces a corrupt or stale save immediately.
      this.persist()
    },
    startCampaign(): void {
      if (this.levels.length === 0) return
      this.startGame(0)
      this.mode = 'campaign'
      this.persist()
    },
    submitAnswer(answer: number): boolean | null {
      const question = this.currentProblem
      const problemIndex = this.currentProblemIndex
      if (!this.hasStarted || this.completed || !question || problemIndex === null || !isInteger(answer, 0, 3)) return null
      const correct = answer === question.true_answer
      this.attempts.push({ levelIndex: this.currentLevelIndex, problemIndex, selectedAnswer: answer,
        correct, skipped: false, at: Date.now() })
      this.completedLevelIndexes = solvedIndexes(this)
      this.persist()
      return correct
    },
    skipCurrentProblem(): boolean {
      const problemIndex = this.currentProblemIndex
      if (!this.hasStarted || this.completed || problemIndex === null || !this.currentProblem) return false
      this.attempts.push({ levelIndex: this.currentLevelIndex, problemIndex, selectedAnswer: null,
        correct: false, skipped: true, at: Date.now() })
      this.completedLevelIndexes = solvedIndexes(this)
      this.persist()
      return true
    },
    advanceLevel(): boolean {
      if (this.completed) return true
      if (!this.hasStarted || !this.levelSolved) return false
      if (this.mode === 'campaign' && !this.isLastLevel) {
        const round = this.rounds.find((entry) => entry.levelIndex === this.currentLevelIndex)
        if (!round) return false
        // Only departed rounds freeze their requirement; the active round stays live.
        round.completedDifficulty = this.difficulty
        this.currentLevelIndex += 1
        this.selectedLevelIndex = this.currentLevelIndex
        this.rounds.push({ levelIndex: this.currentLevelIndex,
          questionOrder: shuffle(this.currentLevel?.problems.length ?? 0),
        })
        this.completedLevelIndexes = solvedIndexes(this)
        this.persist()
        return false
      }
      this.completedLevelIndexes = solvedIndexes(this)
      this.pauseTimer()
      this.completed = true
      this.persist()
      return true
    },
    replay(): void {
      if (this.mode === 'campaign') this.startCampaign()
      else this.startGame()
    },
    resumeTimer(): void {
      if (this.hasStarted && !this.completed && this.startedAt === null) this.startedAt = Date.now()
    },
    pauseTimer(): void {
      this.tick()
      this.startedAt = null
    },
    tick(): void {
      if (this.startedAt === null) return
      const now = Date.now()
      // A backwards wall-clock adjustment must not subtract or double-count time.
      if (now >= this.startedAt) {
        this.elapsedMs += now - this.startedAt
        this.startedAt = now
      }
    },
    persist(): void {
      this.tick()
      try {
        const snapshot: Snapshot = {
          version: 1,
          mode: this.mode,
          locationId: this.locationId,
          completionRule: 'first-attempt',
          questionFingerprint: questionFingerprint(this.levels),
          levels: this.levels,
          authors: this.authors,
          difficulty: this.difficulty,
          currentLevelIndex: this.currentLevelIndex,
          selectedLevelIndex: this.selectedLevelIndex,
          startedAt: this.startedAt,
          elapsedMs: this.elapsedMs,
          completed: this.completed,
          attempts: this.attempts,
          completedLevelIndexes: this.completedLevelIndexes,
          rounds: this.rounds,
          hasStarted: this.hasStarted,
        }
        localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify(snapshot))
        this.persistenceError = ''
      } catch {
        this.persistenceError = '进度保存失败，请允许浏览器本地存储或释放空间后重试。'
      }
    },
    retryPersistence(): void {
      this.persist()
    },
    restore(): void {
      try {
        const raw = localStorage.getItem(GAME_STORAGE_KEY)
        if (raw === null) {
          this.persistenceError = ''
          return
        }
        const snapshot: unknown = JSON.parse(raw)
        if (!isSnapshot(snapshot)) {
          this.persistenceError = '存档数据无效，未载入。请重新开始以覆盖损坏的存档。'
          return
        }
        const locationId = snapshot.locationId ?? defaultLocationId()
        if (locationLevels(locationId) === undefined) {
          this.persistenceError = '存档地点无效，未载入。请重新选择探索地点。'
          return
        }
        const config = copyConfig(locationId)
        if ((snapshot.questionFingerprint ?? questionFingerprint(snapshot.levels)) !== questionFingerprint(config.levels)) {
          this.$reset()
          this.locationId = locationId
          this.$patch(config)
          this.persistenceError = '题目配置已更新，旧进度不兼容，已重置。请重新开始。'
          return
        }
        // No-mode v1 saves migrate to a single active round; explicit campaigns retain all rounds.
        // Aggregate active time is retained in both cases. Restore paused.
        const currentLevelIndex = snapshot.currentLevelIndex
        const campaign = snapshot.mode === 'campaign'
        const firstAttemptRules = snapshot.completionRule === 'first-attempt'
          || snapshot.attempts.some((entry) => entry.skipped !== undefined)
        const attempts = snapshot.attempts
          .filter((entry) => campaign || entry.levelIndex === currentLevelIndex)
          .map((entry): Attempt => {
            if (firstAttemptRules || entry.selectedAnswer === null) return entry
            return { ...entry, legacy: true }
          })
        const rounds = snapshot.rounds.filter((entry) => campaign || entry.levelIndex === currentLevelIndex)
        const completedLevelIndexes = solvedIndexes({ levels: config.levels, rounds,
          attempts, difficulty: snapshot.difficulty })
        this.$patch({
          ...config,
          mode: snapshot.mode ?? 'single',
          locationId,
          difficulty: snapshot.difficulty,
          currentLevelIndex,
          selectedLevelIndex: snapshot.hasStarted ? currentLevelIndex : snapshot.selectedLevelIndex,
          startedAt: null,
          elapsedMs: snapshot.elapsedMs,
          completed: snapshot.completed,
          attempts,
          completedLevelIndexes,
          rounds,
          hasStarted: snapshot.hasStarted,
          persistenceError: '',
        })
        this.persist()
      } catch {
        this.persistenceError = '存档读取失败或格式损坏。可重试，或重新开始覆盖存档。'
      }
    },
  },
})
