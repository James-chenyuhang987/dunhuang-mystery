import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CluePanel from '@/components/CluePanel.vue'

describe('clue panels', () => {
  it('starts collapsed and never propagates gestures to a parent', async () => {
    const wrapper = mount(CluePanel, { props: { item: { type: 'text', name: '残卷', data: '循水而行' }, index: 0 } })
    expect(wrapper.find('.clue-body').exists()).toBe(false)
    await wrapper.find('button').trigger('click')
    expect(wrapper.text()).toContain('循水而行')
    for (const name of ['pointerdown', 'pointermove', 'pointerup', 'touchstart', 'touchmove', 'wheel']) {
      const event = new Event(name, { bubbles: true, cancelable: true })
      let leaked = false
      const parent = document.createElement('div')
      parent.append(wrapper.element)
      parent.addEventListener(name, () => { leaked = true })
      wrapper.element.dispatchEvent(event)
      expect(leaked).toBe(false)
    }
    wrapper.unmount()
  })
  it('renders combination clues and their child content', async () => {
    const wrapper = mount(CluePanel, { props: { item: { type: 'combination', name: '组合线索', data: '总览', subclues: [
      { type: 'text', name: '文字碎片', data: '子线索一' },
      { type: 'text', name: '第二碎片', data: '子线索二' },
    ] }, index: 0 } })
    await wrapper.find('.clue-toggle').trigger('click')
    expect(wrapper.text()).toContain('总览')
    expect(wrapper.text()).toContain('文字碎片')
    expect(wrapper.text()).toContain('第二碎片')
    expect(wrapper.findAll('.clue-toggle')).toHaveLength(3)
    wrapper.unmount()
  })

  it('keeps locked clues unavailable until the parent unlocks them', async () => {
    const wrapper = mount(CluePanel, { props: { item: { type: 'text', name: '未解线索', data: '隐藏内容' }, index: 0, locked: true } })
    expect(wrapper.find('.clue-toggle').attributes('aria-disabled')).toBe('true')
    expect(wrapper.text()).toContain('未解锁')
    await wrapper.find('.clue-toggle').trigger('click')
    expect(wrapper.find('.clue-body').exists()).toBe(false)
  })

  it.each(['image', 'audio', 'video'] as const)('reloads failed %s assets', async type => {
    const wrapper = mount(CluePanel, { props: { item: { type, name: '线索', data: '/missing' }, index: 1 } })
    await wrapper.find('button').trigger('click')
    const tag = type === 'image' ? 'img' : type
    await wrapper.find(tag).trigger('error')
    expect(wrapper.text()).toContain('加载失败')
    await wrapper.find('.outline-button').trigger('click')
    expect(wrapper.find(tag).exists()).toBe(true)
    wrapper.unmount()
  })
})
