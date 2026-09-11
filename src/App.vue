<script setup lang="ts">
import { computed, onBeforeUnmount, provide, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import IntroSequence from '@/components/IntroSequence.vue'
import { gameLocations, siteConfig } from '@/data/game'
import { useGameStore } from '@/stores/game'

const game = useGameStore()
const route = useRoute()
const activeLocation = computed(() => gameLocations.find(location => location.id === route.params.place) ?? gameLocations[0])
const introActive = ref(false)
let introInitialized = false
function initializeIntro(): void {
  if (introInitialized || route.matched.length === 0) return
  introInitialized = true
  introActive.value = Boolean(activeLocation.value?.intro_video_url)
}
function finishIntro(): void {
  introActive.value = false
  if (route.meta.section === 'game' && !document.hidden && game.hasProgress && !game.completed) game.resumeTimer()
}
provide('routeIntroActive', introActive)
game.restore()

function save() {
  game.pauseTimer();
  game.persist()
}

function resume() {
  if (!introActive.value && route.meta.section === 'game' && !document.hidden && game.hasProgress && !game.completed) game.resumeTimer()
}

function visibility() {
  if (document.hidden) save(); else resume()
}

function syncTimer() {
  if (route.meta.section !== 'game' || introActive.value) save(); else resume()
}

function restoreProgress() {
  game.restore();
  resume()
}

window.addEventListener('pagehide', save)
window.addEventListener('beforeunload', save)
window.addEventListener('pageshow', resume)
document.addEventListener('visibilitychange', visibility)
const timer = setInterval(() => game.tick(), 1000)
const backup = setInterval(() => game.persist(), 15000)
watch(() => [route.fullPath, route.matched.length], () => { initializeIntro(); syncTimer() }, { immediate: true })
watch(introActive, syncTimer)
onBeforeUnmount(() => {
  save();
  clearInterval(timer);
  clearInterval(backup);
  window.removeEventListener('pagehide', save);
  window.removeEventListener('beforeunload', save);
  window.removeEventListener('pageshow', resume);
  document.removeEventListener('visibilitychange', visibility)
})
</script>
<template>
  <RouterView/>
  <IntroSequence
    v-if="introActive"
    :key="activeLocation?.id ?? 'dunhuang'"
    :location-id="activeLocation?.id ?? 'dunhuang'"
    :location-name="activeLocation?.name ?? siteConfig.title"
    :video-url="activeLocation?.intro_video_url"
    :remember-completion="true"
    @ready="finishIntro"
  />
  <div v-if="game.persistenceError" class="persistence-error" role="alert"><span>{{ game.persistenceError }}</span>
    <button @click="game.persist()">重试保存</button>
    <button @click="restoreProgress">重新读取</button>
  </div>
</template>
