import type { Component } from 'vue'
import type { Material } from 'three'
import type { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js'
import type { CSS2DRenderer } from 'three/examples/jsm/renderers/CSS2DRenderer.js'
import type { ShaderPass } from 'three/examples/jsm/postprocessing/ShaderPass.js'
import type * as THREE from 'three'
import { MeshBasicMaterial } from 'three'
import ResetViewPlugin from '@/components/plugins/ResetViewPlugin.vue'
import { usePluginUtilsStore } from '@/stores/pluginUtils'
import { useEventStore } from '@/stores/event'

export type PluginType = 'UI' | 'Renderer'
export type PluginOptions = object
export type PluginCleanup = () => void

/** The one raw context object shared by every plugin in a panorama. */
export interface PluginContext {
  readonly renderer?: THREE.WebGLRenderer
  readonly cssRenderer?: CSS2DRenderer
  readonly camera?: THREE.PerspectiveCamera
  readonly scene?: THREE.Scene
  readonly sphere?: THREE.Mesh
  material?: Material
  readonly composer?: EffectComposer
  readonly uvPass?: ShaderPass
  readonly hotspotGroup?: THREE.Group
  readonly schedule?: () => void
  readonly resetView?: () => void
}

/** A renderer can return a complete material; the utility store owns its disposal. */
export type MaterialFactory = (options: PluginOptions) => Material
export type PluginSetup = (options: PluginOptions) => void | PluginCleanup

export interface PluginDefinitionBase {
  type: PluginType
  dependencies?: readonly string[]
  setup?: PluginSetup
  dispose?: PluginCleanup
}

/** A renderer has no Vue component. */
export interface RendererPlugin extends PluginDefinitionBase {
  type: 'Renderer'
  material?: MaterialFactory
}

/** A UI plugin may install renderer/interaction logic alongside its component. */
export interface UIPlugin extends PluginDefinitionBase {
  type: 'UI'
  component: Component
  renderer?: PluginSetup
  title?: string
  placement?: 'footer' | 'panel'
  enabled?: boolean
}

export type Plugin = UIPlugin | RendererPlugin
export type LoadedUIPlugin = Pick<UIPlugin, 'component' | 'title' | 'placement'> & {
  name: string
  options: PluginOptions
}

export type PluginRegistry = Record<string, Plugin & { defaults: PluginOptions }>
export const pluginRegistry = {
  'solid-material': {
    type: 'Renderer',
    defaults: { color: '#b9a47c' },
    material(options) {
      const color = 'color' in options ? options.color : '#b9a47c'
      if (typeof color !== 'string') throw new TypeError('solid-material.color must be a string.')
      return new MeshBasicMaterial({ color })
    },
  },
  'reset-view': {
    type: 'UI',
    defaults: { label: '恢复初始视角' },
    title: '视角工具',
    placement: 'footer',
    component: ResetViewPlugin,
    renderer(options) {
      if ('label' in options && typeof options.label !== 'string') {
        throw new TypeError('reset-view.label must be a string.')
      }
      const utils = usePluginUtilsStore()
      useEventStore().onEvent('reset', () => utils.get_ctx().resetView?.())
    },
  },
} satisfies PluginRegistry
export const plugins = pluginRegistry

export type PluginName<Type extends PluginType = PluginType> = {
  [Name in keyof typeof pluginRegistry]: (typeof pluginRegistry)[Name]['type'] extends Type
    ? Name
    : never
}[keyof typeof pluginRegistry]

/** Registry names, plugin kinds and options are checked in authored level files. */
export type PluginReference<Type extends PluginType = PluginType> = {
  [Name in PluginName<Type>]:
    | Name
    | {
        name: Name
        options?: Partial<(typeof pluginRegistry)[Name]['defaults']>
      }
}[PluginName<Type>]

export function normalizePluginReference(reference: PluginReference): {
  name: string
  options: PluginOptions
} {
  if (typeof reference === 'string') return { name: reference, options: {} }
  return { name: reference.name, options: reference.options ?? {} }
}

export function resolvePlugin(name: string, type: PluginType): Plugin | undefined {
  if (!Object.prototype.hasOwnProperty.call(pluginRegistry, name)) return undefined
  const plugin: Plugin = pluginRegistry[name as keyof typeof pluginRegistry]
  return plugin.type === type ? plugin : undefined
}

export const isUIPlugin = (plugin: Plugin): plugin is UIPlugin => plugin.type === 'UI'
export const isRendererPlugin = (plugin: Plugin): plugin is RendererPlugin =>
  plugin.type === 'Renderer'
