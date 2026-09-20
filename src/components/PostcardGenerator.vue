<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import * as QRCode from 'qrcode'
import { assetUrl } from '@/utils/assets'

export type PostcardFilter = 'archive' | 'clear' | 'moonlight' | 'ink'
export type PostcardFilterMode = PostcardFilter | 'random'

export interface PostcardSection {
  label: string
  value: string | number
}

const props = withDefaults(
  defineProps<{
    title: string
    location: string
    backgroundUrl: string
    coverUrl?: string
    completed: boolean
    correct: number
    wrong: number
    skipped: number
    elapsed: string
    sections?: PostcardSection[]
    filter?: PostcardFilterMode
    /** Optional share payload. When qrEndpoint is supplied it is rendered as a QR image. */
    qrValue?: string
    qrEndpoint?: string
    qrUrl?: string
  }>(),
  {
    coverUrl: '',
    sections: () => [],
    filter: 'random',
    qrValue: '',
    qrEndpoint: '',
    qrUrl: '',
  },
)

const emit = defineEmits<{
  rendered: [dataUrl: string]
  error: [message: string]
}>()

const canvas = ref<HTMLCanvasElement | null>(null)
const busy = ref(false)
const error = ref('')
const previewUrl = ref('')
const filters: PostcardFilter[] = ['archive', 'clear', 'moonlight', 'ink']
const randomFilter = (): PostcardFilter => filters[Math.floor(Math.random() * filters.length)]!
const selectedFilter = ref<PostcardFilter>(props.filter === 'random' ? randomFilter() : props.filter)
let renderRevision = 0

const filename = computed(() => {
  const base = `${props.location}-${props.title}`.replace(/[\\/:*?"<>|]/g, '-').trim()
  return `${base || '探索明信片'}.png`
})
const filterOptions: Array<{ id: PostcardFilter; label: string }> = [
  { id: 'archive', label: '档案暖金' },
  { id: 'clear', label: '原色' },
  { id: 'moonlight', label: '月影' },
  { id: 'ink', label: '墨线' },
]
const displaySections = computed<PostcardSection[]>(() =>
  props.sections.length
    ? props.sections
    : [
        { label: '正确推断', value: props.correct },
        { label: '错误尝试', value: props.wrong },
        { label: '跳过题目', value: props.skipped },
        { label: '探索用时', value: props.elapsed },
      ],
)
const qrSource = computed(() => {
  if (props.qrUrl) return props.qrUrl
  const value = props.qrValue.trim()
  const endpoint = props.qrEndpoint.trim()
  if (!value || !endpoint) return ''
  const encoded = encodeURIComponent(value)
  if (endpoint.includes('{data}')) return endpoint.replace('{data}', encoded)
  return `${endpoint}${endpoint.includes('?') ? '&' : '?'}data=${encoded}`
})

const filterCss: Record<PostcardFilter, string> = {
  archive: 'sepia(.34) saturate(1.12) contrast(1.06)',
  clear: 'none',
  moonlight: 'saturate(.72) hue-rotate(16deg) brightness(.88) contrast(1.08)',
  ink: 'grayscale(.72) contrast(1.2)',
}

function loadImage(source: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.crossOrigin = 'anonymous'
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('image unavailable'))
    image.src = assetUrl(source)
  })
}

function drawCover(
  context: CanvasRenderingContext2D,
  image: HTMLImageElement,
  x: number,
  y: number,
  width: number,
  height: number,
): void {
  const scale = Math.max(width / image.width, height / image.height)
  const drawWidth = image.width * scale
  const drawHeight = image.height * scale
  context.save()
  context.filter = filterCss[selectedFilter.value]
  context.beginPath()
  context.rect(x, y, width, height)
  context.clip()
  context.drawImage(
    image,
    x + (width - drawWidth) / 2,
    y + (height - drawHeight) / 2,
    drawWidth,
    drawHeight,
  )
  context.restore()
}

