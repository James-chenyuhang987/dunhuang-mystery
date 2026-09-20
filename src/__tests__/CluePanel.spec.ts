import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import CluePanel from '@/components/CluePanel.vue'

describe('clue panels', () => {
  it('starts collapsed and never propagates gestures to a parent', async () => {
    const wrapper = mount(CluePanel, {
      props: { item: { type: 'text', name: '残卷', data: '循水而行' }, index: 0 },
    })
    expect(wrapper.find('.clue-body').exists()).toBe(false)
    await wrapper.find('button').trigger('click')
    expect(wrapper.text()).toContain('循水而行')
    for (const name of [
      'pointerdown',
      'pointermove',
      'pointerup',
      'touchstart',
      'touchmove',
      'wheel',
    ]) {
      const event = new Event(name, { bubbles: true, cancelable: true })
      let leaked = false
      const parent = document.createElement('div')
      parent.append(wrapper.element)
      parent.addEventListener(name, () => {
        leaked = true
      })
      wrapper.element.dispatchEvent(event)
      expect(leaked).toBe(false)
    }
    wrapper.unmount()
  })
  it('renders combination clues and their child content', async () => {
    const wrapper = mount(CluePanel, {
      props: {
        item: {
          type: 'combination',
          name: '组合线索',
          data: '总览',
          subclues: [
            { type: 'text', name: '文字碎片', data: '子线索一' },
            { type: 'text', name: '第二碎片', data: '子线索二' },
          ],
        },
        index: 0,
      },
    })
    await wrapper.find('.clue-toggle').trigger('click')
    expect(wrapper.text()).toContain('总览')
    expect(wrapper.text()).toContain('文字碎片')
    expect(wrapper.text()).toContain('第二碎片')
    expect(wrapper.findAll('.clue-toggle')).toHaveLength(3)
    wrapper.unmount()
  })

  it('keeps locked clues unavailable until the parent unlocks them', async () => {
    const wrapper = mount(CluePanel, {
      props: { item: { type: 'text', name: '未解线索', data: '隐藏内容' }, index: 0, locked: true },
    })
    expect(wrapper.find('.clue-toggle').attributes('aria-disabled')).toBe('true')
    expect(wrapper.text()).toContain('未解锁')
    await wrapper.find('.clue-toggle').trigger('click')
    expect(wrapper.find('.clue-body').exists()).toBe(false)
  })

  it('renders a branching dialogue clue and advances through a choice', async () => {
    const wrapper = mount(CluePanel, {
      props: {
        item: {
          type: 'dialogue',
          name: '人物口述',
          data: '一段谈话',
          dialogue_id: 'test-dialogue',
          dialogue: {
            start: 'start',
            nodes: [
              {
                id: 'start',
                speaker: '守护者',
                text: '你要先看哪一份记录？',
                options: [{ label: '交接簿', next: 'end' }],
              },
              { id: 'end', speaker: '守护者', text: '记录比猜测可靠。', next: null },
            ],
          },
        },
        index: 0,
      },
    })
    await wrapper.find('.clue-toggle').trigger('click')
    expect(wrapper.text()).toContain('开始对话')
    await wrapper.get('.primary').trigger('click')
    expect(wrapper.text()).toContain('你要先看哪一份记录')
    await wrapper.get('.dialogue-option').trigger('click')
    expect(wrapper.text()).toContain('记录比猜测可靠')
  })

  it('hands dialogue playback to the game overlay when configured as external', async () => {
    const item = {
      type: 'dialogue' as const,
      name: '人物口述',
      data: '一段谈话',
      dialogue_id: 'external-dialogue',
      dialogue: {
        start: 'start',
        nodes: [{ id: 'start', speaker: '守护者', text: '由游戏画面呈现', next: null }],
      },
    }
    const wrapper = mount(CluePanel, {
      props: { item, index: 0, externalDialogue: true },
    })
    await wrapper.get('.clue-toggle').trigger('click')
    await wrapper.get('.dialogue-intro .primary').trigger('click')

    expect(wrapper.emitted('dialogue-start')?.[0]).toEqual([item])
    expect(wrapper.find('.clue-body').exists()).toBe(false)
  })

  it.each(['image', 'audio', 'video'] as const)('reloads failed %s assets', async (type) => {
    const wrapper = mount(CluePanel, {
      props: { item: { type, name: '线索', data: '/missing' }, index: 1 },
    })
    await wrapper.find('button').trigger('click')
    const tag = type === 'image' ? 'img' : type
    await wrapper.find(tag).trigger('error')
    expect(wrapper.text()).toContain('加载失败')
    await wrapper.find('.outline-button').trigger('click')
    expect(wrapper.find(tag).exists()).toBe(true)
    wrapper.unmount()
  })
})
