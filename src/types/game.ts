import type { Vector3 } from 'three'

export interface problem {
  title: string
  select: [string, string, string, string]
  true_answer: number
  /** Present for questions that require selecting more than one option. */
  true_answers?: number[]
  reason: string
}

export interface clue {
  type: 'image' | 'audio' | 'text' | 'video' | 'combination'
  name: string
  /** Media path or text body. Combination clues use this as an optional summary. */
  data: string
  /** Child clues rendered in order for combination clues. */
  subclues?: clue[]
  problem_indexes?: number[]
  hint?: string
  /** Authoring notes from the latest clue brief; used to keep placement and media requirements explicit. */
  placement?: string
  media_note?: string
}

export type hotspot = { clue_index: number } & (
  | { vec: Vector3; yaw?: never; pitch?: never; x?: never; y?: never }
  | { yaw: number; pitch: number; vec?: never; x?: never; y?: never }
  | { x: number; y: number; vec?: never; yaw?: never; pitch?: never }
)

export interface ClickPoint {
  vec: Vector3
  accept_click_range: number
  name: string
  description: string
  image?: string
  in_uv: boolean
}

export interface ImagePanorama {
  name: string
  url: string
  ultraviolet_url?: string
  click_points: ClickPoint[]
}

export interface level {
  name: string
  panorama: ImagePanorama[]
  thumbnail_url?: string
  subtitle?: string
  description?: string
  hotspots?: hotspot[]
  clues: clue[]
  problems: problem[]
}

export type levels = level[]

export interface location {
  id: string
  name: string
  subtitle: string
  coordinates: string
  intro_video_url?: string
  destination_video_url?: string
  background_url: string
  levels: level[]
  title?: string
  introduction?: string
  art_caption?: string
  art_caption_english?: string
}

export interface author {
  name: string
  job: string
}

export type authors = author[]
export type Difficulty = 1 | 2 | 3

interface AttemptBase {
  levelIndex: number
  problemIndex: number
  at: number
}

export type Attempt = AttemptBase &
  (
    | { selectedAnswer: number | number[]; correct: boolean; skipped?: false; legacy?: true }
    | { selectedAnswer: null; correct: false; skipped: true; legacy?: never }
  )

export interface Round {
  levelIndex: number
  questionOrder: number[]
}
