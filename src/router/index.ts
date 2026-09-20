import { createRouter, createWebHashHistory } from 'vue-router'
import { gameLocations, siteConfig } from '@/data/game'
import PlaceHome from '@/views/PlaceHome.vue'
import GameView from '@/views/GameView.vue'
import EndingView from '@/views/EndingView.vue'
import StoryStudioView from '@/views/StoryStudioView.vue'
import LocationSelectView from '@/views/LocationSelectView.vue'
import { getStory } from '@/utils/storyPackage'

const HOME_PATH = '/dunhuang/home'
const validPlaces = new Set(gameLocations.map((location) => location.id))

function storyIdFromRoute(value: unknown): string {
  if (typeof value !== 'string') return ''
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}

function ensureStory(to: { params: Record<string, unknown> }): boolean | string {
  const storyId = storyIdFromRoute(to.params.storyId)
  return storyId && getStory(storyId) ? true : '/studio'
}

const router = createRouter({
  history: createWebHashHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/select',
      name: 'location-select',
      component: LocationSelectView,
      meta: { section: 'select', title: `选择地点 · ${siteConfig.title}` },
    },
    {
      path: '/studio',
      name: 'story-studio',
      component: StoryStudioView,
      meta: { section: 'studio', title: '故事工坊 · 用户创作' },
    },
    { path: '/', redirect: HOME_PATH },
    { path: '/dunhuang', redirect: HOME_PATH },
    {
      path: '/story/:storyId/home',
      name: 'story-home',
      component: () => import('@/views/StoryHomeView.vue'),
      meta: { section: 'home', sourceKind: 'ugc', title: `故事 · ${siteConfig.title}` },
      beforeEnter: ensureStory,
    },
    {
      path: '/story/:storyId/game',
      name: 'story-game',
      component: GameView,
      meta: { section: 'game', sourceKind: 'ugc', title: `故事试玩 · ${siteConfig.title}` },
      beforeEnter: ensureStory,
    },
    {
      path: '/story/:storyId/thank',
      name: 'story-thank',
      component: EndingView,
      meta: { section: 'thank', sourceKind: 'ugc', title: `故事回响 · ${siteConfig.title}` },
      beforeEnter: ensureStory,
    },
    {
      path: '/:place/home',
      name: 'place-home',
      component: PlaceHome,
      meta: { section: 'home', title: `${siteConfig.title} · ${siteConfig.subtitle}` },
      beforeEnter: (to) =>
        typeof to.params.place === 'string' && validPlaces.has(to.params.place) ? true : HOME_PATH,
    },
    {
      path: '/:place/game',
      name: 'place-game',
      component: GameView,
      meta: { section: 'game', title: `入画寻踪 · ${siteConfig.title}` },
      beforeEnter: (to) =>
        typeof to.params.place === 'string' && validPlaces.has(to.params.place) ? true : HOME_PATH,
    },
    {
      path: '/:place/thank',
      name: 'place-thank',
      component: EndingView,
      meta: { section: 'thank', title: `千年回响 · ${siteConfig.title}` },
      beforeEnter: (to) =>
        typeof to.params.place === 'string' && validPlaces.has(to.params.place) ? true : HOME_PATH,
    },
    { path: '/terracotta/:pathMatch(.*)*', redirect: '/yungang/home' },
    { path: '/levels', redirect: { path: HOME_PATH, query: { panel: 'levels' } } },
    { path: '/game', redirect: '/dunhuang/game' },
    { path: '/ending', redirect: '/dunhuang/thank' },
    { path: '/:pathMatch(.*)*', redirect: HOME_PATH },
  ],
  scrollBehavior: () => ({ top: 0 }),
})
router.afterEach((to) => {
  document.title = String(to.meta.title ?? siteConfig.title)
})

export default router
