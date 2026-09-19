<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { assetUrl } from '@/utils/assets'

const props = defineProps<{
  title: string
  location: string
  backgroundUrl: string
  coverUrl?: string
  completed: boolean
  correct: number
  wrong: number
  skipped: number
  elapsed: string
}>()

const canvas = ref<HTMLCanvasElement | null>(null)
const busy = ref(false)
const error = ref('')
const previewUrl = ref('')
const filename = computed(() => `${props.location}-${props.title}-明信片.png`)

function loadImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('image unavailable'))
    image.src = assetUrl(url)
  })
}

async function render() {
  const target = canvas.value
  if (!target) return
  busy.value = true
  error.value = ''
  target.width = 1200
  target.height = 840
  const context = target.getContext('2d')
  if (!context) return
  let image: HTMLImageElement | null = null
  for (const source of [props.coverUrl, props.backgroundUrl]) {
    if (!source) continue
    try {
      image = await loadImage(source)
      break
    } catch {
      /* Fall back to the next background. */
    }
  }
  context.fillStyle = '#183734'
  context.fillRect(0, 0, target.width, target.height)
  if (image) {
    const scale = Math.max(target.width / image.width, target.height / image.height)
    const width = image.width * scale
    const height = image.height * scale
    context.drawImage(
      image,
      (target.width - width) / 2,
      (target.height - height) / 2,
      width,
      height,
    )
  }
  const shade = context.createLinearGradient(0, 0, target.width, target.height)
  shade.addColorStop(0, 'rgba(12, 37, 34, .18)')
  shade.addColorStop(0.58, 'rgba(12, 37, 34, .5)')
  shade.addColorStop(1, 'rgba(10, 27, 27, .94)')
  context.fillStyle = shade
  context.fillRect(0, 0, target.width, target.height)
  context.strokeStyle = 'rgba(235, 211, 155, .78)'
  context.lineWidth = 3
  context.strokeRect(34, 34, target.width - 68, target.height - 68)
  context.strokeStyle = 'rgba(235, 211, 155, .3)'
  context.lineWidth = 1
  context.strokeRect(50, 50, target.width - 100, target.height - 100)
  context.fillStyle = '#ecd59b'
  context.textAlign = 'left'
  context.font = '18px serif'
  context.fillText('CAVE EXPLORATIONS  ·  FIELD NOTE', 86, 108)
  context.font = 'bold 54px serif'
  context.fillText(props.title, 86, 205)
  context.font = '24px serif'
  context.fillStyle = '#e2d5b6'
  context.fillText(props.location, 90, 250)
  context.fillStyle = '#ecd59b'
  context.font = 'bold 28px serif'
  context.fillText(props.completed ? '探索完成' : '探索记录', 90, 355)
  context.font = '22px serif'
  context.fillStyle = '#f4ead2'
  context.fillText(`正确推断  ${props.correct}`, 90, 420)
  context.fillText(`错误尝试  ${props.wrong}`, 90, 466)
  context.fillText(`跳过题目  ${props.skipped}`, 90, 512)
  context.fillText(`探索用时  ${props.elapsed}`, 90, 558)
  context.fillStyle = 'rgba(245, 221, 164, .85)'
  context.font = 'italic 24px serif'
  context.fillText('以好奇为灯，照见千年之美。', 90, 690)
  context.font = '16px serif'
  context.fillStyle = '#c5b98f'
  context.fillText(new Date().toLocaleDateString('zh-CN'), 90, 738)
  try {
    previewUrl.value = target.toDataURL('image/png')
  } catch {
    error.value = '封面图片不允许跨域绘制，请改用同源图片地址。'
    previewUrl.value = ''
  }
  busy.value = false
}

function download() {
  const url = previewUrl.value
  if (!url) return
  const link = document.createElement('a')
  link.href = url
  link.download = filename.value
  link.click()
}

async function share() {
  const target = canvas.value
  if (!target) return
  if (!navigator.share) {
    download()
    return
  }
  const blob = await new Promise<Blob | null>((resolve) => target.toBlob(resolve, 'image/png'))
  if (!blob) return
  const file = new File([blob], filename.value, { type: 'image/png' })
  try {
    await navigator.share({
      title: props.title,
      text: `${props.location} · ${props.title}`,
      files: [file],
    })
  } catch {
    /* Share cancellation is not an application error. */
  }
}

watch(
  () => [
    props.title,
    props.location,
    props.backgroundUrl,
    props.coverUrl,
    props.completed,
    props.correct,
    props.wrong,
    props.skipped,
    props.elapsed,
  ],
  () => void render(),
)
onMounted(() => void render())
</script>

<template>
  <div class="postcard-generator">
    <div class="postcard-preview surface">
      <canvas ref="canvas" aria-label="探索明信片预览" />
      <p v-if="busy" class="muted">正在绘制明信片…</p>
      <p v-if="error" class="muted">图片加载失败，将使用默认背景。</p>
    </div>
    <div class="postcard-actions">
      <button class="primary" :disabled="busy || !previewUrl" @click="download">下载明信片</button>
      <button class="outline-button" :disabled="busy || !previewUrl" @click="share">
        分享明信片
      </button>
    </div>
  </div>
</template>
