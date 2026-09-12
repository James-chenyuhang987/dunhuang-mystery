<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { gameLocations, siteConfig } from '@/data/game'
import AppIcon from '@/components/AppIcon.vue'
import ChapterThumbnail from '@/components/ChapterThumbnail.vue'
import DifficultyControl from '@/components/DifficultyControl.vue'
import { assetUrl } from '@/utils/assets'

const props = defineProps<{ placeId: string }>()
const game = useGameStore()
const router = useRouter()
const route = useRoute()
const selecting = computed(() => route.query.panel === 'levels')
const posterFailed = ref(false)
const posterRevision = ref(0)
const introReady = ref(true)
const activeLocation = computed(() => gameLocations.find((location) => location.id === props.placeId))
const selected = computed(() => game.levels[game.selectedLevelIndex])
const homePath = computed(() => `/${props.placeId}/home`)

function gamePath(section: 'game' | 'thank'): string {
  return `/${props.placeId}/${section}`
}

function start(campaign: boolean): void {
  if (!game.levels.length || !introReady.value) return
  if (game.hasProgress && !window.confirm('重新探索将替换此设备上的答题记录，是否继续？')) return
  if (campaign) game.startCampaign()
  else game.startGame()
  if (game.hasProgress) void router.push(gamePath('game'))
}

function resume(): void {
  void router.push(gamePath(game.completed ? 'thank' : 'game'))
}

onMounted(() => {
  game.pauseTimer()
  if (activeLocation.value && game.locationId !== props.placeId) game.selectLocation(props.placeId)
})
</script>

<template>
  <div class="home-page">
    <img :key="`${placeId}-${posterRevision}`" class="landscape" :src="assetUrl(activeLocation?.background_url || siteConfig.backgroundUrl)" :alt="activeLocation ? `${activeLocation.name}风格探索插画` : siteConfig.backgroundAlt" @error="posterFailed = true">
    <div class="landscape-shade" />
    <div class="grain-overlay" />
    <header class="site-header">
      <div class="brand"><span class="brand-mark">✧</span><span>{{ siteConfig.brand }}<small>{{ siteConfig.brandEnglish }}</small></span></div>
      <nav aria-label="首页导航"><span>{{ activeLocation?.name }}</span><RouterLink :to="gamePath('thank')"><AppIcon name="users"/>关于作者</RouterLink></nav>
    </header>
    <main class="home-main">
      <section class="hero-copy">
        <div class="eyebrow"><span />{{ siteConfig.eyebrow }}<span class="edition">{{ siteConfig.edition }}</span></div>
        <div class="title-layout"><h1>{{ activeLocation?.title ?? siteConfig.title }}</h1><span class="seal"><span v-for="(line, index) in siteConfig.seal" :key="index">{{ line }}<br></span></span><p class="vertical-text">{{ siteConfig.verticalText }}</p></div>
        <p class="hero-english">{{ siteConfig.heroEnglish }}</p>
        <div class="hero-rule"><span>✧</span></div>
        <p class="hero-description">{{ activeLocation?.introduction ?? siteConfig.introduction }}</p>
        <div class="feature-row"><span><AppIcon name="compass"/>360° 全景探索</span><i/><span><AppIcon name="eye"/>沉浸式线索解谜</span></div>
        <div class="hero-coordinate"><span class="coordinate-cross">＋</span><span>{{ activeLocation?.coordinates }}<small>{{ activeLocation?.name }}</small></span><span class="coordinate-line"/></div>
      </section>
      <section class="journey-panel" aria-labelledby="journey-title">
        <div class="panel-corner top-left"/><div class="panel-corner bottom-right"/>
        <div class="panel-heading"><span class="eyebrow">YOUR JOURNEY</span><span class="chapter-counter">共 {{ game.levels.length }} 关</span></div>
        <h2 id="journey-title">{{ selecting ? siteConfig.selectionHeading : siteConfig.homeHeading }}</h2>
        <p v-if="!game.levels.length" class="panel-subtitle" role="status">暂无关卡，请先在配置中添加关卡。</p>
        <template v-if="!selecting">
          <p class="panel-subtitle">从第一关依次探索，或进入选关菜单独立游玩。</p>
          <DifficultyControl v-if="game.levels.length" :level-index="0" :editable="true" />
          <button class="primary start-button" :disabled="!introReady || !game.levels.length" @click="start(true)"><AppIcon name="compass"/><span>开始</span><AppIcon name="arrow"/></button>
          <button class="outline-button start-button level-select-button" :disabled="!introReady || !game.levels.length" @click="router.push({ path: homePath, query: { panel: 'levels' } })"><AppIcon name="map"/><span>选关</span><AppIcon name="arrow"/></button>
        </template>
        <template v-else>
          <RouterLink :to="homePath" class="text-button">← 返回主菜单</RouterLink>
          <div class="chapter-list" role="group" aria-label="选择关卡">
            <div v-for="(level, index) in game.levels" :key="index" class="chapter-row">
              <ChapterThumbnail :url="level.thumbnail_url ?? level.panorama[0]?.url ?? ''" :name="level.name"/>
              <button class="chapter-card" :class="{ selected: game.selectedLevelIndex === index }" :aria-pressed="game.selectedLevelIndex === index" @click="game.selectLevel(index)">
                <span class="chapter-thumb"><span>{{ index + 1 }}</span></span>
                <span class="chapter-text"><small>第 {{ index + 1 }} 章<span v-if="level.subtitle"> · {{ level.subtitle }}</span></small><strong>{{ level.name }}</strong><span>{{ level.clues.length }} 条线索 <i>·</i> 题库 {{ level.problems.length }} 题</span></span>
                <span class="chapter-radio"><AppIcon v-if="game.selectedLevelIndex === index" name="check"/></span>
              </button>
            </div>
          </div>
          <p v-if="selected?.description" class="chapter-description">{{ selected.description }}</p>
          <DifficultyControl v-if="selected" :level-index="game.selectedLevelIndex" :editable="true" />
          <button class="primary start-button" :disabled="!introReady || !selected" @click="start(false)"><AppIcon name="compass"/><span>开始所选关卡</span><AppIcon name="arrow"/></button>
          <button v-if="game.hasProgress" class="resume-button" @click="resume">{{ game.completed ? '查看上次探索回响' : '继续上次的探索' }} →</button>
          <p class="panel-footnote">所选关卡独立结算；进入游戏后难度仅供查看。</p>
        </template>
      </section>
      <div class="art-caption"><span>{{ activeLocation?.art_caption ?? siteConfig.artCaption }}</span><small>{{ activeLocation?.art_caption_english ?? siteConfig.artCaptionEnglish }}</small><span class="caption-line"/></div>
    </main>
    <footer class="site-footer"><span>{{ siteConfig.footerText }}</span><span class="footer-center">✧ &nbsp; {{ siteConfig.footerMotto }} &nbsp; ✧</span><span>{{ siteConfig.artworkNotice }}</span></footer>
    <div v-if="posterFailed" class="asset-error" role="alert">背景图片加载失败<button @click="posterFailed = false; posterRevision++">重新加载</button></div>
  </div>
</template>
