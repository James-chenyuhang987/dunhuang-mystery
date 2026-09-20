<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { RouterLink, useRoute, useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { getStory, storyRevision } from '@/utils/storyPackage'
import DifficultyControl from '@/components/DifficultyControl.vue'
import AppIcon from '@/components/AppIcon.vue'
import { assetUrl } from '@/utils/assets'
import type { StoryPackage } from '@/types/game'

const route = useRoute()
const router = useRouter()
const game = useGameStore()
const posterFailed = ref(false)
const posterRevision = ref(0)
const backgroundSource = computed(() =>
  posterFailed.value
    ? assetUrl('/art/landscape.svg')
    : assetUrl(story.value?.background_url || '/art/landscape.svg'),
)

function useBackgroundFallback(): void {
  posterFailed.value = true
}

function useChapterFallback(event: Event): void {
  const image = event.currentTarget as HTMLImageElement | null
  if (!image || image.dataset.fallbackApplied === 'true') return
  image.dataset.fallbackApplied = 'true'
  image.src = assetUrl('/art/cave-01.svg')
}

const storyId = computed(() =>
  typeof route.params.storyId === 'string' ? route.params.storyId : '',
)
const story = computed<StoryPackage | null>(() => {
  return (
    getStory(storyId.value) ?? (game.activeStory?.id === storyId.value ? game.activeStory : null)
  )
})
const selected = computed(() => game.levels[game.selectedLevelIndex])
const storyHomePath = computed(() => `/story/${encodeURIComponent(storyId.value)}/home`)
const storyGamePath = computed(() => `/story/${encodeURIComponent(storyId.value)}/game`)
const storyThankPath = computed(() => `/story/${encodeURIComponent(storyId.value)}/thank`)

function retryPoster(): void {
  posterFailed.value = false
  posterRevision.value += 1
}

watch(storyId, () => {
  posterFailed.value = false
  posterRevision.value += 1
})

function ensureStory(): boolean {
  const entry = story.value ?? getStory(storyId.value)
  if (!entry) {
    void router.replace('/studio')
    return false
  }
  const revision = storyRevision(entry)
  if (game.sourceKind !== 'ugc' || game.sourceId !== entry.id || game.sourceRevision !== revision) {
    if (!game.loadStory(entry)) {
      void router.replace('/studio')
      return false
    }
  }
  return true
}

function start(campaign: boolean): void {
  if (!ensureStory() || !game.levels.length) return
  if (game.hasProgress && game.sourceKind === 'ugc' && game.sourceId === storyId.value) {
    if (!window.confirm('重新试玩将替换此故事在本机的进度，是否继续？')) return
  }
  if (campaign) game.startCampaign()
  else game.startGame()
  if (game.hasProgress) void router.push(storyGamePath.value)
}

function resume(): void {
  if (!ensureStory()) return
  void router.push(game.completed ? storyThankPath.value : storyGamePath.value)
}

onMounted(() => {
  ensureStory()
})
</script>

<template>
  <div v-if="story" class="home-page story-home-page">
    <img
      :key="`${story.id}-${posterRevision}`"
      class="landscape"
      :src="backgroundSource"
      :alt="`${story.name}背景`"
      @error="useBackgroundFallback"
    />
    <div class="landscape-shade" />
    <div class="grain-overlay" />
    <header class="site-header">
      <div class="brand">
        <span class="brand-mark">✧</span><span>故事工坊<small>USER STORY</small></span>
      </div>
      <nav aria-label="故事导航">
        <span>{{ story.name }}</span>
        <RouterLink to="/select"><AppIcon name="home" />返回画境</RouterLink>
        <button type="button" @click="router.push('/studio')">
          <AppIcon name="map" />故事工坊
        </button>
      </nav>
    </header>
    <main class="home-main">
      <section class="hero-copy">
        <div class="eyebrow"><span />USER STORY<span class="edition">LOCAL EDITION</span></div>
        <div class="title-layout">
          <h1>{{ story.name }}</h1>
          <span class="seal"><span>自</span><span>创</span></span>
          <p class="vertical-text">{{ story.coordinates || '一段属于你的探索' }}</p>
        </div>
        <p class="hero-english">{{ story.subtitle }}</p>
        <div class="hero-rule"><span>✧</span></div>
        <p class="hero-description">{{ story.introduction }}</p>
        <div class="feature-row">
          <span><AppIcon name="compass" />{{ story.levels.length }} 个章节</span><i /><span
            ><AppIcon name="eye" />可导入 · 可试玩</span
          >
        </div>
        <div class="hero-coordinate">
          <span class="coordinate-cross">＋</span
          ><span
            >LOCAL STORY<small>{{ story.authors[0]?.name || '故事作者' }}</small></span
          ><span class="coordinate-line" />
        </div>
      </section>
      <section class="journey-panel" aria-labelledby="story-journey-title">
        <div class="panel-corner top-left" />
        <div class="panel-corner bottom-right" />
        <div class="panel-heading">
          <span class="eyebrow">YOUR STORY</span
          ><span class="chapter-counter">共 {{ game.levels.length }} 关</span>
        </div>
        <h2 id="story-journey-title">{{ game.hasProgress ? '继续你的故事' : '执灯，开始试玩' }}</h2>
        <p v-if="!game.levels.length" class="panel-subtitle" role="status">
          故事没有可试玩的关卡。
        </p>
        <template v-else>
          <p class="panel-subtitle">从第一关依次探索，或进入选关菜单独立游玩。</p>
          <DifficultyControl :level-index="game.selectedLevelIndex" :editable="true" />
          <button class="primary start-button" @click="start(true)">
            <AppIcon name="compass" /><span>开始故事</span><AppIcon name="arrow" />
          </button>
          <button class="outline-button start-button level-select-button" @click="start(false)">
            <AppIcon name="map" /><span>从当前关开始</span><AppIcon name="arrow" />
          </button>
          <button v-if="game.hasProgress" class="resume-button" @click="resume">
            {{ game.completed ? '查看试玩回响' : '继续上次试玩' }} →
          </button>
        </template>
        <div class="chapter-list story-chapter-list" role="list" aria-label="故事章节">
          <div
            v-for="(level, index) in game.levels"
            :key="`${level.name}-${index}`"
            class="chapter-row"
            :class="{ selected: game.selectedLevelIndex === index }"
            :aria-current="game.selectedLevelIndex === index ? 'step' : undefined"
            role="button"
            tabindex="0"
            @click="game.selectLevel(index)"
            @keydown.enter="game.selectLevel(index)"
            @keydown.space.prevent="game.selectLevel(index)"
          >
            <img
              class="chapter-preview"
              :src="
                assetUrl(level.thumbnail_url ?? level.panorama[0]?.url ?? story.cover_url ?? '')
              "
              @error="useChapterFallback"
              :alt="level.name"
            />
            <div class="chapter-text">
              <small
                >第 {{ index + 1 }} 章<span v-if="level.subtitle">
                  · {{ level.subtitle }}</span
                ></small
              >
              <strong>{{ level.name }}</strong>
              <span
                >{{ level.clues.length }} 条线索 <i>·</i> 题库 {{ level.problems.length }} 题</span
              >
            </div>
          </div>
        </div>
      </section>
    </main>
    <footer class="site-footer">
      <span>故事工坊 · 本地创作</span
      ><span class="footer-center">✧ &nbsp; {{ story.name }} &nbsp; ✧</span
      ><span>由导入的故事包提供</span>
    </footer>
    <div v-if="posterFailed" class="asset-error" role="alert">
      背景图片加载失败<button type="button" @click="retryPoster">重新加载</button>
    </div>
  </div>
</template>
