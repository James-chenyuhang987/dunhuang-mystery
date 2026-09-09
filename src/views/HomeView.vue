<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { gameLocations, mediaConfig, siteConfig } from '@/data/game'
import AppIcon from '@/components/AppIcon.vue'
import ChapterThumbnail from '@/components/ChapterThumbnail.vue'
import DifficultyControl from '@/components/DifficultyControl.vue'
import IntroSequence from '@/components/IntroSequence.vue'
import LocationSelector from '@/components/LocationSelector.vue'
const game = useGameStore()
const router = useRouter()
const route = useRoute()
const selecting = computed(() => route.path === '/levels')
const posterFailed = ref(false)
const posterRevision = ref(0)
const introReady = ref(false)
const choosingLocation = ref(route.path === '/' && sessionStorage.getItem('dunhuang-mystery:location-selected') !== '1')
const activeLocation = computed(() => gameLocations.find(location => location.id === game.locationId) ?? gameLocations[0])
const selected = computed(() => game.levels[game.selectedLevelIndex])
function start(campaign: boolean) {
  if (!game.levels.length || !introReady.value) return
  if (game.hasProgress && !window.confirm('重新探索将替换此设备上的答题记录，是否继续？')) return
  if (campaign) game.startCampaign()
  else game.startGame()
  if (game.hasProgress) void router.push('/game')
}
function resume() { void router.push(game.completed ? '/ending' : '/game') }
function selectLocation(id: string) {
  if (game.hasProgress && id !== game.locationId && !window.confirm('切换地点将替换此设备上的当前探索记录，是否继续？')) return false
  game.selectLocation(id)
  sessionStorage.setItem('dunhuang-mystery:location-selected', '1')
  const location = gameLocations.find(entry => entry.id === id)
  document.title = `${location?.title ?? siteConfig.title} · ${siteConfig.subtitle}`
  choosingLocation.value = false
  return true
}
onMounted(() => game.pauseTimer())
</script>
<template>
  <div class="home-page">
    <img :key="`${game.locationId}-${posterRevision}`" class="landscape" :src="activeLocation?.background_url || mediaConfig.introPosterUrl || siteConfig.backgroundUrl" :alt="activeLocation ? `${activeLocation.name}风格探索插画` : siteConfig.backgroundAlt" @error="posterFailed = true">
    <div class="landscape-shade" />
    <div class="grain-overlay" />
    <header class="site-header">
      <div class="brand"><span class="brand-mark">✧</span><span>{{ siteConfig.brand }}<small>{{ siteConfig.brandEnglish }}</small></span></div>
      <button class="header-note location-switch" @click="choosingLocation = true">{{ activeLocation?.name }} · 切换地点</button>
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
          <p class="panel-subtitle">从第一关依次探索，或选取一关独立游玩。</p>
          <button class="primary start-button" :disabled="!introReady || !game.levels.length" @click="start(true)"><AppIcon name="compass"/><span>开始</span><AppIcon name="arrow"/></button>
          <button class="primary start-button" :disabled="!introReady" @click="router.push('/levels')"><AppIcon name="compass"/><span>选关</span><AppIcon name="arrow"/></button>
        </template>
        <template v-else>
          <RouterLink to="/" class="text-button">← 返回主菜单</RouterLink>
          <div class="chapter-list" role="group" aria-label="选择关卡">
            <div v-for="(level, index) in game.levels" :key="index" class="chapter-row">
            <ChapterThumbnail :url="level.thumbnail_url ?? level.panorama_url" :name="level.name"/>
            <button class="chapter-card" :class="{ selected: game.selectedLevelIndex === index }" :aria-pressed="game.selectedLevelIndex === index" @click="game.selectLevel(index)">
              <span class="chapter-thumb"><span>{{ index + 1 }}</span></span>
              <span class="chapter-text"><small>第 {{ index + 1 }} 章<span v-if="level.subtitle"> · {{ level.subtitle }}</span></small><strong>{{ level.name }}</strong><span>{{ level.clues.length }} 条线索 <i>·</i> 题库 {{ level.problems.length }} 题</span></span>
              <span class="chapter-radio"><AppIcon v-if="game.selectedLevelIndex === index" name="check"/></span>
            </button>
            </div>
          </div>
          <p v-if="selected?.description" class="chapter-description">{{ selected.description }}</p>
          <DifficultyControl v-if="selected" :level-index="game.selectedLevelIndex" />
          <button class="primary start-button" :disabled="!introReady || !selected" @click="start(false)"><AppIcon name="compass"/><span>开始所选关卡</span><AppIcon name="arrow"/></button>
          <button v-if="game.hasProgress" class="resume-button" @click="resume">{{ game.completed ? '查看上次探索回响' : '继续上次的探索' }} →</button>
          <RouterLink to="/ending" class="text-button">关于创作</RouterLink>
          <p class="panel-footnote">所选关卡独立结算；进入游戏后仍可切换难度。</p>
        </template>
      </section>
      <div class="art-caption"><span>{{ activeLocation?.art_caption ?? siteConfig.artCaption }}</span><small>{{ activeLocation?.art_caption_english ?? siteConfig.artCaptionEnglish }}</small><span class="caption-line"/></div>
    </main>
    <Transition name="fade"><LocationSelector v-if="introReady && choosingLocation" :locations="gameLocations" :selected-id="game.locationId" @select="selectLocation" /></Transition>
    <footer class="site-footer"><span>{{ siteConfig.footerText }}</span><span class="footer-center">✧ &nbsp; {{ siteConfig.footerMotto }} &nbsp; ✧</span><span>{{ siteConfig.artworkNotice }}</span></footer>
    <div v-if="posterFailed" class="asset-error" role="alert">背景图片加载失败<button @click="posterFailed = false; posterRevision++">重新加载</button></div>
    <IntroSequence :choose-location="choosingLocation" @ready="introReady = true">
      <template #locations="{ complete }"><LocationSelector :locations="gameLocations" :selected-id="game.locationId" @select="id => { if (selectLocation(id)) complete() }" /></template>
    </IntroSequence>

  </div>
</template>
