<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { Vector3 } from 'three'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import type {
  clue,
  DialogueNode,
  hotspot,
  ImagePanorama,
  problem,
  StoryPackage,
} from '@/types/game'
import { assetUrl } from '@/utils/assets'
import { DEFAULT_PANORAMA_FOV } from '@/utils/panorama'
import {
  createBlankLevel,
  createBlankStory,
  downloadStory,
  getStory,
  importStoryResult as parseStoryPackage,
  isStoryPackage,
  readStories,
  removeClueFromLevel,
  removeStory,
  saveStory,
} from '@/utils/storyPackage'

const story = reactive<StoryPackage>(createBlankStory())
const game = useGameStore()
const router = useRouter()
const selectedIndex = ref(0)
const notice = ref('')
const importInput = ref<HTMLInputElement | null>(null)
const savedStories = ref<StoryPackage[]>([])
const playingStoryId = ref<string | null>(null)
const selectedLevel = computed(() => story.levels[selectedIndex.value])
const panoramaIndex = ref(0)
const sceneTool = ref<'hotspot' | 'discovery'>('hotspot')
const selectedHotspotClueIndex = ref(0)
const selectedPanorama = computed(() => {
  const panorama = selectedLevel.value?.panorama[panoramaIndex.value]
  if (panorama && !panorama.initial_view)
    panorama.initial_view = { longitude: 0, latitude: 0, fov: DEFAULT_PANORAMA_FOV }
  return panorama
})
const currentStoryValid = computed(() => isStoryPackage(story))
const dialogueChoices = computed(() => {
  const choices: Array<{ id: string; name: string }> = []
  const collect = (items: clue[]) => {
    for (const item of items) {
      if (item.type === 'dialogue' && item.dialogue_id)
        choices.push({ id: item.dialogue_id, name: item.name })
      if (item.subclues) collect(item.subclues)
    }
  }
  collect(selectedLevel.value?.clues ?? [])
  return choices
})

const builtInPanoramas: Array<Pick<ImagePanorama, 'name' | 'url' | 'ultraviolet_url'>> = [
  {
    name: '莫高窟 · 第 172 窟',
    url: '/dunhuang/panoramas/mogao-cave-172.png',
    ultraviolet_url: '/dunhuang/panoramas/mogao-cave-172.png',
  },
  {
    name: '莫高窟 · 第 322 窟',
    url: '/dunhuang/panoramas/mogao-cave-322.png',
    ultraviolet_url: '/dunhuang/panoramas/mogao-cave-322.png',
  },
  {
    name: '莫高窟 · 第 420 窟',
    url: '/dunhuang/panoramas/mogao-cave-420.png',
    ultraviolet_url: '/dunhuang/panoramas/mogao-cave-420.png',
  },
  {
    name: '云冈 · 第三窟',
    url: '/yungang/yungang_cave3_pano.jpg',
    ultraviolet_url: '/yungang/yungang_cave3_pano.jpg',
  },
  {
    name: '云冈 · 第五窟',
    url: '/yungang/yungang_cave5_pano.jpg',
    ultraviolet_url: '/yungang/yungang_cave5_pano.jpg',
  },
  {
    name: '云冈 · 第六窟',
    url: '/yungang/yungang_cave6_pano.jpg',
    ultraviolet_url: '/yungang/yungang_cave6_pano.jpg',
  },
]

