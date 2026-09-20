import {usePluginEvent} from "@/plugin/usePluginEvent.ts";
import {type CTX, usePluginRuntime} from "@/plugin/usePluginRuntime.ts";
import {type plugin_handler, renderer_plugins, ui_plugins} from "@/plugin/new——plugins.ts";

let composable_use = false
export function usePlugins(base_ctx: CTX) {
    if (composable_use) {
        throw new Error('usePlugins cannot be called twice')
    }
    composable_use = true

    const PluginRuntime = usePluginRuntime()
    const PluginEvent = usePluginEvent()
    PluginRuntime.init(base_ctx)

    function load_renderer(name: string){}
    function load_ui(name: string){}
    function load(name: string,type: "renderer" | "ui",){
        const get_event = () => PluginEvent.setPlugin(name)
        const get_runtime = () => PluginRuntime.setPlugin(name)
        plugin_func(usePluginRuntime: get_runtime,usePluginEvent: get_event)
    }

    // Throw error
    async function load_all(renderer_plugin: string[], ui_plugin: string[]) {
        const load_renderer_promises: Promise<plugin_handler>[] = []
        for(const rplugin of renderer_plugin){
            const plugin = renderer_plugins[rplugin]
            if(plugin === undefined) throw new Error(`No plugin: ${rplugin}`)
            load_renderer_promises.push(plugin.load())
        }
        const load_ui_promises: Promise<plugin_handler>[] = []
        for(const rplugin of ui_plugin){
            const plugin = ui_plugins[rplugin]
            if(plugin === undefined) throw new Error(`No plugin: ${rplugin}`)
            load_ui_promises.push(plugin.load())
        }
        const [renderer_loaded,ui_loaded] = await Promise.all([Promise.all(load_renderer_promises),Promise.all(load_ui_promises)])
    }

    function dispose(){
        PluginRuntime.dispose_all()
        PluginEvent.dispose_all()
    }
}