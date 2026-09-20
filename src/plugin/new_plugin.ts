import {usePluginRuntime} from "@/plugin/usePluginRuntime.ts";
import {usePluginEvent} from "@/plugin/usePluginEvent.ts";
import type {level} from "@/types/game.ts";

interface plugin{
    load: () => Promise<plugin_handler>
}

type PluginRuntimeStore = ReturnType<typeof usePluginRuntime>
type plugin_handler_usepluginruntime = ReturnType<PluginRuntimeStore['setPlugin']>

type PluginEventStore = ReturnType<typeof usePluginEvent>
type plugin_handler_usepluginevent = ReturnType<PluginEventStore['setPlugin']>

export type plugin_handler = (usePluginRuntime: plugin_handler_usepluginruntime,usePluginEvent: plugin_handler_usepluginevent,data: any,level: level) => any

type plugin_record = Record<string, plugin>

export const renderer_plugins: plugin_record = {
    a: {
        load: async () => {
            const module = await import("@/plugin/test_plugin.ts")
            return module.plugin
        }
    }
}

export const ui_plugins: plugin_record = {
    a: {
        load: async () => {
            const module = await import("@/plugin/test_plugin.ts")
            return module.plugin
        }
    }
}