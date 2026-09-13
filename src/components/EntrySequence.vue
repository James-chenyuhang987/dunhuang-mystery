<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref } from 'vue'
import { assetUrl } from '@/utils/assets'
import LocationSelector from './LocationSelector.vue'
import type { location } from '@/types/game'

const props = defineProps<{ locations: location[] }>()
const emit = defineEmits<{ ready: [placeId: string] }>()
type Phase = 'earth' | 'opening' | 'choosing' | 'destination'
const phase = ref<Phase>('earth')
const selected = ref<location | null>(null)
const video = ref<HTMLVideoElement | null>(null)
const openingVideoUrl = assetUrl('/entry/begin.mp4')
const background = computed(() => phase.value === 'earth' || phase.value === 'opening' ? assetUrl('/entry/begin_earth.jpeg') : assetUrl('/entry/select_place.jpeg'))
let earthTimer: ReturnType<typeof setTimeout> | undefined
let timeout: ReturnType<typeof setTimeout> | undefined

function clearTimers() { clearTimeout(earthTimer); clearTimeout(timeout) }
async function playVideo() {
  phase.value = 'opening'
  clearTimeout(timeout)
  timeout = setTimeout(openingEnded, 45000)
  await nextTick()
  try { await video.value?.play() } catch { phase.value = 'choosing' }
}
function beginOpening() {
  if (phase.value !== 'earth') return
  clearTimeout(earthTimer)
  playVideo()
}
function openingEnded() {
  clearTimers()
  video.value?.pause()
  phase.value = 'choosing'
}
function selectPlace(id: string) {
  const destination = props.locations.find((item) => item.id === id)
  if (!destination || phase.value !== 'choosing') return
  selected.value = destination
  if (!destination.destination_video_url) {
    emit('ready', destination.id)
    return
  }
  phase.value = 'destination'
  clearTimeout(timeout)
  void nextTick().then(() => {
    const playback = video.value?.play()
    playback?.catch(() => destinationEnded())
  })
}
function destinationEnded() {
  if (!selected.value) return
  clearTimers()
  video.value?.pause()
  emit('ready', selected.value.id)
}
function videoError() {
  if (phase.value === 'opening') openingEnded()
  else if (phase.value === 'destination') destinationEnded()
}
function skip() {
  if (phase.value === 'earth') beginOpening()
  else if (phase.value === 'opening') openingEnded()
  else if (phase.value === 'destination') destinationEnded()
}
onMounted(() => { earthTimer = setTimeout(beginOpening, 1200) })
onBeforeUnmount(clearTimers)
</script>
<template>
  <section class="entry-sequence intro-screen" :class="`entry-phase-${phase}`" aria-label="选择探索地点" :style="{ backgroundImage: `url(${background})` }">
    <video v-if="phase === 'opening' || phase === 'destination'" ref="video" :src="phase === 'opening' ? openingVideoUrl : assetUrl(selected?.destination_video_url ?? '')" preload="metadata" muted playsinline autoplay @ended="phase === 'opening' ? openingEnded() : destinationEnded()" @error="videoError" />
    <LocationSelector v-if="phase === 'choosing'" :locations="locations" :selected-id="selected?.id ?? ''" @select="selectPlace" />
    <div v-if="phase === 'opening' || phase === 'destination'" class="entry-skip-wrap">
      <span v-if="selected" class="entry-destination-label">正在前往 {{ selected.name }}</span>
      <button class="skip-intro" @click="skip">跳过视频 →</button>
    </div>
    <button v-else-if="phase === 'earth'" class="skip-intro" @click="skip">跳过地球动画 →</button>
  </section>
</template>
