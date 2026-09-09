<script setup lang="ts">
import {onBeforeUnmount, watch} from 'vue'
import {useRoute} from 'vue-router'
import {useGameStore} from '@/stores/game'

const game = useGameStore()
const route = useRoute()
game.restore()

function save() {
  game.pauseTimer();
  game.persist()
}

function resume() {
  if (route.meta.section === 'game' && !document.hidden && game.hasProgress && !game.completed) game.resumeTimer()
}

function visibility() {
  if (document.hidden) save(); else resume()
}

function syncTimer() {
  if (route.meta.section !== 'game') save(); else resume()
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
watch(() => route.meta.section, syncTimer)
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
  <div v-if="game.persistenceError" class="persistence-error" role="alert"><span>{{ game.persistenceError }}</span>
    <button @click="game.persist()">重试保存</button>
    <button @click="restoreProgress">重新读取</button>
  </div>
</template>
