<script setup lang="ts">
import { useEventStore } from '@/stores/event'

const props = defineProps<{ name: string; options: { label?: string } }>()
const events = useEventStore()
function reset(): void {
  events.createEvent('reset', props.name)()
}
</script>
<template>
  <button class="outline-button" @click="reset">{{ options.label ?? '恢复初始视角' }}</button>
</template>
