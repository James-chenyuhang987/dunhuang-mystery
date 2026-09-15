# 整体重构计划

1. IntroSequence.vue疑似无用,若确定无用则进行移除操作
2. clue增加type='combination',可直接增加类型
```ts
type subclue = Omit<clue, 'name' | 'hint' | 'problem_indexes'>
interface clue{
    type: 'combination'
    name: string
    data: subclue[]
    problem_indexes?: number[]
    hint?: string
}
```
3. 移除BingMaYongView,DunHuangHome的具体地点组件,直接route到PlaceHome,根据route与配置中的路由地址来获得当前地点
4. 重构stores/game.ts,重点在于将通用函数抽离到utils/utils.ts,相关类型定义移至types/gamestore.ts
5. 重构PanoramaViewer.vue,此文件当前过于臃肿,下面为更改内容

- 增加SceneManager Composable,由此文件进行threejs场景初始化,接受全景图url作为参数,初始化camera,CSS2DRender等基础ability,通过返回值暴露给SFC
- 增加GameUI Composable,此文件处理线索点,彩蛋等点击,接受来自SceneManager暴露的部分ability作为参数

**本次重构要求行为与之前完全一致,仅用于提高代码质量,如果有其他可以提升质量的地点请提出**

根据目前状况,Store难以进行拆分,已经做到了一定的解耦