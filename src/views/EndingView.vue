<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { assetUrl } from '@/utils/assets'
import { useRoute } from 'vue-router'
import { useGameStore } from '@/stores/game'
import { gameLocations, siteConfig } from '@/data/game'
import AppIcon from '@/components/AppIcon.vue'
import PostcardGenerator from '@/components/PostcardGenerator.vue'
const game = useGameStore()
const route = useRoute()
const homePath = computed(
  () => `/${typeof route.params.place === 'string' ? route.params.place : 'dunhuang'}/home`,
)
const elapsed = computed(
  () => `${Math.floor(game.elapsedMs / 60000)} 分 ${Math.floor(game.elapsedMs / 1000) % 60} 秒`,
)
const location = computed(
  () => gameLocations.find((entry) => entry.id === game.locationId) ?? gameLocations[0],
)
const postcardBackground = computed(
  () => location.value?.background_url ?? siteConfig.backgroundUrl,
)
const postcardCover = computed(
  () => game.currentLevel?.thumbnail_url ?? game.currentLevel?.panorama[0]?.url,
)
onMounted(() => {
  game.pauseTimer()
  game.persist()
})
</script>
<template>
  <main class="ending-page">
    <div
      class="ending-art"
      :style="{
        backgroundImage: `linear-gradient(#132c2bdd,#122b2af5), url(${assetUrl('/art/landscape.svg')})`,
      }"
    />
    <RouterLink :to="homePath" class="ending-home"><AppIcon name="home" />返回画境</RouterLink>
    <section class="ending-card">
      <p class="eyebrow">THE ECHOES REMAIN</p>
      <div class="ending-medallion">
        ✧<span>千年<br />回响</span>✧
      </div>
      <h1>{{ game.completed ? siteConfig.endingHeading : siteConfig.aboutHeading }}</h1>
      <p class="ending-message">
        {{
          game.completed
            ? `感谢你执灯而来，为${location?.name ?? '古老遗迹'}寻回故事。`
            : `一场关于${location?.name ?? '文化遗产'}、记忆与好奇心的原创探索。`
        }}<br />愿下一次相逢，仍有风沙与星光为伴。
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
      <RouterLink :to="homePath" class="primary"
        >{{ game.completed ? `再赴${location?.name ?? '画境'}` : '开启探索' }}<AppIcon name="arrow"
      /></RouterLink>
      <p class="ending-signature">{{ siteConfig.brand }} / {{ siteConfig.brandEnglish }}</p>
    </section>
  </main>
</template>
