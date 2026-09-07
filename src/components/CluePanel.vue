<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import type { clue } from '@/types/game'
import AppIcon from './AppIcon.vue'
import MediaViewer from './MediaViewer.vue'
const viewer = ref<InstanceType<typeof MediaViewer> | null>(null)
const inlineVideo = ref<HTMLVideoElement | null>(null)
function expand() { inlineVideo.value?.pause(); viewer.value?.open() }
const props = defineProps<{ item: clue; index: number }>()
const open = ref(false)
const failed = ref(false)
const revision = ref(0)
let timeout: ReturnType<typeof setTimeout> | undefined
function loaded() { clearTimeout(timeout) }
function fail() { loaded(); failed.value = true }
function deadline() { loaded(); if (props.item.type !== 'text') timeout = setTimeout(fail, 30000) }
function retry() { failed.value = false; revision.value += 1; deadline() }
watch(open, value => { if (value) { failed.value = false; deadline() } else loaded() })
onBeforeUnmount(loaded)
</script>
<template>
  <div class="clue-panel" @pointerdown.stop @pointermove.stop @pointerup.stop @touchstart.stop @touchmove.stop @wheel.stop>
    <button class="clue-toggle" :aria-expanded="open" :aria-controls="`clue-${index}`" @click="open = !open"><span class="clue-number">0{{ index + 1 }}</span><AppIcon :name="item.type === 'audio' ? 'sound' : item.type === 'text' ? 'book' : 'eye'"/><span>{{ item.name }}</span><span class="clue-sign">{{ open ? '−' : '＋' }}</span></button>
    <div v-if="open" :id="`clue-${index}`" class="clue-body">
      <p v-if="item.type === 'text'">{{ item.data }}</p>
      <div v-else-if="failed" role="alert"><p>这条线索加载失败。</p><button class="outline-button" @click="retry">重新加载线索</button></div>
      <img v-else-if="item.type === 'image'" :key="`image-${revision}`" :src="item.data" :alt="item.name" @load="loaded" @error="fail" @click="expand">
      <audio v-else-if="item.type === 'audio'" :key="`audio-${revision}`" :src="item.data" controls preload="metadata" @loadedmetadata="loaded" @playing="loaded" @waiting="deadline" @error="fail" />
      <video v-else ref="inlineVideo" :key="`video-${revision}`" :src="item.data" controls playsinline preload="metadata" @loadedmetadata="loaded" @playing="loaded" @waiting="deadline" @error="fail" />
      <button v-if="!failed && (item.type === 'image' || item.type === 'video')" class="outline-button expand-clue" @click="expand"><AppIcon name="expand"/>全屏查看与缩放</button>
    </div>
    <MediaViewer v-if="item.type === 'image' || item.type === 'video'" ref="viewer" :item="item"/>
  </div>
</template>
