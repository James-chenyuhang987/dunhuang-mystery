<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import type { clue, DialogueNode } from '@/types/game'
import { assetUrl } from '@/utils/assets'

const props = defineProps<{ item: clue }>()
const emit = defineEmits<{ close: [] }>()
const nodeId = ref('')
const definition = computed(() => props.item.dialogue)
const node = computed<DialogueNode | null>(() => {
  const entry = definition.value?.nodes.find((candidate) => candidate.id === nodeId.value)
  return entry ?? null
})
const hasOptions = computed(() => (node.value?.options?.length ?? 0) > 0)

function reset() {
  nodeId.value = definition.value?.start ?? ''
}
function choose(next: string | null) {
  if (next === null) {
    emit('close')
    return
  }
  nodeId.value = next
}
function advance() {
  if (node.value?.next) nodeId.value = node.value.next
  else emit('close')
}
function advanceFromBubble(event: MouseEvent): void {
  if (hasOptions.value || (event.target as HTMLElement).closest('button')) return
  advance()
}
function advanceFromKeyboard(event: KeyboardEvent): void {
  if (hasOptions.value) return
  event.preventDefault()
  advance()
}
function advanceFromStage(event: MouseEvent): void {
  if (hasOptions.value || (event.target as HTMLElement).closest('button')) return
  advance()
}
watch(() => props.item, reset, { immediate: true })
</script>

<template>
  <Transition name="dialogue-fade">
    <div
      v-if="node"
      class="dialogue-overlay"
      role="dialog"
      aria-modal="true"
      :aria-label="item.name"
      @click="advanceFromStage"
    >
      <button class="dialogue-backdrop" aria-label="关闭对话" @click="emit('close')" />
      <div class="dialogue-overlay-content" @pointerdown.stop @wheel.stop>
        <button class="dialogue-close icon-button" aria-label="关闭对话" @click="emit('close')">
          ×
        </button>
        <div class="dialogue-character" :class="{ placeholder: !node.avatar }">
          <img v-if="node.avatar" :src="assetUrl(node.avatar)" :alt="node.speaker" />
          <span v-else aria-hidden="true">{{ node.speaker.slice(0, 1) }}</span>
        </div>
        <div
          class="dialogue-bubble"
          :class="{ 'is-clickable': !hasOptions }"
          :tabindex="hasOptions ? undefined : 0"
          :aria-label="hasOptions ? undefined : '继续对话'"
          @keydown.enter="advanceFromKeyboard"
          @keydown.space="advanceFromKeyboard"
        >
          <p class="dialogue-speaker">{{ node.speaker }}</p>
          <p class="dialogue-text" aria-live="polite">{{ node.text }}</p>
          <div v-if="hasOptions" class="dialogue-overlay-options">
            <button
              v-for="option in node.options"
              :key="`${node.id}-${option.label}`"
              class="dialogue-overlay-option"
              @click.stop="choose(option.next)"
            >
              {{ option.label }}
            </button>
          </div>
          <button v-else class="dialogue-continue" @click.stop="advance">
            {{ node.next ? '继续' : '结束对话' }} <span>›</span>
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>