function drawWrapped(
  context: CanvasRenderingContext2D,
  value: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLines = 2,
): number {
  const text = value || '未命名探索'
  let line = ''
  let lineCount = 0
  for (const character of [...text]) {
    const next = line + character
    if (line && context.measureText(next).width > maxWidth) {
      context.fillText(line, x, y + lineCount * lineHeight)
      line = character
      lineCount += 1
      if (lineCount === maxLines - 1) break
    } else line = next
  }
  const remainder = lineCount === maxLines - 1 ? `${line}…` : line
  context.fillText(remainder, x, y + lineCount * lineHeight)
  return lineCount + 1
}

function drawQrCode(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  value: string,
): void {
  const qr = QRCode.create(value, { errorCorrectionLevel: 'M' })
  const quietZone = 4
  const modules = qr.modules.size
  const cell = size / (modules + quietZone * 2)
  context.fillStyle = '#f8f0dc'
  context.fillRect(x, y, size, size)
  context.fillStyle = '#142c2a'
  for (let row = 0; row < modules; row += 1) {
    for (let column = 0; column < modules; column += 1) {
      if (!qr.modules.get(row, column)) continue
      context.fillRect(
        x + (column + quietZone) * cell,
        y + (row + quietZone) * cell,
        Math.ceil(cell),
        Math.ceil(cell),
      )
    }
  }
}

async function render(): Promise<void> {
  const target = canvas.value
  if (!target) return
  const revision = ++renderRevision
  busy.value = true
  error.value = ''
  target.width = 1400
  target.height = 900
  const context = target.getContext('2d')
  if (!context) {
    busy.value = false
    return
  }

  let image: HTMLImageElement | null = null
  for (const source of [props.coverUrl, props.backgroundUrl]) {
    if (!source) continue
    try {
      image = await loadImage(source)
      break
    } catch {
      // The palette and typography still make a useful postcard without an image.
    }
  }
  let qrImage: HTMLImageElement | null = null
  if (qrSource.value) {
    try {
      qrImage = await loadImage(qrSource.value)
    } catch {
      qrImage = null
    }
  }
  if (revision !== renderRevision) return

  context.fillStyle = '#183734'
  context.fillRect(0, 0, target.width, target.height)
  if (image) drawCover(context, image, 52, 52, 560, 796)
  context.fillStyle = 'rgba(12, 37, 34, .72)'
  context.fillRect(52, 52, 560, 796)
  context.fillStyle = 'rgba(7, 19, 18, .46)'
  context.fillRect(650, 52, 698, 796)

  context.strokeStyle = 'rgba(235, 211, 155, .86)'
  context.lineWidth = 3
  context.strokeRect(28, 28, target.width - 56, target.height - 56)
  context.strokeStyle = 'rgba(235, 211, 155, .3)'
  context.lineWidth = 1
  context.strokeRect(44, 44, target.width - 88, target.height - 88)
  context.strokeStyle = 'rgba(235, 211, 155, .26)'
  context.strokeRect(650, 52, 698, 796)

  context.textAlign = 'left'
  context.fillStyle = '#ecd59b'
  context.font = '18px serif'
  context.fillText('CAVE EXPLORATIONS  ·  FIELD NOTE', 700, 112)
  context.font = 'bold 54px serif'
  drawWrapped(context, props.title, 700, 190, 600, 66, 2)
  context.fillStyle = '#e2d5b6'
  context.font = '24px serif'
  context.fillText(props.location, 704, 322)
  context.fillStyle = '#ecd59b'
  context.font = 'bold 28px serif'
  context.fillText(props.completed ? '探索完成' : '探索记录', 704, 382)
  context.fillStyle = '#aebda9'
  context.font = '15px serif'
  context.fillText('一张把观察、判断与时间留存下来的现场卡片', 704, 414)

  const sectionTop = 470
  const sectionWidth = 300
  const sectionGap = 18
  displaySections.value.slice(0, 4).forEach((section, index) => {
    const x = 700 + (index % 2) * (sectionWidth + sectionGap)
    const y = sectionTop + Math.floor(index / 2) * 92
    context.fillStyle = 'rgba(195, 165, 108, .12)'
    context.fillRect(x, y, sectionWidth, 72)
    context.strokeStyle = 'rgba(195, 165, 108, .34)'
    context.strokeRect(x, y, sectionWidth, 72)
    context.fillStyle = '#f4ead2'
    context.font = 'bold 25px serif'
    context.fillText(String(section.value), x + 20, y + 33)
    context.fillStyle = '#aebda9'
    context.font = '14px serif'
    context.fillText(section.label, x + 20, y + 56)
  })

  if (props.qrValue) {
    const qrSize = 118
    const qrX = 1180
    const qrY = 670
    if (qrImage) drawCover(context, qrImage, qrX, qrY, qrSize, qrSize)
    else drawQrCode(context, qrX, qrY, qrSize, props.qrValue)
    context.fillStyle = '#c5b98f'
    context.font = '13px serif'
    context.fillText('扫码留存探索', 1180, 812)
  }

  context.fillStyle = 'rgba(245, 221, 164, .85)'
  context.font = 'italic 24px serif'
  context.fillText('以好奇为灯，照见千年之美。', 86, 780)
  context.font = '16px serif'
  context.fillStyle = '#c5b98f'
  context.fillText(new Date().toLocaleDateString('zh-CN'), 86, 815)

  try {
    previewUrl.value = target.toDataURL('image/png')
    emit('rendered', previewUrl.value)
  } catch {
    error.value = '封面图片不允许跨域绘制，请改用同源图片地址。'
    previewUrl.value = ''
    emit('error', error.value)
  } finally {
    if (revision === renderRevision) busy.value = false
  }
}

