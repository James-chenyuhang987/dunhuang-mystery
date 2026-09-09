import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { gameAuthors, gameLevels, gameLocations } from '@/data/game'
import { GAME_STORAGE_KEY, useGameStore } from '@/stores/game'
import type { Difficulty, level } from '@/types/game'

vi.mock('@/data/game', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/data/game')>()
  const gameLevels: level[] = []
  return {
    ...original,
    gameLevels,
    gameLocations: [{ id: 'default', name: '默认地点', subtitle: '测试', coordinates: '0,0',
      background_url: '/default.svg', levels: gameLevels }],
  }
})

function createLevels(questionCounts: number[], prefix = '', duplicateNames = false): level[] {
  return questionCounts.map((count, index): level => ({
    name: duplicateNames ? '同名关卡' : `${prefix}关卡 ${index}`,
    panorama_url: `/${prefix}level-${index}.svg`,
    clues: [],
    problems: Array.from({ length: count }, (_, questionIndex) => ({
      title: `${prefix}题目 ${index}-${questionIndex}`,
      select: ['甲', '乙', '丙', '丁'],
      true_answer: (questionIndex + 1) % 4,
      reason: '测试解析',
    })),
  }))
}

function configureLevels(questionCounts: number[], duplicateNames = false): void {
  gameLevels.splice(0, gameLevels.length, ...createLevels(questionCounts, '', duplicateNames))
}

function answerCurrent(store: ReturnType<typeof useGameStore>): void {
  const question = store.currentProblem
  expect(question).not.toBeNull()
  if (question) expect(store.submitAnswer(question.true_answer)).toBe(true)
}

function finishLevel(store: ReturnType<typeof useGameStore>): void {
  while (store.currentProblem) answerCurrent(store)
}

function saveWith(store: ReturnType<typeof useGameStore>, changes: Record<string, unknown>): void {
  store.pauseTimer()
  localStorage.setItem(GAME_STORAGE_KEY, JSON.stringify({ version: 1, ...store.$state, ...changes }))
}

beforeEach(() => {
  gameLocations.splice(1)
  gameLocations[0] = { id: 'default', name: '默认地点', subtitle: '测试', coordinates: '0,0',
    background_url: '/default.svg', levels: gameLevels }
  configureLevels([3, 4, 3])
  setActivePinia(createPinia())
  localStorage.clear()
  vi.useFakeTimers()
  vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'))
  vi.spyOn(Math, 'random').mockReturnValue(0)
})

afterEach(() => {
  vi.restoreAllMocks()
  vi.useRealTimers()
})

