<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as THREE from 'three'
import AppIcon from './AppIcon.vue'
const props = defineProps<{ url: string }>()
const host = ref<HTMLDivElement | null>(null)
const status = ref<'loading' | 'ready' | 'error'>('loading')
const fov = ref(70)
let renderer: THREE.WebGLRenderer | undefined
let camera: THREE.PerspectiveCamera | undefined
let scene: THREE.Scene | undefined
let material: THREE.MeshBasicMaterial | undefined
let geometry: THREE.SphereGeometry | undefined
let observer: ResizeObserver | undefined
let requestId = 0
let loadId = 0
let longitude = 0
let latitude = 0
let timeout: ReturnType<typeof setTimeout> | undefined
const pointers = new Map<number, { x: number; y: number }>()
function render() {
  if (!renderer || !camera || !scene) return
  const phi = THREE.MathUtils.degToRad(90 - latitude)
  const theta = THREE.MathUtils.degToRad(longitude)
  camera.lookAt(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta))
  camera.fov = fov.value
  camera.updateProjectionMatrix()
  renderer.render(scene, camera)
}
function schedule() { cancelAnimationFrame(requestId); requestId = requestAnimationFrame(render) }
function resize() {
  if (!host.value || !renderer || !camera) return
  const { clientWidth: width, clientHeight: height } = host.value
  if (!width || !height) return
  renderer.setSize(width, height)
  camera.aspect = width / height
  schedule()
}
function onLost(event: Event) { event.preventDefault(); status.value = 'error' }
function dispose() {
  observer?.disconnect()
  renderer?.domElement.removeEventListener('webglcontextlost', onLost)
  material?.map?.dispose(); material?.dispose(); geometry?.dispose(); renderer?.dispose()
  renderer?.domElement.remove()
  renderer = undefined
}
function load() {
  const id = ++loadId
  clearTimeout(timeout)
  cancelAnimationFrame(requestId)
  pointers.clear()
  dispose()
  status.value = 'loading'
  longitude = 0; latitude = 0; fov.value = 70
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.domElement.addEventListener('webglcontextlost', onLost)
    host.value?.append(renderer.domElement)
    scene = new THREE.Scene()
    camera = new THREE.PerspectiveCamera(70, 1, 0.1, 100)
    geometry = new THREE.SphereGeometry(10, 64, 32)
    geometry.scale(-1, 1, 1)
    material = new THREE.MeshBasicMaterial({ color: '#b9a47c' })
    scene.add(new THREE.Mesh(geometry, material))
    observer = new ResizeObserver(resize)
    if (host.value) observer.observe(host.value)
    resize()
    timeout = setTimeout(() => { if (id === loadId) { ++loadId; status.value = 'error' } }, 30000)
    new THREE.TextureLoader().load(props.url, (texture) => {
      if (id !== loadId || !material) { texture.dispose(); return }
      clearTimeout(timeout)
      texture.colorSpace = THREE.SRGBColorSpace
      material.map = texture; material.color.set('#ffffff'); material.needsUpdate = true
      status.value = 'ready'; schedule()
    }, undefined, () => { if (id === loadId) { clearTimeout(timeout); status.value = 'error' } })
  } catch { status.value = 'error' }
}
function down(event: PointerEvent) {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  try { host.value?.setPointerCapture(event.pointerId) } catch { /* A pointer may already be cancelled by the browser. */ }
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
}
function distance() { const [a, b] = [...pointers.values()]; return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0 }
function move(event: PointerEvent) {
  const previous = pointers.get(event.pointerId)
  if (!previous) return
  const before = distance()
  if (pointers.size === 1) {
    longitude -= (event.clientX - previous.x) * 0.12 * fov.value / 70
    latitude = THREE.MathUtils.clamp(latitude + (event.clientY - previous.y) * 0.12, -85, 85)
  }
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
  if (pointers.size === 2) { const after = distance(); if (after > 0 && before > 0) fov.value = THREE.MathUtils.clamp(fov.value * before / after, 30, 100) }
  schedule()
}
function up(event: PointerEvent) { pointers.delete(event.pointerId) }
function zoom(delta: number) { fov.value = THREE.MathUtils.clamp(fov.value + delta, 30, 100); schedule() }
function key(event: KeyboardEvent) {
  const actions: Record<string, () => void> = { ArrowLeft: () => { longitude -= 5 }, ArrowRight: () => { longitude += 5 }, ArrowUp: () => { latitude = Math.min(85, latitude + 5) }, ArrowDown: () => { latitude = Math.max(-85, latitude - 5) }, '+': () => zoom(-5), '-': () => zoom(5) }
  if (actions[event.key]) { event.preventDefault(); actions[event.key]?.(); schedule() }
}
onMounted(load)
watch(() => props.url, load)
onBeforeUnmount(() => { ++loadId; clearTimeout(timeout); cancelAnimationFrame(requestId); dispose() })
</script>
<template>
  <div class="panorama-wrap">
    <div ref="host" class="panorama" tabindex="0" role="application" aria-label="全景视图：拖动旋转，滚轮或双指缩放，也可使用方向键和加减键" :data-fov="Math.round(fov)" @pointerdown="down" @pointermove="move" @pointerup="up" @pointercancel="up" @lostpointercapture="up" @wheel.prevent="zoom($event.deltaY * 0.035)" @keydown="key" />
    <div v-if="status !== 'ready'" class="panorama-status surface" role="status">
      <AppIcon name="compass" :class="{ spinning: status === 'loading' }" />
      <h2>{{ status === 'loading' ? '正在走入洞窟…' : '全景暂时无法加载' }}</h2>
      <p v-if="status === 'error'">请检查图片地址、网络与浏览器 WebGL 支持。</p>
      <button v-if="status === 'error'" class="primary" @click="load">重新加载全景</button>
    </div>
    <div class="zoom-controls" @pointerdown.stop @wheel.stop>
      <button aria-label="放大全景" @click="zoom(-5)">＋</button><span>{{ Math.round(fov) }}°</span><button aria-label="缩小全景" @click="zoom(5)">−</button>
    </div>
  </div>
</template>
