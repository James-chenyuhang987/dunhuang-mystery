import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import MediaViewer from '@/components/MediaViewer.vue'

afterEach(() => {
  vi.restoreAllMocks()
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'showModal')
  Reflect.deleteProperty(HTMLDialogElement.prototype, 'close')
  document.body.innerHTML = ''
})

describe('fullscreen clue viewer', () => {
  it.each(['image', 'video'] as const)('opens and zooms %s with reload and cleanup', async type => {
    Object.defineProperty(HTMLDialogElement.prototype, 'showModal', { configurable: true, value: function (this: HTMLDialogElement) { this.setAttribute('open', '') } })
    Object.defineProperty(HTMLDialogElement.prototype, 'close', { configurable: true, value: function (this: HTMLDialogElement) { this.removeAttribute('open') } })
    vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
    const wrapper = mount(MediaViewer, { props: { item: { type, data: '/media', name: '测试线索' } }, global: { stubs: { teleport: true } } })
    await flushPromises()
    wrapper.vm.open()
    await flushPromises()
    expect(wrapper.find('.media-viewer').attributes('aria-label')).toBe('测试线索 · 全屏查看')
    const tag = type === 'image' ? 'img' : 'video'
    expect(wrapper.find(tag).exists()).toBe(true)
    await wrapper.find('[aria-label="放大线索"]').trigger('click')
    expect(wrapper.find('output').text()).toBe('125%')
    await wrapper.find(tag).trigger('error')
    expect(wrapper.text()).toContain('素材加载失败')
    await wrapper.find('.media-load-error button').trigger('click')
    expect(wrapper.find(tag).exists()).toBe(true)
    await wrapper.find('[aria-label="关闭全屏查看"]').trigger('click')
    expect(wrapper.find(tag).exists()).toBe(false)
    wrapper.unmount()
  })
})