describe('game selections and answers', () => {
  it.each<[Difficulty, number]>([[1, 1], [2, 2], [3, 3]])('selects tier %i with %i of three questions', (difficulty, count) => {
    const store = useGameStore()
    store.setDifficulty(difficulty)
    store.startGame()
    expect(store.selectedQuestionIndexes).toHaveLength(count)
    expect(new Set(store.selectedQuestionIndexes).size).toBe(count)
    expect(store.rounds[0]?.questionOrder).toEqual([1, 2, 0])
  })

  it.each<[number, Difficulty, number]>([
    [0, 1, 1], [0, 2, 2], [0, 3, 3],
    [1, 1, 1], [1, 2, 2], [1, 3, 4],
    [2, 1, 1], [2, 2, 2], [2, 3, 3],
  ])('asks %i level at tier %i exactly %i questions', (index, difficulty, count) => {
    const store = useGameStore()
    store.setDifficulty(difficulty)
    store.startGame(index)
    expect(store.selectedQuestionIndexes).toHaveLength(count)
    finishLevel(store)
    expect(store.attempts).toHaveLength(count)
    expect(store.advanceLevel()).toBe(true)
    expect(store.currentLevelIndex).toBe(index)
  })

  it('preserves the full random order and answers across live difficulty switches', () => {
    const store = useGameStore()
    store.setDifficulty(3)
    store.startGame()
    const order = [...store.selectedQuestionIndexes]
    answerCurrent(store)
    answerCurrent(store)
    const attempts = [...store.attempts]
    store.setDifficulty(1)
    expect(store.selectedQuestionIndexes).toEqual(order.slice(0, 1))
    expect(store.levelSolved).toBe(true)
    expect(store.correctCount).toBe(2)
    store.setDifficulty(3)
    expect(store.selectedQuestionIndexes).toEqual(order)
    expect(store.attempts).toEqual(attempts)
    expect(store.currentProblemIndex).toBe(order[2])
    expect(store.levelSolved).toBe(false)
  })

  it('records original indexes and completes a question after one wrong answer', () => {
    const store = useGameStore()
    store.setDifficulty(2)
    store.startGame(1)
    const index = store.currentProblemIndex
    const question = store.currentProblem
    expect(index).toBe(1)
    if (!question) throw new Error('Missing question')
    expect(store.submitAnswer((question.true_answer + 1) % 4)).toBe(false)
    expect(store.currentProblemIndex).toBe(2)
    const nextQuestion = store.currentProblem
    if (!nextQuestion) throw new Error('Missing next question')
    expect(store.submitAnswer(nextQuestion.true_answer)).toBe(true)
    expect(store.wrongCount).toBe(1)
    expect(store.correctCount).toBe(1)
    expect(store.skippedCount).toBe(0)
    expect(store.attempts.map(({ levelIndex, problemIndex, correct }) => ({ levelIndex, problemIndex, correct }))).toEqual([
      { levelIndex: 1, problemIndex: index, correct: false },
      { levelIndex: 1, problemIndex: 2, correct: true },
    ])
  })

  it('skips each current problem once and tracks skipped separately from wrong answers', () => {
    const store = useGameStore()
    store.setDifficulty(3)
    store.startGame()
    const [first, second, third] = store.selectedQuestionIndexes
    expect(store.skipCurrentProblem()).toBe(true)
    expect(store.currentProblemIndex).toBe(second)
    expect(store.skipCurrentProblem()).toBe(true)
    expect(store.currentProblemIndex).toBe(third)
    answerCurrent(store)
    expect(store.levelSolved).toBe(true)
    expect(store.skipCurrentProblem()).toBe(false)
    expect(store.submitAnswer(0)).toBeNull()
    expect(store.skippedCount).toBe(2)
    expect(store.wrongCount).toBe(0)
    expect(store.correctCount).toBe(1)
    expect(store.attempts).toEqual([
      expect.objectContaining({ problemIndex: first, selectedAnswer: null, correct: false, skipped: true }),
      expect.objectContaining({ problemIndex: second, selectedAnswer: null, correct: false, skipped: true }),
      expect.objectContaining({ problemIndex: third, skipped: false }),
    ])
  })

  it('keeps home selection separate from the active level and rejects invalid inputs', () => {
    const store = useGameStore()
    expect(store.submitAnswer(0)).toBeNull()
    expect(store.currentProblem).toBeNull()
    store.selectLevel(1)
    expect(store.currentLevelIndex).toBe(0)
    store.startGame()
    expect(store.currentLevelIndex).toBe(1)
    store.selectLevel(2)
    expect(store.currentLevelIndex).toBe(1)
    store.selectLevel(-1)
    expect(store.selectedLevelIndex).toBe(2)
    store.startGame(999)
    expect(store.currentLevelIndex).toBe(1)
    for (const answer of [-1, 4, 0.5, Number.NaN]) expect(store.submitAnswer(answer)).toBeNull()
    expect(store.attempts).toEqual([])
  })

  it('refreshes authors and presentation in an existing store without losing progress', () => {
    const store = useGameStore()
    store.startGame(1)
    answerCurrent(store)
    const attempts = [...store.attempts]
    const order = [...store.selectedQuestionIndexes]
    store.authors = [{ name: '旧作者', job: '旧身份' }]
    const level = store.levels[1]
    if (!level) throw new Error('Missing level')
    level.panorama_url = '/old.jpg'
    store.refreshConfig()
    expect(store.authors).toEqual(gameAuthors)
    expect(store.levels).toEqual(gameLevels)
    expect(store.attempts).toEqual(attempts)
    expect(store.selectedQuestionIndexes).toEqual(order)
    expect(store.currentLevelIndex).toBe(1)
    expect(store.hasProgress).toBe(true)
  })

  it('resets an active round on an incompatible live config refresh', () => {
    const store = useGameStore()
    store.startGame(1)
    answerCurrent(store)
    const question = store.levels[1]?.problems[0]
    if (!question) throw new Error('Missing question')
    question.title = '旧问题'
    store.refreshConfig()
    expect(store.levels).toEqual(gameLevels)
    expect(store.authors).toEqual(gameAuthors)
    expect(store.hasProgress).toBe(false)
    expect(store.attempts).toEqual([])
    expect(store.persistenceError).toContain('题目配置已更新')
  })

  it('does not mutate the exported seed configuration', () => {
    const store = useGameStore()
    const original = gameLevels[0]?.name
    if (store.levels[0]) store.levels[0].name = '测试'
    expect(gameLevels[0]?.name).toBe(original)
  })
})

