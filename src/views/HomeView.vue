<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { mediaConfig } from '@/data/game'
import AppIcon from '@/components/AppIcon.vue'
import DifficultyControl from '@/components/DifficultyControl.vue'
import IntroSequence from '@/components/IntroSequence.vue'
const game = useGameStore()
const router = useRouter()
const guideDialog = ref<HTMLDialogElement | null>(null)
const posterFailed = ref(false)
const posterRevision = ref(0)
const introReady = ref(false)
const selected = computed(() => game.levels[game.selectedLevelIndex])
const descriptions = ['一卷遗落沙海的行记，一段被风藏起的往事。循着驼铃，寻找故事的起点。', '循九色而入，辨壁画中的隐语。在斑驳的色彩之间，找回被遗忘的承诺。', '木匣尘封，经声未远。拼合最后的线索，让千年的回响重归原处。']
function start() {
  if (game.hasProgress && !window.confirm('重新探索将替换此设备上的答题记录，是否继续？')) return
  game.startGame(); void router.push('/game')
}
function resume() { void router.push(game.completed ? '/ending' : '/game') }
onMounted(() => game.pauseTimer())
</script>
<template>
  <div class="home-page">
    <img :key="posterRevision" class="landscape" :src="mediaConfig.introPosterUrl || '/art/landscape.svg'" alt="敦煌莫高窟风格山崖与沙海插画" @error="posterFailed = true">
    <div class="landscape-shade" />
    <div class="grain-overlay" />
    <header class="site-header">
      <RouterLink to="/" class="brand" aria-label="敦煌壁画探索首页"><span class="brand-mark">敦<span>煌</span></span><span>敦煌 · 探迹<small>DUNHUANG EXPLORER</small></span></RouterLink>
      <nav aria-label="主导航"><span class="nav-current">开启探索</span><button @click="guideDialog?.showModal()">探索手札 <span>↗</span></button><RouterLink to="/ending">关于创作 <span>↗</span></RouterLink></nav>
      <span class="header-note">一眼千年 · 一步一谜</span>
    </header>
    <main class="home-main">
      <section class="hero-copy">
        <div class="eyebrow"><span />一场穿越千年的壁画寻踪<span class="edition">VOL. 01 — 2026</span></div>
        <div class="title-layout"><h1>敦煌壁画<span>探索<i>。</i></span></h1><span class="seal">循迹<br>千年</span><p class="vertical-text">于无声处，听见历史的回响</p></div>
        <p class="hero-english">BEYOND THE MURALS</p>
        <div class="hero-rule"><span>✧</span></div>
        <p class="hero-description">风沙掩埋了足迹，却未曾带走故事。<br>化身壁画探秘者，在方寸洞窟之间，<br>拾起散落的线索，解开沉睡千年的谜题。</p>
        <div class="feature-row"><span><AppIcon name="compass"/>360° 全景探索</span><i/><span><AppIcon name="eye"/>沉浸式线索解谜</span></div>
        <div class="hero-coordinate"><span class="coordinate-cross">＋</span><span>40°02′ N &nbsp; 94°48′ E<small>中国 · 甘肃 · 敦煌莫高窟</small></span><span class="coordinate-line"/></div>
      </section>
      <section class="journey-panel" aria-labelledby="journey-title">
        <div class="panel-corner top-left"/><div class="panel-corner bottom-right"/>
        <div class="panel-heading"><span class="eyebrow">YOUR JOURNEY</span><span class="chapter-counter">{{ String(game.selectedLevelIndex + 1).padStart(2, '0') }} <small>/ {{ String(game.levels.length).padStart(2, '0') }}</small></span></div>
        <h2 id="journey-title">择一卷，入画境</h2><p class="panel-subtitle">每一幅壁画，都藏着未完的故事。</p>
        <div class="chapter-list" role="group" aria-label="选择关卡">
          <button v-for="(level, index) in game.levels" :key="level.name" class="chapter-card" :class="{ selected: game.selectedLevelIndex === index }" :aria-pressed="game.selectedLevelIndex === index" @click="game.selectLevel(index)">
            <span class="chapter-thumb" :style="{ backgroundImage: `url(/art/cave-0${index + 1}.svg)` }"><span>{{ ['壹', '贰', '叁'][index] }}</span></span>
            <span class="chapter-text"><small>第{{ ['一', '二', '三'][index] }}章 · {{ ['入境', '寻迹', '回响'][index] }}</small><strong>{{ level.name }}</strong><span>{{ level.clues.length }} 条线索 <i>·</i> 题库 {{ level.problems.length }} 题</span></span>
            <span class="chapter-radio"><AppIcon v-if="game.selectedLevelIndex === index" name="check"/></span>
          </button>
        </div>
        <p class="chapter-description">{{ descriptions[game.selectedLevelIndex] }}</p>
        <DifficultyControl :level-index="game.selectedLevelIndex" />
        <button class="primary start-button" :disabled="!introReady" @click="start"><AppIcon name="compass"/><span>{{ game.hasProgress ? '重新开启探索' : '启程 · 探索壁画' }}</span><AppIcon name="arrow"/></button>
        <button v-if="game.hasProgress" class="resume-button" @click="resume">{{ game.completed ? '查看上次探索回响' : '继续上次的探索' }} →</button>
        <p class="panel-footnote"><span class="status-dot"/>{{ selected?.name }} · 进度自动保存于此设备</p>
      </section>
      <div class="art-caption"><span>莫高窟 · 九层楼</span><small>MOGAO CAVES, DUNHUANG</small><span class="caption-line"/></div>
    </main>
    <footer class="site-footer"><span>以好奇为灯，照见千年之美。</span><span class="footer-center">✧ &nbsp; 大漠有境，探索无尽 &nbsp; ✧</span><span>原创示意画境 · 非实景影像</span></footer>
    <div v-if="posterFailed" class="asset-error" role="alert">背景图片加载失败<button @click="posterFailed = false; posterRevision++">重新加载</button></div>
    <IntroSequence @ready="introReady = true" />
    <dialog ref="guideDialog" class="guide-dialog surface" aria-labelledby="guide-title">
      <button class="icon-button dialog-close" aria-label="关闭探索手札" @click="guideDialog?.close()"><AppIcon name="close"/></button><p class="eyebrow">FIELD NOTES</p><h2 id="guide-title">探索手札</h2><p>拖动全景，环顾洞窟；滚动鼠标或双指捏合，放大细节。键盘方向键与加减键同样可用。</p><p>展开线索，阅读残卷，再打开题目辨认真相。答错可以重试，每次尝试都会记录。</p><p>初探回答一道，寻踪回答一半（向上取整），解谜回答全部。途中可切换难度，已答记录不丢失。每次只探索所选章节，完成后进入本关结算。</p><p class="muted">这是原创虚构的文化探索故事，非考古史实。演示插画可替换为真实全景素材。</p><button class="primary" @click="guideDialog?.close()">执灯，入画</button>
    </dialog>
  </div>
</template>
