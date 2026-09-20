<script setup lang="ts">
import { computed, inject, nextTick, onBeforeUnmount, onMounted, ref, watch, type Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { siteConfig } from '@/data/game'
import type { ClickPoint, clue, problem } from '@/types/game'
import PanoramaViewer from '@/components/PanoramaViewer.vue'
import CluePanel from '@/components/CluePanel.vue'
import DifficultyControl from '@/components/DifficultyControl.vue'
import AppIcon from '@/components/AppIcon.vue'
import MediaViewer from '@/components/MediaViewer.vue'
import DialogueOverlay from '@/components/DialogueOverlay.vue'
import { getStory, storyRevision } from '@/utils/storyPackage'
const game = useGameStore()
const routeIntroActive = inject<Ref<boolean>>('routeIntroActive', ref(false))
const router = useRouter()
const route = useRoute()
const questionDialog = ref<HTMLDialogElement | null>(null)
const feedback = ref<{
  correct: boolean
  question: problem
  problemIndex: number
  selected: number[]
} | null>(null)
const selectedAnswers = ref<number[]>([])
const question = computed(() => feedback.value?.question ?? game.currentProblem)
const isMultiChoice = computed(() => (question.value?.true_answers?.length ?? 0) > 1)
const correctAnswers = (item: problem) =>
  item.true_answers?.length ? item.true_answers : [item.true_answer]
function resetSelection() {
  selectedAnswers.value = []
}
function toggleAnswer(index: number) {
  if (feedback.value) return
  if (isMultiChoice.value) {
    selectedAnswers.value = selectedAnswers.value.includes(index)
      ? selectedAnswers.value.filter((entry) => entry !== index)
      : [...selectedAnswers.value, index].sort((a, b) => a - b)
  } else {
    submitAnswers([index])
  }
}
function submitAnswers(answers: number[] = selectedAnswers.value) {
  if (
    !game.currentProblem ||
    feedback.value ||
    game.currentProblemIndex === null ||
    answers.length === 0
  )
    return
  const original = game.currentProblem
  const problemIndex = game.currentProblemIndex
  const correct = game.submitAnswer(answers)
  if (correct !== null)
    feedback.value = { correct, question: original, problemIndex, selected: answers }
}
function answer(index: number) {
  toggleAnswer(index)
}
const cluePanels = ref<InstanceType<typeof CluePanel>[]>([])
const highlightedClues = ref<number[]>([])
const activeTimelineIndex = ref(0)
const cluesOpen = ref(false)
const settingsOpen = ref(false)
const archiveOpen = ref(false)
const ultraviolet = ref(false)
const discovery = ref<ClickPoint | null>(null)
const activeDialogue = ref<clue | null>(null)
const discoveryMedia = ref<InstanceType<typeof MediaViewer> | null>(null)
let highlightTimer: number | undefined
let highlightRevision = 0
const placeId = computed(() =>
  typeof route.params.place === 'string' ? route.params.place : 'dunhuang',
)
const storyId = computed(() =>
  typeof route.params.storyId === 'string' ? route.params.storyId : '',
)
const isStoryRoute = computed(() => storyId.value.length > 0)
const homePath = computed(() =>
  isStoryRoute.value
    ? `/story/${encodeURIComponent(storyId.value)}/home`
    : `/${placeId.value}/home`,
)
const thankPath = computed(() =>
  isStoryRoute.value
    ? `/story/${encodeURIComponent(storyId.value)}/thank`
    : `/${placeId.value}/thank`,
)
const gameBackPath = computed(() => (isStoryRoute.value ? homePath.value : '/select'))
const gameBackLabel = computed(() => (isStoryRoute.value ? '返回故事' : '石窟 · 探秘'))
const discoveryClue = computed<clue | null>(() =>
  discovery.value?.image
    ? { type: 'image', name: discovery.value.name, data: discovery.value.image }
    : null,
)
const timelineItems = computed(() => {
  const level = game.currentLevel
  if (!level) return []
  if (level.timeline?.length) return level.timeline
  return level.panorama.map((panorama, index) => ({
    label: panorama.name,
    panorama_index: index,
    clue_indexes: [],
  }))
})
const solvedCount = computed(
  () =>
    game.selectedQuestionIndexes.filter((index) =>
      game.attempts.some(
        (attempt) =>
          attempt.levelIndex === game.currentLevelIndex &&
          attempt.problemIndex === index &&
          attempt.correct,
      ),
    ).length,
)
const elapsed = computed(
  () =>
    `${String(Math.floor(game.elapsedMs / 60000)).padStart(2, '0')}:${String(Math.floor(game.elapsedMs / 1000) % 60).padStart(2, '0')}`,
)
const suggestedClues = computed(() =>
  feedback.value && !feedback.value.correct
    ? (game.currentLevel?.clues.flatMap((clue, index) =>
        clue.problem_indexes?.includes(feedback.value?.problemIndex ?? -1) ? [index] : [],
      ) ?? [])
    : [],
)
function openQuestions() {
  questionDialog.value?.showModal()
}
function skipQuestion() {
  if (!feedback.value) game.skipCurrentProblem()
}
function continueAnswer() {
  feedback.value = null
  resetSelection()
}
function handleClue(index: number): void {
  game.unlockClue(index)
  const clue = game.currentLevel?.clues[index]
  if (clue?.type === 'dialogue') {
    activeDialogue.value = clue
    return
  }
  void revealClue(index)
}
function handleDialogueStart(item: clue): void {
  activeDialogue.value = item
}
function clearClueHighlights(): void {
  highlightRevision += 1
  if (highlightTimer !== undefined) window.clearTimeout(highlightTimer)
  highlightTimer = undefined
  highlightedClues.value = []
}
async function highlightClueIndexes(indexes: number[]): Promise<void> {
  clearClueHighlights()
  const revision = highlightRevision
  const clueCount = game.currentLevel?.clues.length ?? 0
  const targets = [...new Set(indexes)].filter(
    (index) => Number.isInteger(index) && index >= 0 && index < clueCount,
  )
  if (targets.length === 0) return
  const levelIndex = game.currentLevelIndex
  cluesOpen.value = true
  highlightedClues.value = targets
  await nextTick()
  if (revision !== highlightRevision || levelIndex !== game.currentLevelIndex) return
  for (const index of targets) {
    if (game.isClueUnlocked(index)) cluePanels.value[index]?.reveal()
  }
  const firstUnlocked = targets.find((index) => game.isClueUnlocked(index))
  const scrollTarget = firstUnlocked ?? targets[0]!
  cluePanels.value[scrollTarget]?.$el?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  highlightTimer = window.setTimeout(() => {
    if (revision !== highlightRevision) return
    highlightedClues.value = []
    highlightTimer = undefined
  }, 2400)
}
function revealFeedbackClue(index: number): void {
  void revealClue(index)
  questionDialog.value?.close()
}
async function revealClue(index: number) {
  if (!game.isClueUnlocked(index)) return
  await highlightClueIndexes([index])
}
function showDiscovery(pointIndex: number): void {
  const point = game.currentPanorama?.click_points[pointIndex]
  if (!point) return
  if (point.dialogue_id) {
    const clueIndex = game.currentLevel?.clues.findIndex(
      (clue) => clue.type === 'dialogue' && clue.dialogue_id === point.dialogue_id,
    )
    if (clueIndex !== undefined && clueIndex >= 0) {
      game.unlockClue(clueIndex)
      const clue = game.currentLevel?.clues[clueIndex]
      if (clue?.type === 'dialogue') activeDialogue.value = clue
      else void revealClue(clueIndex)
      return
    }
  }
  game.discoverClickPoint(game.currentPanoramaIndex, pointIndex)
  discovery.value = point
}
function switchPanorama(index: number): void {
  if (game.setPanorama(index)) {
    ultraviolet.value = false
    archiveOpen.value = false
    discovery.value = null
    activeDialogue.value = null
  }
}
function selectTimeline(index: number): void {
  const item = timelineItems.value[index]
  if (!item) return
  activeTimelineIndex.value = index
  if (item.panorama_index !== game.currentPanoramaIndex) switchPanorama(item.panorama_index)
  else archiveOpen.value = false
  if (game.currentLevel?.timeline?.length) cluesOpen.value = true
  if (item.clue_indexes.length > 0) void highlightClueIndexes(item.clue_indexes)
  else clearClueHighlights()
}
function toggleUltraviolet(): void {
  if (!game.currentPanorama?.ultraviolet_url) return
  ultraviolet.value = !ultraviolet.value
  discovery.value = null
}
function handleUltravioletError(): void {
  ultraviolet.value = false
  discovery.value = null
}
function savePostcardFrame(dataUrl: string): void {
  game.captureFrame(dataUrl)
}
async function openDiscoveryImage(): Promise<void> {
  await nextTick()
  discoveryMedia.value?.open()
}
function nextLevel() {
  feedback.value = null
  questionDialog.value?.close()
  if (game.advanceLevel()) void router.push(thankPath.value)
}
function ensureRuntimeSource(): boolean {
  if (isStoryRoute.value) {
    const story = getStory(storyId.value)
    if (!story) {
      void router.replace('/studio')
      return false
    }
    const revision = storyRevision(story)
    if (
      game.sourceKind !== 'ugc' ||
      game.sourceId !== story.id ||
      game.sourceRevision !== revision
    ) {
      if (!game.loadStory(story)) {
        void router.replace('/studio')
        return false
      }
    } else game.restoreSource()
    return true
  }
  if (game.locationId !== placeId.value || game.sourceKind !== 'builtin')
    return game.loadBuiltin(placeId.value)
  // A direct refresh can mount this view before App's route watcher restores
  // the source. Re-read the matching namespace here to avoid redirecting to
  // the home page with an empty in-memory store.
  game.restoreSource()
  return true
}
watch(
  () => game.difficulty,
  () => {
    feedback.value = null
    resetSelection()
  },
)
watch(
  () => game.currentProblemIndex,
  () => resetSelection(),
)
watch(activeDialogue, (active) => {
  if (active) game.pauseTimer()
  else if (!document.hidden && game.hasProgress && !game.completed) game.resumeTimer()
})
watch(
  () => [game.locationId, game.currentLevelIndex] as const,
  () => {
    clearClueHighlights()
    activeTimelineIndex.value = Math.max(
      0,
      timelineItems.value.findIndex((item) => item.panorama_index === game.currentPanoramaIndex),
    )
    cluesOpen.value = false
    archiveOpen.value = false
    ultraviolet.value = false
    discovery.value = null
    activeDialogue.value = null
  },
)
onMounted(async () => {
  if (!ensureRuntimeSource()) return
  if (!game.hasProgress) {
    await router.replace(homePath.value)
    return
  }
  if (game.completed) {
    await router.replace(thankPath.value)
    return
  }
  activeTimelineIndex.value = Math.max(
    0,
    timelineItems.value.findIndex((item) => item.panorama_index === game.currentPanoramaIndex),
  )
  if (!routeIntroActive.value) game.resumeTimer()
  await nextTick()
})
watch(routeIntroActive, (active) => {
  if (active) game.pauseTimer()
  else if (route.meta.section === 'game' && !document.hidden && game.hasProgress && !game.completed)
    game.resumeTimer()
})
onBeforeUnmount(() => {
  clearClueHighlights()
  game.pauseTimer()
  game.persist()
})
</script>
<template>
  <main v-if="game.currentLevel" class="game-page">
    <PanoramaViewer
      :url="game.currentPanorama?.url ?? ''"
      :ultraviolet-url="game.currentPanorama?.ultraviolet_url"
      :initial-view="game.currentPanorama?.initial_view"
      :hotspots="game.currentLevel.hotspots"
      :click-points="game.currentPanorama?.click_points"
      :ultraviolet="ultraviolet"
      @clue="handleClue"
      @discover="showDiscovery"
      @uv-error="handleUltravioletError"
      @capture="savePostcardFrame"
    />
    <div class="game-vignette" />
    <DialogueOverlay v-if="activeDialogue" :item="activeDialogue" @close="activeDialogue = null" />
    <header class="game-header">
      <RouterLink :to="gameBackPath" class="game-back"
        ><AppIcon name="home" /><span>{{ gameBackLabel }}</span></RouterLink
      >
      <div class="game-title">
        <span class="eyebrow"
          >CHAPTER {{ String(game.currentLevelIndex + 1).padStart(2, '0') }}</span
        >
        <h1>{{ game.currentLevel.name }}</h1>
      </div>
      <button
        class="outline-button"
        :aria-expanded="settingsOpen"
        @click="settingsOpen = !settingsOpen"
      >
        难度 · {{ ['初探', '寻踪', '解谜'][game.difficulty - 1] }}
      </button>
    </header>
    <aside v-if="settingsOpen" class="game-settings surface" @pointerdown.stop @wheel.stop>
      <DifficultyControl :level-index="game.currentLevelIndex" :editable="false" />
      <p class="muted">当前难度在开始游戏时确定，游戏中仅供查看。</p>
    </aside>
    <aside
      id="clue-drawer"
      class="clue-drawer"
      :class="{ collapsed: !cluesOpen }"
      @pointerdown.stop
      @wheel.stop
    >
      <button
        class="clue-drawer-heading clue-drawer-desktop-toggle"
        aria-label="探秘手札"
        :aria-expanded="cluesOpen"
        @click="cluesOpen = !cluesOpen"
      >
        <span><AppIcon name="book" />探秘手札</span
        ><small
          >{{ game.currentLevel.clues.length }} 条线索 &nbsp; {{ cluesOpen ? '−' : '＋' }}</small
        >
      </button>
      <div v-if="cluesOpen" class="clues-scroll">
        <p class="eyebrow">拾起线索，让历史开口。点选全景中的编号也可直达线索。</p>
        <CluePanel
          v-for="(clue, index) in game.currentLevel.clues"
          ref="cluePanels"
          :key="`${game.currentLevelIndex}-${index}`"
          :item="clue"
          :index="index"
          :locked="!game.isClueUnlocked(index)"
          :highlighted="highlightedClues.includes(index)"
          external-dialogue
          @dialogue-start="handleDialogueStart"
        />
      </div>
    </aside>
    <Transition name="fade"
      ><aside
        v-if="discovery"
        class="discovery-card surface"
        role="status"
        @pointerdown.stop
        @wheel.stop
      >
        <button class="icon-button" aria-label="关闭发现详情" @click="discovery = null">
          <AppIcon name="close" />
        </button>
        <p class="eyebrow">HIDDEN DISCOVERY · 新发现</p>
        <h2>{{ discovery.name }}</h2>
        <p>{{ discovery.description }}</p>
        <button v-if="discovery.image" class="outline-button" @click="openDiscoveryImage">
          查看发现图像
        </button>
      </aside></Transition
    >
    <div class="panorama-guide">
      <AppIcon name="compass" /><span>拖动环顾 · 点击寻迹 · 双指 / 滚轮缩放</span
      ><small>360° IMMERSIVE EXPLORATION</small>
    </div>
    <footer class="game-toolbar">
      <button
        class="archive-toggle outline-button"
        aria-label="时间与观察"
        :aria-expanded="archiveOpen"
        aria-controls="archive-controls"
        @click="archiveOpen = !archiveOpen"
      >
        <AppIcon name="archive" />时间与观察<span>{{ archiveOpen ? '−' : '＋' }}</span>
      </button>
      <button
        class="mobile-clue-toggle outline-button"
        aria-label="探秘手礼"
        :aria-expanded="cluesOpen"
        aria-controls="clue-drawer"
        @click="cluesOpen = !cluesOpen"
      >
        <AppIcon name="book" />探秘手礼
      </button>
      <section id="archive-controls" class="archive-controls" :class="{ open: archiveOpen }">
        <nav v-if="timelineItems.length" class="panorama-timeline" aria-label="全景时间轴">
          <p class="eyebrow">TIME ARCHIVE · 时间轴</p>
          <div>
            <button
              v-for="(item, index) in timelineItems"
              :key="`${item.panorama_index}-${index}-${item.label}`"
              :class="{ active: activeTimelineIndex === index }"
              :aria-current="activeTimelineIndex === index ? 'step' : undefined"
              @click="selectTimeline(index)"
            >
              <span class="timeline-index">{{ String(index + 1).padStart(2, '0') }}</span
              ><span class="timeline-label">{{ item.label }}</span>
            </button>
          </div>
        </nav>
        <div class="panorama-mode-controls">
          <button
            v-if="game.currentPanorama?.ultraviolet_url"
            class="outline-button ultraviolet-button"
            :class="{ active: ultraviolet }"
            :aria-pressed="ultraviolet"
            @click="toggleUltraviolet"
          >
            {{ ultraviolet ? '退出紫外线' : '开启紫外线' }}
          </button>
          <span class="discovery-count"
            >已发现 <strong>{{ game.discoveredCount }}</strong> / 共
            {{ game.totalDiscoveryCount }}</span
          >
        </div>
      </section>
      <div class="game-stats">
        <span
          >已解谜题<strong
            >{{ solvedCount }} <small>/ {{ game.selectedQuestionIndexes.length }}</small></strong
          ></span
        ><span
          >探索用时<strong>{{ elapsed }}</strong></span
        ><span class="attempt-stats"
          >答对 / 答错<strong
            >{{ game.correctCount }} <small>/ {{ game.wrongCount }}</small></strong
          ></span
        >
      </div>
      <button class="primary question-trigger" @click="openQuestions">
        <AppIcon name="eye" />{{
          game.levelSolved
            ? game.currentLevel.problems.length
              ? '本卷已解 · 继续探索'
              : '完成本关'
            : '开启谜题'
        }}<AppIcon name="arrow" />
      </button>
    </footer>
    <dialog
      ref="questionDialog"
      class="question-dialog surface"
      aria-labelledby="question-title"
      @close="feedback = null"
    >
      <button
        class="icon-button dialog-close"
        aria-label="关闭题目"
        @click="questionDialog?.close()"
      >
        <AppIcon name="close" />
      </button>
      <p class="eyebrow">THE MISSING PIECE · {{ game.currentLevel.name }}</p>
      <DifficultyControl :level-index="game.currentLevelIndex" :editable="false" />
      <template v-if="question">
        <div class="question-progress">
          解谜进度 {{ solvedCount }} / {{ game.selectedQuestionIndexes.length }}
        </div>
        <h2 id="question-title">{{ question.title }}</h2>
        <p class="muted">
          {{ isMultiChoice ? '多选题 · 请选择 2–3 个选项后提交。' : '单选题 · 请选择一个选项。' }}
        </p>
        <div class="answer-list" :class="{ 'multi-choice': isMultiChoice }">
          <button
            v-for="(option, index) in question.select"
            :key="index"
            class="answer-option"
            :class="{
              selected: selectedAnswers.includes(index),
              correct: feedback && correctAnswers(question).includes(index),
              incorrect:
                feedback &&
                !feedback.correct &&
                feedback.selected.includes(index) &&
                !correctAnswers(question).includes(index),
            }"
            :disabled="!!feedback"
            @click="answer(index)"
          >
            <span class="answer-marker">{{ String.fromCharCode(65 + index) }}</span
            >{{ option
            }}<AppIcon v-if="feedback && correctAnswers(question).includes(index)" name="check" />
          </button>
        </div>
        <button
          v-if="!feedback && isMultiChoice"
          class="primary submit-answer"
          :disabled="selectedAnswers.length < 2"
          @click="submitAnswers()"
        >
          提交
        </button>
        <button v-if="!feedback" class="text-button skip-question" @click="skipQuestion">
          跳过此题 →
        </button>
        <div
          v-if="feedback"
          class="answer-feedback"
          :class="{ wrong: !feedback.correct }"
          role="status"
        >
          <strong>{{
            feedback.correct ? '推断正确 · 线索已连接' : '推断有误 · 查看对应线索'
          }}</strong>
          <p v-if="!feedback.correct" class="answer-note">
            本题已经记录为错误，正确答案已用绿色标记。
          </p>
          <p class="answer-explanation">
            <strong>题目解析：</strong>{{ feedback.question.reason }}
          </p>
          <div v-if="suggestedClues.length" class="feedback-clues">
            <button
              v-for="index in suggestedClues"
              :key="index"
              class="outline-button"
              :disabled="!game.isClueUnlocked(index)"
              @click="revealFeedbackClue(index)"
            >
              {{
                game.isClueUnlocked(index)
                  ? `线索 ${String(index + 1).padStart(2, '0')} · ${game.currentLevel.clues[index]?.name}`
                  : `线索 ${String(index + 1).padStart(2, '0')} · 尚未解锁`
              }}
            </button>
          </div>
          <button class="primary" @click="continueAnswer">
            {{ game.levelSolved ? '查看本卷结果' : '下一道谜题' }}<AppIcon name="arrow" />
          </button>
        </div>
      </template>
      <template v-else-if="game.levelSolved"
        ><div class="completion-symbol">✧</div>
        <h2 id="question-title">
          {{
            game.currentLevel.problems.length
              ? siteConfig.chapterCompleteHeading
              : '本关没有题目，可自由探索。'
          }}
        </h2>
        <p>散落的线索在你的手中，重新连成了故事。</p>
        <p class="muted">
          已完成「{{ game.currentLevel.name }}」本档全部
          {{ game.selectedQuestionIndexes.length }} 道谜题。
        </p>
        <button class="primary" @click="nextLevel">
          {{
            game.mode === 'campaign' && game.currentLevelIndex < game.levels.length - 1
              ? '完成本关 · 前往下一关'
              : '落款 · 查看探索回响'
          }}<AppIcon name="arrow" /></button
      ></template>
    </dialog>
    <MediaViewer v-if="discoveryClue" ref="discoveryMedia" :item="discoveryClue" />
  </main>
</template>
