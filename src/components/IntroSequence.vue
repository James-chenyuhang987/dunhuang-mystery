<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref } from 'vue'
import { assetUrl } from '@/utils/assets'

const props = withDefaults(defineProps<{
  locationId: string
  locationName: string
  videoUrl?: string
  chooseLocation?: boolean
  locationPauseRatio?: number
  rememberCompletion?: boolean
}>(), { videoUrl: '', chooseLocation: false, locationPauseRatio: 0.5, rememberCompletion: true })
const emit = defineEmits<{ ready: [] }>()
const completionKey = `dunhuang-mystery:intro-completed:v2:${props.locationId}`

function introWasCompleted() {
  try { return localStorage.getItem(completionKey) === 'true' } catch { return false }
}

function rememberCompletion() {
  try { localStorage.setItem(completionKey, 'true') } catch { /* Storage restrictions must not block entry. */ }
}

const video = ref<HTMLVideoElement | null>(null)
const shouldPlayIntro = Boolean(props.videoUrl) && (!props.rememberCompletion || !introWasCompleted())
const phase = ref<'earth' | 'loading' | 'playing' | 'blocked' | 'error' | 'choosing' | 'done'>(shouldPlayIntro ? 'earth' : props.chooseLocation ? 'choosing' : 'done')
const progress = ref(0)
let timeout: ReturnType<typeof setTimeout> | undefined
let earthTimeout: ReturnType<typeof setTimeout> | undefined
function deadline() { if (phase.value === 'choosing' || phase.value === 'done') return; clearTimeout(timeout); timeout = setTimeout(() => { phase.value = 'error' }, 45000) }
function beginVideo() {
  if (phase.value !== 'earth') return
  clearTimeout(earthTimeout)
  phase.value = 'loading'
  progress.value = 0
  if (video.value && video.value.readyState >= HTMLMediaElement.HAVE_FUTURE_DATA) {
    progress.value = 100
    void play()
    return
  }
  deadline()
}
function updateProgress() {
  const el = video.value
  if (el && Number.isFinite(el.duration) && el.duration > 0 && el.buffered.length) progress.value = Math.min(100, Math.round(el.buffered.end(el.buffered.length - 1) / el.duration * 100))
}
async function play() {
  clearTimeout(timeout)
  phase.value = 'playing'
  try { await video.value?.play() } catch { if (phase.value === 'playing') phase.value = 'blocked' }
}
function ready() { if (phase.value === 'loading') { progress.value = 100; void play() } }
function finish() {
  clearTimeout(timeout)
  clearTimeout(earthTimeout)
  video.value?.pause()
  if (props.rememberCompletion) rememberCompletion()
  phase.value = 'done'
  emit('ready')
}
function chooseOrFinish() {
  if (!props.chooseLocation) { finish(); return }
  clearTimeout(timeout)
  clearTimeout(earthTimeout)
  video.value?.pause()
  phase.value = 'choosing'
}
function checkPausePoint() {
  const el = video.value
  if (!props.chooseLocation || phase.value !== 'playing' || !el || !Number.isFinite(el.duration) || el.duration <= 0) return
  const ratio = Math.min(.95, Math.max(.05, props.locationPauseRatio))
  if (el.currentTime >= el.duration * ratio) chooseOrFinish()
}
function retry() { phase.value = 'loading'; progress.value = 0; video.value?.load(); deadline() }
function playing() { clearTimeout(timeout) }
function failed() { if (phase.value === 'choosing' || phase.value === 'done') return; clearTimeout(timeout); phase.value = 'error' }
onMounted(() => {
  if (phase.value === 'earth') earthTimeout = setTimeout(beginVideo, 2600)
  else if (phase.value === 'loading') deadline()
  else if (phase.value === 'done') emit('ready')
})
onBeforeUnmount(() => { clearTimeout(timeout); clearTimeout(earthTimeout) })
</script>
<template>
  <Transition name="fade">
    <section v-if="phase !== 'done'" class="intro-screen" aria-label="开场动画">
      <div v-if="phase === 'earth'" class="earth-intro" role="img" aria-label="从太空俯瞰地球，镜头飞向敦煌">
        <div class="earth-stars" />
        <div class="earth-orbit earth-orbit-one" />
        <div class="earth-orbit earth-orbit-two" />
        <div class="earth-globe"><div class="earth-land" /><div class="earth-highlight" /></div>
        <div class="earth-copy"><span class="eyebrow">A JOURNEY ACROSS TIME</span><strong>从星河，抵达敦煌</strong><small>THE EARTH · DUNHUANG</small></div>
      </div>
      <video v-if="videoUrl" ref="video" :src="assetUrl(videoUrl)" preload="auto" muted playsinline @canplaythrough="ready" @progress="updateProgress" @timeupdate="checkPausePoint" @ended="chooseOrFinish" @error="failed" @waiting="deadline" @playing="playing" />
      <slot v-if="phase === 'choosing'" name="locations" :complete="finish" />
      <Transition name="fade">
        <div v-if="phase === 'loading'" class="intro-loading" role="status">
          <svg viewBox="0 0 400 400" class="loader-art" :aria-label="`正在载入${locationName}画卷`">
            <g class="mandala" fill="none" stroke="currentColor"><circle cx="200" cy="200" r="148"/><circle cx="200" cy="200" r="139"/><path v-for="n in 12" :key="n" d="M200 61Q251 132 200 200Q149 132 200 61Z" :transform="`rotate(${n * 30} 200 200)`"/><circle cx="200" cy="200" r="50"/></g>
            <text x="200" y="194" text-anchor="middle" fill="currentColor" font-size="20" letter-spacing="8">入 境</text><text x="200" y="222" text-anchor="middle" fill="currentColor" font-size="11">{{ progress }}%</text>
            <text x="200" y="380" text-anchor="middle" fill="currentColor" font-size="12" letter-spacing="4">风沙渐起 · 千年将至</text>
          </svg>
        </div>
      </Transition>
      <div v-if="phase === 'error' || phase === 'blocked'" class="intro-message surface">
        <h2>{{ phase === 'error' ? '画卷暂未展开' : `轻触，走入${locationName}` }}</h2>
        <p>{{ phase === 'error' ? '开场视频加载失败或超时，请检查素材地址与网络。' : '浏览器需要你的许可才能播放开场动画。' }}</p>
        <button class="primary" @click="phase === 'error' ? retry() : play()">{{ phase === 'error' ? '重新加载' : '播放开场' }}</button>
        <button class="text-button" @click="chooseOrFinish">跳过开场</button>
      </div>
      <button v-if="phase === 'earth'" class="skip-intro" @click="beginVideo">跳过地球动画 →</button>
      <button v-if="phase === 'playing'" class="skip-intro" @click="chooseOrFinish">跳过开场 →</button>
    </section>
  </Transition>
</template>