function refreshStories() {
  savedStories.value = readStories()
}
function storyPath(id: string, section = 'home'): string {
  return `/story/${encodeURIComponent(id)}/${section}`
}
function returnToScene(): void {
  void router.push('/select')
}
function selectLevel(index: number) {
  selectedIndex.value = Math.max(0, Math.min(index, story.levels.length - 1))
  panoramaIndex.value = 0
  selectedHotspotClueIndex.value = 0
}
function addLevel() {
  story.levels.push(createBlankLevel(story.levels.length))
  selectLevel(story.levels.length - 1)
}
function duplicateLevel() {
  const source = selectedLevel.value
  if (!source) return
  story.levels.splice(selectedIndex.value + 1, 0, JSON.parse(JSON.stringify(source)))
  selectLevel(selectedIndex.value + 1)
}
function selectPanorama(index: number): void {
  const count = selectedLevel.value?.panorama.length ?? 0
  if (Number.isInteger(index) && index >= 0 && index < count) panoramaIndex.value = index
}
function addPanorama(): void {
  const level = selectedLevel.value
  const preset = builtInPanoramas[0]
  if (!level || !preset) return
  level.panorama.push({
    name: preset.name,
    url: preset.url,
    ultraviolet_url: preset.ultraviolet_url,
    initial_view: { longitude: 0, latitude: 0, fov: DEFAULT_PANORAMA_FOV },
    click_points: [],
  })
  panoramaIndex.value = level.panorama.length - 1
}
function removePanorama(): void {
  const level = selectedLevel.value
  if (!level || level.panorama.length <= 1) return
  const removedIndex = panoramaIndex.value
  level.panorama.splice(removedIndex, 1)
  level.timeline = level.timeline
    ?.filter((entry) => entry.panorama_index !== removedIndex)
    .map((entry) => ({
      ...entry,
      panorama_index:
        entry.panorama_index > removedIndex ? entry.panorama_index - 1 : entry.panorama_index,
    }))
  panoramaIndex.value = Math.min(removedIndex, level.panorama.length - 1)
}
function applyPanoramaPreset(url: string): void {
  const panorama = selectedPanorama.value
  const preset = builtInPanoramas.find((entry) => entry.url === url)
  if (!panorama || !preset) return
  panorama.name = preset.name
  panorama.url = preset.url
  panorama.ultraviolet_url = preset.ultraviolet_url
}
function removeLevel() {
  if (story.levels.length <= 1) return
  story.levels.splice(selectedIndex.value, 1)
  selectLevel(Math.min(selectedIndex.value, story.levels.length - 1))
}
function moveLevel(offset: number) {
  const next = selectedIndex.value + offset
  if (next < 0 || next >= story.levels.length) return
  const current = story.levels[selectedIndex.value]
  const target = story.levels[next]
  if (!current || !target) return
  story.levels[selectedIndex.value] = target
  story.levels[next] = current
  selectLevel(next)
}
function addTextClue() {
  selectedLevel.value?.clues.push({
    type: 'text',
    name: '新文字线索',
    data: '写下这条线索的内容。',
  })
}
function addClue(type: clue['type']): void {
  if (type === 'text') return addTextClue()
  if (type === 'dialogue') return addDialogueClue()
  const level = selectedLevel.value
  if (!level) return
  if (type === 'combination') {
    level.clues.push({
      type,
      name: '新组合线索',
      data: '组合线索摘要。',
      subclues: [{ type: 'text', name: '组合子线索', data: '子线索内容。' }],
    })
    return
  }
  level.clues.push({
    type,
    name: `新${type === 'image' ? '图像' : type === 'audio' ? '音频' : '视频'}线索`,
    data: type === 'image' ? '/art/clue.svg' : '',
  })
}
function addClickPoint() {
  selectedPanorama.value?.click_points.push({
    vec: new Vector3(10, 0, 0),
    accept_click_range: 1,
    name: '新发现点',
    description: '写下点击后的发现内容。',
    in_uv: false,
  })
}
function addScenePoint(event: MouseEvent): void {
  const panorama = selectedPanorama.value
  const level = selectedLevel.value
  const target = event.currentTarget as HTMLElement | null
  if (!panorama || !level || !target) return
  const rect = target.getBoundingClientRect()
  const x = Math.max(0, Math.min(1, (event.clientX - rect.left) / Math.max(1, rect.width)))
  const y = Math.max(0, Math.min(1, (event.clientY - rect.top) / Math.max(1, rect.height)))
  if (sceneTool.value === 'hotspot') {
    if (!level.clues[selectedHotspotClueIndex.value]) {
      notice.value = '请先添加一条线索，再在场景中放置热点'
      return
    }
    level.hotspots = [
      ...(level.hotspots ?? []),
      {
        clue_index: selectedHotspotClueIndex.value,
        x: Number((x * 100).toFixed(2)),
        y: Number((y * 100).toFixed(2)),
      },
    ]
    return
  }
  const yaw = (x - 0.5) * Math.PI * 2
  const pitch = (0.5 - y) * Math.PI
  const radius = 10
  panorama.click_points.push({
    vec: new Vector3(
      Math.cos(pitch) * Math.sin(yaw) * radius,
      Math.sin(pitch) * radius,
      Math.cos(pitch) * Math.cos(yaw) * radius,
    ),
    accept_click_range: 1,
    name: `场景发现点 ${panorama.click_points.length + 1}`,
    description: '写下点击后出现的发现内容。',
    in_uv: false,
  })
}
function vectorPreviewPosition(vector: { x: number; y: number; z: number }): {
  x: number
  y: number
} {
  const radius = Math.hypot(vector.x, vector.y, vector.z) || 1
  const yaw = Math.atan2(vector.x, vector.z)
  const pitch = Math.asin(Math.max(-1, Math.min(1, vector.y / radius)))
  return { x: (yaw / (Math.PI * 2) + 0.5) * 100, y: (0.5 - pitch / Math.PI) * 100 }
}
function hotspotPreviewPosition(point: hotspot): { x: number; y: number } {
  if ('x' in point && point.x !== undefined) return { x: point.x, y: point.y }
  if ('yaw' in point && point.yaw !== undefined)
    return { x: ((point.yaw + 180) / 360) * 100, y: ((90 - point.pitch) / 180) * 100 }
  return vectorPreviewPosition(point.vec)
}
function markerStyle(position: { x: number; y: number }): Record<string, string> {
  return { left: `${position.x}%`, top: `${position.y}%` }
}
function setPointDialogue(point: NonNullable<typeof selectedPanorama.value>['click_points'][number], id: string) {
  if (id) point.dialogue_id = id
  else delete point.dialogue_id
}
function removeClickPoint(index: number) {
  selectedPanorama.value?.click_points.splice(index, 1)
}
function problemIndexesText(item: clue): string {
  return item.problem_indexes?.join(',') ?? ''
}
function setProblemIndexes(item: clue, event: Event) {
  const value = (event.target as HTMLInputElement).value
  const indexes = value
    .split(',')
    .map((entry) => Number(entry.trim()))
    .filter((entry) => Number.isInteger(entry) && entry >= 0)
  item.problem_indexes = indexes.length ? indexes : undefined
}
function setProblemIndexChecked(item: clue, problemIndex: number, checked: boolean): void {
  const indexes = new Set(item.problem_indexes ?? [])
  if (checked) indexes.add(problemIndex)
  else indexes.delete(problemIndex)
  item.problem_indexes = [...indexes].sort((left, right) => left - right)
  if (item.problem_indexes.length === 0) item.problem_indexes = undefined
}
function addDialogueClue() {
  const id = `dialogue-${Date.now().toString(36)}`
  const nodes: DialogueNode[] = [
    { id: 'start', speaker: '人物', text: '写下人物要说的话。', next: null },
  ]
  selectedLevel.value?.clues.push({
    type: 'dialogue',
    dialogue_id: id,
    name: '新人物对话',
    data: '点击全景中的人物，开始这段对话。',
    dialogue: { start: 'start', nodes },
  })
}
function removeClue(index: number) {
  const level = selectedLevel.value
  if (level) removeClueFromLevel(level, index)
}
function addDialogueNode(item: clue) {
  if (!item.dialogue) return
  let index = item.dialogue.nodes.length + 1
  while (item.dialogue.nodes.some((node) => node.id === `node-${index}`)) index += 1
  item.dialogue.nodes.push({
    id: `node-${index}`,
    speaker: '人物',
    text: '新的对话内容。',
    next: null,
  })
}
function addDialogueOption(node: DialogueNode): void {
  node.options = [...(node.options ?? []), { label: '新的选项', next: null }]
}
function removeDialogueOption(node: DialogueNode, index: number): void {
  node.options?.splice(index, 1)
}
function addProblem(): void {
  selectedLevel.value?.problems.push({
    title: '新的问题',
    select: ['选项一', '选项二', '选项三', '选项四'],
    true_answer: 0,
    reason: '写下判断依据。',
  })
}
function removeProblem(index: number): void {
  const level = selectedLevel.value
  if (!level) return
  level.problems.splice(index, 1)
  const remap = (items: clue[]) => {
    for (const item of items) {
      item.problem_indexes = item.problem_indexes?.flatMap((problemIndex) =>
        problemIndex === index ? [] : [problemIndex > index ? problemIndex - 1 : problemIndex],
      )
      if (item.problem_indexes?.length === 0) delete item.problem_indexes
      if (item.subclues) remap(item.subclues)
    }
  }
  remap(level.clues)
}
function setProblemMode(item: problem, multiple: boolean): void {
  if (multiple) item.true_answers = [item.true_answer]
  else {
    item.true_answer = item.true_answers?.[0] ?? item.true_answer
    delete item.true_answers
  }
}
function toggleCorrectAnswer(item: problem, optionIndex: number, checked: boolean): void {
  const answers = new Set(item.true_answers ?? [item.true_answer])
  if (checked) answers.add(optionIndex)
  else answers.delete(optionIndex)
  if (answers.size === 0) return
  item.true_answers = [...answers].sort((left, right) => left - right)
  item.true_answer = item.true_answers[0] ?? 0
}
function addHotspot(): void {
  const level = selectedLevel.value
  if (!level || level.clues.length === 0) return
  level.hotspots = [...(level.hotspots ?? []), { clue_index: 0, x: 50, y: 50 }]
}
function removeHotspot(index: number): void {
  selectedLevel.value?.hotspots?.splice(index, 1)
}
function addTimelineEntry(): void {
  const level = selectedLevel.value
  if (!level) return
  level.timeline = [
    ...(level.timeline ?? []),
    {
      label: `时间节点 ${(level.timeline?.length ?? 0) + 1}`,
      panorama_index: 0,
      clue_indexes: [],
    },
  ]
}
function removeTimelineEntry(index: number): void {
  selectedLevel.value?.timeline?.splice(index, 1)
}
function toggleTimelineClue(
  entry: NonNullable<NonNullable<typeof selectedLevel.value>['timeline']>[number],
  clueIndex: number,
): void {
  entry.clue_indexes = entry.clue_indexes.includes(clueIndex)
    ? entry.clue_indexes.filter((index) => index !== clueIndex)
    : [...entry.clue_indexes, clueIndex]
}
function removeDialogueNode(item: clue, index: number) {
  if (!item.dialogue || item.dialogue.nodes.length <= 1) return
  const removed = item.dialogue.nodes.splice(index, 1)[0]
  if (!removed) return
  if (removed.id === item.dialogue.start) item.dialogue.start = item.dialogue.nodes[0]?.id ?? ''
  for (const node of item.dialogue.nodes) {
    if (node.next === removed.id) node.next = null
    for (const option of node.options ?? []) {
      if (option.next === removed.id) option.next = null
    }
  }
}
function save() {
  const saved = saveStory(story)
  if (saved) refreshStories()
  notice.value = saved ? '已保存到本机' : '保存失败：请检查故事配置或浏览器本地存储'
  window.setTimeout(() => (notice.value = ''), 1800)
  return saved
}
function exportStory() {
  if (save()) downloadStory(story)
}
function playStory(entry: StoryPackage): void {
  if (!saveStory(entry)) {
    notice.value = '试玩失败：请检查故事配置或浏览器本地存储'
    return
  }
  refreshStories()
  const playable = getStory(entry.id)
  if (!playable) {
    notice.value = '试玩失败：故事包无法读取'
    return
  }
  if (!game.loadStory(playable)) {
    notice.value = '试玩失败：故事包配置无效'
    return
  }
  playingStoryId.value = playable.id
  void router.push(storyPath(playable.id))
}
function playCurrentStory(): void {
  if (!currentStoryValid.value) {
    notice.value = '请先完成故事配置后再试玩'
    return
  }
  playStory(story)
}
function newStory() {
  Object.assign(story, createBlankStory())
  selectedIndex.value = 0
  save()
}
function openSaved(entry: StoryPackage) {
  const loaded = getStory(entry.id) ?? entry
  Object.assign(story, loaded)
  selectedIndex.value = 0
}
function askRemove(entry: StoryPackage) {
  if (!window.confirm(`删除「${entry.name}」？`)) return
  removeStory(entry.id)
  if (playingStoryId.value === entry.id) playingStoryId.value = null
  refreshStories()
}
function openImport() {
  importInput.value?.click()
}
function importStory(event: Event) {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  if (!file) return
  const reader = new FileReader()
  reader.onload = () => {
    input.value = ''
    let raw: unknown
    try {
      raw = JSON.parse(String(reader.result))
    } catch {
      notice.value = '导入失败：文件不是有效的 JSON'
      return
    }
    const result = parseStoryPackage(raw)
    if (!result.story) {
      notice.value = `导入失败：${result.issue?.message ?? '文件不是有效的故事包'}`
      return
    }
    const imported = result.story
    if (!saveStory(imported)) {
      notice.value = '导入失败：故事包无法保存到本机'
      return
    }
    Object.assign(story, imported)
    selectedIndex.value = 0
    refreshStories()
    notice.value = result.issue?.message
      ? `故事已导入：${result.issue.message}`
      : '故事已导入，可点击“开始试玩”'
  }
  reader.onerror = () => {
    input.value = ''
    notice.value = '导入失败：无法读取文件'
  }
  reader.readAsText(file)
}
watch(story, () => saveStory(story), { deep: true })
onMounted(refreshStories)
</script>

