<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import { gameLocations } from '@/data/game'
import PlaceHome from './PlaceHome.vue'

const route = useRoute()
const location = computed(
  () => gameLocations.find((entry) => entry.id === route.params.place) ?? gameLocations[0],
)
</script>

<template><PlaceHome v-if="location" :place-id="location.id" /></template>
