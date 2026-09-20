<script setup lang="ts">
import { useRouter } from 'vue-router'
import { gameLocations } from '@/data/game'
import LocationSelector from '@/components/LocationSelector.vue'

const router = useRouter()

function select(id: string): void {
  if (id === 'story-studio') {
    void router.push('/studio')
    return
  }
  void router.push(`/${id}/home`)
}
</script>

<template>
  <main class="location-select-page intro-screen" aria-label="选择探索地点">
    <LocationSelector :locations="gameLocations" selected-id="" @select="select" />
  </main>
</template>
