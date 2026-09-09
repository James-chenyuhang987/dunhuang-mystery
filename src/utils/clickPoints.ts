import type { Vector3 } from 'three'
import type { ClickPoint } from '@/types/game'

export function findMatchingClickPoint(position: Vector3, points: ClickPoint[], ultraviolet: boolean): number | null {
  let nearestIndex: number | null = null
  let nearestDistance = Number.POSITIVE_INFINITY
  points.forEach((point, index) => {
    if (point.in_uv !== ultraviolet) return
    const distance = position.distanceTo(point.vec)
    if (distance <= point.accept_click_range && distance < nearestDistance) {
      nearestDistance = distance
      nearestIndex = index
    }
  })
  return nearestIndex
}