function download(): void {
  const url = previewUrl.value
  if (!url) return
  const link = document.createElement('a')
  link.href = url
  link.download = filename.value
  link.click()
}

async function share(): Promise<void> {
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
    const shareData = {
      title: props.title,
      text: `${props.location} · ${props.title}`,
      files: [file],
    }
    if (!navigator.canShare || navigator.canShare({ files: [file] }))
      await navigator.share(shareData)
    else download()
  } catch {
    /* Share cancellation is not an application error. */
  }
}

watch(
  () => props.filter,
  (value) => (selectedFilter.value = value === 'random' ? randomFilter() : value),
)
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
    props.sections,
    props.qrValue,
    props.qrEndpoint,
    props.qrUrl,
    selectedFilter.value,
  ],
  () => void render(),
  { deep: true },
)
defineExpose({ render, download, share, previewUrl, canvas })
onMounted(() => void render())
</script>

<template>
  <div class="postcard-generator">
    <div class="postcard-toolbar">
      <div class="postcard-filter-group" role="group" aria-label="明信片滤镜">
        <button
          v-for="option in filterOptions"
          :key="option.id"
          class="postcard-filter"
          :class="{ active: selectedFilter === option.id }"
          type="button"
          :aria-pressed="selectedFilter === option.id"
          @click="selectedFilter = option.id"
        >
          {{ option.label }}
        </button>
      </div>
      <span v-if="qrValue" class="postcard-qr-label">分享编码已写入明信片</span>
    </div>
    <div class="postcard-preview surface">
      <canvas ref="canvas" aria-label="探索明信片预览" />
      <p v-if="busy" class="muted">正在绘制明信片…</p>
      <p v-if="error" class="muted" role="status">{{ error }}</p>
    </div>
    <div class="postcard-actions">
      <button class="primary" :disabled="busy || !previewUrl" @click="download">下载明信片</button>
      <button class="outline-button" :disabled="busy || !previewUrl" @click="share">
        分享明信片
      </button>
    </div>
  </div>
</template>
