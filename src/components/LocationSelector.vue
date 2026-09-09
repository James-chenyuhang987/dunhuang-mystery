<script setup lang="ts">
import type { location } from '@/types/game'

defineProps<{ locations: location[]; selectedId: string }>()
const emit = defineEmits<{ select: [id: string] }>()
</script>

<template>
  <section class="location-selector" aria-labelledby="location-title">
    <div class="location-space" aria-hidden="true"><span v-for="star in 18" :key="star" :style="{ left: `${(star * 37) % 97}%`, top: `${(star * 53) % 91}%` }" /></div>
    <div class="location-globe" aria-hidden="true">
      <span class="globe-grid horizontal"/><span class="globe-grid vertical"/>
      <span class="globe-land land-west"/><span class="globe-land land-east"/>
      <span class="globe-pulse pulse-one"/><span class="globe-pulse pulse-two"/>
    </div>
    <div class="location-copy">
      <p class="eyebrow">SELECT YOUR DESTINATION</p>
      <h2 id="location-title">选择探索地点</h2>
      <p>地球缓缓停驻于两处文明坐标，选择一处进入对应画境。</p>
    </div>
    <div class="location-options">
      <button v-for="(location, index) in locations" :key="location.id" class="location-option" :class="{ selected: selectedId === location.id }" @click="emit('select', location.id)">
        <span class="location-index">{{ String(index + 1).padStart(2, '0') }}</span>
        <span><strong>{{ location.name }}</strong><small>{{ location.subtitle }}</small><small>{{ location.coordinates }}</small></span>
        <span class="location-arrow">进入 →</span>
      </button>
    </div>
  </section>
</template>
