import { defineStore } from 'pinia'
import { gameLocations } from '@/data/game'
import type { Attempt, Difficulty, ImagePanorama, level, problem, StoryPackage } from '@/types/game'
import type { GameMode, GameRound, GameState, Snapshot } from '@/types/gamestore'
import {
  configRevision,
  createRuntimeSource,
  sourceStorageKey as runtimeStorageKey,
  storyMetadata,
  type RuntimeSource,
} from '@/utils/runtimeSource'
import { getStory, isStoryPackage, normalizeStory, storyRevision } from '@/utils/storyPackage'
import {
  copyAuthors,
  copyConfig,
  copyLevels,
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

function builtinMetadata(id: string) {
  const location = gameLocations.find((entry) => entry.id === id)
  if (!location) return null
  return {
    id: location.id,
    name: location.name,
    subtitle: location.subtitle,
    coordinates: location.coordinates,
    background_url: location.background_url,
    title: location.title,
    introduction: location.introduction,
    art_caption: location.art_caption,
    art_caption_english: location.art_caption_english,
  }
}

function initialState(): GameState {
  const sourceId = defaultLocationId()
  const config = copyConfig(sourceId)
  return {
    ...config,
    mode: 'single',
    locationId: sourceId,
    sourceKind: 'builtin',
    sourceId,
    sourceRevision: configRevision(config.levels, config.authors),
    activeStory: null,
    capturedFrame: '',
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
  }
}

function sourceFromState(state: Pick<GameState, 'sourceKind' | 'sourceId' | 'sourceRevision'>) {
  return createRuntimeSource(state.sourceKind, state.sourceId, state.sourceRevision)
}

export const useGameStore = defineStore('game', {
  state: (): GameState => initialState(),
  getters: {
    currentLevel: (state): level | undefined => state.levels[state.currentLevelIndex],
    currentPanorama(): ImagePanorama | undefined {
      return this.currentLevel?.panorama[this.currentPanoramaIndex]
    },
    isUgc: (state): boolean => state.sourceKind === 'ugc',
    activeMetadata: (state) =>
      state.activeStory ? storyMetadata(state.activeStory) : builtinMetadata(state.sourceId),
    activeLocation: (state) =>
      state.activeStory ? storyMetadata(state.activeStory) : builtinMetadata(state.sourceId),
    totalDiscoveryCount: (state): number => {
      const currentLevel = state.levels[state.currentLevelIndex]
      if (!currentLevel) return 0
      if (currentLevel.clues.length > 0) return currentLevel.clues.length
      const hotspotCount = new Set(
        (currentLevel.hotspots ?? []).map((hotspot) => hotspot.clue_index),
      ).size
      if (hotspotCount > 0) return hotspotCount
      return currentLevel.panorama.reduce(
        (total, panorama) =>
          total + panorama.click_points.filter((point) => !point.dialogue_id).length,
        0,
      )
    },
    totalClickPointCount(): number {
      return this.totalDiscoveryCount
    },
    discoveredCount(): number {
      const levelPrefix = `${this.currentLevelIndex}:`
      const unlockedClueCount = this.unlockedClues.filter((key) =>
        key.startsWith(levelPrefix),
      ).length
      const discoveredPointCount = this.discoveredClickPoints.filter((key) =>
        key.startsWith(levelPrefix),
      ).length
      return Math.min(this.totalDiscoveryCount, Math.max(unlockedClueCount, discoveredPointCount))
    },
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
      const normalizedStory =
        this.sourceKind === 'ugc' && this.activeStory ? normalizeStory(this.activeStory) : null
      const config = normalizedStory
        ? {
            levels: copyLevels(normalizedStory.levels),
            authors: copyAuthors(normalizedStory.authors),
          }
        : copyConfig(this.sourceId || this.locationId)
      const source = normalizedStory
        ? createRuntimeSource('ugc', normalizedStory.id, storyRevision(normalizedStory))
        : sourceFromState(this)
      const configChanged =
        questionFingerprint(this.levels) !== questionFingerprint(config.levels) ||
        source.sourceRevision !== this.sourceRevision
      if (configChanged) {
        const hadProgress = this.hasStarted
        const difficulty = this.difficulty
        this.$patch({
          ...config,
          mode: 'single',
          difficulty,
          sourceKind: source.sourceKind,
          sourceId: source.sourceId,
          sourceRevision: source.sourceRevision,
          activeStory: normalizedStory,
          locationId: source.sourceKind === 'ugc' ? `story:${source.sourceId}` : source.sourceId,
          currentLevelIndex: 0,
          selectedLevelIndex: 0,
          currentPanoramaIndex: 0,
          capturedFrame: '',
          discoveredClickPoints: [],
          unlockedClues: [],
          startedAt: null,
          elapsedMs: 0,
          completed: false,
          attempts: [],
          completedLevelIndexes: [],
          rounds: [],
          hasStarted: false,
        })
        if (hadProgress)
          this.persistenceError = '题目配置已更新，旧进度不兼容，已重置。请重新开始。'
        return
      }
      this.$patch({ ...config, activeStory: normalizedStory ?? this.activeStory })
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
      if (id === this.sourceId && this.sourceKind === 'builtin') return false
      return this.loadBuiltin(id, false)
    },
    gameStorageKey(): string {
      if (this.sourceKind === 'builtin') return GAME_STORAGE_KEY
      return runtimeStorageKey(sourceFromState(this))
    },
    loadBuiltin(id = defaultLocationId(), restore = true): boolean {
      const levels = locationLevels(id)
      if (levels === undefined) return false
      this.pauseTimer()
      const difficulty = this.difficulty
      const config = copyConfig(id)
      const source = createRuntimeSource(
        'builtin',
        id,
        configRevision(config.levels, config.authors),
      )
      this.$reset()
      this.$patch({
        ...config,
        mode: 'single',
        locationId: id,
        sourceKind: source.sourceKind,
        sourceId: source.sourceId,
        sourceRevision: source.sourceRevision,
        activeStory: null,
        capturedFrame: '',
        difficulty,
        currentLevelIndex: 0,
        selectedLevelIndex: 0,
        currentPanoramaIndex: 0,
        discoveredClickPoints: [],
        unlockedClues: [],
        startedAt: null,
        elapsedMs: 0,
        completed: false,
        attempts: [],
        completedLevelIndexes: [],
        rounds: [],
        hasStarted: false,
        persistenceError: '',
      })
      if (restore && this.restoreForSource()) return true
      this.persist()
      return true
    },
    loadStory(story: StoryPackage, restore = true): boolean {
      if (!isStoryPackage(story)) return false
      const normalized = normalizeStory(story)
      const config = {
        levels: copyLevels(normalized.levels),
        authors: copyAuthors(normalized.authors),
      }
      const source = createRuntimeSource('ugc', normalized.id, storyRevision(normalized))
      this.pauseTimer()
      const difficulty = this.difficulty
      this.$reset()
      this.$patch({
        ...config,
        mode: 'single',
        locationId: `story:${normalized.id}`,
        sourceKind: source.sourceKind,
        sourceId: source.sourceId,
        sourceRevision: source.sourceRevision,
        activeStory: normalized,
        capturedFrame: '',
        difficulty,
        currentLevelIndex: 0,
        selectedLevelIndex: 0,
        currentPanoramaIndex: 0,
        discoveredClickPoints: [],
        unlockedClues: [],
        startedAt: null,
        elapsedMs: 0,
        completed: false,
        attempts: [],
        completedLevelIndexes: [],
        rounds: [],
        hasStarted: false,
        persistenceError: '',
      })
      if (restore && this.restoreForSource()) return true
      this.persist()
      return true
    },
    restoreForSource(): boolean {
      const source = sourceFromState(this)
      const key = this.gameStorageKey()
      let raw: string | null = null
      try {
        raw = localStorage.getItem(key)
      } catch {
        this.persistenceError = '存档读取失败或格式损坏。可重试，或重新开始覆盖存档。'
        return false
      }
      if (raw === null) {
        this.persistenceError = ''
        return false
      }
      return this.restoreSnapshot(raw, source)
    },
    restoreSource(): boolean {
      return this.restoreForSource()
    },
    captureFrame(dataUrl: string): boolean {
      if (!/^data:image\/(?:png|jpeg|webp);base64,/i.test(dataUrl) || dataUrl.length > 12_000_000)
        return false
      this.capturedFrame = dataUrl
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
      this.capturedFrame = ''
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
        this.capturedFrame = ''
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
          version: this.sourceKind === 'ugc' ? 2 : 1,
          mode: this.mode,
          locationId: this.locationId,
          sourceKind: this.sourceKind,
          sourceId: this.sourceId,
          sourceRevision: this.sourceRevision,
          story:
            this.sourceKind === 'ugc' && this.activeStory
              ? normalizeStory(this.activeStory)
              : undefined,
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
        localStorage.setItem(this.gameStorageKey(), JSON.stringify(snapshot))
        this.persistenceError = ''
      } catch {
        this.persistenceError = '进度保存失败，请允许浏览器本地存储或释放空间后重试。'
      }
    },
    retryPersistence(): void {
      this.persist()
    },
    restoreSnapshot(raw: string, expectedSource?: RuntimeSource): boolean {
      try {
        const requestedSource = expectedSource ?? sourceFromState(this)
        const snapshot: unknown = migrateSnapshot(JSON.parse(raw))
        if (!isSnapshot(snapshot)) {
          this.persistenceError = '存档数据无效，未载入。请重新开始以覆盖损坏的存档。'
          return false
        }

        const legacySource = snapshot.sourceKind === undefined && snapshot.sourceId === undefined
        let source = requestedSource
        if (legacySource && requestedSource.sourceKind === 'builtin' && snapshot.locationId) {
          const legacyLevels = locationLevels(snapshot.locationId)
          if (legacyLevels === undefined) {
            this.persistenceError = '存档地点无效，未载入。请重新选择探索地点。'
            return false
          }
          const legacyConfig = copyConfig(snapshot.locationId)
          source = createRuntimeSource(
            'builtin',
            snapshot.locationId,
            configRevision(legacyConfig.levels, legacyConfig.authors),
          )
        } else if (snapshot.sourceKind === undefined && snapshot.sourceId !== undefined) {
          if (requestedSource.sourceKind === 'builtin') {
            const legacyLevels = locationLevels(snapshot.sourceId)
            if (legacyLevels === undefined) {
              this.persistenceError = '存档地点无效，未载入。请重新选择探索地点。'
              return false
            }
            const legacyConfig = copyConfig(snapshot.sourceId)
            source = createRuntimeSource(
              'builtin',
              snapshot.sourceId,
              configRevision(legacyConfig.levels, legacyConfig.authors),
            )
          } else if (snapshot.sourceId !== requestedSource.sourceId) {
            this.persistenceError = '存档来源与当前故事不匹配，未载入。'
            return false
          }
        }
        if (
          snapshot.sourceKind !== undefined &&
          (snapshot.sourceKind !== source.sourceKind || snapshot.sourceId !== source.sourceId)
        ) {
          this.persistenceError = '存档来源与当前故事不匹配，未载入。'
          return false
        }

        let config: Pick<GameState, 'levels' | 'authors'>
        let activeStory: StoryPackage | null = null
        if (source.sourceKind === 'ugc') {
          let story: StoryPackage | undefined
          if (snapshot.story && isStoryPackage(snapshot.story))
            story = normalizeStory(snapshot.story)
          if (!story && this.activeStory) story = normalizeStory(this.activeStory)
          if (!story) story = getStory(source.sourceId)
          if (story && storyRevision(story) === source.sourceRevision) {
            activeStory = story
            config = {
              levels: copyLevels(story.levels),
              authors: copyAuthors(story.authors),
            }
          } else if (snapshot.sourceRevision === source.sourceRevision) {
            config = {
              levels: copyLevels(snapshot.levels),
              authors: copyAuthors(snapshot.authors),
            }
          } else {
            this.persistenceError = '故事版本已更新或已删除，旧进度未载入。'
            return false
          }
        } else {
          config = copyConfig(source.sourceId)
        }

        if (
          ((source.sourceKind === 'ugc' || snapshot.version >= 2) &&
            snapshot.sourceRevision !== undefined &&
            snapshot.sourceRevision !== source.sourceRevision) ||
          (snapshot.questionFingerprint ?? questionFingerprint(snapshot.levels)) !==
            questionFingerprint(config.levels)
        ) {
          this.$patch({
            ...config,
            mode: 'single',
            locationId: source.sourceKind === 'ugc' ? `story:${source.sourceId}` : source.sourceId,
            sourceKind: source.sourceKind,
            sourceId: source.sourceId,
            sourceRevision: source.sourceRevision,
            activeStory,
            capturedFrame: '',
            currentLevelIndex: 0,
            selectedLevelIndex: 0,
            currentPanoramaIndex: 0,
            discoveredClickPoints: [],
            unlockedClues: [],
            startedAt: null,
            elapsedMs: 0,
            completed: false,
            attempts: [],
            completedLevelIndexes: [],
            rounds: [],
            hasStarted: false,
          })
          this.persistenceError = '题目配置已更新，旧进度不兼容，已重置。请重新开始。'
          return false
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
          locationId: source.sourceKind === 'ugc' ? `story:${source.sourceId}` : source.sourceId,
          sourceKind: source.sourceKind,
          sourceId: source.sourceId,
          sourceRevision: source.sourceRevision,
          activeStory,
          capturedFrame: '',
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
        return true
      } catch {
        this.persistenceError = '存档读取失败或格式损坏。可重试，或重新开始覆盖存档。'
        return false
      }
    },
    restore(): void {
      // The legacy formal-location save used one shared key. Infer its location
      // before hydrating so old saves continue to work when the app is opened on
      // a different route. UGC saves are deliberately isolated and never read here.
      try {
        const raw = localStorage.getItem(GAME_STORAGE_KEY)
        if (raw === null) {
          this.persistenceError = ''
          return
        }
        const migrated: unknown = migrateSnapshot(JSON.parse(raw))
        if (!isSnapshot(migrated)) {
          this.persistenceError = '存档数据无效，未载入。请重新开始以覆盖损坏的存档。'
          return
        }
        if (migrated.sourceKind === 'ugc') {
          this.persistenceError = '存档来源与当前地点不匹配，未载入。'
          return
        }
        const candidate =
          (typeof migrated.locationId === 'string' && migrated.locationId.length > 0
            ? migrated.locationId
            : migrated.sourceId) ?? defaultLocationId()
        if (locationLevels(candidate) === undefined) {
          this.persistenceError = '存档地点无效，未载入。请重新选择探索地点。'
          return
        }
        const config = copyConfig(candidate)
        const source = createRuntimeSource(
          'builtin',
          candidate,
          configRevision(config.levels, config.authors),
        )
        this.loadBuiltin(candidate, false)
        this.restoreSnapshot(JSON.stringify(migrated), source)
      } catch {
        this.persistenceError = '存档读取失败或格式损坏。可重试，或重新开始覆盖存档。'
      }
    },
  },
})
