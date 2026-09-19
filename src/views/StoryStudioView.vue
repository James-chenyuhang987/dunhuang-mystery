<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { Vector3 } from 'three'
import { RouterLink } from 'vue-router'
import type { clue, DialogueNode, StoryPackage } from '@/types/game'
import { assetUrl } from '@/utils/assets'
import {
  createBlankLevel,
  createBlankStory,
  downloadStory,
  isStoryPackage,
  readStories,
  removeStory,
  saveStory,
} from '@/utils/storyPackage'

const story = reactive<StoryPackage>(createBlankStory())
const selectedIndex = ref(0)
const notice = ref('')
const importInput = ref<HTMLInputElement | null>(null)
const savedStories = ref<StoryPackage[]>([])
const selectedLevel = computed(() => story.levels[selectedIndex.value])
const selectedPanorama = computed(() => selectedLevel.value?.panorama[0])

function refreshStories() {
  savedStories.value = readStories()
}
function selectLevel(index: number) {
  selectedIndex.value = Math.max(0, Math.min(index, story.levels.length - 1))
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
function addClickPoint() {
  selectedPanorama.value?.click_points.push({
    vec: new Vector3(10, 0, 0),
    accept_click_range: 1,
    name: '新发现点',
    description: '写下点击后的发现内容。',
    in_uv: false,
  })
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
  selectedLevel.value?.clues.splice(index, 1)
}
function addDialogueNode(item: clue) {
  if (!item.dialogue) return
  item.dialogue.nodes.push({
    id: `node-${item.dialogue.nodes.length + 1}`,
    speaker: '人物',
    text: '新的对话内容。',
    next: null,
  })
}
function removeDialogueNode(item: clue, index: number) {
  if (!item.dialogue || item.dialogue.nodes.length <= 1) return
  const removed = item.dialogue.nodes.splice(index, 1)[0]
  if (removed?.id === item.dialogue.start) item.dialogue.start = item.dialogue.nodes[0]?.id ?? ''
}
function save() {
  const saved = saveStory(story)
  if (saved) refreshStories()
  notice.value = saved ? '已保存到本机' : '保存失败：浏览器本地存储不可用或空间不足'
  window.setTimeout(() => (notice.value = ''), 1800)
}
function exportStory() {
  save()
  downloadStory(story)
}
function newStory() {
  Object.assign(story, createBlankStory())
  selectedIndex.value = 0
  save()
}
function openSaved(entry: StoryPackage) {
  Object.assign(story, JSON.parse(JSON.stringify(entry)))
  selectedIndex.value = 0
}
function askRemove(entry: StoryPackage) {
  if (!window.confirm(`删除「${entry.name}」？`)) return
  removeStory(entry.id)
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
    try {
      const parsed: unknown = JSON.parse(String(reader.result))
      if (!isStoryPackage(parsed)) throw new Error('invalid')
      Object.assign(story, parsed)
      selectedIndex.value = 0
      save()
      notice.value = '故事已导入'
    } catch {
      notice.value = '导入失败：文件不是有效的故事包'
    }
    input.value = ''
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
        <RouterLink class="outline-button" to="/dunhuang/home">返回画境</RouterLink>
        <button class="outline-button" @click="newStory">新建故事</button>
        <button class="outline-button" @click="openImport">导入 JSON</button>
        <button class="primary" @click="exportStory">导出故事</button>
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
            <template v-if="selectedPanorama">
              <label>全景名称<input v-model="selectedPanorama.name" /></label>
              <label class="wide">全景图片 URL<input v-model="selectedPanorama.url" /></label>
            </template>
            <label class="wide"
              >关卡描述<textarea v-model="selectedLevel.description" rows="3" />
            </label>
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
              <label>关联对话 ID<input v-model="point.dialogue_id" placeholder="可选" /></label>
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
              <p class="eyebrow">CLUES · 线索</p>
              <p class="muted">人物对话也是线索，可以从全景点击点关联。</p>
            </div>
            <div class="studio-inline-actions">
              <button class="outline-button" @click="addTextClue">文字线索</button
              ><button class="outline-button" @click="addDialogueClue">人物对话</button>
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
              <label
                >关联题目下标
                <input
                  :value="problemIndexesText(clue)"
                  placeholder="例如 0,1"
                  @input="setProblemIndexes(clue, $event)"
                />
              </label>
              <label class="wide">线索摘要<textarea v-model="clue.data" rows="2" /></label>
            </div>
            <template v-if="clue.type === 'dialogue' && clue.dialogue">
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
                  <label>人物<input v-model="node.speaker" /></label>
                  <label>头像 URL<input v-model="node.avatar" /></label>
                  <label class="wide">对白<textarea v-model="node.text" rows="2" /></label>
                </div>
              </div>
              <button class="outline-button" @click="addDialogueNode(clue)">＋ 增加对话节点</button>
            </template>
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
            <button @click="openSaved(entry)">
              <strong>{{ entry.name }}</strong
              ><small>{{ entry.levels.length }} 关</small>
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
