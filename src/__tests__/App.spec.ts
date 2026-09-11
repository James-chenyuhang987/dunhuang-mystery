import { describe, it, expect, vi } from 'vitest'
import { flushPromises, mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import App from '../App.vue'

describe('App', () => {
 it('renders the current route and installs persistence lifecycle', async () => {
   localStorage.clear()
   const router = createRouter({ history: createMemoryHistory(), routes: [
     { path: '/', component: { template: '<h1>敦煌壁画探索</h1>' }, meta: { section: 'home' } },
     { path: '/dunhuang/thank', component: { template: '<h1>感谢游玩</h1>' }, meta: { section: 'thank' } },
   ] })
   await router.push('/')
   const wrapper = mount(App, { global: { plugins: [createPinia(), router] } })
   expect(wrapper.text()).toContain('敦煌壁画探索')
   expect(wrapper.get('.intro-screen video').attributes('src')).toBe('/entrance.mp4')
   vi.spyOn(HTMLMediaElement.prototype, 'pause').mockImplementation(() => undefined)
   await wrapper.get('.intro-screen video').trigger('ended')
   await router.push('/dunhuang/thank')
   await flushPromises()
   expect(wrapper.find('.intro-screen').exists()).toBe(false)
   window.dispatchEvent(new Event('pagehide'))
   expect(localStorage.length).toBeGreaterThan(0)
   wrapper.unmount()
   vi.restoreAllMocks()
 })
})
