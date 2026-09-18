<script setup lang="ts">
import { ref, watch } from 'vue'
import AppIcon from './AppIcon.vue'
import type { ClickPoint, hotspot } from '@/types/game'
import { useSceneManager } from '@/composables/SceneManager'
import { useGameUI } from '@/composables/GameUI'
import { usePlugin } from '@/composables/usePlugin'
import { usePluginUtilsStore } from '@/stores/pluginUtils'
import {
  normalizePluginReference,
  type LoadedUIPlugin,
  type PluginReference,
  type PluginType,
} from '@/plugin/plugins'

const props = withDefaults(
  defineProps<{
    url: string
    ultravioletUrl?: string
    hotspots?: hotspot[]
    clickPoints?: ClickPoint[]
    ultraviolet?: boolean
    uiPlugins?: PluginReference<'UI'>[]
    renderPlugins?: PluginReference<'Renderer'>[]
  }>(),
  {
    ultravioletUrl: '',
    hotspots: () => [],
    clickPoints: () => [],
    ultraviolet: false,
    uiPlugins: () => [],
    renderPlugins: () => [],
  },
)
const emit = defineEmits<{
  clue: [index: number]
  discover: [index: number]
  'ui-plugins': [plugins: LoadedUIPlugin[]]
}>()
const host = ref<HTMLDivElement | null>(null)
const pluginEngine = usePlugin()
const pluginUtils = usePluginUtilsStore()
const activePlugins: { name: string; type: PluginType }[] = []
const loadedUiPlugins = ref<LoadedUIPlugin[]>([])
let contextReady = false
const scene = useSceneManager({
  host,
  getUrl: () => props.url,
  getUltravioletUrl: () => props.ultravioletUrl,
  isUltraviolet: () => props.ultraviolet,
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
function createSceneContext(): void {
  pluginUtils.set_ctx({
    renderer: scene.getRenderer(),
    cssRenderer: scene.getCssRenderer(),
    camera: scene.getCamera(),
    scene: scene.getScene(),
    sphere: scene.getSphere(),
    material: scene.getMaterial(),
    composer: scene.getComposer(),
    uvPass: scene.getUvPass(),
    hotspotGroup: scene.getHotspotGroup(),
    schedule: scene.schedule,
    resetView: () => {
      scene.fov.value = 70
      scene.longitude.value = 0
      scene.latitude.value = 0
      scene.schedule()
    },
  })
  contextReady = true
}
function disposePlugins(disposeContext = false): void {
  pluginEngine.dispose()
  activePlugins.length = 0
  loadedUiPlugins.value = []
  emit('ui-plugins', [])
  if (disposeContext) {
    pluginUtils.dispose_all()
    contextReady = false
  }
}
function loadPlugins(): void {
  disposePlugins()
  if (!contextReady) createSceneContext()
  const load = (reference: PluginReference, type: PluginType): void => {
    const { name, options } = normalizePluginReference(reference)
    if (!pluginEngine.load(name, type, options)) return
    activePlugins.push({ name, type })
  }
  props.renderPlugins.forEach((reference) => load(reference, 'Renderer'))
  props.uiPlugins.forEach((reference) => load(reference, 'UI'))
  loadedUiPlugins.value = [...pluginUtils.getUIPlugins()]
  emit('ui-plugins', loadedUiPlugins.value)
}
scene.rebuildHooks({ onInitialize: loadPlugins, onDispose: () => disposePlugins(true) })
const { status, hasTexture, renderedUltraviolet, retry } = scene
const { fov, down, move, up, cancel, zoom, key } = ui
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
watch(
  () => [props.uiPlugins, props.renderPlugins],
  () => {
    if (scene.getRenderer()) loadPlugins()
  },
  { deep: true },
)
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
  </div>
</template>
