import { createRouter, createWebHistory } from 'vue-router'
import { siteConfig } from '@/data/game'
import HomeView from '@/views/HomeView.vue'
import GameView from '@/views/GameView.vue'
import EndingView from '@/views/EndingView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', component: HomeView, meta: { title: `${siteConfig.title} · ${siteConfig.subtitle}` } },
    { path: '/levels', component: HomeView, meta: { title: `选关 · ${siteConfig.title}` } },
    { path: '/game', component: GameView, meta: { title: `入画寻踪 · ${siteConfig.title}` } },
    { path: '/ending', component: EndingView, meta: { title: `千年回响 · ${siteConfig.title}` } },
    { path: '/:pathMatch(.*)*', redirect: '/' },
  ],
  scrollBehavior: () => ({ top: 0 }),
})
router.afterEach(to => { document.title = String(to.meta.title ?? siteConfig.title) })

export default router
