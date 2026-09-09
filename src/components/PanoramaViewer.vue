<script setup lang="ts">
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import * as THREE from 'three'
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js'
import { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js'
import AppIcon from './AppIcon.vue'
import type { ClickPoint, hotspot } from '@/types/game'
import { findMatchingClickPoint } from '@/utils/clickPoints'
import { projectHotspot } from '@/utils/hotspots'

const props = withDefaults(defineProps<{
  url: string
  ultravioletUrl?: string
  hotspots?: hotspot[]
  clickPoints?: ClickPoint[]
  ultraviolet?: boolean
}>(), { ultravioletUrl: '', hotspots: () => [], clickPoints: () => [], ultraviolet: false })
const emit = defineEmits<{ clue: [index: number]; discover: [index: number] }>()
const host = ref<HTMLDivElement | null>(null)
const status = ref<'loading' | 'ready' | 'error'>('loading')
const hasTexture = ref(false)
const fov = ref(70)
const projected = ref<ReturnType<typeof projectHotspot>[]>([])
let renderer: THREE.WebGLRenderer | undefined
let composer: EffectComposer | undefined
let ultravioletPass: ShaderPass | undefined
let outputPass: OutputPass | undefined
let camera: THREE.PerspectiveCamera | undefined
let scene: THREE.Scene | undefined
let material: THREE.MeshBasicMaterial | undefined
let geometry: THREE.SphereGeometry | undefined
let sphere: THREE.Mesh | undefined
let observer: ResizeObserver | undefined
let requestId = 0
let loadId = 0
let longitude = 0
let latitude = 0
let moved = false
let pressStart: { x: number; y: number } | undefined
let timeout: ReturnType<typeof setTimeout> | undefined
let contextLost = false
const renderedUltraviolet = ref(false)
const pointers = new Map<number, { x: number; y: number }>()
const panoramaRadius = 10
const raycaster = new THREE.Raycaster()
const pointer = new THREE.Vector2()
const ultravioletShader = {
  uniforms: {
    tDiffuse: { value: null },
    resolution: { value: new THREE.Vector2(1, 1) },
  },
  vertexShader: `varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform vec2 resolution;
    varying vec2 vUv;

    float uvLuminance(vec3 color) { return dot(color, vec3(0.2126, 0.7152, 0.0722)); }
    float whiteness(vec3 color) {
      float chroma = max(color.r, max(color.g, color.b)) - min(color.r, min(color.g, color.b));
      return smoothstep(0.72, 0.98, uvLuminance(color)) * (1.0 - smoothstep(0.08, 0.32, chroma));
    }
    vec3 ultravioletColor(vec3 source) {
      float value = uvLuminance(source);
      float chroma = max(source.r, max(source.g, source.b)) - min(source.r, min(source.g, source.b));
      float detail = mix(value, max(source.r, max(source.g, source.b)), clamp(chroma * 0.35, 0.0, 0.25));
      vec3 shadows = vec3(0.006, 0.012, 0.055);
      vec3 midtones = vec3(0.075, 0.025, 0.26);
      vec3 highlights = vec3(0.22, 0.18, 0.62);
      vec3 mapped = mix(shadows, midtones, smoothstep(0.02, 0.48, detail));
      return mix(mapped, highlights, smoothstep(0.45, 0.92, detail));
    }
    void main() {
      vec3 source = texture2D(tDiffuse, vUv).rgb;
      vec2 px = vec2(1.5) / resolution;
      float fluorescence = whiteness(source);
      float glow = 0.0;
      glow += whiteness(texture2D(tDiffuse, vUv + vec2(px.x, 0.0)).rgb);
      glow += whiteness(texture2D(tDiffuse, vUv - vec2(px.x, 0.0)).rgb);
      glow += whiteness(texture2D(tDiffuse, vUv + vec2(0.0, px.y)).rgb);
      glow += whiteness(texture2D(tDiffuse, vUv - vec2(0.0, px.y)).rgb);
      glow *= 0.25;
      vec3 color = ultravioletColor(source);
      color += glow * vec3(0.10, 0.22, 0.62);
      color = mix(color, vec3(0.62, 0.96, 1.0), fluorescence);
      gl_FragColor = vec4(color, 1.0);
    }
  `,
}

function render(): void {
  if (!renderer || !camera || !scene) return
  const phi = THREE.MathUtils.degToRad(90 - latitude)
  const theta = THREE.MathUtils.degToRad(longitude)
  camera.lookAt(Math.sin(phi) * Math.cos(theta), Math.cos(phi), Math.sin(phi) * Math.sin(theta))
  camera.fov = fov.value
  camera.updateProjectionMatrix()
  camera.updateMatrixWorld()
  if (composer) composer.render(); else renderer.render(scene, camera)
  projected.value = props.hotspots.map((point) => projectHotspot(point, camera!))
}

function schedule(): void {
  cancelAnimationFrame(requestId)
  requestId = requestAnimationFrame(render)
}

function resize(): void {
  if (!host.value || !renderer || !camera) return
  const { clientWidth: width, clientHeight: height } = host.value
  if (!width || !height) return
  renderer.setSize(width, height)
  composer?.setSize(width, height)
  ultravioletPass?.uniforms.resolution?.value.set(width * Math.min(window.devicePixelRatio, 2), height * Math.min(window.devicePixelRatio, 2))
  camera.aspect = width / height
  schedule()
}

function onLost(event: Event): void {
  event.preventDefault()
  contextLost = true
  status.value = 'error'
}

function initialize(): void {
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true })
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.domElement.addEventListener('webglcontextlost', onLost)
    host.value?.append(renderer.domElement)
    scene = new THREE.Scene()
    camera = new THREE.PerspectiveCamera(70, 1, 0.1, 100)
    composer = new EffectComposer(renderer)
    composer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    composer.addPass(new RenderPass(scene, camera))
    ultravioletPass = new ShaderPass(ultravioletShader)
    ultravioletPass.enabled = false
    composer.addPass(ultravioletPass)
    outputPass = new OutputPass()
    composer.addPass(outputPass)
    geometry = new THREE.SphereGeometry(panoramaRadius, 64, 32)
    geometry.scale(-1, 1, 1)
    material = new THREE.MeshBasicMaterial({ color: '#b9a47c' })
    sphere = new THREE.Mesh(geometry, material)
    scene.add(sphere)
    observer = new ResizeObserver(resize)
    if (host.value) observer.observe(host.value)
    resize()
    loadTexture()
  } catch {
    status.value = 'error'
  }
}

