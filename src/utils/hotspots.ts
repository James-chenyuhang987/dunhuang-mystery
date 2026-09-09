import { MathUtils, PerspectiveCamera, Vector3 } from 'three'
import type { hotspot } from '@/types/game'

// Legacy percentages are interpreted once on a fixed 70° reference view.
// World directions never depend on the current viewport or camera rotation.
export function hotspotDirection(point: hotspot): Vector3 {
  if (point.yaw !== undefined) {
    const yaw = MathUtils.degToRad(point.yaw)
    const pitch = MathUtils.degToRad(point.pitch)
    return new Vector3(Math.cos(pitch) * Math.cos(yaw), Math.sin(pitch), Math.cos(pitch) * Math.sin(yaw))
  }
  const tangent = Math.tan(MathUtils.degToRad(35))
  return new Vector3(1, (1 - point.y / 50) * tangent, (point.x / 50 - 1) * tangent).normalize()
}

export function projectHotspot(point: hotspot, camera: PerspectiveCamera) {
  const direction = hotspotDirection(point)
  const inFront = direction.dot(camera.getWorldDirection(new Vector3())) > 0
  const projected = direction.multiplyScalar(10).project(camera)
  return {
    x: (projected.x + 1) * 50,
    y: (1 - projected.y) * 50,
    visible: inFront && Math.abs(projected.x) < .94 && Math.abs(projected.y) < .94,
  }
}