describe('completion and replay', () => {
  it.each([0, 1, 2])('finishes only selected level %i and restores its ending', (index) => {
    const store = useGameStore()
    store.startGame(index)
    expect(store.advanceLevel()).toBe(false)
    expect(store.currentLevelIndex).toBe(index)
    finishLevel(store)
    expect(store.advanceLevel()).toBe(true)
    expect(store.currentLevelIndex).toBe(index)
    expect(store.completedLevelIndexes).toEqual([index])
    expect(store.rounds).toHaveLength(1)
    expect(store.completed).toBe(true)
    expect(store.startedAt).toBeNull()
    expect(store.advanceLevel()).toBe(true)
    store.resumeTimer()
    expect(store.startedAt).toBeNull()
    store.persist()
    setActivePinia(createPinia())
    const restored = useGameStore()
    restored.restore()
    expect(restored.persistenceError).toBe('')
    expect(restored.currentLevelIndex).toBe(index)
    expect(restored.selectedLevelIndex).toBe(index)
    expect(restored.completed).toBe(true)
    expect(restored.levelSolved).toBe(true)
    expect(restored.completedLevelIndexes).toEqual([index])
  })

  it.each([0, 1, 2])('reopens only selected level %i on increased difficulty without losing results', (index) => {
    const store = useGameStore()
    store.startGame(index)
    finishLevel(store)
    store.advanceLevel()
    const order = [...(store.rounds[0]?.questionOrder ?? [])]
    const attempts = [...store.attempts]
    expect(store.completed).toBe(true)
    store.setDifficulty(3)
    expect(store.completed).toBe(false)
    expect(store.currentLevelIndex).toBe(index)
    expect(store.selectedLevelIndex).toBe(index)
    expect(store.completedLevelIndexes).toEqual([])
    expect(store.correctCount).toBe(1)
    expect(store.attempts).toEqual(attempts)
    expect(store.selectedQuestionIndexes).toEqual(order)
    expect(store.currentProblemIndex).toBe(order[1])
    finishLevel(store)
    expect(store.advanceLevel()).toBe(true)
    expect(store.completed).toBe(true)
    expect(store.correctCount).toBe(gameLevels[index]?.problems.length)
    store.setDifficulty(1)
    expect(store.completed).toBe(true)
  })

  it('resets counters, timer and rounds on replay, preserving chosen tier and level', () => {
    const store = useGameStore()
    store.setDifficulty(2)
    store.startGame(1)
    answerCurrent(store)
    vi.advanceTimersByTime(800)
    store.replay()
    expect(store.difficulty).toBe(2)
    expect(store.currentLevelIndex).toBe(1)
    expect(store.correctCount).toBe(0)
    expect(store.wrongCount).toBe(0)
    expect(store.skippedCount).toBe(0)
    expect(store.elapsedMs).toBe(0)
    expect(store.completedLevelIndexes).toEqual([])
    expect(store.rounds).toHaveLength(1)
    expect(store.hasProgress).toBe(true)
  })
})

