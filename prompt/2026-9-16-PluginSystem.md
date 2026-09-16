# 这是一次史上最大的更改: 插件系统

你的任务是实现插件系统的两个子系统: 渲染插件系统与UI插件系统

前置任务

0. 你需要安装sweetalert2,并通过css提供符合本网页风格的弹窗,并迁移所有的弹窗到sweetalert2


---
1. 在plugin/plugins.ts中分别声明存在的渲染插件系统与UI插件系统

2. 所有插件都通过usePlugin Composable来管理,其提供的功能如下

3. 接下来是usePlugin的详细信息

- 暴露`load(name: string,type: 'UI' | 'Renderer'): boolean`方法,通过返回值确认加载是否成功
- 暴露`dispose(): void`方法,通过以load顺序相反的顺序调用插件提供的dispose方法
- 暴露`get_ctx(): ctx`方法供拿到整个页面的ctx对象(包括renderer,camera等)

## 渲染插件系统

- 其通过调用get_ctx,获取到全局的ctx对象来进行操作
- 对于material,采用替代策略,也就是如果插件A和B都要修改material,则看谁更靠后则最终显示的是谁的
- 返回值需返回dispose闭包等内容
- 比如可以实现创建CSS2DRenderer在本插件scope内,在dispose阶段也dispose该Renderer,总体来说需要确保资源已被释放

## UI插件系统

1. 增加新的UI插件控件

- UI插件通过Vue提供
- 在footer中提供专门的控件来唤出UI plugin面板
- 所有的UI控件都UI plugin面板通过v-for展示UIPluginWrapper,由wrapper控制UI插件组件的v-show来实现UI组件的展开与折叠

2. UI插件内容
- UI插件允许使用<Transfer>,但前提是需要处理好相关内容如确保用户可关闭,但通常来说不需要这样
- 可以通过调用get_ctx,获取到全局的ctx对象来进行操作
- 可以通过Sweetalert2来弹窗

---

2. 增加useEventStore,要求如下

- 暴露`onEvent(name: string,handler: (data: any) => undefined,enable_broadcast: boolean=false)`方法,如果未指定enable_broadcast则只在document监听$`__{PLUGIN_NAME}_{EVENT_NAME}`事件,否则则在document监听$`__{PLUGIN_NAME}_{EVENT_NAME}`事件与$`{EVENT_NAME}`事件
- 暴露`createEvent(name: string,send_to_specific_plugin_name: string | undefined=undefined): (data: any) => undefined`,其返回一个闭包来new CustomEvent并传入data最后在document dispatch,如果send_to_specific_plugin_name未指定则只触发$`{EVENT_NAME}`事件,否则触发$`__{PLUGIN_NAME}_{EVENT_NAME}`事件
- 暴露`removeEvent(name: string): boolean`其为onEvent的反函数,原本是否存在通过返回值确定
- 使用一个Map来记录一个plugin添加的全部eventlistener,在组件卸载时会调用暴露的`plugin_dispose(name: string)`方法来清理eventlistener
- ctx不应该包含useEventStore的实例,只在组件需要时按需自行调用
- useEventStore**不应该暴露任何内部的数据结构**

4. 在data/game.ts的level类型中增加可选类型ui_plugins[]与render_plugins[]来声明本场景使用到的插件