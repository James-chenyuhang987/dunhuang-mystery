import { describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import * as THREE from 'three'
import { CSS2DObject } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import { useGameUI } from '@/composables/GameUI'
import type { SceneManagerApi } from '@/composables/SceneManager'

function sceneStub(group: THREE.Group): SceneManagerApi {
  return {
    status: ref('ready'), hasTexture: ref(true), renderedUltraviolet: ref(false), fov: ref(70), longitude: ref(0), latitude: ref(0),
    getRenderer: () => undefined, getCssRenderer: () => undefined, getScene: () => undefined, getCamera: () => undefined,
    getSphere: () => undefined, getMaterial: () => undefined, getHotspotGroup: () => group, getComposer: () => undefined, getUvPass: () => undefined,
    render: vi.fn(), schedule: vi.fn(), resize: vi.fn(), loadTexture: vi.fn(), retry: vi.fn(), dispose: vi.fn(), rebuildHooks: vi.fn(),
  }
}

describe('GameUI composable', () => {
  it('builds clickable hotspot DOM through its public API', () => {
    const group = new THREE.Group()
    const clue = vi.fn()
    const ui = useGameUI({ host: ref(null), scene: sceneStub(group), getHotspots: () => [{ clue_index: 2, yaw: 0, pitch: 0 }], getClickPoints: () => [], isUltraviolet: () => false, onClue: clue, onDiscover: vi.fn() })
    ui.rebuildHotspots()
    expect(group.children).toHaveLength(1)
    const button = (group.children[0] as CSS2DObject).element as HTMLButtonElement
    expect(button.getAttribute('aria-label')).toBe('查看线索 3')
    button.click()
    expect(clue).toHaveBeenCalledWith(2)
  })
})
