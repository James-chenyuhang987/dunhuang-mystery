import { mount } from '@vue/test-utils'
import { describe, expect, it, vi } from 'vitest'
import PanoramaViewer from '@/components/PanoramaViewer.vue'
import { DEFAULT_PANORAMA_FOV } from '@/utils/panorama'

const harness = vi.hoisted(() => ({
  options: undefined as
    | {
        onUltravioletError?: () => void
      }
    | undefined,
  scene: undefined as
    | {
        longitude: { value: number }
        latitude: { value: number }
        fov: { value: number }
      }
    | undefined,
}))

vi.mock('@/composables/SceneManager', async () => {
  const { ref } = await import('vue')
  return {
    useSceneManager: (options: { onUltravioletError?: () => void }) => {
      const scene = {
        status: ref('ready'),
        hasTexture: ref(true),
        renderedUltraviolet: ref(false),
        longitude: ref(0),
        latitude: ref(0),
        fov: ref(70),
        getRenderer: () => undefined,
        schedule: vi.fn(),
        loadTexture: vi.fn(),
        retry: vi.fn(),
      }
      harness.options = options
      harness.scene = scene
      return scene
    },
  }
})

vi.mock('@/composables/GameUI', async () => {
  const { ref } = await import('vue')
  return {
    useGameUI: ({ scene }: { scene: { fov: { value: number } } }) => ({
      fov: scene.fov,
      projected: ref([]),
      down: vi.fn(),
      move: vi.fn(),
      up: vi.fn(),
      cancel: vi.fn(),
      zoom: vi.fn(),
      key: vi.fn(),
      rebuildHotspots: vi.fn(),
    }),
  }
})

describe('PanoramaViewer', () => {
  it('uses the shared natural-view FOV when a panorama has no explicit view', () => {
    mount(PanoramaViewer, {
      props: { url: '/cave.jpg' },
      global: { stubs: { AppIcon: true, Transition: false } },
    })

    expect(harness.scene?.fov.value).toBe(DEFAULT_PANORAMA_FOV)
  })

  it('applies configured views without resetting on same-panorama clue changes', async () => {
    const wrapper = mount(PanoramaViewer, {
      props: {
        url: '/cave.jpg',
        initialView: { longitude: 180, latitude: 30, fov: 70 },
      },
      global: { stubs: { AppIcon: true, Transition: false } },
    })

    expect(harness.scene?.longitude.value).toBe(180)
    expect(harness.scene?.latitude.value).toBe(30)
    expect(harness.scene?.fov.value).toBe(70)

    if (!harness.scene) throw new Error('scene mock was not initialized')
    harness.scene.longitude.value = 135
    await wrapper.setProps({ hotspots: [{ clue_index: 1, yaw: 0, pitch: 0 }] })
    expect(harness.scene.longitude.value).toBe(135)

    await wrapper.setProps({ url: '/next-cave.jpg' })
    expect(harness.scene.longitude.value).toBe(180)

    await wrapper.setProps({ initialView: { longitude: 90, latitude: 12, fov: 60 } })
    expect(harness.scene.longitude.value).toBe(90)
    expect(harness.scene.latitude.value).toBe(12)
    expect(harness.scene.fov.value).toBe(60)
  })

  it('forwards ultraviolet texture failures to its parent', () => {
    const wrapper = mount(PanoramaViewer, {
      props: { url: '/cave.jpg', ultravioletUrl: '/cave-uv.jpg', ultraviolet: true },
      global: { stubs: { AppIcon: true, Transition: false } },
    })

    harness.options?.onUltravioletError?.()
    expect(wrapper.emitted('uv-error')).toHaveLength(1)
  })
})