describe('linear campaigns and configurable levels', () => {
  it.each([1, 5, 7])('plays all %i levels by index, even with duplicate names, and restores the ending', (count) => {
    configureLevels(Array.from({ length: count }, () => 3), true)
    const store = useGameStore()
    store.selectLevel(count - 1)
    store.startCampaign()
    expect(store.mode).toBe('campaign')
    expect(store.currentLevelIndex).toBe(0)
    expect(store.canAdvance).toBe(false)
    for (let index = 0; index < count; index += 1) {
      expect(store.currentLevelIndex).toBe(index)
      expect(store.isLastLevel).toBe(index === count - 1)
      expect(store.advanceLevel()).toBe(false)
      finishLevel(store)
      expect(store.canAdvance).toBe(true)
      expect(store.advanceLevel()).toBe(index === count - 1)
    }
    expect(store.completed).toBe(true)
    expect(store.canAdvance).toBe(false)
    expect(store.rounds).toHaveLength(count)
    expect(store.correctCount).toBe(count)
    expect(store.completedLevelIndexes).toEqual(Array.from({ length: count }, (_, index) => index))
    setActivePinia(createPinia())
    const restored = useGameStore()
    restored.restore()
    expect(restored.persistenceError).toBe('')
    expect(restored.mode).toBe('campaign')
    expect(restored.completed).toBe(true)
    expect(restored.attempts).toEqual(store.attempts)
    expect(restored.rounds).toEqual(store.rounds)
    expect(restored.advanceLevel()).toBe(true)
    restored.replay()
    expect(restored.mode).toBe('campaign')
    expect(restored.currentLevelIndex).toBe(0)
    expect(restored.attempts).toEqual([])
    expect(restored.rounds).toHaveLength(1)
  })

  it('keeps single-level selection independent after starting a campaign', () => {
    configureLevels([1, 2, 3, 4, 5])
    const store = useGameStore()
    store.startCampaign()
    finishLevel(store)
    store.advanceLevel()
    store.startGame(3)
    expect(store.mode).toBe('single')
    expect(store.isLastLevel).toBe(true)
    expect(store.rounds).toHaveLength(1)
    expect(store.attempts).toEqual([])
    finishLevel(store)
    expect(store.advanceLevel()).toBe(true)
    expect(store.currentLevelIndex).toBe(3)
    expect(store.completedLevelIndexes).toEqual([3])
  })

  it('freezes departed campaign rounds while live difficulty changes and partial restoration remain valid', () => {
    configureLevels([3, 4, 5, 2, 3])
    const store = useGameStore()
    store.startCampaign()
    const question = store.currentProblem
    if (!question) throw new Error('Missing question')
    store.submitAnswer((question.true_answer + 1) % 4)
    finishLevel(store)
    vi.advanceTimersByTime(1000)
    expect(store.advanceLevel()).toBe(false)
    const previousAttempts = [...store.attempts]
    expect(store.rounds[0]?.completedDifficulty).toBe(1)
    store.setDifficulty(3)
    expect(store.completedLevelIndexes).toEqual([0])
    answerCurrent(store)
    const order = [...store.selectedQuestionIndexes]
    store.setDifficulty(1)
    expect(store.levelSolved).toBe(true)
    store.setDifficulty(3)
    expect(store.levelSolved).toBe(false)
    store.pauseTimer()
    store.persist()
    setActivePinia(createPinia())
    const restored = useGameStore()
    restored.restore()
    expect(restored.persistenceError).toBe('')
    expect(restored.mode).toBe('campaign')
    expect(restored.currentLevelIndex).toBe(1)
    expect(restored.selectedQuestionIndexes).toEqual(order)
    expect(restored.attempts.slice(0, previousAttempts.length)).toEqual(previousAttempts)
    expect(restored.attempts).toEqual(store.attempts)
    expect(restored.completedLevelIndexes).toEqual([0])
    expect(restored.elapsedMs).toBe(1000)
    expect(restored.startedAt).toBeNull()
    restored.resumeTimer()
    finishLevel(restored)
    expect(restored.advanceLevel()).toBe(false)
    restored.setDifficulty(1)
    expect(restored.completedLevelIndexes).toEqual([0, 1])
    expect(restored.rounds[1]?.completedDifficulty).toBe(3)
    while (!restored.completed) {
      finishLevel(restored)
      restored.advanceLevel()
    }
    restored.setDifficulty(3)
    expect(restored.completed).toBe(false)
    expect(restored.completedLevelIndexes).toEqual([0, 1, 2, 3])
    expect(restored.currentLevelIndex).toBe(4)
    restored.restore()
    expect(restored.persistenceError).toBe('')
    finishLevel(restored)
    expect(restored.advanceLevel()).toBe(true)
  })

  it('cannot start an empty level list and safely restores its untouched state', () => {
    configureLevels([])
    const store = useGameStore()
    store.startCampaign()
    store.startGame()
    store.selectLevel(0)
    expect(store.hasStarted).toBe(false)
    expect(store.levelSolved).toBe(false)
    expect(store.canAdvance).toBe(false)
    expect(store.advanceLevel()).toBe(false)
    expect(store.currentLevel).toBeUndefined()
    store.setDifficulty(3)
    setActivePinia(createPinia())
    const restored = useGameStore()
    restored.restore()
    expect(restored.persistenceError).toBe('')
    expect(restored.levels).toEqual([])
    expect(restored.hasStarted).toBe(false)
    expect(restored.difficulty).toBe(3)
  })

  it.each(['single', 'campaign'] as const)('starts and manually completes empty question rounds in %s mode', (mode) => {
    configureLevels([0, 2, 0, 0, 1])
    const store = useGameStore()
    expect(store.levelSolved).toBe(false)
    if (mode === 'campaign') store.startCampaign()
    else store.startGame(0)
    expect(store.levelSolved).toBe(true)
    expect(store.canAdvance).toBe(true)
    expect(store.completed).toBe(false)
    expect(store.currentProblem).toBeNull()
    expect(store.submitAnswer(0)).toBeNull()
    expect(store.rounds[0]?.questionOrder).toEqual([])
    store.restore()
    expect(store.persistenceError).toBe('')
    expect(store.completedLevelIndexes).toEqual([0])
    expect(store.advanceLevel()).toBe(mode === 'single')
    if (mode === 'campaign') {
      finishLevel(store)
      expect(store.advanceLevel()).toBe(false)
      expect(store.currentLevelIndex).toBe(2)
      store.setDifficulty(3)
      expect(store.completedLevelIndexes).toEqual([0, 1, 2])
      store.restore()
      expect(store.persistenceError).toBe('')
      expect(store.levelSolved).toBe(true)
      expect(store.advanceLevel()).toBe(false)
      expect(store.currentLevelIndex).toBe(3)
      expect(store.advanceLevel()).toBe(false)
      finishLevel(store)
      expect(store.advanceLevel()).toBe(true)
      expect(store.completedLevelIndexes).toEqual([0, 1, 2, 3, 4])
    }
  })

  it.each([1, 5])('allows an all-empty %i-round campaign to finish manually and restore', (count) => {
    configureLevels(Array.from({ length: count }, () => 0))
    const store = useGameStore()
    store.startCampaign()
    for (let index = 0; index < count; index += 1) {
      expect(store.levelSolved).toBe(true)
      expect(store.advanceLevel()).toBe(index === count - 1)
    }
    store.restore()
    expect(store.persistenceError).toBe('')
    expect(store.completed).toBe(true)
    expect(store.correctCount).toBe(0)
    expect(store.rounds).toHaveLength(count)
  })

  it.each(['missing', 'future', 'reordered', 'unfrozen', 'badDifficulty', 'frozenCurrent', 'unsolvedPrevious', 'prematureEnding', 'unknownMode', 'singleWithHistory'])('rejects inconsistent campaign %s state without overwriting current progress', (change) => {
    const store = useGameStore()
    store.startCampaign()
    finishLevel(store)
    store.advanceLevel()
    finishLevel(store)
    const rounds = store.rounds.map((round) => ({ ...round, questionOrder: [...round.questionOrder] }))
    const changes: Record<string, unknown> = {}
    if (change === 'missing') changes.rounds = rounds.slice(1)
    if (change === 'future') changes.rounds = [...rounds, { levelIndex: 2, questionOrder: [0, 1, 2] }]
    if (change === 'reordered') changes.rounds = rounds.reverse()
    if (change === 'unfrozen') changes.rounds = rounds.map(({ completedDifficulty: _, ...round }) => round)
    if (change === 'badDifficulty') changes.rounds = rounds.map((round) => ({ ...round, completedDifficulty: 4 }))
    if (change === 'frozenCurrent') changes.rounds = rounds.map((round) => ({ ...round, completedDifficulty: 1 }))
    if (change === 'unsolvedPrevious') {
      changes.attempts = store.attempts.filter((attempt) => attempt.levelIndex === 1)
      changes.completedLevelIndexes = [1]
    }
    if (change === 'prematureEnding') changes.completed = true
    if (change === 'unknownMode') changes.mode = 'invalid'
    if (change === 'singleWithHistory') changes.mode = 'single'
    saveWith(store, changes)
    const attempts = [...store.attempts]
    store.restore()
    expect(store.persistenceError).not.toBe('')
    expect(store.mode).toBe('campaign')
    expect(store.currentLevelIndex).toBe(1)
    expect(store.attempts).toEqual(attempts)
  })
})

