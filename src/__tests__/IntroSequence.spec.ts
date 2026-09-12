import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import IntroSequence from '@/components/IntroSequence.vue'

const completionKey = (locationId: string) => `dunhuang-mystery:intro-completed:v2:${locationId}`
const mountIntro = (locationId = 'dunhuang', videoUrl = '/opening.mp4') => mount(IntroSequence, {
  props: { locationId, locationName: locationId === 'dunhuang' ? '敦煌莫高窟' : '秦始皇帝陵博物院', videoUrl },
})

afterEach(() => { localStorage.clear(); vi.restoreAllMocks(); vi.useRealTimers() })

describe('opening sequence', () => {
  it('enters immediately when the current location has no configured video', () => {
    const wrapper = mountIntro('terracotta', '')
    expect(wrapper.emitted('ready')).toHaveLength(1)
    expect(wrapper.find('video').exists()).toBe(false)
    wrapper.unmount()
  })
  it('uses the configured location video, handles blocked autoplay and finishes', async () => {
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockRejectedValueOnce(new Error('NotAllowedError')).mockResolvedValue(undefined)
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    const wrapper = mountIntro('dunhuang', '/entrance.mp4')
    expect(wrapper.get('video').attributes('src')).toBe('/entrance.mp4')
    expect(wrapper.get('video').classes()).toContain('intro-video-hidden')
    expect(wrapper.find('.earth-intro').exists()).toBe(true)
    await wrapper.find('.skip-intro').trigger('click')
    expect(wrapper.get('video').classes()).not.toContain('intro-video-hidden')
    expect(wrapper.get('.loader-art').attributes('aria-label')).toBe('正在载入敦煌莫高窟画卷')
    await wrapper.find('video').trigger('canplaythrough')
    await flushPromises()
    expect(wrapper.text()).toContain('轻触，走入敦煌莫高窟')
    await wrapper.find('.primary').trigger('click')
    await flushPromises()
    expect(play).toHaveBeenCalledTimes(2)
    await wrapper.find('video').trigger('ended')
    expect(wrapper.emitted('ready')).toHaveLength(1)
    expect(localStorage.getItem(completionKey('dunhuang'))).toBe('true')
    wrapper.unmount()
  })
  it('tracks completion independently for each location', () => {
    localStorage.setItem(completionKey('dunhuang'), 'true')
    const dunhuang = mountIntro('dunhuang')
    const terracotta = mountIntro('terracotta', '/terracotta-opening.mp4')
    expect(dunhuang.find('video').exists()).toBe(false)
    expect(dunhuang.emitted('ready')).toHaveLength(1)
    expect(terracotta.get('video').attributes('src')).toBe('/terracotta-opening.mp4')
    dunhuang.unmount()
    terracotta.unmount()
  })
  it('remembers when the viewer skips the location intro', async () => {
    vi.spyOn(HTMLMediaElement.prototype, 'play').mockResolvedValue(undefined)
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    const wrapper = mountIntro()
    await wrapper.find('video').trigger('canplaythrough')
    await flushPromises()
    await wrapper.find('.skip-intro').trigger('click')
    await wrapper.find('video').trigger('canplaythrough')
    await flushPromises()
    await wrapper.find('.skip-intro').trigger('click')
    expect(localStorage.getItem(completionKey('dunhuang'))).toBe('true')
    expect(wrapper.emitted('ready')).toHaveLength(1)
    wrapper.unmount()
  })
  it('replays without persisting completion when requested', async () => {
    localStorage.setItem(completionKey('dunhuang'), 'true')
    const wrapper = mount(IntroSequence, { props: { locationId: 'dunhuang', locationName: '敦煌莫高窟', videoUrl: '/opening.mp4', rememberCompletion: false } })
    expect(wrapper.get('video').attributes('src')).toBe('/opening.mp4')
    expect(wrapper.find('.earth-intro').exists()).toBe(true)
    expect(wrapper.emitted('ready')).toBeUndefined()
    wrapper.unmount()
  })
  it('offers reload after errors and timeout', async () => {
    vi.useFakeTimers()
    const load = vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined)
    const wrapper = mountIntro()
    await wrapper.find('video').trigger('error')
    expect(wrapper.text()).toContain('重新加载')
    await wrapper.find('.primary').trigger('click')
    expect(load).toHaveBeenCalledOnce()
    await vi.advanceTimersByTimeAsync(45000)
    expect(wrapper.text()).toContain('开场视频加载失败或超时')
    wrapper.unmount()
  })
})
