<script setup lang="ts">
import { onBeforeUnmount, provide, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import EntrySequence from '@/components/EntrySequence.vue'
import { gameLocations } from '@/data/game'
import { useGameStore } from '@/stores/game'

const game = useGameStore()
const route = useRoute()
const router = useRouter()
const entryActive = ref(false)
let entryInitialized = false
function initializeEntry(): void {
  if (route.matched.length === 0) return
  if (!entryInitialized) {
    entryInitialized = true
    entryActive.value = route.meta.section === 'home'
  } else if (route.meta.section !== 'home') {
    entryActive.value = false
  }
}
function finishEntry(placeId: string): void {
  entryActive.value = false
  void router.replace(`/${placeId}/home`)
}
provide('routeIntroActive', entryActive)
game.restore()

function save() {
  game.pauseTimer();
  game.persist()
}

function resume() {
  if (!entryActive.value && route.meta.section === 'game' && !document.hidden && game.hasProgress && !game.completed) game.resumeTimer()
}

function visibility() {
  if (document.hidden) save(); else resume()
}

function syncTimer() {
  if (route.meta.section !== 'game' || entryActive.value) save(); else resume()
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
watch(() => [route.fullPath, route.matched.length], () => { initializeEntry(); syncTimer() }, { immediate: true })
watch(entryActive, syncTimer)
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
  <EntrySequence v-if="entryActive" :locations="gameLocations" @ready="finishEntry" />
  <div v-if="game.persistenceError" class="persistence-error" role="alert"><span>{{ game.persistenceError }}</span>
    <button @click="game.persist()">重试保存</button>
    <button @click="restoreProgress">重新读取</button>
  </div>
</template>