describe('location-scoped progress', () => {
  function addSecondLocation(): level[] {
    const levels = createLevels([2, 3, 1], '异地')
    gameLocations.push({ id: 'second', name: '第二地点', subtitle: '异地测试', coordinates: '1,1',
      background_url: '/second.svg', levels })
    return levels
  }

  it('switches config and resets all progress and indexes', () => {
    const secondLevels = addSecondLocation()
    const store = useGameStore()
    store.setDifficulty(2)
    store.selectLevel(2)
    store.startGame()
    answerCurrent(store)
    expect(store.selectLocation('second')).toBe(true)
    expect(store.locationId).toBe('second')
    expect(store.levels).toEqual(secondLevels)
    expect(store.difficulty).toBe(2)
    expect(store.currentLevelIndex).toBe(0)
    expect(store.selectedLevelIndex).toBe(0)
    expect(store.hasStarted).toBe(false)
    expect(store.completed).toBe(false)
    expect(store.attempts).toEqual([])
    expect(store.rounds).toEqual([])
    expect(store.completedLevelIndexes).toEqual([])
    expect(store.selectLocation('missing')).toBe(false)
    expect(store.locationId).toBe('second')
  })

  it('runs and restores campaign only within the selected location', () => {
    const secondLevels = addSecondLocation()
    const store = useGameStore()
    store.selectLocation('second')
    store.startCampaign()
    while (!store.completed) {
      finishLevel(store)
      store.advanceLevel()
    }
    expect(store.rounds.map((round) => round.levelIndex)).toEqual([0, 1, 2])
    expect(store.currentLevelIndex).toBe(2)
    expect(store.levels).toEqual(secondLevels)
    setActivePinia(createPinia())
    const restored = useGameStore()
    restored.restore()
    expect(restored.persistenceError).toBe('')
    expect(restored.locationId).toBe('second')
    expect(restored.levels).toEqual(secondLevels)
    expect(restored.completed).toBe(true)
    expect(restored.rounds).toHaveLength(3)
  })

  it('migrates missing location to the first location and rejects unknown locations safely', () => {
    addSecondLocation()
    const store = useGameStore()
    store.startGame(1)
    answerCurrent(store)
    saveWith(store, { locationId: undefined })
    setActivePinia(createPinia())
    const legacy = useGameStore()
    legacy.restore()
    expect(legacy.persistenceError).toBe('')
    expect(legacy.locationId).toBe('default')
    expect(legacy.currentLevelIndex).toBe(1)
    const attempts = [...legacy.attempts]
    saveWith(legacy, { locationId: 'unknown' })
    legacy.restore()
    expect(legacy.persistenceError).toContain('存档地点无效')
    expect(legacy.locationId).toBe('default')
    expect(legacy.currentLevelIndex).toBe(1)
    expect(legacy.attempts).toEqual(attempts)
  })
})

