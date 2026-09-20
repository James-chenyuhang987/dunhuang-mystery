<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { assetUrl } from '@/utils/assets'
import { useRoute } from 'vue-router'
import { useRouter } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { gameLocations, siteConfig } from '@/data/game'
import AppIcon from '@/components/AppIcon.vue'
import PostcardGenerator from '@/components/PostcardGenerator.vue'
import { getStory, storyRevision } from '@/utils/storyPackage'
import dunhuangSettlementVideoUrl from '../../结算动画/敦煌结算.mp4?url'
import yungangSettlementVideoUrl from '../../结算动画/云冈结算.mp4?url'
const game = useGameStore()
const route = useRoute()
const router = useRouter()
const settlementVideo = ref<HTMLVideoElement | null>(null)
const endingBackgroundUrl = ref(assetUrl(siteConfig.backgroundUrl))
let backgroundRevision = 0
const settlementPlaying = ref(false)
let settlementTimer: number | undefined
let settlementFinished = false
const storyId = computed(() =>
  typeof route.params.storyId === 'string' ? route.params.storyId : '',
)
const isStoryRoute = computed(() => storyId.value.length > 0)
const homePath = computed(() =>
  isStoryRoute.value
    ? `/story/${encodeURIComponent(storyId.value)}/home`
    : `/${typeof route.params.place === 'string' ? route.params.place : 'dunhuang'}/home`,
)
const settlementVideoUrl = computed(() => {
  if (isStoryRoute.value) return ''
  const place = typeof route.params.place === 'string' ? route.params.place : 'dunhuang'
  if (place === 'yungang') return yungangSettlementVideoUrl
  if (place === 'dunhuang') return dunhuangSettlementVideoUrl
  return ''
})
const shouldPlaySettlement = computed(() => game.completed && settlementVideoUrl.value.length > 0)
const elapsed = computed(
  () => `${Math.floor(game.elapsedMs / 60000)} 分 ${Math.floor(game.elapsedMs / 1000) % 60} 秒`,
)
const location = computed(() => {
  if (isStoryRoute.value) {
    const story = getStory(storyId.value) ?? game.activeStory
    if (story?.id === storyId.value)
      return {
        id: story.id,
        name: story.name,
        subtitle: story.subtitle,
        coordinates: story.coordinates,
        background_url: story.background_url,
      }
  }
  return gameLocations.find((entry) => entry.id === game.locationId) ?? gameLocations[0]
})
const postcardBackground = computed(
  () => location.value?.background_url ?? siteConfig.backgroundUrl,
)
const postcardCover = computed(
  () =>
    game.capturedFrame || game.currentLevel?.thumbnail_url || game.currentLevel?.panorama[0]?.url,
)
const postcardSections = computed(() => [
  { label: '正确推断', value: game.correctCount },
  { label: '错误尝试', value: game.wrongCount },
  { label: '跳过题目', value: game.skippedCount },
  { label: '探索用时', value: elapsed.value },
])
const postcardShareValue = computed(() =>
  typeof window === 'undefined'
    ? `/#${homePath.value}`
    : `${window.location.origin}${import.meta.env.BASE_URL}#${homePath.value}`,
)
const displayHeading = computed(() =>
  isStoryRoute.value
    ? (game.activeStory?.name ?? location.value?.name ?? siteConfig.title)
    : game.completed
      ? siteConfig.endingHeading
      : siteConfig.aboutHeading,
)
const displayAuthor = computed(() =>
  isStoryRoute.value ? (game.activeStory?.authors[0]?.name ?? '故事作者') : '',
)

