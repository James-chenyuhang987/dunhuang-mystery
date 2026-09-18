import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import * as THREE from 'three'
import { useEventStore } from '@/stores/event'
import { usePluginUtilsStore } from '@/stores/pluginUtils'
import { usePlugin } from '@/composables/usePlugin'

describe('plugin runtime', () => {
  beforeEach(() => setActivePinia(createPinia()))

  it('keeps targeted and broadcast events isolated by plugin', () => {
    const events = useEventStore()
    const targeted = vi.fn()
    const broadcast = vi.fn()
    events.withPlugin('alpha', () => {
      events.onEvent('ping', targeted)
      events.onEvent('ping', broadcast, true)
    })

    events.createEvent('ping', 'alpha')({ value: 1 })
    expect(targeted).toHaveBeenCalledTimes(1)
    expect(broadcast).toHaveBeenCalledTimes(1)
    document.dispatchEvent(new CustomEvent('__alpha_ping', { detail: { value: 3 } }))
    expect(targeted).toHaveBeenCalledTimes(2)
    events.createEvent('ping')({ value: 2 })
    expect(broadcast).toHaveBeenCalledTimes(3)
    expect(broadcast.mock.calls[0]?.[0]).toEqual({ value: 1 })
    expect(broadcast.mock.calls[1]?.[0]).toEqual({ value: 3 })
    expect(broadcast.mock.calls[2]?.[0]).toEqual({ value: 2 })
    events.withPlugin('alpha', () => expect(events.removeEvent('ping')).toBe(true))
    events.createEvent('ping', 'alpha')()
    expect(targeted).toHaveBeenCalledTimes(2)
    events.plugin_dispose('alpha')
  })

  it('shares one context and restores material overrides in reverse order', () => {
    const utils = usePluginUtilsStore()
    const base = new THREE.MeshBasicMaterial({ color: '#111111' })
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(1), base)
    const schedule = vi.fn()
    const context = utils.set_ctx({ material: base, sphere, schedule })
    expect(utils.get_ctx()).toBe(context)
    expect(() => ((context as { scene?: THREE.Scene }).scene = new THREE.Scene())).toThrow()

    const first = new THREE.MeshBasicMaterial({ color: '#222222' })
    const second = new THREE.MeshBasicMaterial({ color: '#333333' })
    utils.registerPlugin('first')
    utils.withPlugin('first', () => {
      ;(context as { material?: THREE.Material }).material = first
    })
    utils.registerPlugin('second')
    utils.withPlugin('second', () => {
      ;(context as { material?: THREE.Material }).material = second
    })
    expect(sphere.material).toBe(second)
    utils.plugin_dispose('second')
    expect(sphere.material).toBe(base)
    utils.clearPluginState('second')
    utils.plugin_dispose('first')
    utils.clearPluginState('first')
    expect(sphere.material).toBe(base)
    utils.dispose_all()
    expect(() => utils.get_ctx()).toThrow()
  })

  it('loads the registered renderer through the two-method engine API', () => {
    const utils = usePluginUtilsStore()
    const base = new THREE.MeshBasicMaterial({ color: '#111111' })
    const sphere = new THREE.Mesh(new THREE.SphereGeometry(1), base)
    utils.set_ctx({ material: base, sphere })
    const engine = usePlugin()
    expect(Object.keys(engine).sort()).toEqual(['dispose', 'load'])
    expect(engine.load('solid-material', 'Renderer', { color: '#abcdef' })).toBe(true)
    expect(sphere.material).not.toBe(base)
    engine.dispose()
    expect(sphere.material).toBe(base)
    utils.dispose_all()
  })
})
