<script setup lang="ts">
import { ref, watch } from 'vue'
import type { LoadedUIPlugin } from '@/plugin/plugins'
import UIPluginWrapper from './UIPluginWrapper.vue'

const props = defineProps<{ plugins: LoadedUIPlugin[] }>()
const active = ref<string | null>(null)
watch(
  () => props.plugins,
  (plugins) => {
    if (!plugins.some((plugin) => plugin.name === active.value)) active.value = null
  },
  { deep: true },
)
function toggle(name: string): void {
  active.value = active.value === name ? null : name
}
</script>
<template>
  <aside v-if="plugins.length" class="plugin-footer-panel" aria-label="插件按钮面板">
    <div class="plugin-footer-buttons" role="toolbar" aria-label="插件">
      <button
        v-for="plugin in plugins"
        :key="plugin.name"
        class="outline-button plugin-footer-button"
        :aria-expanded="active === plugin.name"
        @click="toggle(plugin.name)"
      >
        {{ plugin.title ?? plugin.name }}
      </button>
    </div>
    <UIPluginWrapper
      v-for="plugin in plugins"
      :key="`content-${plugin.name}`"
      :plugins="[plugin]"
      :visible="active === plugin.name"
    />
  </aside>
</template>
