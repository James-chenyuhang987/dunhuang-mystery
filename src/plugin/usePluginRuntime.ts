import {defineStore} from "pinia";
import {assertIfTrueDev} from "@/plugin/utils.ts";
import {usePluginEvent} from "@/plugin/usePluginEvent.ts";

export type CTXToken = Symbol

interface CTXObject<T>{
    plugin: string
    data: T,
    dispose: (data: T)=>void // Allow use set(new Obj,(data) => {data.dispose()}) without create a temp var
    renderer?: (data: T,ctx: CTX) => void
    CTXToken: CTXToken
}

interface CTXObjectWithRenderer<T> extends CTXObject<T>{
    renderer: (data: T,ctx: CTX) => void
}
export type CTX = Record<string, CTXObject<any>[]>

export type CTXExport = {
    data: any
    plugin: string
    CTXToken: CTXToken
}


export const usePluginRuntime = defineStore("plugin_runtime",() => {
    let ctx: CTX = {}
    let renderers: CTXObjectWithRenderer<any>[] = []
    let imported: string[] = []
    let inited: boolean = false
    let dispose_map: Map<string,() => void> = new Map
    const PluginEvent = usePluginEvent()



    function register_dispose_function(name: string,func: () => void){
        if(dispose_map.has(name)){
            throw new Error("Unable declare dispose function twice")
        }
        dispose_map.set(name,func)
    }

    function init(setctx: CTX){
        if(inited){
            throw new Error("Can't call init twice")
        }
        dispose_map = new Map<string, () => void>()
        ctx = setctx
        imported = []
        inited = true
        renderers = []
    }

    function get_ctx(key: string): CTXExport[] | undefined{
        return ctx[key]?.map((value) => ({data: value.data,plugin: value.plugin,CTXToken: value.CTXToken}))
    }

    function get_ctx_with_plugin(plugin: string,key: string): CTXExport | undefined{
        const data = ctx[key]?.find(value => value.plugin === plugin)
        if(data === undefined) return undefined
        return {
            data:data.data,
            plugin: plugin,
            CTXToken: data.CTXToken
        }
    }

    function UNSAFE_get_ctx_ref(){
        return ctx
    }

    // If set dispose_old = true,the lifetime manage give to plugin's dispose
    // It's not safe,I prefer copy-and-use,but sometime we can do in place change
    // So I give this arg
    function set_ctx<T>(name: string,key: string,data: T,dispose_func: (data: T) => void,renderer?: (data: T,ctx: CTX) => void,replace: boolean = true,dispose_old: boolean = true): {old_data: CTXObject<any>[] | undefined,CTXToken: CTXToken}{
        const old_data = ctx[key]
        assertIfTrueDev(old_data?.find(value => value.plugin === name) !== undefined,`Plugin ${name} declare ${key} twice`)
        if(old_data && replace){
            let names: Set<CTXObject<any>> = new Set()
            for(const data of old_data){
                if(dispose_old){
                    data.dispose(data.data)
                }
                if(data.renderer){
                    names.add(data)
                }
            }
            renderers = renderers.filter((data) => !names.has(data))
        }
        if(replace || ctx[key] === undefined){
            ctx[key] = []
        }
        const token = Symbol()
        if(renderer){
            const CTXObj: CTXObjectWithRenderer<T> = {
                plugin: name,
                data,
                dispose: dispose_func,
                renderer,
                CTXToken: token
            }
            renderers.push(CTXObj)
            ctx[key].push(CTXObj)
        }else{
            const CTXObj: CTXObject<T> = {
                plugin: name,
                data,
                dispose: dispose_func,
                CTXToken: token
            }
            ctx[key].push(CTXObj)
        }
        if(dispose_old || !replace){
            return {
                old_data: undefined,
                CTXToken: token
            }
        }
        return {
            old_data: old_data,
            CTXToken: token
        }
    }

    function add_imported(plugin_name: string){
        imported.push(plugin_name)
    }

    function set_plugin_dependency(plugin_names: string[]){
        for(const plugin_name of plugin_names){
            if(!imported.includes(plugin_name)){
                throw new Error("Missing dependency "+plugin_name)
            }
        }
    }

    function dispose_plugin(name: string){
        dispose_map.get(name)?.()
        dispose_map.delete(name)
        for(const [key,_] of Object.entries(ctx)){
            dispose_key(key,name) // For final dispose,without sequence
            // The usePlugin should do dispose with sequence first
        }
    }

    function dispose_all(){
        dispose_map.forEach((value) => {
            value()
        })
        dispose_map.clear()
        for(const [key,_] of Object.entries(ctx)){
            dispose_key(key) // For final dispose,without sequence
            // The usePlugin should do dispose with sequence first
        }
        ctx = {}
        imported = []
        renderers = []
        inited = false
    }

    function dispose_key(key: string,local_name?: string){
        const datas = ctx[key]
        if(datas === undefined) return false
        let names: Set<CTXObject<any>> = new Set()
        const remaining: CTXObject<any>[] = []
        for(const data of datas){
            if(local_name === undefined || data.plugin === local_name){
                PluginEvent.on_ctx_dispose(data.CTXToken)
                data.dispose(data.data)
                if(data.renderer){
                    names.add(data)
                }
            }else{
                remaining.push(data)
            }
        }
        renderers = renderers.filter((data) => !names.has(data))
        if(local_name && remaining.length > 0){
            ctx[key] = remaining
        }else{
            delete ctx[key]
        }
        return true
    }

    function dispose_local_key(name: string,key: string){
        return dispose_key(key,name)
    }

    function setPlugin(name: string){
        return {
            set_plugin_dependency,
            dispose_local_key, // Dont give the permission to delete other plugin's data
            get_ctx,
            register_dispose_function: register_dispose_function.bind(undefined, name),
            get_ctx_with_plugin,
            set_ctx: set_ctx.bind(undefined,name)
        }
    }
    return {setPlugin,dispose_all,add_imported,dispose_plugin,init,get_ctx_with_plugin,get_ctx,UNSAFE_get_ctx_ref}
})