import { describe, expect, it } from 'vitest'
import { mount } from '@vue/test-utils'
import DialogueOverlay from '@/components/DialogueOverlay.vue'

describe('dialogue overlay', () => {
  it('renders the active speaker and follows a selected branch', async () => {
    const wrapper = mount(DialogueOverlay, {
      props: {
        item: {
          type: 'dialogue',
          name: '守护者对话',
          data: '对话',
          dialogue: {
            start: 'start',
            nodes: [
              {
                id: 'start',
                speaker: '守护者',
                text: '先看哪条记录？',
                options: [{ label: '交接簿', next: 'end' }],
              },
              { id: 'end', speaker: '旁白', text: '你记下了证据。', next: null },
            ],
          },
        },
      },
    })
    expect(wrapper.text()).toContain('先看哪条记录')
    await wrapper.get('.dialogue-overlay-option').trigger('click')
    expect(wrapper.text()).toContain('你记下了证据')
  })

  it('emits close when the final line is advanced', async () => {
    const wrapper = mount(DialogueOverlay, {
      props: {
        item: {
          type: 'dialogue',
          name: '结束',
          data: '',
          dialogue: {
            start: 'end',
            nodes: [{ id: 'end', speaker: '旁白', text: '完成', next: null }],
          },
        },
      },
    })
    await wrapper.get('.dialogue-continue').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })

  it('advances a choice-free dialogue from any non-control area', async () => {
    const wrapper = mount(DialogueOverlay, {
      props: {
        item: {
          type: 'dialogue',
          name: '连续口述',
          data: '',
          dialogue: {
            start: 'start',
            nodes: [
              { id: 'start', speaker: '守护者', text: '第一句', next: 'end' },
              { id: 'end', speaker: '守护者', text: '第二句', next: null },
            ],
          },
        },
      },
    })

    await wrapper.get('.dialogue-character').trigger('click')
    expect(wrapper.text()).toContain('第二句')
    await wrapper.get('.dialogue-overlay-content').trigger('click')
    expect(wrapper.emitted('close')).toHaveLength(1)
  })
})
