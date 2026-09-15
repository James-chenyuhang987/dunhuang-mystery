import type { Attempt, author, Difficulty, level, Round } from './game'

export type GameMode = 'single' | 'campaign'
export type GameRound = Round & { completedDifficulty?: Difficulty }

export type Snapshot = Omit<GameState, 'persistenceError' | 'mode' | 'locationId' | 'currentPanoramaIndex' | 'discoveredClickPoints' | 'unlockedClues'> & {
  currentPanoramaIndex?: number
  discoveredClickPoints?: string[]
  unlockedClues?: string[]
  version: 1
  mode?: GameMode
  locationId?: string
  questionFingerprint?: string
  completionRule?: 'first-attempt'
}

export interface GameState {
  mode: GameMode
  locationId: string
  levels: level[]
  authors: author[]
  difficulty: Difficulty
  currentLevelIndex: number
  selectedLevelIndex: number
  currentPanoramaIndex: number
  discoveredClickPoints: string[]
  unlockedClues: string[]
  startedAt: number | null
  elapsedMs: number
  completed: boolean
  persistenceError: string
  attempts: Attempt[]
  completedLevelIndexes: number[]
  rounds: GameRound[]
  hasStarted: boolean
}
