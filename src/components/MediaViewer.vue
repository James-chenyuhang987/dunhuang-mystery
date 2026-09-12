<script setup lang="ts">
import { computed, onBeforeUnmount, ref } from 'vue'
import type { clue } from '@/types/game'
import { assetUrl } from '@/utils/assets'
import AppIcon from './AppIcon.vue'
const props = defineProps<{ item: clue }>()
const dialog = ref<HTMLDialogElement | null>(null)
const stage = ref<HTMLDivElement | null>(null)
const video = ref<HTMLVideoElement | null>(null)
const visible = ref(false)
const failed = ref(false)
const revision = ref(0)
const scale = ref(1)
const offset = ref({ x: 0, y: 0 })
const transform = computed(() => ({ transform: `translate(${offset.value.x}px, ${offset.value.y}px) scale(${scale.value})` }))
const pointers = new Map<number, { x: number; y: number }>()
let timeout: ReturnType<typeof setTimeout> | undefined
function loaded() { clearTimeout(timeout) }
function fail() { loaded(); failed.value = true }
function deadline() { loaded(); timeout = setTimeout(fail, 30000) }
function reset() { scale.value = 1; offset.value = { x: 0, y: 0 }; pointers.clear() }
function zoom(value: number) { scale.value = Math.min(5, Math.max(1, value)); if (scale.value === 1) offset.value = { x: 0, y: 0 } }
function open() { reset(); failed.value = false; visible.value = true; dialog.value?.showModal(); deadline() }
function closed() { loaded(); video.value?.pause(); visible.value = false; pointers.clear() }
async function close() {
  if (document.fullscreenElement === dialog.value) { try { await document.exitFullscreen() } catch { /* The dialog can still close if browser fullscreen is unavailable. */ } }
  dialog.value?.close(); closed()
}
async function fullscreen() {
  try {
    if (document.fullscreenElement === dialog.value) await document.exitFullscreen()
    else await dialog.value?.requestFullscreen?.()
  } catch { /* The viewport-filling dialog remains available on unsupported devices. */ }
}
function retry() { failed.value = false; revision.value++; deadline() }
function distance() { const [a, b] = [...pointers.values()]; return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0 }
function down(event: PointerEvent) {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  if (event.target instanceof HTMLVideoElement && event.clientY > event.target.getBoundingClientRect().bottom - 60) return
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
  try { stage.value?.setPointerCapture(event.pointerId) } catch { /* Synthetic or cancelled pointer. */ }
}
function move(event: PointerEvent) {
  const previous = pointers.get(event.pointerId)
  if (!previous) return
  const before = distance()
  if (pointers.size === 1 && scale.value > 1) {
    const boundX = (stage.value?.clientWidth ?? 0) * (scale.value - 1) / 2
    const boundY = (stage.value?.clientHeight ?? 0) * (scale.value - 1) / 2
    offset.value = { x: Math.max(-boundX, Math.min(boundX, offset.value.x + event.clientX - previous.x)), y: Math.max(-boundY, Math.min(boundY, offset.value.y + event.clientY - previous.y)) }
  }
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
  if (pointers.size === 2 && before > 0) zoom(scale.value * distance() / before)
}
function up(event: PointerEvent) { pointers.delete(event.pointerId) }
onBeforeUnmount(() => { loaded(); video.value?.pause() })
defineExpose({ open })
</script>
<template>
  <Teleport to="body">
    <dialog ref="dialog" class="media-viewer" :aria-label="`${item.name} · 全屏查看`" @close="closed" @cancel.prevent="close" @pointerdown.stop @touchstart.stop @touchmove.stop @wheel.stop>
      <template v-if="visible">
        <header class="media-viewer-header"><h2>{{ item.name }}</h2><button class="outline-button" @click="fullscreen">切换设备全屏</button><button class="icon-button" aria-label="关闭全屏查看" @click="close"><AppIcon name="close"/></button></header>
        <div ref="stage" class="media-stage" :data-scale="scale.toFixed(2)" @pointerdown="down" @pointermove="move" @pointerup="up" @pointercancel="up" @lostpointercapture="up" @wheel.prevent="zoom(scale * Math.exp(-$event.deltaY * 0.002))" @dblclick="reset">
          <div v-if="failed" class="media-load-error" role="alert"><p>素材加载失败或超时。</p><button class="primary" @pointerdown.stop @click="retry">重新加载大图 / 视频</button></div>
          <img v-else-if="item.type === 'image'" :key="revision" class="media-content" :style="transform" :src="assetUrl(item.data)" :alt="item.name" draggable="false" @load="loaded" @error="fail">
          <video v-else-if="item.type === 'video'" ref="video" :key="`video-${revision}`" class="media-content" :style="transform" :src="assetUrl(item.data)" controls playsinline preload="metadata" @loadedmetadata="loaded" @playing="loaded" @waiting="deadline" @error="fail" />
        </div>
        <footer class="media-viewer-tools"><button class="outline-button" aria-label="缩小线索" :disabled="scale <= 1" @click="zoom(scale - 0.25)">−</button><output aria-live="polite">{{ Math.round(scale * 100) }}%</output><button class="outline-button" aria-label="放大线索" :disabled="scale >= 5" @click="zoom(scale + 0.25)">＋</button><button class="outline-button" @click="reset">重置视图</button><span>滚轮 / 双指缩放 · 放大后拖动</span></footer>
      </template>
    </dialog>
  </Teleport>
</template>
