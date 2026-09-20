<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import AppIcon from './AppIcon.vue'
import type { ClickPoint, hotspot, PanoramaInitialView } from '@/types/game'
import { useSceneManager } from '@/composables/SceneManager'
import { useGameUI } from '@/composables/GameUI'
import { DEFAULT_PANORAMA_FOV } from '@/utils/panorama'

const props = withDefaults(
  defineProps<{
    url: string
    ultravioletUrl?: string
    hotspots?: hotspot[]
    clickPoints?: ClickPoint[]
    ultraviolet?: boolean
    initialView?: PanoramaInitialView
  }>(),
  { ultravioletUrl: '', hotspots: () => [], clickPoints: () => [], ultraviolet: false },
)
const emit = defineEmits<{
  clue: [index: number]
  discover: [index: number]
  'uv-error': []
  capture: [dataUrl: string]
}>()
const host = ref<HTMLDivElement | null>(null)
const scene = useSceneManager({
  host,
  getUrl: () => props.url,
  getUltravioletUrl: () => props.ultravioletUrl,
  isUltraviolet: () => props.ultraviolet,
  onUltravioletError: () => emit('uv-error'),
})
const ui = useGameUI({
  host,
  scene,
  getHotspots: () => props.hotspots,
  getClickPoints: () => props.clickPoints,
  isUltraviolet: () => props.ultraviolet,
  onClue: (index) => emit('clue', index),
  onDiscover: (index) => emit('discover', index),
})
const { status, hasTexture, renderedUltraviolet, retry } = scene
const { fov, projected, down, move, up, cancel, zoom, key } = ui
const captureNotice = ref('')
let captureNoticeTimer: number | undefined
const applyInitialView = () => {
  scene.longitude.value = props.initialView?.longitude ?? 0
  scene.latitude.value = props.initialView?.latitude ?? 0
  scene.fov.value = props.initialView?.fov ?? DEFAULT_PANORAMA_FOV
  scene.schedule()
}
applyInitialView()
watch(
  () =>
    [
      props.url,
      props.initialView?.longitude,
      props.initialView?.latitude,
      props.initialView?.fov,
    ] as const,
  applyInitialView,
)
watch(
  () => [props.url, props.ultravioletUrl, props.ultraviolet] as const,
  () => {
    if (scene.getRenderer()) scene.loadTexture()
  },
)
watch(
  () => props.hotspots,
  () => {
    ui.rebuildHotspots()
    scene.schedule()
  },
  { deep: true },
)
function captureCurrentFrame(): void {
  const dataUrl = scene.captureFrame?.()
  if (!dataUrl) {
    captureNotice.value = '当前画面暂不可保存'
  } else {
    emit('capture', dataUrl)
    const link = document.createElement('a')
    link.href = dataUrl
    link.download = `全景当前帧-${new Date().toISOString().slice(0, 10)}.png`
    link.click()
    captureNotice.value = '当前帧已保存'
  }
  if (captureNoticeTimer !== undefined) window.clearTimeout(captureNoticeTimer)
  captureNoticeTimer = window.setTimeout(() => {
    captureNotice.value = ''
    captureNoticeTimer = undefined
  }, 2200)
}
onBeforeUnmount(() => {
  if (captureNoticeTimer !== undefined) window.clearTimeout(captureNoticeTimer)
})
</script>
<template>
  <div class="panorama-wrap">
    <div
      ref="host"
      class="panorama"
      tabindex="0"
      role="application"
      aria-label="全景视图：拖动旋转，点击寻找隐藏信息，滚轮或双指缩放，也可使用方向键和加减键"
      :data-fov="Math.round(fov)"
      :data-ultraviolet-pass="renderedUltraviolet ? 'active' : 'inactive'"
      @pointerdown="down"
      @pointermove="move"
      @pointerup="up"
      @pointercancel="cancel"
      @lostpointercapture="cancel"
      @wheel.prevent="zoom($event.deltaY * 0.035)"
      @keydown="key"
    />
    <Transition name="fade"
      ><div v-if="status === 'loading' && hasTexture" class="panorama-transition" role="status">
        <AppIcon name="compass" class="spinning" /><span>正在切换画境</span>
      </div></Transition
    >
    <div
      v-if="status === 'error' || (status === 'loading' && !hasTexture)"
      class="panorama-status surface"
      role="status"
    >
      <AppIcon name="compass" :class="{ spinning: status === 'loading' }" />
      <h2>{{ status === 'loading' ? '正在走入洞窟…' : '全景暂时无法加载' }}</h2>
      <p v-if="status === 'error'">请检查图片地址、网络与浏览器 WebGL 支持。</p>
      <button v-if="status === 'error'" class="primary" @click="retry">重新加载全景</button>
    </div>
    <div class="zoom-controls" @pointerdown.stop @wheel.stop>
      <button aria-label="放大全景" @click="zoom(-5)">＋</button><span>{{ Math.round(fov) }}°</span
      ><button aria-label="缩小全景" @click="zoom(5)">−</button>
    </div>
    <div class="panorama-capture-controls" @pointerdown.stop @wheel.stop>
      <button
        class="icon-button"
        type="button"
        aria-label="截取当前画面作为明信片图片"
        title="截取当前画面作为明信片图片"
        @click="captureCurrentFrame"
      >
        <AppIcon name="camera" />
      </button>
      <span v-if="captureNotice" class="panorama-capture-status" role="status">{{
        captureNotice
      }}</span>
    </div>
  </div>
</template>
