<script setup lang="ts">
import { computed } from 'vue'
import { useRoute } from 'vue-router'
import BingMaYongView from './BingMaYongView.vue'
import DunHuangHome from './DunHuangHome.vue'

const route = useRoute()
const page = computed(() => route.params.place === 'yungang' ? BingMaYongView : DunHuangHome)
</script>

<template><component :is="page" /></template>