<template>
  <main class="studio-page">
    <header class="studio-header">
      <div>
        <p class="eyebrow">STORY WORKSHOP · 用户创作</p>
        <h1>编排一段属于你的故事</h1>
        <p class="muted">关卡、线索与人物对话都保存在本机，导出后可以带走你的故事。</p>
      </div>
      <div class="studio-actions">
        <button class="outline-button" type="button" @click="returnToScene">返回画境</button>
        <button class="outline-button" type="button" @click="newStory">新建故事</button>
        <button class="outline-button" type="button" @click="openImport">导入 JSON</button>
        <button
          class="primary"
          type="button"
          :disabled="!currentStoryValid"
          @click="playCurrentStory"
        >
          开始试玩
        </button>
        <button class="primary" type="button" @click="exportStory">导出故事</button>
        <input
          ref="importInput"
          type="file"
          accept="application/json,.json"
          hidden
          @change="importStory"
        />
      </div>
    </header>

    <p v-if="notice" class="studio-notice" role="status">{{ notice }}</p>

    <section class="studio-grid">
      <aside class="studio-sidebar surface">
        <div class="studio-sidebar-heading">
          <span class="eyebrow">CHAPTERS · 关卡顺序</span>
          <button class="icon-button" aria-label="新增关卡" @click="addLevel">＋</button>
        </div>
        <button
          v-for="(level, index) in story.levels"
          :key="`${level.name}-${index}`"
          class="studio-level-row"
          :class="{ active: selectedIndex === index }"
          @click="selectLevel(index)"
        >
          <span>{{ String(index + 1).padStart(2, '0') }}</span>
          <strong>{{ level.name || '未命名关卡' }}</strong>
          <small>{{ level.clues.length }} 条线索</small>
        </button>
        <p v-if="!story.levels.length" class="muted">还没有关卡。</p>
        <div class="studio-sidebar-footer">
          <button class="outline-button" :disabled="selectedIndex === 0" @click="moveLevel(-1)">
            上移
          </button>
          <button
            class="outline-button"
            :disabled="selectedIndex === story.levels.length - 1"
            @click="moveLevel(1)"
          >
            下移
          </button>
        </div>
      </aside>

      <section class="studio-editor">
        <article class="studio-card surface">
          <p class="eyebrow">STORY IDENTITY · 故事信息</p>
          <div class="studio-form two-columns">
            <label>故事标题<input v-model="story.name" /></label>
            <label>副标题<input v-model="story.subtitle" /></label>
            <label
              >封面图片 URL<input v-model="story.cover_url" placeholder="/art/landscape.svg"
            /></label>
            <label
              >背景图片 URL<input v-model="story.background_url" placeholder="/art/landscape.svg"
            /></label>
            <label class="wide">故事简介<textarea v-model="story.introduction" rows="3" /></label>
          </div>
        </article>

        <article v-if="selectedLevel" class="studio-card surface">
          <div class="studio-card-heading">
            <div>
              <p class="eyebrow">CHAPTER {{ String(selectedIndex + 1).padStart(2, '0') }} · 关卡</p>
              <h2>{{ selectedLevel.name || '未命名关卡' }}</h2>
            </div>
            <div class="studio-inline-actions">
              <button class="outline-button" @click="duplicateLevel">复制</button>
              <button
                class="outline-button"
                :disabled="story.levels.length <= 1"
                @click="removeLevel"
              >
                删除
              </button>
            </div>
          </div>
          <div class="studio-form two-columns">
            <label>关卡名称<input v-model="selectedLevel.name" /></label>
            <label>章节副标题<input v-model="selectedLevel.subtitle" /></label>
            <label>缩略图 URL<input v-model="selectedLevel.thumbnail_url" /></label>
            <label class="wide"
              >关卡描述<textarea v-model="selectedLevel.description" rows="3" />
            </label>
          </div>

          <div class="studio-clues-heading">
            <div>
              <p class="eyebrow">PANORAMAS · 内置画境</p>
              <p class="muted">只能使用应用提供的全景资源，故事导出后可在其他设备直接游玩。</p>
            </div>
            <div class="studio-inline-actions">
              <button class="outline-button" type="button" @click="addPanorama">增加画境</button>
              <button
                class="text-button"
                type="button"
                :disabled="selectedLevel.panorama.length <= 1"
                @click="removePanorama"
              >
                删除当前画境
              </button>
            </div>
          </div>
          <div class="studio-form two-columns" v-if="selectedPanorama">
            <div class="studio-panorama-tabs wide" role="tablist" aria-label="选择画境">
              <button
                v-for="(panorama, index) in selectedLevel.panorama"
                :key="`${panorama.url}-${index}`"
                type="button"
                class="outline-button"
                :class="{ active: panoramaIndex === index }"
                role="tab"
                :aria-selected="panoramaIndex === index"
                @click="selectPanorama(index)"
              >
                {{ index + 1 }} · {{ panorama.name }}
              </button>
            </div>
            <label
              >选择全景
              <select
                :value="selectedPanorama.url"
                @change="applyPanoramaPreset(($event.target as HTMLSelectElement).value)"
              >
                <option v-for="preset in builtInPanoramas" :key="preset.url" :value="preset.url">
                  {{ preset.name }}
                </option>
              </select>
            </label>
            <label>全景名称<input v-model="selectedPanorama.name" /></label>
            <label
              >紫外线效果
              <select v-model="selectedPanorama.ultraviolet_url">
                <option value="">关闭紫外线</option>
                <option :value="selectedPanorama.url">当前全景 · 滤镜模式</option>
                <option
                  v-if="
                    selectedPanorama.ultraviolet_url &&
                    selectedPanorama.ultraviolet_url !== selectedPanorama.url
                  "
                  :value="selectedPanorama.ultraviolet_url"
                >
                  旧版配套图（兼容）
                </option>
              </select>
            </label>
            <label
              >视场角<input
                v-model.number="selectedPanorama.initial_view!.fov"
                type="number"
                min="30"
                max="100"
                step="1"
            /></label>
            <label
              >初始经度<input
                v-model.number="selectedPanorama.initial_view!.longitude"
                type="number"
                min="-180"
                max="180"
                step="1"
            /></label>
            <label
              >初始纬度<input
                v-model.number="selectedPanorama.initial_view!.latitude"
                type="number"
                min="-90"
                max="90"
                step="1"
            /></label>
          </div>
          <div v-if="selectedPanorama" class="studio-scene-tools">
            <div class="studio-inline-actions" role="group" aria-label="场景点击工具">
              <button
                class="outline-button"
                :class="{ active: sceneTool === 'hotspot' }"
                type="button"
                :aria-pressed="sceneTool === 'hotspot'"
                @click="sceneTool = 'hotspot'"
              >
                放置线索热点
              </button>
              <button
                class="outline-button"
                :class="{ active: sceneTool === 'discovery' }"
                type="button"
                :aria-pressed="sceneTool === 'discovery'"
                @click="sceneTool = 'discovery'"
              >
                放置自由发现点
              </button>
            </div>
            <label v-if="sceneTool === 'hotspot'"
              >热点关联线索
              <select
                v-model.number="selectedHotspotClueIndex"
                :disabled="!selectedLevel.clues.length"
              >
                <option
                  v-for="(clue, clueIndex) in selectedLevel.clues"
                  :key="clueIndex"
                  :value="clueIndex"
                >
                  {{ clueIndex + 1 }} · {{ clue.name }}
                </option>
              </select>
            </label>
          </div>
          <div
            v-if="selectedPanorama"
            class="studio-scene-picker"
            role="button"
            tabindex="0"
            :aria-label="
              sceneTool === 'hotspot' ? '点击场景添加线索热点' : '点击场景添加自由发现点'
            "
            @click="addScenePoint"
          >
            <img :src="assetUrl(selectedPanorama.url)" :alt="selectedPanorama.name" />
            <i
              v-for="(hotspot, hotspotIndex) in selectedLevel.hotspots ?? []"
              :key="'scene-hotspot-' + hotspotIndex"
              class="studio-scene-marker hotspot"
              :style="markerStyle(hotspotPreviewPosition(hotspot))"
              :title="
                '热点 ' +
                (hotspotIndex + 1) +
                '：' +
                (selectedLevel.clues[hotspot.clue_index]?.name ?? '线索')
              "
            >
              {{ hotspot.clue_index + 1 }}
            </i>
            <i
              v-for="(point, pointIndex) in selectedPanorama.click_points"
              :key="'scene-point-' + pointIndex"
              class="studio-scene-marker discovery"
              :style="markerStyle(vectorPreviewPosition(point.vec))"
              :title="'发现点 ' + (pointIndex + 1) + '：' + point.name"
            >
              ✦
            </i>
            <span>
              {{
                sceneTool === 'hotspot'
                  ? '点击场景放置所选线索热点'
                  : '点击场景放置自由发现点'
              }}
            </span>
          </div>

          <div class="studio-clues-heading">
            <div>
              <p class="eyebrow">DISCOVERY POINTS · 点击点</p>
              <p class="muted">点击点可以关联人物对话的 dialogue_id。</p>
            </div>
            <button class="outline-button" @click="addClickPoint">增加点击点</button>
          </div>
          <div
            v-for="(point, pointIndex) in selectedPanorama?.click_points ?? []"
            :key="pointIndex"
            class="studio-clue-editor"
          >
            <div class="studio-clue-heading">
              <span class="eyebrow">{{ String(pointIndex + 1).padStart(2, '0') }} · 点击点</span>
              <button class="text-button" @click="removeClickPoint(pointIndex)">删除</button>
            </div>
            <div class="studio-form two-columns">
              <label>名称<input v-model="point.name" /></label>
              <label
                >关联人物对话
                <select
                  :value="point.dialogue_id ?? ''"
                  @change="setPointDialogue(point, ($event.target as HTMLSelectElement).value)"
                >
                  <option value="">不关联对话</option>
                  <option
                    v-for="dialogue in dialogueChoices"
                    :key="dialogue.id"
                    :value="dialogue.id"
                  >
                    {{ dialogue.name }} · {{ dialogue.id }}
                  </option>
                </select></label
              >
              <label>球面 X<input v-model.number="point.vec.x" type="number" step="0.1" /></label>
              <label>球面 Y<input v-model.number="point.vec.y" type="number" step="0.1" /></label>
              <label>球面 Z<input v-model.number="point.vec.z" type="number" step="0.1" /></label>
              <label
                >命中范围<input
                  v-model.number="point.accept_click_range"
                  type="number"
                  min="0"
                  step="0.1"
              /></label>
              <label class="wide">发现说明<textarea v-model="point.description" rows="2" /></label>
            </div>
          </div>

          <div class="studio-clues-heading">
            <div>
              <p class="eyebrow">HOTSPOTS · 线索热点</p>
              <p class="muted">热点把线索投射到全景中，点击后只解锁对应线索。</p>
            </div>
            <button
              class="outline-button"
              type="button"
              :disabled="!selectedLevel.clues.length"
              @click="addHotspot"
            >
              增加热点
            </button>
          </div>
          <div
            v-for="(hotspot, hotspotIndex) in selectedLevel.hotspots ?? []"
            :key="`hotspot-${hotspotIndex}`"
            class="studio-clue-editor"
          >
            <div class="studio-clue-heading">
              <span class="eyebrow">热点 {{ hotspotIndex + 1 }}</span>
              <button class="text-button" type="button" @click="removeHotspot(hotspotIndex)">
                删除
              </button>
            </div>
            <div class="studio-form two-columns">
              <label
                >关联线索<select v-model.number="hotspot.clue_index">
                  <option
                    v-for="(clue, clueIndex) in selectedLevel.clues"
                    :key="clueIndex"
                    :value="clueIndex"
                  >
                    {{ clueIndex + 1 }} · {{ clue.name }}
                  </option>
                </select></label
              >
              <label
                >横向位置<input v-model.number="hotspot.x" type="number" min="0" max="100" step="1"
              /></label>
              <label
                >纵向位置<input v-model.number="hotspot.y" type="number" min="0" max="100" step="1"
              /></label>
            </div>
          </div>

          <div class="studio-clues-heading">
            <div>
              <p class="eyebrow">TIMELINE · 语义时间轴</p>
              <p class="muted">每个节点可关联一个画境和多条线索。</p>
            </div>
            <button class="outline-button" type="button" @click="addTimelineEntry">
              增加时间节点
            </button>
          </div>
          <div
            v-for="(entry, entryIndex) in selectedLevel.timeline ?? []"
            :key="`timeline-${entryIndex}`"
            class="studio-clue-editor"
          >
            <div class="studio-clue-heading">
              <span class="eyebrow">节点 {{ entryIndex + 1 }}</span>
              <button class="text-button" type="button" @click="removeTimelineEntry(entryIndex)">
                删除
              </button>
            </div>
            <div class="studio-form two-columns">
              <label>节点名称<input v-model="entry.label" /></label>
              <label
                >对应画境<select v-model.number="entry.panorama_index">
                  <option
                    v-for="(panorama, index) in selectedLevel.panorama"
                    :key="index"
                    :value="index"
                  >
                    {{ index + 1 }} · {{ panorama.name }}
                  </option>
                </select></label
              >
              <div class="wide timeline-clue-checks">
                <span class="muted">关联线索</span>
                <label v-for="(clue, clueIndex) in selectedLevel.clues" :key="clueIndex">
                  <input
                    type="checkbox"
                    :checked="entry.clue_indexes.includes(clueIndex)"
                    @change="toggleTimelineClue(entry, clueIndex)"
                  />
                  {{ clueIndex + 1 }} · {{ clue.name }}
                </label>
              </div>
            </div>
          </div>

          <div class="studio-clues-heading">
            <div>
              <p class="eyebrow">CLUES · 线索</p>
              <p class="muted">人物对话也是线索，可以从全景点击点关联。</p>
            </div>
            <div class="studio-inline-actions">
              <button class="outline-button" type="button" @click="addClue('text')">文字</button>
              <button class="outline-button" type="button" @click="addClue('image')">图像</button>
              <button class="outline-button" type="button" @click="addClue('audio')">音频</button>
              <button class="outline-button" type="button" @click="addClue('video')">视频</button>
              <button class="outline-button" type="button" @click="addClue('combination')">
                组合
              </button>
              <button class="outline-button" type="button" @click="addClue('dialogue')">
                人物对话
              </button>
            </div>
          </div>
          <div
            v-for="(clue, clueIndex) in selectedLevel.clues"
            :key="clueIndex"
            class="studio-clue-editor"
          >
            <div class="studio-clue-heading">
              <span class="eyebrow"
                >{{ String(clueIndex + 1).padStart(2, '0') }} · {{ clue.type }}</span
              >
              <button class="text-button" @click="removeClue(clueIndex)">删除</button>
            </div>
            <div class="studio-form two-columns">
              <label>线索名称<input v-model="clue.name" /></label>
              <div>
                <span class="studio-field-label">关联题目</span>
                <div class="timeline-clue-checks">
                  <label
                    v-for="(problem, problemIndex) in selectedLevel.problems"
                    :key="problemIndex"
                  >
                    <input
                      type="checkbox"
                      :checked="clue.problem_indexes?.includes(problemIndex)"
                      @change="
                        setProblemIndexChecked(
                          clue,
                          problemIndex,
                          ($event.target as HTMLInputElement).checked,
                        )
                      "
                    />
                    {{ problemIndex + 1 }} · {{ problem.title }}
                  </label>
                </div>
              </div>
              <label class="wide"
                >{{
                  clue.type === 'text'
                    ? '文字内容'
                    : clue.type === 'dialogue'
                      ? '对话引导语'
                      : clue.type === 'combination'
                        ? '组合摘要'
                        : '媒体资源 URL'
                }}
                <textarea v-model="clue.data" rows="2"
              /></label>
              <label>提示<input v-model="clue.hint" placeholder="可选" /></label>
              <label>推荐放置位置<input v-model="clue.placement" placeholder="可选" /></label>
              <label class="wide"
                >媒体与创作备注<input v-model="clue.media_note" placeholder="可选"
              /></label>
            </div>
            <template v-if="clue.type === 'dialogue' && clue.dialogue">
              <label>对话标识<input v-model="clue.dialogue_id" /></label>
              <label
                >起始节点<select v-model="clue.dialogue.start">
                  <option v-for="node in clue.dialogue.nodes" :key="node.id" :value="node.id">
                    {{ node.id }}
                  </option>
                </select></label
              >
              <div
                v-for="(node, nodeIndex) in clue.dialogue.nodes"
                :key="node.id"
                class="dialogue-node-editor"
              >
                <div class="studio-clue-heading">
                  <span>节点 {{ node.id }}</span
                  ><button class="text-button" @click="removeDialogueNode(clue, nodeIndex)">
                    删除节点
                  </button>
                </div>
                <div class="studio-form two-columns">
                  <label>节点 ID<input :value="node.id" readonly /></label>
                  <label>人物<input v-model="node.speaker" /></label>
                  <label>头像 URL<input v-model="node.avatar" /></label>
                  <label
                    >下一节点<select v-model="node.next">
                      <option :value="null">结束</option>
                      <option
                        v-for="candidate in clue.dialogue.nodes"
                        :key="candidate.id"
                        :value="candidate.id"
                      >
                        {{ candidate.id }}
                      </option>
                    </select></label
                  >
                  <label class="wide">对白<textarea v-model="node.text" rows="2" /></label>
                </div>
                <div class="dialogue-options-editor">
                  <div class="studio-clue-heading">
                    <span class="muted">选项跳转</span>
                    <button class="text-button" type="button" @click="addDialogueOption(node)">
                      增加选项
                    </button>
                  </div>
                  <div
                    v-for="(option, optionIndex) in node.options ?? []"
                    :key="`${node.id}-option-${optionIndex}`"
                    class="studio-form two-columns"
                  >
                    <label>选项文字<input v-model="option.label" /></label>
                    <label
                      >跳转节点<select v-model="option.next">
                        <option :value="null">结束</option>
                        <option
                          v-for="candidate in clue.dialogue.nodes"
                          :key="candidate.id"
                          :value="candidate.id"
                        >
                          {{ candidate.id }}
                        </option>
                      </select></label
                    >
                    <button
                      class="text-button"
                      type="button"
                      @click="removeDialogueOption(node, optionIndex)"
                    >
                      删除选项
                    </button>
                  </div>
                </div>
              </div>
              <button class="outline-button" type="button" @click="addDialogueNode(clue)">
                ＋ 增加对话节点
              </button>
            </template>
            <div v-else-if="clue.type === 'combination'" class="combination-editor">
              <p class="muted">组合子线索</p>
              <div
                v-for="(subclue, subIndex) in clue.subclues ?? []"
                :key="subIndex"
                class="studio-form two-columns"
              >
                <label
                  >类型<select v-model="subclue.type">
                    <option value="text">文字</option>
                    <option value="image">图像</option>
                    <option value="audio">音频</option>
                    <option value="video">视频</option>
                  </select></label
                >
                <label>名称<input v-model="subclue.name" /></label>
                <label class="wide">内容<textarea v-model="subclue.data" rows="2" /></label>
              </div>
            </div>
          </div>

          <div class="studio-clues-heading">
            <div>
              <p class="eyebrow">PROBLEMS · 题目</p>
              <p class="muted">题目、选项和解析会随故事包一起导出。</p>
            </div>
            <button class="outline-button" type="button" @click="addProblem">增加题目</button>
          </div>
          <div
            v-for="(problem, problemIndex) in selectedLevel.problems"
            :key="`problem-${problemIndex}`"
            class="studio-clue-editor"
          >
            <div class="studio-clue-heading">
              <span class="eyebrow">题目 {{ problemIndex + 1 }}</span>
              <button class="text-button" type="button" @click="removeProblem(problemIndex)">
                删除
              </button>
            </div>
            <div class="studio-form two-columns">
              <label class="wide">题干<textarea v-model="problem.title" rows="2" /></label>
              <label v-for="(option, optionIndex) in problem.select" :key="optionIndex"
                >选项 {{ String.fromCharCode(65 + optionIndex)
                }}<input v-model="problem.select[optionIndex]"
              /></label>
              <label
                >答题类型<select
                  :value="problem.true_answers ? 'multiple' : 'single'"
                  @change="
                    setProblemMode(
                      problem,
                      ($event.target as HTMLSelectElement).value === 'multiple',
                    )
                  "
                >
                  <option value="single">单选题</option>
                  <option value="multiple">多选题</option>
                </select></label
              >
              <label v-if="!problem.true_answers"
                >正确答案<select v-model.number="problem.true_answer">
                  <option
                    v-for="(_, optionIndex) in problem.select"
                    :key="optionIndex"
                    :value="optionIndex"
                  >
                    {{ String.fromCharCode(65 + optionIndex) }}
                  </option>
                </select></label
              >
              <div v-else class="wide timeline-clue-checks">
                <span class="muted">正确答案（至少选择一项）</span>
                <label v-for="(_, optionIndex) in problem.select" :key="optionIndex">
                  <input
                    type="checkbox"
                    :checked="problem.true_answers.includes(optionIndex)"
                    @change="
                      toggleCorrectAnswer(
                        problem,
                        optionIndex,
                        ($event.target as HTMLInputElement).checked,
                      )
                    "
                  />
                  {{ String.fromCharCode(65 + optionIndex) }} · {{ problem.select[optionIndex] }}
                </label>
              </div>
              <label class="wide">解析<textarea v-model="problem.reason" rows="2" /></label>
            </div>
          </div>
        </article>
      </section>

      <aside class="studio-preview">
        <article class="studio-card surface">
          <p class="eyebrow">PREVIEW · 故事预览</p>
          <img
            class="studio-cover"
            :src="assetUrl(story.cover_url || story.background_url)"
            :alt="story.name"
          />
          <h2>{{ story.name }}</h2>
          <p class="muted">{{ story.subtitle }}</p>
          <p class="studio-preview-copy">{{ story.introduction }}</p>
          <div class="studio-preview-levels">
            <span v-for="(level, index) in story.levels" :key="index"
              >{{ index + 1 }} · {{ level.name }}</span
            >
          </div>
        </article>
        <article class="studio-card surface">
          <p class="eyebrow">MY STORIES · 我的故事</p>
          <p v-if="!savedStories.length" class="muted">保存或导入故事后会显示在这里。</p>
          <div v-for="entry in savedStories" :key="entry.id" class="saved-story-row">
            <button
              class="saved-story-edit"
              :aria-label="`编辑故事「${entry.name}」`"
              @click="openSaved(entry)"
            >
              <strong>{{ entry.name }}</strong
              ><small>{{ entry.subtitle }} · {{ entry.levels.length }} 关</small>
            </button>
            <button
              class="outline-button saved-story-play"
              :aria-label="`试玩故事「${entry.name}」`"
              @click="playStory(entry)"
            >
              试玩
            </button>
            <button class="text-button" aria-label="删除故事" @click="askRemove(entry)">
              删除
            </button>
          </div>
        </article>
      </aside>
    </section>
  </main>
</template>
