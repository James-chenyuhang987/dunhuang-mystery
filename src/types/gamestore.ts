import type { Attempt, author, Difficulty, level, Round, StoryPackage } from './game'
import type { RuntimeSource, SourceKind } from '@/utils/runtimeSource'

export type GameMode = 'single' | 'campaign'
export type GameRound = Round & { completedDifficulty?: Difficulty }
export type { RuntimeSource, SourceKind }

export type Snapshot = Omit<
  GameState,
  | 'persistenceError'
  | 'mode'
  | 'locationId'
  | 'sourceKind'
  | 'sourceId'
  | 'sourceRevision'
  | 'activeStory'
  | 'capturedFrame'
  | 'currentPanoramaIndex'
  | 'discoveredClickPoints'
  | 'unlockedClues'
> & {
  currentPanoramaIndex?: number
  discoveredClickPoints?: string[]
  unlockedClues?: string[]
  version: 1 | 2
  mode?: GameMode
  locationId?: string
  sourceKind?: SourceKind
  sourceId?: string
  sourceRevision?: string
  story?: StoryPackage
  questionFingerprint?: string
  completionRule?: 'first-attempt'
}

export interface GameState {
  mode: GameMode
  locationId: string
  sourceKind: SourceKind
  sourceId: string
  sourceRevision: string
  activeStory: StoryPackage | null
  /** Latest same-origin panorama frame, kept transient for the postcard flow. */
  capturedFrame: string
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
