import { describe, it, expect } from 'vitest'
import { mount } from '@vue/test-utils'
import { createPinia } from 'pinia'
import { createMemoryHistory, createRouter } from 'vue-router'
import App from '../App.vue'

describe('App', () => {
 it('renders the current route and installs persistence lifecycle', async () => {
   localStorage.clear()
   const router = createRouter({ history: createMemoryHistory(), routes: [{ path: '/', component: { template: '<h1>敦煌壁画探索</h1>' } }] })
   await router.push('/')
   const wrapper = mount(App, { global: { plugins: [createPinia(), router] } })
   expect(wrapper.text()).toContain('敦煌壁画探索')
   window.dispatchEvent(new Event('pagehide'))
   expect(localStorage.length).toBeGreaterThan(0)
   wrapper.unmount()
 })
})
