<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { mediaConfig } from '@/data/game'
const emit = defineEmits<{ ready: [] }>()
const video = ref<HTMLVideoElement | null>(null)
const phase = ref<'loading' | 'playing' | 'blocked' | 'error' | 'done'>(mediaConfig.introVideoUrl ? 'loading' : 'done')
const progress = ref(0)
let timeout: ReturnType<typeof setTimeout> | undefined
function deadline() { clearTimeout(timeout); timeout = setTimeout(() => { phase.value = 'error' }, 45000) }
function updateProgress() {
  const el = video.value
  if (el && Number.isFinite(el.duration) && el.duration > 0 && el.buffered.length) progress.value = Math.min(100, Math.round(el.buffered.end(el.buffered.length - 1) / el.duration * 100))
}
async function play() {
  clearTimeout(timeout)
  phase.value = 'playing'
  try { await video.value?.play() } catch { phase.value = 'blocked' }
}
function ready() { if (phase.value === 'loading') { progress.value = 100; void play() } }
function finish() { clearTimeout(timeout); video.value?.pause(); phase.value = 'done'; emit('ready') }
function retry() { phase.value = 'loading'; progress.value = 0; video.value?.load(); deadline() }
function playing() { clearTimeout(timeout) }
function failed() { clearTimeout(timeout); phase.value = 'error' }
onMounted(() => { if (mediaConfig.introVideoUrl) deadline(); else emit('ready') })
onBeforeUnmount(() => clearTimeout(timeout))
</script>
<template>
  <Transition name="fade">
    <section v-if="phase !== 'done'" class="intro-screen" aria-label="开场动画">
      <video ref="video" :src="mediaConfig.introVideoUrl" preload="auto" muted playsinline @canplaythrough="ready" @progress="updateProgress" @ended="finish" @error="failed" @waiting="deadline" @playing="playing" />
      <Transition name="fade">
        <div v-if="phase === 'loading'" class="intro-loading" role="status">
          <svg viewBox="0 0 400 400" class="loader-art" aria-label="正在载入敦煌画卷">
            <g class="mandala" fill="none" stroke="currentColor"><circle cx="200" cy="200" r="148"/><circle cx="200" cy="200" r="139"/><path v-for="n in 12" :key="n" d="M200 61Q251 132 200 200Q149 132 200 61Z" :transform="`rotate(${n * 30} 200 200)`"/><circle cx="200" cy="200" r="50"/></g>
            <text x="200" y="194" text-anchor="middle" fill="currentColor" font-size="20" letter-spacing="8">入 境</text><text x="200" y="222" text-anchor="middle" fill="currentColor" font-size="11">{{ progress }}%</text>
            <text x="200" y="380" text-anchor="middle" fill="currentColor" font-size="12" letter-spacing="4">风沙渐起 · 千年将至</text>
          </svg>
        </div>
      </Transition>
      <div v-if="phase === 'error' || phase === 'blocked'" class="intro-message surface">
        <h2>{{ phase === 'error' ? '画卷暂未展开' : '轻触，走入敦煌' }}</h2>
        <p>{{ phase === 'error' ? '开场视频加载失败或超时，请检查素材地址与网络。' : '浏览器需要你的许可才能播放开场动画。' }}</p>
        <button class="primary" @click="phase === 'error' ? retry() : play()">{{ phase === 'error' ? '重新加载' : '播放开场' }}</button>
        <button class="text-button" @click="finish">跳过开场</button>
      </div>
      <button v-if="phase === 'playing'" class="skip-intro" @click="finish">跳过开场 →</button>
    </section>
  </Transition>
</template>
