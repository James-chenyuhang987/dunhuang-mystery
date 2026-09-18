import { defineStore } from 'pinia'
import { getPluginScope, withPluginExecution } from '@/plugin/runtime'

export type PluginEvent = CustomEvent<unknown>
export type EventHandler = (data: unknown) => void
export type EventDispatch = (data?: unknown) => void

type ListenerRecord = {
  plugin: string
  name: string
  type: string
  listener: (event: Event) => void
}

const scopedEventName = (plugin: string, name: string): string => `__${plugin}_${name}`

/** Page-scoped CustomEvent bus. Listener records remain private to the store. */
export const useEventStore = defineStore('event', () => {
  const records: ListenerRecord[] = []
  let currentPlugin: string | undefined

  function withPlugin<T>(name: string, callback: () => T): T {
    if (!name) throw new Error('A plugin name is required.')
    const previous = currentPlugin
    currentPlugin = name
    try {
      return withPluginExecution(name, callback)
    } finally {
      currentPlugin = previous
    }
  }

  function activePlugin(): string | undefined {
    return currentPlugin ?? getPluginScope()
  }

  function onEvent(name: string, handler: EventHandler, enable_broadcast = false): () => void {
    const plugin = activePlugin()
    if (!plugin) throw new Error('onEvent must run inside a plugin scope.')
    if (!name) throw new Error('An event name is required.')
    if (typeof handler !== 'function') throw new TypeError('Event handler must be a function.')
    const types = [scopedEventName(plugin, name)]
    if (enable_broadcast) types.push(name)
    const added = types.map((type) => {
      const listener = (event: Event): void => {
        const customEvent = event as PluginEvent
        const previous = currentPlugin
        currentPlugin = plugin
        try {
          withPluginExecution(plugin, () => handler(customEvent.detail))
        } finally {
          currentPlugin = previous
        }
      }
      const record = { plugin, name, type, listener }
      records.push(record)
      document.addEventListener(type, listener)
      return record
    })
    return () => {
      for (const record of added) removeRecord(record)
    }
  }

  function removeRecord(record: ListenerRecord): boolean {
    const index = records.indexOf(record)
    if (index < 0) return false
    document.removeEventListener(record.type, record.listener)
    records.splice(index, 1)
    return true
  }

  function removeEvent(name: string): boolean {
    const plugin = activePlugin()
    if (!plugin) throw new Error('removeEvent must run inside a plugin scope.')
    let removed = false
    for (const record of [...records]) {
      if (record.plugin === plugin && record.name === name) {
        removed = removeRecord(record) || removed
      }
    }
    return removed
  }

  function createEvent(name: string, target?: string): EventDispatch {
    if (!name) throw new Error('An event name is required.')
    if (target !== undefined && !target) throw new Error('A target plugin name is required.')
    const type = target === undefined ? name : scopedEventName(target, name)
    return (data?: unknown): void => {
      document.dispatchEvent(new CustomEvent(type, { detail: data }))
    }
  }

  function plugin_dispose(name: string): void {
    for (const record of [...records]) {
      if (record.plugin === name) removeRecord(record)
    }
  }

  return {
    withPlugin,
    onEvent,
    createEvent,
    removeEvent,
    plugin_dispose,
  }
})
