import {defineStore} from "pinia";
import {assertIfTrueDev} from "@/plugin/utils.ts";
import {type CTXExport, type CTXToken} from "@/plugin/usePluginRuntime.ts";

interface Options{
    once: boolean
    signal: AbortSignal
}

interface EvtListener{
    type: string
    ispublic: boolean 
    listener: EventListener
    options: Options
    controller: AbortController
    CTXTokens: CTXToken[]
    id: listener_id
}

interface publicmap{
    name: string,evt: EventListener
}
interface Publics{
    callback: (e: Event) => void
    publicmap: publicmap[]
}

type listener_id = {name: string,type: string}

export const usePluginEvent = defineStore("plugin_event",() => {
    const event_plugin_map: Map<string,EvtListener[]> = new Map
    const event_public_map: Map<string,Publics> = new Map

    let element: HTMLDivElement = document.createElement("div")

    const dependency_map: Map<CTXToken,Set<listener_id>> = new Map


    // target set to true is broadcast
    function dispatchEvent(type: string,target: string | true,data?: any){
        if(target === true){
            element.dispatchEvent(new CustomEvent(`__${type}`,{
                detail: data
            }))
        }else{
            element.dispatchEvent(new CustomEvent(`__${target}_${type}`,{
                detail: data
            }))
        }
    }

    function on_ctx_dispose(token: CTXToken){
        const dependencies = dependency_map.get(token)
        if(dependencies === undefined) return
        for(const id of dependencies){
            dispose_event(id.name,id.type)
        }
        dependency_map.delete(token)
    }

    function add_event_listener(name: string,type: string,listener: EventListener,depend: CTXExport[] = [],ispublic: boolean =  false,once: boolean = false){
        const events = event_plugin_map.get(name)
        if(events === undefined) return
        assertIfTrueDev(events.find(value => value.type === type) !== undefined,`Can't add twice evt listener ${name} ${type}`)
        const controller = new AbortController()
        const options: Options = {
            once,
            signal: controller.signal
        }
        if(ispublic){
            if(once) throw new Error(`Not allow public with once = true  Name: ${name} Type: ${type}`)
            const data = event_public_map.get(type)
            if(data === undefined){
                const callback: Publics = {
                    callback: (event) => {
                        for(const run of callback.publicmap){
                            run.evt(event)
                        }
                    },
                    publicmap: [{name,evt: listener}]
                }
                event_public_map.set(type,callback)
                element.addEventListener(`__${type}`,callback.callback)
            }else{
                data.publicmap.push({name,evt: listener})
            }
        }
        element.addEventListener(`__${name}_${type}`,listener,options)
        const id = {name,type}
        events.push({
            type,
            listener,
            ispublic,
            options,
            CTXTokens: depend.map(val => val.CTXToken),
            controller,
            id,
        })
        if(depend.length !== 0){
            for(const token of depend){
                if(!dependency_map.has(token.CTXToken)){
                    dependency_map.set(token.CTXToken,new Set)
                }
                dependency_map.get(token.CTXToken)?.add(id)
            }

        }
    }
    function dispose_from_public(name: string,type: string){
        const publics = event_public_map.get(type)
        if(publics === undefined) return false
        const index = publics.publicmap.findIndex((value) => value.name === name)
        if(index === -1) return false
        publics.publicmap.splice(index,1)
        if(publics.publicmap.length === 0){
            element.removeEventListener(`__${type}`,publics.callback)
            event_public_map.delete(type)
        }
    }
    function dispose_event(name: string,type: string){
        const datas = event_plugin_map.get(name)
        if(datas === undefined) return false
        const index = datas.findIndex((value) => value.type === type)
        if(index === -1) return false
        const target = datas[index] as EvtListener

        target.CTXTokens.forEach(token => {
            const dict = dependency_map.get(token)
            if(dict){
                dict.delete(target.id)
                if(dict.size === 0) dependency_map.delete(token)
            }
        })

        if(target.ispublic){
            dispose_from_public(name,type)
        }
        target.controller.abort()
        datas.splice(index,1)
        return true
    }
    function dispose_plugin_event(name: string): boolean{
        const datas = event_plugin_map.get(name)
        if(datas === undefined) return false
        for(const data of datas){
            data.CTXTokens.forEach(token => {
                const dict = dependency_map.get(token)
                if(dict){
                    dict.delete(data.id)
                    if(dict.size === 0) dependency_map.delete(token)
                }
            })
            if(data.ispublic){
                dispose_from_public(name,data.type)
            }
            data.controller.abort()
        }
        event_plugin_map.delete(name)
        return true
    }
    function setPlugin(name: string){
        if(!event_plugin_map.has(name)) event_plugin_map.set(name,[])
        return {
            dispatchEvent,
            add_event_listener: add_event_listener.bind(undefined,name),
            dispose_plugin_event: dispose_plugin_event.bind(undefined,name),
            dispose_event: dispose_event.bind(undefined,name)
        }
    }
    function dispose_all(){
        for(const [name,value] of event_plugin_map){
            for(const data of value){
                data.CTXTokens.forEach(token => {
                    const dict = dependency_map.get(token)
                    if(dict){
                        dict.delete(data.id)
                        if(dict.size === 0) dependency_map.delete(token)
                    }
                })
                if(data.ispublic){
                    dispose_from_public(name,data.type)
                }
                data.controller.abort()
            }
        }
        dependency_map.clear()
        event_plugin_map.clear()
        for(const [type,data] of event_public_map){
            data.publicmap = []
            element.removeEventListener(`__${type}`,data.callback)
        }
        event_public_map.clear() // Let GC to clear all
        element.remove()
        element = document.createElement("div")

    }
    return {setPlugin,dispose_all,dispose_plugin_event,on_ctx_dispose}
})