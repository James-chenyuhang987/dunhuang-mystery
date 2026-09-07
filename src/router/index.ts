import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '@/views/HomeView.vue'
import GameView from '@/views/GameView.vue'
import EndingView from '@/views/EndingView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', component: HomeView, meta: { title: '敦煌壁画探索 · 一眼千年' } },
    { path: '/game', component: GameView, meta: { title: '入画寻踪 · 敦煌壁画探索' } },
    { path: '/ending', component: EndingView, meta: { title: '千年回响 · 敦煌壁画探索' } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
})
router.afterEach(to => { document.title = String(to.meta.title ?? '敦煌壁画探索') })

export default router
