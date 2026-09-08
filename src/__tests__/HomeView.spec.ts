import { afterEach, describe, expect, it, vi } from 'vitest'
import { mount, flushPromises } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import { useGameStore } from '@/stores/game'
import { siteConfig } from '@/data/game'
import type { level } from '@/types/game'

const wrappers: ReturnType<typeof mount>[] = []
afterEach(() => { wrappers.splice(0).forEach(wrapper => wrapper.unmount()); vi.restoreAllMocks(); localStorage.clear() })
async function setup(levels: level[], path = '/') {
  const pinia = createPinia()
  setActivePinia(pinia)
  const game = useGameStore()
  game.levels = levels
  const router = createRouter({ history: createMemoryHistory(), routes: ['/', '/levels', '/game', '/ending'].map(path => ({ path, component: HomeView })) })
  await router.push(path)
  const wrapper = mount(HomeView, { global: { plugins: [pinia, router] } })
  wrappers.push(wrapper)
  await flushPromises()
  return { wrapper, router, game }
}
const entries: level[] = Array.from({ length: 12 }, (_, index) => ({
  name: index < 2 ? '重复关卡名' : `配置名称 ${index + 1}`,
  panorama_url: `/custom/panorama-${index}.png`,
  clues: [], problems: [],
  ...(index === 11 ? { thumbnail_url: '/custom/preview.png', subtitle: '配置副标题', description: '配置介绍' } : {}),
}))

describe('configuration-driven menus', () => {
  it('only exposes start and selection on the first menu, then renders every configured chapter', async () => {
    const { wrapper, router, game } = await setup(entries)
    expect(wrapper.findAll('button').map(button => button.text())).toEqual(['开始', '选关'])
    expect(wrapper.findAll('.chapter-card')).toHaveLength(0)
    expect(wrapper.find('h1').text()).toBe(siteConfig.title)
    await wrapper.findAll('button')[1]!.trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.path).toBe('/levels')
    expect(wrapper.findAll('.chapter-card')).toHaveLength(12)
    const last = wrapper.findAll('.chapter-card')[11]!
    expect(last.text()).toContain('第 12 章')
    expect(last.text()).toContain('配置名称 12')
    expect(last.text()).toContain('配置副标题')
    expect(wrapper.findAll('.chapter-preview img')[11]!.attributes('src')).toBe('/custom/preview.png')
    await last.trigger('click')
    expect(game.selectedLevelIndex).toBe(11)
    expect(wrapper.find('.chapter-description').text()).toBe('配置介绍')
    const start = vi.spyOn(game, 'startGame')
    await wrapper.find('.start-button').trigger('click')
    expect(start).toHaveBeenCalled()
    expect(game.currentLevelIndex).toBe(11)
  })
  it('disables starting when the configuration is empty', async () => {
    const { wrapper, router } = await setup([])
    expect(wrapper.text()).toContain('暂无关卡')
    expect(wrapper.find('button').attributes('disabled')).toBeDefined()
    await router.push('/levels')
    await flushPromises()
    expect(wrapper.find('.start-button').attributes('disabled')).toBeDefined()
    expect(wrapper.findAll('.chapter-card')).toHaveLength(0)
  })
  it('starts a campaign from the first chapter regardless of the selected index', async () => {
    const { wrapper, game } = await setup(entries)
    game.selectLevel(8)
    await wrapper.find('button').trigger('click')
    expect(game.mode).toBe('campaign')
    expect(game.currentLevelIndex).toBe(0)
  })
  it('reloads a failed configured preview', async () => {
    const { wrapper } = await setup(entries.slice(0, 1), '/levels')
    await wrapper.find('.chapter-preview img').trigger('error')
    expect(wrapper.text()).toContain('预览加载失败')
    await wrapper.find('.thumbnail-error button').trigger('click')
    expect(wrapper.find('.chapter-preview img').attributes('src')).toBe('/custom/panorama-0.png')
  })
})
