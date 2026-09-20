import { ref, type Ref } from 'vue'
import * as THREE from 'three'
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import type { ClickPoint, hotspot } from '@/types/game'
import { findMatchingClickPoint } from '@/utils/clickPoints'
import { hotspotDirection, projectDirection } from '@/utils/hotspots'
import type { SceneManagerApi } from './SceneManager'

export interface GameUIOptions {
  host: Ref<HTMLDivElement | null>
  scene: SceneManagerApi
  getHotspots: () => hotspot[]
  getClickPoints: () => ClickPoint[]
  isUltraviolet: () => boolean
  onClue: (index: number) => void
  onDiscover: (index: number) => void
}

/** Owns interaction state, hotspot DOM, projection visibility and click-point raycasting. */
export function useGameUI(options: GameUIOptions) {
  const projected = ref<ReturnType<typeof projectDirection>[]>([])
  const pointers = new Map<number, { x: number; y: number }>()
  const pointer = new THREE.Vector2(),
    raycaster = new THREE.Raycaster(),
    radius = 10
  let moved = false
  let pressStart: { x: number; y: number } | undefined
  let interactiveDirections: THREE.Vector3[] = []

  const createMarker = (
    direction: THREE.Vector3,
    className: string,
    ariaLabel: string,
    label: string,
    onClick: () => void,
  ) => {
    const group = options.scene.getHotspotGroup()
    if (!group) return
    const button = document.createElement('button')
    button.type = 'button'
    button.className = className
    button.setAttribute('aria-label', ariaLabel)
    button.title = ariaLabel
    button.innerHTML = `<span class="hotspot-label">${label}</span>${Array.from({ length: 8 }, (_, index) => `<span class="panorama-particle" aria-hidden="true" style="--particle-angle:${index * 45}deg;--particle-delay:${index * 0.11}s"></span>`).join('')}`
    button.addEventListener('pointerdown', (event) => event.stopPropagation())
    button.addEventListener('wheel', (event) => event.stopPropagation())
    button.addEventListener('click', onClick)
    const object = new CSS2DObject(button)
    const normalized = direction.clone().normalize()
    object.position.copy(normalized.clone().multiplyScalar(radius))
    interactiveDirections.push(normalized)
    group.add(object)
  }

  const rebuildHotspots = () => {
    const group = options.scene.getHotspotGroup()
    if (!group) return
    group.clear()
    interactiveDirections = []
    options.getHotspots().forEach((point) => {
      createMarker(
        hotspotDirection(point),
        'panorama-hotspot',
        `查看线索 ${point.clue_index + 1}`,
        String(point.clue_index + 1).padStart(2, '0'),
        () => options.onClue(point.clue_index),
      )
    })
    if (!options.isUltraviolet()) return
    options.getClickPoints().forEach((point, index) => {
      if (!point.in_uv) return
      createMarker(
        point.vec,
        'panorama-hotspot ultraviolet-discovery-hotspot',
        `调查紫外线索：${point.name}`,
        '✦',
        () => options.onDiscover(index),
      )
    })
  }
  const project = (camera: THREE.PerspectiveCamera) => {
    projected.value = interactiveDirections.map((direction) => projectDirection(direction, camera))
    options.scene.getHotspotGroup()?.children.forEach((object, index) => {
      object.visible = projected.value[index]?.visible ?? false
    })
  }
  const distance = () => {
    const [a, b] = [...pointers.values()]
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0
  }
  const down = (event: PointerEvent) => {
    if (event.pointerType === 'mouse' && event.button !== 0) return
    if (pointers.size === 0) {
      moved = false
      pressStart = { x: event.clientX, y: event.clientY }
    } else moved = true
    try {
      options.host.value?.setPointerCapture(event.pointerId)
    } catch {
      /* Pointer may be cancelled before capture. */
    }
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
  }
  const move = (event: PointerEvent) => {
    const previous = pointers.get(event.pointerId)
    if (!previous) return
    const before = distance()
    if (pressStart && Math.hypot(event.clientX - pressStart.x, event.clientY - pressStart.y) > 6)
      moved = true
    if (pointers.size === 1) {
      options.scene.longitude.value -=
        ((event.clientX - previous.x) * 0.12 * options.scene.fov.value) / 70
      options.scene.latitude.value = THREE.MathUtils.clamp(
        options.scene.latitude.value + (event.clientY - previous.y) * 0.12,
        -85,
        85,
      )
    }
    pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointers.size === 2) {
      const after = distance()
      if (after > 0 && before > 0)
        options.scene.fov.value = THREE.MathUtils.clamp(
          (options.scene.fov.value * before) / after,
          30,
          100,
        )
    }
    options.scene.schedule()
  }
  const discover = (event: PointerEvent) => {
    const host = options.host.value,
      camera = options.scene.getCamera(),
      sphere = options.scene.getSphere()
    if (!host || !camera || !sphere || options.scene.status.value !== 'ready') return
    const bounds = host.getBoundingClientRect()
    if (!bounds.width || !bounds.height) return
    pointer.set(
      ((event.clientX - bounds.left) / bounds.width) * 2 - 1,
      -((event.clientY - bounds.top) / bounds.height) * 2 + 1,
    )
    camera.updateMatrixWorld()
    raycaster.setFromCamera(pointer, camera)
    const center = sphere.getWorldPosition(new THREE.Vector3()),
      intersection = raycaster.ray.intersectSphere(
        new THREE.Sphere(center, radius),
        new THREE.Vector3(),
      )
    if (!intersection) return
    const position = intersection.sub(center),
      coordinates = [position.x, position.y, position.z].map((value) => Number(value.toFixed(4)))
    console.info('[Panorama click]', position.clone(), `new Vector3(${coordinates.join(', ')})`)
    const index = findMatchingClickPoint(
      position,
      options.getClickPoints(),
      options.isUltraviolet(),
    )
    if (index !== null) options.onDiscover(index)
  }
  const up = (event: PointerEvent) => {
    const shouldDiscover = pointers.size === 1 && !moved
    pointers.delete(event.pointerId)
    if (shouldDiscover) discover(event)
    if (pointers.size === 0) pressStart = undefined
  }
  const cancel = (event: PointerEvent) => {
    moved = true
    pointers.delete(event.pointerId)
    if (pointers.size === 0) pressStart = undefined
  }
  const zoom = (delta: number) => {
    options.scene.fov.value = THREE.MathUtils.clamp(options.scene.fov.value + delta, 30, 100)
    options.scene.schedule()
  }
  const key = (event: KeyboardEvent) => {
    const actions: Record<string, () => void> = {
      ArrowLeft: () => {
        options.scene.longitude.value -= 5
      },
      ArrowRight: () => {
        options.scene.longitude.value += 5
      },
      ArrowUp: () => {
        options.scene.latitude.value = Math.min(85, options.scene.latitude.value + 5)
      },
      ArrowDown: () => {
        options.scene.latitude.value = Math.max(-85, options.scene.latitude.value - 5)
      },
      '+': () => zoom(-5),
      '-': () => zoom(5),
    }
    if (actions[event.key]) {
      event.preventDefault()
      actions[event.key]?.()
      options.scene.schedule()
    }
  }
  options.scene.rebuildHooks({
    onInitialize: rebuildHotspots,
    onRender: project,
    onDispose: () => {
      pointers.clear()
      options.scene.getHotspotGroup()?.clear()
    },
  })
  return { projected, fov: options.scene.fov, rebuildHotspots, down, move, up, cancel, zoom, key }
}