function resolveEndingBackground(source: string): void {
  const revision = ++backgroundRevision
  const fallback = assetUrl(siteConfig.backgroundUrl)
  const image = new Image()
  image.onload = () => {
    if (revision === backgroundRevision) endingBackgroundUrl.value = assetUrl(source)
  }
  image.onerror = () => {
    if (revision === backgroundRevision) endingBackgroundUrl.value = fallback
  }
  image.src = assetUrl(source || siteConfig.backgroundUrl)
}
function clearSettlementTimer(): void {
  if (settlementTimer !== undefined) window.clearTimeout(settlementTimer)
  settlementTimer = undefined
}
function finishSettlement(): void {
  if (!settlementPlaying.value || settlementFinished) return
  settlementFinished = true
  clearSettlementTimer()
  settlementVideo.value?.pause()
  void router.push(homePath.value).finally(() => {
    settlementPlaying.value = false
  })
}
async function playSettlement(): Promise<void> {
  if (!shouldPlaySettlement.value || settlementPlaying.value) return
  settlementFinished = false
  settlementPlaying.value = true
  clearSettlementTimer()
  settlementTimer = window.setTimeout(finishSettlement, 20000)
  await nextTick()
  const video = settlementVideo.value
  if (!video) {
    finishSettlement()
    return
  }
  try {
    await video.play()
  } catch {
    video.muted = true
    try {
      await video.play()
    } catch {
      finishSettlement()
    }
  }
}
onMounted(() => {
  resolveEndingBackground(postcardBackground.value)
  const story = isStoryRoute.value ? getStory(storyId.value) : null
  if (isStoryRoute.value) {
    if (!story) {
      void router.replace('/studio')
      return
    }
    const revision = storyRevision(story)
    if (
      game.sourceKind !== 'ugc' ||
      game.sourceId !== story.id ||
      game.sourceRevision !== revision
    ) {
      if (!game.loadStory(story)) {
        void router.replace('/studio')
        return
      }
    } else game.restoreSource()
  } else if (
    game.locationId !== (route.params.place ?? 'dunhuang') ||
    game.sourceKind !== 'builtin'
  ) {
    if (!game.loadBuiltin(String(route.params.place ?? 'dunhuang'))) return
  } else game.restoreSource()
  game.pauseTimer()
  game.persist()
})
watch(postcardBackground, (value) => resolveEndingBackground(value))
onBeforeUnmount(() => {
  clearSettlementTimer()
  settlementVideo.value?.pause()
})
</script>
<template>
  <main class="ending-page">
    <div
      class="ending-art"
      :style="{
        backgroundImage: `linear-gradient(#132c2bdd,#122b2af5), url(${endingBackgroundUrl})`,
      }"
    />
    <RouterLink :to="homePath" class="ending-home"><AppIcon name="home" />返回画境</RouterLink>
    <section class="ending-card">
      <p class="eyebrow">THE ECHOES REMAIN</p>
      <div class="ending-medallion">
        ✧<span>千年<br />回响</span>✧
      </div>
      <h1>{{ displayHeading }}</h1>
      <p class="ending-message">
        {{
          game.completed
            ? `感谢你执灯而来，为${location?.name ?? '古老遗迹'}寻回故事。`
            : `一场关于${location?.name ?? '文化遗产'}、记忆与好奇心的原创探索。`
        }}<span v-if="displayAuthor"> · 作者：{{ displayAuthor }}</span
        ><br />愿下一次相逢，仍有风沙与星光为伴。
      </p>
      <div v-if="game.hasProgress" class="ending-stats">
        <div>
          <strong>{{ game.correctCount }}</strong
          ><span>正确推断</span>
        </div>
        <div>
          <strong>{{ game.wrongCount }}</strong
          ><span>错误尝试</span>
        </div>
        <div>
          <strong>{{ game.skippedCount }}</strong
          ><span>跳过题目</span>
        </div>
        <div>
          <strong class="time-result">{{ elapsed }}</strong
          ><span>探索用时</span>
        </div>
      </div>
      <PostcardGenerator
        v-if="game.hasProgress"
        :title="game.currentLevel?.name ?? siteConfig.title"
        :location="location?.name ?? '故事工坊'"
        :background-url="postcardBackground"
        :cover-url="postcardCover"
        :completed="game.completed"
        :correct="game.correctCount"
        :wrong="game.wrongCount"
        :skipped="game.skippedCount"
        :elapsed="elapsed"
        :sections="postcardSections"
        :qr-value="postcardShareValue"
      />
      <div class="credits">
        <p class="eyebrow">BEHIND THE MURALS · 创作团队</p>
        <div v-for="(author, index) in game.authors" :key="index">
          <span>{{ author.job }}</span
          ><strong>{{ author.name }}</strong>
        </div>
      </div>
      <p class="ending-disclaimer">
        故事与画境均为原创演示，非考古资料。<br />谨向文化遗产的研究者与守护者致意。
      </p>
      <button v-if="shouldPlaySettlement" type="button" class="primary" @click="playSettlement">
        {{ `再赴${location?.name ?? '画境'}` }}<AppIcon name="arrow" />
      </button>
      <RouterLink v-else :to="homePath" class="primary"
        >{{ game.completed ? `再赴${location?.name ?? '画境'}` : '开启探索' }}<AppIcon name="arrow"
      /></RouterLink>
      <p class="ending-signature">{{ siteConfig.brand }} / {{ siteConfig.brandEnglish }}</p>
    </section>
    <section
      v-if="settlementPlaying"
      class="settlement-transition"
      :aria-label="`${location?.name ?? '画境'}结算动画`"
    >
      <video
        ref="settlementVideo"
        :src="settlementVideoUrl"
        preload="auto"
        autoplay
        playsinline
        disablepictureinpicture
        controlslist="nodownload nofullscreen noplaybackrate"
        @ended="finishSettlement"
        @error="finishSettlement"
      />
      <div class="settlement-transition-meta">
        <button type="button" class="skip-intro" @click="finishSettlement">跳过视频 →</button>
      </div>
    </section>
  </main>
</template>
