export interface problem {
  title: string
  select: [string, string, string, string]
  true_answer: number
  reason: string
}

export interface clue {
  type: 'image' | 'audio' | 'text' | 'video'
  name: string
  data: string
}

export interface level {
  name: string
  panorama_url: string
  thumbnail_url?: string
  subtitle?: string
  description?: string
  clues: clue[]
  problems: problem[]
}

export type levels = level[]

export interface author {
  name: string
  job: string
}

export type authors = author[]
export type Difficulty = 1 | 2 | 3

export interface Attempt {
  levelIndex: number
  problemIndex: number
  selectedAnswer: number
  correct: boolean
  at: number
}

export interface Round {
  levelIndex: number
  questionOrder: number[]
}