describe('active elapsed time', () => {
  it('counts active segments once and excludes paused time', () => {
    const store = useGameStore()
    store.startGame()
    vi.advanceTimersByTime(1000)
    store.tick()
    expect(store.elapsedMs).toBe(1000)
    store.tick()
    store.resumeTimer()
    vi.advanceTimersByTime(500)
    store.pauseTimer()
    expect(store.elapsedMs).toBe(1500)
    vi.advanceTimersByTime(10000)
    store.tick()
    expect(store.elapsedMs).toBe(1500)
    store.resumeTimer()
    store.resumeTimer()
    vi.advanceTimersByTime(200)
    store.pauseTimer()
    expect(store.elapsedMs).toBe(1700)
  })

  it('does not subtract or double-count a backwards wall clock adjustment', () => {
    const store = useGameStore()
    store.startGame()
    const start = Date.now()
    vi.setSystemTime(start - 1000)
    store.tick()
    expect(store.elapsedMs).toBe(0)
    vi.setSystemTime(start + 500)
    store.tick()
    expect(store.elapsedMs).toBe(500)
  })
})

describe('persistence', () => {
  it('immediately saves difficulty, answers and the selected round ending', () => {
    const store = useGameStore()
    store.startGame(1)
    store.setDifficulty(2)
    answerCurrent(store)
    setActivePinia(createPinia())
    const restored = useGameStore()
    restored.restore()
    expect(restored.difficulty).toBe(2)
    expect(restored.attempts).toEqual(store.attempts)
    expect(restored.currentLevelIndex).toBe(1)
    finishLevel(restored)
    restored.advanceLevel()
    setActivePinia(createPinia())
    const finished = useGameStore()
    finished.restore()
    expect(finished.completed).toBe(true)
    expect(finished.currentLevelIndex).toBe(1)
    finished.setDifficulty(3)
    setActivePinia(createPinia())
    const reopened = useGameStore()
    reopened.restore()
    expect(reopened.completed).toBe(false)
    expect(reopened.difficulty).toBe(3)
    expect(reopened.currentLevelIndex).toBe(1)
    expect(reopened.correctCount).toBe(2)
  })

  it('accepts and preserves optional clue, hotspot and comparison config', () => {
    const configured = gameLevels[0]
    if (!configured) throw new Error('Missing level')
    configured.clues = [{ type: 'text', name: '关联线索', data: '线索内容', problem_indexes: [0, 2] }]
    configured.hotspots = [{ clue_index: 0, x: 25, y: 75 }]
    configured.comparison = { reference_url: '/reference.svg', title: '图像比对' }
    const store = useGameStore()
    store.startGame()
    store.persist()
    setActivePinia(createPinia())
    const restored = useGameStore()
    restored.restore()
    expect(restored.persistenceError).toBe('')
    expect(restored.levels[0]?.clues[0]?.problem_indexes).toEqual([0, 2])
    expect(restored.levels[0]?.hotspots).toEqual([{ clue_index: 0, x: 25, y: 75 }])
    expect(restored.levels[0]?.comparison).toEqual({ reference_url: '/reference.svg', title: '图像比对' })
  })

  it('restores validated config, random order, attempts and duration, but remains paused', () => {
    const store = useGameStore()
    store.setDifficulty(2)
    store.startGame(1)
    answerCurrent(store)
    vi.advanceTimersByTime(1400)
    store.persist()
    const savedOrder = [...store.selectedQuestionIndexes]
    const savedAttempts = [...store.attempts]
    setActivePinia(createPinia())
    const restored = useGameStore()
    vi.advanceTimersByTime(60000)
    restored.restore()
    expect(restored.persistenceError).toBe('')
    expect(restored.levels).toEqual(store.levels)
    expect(restored.authors).toEqual(store.authors)
    expect(restored.selectedQuestionIndexes).toEqual(savedOrder)
    expect(restored.attempts).toEqual(savedAttempts)
    expect(restored.currentLevelIndex).toBe(1)
    expect(restored.elapsedMs).toBe(1400)
    expect(restored.startedAt).toBeNull()
    restored.resumeTimer()
    vi.advanceTimersByTime(100)
    restored.pauseTimer()
    expect(restored.elapsedMs).toBe(1500)
  })

  it.each([false, true])('uses current authors and presentation config with saved fingerprint=%s', (fingerprinted) => {
    const store = useGameStore()
    store.startGame(1)
    answerCurrent(store)
    vi.advanceTimersByTime(700)
    store.authors = [{ name: '旧作者', job: '旧身份' }]
    const oldLevel = store.levels[1]
    if (!oldLevel) throw new Error('Missing level')
    oldLevel.name = '旧关卡名称'
    oldLevel.panorama_url = '/old-panorama.jpg'
    oldLevel.clues = [{ name: '旧线索', type: 'text', data: '旧内容' }]
    const oldQuestion = oldLevel.problems[0]
    if (!oldQuestion) throw new Error('Missing question')
    oldQuestion.reason = '旧解析'
    if (fingerprinted) store.persist()
    else saveWith(store, {})
    const attempts = [...store.attempts]
    const rounds = store.rounds.map((round) => ({ ...round, questionOrder: [...round.questionOrder] }))
    setActivePinia(createPinia())
    const restored = useGameStore()
    restored.restore()
    expect(restored.persistenceError).toBe('')
    expect(restored.authors).toEqual(gameAuthors)
    expect(restored.levels).toEqual(gameLevels)
    expect(restored.attempts).toEqual(attempts)
    expect(restored.rounds).toEqual(rounds)
    expect(restored.elapsedMs).toBe(700)
    expect(restored.currentLevelIndex).toBe(1)
    expect(restored.startedAt).toBeNull()
    const migrated: unknown = JSON.parse(localStorage.getItem(GAME_STORAGE_KEY) ?? 'null')
    expect(migrated).toMatchObject({ authors: gameAuthors, levels: gameLevels, questionFingerprint: expect.any(String) })
  })

  it.each(['title', 'options', 'answer', 'count', 'order', 'levels'])('resets legacy progress when question %s changes', (change) => {
    const store = useGameStore()
    store.startGame(1)
    const oldLevel = store.levels[1]
    const question = oldLevel?.problems[0]
    if (!oldLevel || !question) throw new Error('Missing question')
    if (change === 'title') question.title = '旧题目'
    if (change === 'options') question.select[0] = '旧选项'
    if (change === 'answer') question.true_answer = (question.true_answer + 1) % 4
    if (change === 'count') oldLevel.problems.push({ ...question, select: [...question.select] })
    if (change === 'order') oldLevel.problems.reverse()
    if (change === 'levels') store.levels.reverse()
    store.startGame(1)
    answerCurrent(store)
    saveWith(store, {})
    store.restore()
    expect(store.persistenceError).toContain('题目配置已更新')
    expect(store.levels).toEqual(gameLevels)
    expect(store.authors).toEqual(gameAuthors)
    expect(store.attempts).toEqual([])
    expect(store.hasStarted).toBe(false)
    expect(store.completed).toBe(false)
    store.startGame(1)
    store.restore()
    expect(store.persistenceError).toBe('')
  })

  it('rejects incompatible fingerprinted progress without restoring old levels', () => {
    const store = useGameStore()
    const question = store.levels[0]?.problems[0]
    if (!question) throw new Error('Missing question')
    question.title = '旧题目'
    store.startGame()
    answerCurrent(store)
    store.persist()
    setActivePinia(createPinia())
    const restored = useGameStore()
    restored.restore()
    expect(restored.persistenceError).toContain('题目配置已更新')
    expect(restored.levels).toEqual(gameLevels)
    expect(restored.hasProgress).toBe(false)
  })

  it('migrates a legacy campaign to only its active round, retaining aggregate active time', () => {
    const store = useGameStore()
    store.startGame(0)
    finishLevel(store)
    const previousAttempts = [...store.attempts]
    const previousRounds = [...store.rounds]
    store.startGame(1)
    finishLevel(store)
    const currentAttempts = [...store.attempts]
    const currentRounds = [...store.rounds]
    saveWith(store, {
      mode: undefined,
      attempts: [...previousAttempts, ...currentAttempts],
      rounds: [...previousRounds, ...currentRounds],
      completedLevelIndexes: [0, 1],
      selectedLevelIndex: 0,
      elapsedMs: 2500,
    })
    setActivePinia(createPinia())
    const restored = useGameStore()
    restored.restore()
    expect(restored.persistenceError).toBe('')
    expect(restored.currentLevelIndex).toBe(1)
    expect(restored.selectedLevelIndex).toBe(1)
    expect(restored.attempts).toEqual(currentAttempts)
    expect(restored.rounds).toEqual(currentRounds)
    expect(restored.completedLevelIndexes).toEqual([1])
    expect(restored.elapsedMs).toBe(2500)
    expect(restored.advanceLevel()).toBe(true)
    expect(restored.currentLevelIndex).toBe(1)
  })

  it('migrates legacy v1 retries and treats an old wrong answer as completed', () => {
    const store = useGameStore()
    store.setDifficulty(2)
    store.startGame()
    const problemIndex = store.currentProblemIndex
    const question = store.currentProblem
    if (problemIndex === null || !question) throw new Error('Missing question')
    const wrongAnswer = (question.true_answer + 1) % 4
    saveWith(store, {
      attempts: [{ levelIndex: 0, problemIndex, selectedAnswer: wrongAnswer, correct: false, at: Date.now() }],
      completionRule: undefined,
      completedLevelIndexes: [],
    })
    store.restore()
    expect(store.persistenceError).toBe('')
    expect(store.currentProblemIndex).not.toBe(problemIndex)
    expect(store.wrongCount).toBe(1)
    expect(store.skippedCount).toBe(0)
    const migrated: unknown = JSON.parse(localStorage.getItem(GAME_STORAGE_KEY) ?? 'null')
    expect(migrated).toMatchObject({ completionRule: 'first-attempt', attempts: [expect.objectContaining({
      levelIndex: 0, problemIndex, legacy: true,
    })] })
    store.restore()
    expect(store.persistenceError).toBe('')
    expect(store.currentProblemIndex).not.toBe(problemIndex)
  })

  it('persists skipped records and restores their exact problem indexes', () => {
    const store = useGameStore()
    store.setDifficulty(3)
    store.startGame(1)
    const skippedIndex = store.currentProblemIndex
    expect(store.skipCurrentProblem()).toBe(true)
    setActivePinia(createPinia())
    const restored = useGameStore()
    restored.restore()
    expect(restored.persistenceError).toBe('')
    expect(restored.skippedCount).toBe(1)
    expect(restored.wrongCount).toBe(0)
    expect(restored.currentProblemIndex).not.toBe(skippedIndex)
    expect(restored.attempts[0]).toMatchObject({ levelIndex: 1, problemIndex: skippedIndex,
      selectedAnswer: null, correct: false, skipped: true })
  })

  it('round-trips both untouched and completed states', () => {
    const store = useGameStore()
    store.persist()
    store.restore()
    expect(store.hasProgress).toBe(false)
    expect(store.persistenceError).toBe('')
    store.startGame()
    finishLevel(store)
    store.advanceLevel()
    store.persist()
    store.restore()
    expect(store.persistenceError).toBe('')
    expect(store.completed).toBe(true)
  })

  it('rejects corrupt JSON without partially overwriting state; a fresh game replaces it', () => {
    const store = useGameStore()
    store.startGame(1)
    answerCurrent(store)
    const attempts = [...store.attempts]
    localStorage.setItem(GAME_STORAGE_KEY, '{broken')
    expect(() => store.restore()).not.toThrow()
    expect(store.persistenceError).not.toBe('')
    expect(store.attempts).toEqual(attempts)
    expect(store.currentLevelIndex).toBe(1)
    store.startGame(0)
    expect(store.persistenceError).toBe('')
    store.restore()
    expect(store.persistenceError).toBe('')
    expect(store.attempts).toEqual([])
  })

  it.each([
    { currentLevelIndex: 99 },
    { selectedLevelIndex: -1 },
    { difficulty: 4 },
    { questionFingerprint: 'invalid' },
    { questionFingerprint: 1 },
    { elapsedMs: -1 },
    { startedAt: 'yesterday' },
    { levels: [{ name: 'bad', problems: [] }] },
    { authors: [{ name: 1, job: 'bad' }] },
    { completed: true },
    { hasStarted: false },
    { completedLevelIndexes: [999] },
    { completedLevelIndexes: [0] },
    { rounds: [{ levelIndex: 0, questionOrder: [0, 0, 2] }] },
    { rounds: [{ levelIndex: 0, questionOrder: [0, 1, 99] }] },
    { attempts: [{ levelIndex: 0, problemIndex: 999, selectedAnswer: 0, correct: false, at: 100 }] },
    { attempts: [{ levelIndex: 999, problemIndex: 0, selectedAnswer: 0, correct: false, at: 100 }] },
    { attempts: [{ levelIndex: 0, problemIndex: 0, selectedAnswer: 9, correct: false, at: 100 }] },
    { attempts: [{ levelIndex: 0, problemIndex: 0, selectedAnswer: 0, correct: true, at: 100 }] },
  ])('rejects invalid snapshot fields: %j', (changes) => {
    const store = useGameStore()
    store.startGame()
    saveWith(store, changes)
    store.restore()
    expect(store.persistenceError).not.toBe('')
    expect(store.currentLevelIndex).toBe(0)
    expect(store.attempts).toEqual([])
    expect(store.difficulty).toBe(1)
  })

  it('rejects duplicate correct results and attempts after a solved question', () => {
    const store = useGameStore()
    store.startGame()
    answerCurrent(store)
    saveWith(store, { attempts: [...store.attempts, ...store.attempts] })
    store.restore()
    expect(store.persistenceError).not.toBe('')
    expect(store.correctCount).toBe(1)
  })

  it('reports save failures and provides a successful retry', () => {
    const store = useGameStore()
    store.startGame()
    const setItem = vi.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => {
      throw new DOMException('Quota exceeded', 'QuotaExceededError')
    })
    expect(() => store.persist()).not.toThrow()
    expect(store.persistenceError).not.toBe('')
    store.retryPersistence()
    expect(setItem).toHaveBeenCalledTimes(2)
    expect(store.persistenceError).toBe('')
    expect(localStorage.getItem(GAME_STORAGE_KEY)).not.toBeNull()
  })

  it('handles storage read restrictions without crashing', () => {
    const store = useGameStore()
    vi.spyOn(Storage.prototype, 'getItem').mockImplementationOnce(() => { throw new Error('Blocked') })
    expect(() => store.restore()).not.toThrow()
    expect(store.persistenceError).not.toBe('')
    expect(store.hasProgress).toBe(false)
  })
})