function loadTexture(): void {
  const id = ++loadId
  const source = props.ultraviolet ? props.ultravioletUrl : props.url
  const useUltravioletPass = props.ultraviolet && Boolean(props.ultravioletUrl)
  clearTimeout(timeout)
  status.value = 'loading'
  if (contextLost || !source || !material || !ultravioletPass) {
    status.value = 'error'
    return
  }
  timeout = setTimeout(() => {
    if (id === loadId) {
      ++loadId
      status.value = 'error'
    }
  }, 30000)
  new THREE.TextureLoader().load(source, (texture) => {
    if (id !== loadId || !material || !ultravioletPass) {
      texture.dispose()
      return
    }
    clearTimeout(timeout)
    texture.colorSpace = THREE.SRGBColorSpace
    const previous = material.map
    material.map = texture
    material.color.set('#ffffff')
    material.needsUpdate = true
    ultravioletPass.enabled = useUltravioletPass
    renderedUltraviolet.value = useUltravioletPass
    previous?.dispose()
    hasTexture.value = true
    status.value = 'ready'
    schedule()
  }, undefined, () => {
    if (id === loadId) {
      clearTimeout(timeout)
      status.value = 'error'
    }
  })
}

function retry(): void {
  if (!contextLost && renderer && material) {
    loadTexture()
    return
  }
  dispose()
  contextLost = false
  hasTexture.value = false
  status.value = 'loading'
  initialize()
}

function dispose(): void {
  const alreadyLost = contextLost
  ++loadId
  clearTimeout(timeout)
  cancelAnimationFrame(requestId)
  observer?.disconnect()
  renderer?.domElement.removeEventListener('webglcontextlost', onLost)
  material?.map?.dispose()
  material?.dispose()
  geometry?.dispose()
  ultravioletPass?.dispose()
  outputPass?.dispose()
  composer?.dispose()
  renderer?.dispose()
  if (!alreadyLost) renderer?.forceContextLoss()
  renderer?.domElement.remove()
  pointers.clear()
  sphere = undefined
  renderer = undefined
  composer = undefined
  ultravioletPass = undefined
  outputPass = undefined
  camera = undefined
  scene = undefined
  renderedUltraviolet.value = false
  material = undefined
  geometry = undefined
}

function down(event: PointerEvent): void {
  if (event.pointerType === 'mouse' && event.button !== 0) return
  if (pointers.size === 0) {
    moved = false
    pressStart = { x: event.clientX, y: event.clientY }
  } else {
    moved = true
  }
  try { host.value?.setPointerCapture(event.pointerId) } catch { /* The pointer can be cancelled before capture. */ }
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
}

