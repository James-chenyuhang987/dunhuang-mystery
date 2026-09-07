import { defineStore } from 'pinia'
import { gameAuthors, gameLevels } from '@/data/game'
import type { Attempt, author, Difficulty, level, problem, Round } from '@/types/game'

export const GAME_STORAGE_KEY = 'dunhuang-mystery:game:v1'

interface GameState {
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
  rounds: Round[]
  hasStarted: boolean
}

type Snapshot = Omit<GameState, 'persistenceError'> & { version: 1; questionFingerprint?: string }

function questionFingerprint(levels: level[]): string {
  // Presentation and explanation edits do not invalidate answers or shuffled indexes.
  return JSON.stringify(levels.map((entry) => entry.problems.map(({ title, select, true_answer }) =>
    ({ title, select, true_answer }),
  )))
}

function copyConfig(): Pick<GameState, 'levels' | 'authors'> {
  return {
    levels: gameLevels.map((entry) => ({
      ...entry,
      clues: entry.clues.map((item) => ({ ...item })),
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
  return entry && round ? round.questionOrder.slice(0, countFor(entry.problems.length, state.difficulty)) : []
}

function solvedIndexes(state: Pick<GameState, 'levels' | 'rounds' | 'difficulty' | 'attempts'>): number[] {
  return state.levels.flatMap((_, levelIndex) => {
    const selected = selectedIndexes(state, levelIndex)
    return selected.length > 0 && selected.every((problemIndex) =>
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

function isLevel(value: unknown): value is level {
  return isRecord(value) && typeof value.name === 'string' && typeof value.panorama_url === 'string'
    && Array.isArray(value.clues) && value.clues.every((entry: unknown) =>
      isRecord(entry) && ['image', 'audio', 'text', 'video'].includes(String(entry.type))
      && typeof entry.name === 'string' && typeof entry.data === 'string',
    ) && Array.isArray(value.problems) && value.problems.length > 0 && value.problems.every(isProblem)
}

function isSnapshot(value: unknown): value is Snapshot {
  if (!isRecord(value) || value.version !== 1
    || !Array.isArray(value.levels) || value.levels.length === 0 || !value.levels.every(isLevel)
    || !Array.isArray(value.authors) || !value.authors.every((entry: unknown) =>
      isRecord(entry) && typeof entry.name === 'string' && typeof entry.job === 'string')
    || !isDifficulty(value.difficulty)
    || !isInteger(value.currentLevelIndex, 0, value.levels.length - 1)
    || !isInteger(value.selectedLevelIndex, 0, value.levels.length - 1)
    || !(value.startedAt === null || isTime(value.startedAt)) || !isTime(value.elapsedMs)
    || typeof value.completed !== 'boolean' || typeof value.hasStarted !== 'boolean'
    || !Array.isArray(value.attempts) || !Array.isArray(value.rounds)
    || !Array.isArray(value.completedLevelIndexes)) return false

  const savedLevels: level[] = value.levels
  const rounds: Round[] = []
  const visited = new Set<number>()
  for (const entry of value.rounds as unknown[]) {
    if (!isRecord(entry) || !isInteger(entry.levelIndex, 0, savedLevels.length - 1)
      || visited.has(entry.levelIndex) || !Array.isArray(entry.questionOrder)) return false
    const count = savedLevels[entry.levelIndex]?.problems.length ?? 0
    if (entry.questionOrder.length !== count
      || !entry.questionOrder.every((index: unknown) => isInteger(index, 0, count - 1))
      || new Set(entry.questionOrder).size !== count) return false
    visited.add(entry.levelIndex)
    rounds.push({ levelIndex: entry.levelIndex, questionOrder: entry.questionOrder })
  }

  const attempts: Attempt[] = []
  const correctQuestions = new Set<string>()
  for (const entry of value.attempts as unknown[]) {
    if (!isRecord(entry) || !isInteger(entry.levelIndex, 0, savedLevels.length - 1)
      || !visited.has(entry.levelIndex) || !isInteger(entry.selectedAnswer, 0, 3)
      || typeof entry.correct !== 'boolean' || !isTime(entry.at)) return false
    const questions = savedLevels[entry.levelIndex]?.problems
    if (!questions || !isInteger(entry.problemIndex, 0, questions.length - 1)) return false
    const question = questions[entry.problemIndex]
    const key = `${entry.levelIndex}:${entry.problemIndex}`
    if (!question || entry.correct !== (entry.selectedAnswer === question.true_answer) || correctQuestions.has(key)) return false
    if (entry.correct) correctQuestions.add(key)
    attempts.push({ levelIndex: entry.levelIndex, problemIndex: entry.problemIndex, selectedAnswer: entry.selectedAnswer, correct: entry.correct, at: entry.at })
  }

  const completedIndexes: number[] = []
  for (const index of value.completedLevelIndexes as unknown[]) {
    if (!isInteger(index, 0, savedLevels.length - 1) || completedIndexes.includes(index)) return false
    completedIndexes.push(index)
  }
  const solved = solvedIndexes({ levels: savedLevels, rounds, attempts, difficulty: value.difficulty })
  if (completedIndexes.length !== solved.length || !completedIndexes.every((index) => solved.includes(index))) return false
  if (!value.hasStarted && (rounds.length > 0 || attempts.length > 0 || value.elapsedMs !== 0 || value.startedAt !== null || value.completed)) return false
  if (value.hasStarted && !visited.has(value.currentLevelIndex)) return false
  if (value.completed && (!solved.includes(value.currentLevelIndex) || value.startedAt !== null)) return false
  if (value.questionFingerprint !== undefined
    && value.questionFingerprint !== questionFingerprint(savedLevels)) return false
  return true
}

export const useGameStore = defineStore('game', {
  state: (): GameState => ({
    ...copyConfig(),
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
        attempt.levelIndex === this.currentLevelIndex && attempt.problemIndex === index && attempt.correct,
      )) ?? null
    },
    currentProblem(): problem | null {
      return this.currentProblemIndex === null ? null : this.currentLevel?.problems[this.currentProblemIndex] ?? null
    },
    correctCount: (state): number => new Set(state.attempts.filter((entry) => entry.correct)
      .map((entry) => `${entry.levelIndex}:${entry.problemIndex}`)).size,
    wrongCount: (state): number => state.attempts.filter((entry) => !entry.correct).length,
    levelSolved(): boolean {
      return this.selectedQuestionIndexes.length > 0 && this.currentProblemIndex === null
    },
    hasProgress: (state): boolean => state.hasStarted,
  },
  actions: {
    refreshConfig(): void {
      const config = copyConfig()
      if (questionFingerprint(this.levels) !== questionFingerprint(config.levels)) {
        const hadProgress = this.hasStarted
        this.$reset()
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
    selectLevel(index: number): void {
      if (isInteger(index, 0, this.levels.length - 1)) this.selectedLevelIndex = index
    },
    startGame(requestedIndex?: number): void {
      const index = requestedIndex ?? this.selectedLevelIndex
      if (!isInteger(index, 0, this.levels.length - 1) || !this.levels[index]?.problems.length) return
      this.pauseTimer()
      this.currentLevelIndex = index
      this.selectedLevelIndex = index
      this.attempts = []
      this.completedLevelIndexes = []
      this.rounds = [{ levelIndex: index, questionOrder: shuffle(this.levels[index].problems.length) }]
      this.elapsedMs = 0
      this.completed = false
      this.hasStarted = true
      this.persistenceError = ''
      this.resumeTimer()
      // An explicit new game replaces a corrupt or stale save immediately.
      this.persist()
    },
    submitAnswer(answer: number): boolean | null {
      const question = this.currentProblem
      const problemIndex = this.currentProblemIndex
      if (!this.hasStarted || this.completed || !question || problemIndex === null || !isInteger(answer, 0, 3)) return null
      const correct = answer === question.true_answer
      this.attempts.push({ levelIndex: this.currentLevelIndex, problemIndex, selectedAnswer: answer, correct, at: Date.now() })
      this.completedLevelIndexes = solvedIndexes(this)
      this.persist()
      return correct
    },
    advanceLevel(): boolean {
      if (this.completed) return true
      if (!this.hasStarted || !this.levelSolved) return false
      this.completedLevelIndexes = solvedIndexes(this)
      this.pauseTimer()
      this.completed = true
      this.persist()
      return true
    },
    replay(): void {
      this.startGame()
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
        const config = copyConfig()
        if ((snapshot.questionFingerprint ?? questionFingerprint(snapshot.levels)) !== questionFingerprint(config.levels)) {
          this.$reset()
          this.persistenceError = '题目配置已更新，旧进度不兼容，已重置。请重新开始。'
          return
        }
        // Legacy campaigns retain only the active round. Their aggregate active time
        // is retained because v1 did not record per-level durations. Restore paused.
        const currentLevelIndex = snapshot.currentLevelIndex
        this.$patch({
          ...config,
          difficulty: snapshot.difficulty,
          currentLevelIndex,
          selectedLevelIndex: snapshot.hasStarted ? currentLevelIndex : snapshot.selectedLevelIndex,
          startedAt: null,
          elapsedMs: snapshot.elapsedMs,
          completed: snapshot.completed,
          attempts: snapshot.attempts.filter((entry) => entry.levelIndex === currentLevelIndex),
          completedLevelIndexes: snapshot.completedLevelIndexes.filter((index) => index === currentLevelIndex),
          rounds: snapshot.rounds.filter((entry) => entry.levelIndex === currentLevelIndex),
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
