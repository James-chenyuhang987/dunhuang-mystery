import { afterEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import IntroSequence from '@/components/IntroSequence.vue'
import { mediaConfig } from '@/data/game'

afterEach(() => { mediaConfig.introVideoUrl = ''; vi.restoreAllMocks(); vi.useRealTimers() })

describe('opening sequence', () => {
  it('enters demo immediately when a video URL is not configured', () => {
    mediaConfig.introVideoUrl = ''
    const wrapper = mount(IntroSequence)
    expect(wrapper.emitted('ready')).toHaveLength(1)
    expect(wrapper.find('video').exists()).toBe(false)
    wrapper.unmount()
  })
  it('shows animated SVG before video, handles blocked autoplay and finishes', async () => {
    mediaConfig.introVideoUrl = '/opening.mp4'
    const play = vi.spyOn(HTMLMediaElement.prototype, 'play').mockRejectedValueOnce(new Error('NotAllowedError')).mockResolvedValue(undefined)
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    const wrapper = mount(IntroSequence)
    expect(wrapper.find('.loader-art').exists()).toBe(true)
    await wrapper.find('video').trigger('canplaythrough')
    await flushPromises()
    expect(wrapper.text()).toContain('轻触，走入敦煌')
    await wrapper.find('.primary').trigger('click')
    await flushPromises()
    expect(play).toHaveBeenCalledTimes(2)
    await wrapper.find('video').trigger('ended')
    expect(wrapper.emitted('ready')).toHaveLength(1)
    wrapper.unmount()
  })
  it('offers reload after errors and timeout', async () => {
    vi.useFakeTimers()
    mediaConfig.introVideoUrl = '/opening.mp4'
    const load = vi.spyOn(HTMLMediaElement.prototype, 'load').mockImplementation(() => undefined)
    const wrapper = mount(IntroSequence)
    await wrapper.find('video').trigger('error')
    expect(wrapper.text()).toContain('重新加载')
    await wrapper.find('.primary').trigger('click')
    expect(load).toHaveBeenCalledOnce()
    await vi.advanceTimersByTimeAsync(45000)
    expect(wrapper.text()).toContain('开场视频加载失败或超时')
    wrapper.unmount()
  })
})
