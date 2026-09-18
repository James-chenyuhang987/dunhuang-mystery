import { assertEngineAccess, withPluginExecution } from '@/plugin/runtime'
import { useEventStore } from '@/stores/event'
import { usePluginUtilsStore } from '@/stores/pluginUtils'
import {
  isUIPlugin,
  resolvePlugin,
  type Plugin,
  type PluginOptions,
  type PluginType,
} from '@/plugin/plugins'

interface LoadedPlugin {
  name: string
  type: PluginType
  options: PluginOptions
  definition: Plugin
}

function runInPlugin<T>(
  name: string,
  callback: () => T,
  utils: ReturnType<typeof usePluginUtilsStore>,
  events: ReturnType<typeof useEventStore>,
): T {
  return events.withPlugin(name, () =>
    utils.withPlugin(name, () => withPluginExecution(name, callback)),
  )
}

/** Engine-only plugin lifecycle. Plugin code must use the utility and event stores. */
export function usePlugin() {
  assertEngineAccess()
  const utils = usePluginUtilsStore()
  const events = useEventStore()
  const loaded: LoadedPlugin[] = []

  const load = (name: string, type: PluginType, options: PluginOptions = {}): boolean => {
    assertEngineAccess()
    if (loaded.some((entry) => entry.name === name)) return false
    const definition = resolvePlugin(name, type)
    if (!definition) return false
    utils.checkDependencies(definition.dependencies ?? [])
    utils.registerPlugin(name, { type, options })
    let completed = false
    try {
      runInPlugin(
        name,
        () => {
          if (isUIPlugin(definition)) {
            const rendererCleanup = definition.renderer?.(options)
            if (rendererCleanup) utils.registerCleanup(rendererCleanup)
          }
          const cleanup = definition.setup?.(options)
          if (cleanup) utils.registerCleanup(cleanup)
          if (!isUIPlugin(definition) && definition.material) {
            const material = definition.material(options)
            const context = utils.get_ctx() as { material?: typeof material }
            context.material = material
          }
        },
        utils,
        events,
      )
      if (isUIPlugin(definition)) {
        utils.publishUI({
          name,
          options,
          component: definition.component,
          title: definition.title,
          placement: definition.placement,
        })
      }
      loaded.push({ name, type, options, definition })
      completed = true
      return true
    } finally {
      if (!completed) {
        utils.plugin_dispose(name)
        events.plugin_dispose(name)
        utils.clearPluginState(name)
      }
    }
  }

  const dispose = (): void => {
    assertEngineAccess()
    for (const entry of [...loaded].reverse()) {
      runInPlugin(entry.name, () => entry.definition.dispose?.(), utils, events)
      utils.plugin_dispose(entry.name)
      events.plugin_dispose(entry.name)
      utils.clearPluginState(entry.name)
    }
    loaded.length = 0
  }

  return { load, dispose }
}
