import { defineStore } from 'pinia'
import { markRaw, shallowRef } from 'vue'
import { assertEngineAccess, getPluginScope, withPluginExecution } from '@/plugin/runtime'
import type { LoadedUIPlugin, PluginCleanup, PluginContext } from '@/plugin/plugins'

export type Disposable = { dispose(): void }
type PluginRecord = {
  state: unknown
  cleanups: Set<PluginCleanup>
  resources: Set<Disposable>
  disposed: boolean
}
type ContextBinding = {
  owner: string
  original: unknown
  value: unknown
  hadOriginal: boolean
}

const pageOwner = Symbol('page')
const missing = Symbol('missing')

export const usePluginUtilsStore = defineStore('plugin-utils', () => {
  let context: PluginContext | undefined
  let source: PluginContext | undefined
  let currentPlugin: string | undefined
  const records = new Map<string, PluginRecord>()
  const resources = new Map<Disposable, Set<string | symbol>>()
  const disposedResources = new WeakSet<Disposable>()
  const bindings = new Map<PropertyKey, ContextBinding>()
  const uiPlugins = shallowRef<readonly LoadedUIPlugin[]>([])
  type MutableContext = PluginContext & Record<PropertyKey, unknown>

  function owner(): string | undefined {
    const name = currentPlugin ?? getPluginScope()
    if (name) recordFor(name)
    return name
  }

  function recordFor(name: string): PluginRecord {
    const record = records.get(name)
    if (!record || record.disposed) throw new Error(`Plugin is not active: ${name}`)
    return record
  }

  function registerPlugin(name: string, state?: unknown): void {
    assertEngineAccess()
    if (!name || records.has(name)) throw new Error(`Invalid or duplicate plugin: ${name}`)
    records.set(name, { state, cleanups: new Set(), resources: new Set(), disposed: false })
  }

  function withPlugin<T>(name: string, callback: () => T): T {
    recordFor(name)
    const previous = currentPlugin
    currentPlugin = name
    try {
      return withPluginExecution(name, callback)
    } finally {
      currentPlugin = previous
    }
  }

  function getPluginState(): unknown {
    const name = owner()
    if (!name) throw new Error('Plugin state requires a plugin scope.')
    return recordFor(name).state
  }

  function setPluginState(state: unknown): void {
    const name = owner()
    if (!name) throw new Error('Plugin state requires a plugin scope.')
    recordFor(name).state = state
  }

  function registerCleanup(cleanup: PluginCleanup): PluginCleanup {
    const plugin = owner()
    if (!plugin) throw new Error('registerCleanup requires a plugin scope.')
    if (typeof cleanup !== 'function') throw new TypeError('Cleanup must be a function.')
    const record = recordFor(plugin)
    const cleanupOwner = plugin
    let active = true
    const once = () => {
      if (!active) return
      active = false
      record.cleanups.delete(once)
      withPluginExecution(cleanupOwner, cleanup)
    }
    record.cleanups.add(once)
    return once
  }

  function isDisposable(value: unknown): value is Disposable {
    return !!value && typeof (value as Disposable).dispose === 'function'
  }

  function registerResource<T extends Disposable>(resource: T): T {
    const plugin = owner()
    if (!isDisposable(resource)) throw new TypeError('Resources must implement dispose().')
    if (disposedResources.has(resource)) throw new Error('Cannot register a disposed resource.')
    const resourceOwners = resources.get(resource) ?? new Set<string | symbol>()
    resourceOwners.add(plugin ?? pageOwner)
    resources.set(resource, resourceOwners)
    if (plugin) recordFor(plugin).resources.add(resource)
    return resource
  }

  function release(resource: Disposable, resourceOwner: string | symbol): void {
    const resourceOwners = resources.get(resource)
    if (!resourceOwners?.delete(resourceOwner) || resourceOwners.size) return
    resources.delete(resource)
    disposedResources.add(resource)
    for (const record of records.values()) record.resources.delete(resource)
    resource.dispose()
  }

  function disposeResource(resource: Disposable): void {
    const plugin = owner()
    const resourceOwner = plugin ?? pageOwner
    if (plugin) recordFor(plugin).resources.delete(resource)
    release(resource, resourceOwner)
  }

  function setRawContextProperty(key: PropertyKey, value: unknown): void {
    const target = source as MutableContext | undefined
    if (!target) return
    if (value === missing) delete target[key]
    else target[key] = value
    if (key === 'material' && target.sphere && value !== missing) {
      target.sphere.material = value as NonNullable<PluginContext['material']>
    }
    if (key === 'material') target.schedule?.()
  }

  function restoreBinding(key: PropertyKey, binding: ContextBinding): void {
    setRawContextProperty(key, binding.hadOriginal ? binding.original : missing)
  }

  function setContextProperty(target: MutableContext, key: PropertyKey, value: unknown): boolean {
    if (context === undefined) throw new Error('Plugin context has been disposed.')
    const plugin = owner()
    if (!plugin) throw new Error(`Context assignment requires a plugin scope: ${String(key)}`)
    const previous = bindings.get(key)
    const original = previous?.original ?? target[key]
    const hadOriginal = previous?.hadOriginal ?? Object.prototype.hasOwnProperty.call(target, key)
    const oldValue = target[key]
    if (oldValue === value) return true
    if (isDisposable(oldValue) && previous?.owner) release(oldValue, previous.owner)
    const nextValue = isDisposable(value) ? registerResource(value) : value
    target[key] = nextValue
    bindings.set(key, { owner: plugin, original, value: nextValue, hadOriginal })
    if (key === 'material' && target.sphere && nextValue)
      target.sphere.material = nextValue as NonNullable<PluginContext['material']>
    if (key === 'material') target.schedule?.()
    return true
  }

  function set_ctx(input: PluginContext): PluginContext {
    assertEngineAccess()
    if (context) {
      if (input === source) return context
      throw new Error('Dispose the current page context before replacing it.')
    }
    source = input
    const shared = new Proxy(markRaw(input), {
      set(target, key, value: unknown) {
        return setContextProperty(target as MutableContext, key, value)
      },
      defineProperty() {
        throw new TypeError('Use direct context assignment so the plugin resource can be tracked.')
      },
      deleteProperty() {
        throw new TypeError('Context properties are managed by PluginUtilsStore.')
      },
    }) as PluginContext
    context = shared
    return shared
  }

  /** Unsafe: this is the shared Three.js context; do not spread or persist it. */
  function unsafe_get_ctx(): PluginContext {
    if (!context) throw new Error('Plugin context has not been initialized.')
    return context
  }

  const get_ctx = unsafe_get_ctx

  function checkDependencies(dependencies: readonly string[] = []): void {
    for (const name of dependencies) recordFor(name)
  }

  function publishUI(plugin: LoadedUIPlugin): void {
    assertEngineAccess()
    uiPlugins.value = [...uiPlugins.value, markRaw(plugin)]
  }

  function getUIPlugins(): readonly LoadedUIPlugin[] {
    return uiPlugins.value
  }

  function plugin_dispose(name: string): void {
    assertEngineAccess()
    const record = records.get(name)
    if (!record || record.disposed) return
    for (const cleanup of [...record.cleanups].reverse()) withPlugin(name, cleanup)
    record.disposed = true
    for (const [key, binding] of [...bindings.entries()]) {
      if (binding.owner !== name) continue
      restoreBinding(key, binding)
      bindings.delete(key)
      if (isDisposable(binding.value)) release(binding.value, name)
    }
    for (const resource of [...record.resources].reverse()) release(resource, name)
    record.resources.clear()
  }

  function clearPluginState(name: string): void {
    assertEngineAccess()
    const record = records.get(name)
    if (record && !record.disposed) throw new Error(`Dispose ${name} before clearing its state.`)
    records.delete(name)
    uiPlugins.value = uiPlugins.value.filter((plugin) => plugin.name !== name)
  }

  function dispose_all(): void {
    assertEngineAccess()
    for (const name of [...records.keys()].reverse()) {
      plugin_dispose(name)
      clearPluginState(name)
    }
    for (const [key, binding] of [...bindings.entries()]) {
      restoreBinding(key, binding)
      bindings.delete(key)
    }
    for (const resource of [...resources.keys()].reverse()) release(resource, pageOwner)
    uiPlugins.value = []
    context = undefined
    source = undefined
    currentPlugin = undefined
  }

  return {
    set_ctx,
    unsafe_get_ctx,
    get_ctx,
    registerPlugin,
    withPlugin,
    getPluginState,
    setPluginState,
    registerCleanup,
    registerResource,
    disposeResource,
    checkDependencies,
    publishUI,
    getUIPlugins,
    plugin_dispose,
    clearPluginState,
    dispose_all,
  }
})
