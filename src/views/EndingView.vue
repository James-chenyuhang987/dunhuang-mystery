<script setup lang="ts">
import { computed, onMounted } from 'vue'
import { useGameStore } from '@/stores/game'
import { siteConfig } from '@/data/game'
import AppIcon from '@/components/AppIcon.vue'
const game = useGameStore()
const elapsed = computed(() => `${Math.floor(game.elapsedMs / 60000)} 分 ${Math.floor(game.elapsedMs / 1000) % 60} 秒`)
onMounted(() => { game.pauseTimer(); game.persist() })
</script>
<template><main class="ending-page"><div class="ending-art"/><RouterLink to="/" class="ending-home"><AppIcon name="home"/>返回画境</RouterLink><section class="ending-card"><p class="eyebrow">THE ECHOES REMAIN</p><div class="ending-medallion">✧<span>千年<br>回响</span>✧</div><h1>{{ game.completed ? siteConfig.endingHeading : siteConfig.aboutHeading }}</h1><p class="ending-message">{{ game.completed ? '感谢你执灯而来，为沉默的壁画寻回故事。' : '一场关于敦煌、记忆与好奇心的原创探索。' }}<br>愿下一次相逢，仍有风沙与星光为伴。</p><div v-if="game.hasProgress" class="ending-stats"><div><strong>{{ game.correctCount }}</strong><span>正确推断</span></div><div><strong>{{ game.wrongCount }}</strong><span>错误尝试</span></div><div><strong class="time-result">{{ elapsed }}</strong><span>探索用时</span></div></div><div class="credits"><p class="eyebrow">BEHIND THE MURALS · 创作团队</p><div v-for="(author, index) in game.authors" :key="index"><span>{{ author.job }}</span><strong>{{ author.name }}</strong></div></div><p class="ending-disclaimer">故事与壁画均为原创演示，非考古资料。<br>谨向敦煌文化的研究者与守护者致意。</p><RouterLink to="/" class="primary">{{ game.completed ? '再赴敦煌' : '开启探索' }}<AppIcon name="arrow"/></RouterLink><p class="ending-signature">{{ siteConfig.brand }} / {{ siteConfig.brandEnglish }}</p></section></main></template>
