<script setup lang="ts">
import { onBeforeUnmount, ref, watch } from 'vue'
import { assetUrl } from '@/utils/assets'
const props = defineProps<{ url: string; name: string }>()
const failed = ref(false)
const revision = ref(0)
let timeout: ReturnType<typeof setTimeout> | undefined
function loaded() { clearTimeout(timeout) }
function fail() { loaded(); failed.value = true }
function retry() { loaded(); failed.value = false; revision.value++; timeout = setTimeout(fail, 30000) }
watch(() => props.url, retry, { immediate: true })
onBeforeUnmount(loaded)
</script>
<template>
  <span class="chapter-preview">
    <span v-if="failed" class="thumbnail-error">预览加载失败<button type="button" aria-label="重新加载关卡预览" @click.stop="retry">重试</button></span>
    <img v-else :key="revision" :src="assetUrl(url)" :alt="name" @load="loaded" @error="fail">
  </span>
</template>
