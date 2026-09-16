<script setup lang="ts">
import { ref, watch } from 'vue'
import AppIcon from './AppIcon.vue'
import type { ClickPoint, hotspot } from '@/types/game'
import { useSceneManager } from '@/composables/SceneManager'
import { useGameUI } from '@/composables/GameUI'

const props = withDefaults(defineProps<{
  url: string
  ultravioletUrl?: string
  hotspots?: hotspot[]
  clickPoints?: ClickPoint[]
  ultraviolet?: boolean
}>(), { ultravioletUrl: '', hotspots: () => [], clickPoints: () => [], ultraviolet: false })
const emit = defineEmits<{ clue: [index: number]; discover: [index: number] }>()
const host = ref<HTMLDivElement | null>(null)
const scene = useSceneManager({ host, getUrl: () => props.url, getUltravioletUrl: () => props.ultravioletUrl, isUltraviolet: () => props.ultraviolet })
const ui = useGameUI({ host, scene, getHotspots: () => props.hotspots, getClickPoints: () => props.clickPoints, isUltraviolet: () => props.ultraviolet, onClue: index => emit('clue', index), onDiscover: index => emit('discover', index) })
const { status, hasTexture, renderedUltraviolet, retry } = scene
const { fov, projected, down, move, up, cancel, zoom, key } = ui
watch(() => [props.url, props.ultravioletUrl, props.ultraviolet] as const, () => { if (scene.getRenderer()) scene.loadTexture() })
watch(() => props.hotspots, () => { ui.rebuildHotspots(); scene.schedule() }, { deep: true })
</script>
<template>
  <div class="panorama-wrap">
    <div ref="host" class="panorama" tabindex="0" role="application" aria-label="全景视图：拖动旋转，点击寻找隐藏信息，滚轮或双指缩放，也可使用方向键和加减键" :data-fov="Math.round(fov)" :data-ultraviolet-pass="renderedUltraviolet ? 'active' : 'inactive'" @pointerdown="down" @pointermove="move" @pointerup="up" @pointercancel="cancel" @lostpointercapture="cancel" @wheel.prevent="zoom($event.deltaY * 0.035)" @keydown="key" />
    <Transition name="fade"><div v-if="status === 'loading' && hasTexture" class="panorama-transition" role="status"><AppIcon name="compass" class="spinning"/><span>正在切换画境</span></div></Transition>
    <div v-if="status === 'error' || (status === 'loading' && !hasTexture)" class="panorama-status surface" role="status">
      <AppIcon name="compass" :class="{ spinning: status === 'loading' }" />
      <h2>{{ status === 'loading' ? '正在走入洞窟…' : '全景暂时无法加载' }}</h2>
      <p v-if="status === 'error'">请检查图片地址、网络与浏览器 WebGL 支持。</p>
      <button v-if="status === 'error'" class="primary" @click="retry">重新加载全景</button>
    </div>
    <div class="zoom-controls" @pointerdown.stop @wheel.stop>
      <button aria-label="放大全景" @click="zoom(-5)">＋</button><span>{{ Math.round(fov) }}°</span><button aria-label="缩小全景" @click="zoom(5)">−</button>
    </div>
  </div>
</template>