function pointerDistance(): number {
  const [a, b] = [...pointers.values()]
  return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0
}

function move(event: PointerEvent): void {
  const previous = pointers.get(event.pointerId)
  if (!previous) return
  const before = pointerDistance()
  if (pressStart && Math.hypot(event.clientX - pressStart.x, event.clientY - pressStart.y) > 6) moved = true
  if (pointers.size === 1) {
    longitude -= (event.clientX - previous.x) * 0.12 * fov.value / 70
    latitude = THREE.MathUtils.clamp(latitude + (event.clientY - previous.y) * 0.12, -85, 85)
  }
  pointers.set(event.pointerId, { x: event.clientX, y: event.clientY })
  if (pointers.size === 2) {
    const after = pointerDistance()
    if (after > 0 && before > 0) fov.value = THREE.MathUtils.clamp(fov.value * before / after, 30, 100)
  }
  schedule()
}

function discover(event: PointerEvent): void {
  if (!host.value || !camera || !sphere || status.value !== 'ready') return
  const bounds = host.value.getBoundingClientRect()
  if (!bounds.width || !bounds.height) return
  pointer.set((event.clientX - bounds.left) / bounds.width * 2 - 1, -((event.clientY - bounds.top) / bounds.height) * 2 + 1)
  camera.updateMatrixWorld()
  raycaster.setFromCamera(pointer, camera)
  const center = sphere.getWorldPosition(new THREE.Vector3())
  const intersection = raycaster.ray.intersectSphere(new THREE.Sphere(center, panoramaRadius), new THREE.Vector3())
  if (!intersection) return
  const position = intersection.sub(center)
  const coordinates = [position.x, position.y, position.z].map((value) => Number(value.toFixed(4)))
  console.info('[Panorama click]', position.clone(), `new Vector3(${coordinates.join(', ')})`)
  const index = findMatchingClickPoint(position, props.clickPoints, props.ultraviolet)
  if (index !== null) emit('discover', index)
}

function up(event: PointerEvent): void {
  const shouldDiscover = pointers.size === 1 && !moved
  pointers.delete(event.pointerId)
  if (shouldDiscover) discover(event)
  if (pointers.size === 0) pressStart = undefined
}

function cancel(event: PointerEvent): void {
  moved = true
  pointers.delete(event.pointerId)
  if (pointers.size === 0) pressStart = undefined
}

function zoom(delta: number): void {
  fov.value = THREE.MathUtils.clamp(fov.value + delta, 30, 100)
  schedule()
}

function key(event: KeyboardEvent): void {
  const actions: Record<string, () => void> = {
    ArrowLeft: () => { longitude -= 5 }, ArrowRight: () => { longitude += 5 },
    ArrowUp: () => { latitude = Math.min(85, latitude + 5) }, ArrowDown: () => { latitude = Math.max(-85, latitude - 5) },
    '+': () => zoom(-5), '-': () => zoom(5),
  }
  if (actions[event.key]) {
    event.preventDefault()
    actions[event.key]?.()
    schedule()
  }
}

onMounted(initialize)
watch(() => [props.url, props.ultravioletUrl, props.ultraviolet] as const, () => { if (renderer) loadTexture() })
watch(() => props.hotspots, schedule, { deep: true })
onBeforeUnmount(dispose)
</script>
<template>
  <div class="panorama-wrap">
    <div ref="host" class="panorama" tabindex="0" role="application" aria-label="全景视图：拖动旋转，点击寻找隐藏信息，滚轮或双指缩放，也可使用方向键和加减键" :data-fov="Math.round(fov)" :data-ultraviolet-pass="renderedUltraviolet ? 'active' : 'inactive'" @pointerdown="down" @pointermove="move" @pointerup="up" @pointercancel="cancel" @lostpointercapture="cancel" @wheel.prevent="zoom($event.deltaY * 0.035)" @keydown="key" />
    <div v-if="status === 'ready'" class="panorama-hotspots" aria-label="全景线索点">
      <button v-for="(point, index) in hotspots" v-show="projected[index]?.visible" :key="`${point.clue_index}-${index}`" class="panorama-hotspot" :style="{ left: `${projected[index]?.x ?? 50}%`, top: `${projected[index]?.y ?? 50}%` }" :aria-label="`查看线索 ${point.clue_index + 1}`" @pointerdown.stop @wheel.stop @click="emit('clue', point.clue_index)"><span>{{ String(point.clue_index + 1).padStart(2, '0') }}</span></button>
    </div>
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
