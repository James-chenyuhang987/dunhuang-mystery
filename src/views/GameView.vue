<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { siteConfig } from '@/data/game'
import type { problem } from '@/types/game'
import PanoramaViewer from '@/components/PanoramaViewer.vue'
import CluePanel from '@/components/CluePanel.vue'
import DifficultyControl from '@/components/DifficultyControl.vue'
import AppIcon from '@/components/AppIcon.vue'
const game = useGameStore()
const router = useRouter()
const questionDialog = ref<HTMLDialogElement | null>(null)
const feedback = ref<{ correct: boolean; question: problem; selected: number } | null>(null)
const cluesOpen = ref(true)
const settingsOpen = ref(false)
const question = computed(() => feedback.value?.question ?? game.currentProblem)
const solvedCount = computed(() => game.selectedQuestionIndexes.filter(index => game.attempts.some(attempt => attempt.levelIndex === game.currentLevelIndex && attempt.problemIndex === index && attempt.correct)).length)
const elapsed = computed(() => `${String(Math.floor(game.elapsedMs / 60000)).padStart(2, '0')}:${String(Math.floor(game.elapsedMs / 1000) % 60).padStart(2, '0')}`)
function openQuestions() { questionDialog.value?.showModal() }
function answer(index: number) {
  if (!game.currentProblem || feedback.value) return
  const original = game.currentProblem
  const correct = game.submitAnswer(index)
  if (correct !== null) feedback.value = { correct, question: original, selected: index }
}
function continueAnswer() { feedback.value = null }
function nextLevel() { feedback.value = null; questionDialog.value?.close(); if (game.advanceLevel()) void router.push('/ending') }
watch(() => game.difficulty, () => { feedback.value = null })
watch(() => game.currentLevelIndex, () => { cluesOpen.value = true })
onMounted(async () => {
  if (!game.hasProgress) { await router.replace('/'); return }
  if (game.completed) { await router.replace('/ending'); return }
  game.resumeTimer()
  await nextTick()
})
onBeforeUnmount(() => { game.pauseTimer(); game.persist() })
</script>
<template>
  <main v-if="game.currentLevel" class="game-page">
    <PanoramaViewer :url="game.currentLevel.panorama_url" />
    <div class="game-vignette" />
    <header class="game-header">
      <RouterLink to="/" class="game-back"><AppIcon name="home"/><span>返回画境</span></RouterLink>
      <div class="game-title"><span class="eyebrow">CHAPTER {{ String(game.currentLevelIndex + 1).padStart(2, '0') }}</span><h1>{{ game.currentLevel.name }}</h1></div>
      <button class="outline-button" :aria-expanded="settingsOpen" @click="settingsOpen = !settingsOpen">难度 · {{ ['初探', '寻踪', '解谜'][game.difficulty - 1] }}</button>
    </header>
    <aside v-if="settingsOpen" class="game-settings surface" @pointerdown.stop @wheel.stop><DifficultyControl :level-index="game.currentLevelIndex"/><p class="muted">切换难度会调整本关题数，保留答题记录。</p></aside>
    <aside class="clue-drawer" :class="{ collapsed: !cluesOpen }" @pointerdown.stop @wheel.stop>
      <button class="clue-drawer-heading" :aria-expanded="cluesOpen" @click="cluesOpen = !cluesOpen"><span><AppIcon name="book"/>探秘手札</span><small>{{ game.currentLevel.clues.length }} 条线索 &nbsp; {{ cluesOpen ? '−' : '＋' }}</small></button>
      <div v-if="cluesOpen" class="clues-scroll"><p class="eyebrow">拾起线索，让壁画开口。</p><CluePanel v-for="(clue, index) in game.currentLevel.clues" :key="`${game.currentLevelIndex}-${index}`" :item="clue" :index="index"/></div>
    </aside>
    <div class="panorama-guide"><AppIcon name="compass"/><span>拖动环顾 · 双指 / 滚轮缩放</span><small>360° IMMERSIVE EXPLORATION</small></div>
    <footer class="game-toolbar"><div class="game-stats"><span>已解谜题<strong>{{ solvedCount }} <small>/ {{ game.selectedQuestionIndexes.length }}</small></strong></span><span>探索用时<strong>{{ elapsed }}</strong></span><span class="attempt-stats">答对 / 答错<strong>{{ game.correctCount }} <small>/ {{ game.wrongCount }}</small></strong></span></div><button class="primary" @click="openQuestions"><AppIcon name="eye"/>{{ game.levelSolved ? (game.currentLevel.problems.length ? '本卷已解 · 继续探索' : '完成本关') : '开启谜题' }}<AppIcon name="arrow"/></button></footer>
    <dialog ref="questionDialog" class="question-dialog surface" aria-labelledby="question-title" @close="feedback = null">
      <button class="icon-button dialog-close" aria-label="关闭题目" @click="questionDialog?.close()"><AppIcon name="close"/></button>
      <p class="eyebrow">THE MISSING PIECE · {{ game.currentLevel.name }}</p>
      <DifficultyControl :level-index="game.currentLevelIndex"/>
      <template v-if="question">
        <div class="question-progress">解谜进度 {{ solvedCount }} / {{ game.selectedQuestionIndexes.length }}</div>
        <h2 id="question-title">{{ question.title }}</h2><p class="muted">结合手札中的线索，选择你的推断。</p>
        <div class="answer-list"><button v-for="(option, index) in question.select" :key="index" class="answer-option" :class="{ correct: feedback && index === question.true_answer, incorrect: feedback && !feedback.correct && feedback.selected === index }" :disabled="!!feedback" @click="answer(index)"><span>{{ index + 1 }}</span>{{ option }}<AppIcon v-if="feedback && index === question.true_answer" name="check"/></button></div>
        <div v-if="feedback" class="answer-feedback" :class="{ wrong: !feedback.correct }" role="status"><strong>{{ feedback.correct ? '推断正确 · 线索已连接' : '尚差一步 · 再看看线索' }}</strong><p>{{ feedback.question.reason }}</p><button class="primary" @click="continueAnswer">{{ feedback.correct ? (game.levelSolved ? '查看本卷结果' : '下一道谜题') : '再次推断' }}<AppIcon name="arrow"/></button></div>
      </template>
      <template v-else-if="game.levelSolved"><div class="completion-symbol">✧</div><h2 id="question-title">{{ game.currentLevel.problems.length ? siteConfig.chapterCompleteHeading : '本关没有题目，可自由探索。' }}</h2><p>散落的线索在你的手中，重新连成了故事。</p><p class="muted">已完成「{{ game.currentLevel.name }}」本档全部 {{ game.selectedQuestionIndexes.length }} 道谜题。</p><button class="primary" @click="nextLevel">{{ game.mode === 'campaign' && game.currentLevelIndex < game.levels.length - 1 ? '完成本关 · 前往下一关' : '落款 · 查看探索回响' }}<AppIcon name="arrow"/></button></template>
    </dialog>
  </main>
</template>
