<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { clue, DialogueNode } from '@/types/game'
import { assetUrl } from '@/utils/assets'

const props = defineProps<{ item: clue }>()
const emit = defineEmits<{
  start: [item: clue]
  'dialogue-start': [item: clue]
}>()
const started = ref(false)
const nodeId = ref('')
const definition = computed(() => props.item.dialogue)
const node = computed<DialogueNode | null>(() => {
  const entry = definition.value?.nodes.find((candidate) => candidate.id === nodeId.value)
  return entry ?? null
})
const hasChoices = computed(() => (node.value?.options?.length ?? 0) > 0)

function start() {
  if (!definition.value) return
  nodeId.value = definition.value.start
  started.value = true
  emit('start', props.item)
  emit('dialogue-start', props.item)
}
function choose(next: string | null) {
  if (next === null) {
    started.value = false
    return
  }
  nodeId.value = next
}
function continueNode() {
  if (node.value?.next) nodeId.value = node.value.next
  else started.value = false
}
function advanceFromStage(event: MouseEvent): void {
  if (hasChoices.value || (event.target as HTMLElement).closest('button')) return
  continueNode()
}
function advanceFromKeyboard(event: KeyboardEvent): void {
  if (hasChoices.value) return
  event.preventDefault()
  continueNode()
}
watch(
  () => props.item.dialogue,
  () => {
    started.value = false
    nodeId.value = ''
  },
)
</script>

<template>
  <div class="dialogue-clue" @pointerdown.stop @pointermove.stop @pointerup.stop @wheel.stop>
    <div v-if="!started" class="dialogue-intro">
      <p class="eyebrow">CHARACTER CLUE · 人物线索</p>
      <p>{{ item.data || '一段等待你聆听的对话。' }}</p>
      <button class="primary" @click="start">开始对话</button>
    </div>
    <div
      v-else-if="node"
      class="dialogue-stage"
      :class="{ 'is-clickable': !hasChoices }"
      :tabindex="hasChoices ? undefined : 0"
      :aria-label="hasChoices ? undefined : '继续对话'"
      @click="advanceFromStage"
      @keydown.enter="advanceFromKeyboard"
      @keydown.space="advanceFromKeyboard"
    >
      <div class="dialogue-portrait" :class="{ placeholder: !node.avatar }">
        <img v-if="node.avatar" :src="assetUrl(node.avatar)" :alt="node.speaker" />
        <span v-else aria-hidden="true">{{ node.speaker.slice(0, 1) }}</span>
      </div>
      <div class="dialogue-copy">
        <strong>{{ node.speaker }}</strong>
        <p>{{ node.text }}</p>
        <div v-if="hasChoices" class="dialogue-options">
          <button
            v-for="option in node.options"
            :key="`${node.id}-${option.label}`"
            class="dialogue-option"
            @click="choose(option.next)"
          >
            {{ option.label }}
          </button>
        </div>
        <button v-else class="outline-button dialogue-next" @click="continueNode">
          {{ node.next ? '继续' : '结束对话' }} →
        </button>
      </div>
    </div>
    <p v-else class="muted">对话内容暂不可用。</p>
  </div>
</template>
