<script setup lang="ts">
import { computed, defineComponent, h, provide, type PropType } from 'vue'
import { pluginScopeKey } from '@/plugin/runtime'
import type { LoadedUIPlugin } from '@/plugin/plugins'

const PluginScope = defineComponent({
  name: 'PluginScope',
  props: { entry: { type: Object as PropType<LoadedUIPlugin>, required: true } },
  setup(scopeProps) {
    provide(pluginScopeKey, scopeProps.entry.name)
    return () =>
      h('div', { class: 'plugin-wrapper' }, [
        h(scopeProps.entry.component, {
          name: scopeProps.entry.name,
          options: scopeProps.entry.options,
        }),
      ])
  },
})

const props = withDefaults(
  defineProps<{
    plugin?: LoadedUIPlugin
    plugins?: LoadedUIPlugin[]
    visible?: boolean
  }>(),
  { plugins: () => [], visible: true },
)
const entries = computed(() => (props.plugin ? [props.plugin] : props.plugins))
</script>
<template>
  <PluginScope v-for="entry in entries" :key="entry.name" v-show="visible" :entry="entry" />
</template>
