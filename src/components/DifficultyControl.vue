<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import type { Difficulty } from '@/types/game'
const props = defineProps<{ levelIndex: number }>()
const game = useGameStore()
const tiers: { label: string; value: Difficulty }[] = [{ label: '初探', value: 1 }, { label: '寻踪', value: 2 }, { label: '解谜', value: 3 }]
const total = computed(() => game.levels[props.levelIndex]?.problems.length ?? 0)
function count(value: Difficulty) { return value === 1 ? Math.min(1, total.value) : value === 2 ? Math.ceil(total.value / 2) : total.value }
function change(event: Event) { const target = event.target; if (target instanceof HTMLInputElement) { const value = Number(target.value); if (value === 1 || value === 2 || value === 3) game.setDifficulty(value) } }
</script>
<template><div class="difficulty-control"><div class="field-heading"><span>探索难度</span><output class="tiny" aria-live="polite">本关需答 {{ count(game.difficulty) }} / {{ total }} 题</output></div><input aria-label="探索难度" type="range" min="1" max="3" step="1" :value="game.difficulty" :aria-valuetext="`${tiers[game.difficulty - 1]?.label}，${count(game.difficulty)}题`" @input="change" @change="change"><div class="range-labels"><button v-for="tier in tiers" :key="tier.value" :class="{ active: game.difficulty === tier.value }" :aria-pressed="game.difficulty === tier.value" @click="game.setDifficulty(tier.value)">{{ tier.label }}<small>{{ count(tier.value) }} 题</small></button></div></div></template>
