import { createRouter, createWebHashHistory } from 'vue-router'
import { siteConfig } from '@/data/game'
import HomeView from '@/views/HomeView.vue'
import GameView from '@/views/GameView.vue'
import EndingView from '@/views/EndingView.vue'

const HOME_PATH = '/dunhuang/home'

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    { path: '/', redirect: HOME_PATH },
    { path: '/dunhuang', redirect: HOME_PATH },
    { path: '/:place/home', name: 'place-home', component: HomeView, meta: { section: 'home', title: `${siteConfig.title} · ${siteConfig.subtitle}` }, beforeEnter: (to) => to.params.place === 'dunhuang' ? true : HOME_PATH },
    { path: '/:place/game', name: 'place-game', component: GameView, meta: { section: 'game', title: `入画寻踪 · ${siteConfig.title}` }, beforeEnter: (to) => to.params.place === 'dunhuang' ? true : HOME_PATH },
    { path: '/:place/thank', name: 'place-thank', component: EndingView, meta: { section: 'thank', title: `千年回响 · ${siteConfig.title}` }, beforeEnter: (to) => to.params.place === 'dunhuang' ? true : HOME_PATH },
    { path: '/terracotta/:pathMatch(.*)*', redirect: HOME_PATH },
    { path: '/levels', redirect: { path: HOME_PATH, query: { panel: 'levels' } } },
    { path: '/game', redirect: '/dunhuang/game' },
    { path: '/ending', redirect: '/dunhuang/thank' },
    { path: '/:pathMatch(.*)*', redirect: HOME_PATH },
  ],
  scrollBehavior: () => ({ top: 0 }),
})
router.afterEach((to) => { document.title = String(to.meta.title ?? siteConfig.title) })

export default router
