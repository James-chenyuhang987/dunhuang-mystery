<script setup lang="ts">
import { computed } from 'vue'
import { useGameStore } from '@/stores/game'
import type { Difficulty } from '@/types/game'
import AppIcon from '@/components/AppIcon.vue'

const props = withDefaults(defineProps<{ levelIndex: number; editable?: boolean }>(), { editable: true })
const game = useGameStore()
const tiers: { label: string; value: Difficulty }[] = [{ label: '初探', value: 1 }, { label: '寻踪', value: 2 }, { label: '解谜', value: 3 }]
const total = computed(() => game.levels[props.levelIndex]?.problems.length ?? 0)

function count(value: Difficulty): number {
  return value === 1 ? Math.min(1, total.value) : value === 2 ? Math.ceil(total.value / 2) : total.value
}

function change(event: Event): void {
  if (!props.editable) return
  const target = event.target
  if (!(target instanceof HTMLInputElement)) return
  const value = Number(target.value)
  if (value === 1 || value === 2 || value === 3) game.setDifficulty(value)
}

function selectTier(value: Difficulty): void {
  if (props.editable) game.setDifficulty(value)
}
</script>

<template>
  <div class="difficulty-control" :class="{ readonly: !editable }">
    <div class="field-heading">
      <span class="difficulty-label">探索难度<span v-if="!editable" class="difficulty-lock"><AppIcon name="lock" />已锁定</span></span>
      <output class="tiny" aria-live="polite">本关需答 {{ count(game.difficulty) }} / {{ total }} 题</output>
    </div>
    <input
      aria-label="探索难度"
      type="range"
      min="1"
      max="3"
      step="1"
      :value="game.difficulty"
      :disabled="!editable"
      :aria-valuetext="`${tiers[game.difficulty - 1]?.label}，${count(game.difficulty)}题`"
      @input="change"
      @change="change"
    >
    <div class="range-labels">
      <button
        v-for="tier in tiers"
        :key="tier.value"
        :class="{ active: game.difficulty === tier.value }"
        :aria-pressed="game.difficulty === tier.value"
        :disabled="!editable"
        @click="selectTier(tier.value)"
      >
        {{ tier.label }}<small>{{ count(tier.value) }} 题</small>
      </button>
    </div>
  </div>
</template>
