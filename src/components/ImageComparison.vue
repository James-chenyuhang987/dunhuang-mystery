<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import AppIcon from './AppIcon.vue'

const props = defineProps<{ referenceUrl: string; title: string; description?: string; passScore?: number }>()
const input = ref<HTMLInputElement | null>(null)
const previewUrl = ref('')
const status = ref<'idle' | 'loading' | 'done' | 'error'>('idle')
const score = ref(0)
const error = ref('')

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('图片无法读取'))
    image.src = url
  })
}
function signature(image: HTMLImageElement): Uint8ClampedArray {
  const canvas = document.createElement('canvas')
  canvas.width = 32
  canvas.height = 32
  const context = canvas.getContext('2d', { willReadFrequently: true })
  if (!context) throw new Error('浏览器不支持图像比较')
  context.fillStyle = '#ffffff'
  context.fillRect(0, 0, 32, 32)
  context.drawImage(image, 0, 0, 32, 32)
  return context.getImageData(0, 0, 32, 32).data
}
function similarity(first: Uint8ClampedArray, second: Uint8ClampedArray): number {
  let difference = 0
  for (let index = 0; index < first.length; index += 4) {
    const firstLight = (first[index] ?? 0) * .299 + (first[index + 1] ?? 0) * .587 + (first[index + 2] ?? 0) * .114
    const secondLight = (second[index] ?? 0) * .299 + (second[index + 1] ?? 0) * .587 + (second[index + 2] ?? 0) * .114
    difference += Math.abs(firstLight - secondLight) / 255
  }
  return Math.max(0, Math.min(100, Math.round((1 - difference / (first.length / 4)) * 100)))
}
async function compare(file: File) {
  if (!file.type.startsWith('image/')) { status.value = 'error'; error.value = '请选择有效的图片文件。'; return }
  if (file.size > 20 * 1024 * 1024) { status.value = 'error'; error.value = '图片不能超过 20 MB。'; return }
  if (previewUrl.value) URL.revokeObjectURL(previewUrl.value)
  previewUrl.value = URL.createObjectURL(file)
  status.value = 'loading'
  error.value = ''
  try {
    const [reference, candidate] = await Promise.all([loadImage(props.referenceUrl), loadImage(previewUrl.value)])
    score.value = similarity(signature(reference), signature(candidate))
    status.value = 'done'
  } catch (cause: unknown) {
    status.value = 'error'
    error.value = cause instanceof Error ? cause.message : '比较失败，请重新选择图片。'
  }
}
function select(event: Event) {
  const element = event.target as HTMLInputElement
  const file = element.files?.[0]
  if (file) void compare(file)
}
function retry() { status.value = 'idle'; error.value = ''; input.value?.click() }
onBeforeUnmount(() => { if (previewUrl.value) URL.revokeObjectURL(previewUrl.value) })
</script>

<template>
  <section class="image-comparison surface">
    <p class="eyebrow">VISUAL MATCH · 本机图像比对</p>
    <h2>{{ title }}</h2>
    <p>{{ description }}</p>
    <div class="comparison-grid">
      <figure><img :src="referenceUrl" alt="配置提供的参考图"><figcaption>参考纹样</figcaption></figure>
      <figure v-if="previewUrl"><img :src="previewUrl" alt="用户上传的待比较图"><figcaption>你的图片</figcaption></figure>
      <button v-else class="comparison-placeholder" @click="input?.click()"><AppIcon name="eye"/><span>上传图片</span></button>
    </div>
    <input ref="input" class="visually-hidden" type="file" accept="image/*" @change="select">
    <button class="outline-button comparison-upload" :disabled="status === 'loading'" @click="input?.click()">{{ previewUrl ? '更换图片' : '选择图片' }}</button>
    <p class="comparison-privacy">图片仅在你的浏览器中处理，不会上传服务器。</p>
    <div v-if="status === 'loading'" class="comparison-result" role="status">正在提取视觉特征…</div>
    <div v-else-if="status === 'done'" class="comparison-result" :class="{ matched: score >= (passScore ?? 60) }" role="status">
      <strong>{{ score }}%</strong><span>{{ score >= (passScore ?? 60) ? '纹样较为相似，任务完成' : '差异较大，可调整角度或光线后重试' }}</span>
    </div>
    <div v-else-if="status === 'error'" class="comparison-result error" role="alert"><span>{{ error }}</span><button class="text-button" @click="retry">重新尝试</button></div>
  </section>
</template>
