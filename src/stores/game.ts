import { defineStore } from 'pinia'
import { gameLocations } from '@/data/game'
import type { Attempt, Difficulty, ImagePanorama, level, problem } from '@/types/game'
import type { GameMode, GameRound, GameState, Snapshot } from '@/types/gamestore'
import {
  copyConfig,
  countFor,
  defaultLocationId,
  isInteger,
  isSnapshot,
  locationLevels,
  migrateSnapshot,
  questionFingerprint,
  shuffle,
  solvedIndexes,
  correctlySolvedIndexes,
  selectedIndexes,
  clickPointKey,
  clueKey,
  validClickPointKey,
  validClueKey,
} from '@/utils/utils'

export const GAME_STORAGE_KEY = 'dunhuang-mystery:game:v1'

export const useGameStore = defineStore('game', {
  state: (): GameState => ({
    ...copyConfig(),
    mode: 'single',
    locationId: defaultLocationId(),
    difficulty: 1,
    currentLevelIndex: 0,
    selectedLevelIndex: 0,
    currentPanoramaIndex: 0,
    discoveredClickPoints: [],
    unlockedClues: [],
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
    currentPanorama(): ImagePanorama | undefined {
      return this.currentLevel?.panorama[this.currentPanoramaIndex]
    },
    discoveredCount: (state): number =>
      state.discoveredClickPoints.filter((key) => key.startsWith(`${state.currentLevelIndex}:`))
        .length,
    totalClickPointCount: (state): number =>
      state.levels[state.currentLevelIndex]?.panorama.reduce(
        (total, panorama) =>
          total + panorama.click_points.filter((point) => !point.dialogue_id).length,
        0,
      ) ?? 0,
    selectedQuestionIndexes: (state): number[] => selectedIndexes(state, state.currentLevelIndex),
    currentProblemIndex(): number | null {
      return (
        this.selectedQuestionIndexes.find(
          (index) =>
            !this.attempts.some(
              (attempt) =>
                attempt.levelIndex === this.currentLevelIndex && attempt.problemIndex === index,
            ),
        ) ?? null
      )
    },
    currentProblem(): problem | null {
      return this.currentProblemIndex === null
        ? null
        : (this.currentLevel?.problems[this.currentProblemIndex] ?? null)
    },
    correctCount: (state): number =>
      new Set(
        state.attempts
          .filter((entry) => entry.correct)
          .map((entry) => `${entry.levelIndex}:${entry.problemIndex}`),
      ).size,
    wrongCount: (state): number =>
      state.attempts.filter((entry) => !entry.correct && !entry.skipped).length,
    skippedCount: (state): number =>
      state.attempts.filter((entry) => entry.skipped === true).length,
    levelSolved(): boolean {
      return (
        this.hasStarted &&
        this.rounds.some((round) => round.levelIndex === this.currentLevelIndex) &&
        this.currentProblemIndex === null
      )
    },
    isLastLevel: (state): boolean =>
      state.mode === 'single' || state.currentLevelIndex === state.levels.length - 1,
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
        if (hadProgress)
          this.persistenceError = '题目配置已更新，旧进度不兼容，已重置。请重新开始。'
        return
      }
      this.$patch(config)
      this.currentPanoramaIndex = Math.min(
        this.currentPanoramaIndex,
        Math.max(0, (this.currentLevel?.panorama.length ?? 1) - 1),
      )
      this.discoveredClickPoints = this.discoveredClickPoints.filter((key) =>
        validClickPointKey(this.levels, key),
      )
      this.unlockedClues = this.unlockedClues.filter((key) => validClueKey(this.levels, key))
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
    setPanorama(index: number): boolean {
      if (!isInteger(index, 0, (this.currentLevel?.panorama.length ?? 0) - 1)) return false
      this.currentPanoramaIndex = index
      this.persist()
      return true
    },
    isClueUnlocked(index: number): boolean {
      return (
        isInteger(index, 0, (this.currentLevel?.clues.length ?? 0) - 1) &&
        this.unlockedClues.includes(clueKey(this.currentLevelIndex, index))
      )
    },
    unlockClue(index: number): boolean {
      if (
        !this.hasStarted ||
        !isInteger(index, 0, (this.currentLevel?.clues.length ?? 0) - 1) ||
        this.isClueUnlocked(index)
      )
        return false
      this.unlockedClues.push(clueKey(this.currentLevelIndex, index))
      this.persist()
      return true
    },
    discoverClickPoint(panoramaIndex: number, pointIndex: number): boolean {
      if (
        !this.hasStarted ||
        !isInteger(panoramaIndex, 0, (this.currentLevel?.panorama.length ?? 0) - 1) ||
        !isInteger(
          pointIndex,
          0,
          (this.currentLevel?.panorama[panoramaIndex]?.click_points.length ?? 0) - 1,
        )
      )
        return false
      const key = clickPointKey(this.currentLevelIndex, panoramaIndex, pointIndex)
      if (this.discoveredClickPoints.includes(key)) return false
      this.discoveredClickPoints.push(key)
      this.persist()
      return true
    },
    startGame(requestedIndex?: number): void {
      const index = requestedIndex ?? this.selectedLevelIndex
      if (!isInteger(index, 0, this.levels.length - 1)) return
      this.pauseTimer()
      this.mode = 'single'
      this.currentLevelIndex = index
      this.selectedLevelIndex = index
      this.currentPanoramaIndex = 0
      this.discoveredClickPoints = []
      this.unlockedClues = []
      this.attempts = []
      this.completedLevelIndexes = []
      this.rounds = [
        { levelIndex: index, questionOrder: shuffle(this.levels[index]?.problems.length ?? 0) },
      ]
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
    submitAnswer(answer: number | number[]): boolean | null {
      const question = this.currentProblem
      const problemIndex = this.currentProblemIndex
      const answers = Array.isArray(answer) ? [...new Set(answer)].sort((a, b) => a - b) : [answer]
      if (
        !this.hasStarted ||
        this.completed ||
        !question ||
        problemIndex === null ||
        answers.length === 0 ||
        !answers.every((entry) => isInteger(entry, 0, 3))
      )
        return null
      const expected = question.true_answers?.length
        ? [...new Set(question.true_answers)].sort((a, b) => a - b)
        : [question.true_answer]
      const correct =
        answers.length === expected.length &&
        answers.every((entry, index) => entry === expected[index])
      const selectedAnswer = answers.length === 1 ? answers[0]! : answers
      this.attempts.push({
        levelIndex: this.currentLevelIndex,
        problemIndex,
        selectedAnswer,
        correct,
        skipped: false,
        at: Date.now(),
      })
      this.completedLevelIndexes = solvedIndexes(this)
      this.persist()
      return correct
    },
    skipCurrentProblem(): boolean {
      const problemIndex = this.currentProblemIndex
      if (!this.hasStarted || this.completed || problemIndex === null || !this.currentProblem)
        return false
      this.attempts.push({
        levelIndex: this.currentLevelIndex,
        problemIndex,
        selectedAnswer: null,
        correct: false,
        skipped: true,
        at: Date.now(),
      })
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
        this.currentPanoramaIndex = 0
        this.rounds.push({
          levelIndex: this.currentLevelIndex,
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
          currentPanoramaIndex: this.currentPanoramaIndex,
          discoveredClickPoints: this.discoveredClickPoints,
          unlockedClues: this.unlockedClues,
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
        const snapshot: unknown = migrateSnapshot(JSON.parse(raw))
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
        if (
          (snapshot.questionFingerprint ?? questionFingerprint(snapshot.levels)) !==
          questionFingerprint(config.levels)
        ) {
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
        const firstAttemptRules =
          snapshot.completionRule === 'first-attempt' ||
          snapshot.attempts.some((entry) => entry.skipped !== undefined)
        const attempts = snapshot.attempts
          .filter((entry) => campaign || entry.levelIndex === currentLevelIndex)
          .map((entry): Attempt => {
            if (firstAttemptRules || entry.selectedAnswer === null) return entry
            return { ...entry, legacy: true }
          })
        const rounds = snapshot.rounds.filter(
          (entry) => campaign || entry.levelIndex === currentLevelIndex,
        )
        const completedLevelIndexes = solvedIndexes({
          levels: config.levels,
          rounds,
          attempts,
          difficulty: snapshot.difficulty,
        })
        const currentPanoramaIndex = Math.min(
          snapshot.currentPanoramaIndex ?? 0,
          Math.max(0, (config.levels[currentLevelIndex]?.panorama.length ?? 1) - 1),
        )
        const discoveredClickPoints = (snapshot.discoveredClickPoints ?? []).filter((key) =>
          validClickPointKey(config.levels, key),
        )
        const unlockedClues = (snapshot.unlockedClues ?? []).filter((key) =>
          validClueKey(config.levels, key),
        )
        this.$patch({
          ...config,
          mode: snapshot.mode ?? 'single',
          locationId,
          difficulty: snapshot.difficulty,
          currentLevelIndex,
          selectedLevelIndex: snapshot.hasStarted ? currentLevelIndex : snapshot.selectedLevelIndex,
          currentPanoramaIndex,
          discoveredClickPoints,
          unlockedClues,
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
