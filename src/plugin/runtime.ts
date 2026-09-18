import { hasInjectionContext, inject, type InjectionKey } from 'vue'

export const pluginScopeKey: InjectionKey<string> = Symbol('plugin-scope')
let executingPlugin: string | undefined

export function withPluginExecution<T>(name: string, callback: () => T): T {
  const previous = executingPlugin
  executingPlugin = name
  try {
    return callback()
  } finally {
    executingPlugin = previous
  }
}

export function getPluginScope(): string | undefined {
  return executingPlugin ?? (hasInjectionContext() ? inject(pluginScopeKey, undefined) : undefined)
}

export function assertEngineAccess(): void {
  if (getPluginScope()) {
    throw new Error('Plugins must use the utility/event stores, not usePlugin().')
  }
}
