import fs from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';
import { Presentation, PresentationFile } from '@oai/artifact-tool';
import { finalizePresentation } from '/Users/chenyuhang/.codex/plugins/cache/openai-primary-runtime/presentations/26.909.22227/skills/presentations/container_tools/artifact_tool_utils.mjs';

const root = '/Users/chenyuhang/Desktop/3d/dunhuang-mystery';
const tmp = path.join(root,'.presentation-build');
const assets=path.join(tmp,'assets');
const skill='/Users/chenyuhang/.codex/plugins/cache/openai-primary-runtime/presentations/26.909.22227/skills/presentations';
const py='/Users/chenyuhang/.cache/codex-runtimes/codex-primary-runtime/dependencies/python/bin/python3';
const FONT='Hiragino Sans GB';
const LATIN='Helvetica Neue';
const C={dark:'#0A1924',green:'#142C2A',cream:'#F6F1E7',ink:'#243139',gold:'#DCAF64',muted:'#A9B6B6',cyan:'#77D4D5',purple:'#B8A0EA'};
const ppt=Presentation.create({slideSize:{width:1280,height:720}});
const notes=[];
function txt(s,text,x,y,w,h,size=28,color=C.cream,bold=false,font=FONT){
 const sh=s.shapes.add({geometry:'textbox',name:text.slice(0,28),position:{left:x,top:y,width:w,height:h},fill:'none',line:{fill:'none',width:0}});
 sh.text=text;sh.text.style={typeface:font,fontSize:size,color,bold,autoFit:'none',wrap:'square',insets:{top:0,right:0,bottom:0,left:0}};return sh;
}
function slide(title,n,{light=false,bg}={}){
 const s=ppt.slides.add();s.background.fill=bg??(light?C.cream:C.dark);s.isLight=light;
 if(title)txt(s,title,64,50,1152,76,43,light?C.ink:C.cream,true);
 txt(s,String(n).padStart(2,'0'),1170,670,48,28,17,light?'#77817E':C.muted,false,LATIN);
 return s;
}
async function img(s,file,x,y,w,h,{crop,fit='contain',alt}={}){
 const p=path.isAbsolute(file)?file:path.join(assets,file);
 s.images.add({blob:new Uint8Array(await fs.readFile(p)),contentType:p.endsWith('.jpg')||p.endsWith('.jpeg')?'image/jpeg':'image/png',position:{left:x,top:y,width:w,height:h},fit,crop,alt:alt??path.basename(p)});
}
function note(s,speech,sources=[]){const n=speech+'\n\n依据与出处\n'+sources.join('\n');s.speakerNotes.textFrame.setText(n);notes.push({slide:notes.length+1,text:speech,sources});}
function rows(s,items,{x=64,y=175,w=1148,gap=92,labelW=245,size=27,color}={}){
 const fg=color??(s.isLight?C.ink:C.cream);
 items.forEach(([a,b],i)=>{txt(s,a,x,y+i*gap,labelW,60,size,s.isLight?'#866536':C.gold,true);txt(s,b,x+labelW+25,y+i*gap,w-labelW-25,70,size,fg);});
}
function table(s,values,{x=64,y=170,w=1152,h=350,widths,size=25}={}){
 const t=s.tables.add({rows:values.length,columns:values[0].length,left:x,top:y,width:w,height:h,columnWidths:widths,values});
 t.styleOptions={headerRow:false,bandedRows:false};
 t.borders.assign({fill:s.isLight?'#B8B6AB':'#42605E',width:0.7});
 for(let r=0;r<values.length;r++)for(let c=0;c<values[r].length;c++){
  const cell=t.getCell(r,c);cell.fill=r===0?(s.isLight?C.dark:'#1E3938'):(s.isLight?C.cream:C.dark);
  cell.text.style={typeface:FONT,fontSize:size,color:r===0?C.cream:(s.isLight?C.ink:C.cream),bold:r===0,autoFit:'none',wrap:'square'};
 }
 t.cells.block({row:0,column:0,rowCount:values.length,columnCount:values[0].length}).assign({margins:{left:18,right:18,top:16,bottom:12},anchor:'center'});
 return t;
}

await fs.mkdir(path.join(tmp,'preview'),{recursive:true});
await sharp(path.join(root,'public/art/dunhuang-uv.svg')).png().toFile(path.join(assets,'uv-source.png'));
// Existing brand artwork is preserved in its original proportions.
{
 const s=slide('',1);txt(s,'敦煌·探迹',64,85,450,75,60,C.cream,true);
 txt(s,'项目与核心原理',64,185,470,60,38,C.gold,true);
 txt(s,'360° 全景与点击发现\n紫外线观察',64,300,465,110,31,C.cream);
 txt(s,'F4·筑境者',64,565,460,45,25,C.muted);
 await img(s,'cover-reference.png',550,125,666,455,{crop:{left:0,top:0,right:0,bottom:.09},fit:'contain',alt:'原展示PPT中的F4筑境者品牌画面'});
 note(s,'我们做的是一个在浏览器里运行的文化探索游戏。用户可以环顾洞窟、寻找线索，再结合线索答题。今天重点解释两项功能：全景和点击发现怎样工作，紫外线模式又怎样把预先设计的线索显示出来。', ['项目材料：docs/展示PPT.pptx，第1、2、19页。封面图直接取自原稿，不作为真实洞窟影像的证明。']);
}
{
 const s=slide('在全景中观察、找线索、做推理',2);
 await img(s,'game-normal.png',64,165,815,460,{fit:'contain',alt:'当前项目九色秘语关卡界面'});
 txt(s,'用户在做什么',920,180,310,48,28,C.gold,true);
 txt(s,'环顾场景\n寻找线索\n结合证据答题',920,253,300,185,32,C.cream);
 txt(s,'敦煌与云冈\n桌面和手机均可使用',920,498,300,100,25,C.muted);
 note(s,'这个产品把全景浏览和侦探式解谜结合起来。用户选择地点和关卡后，可以拖动观察、打开编号线索，也能寻找隐藏发现。题目把观察结果组织成推理过程。项目包含原创教学素材和虚构情节，演示效果不能作为考古结论。', ['src/views/GameView.vue','src/data/game.ts','图：2026-09-15本地项目真实运行截图。']);
}
{
 const s=slide('研学过程中的几次取舍',3,{light:true});
 rows(s,[['研学前','确定“全景浏览 + 侦探解谜”的产品形式'],['研学第一天','把地点、关卡和题目集中到配置中'],['参观过程中','加入时间轴与紫外线观察'],['扩展到云冈','用另一组地点内容检验通用结构'],['内容编辑阶段','增加图形化关卡配置生成器']],{y:174,gap:88,labelW:235,size:27});
 note(s,'原来的展示稿记录了这些决策：先确定探索与解谜的形式，再在研学过程中加入观察维度和新的地点。内容越来越多后，配置生成器降低了手写配置的负担。这里强调的是产品需求怎样推动技术选择。', ['团队过程记录：docs/展示PPT.pptx，第6页。','当前实现：src/data/game.ts、utils/index.html。','原稿记录的Google Earth Studio开场制作工具仅在此作为团队记录，运行时播放的是导出的MP4。']);
}
{
 const s=slide('页面、进度和全景各有分工',4,{light:true});
 table(s,[['职责','技术','项目中的工作'],['页面与跳转','Vue + Vue Router','首页、选关、探索与结算'],['进度与存档','Pinia + localStorage','答题记录、线索解锁、刷新恢复'],['全景与特效','Three.js + WebGL','球面贴图、射线、紫外线着色器'],['内容配置','TypeScript','约束地点、关卡和题目格式']],{h:365,widths:[240,360,552],size:25});
 txt(s,'Vite 构建，GitHub Pages 发布，Vitest 与 Playwright 验证',64,576,1150,56,25,C.ink);
 note(s,'Vue负责界面，路由负责跳转。Pinia保存当前游戏状态，localStorage让刷新后还能恢复。Three.js负责三维视图。关卡内容通过TypeScript配置，增加内容时通常无需重写页面。工具链负责构建、测试和静态部署。当前没有业务后端或服务器数据库。', ['package.json','src/main.ts','src/router/index.ts','src/stores/game.ts','src/types/game.ts','.github/workflows/deploy-pages.yml']);
}
{
 const s=slide('360° 全景：在球心看一张环绕图片',5,{bg:C.green});
 txt(s,'全景图横向覆盖 360°\n纵向覆盖 180°',64,166,495,96,30,C.cream);
 await img(s,path.join(root,'public/yungang/yungang_cave3_pano.jpg'),64,294,468,234,{fit:'contain',alt:'项目使用的2比1等距柱状全景图片'});
 txt(s,'把 2:1 等距柱状图贴到球内壁\n虚拟相机固定在球心',64,563,555,92,29,C.gold,true);
 await img(s,'sphere.png',562,146,668,454,{fit:'contain',alt:'相机在球心观察球体内壁贴图的概念示意'});
 txt(s,'概念示意',1074,606,140,28,18,C.muted);
 note(s,'可以把它想成站在一个内壁贴满照片的球里。等距柱状图把水平角和垂直角对应到图片坐标，完整覆盖360度乘180度，所以通常是2比1。Three.js生成球体，再反转X轴使内侧可见。相机留在球心，从一个方向看过去，就得到当前屏幕画面。单纯把普通照片拉成2比1不会变成正确的全景。项目中的半径10是场景单位，不代表真实洞窟尺寸。', ['src/composables/SceneManager.ts：initialize()，SphereGeometry(radius,64,32)、geometry.scale(-1,1,1)，radius=10。','https://threejs.org/docs/pages/SphereGeometry.html','图：public/yungang/yungang_cave3_pano.jpg。球体插图为本次生成的概念示意，不是真实洞窟模型。']);
}
{
 const s=slide('拖动改变朝向，缩放改变视野',6);
 txt(s,'FOV 70°：看得更宽',64,163,560,52,29,C.gold,true);
 txt(s,'FOV 40°：同一方向看得更近',662,163,560,52,29,C.gold,true);
 await img(s,'fov70.png',64,230,552,346,{fit:'contain',alt:'项目实际视野角70度'});
 await img(s,'fov40.png',664,230,552,346,{fit:'contain',alt:'项目实际视野角40度'});
 txt(s,'相机位置保持不变，图片也没有增加新细节',64,609,1150,47,30,C.cream);
 note(s,'拖动时，代码修改水平角和垂直角，再让相机看向新的方向。缩放时修改FOV，也就是相机的垂直视野角：数值小，屏幕装下的范围更窄，物体就显得更大。这类似在原地用长焦观察，并没有走到物体前面。代码把FOV限制在30到100度。两个截图来自同一关卡、同一朝向。', ['src/composables/GameUI.ts：move()、zoom()。src/composables/SceneManager.ts：render()。','https://threejs.org/docs/pages/PerspectiveCamera.html','图：本次本地运行截图，70度和40度。']);
}
{
 const s=slide('点击发现：求交点，再比较距离',7,{bg:C.green});
 await img(s,'ray.png',30,144,690,476,{fit:'contain',alt:'相机射线穿过屏幕点击点，与球面相交并接近目标点的概念示意'});
 txt(s,'点击怎样变成一个三维点',740,170,480,70,29,C.gold,true);
 txt(s,'1  将屏幕点击换成射线\n2  求出射线与球面的交点\n3  找范围内最近的配置点',740,257,480,185,28,C.cream);
 txt(s,'距离 ≤ 点击半径\n且普通／紫外模式一致',740,469,480,104,32,C.cyan,true);
 txt(s,'编号按钮用 CSS2D 定位，隐藏发现使用射线判定',64,632,1120,40,24,C.muted);
 note(s,'点击不是把屏幕像素坐标直接存下来。先按画布大小把点击坐标归一化到负1到1，Raycaster结合相机投影生成射线，再与半径10的球求交。交点减去球心后，和配置的Vector3计算欧氏距离。距离不超过accept_click_range才算命中，重叠区域选最近的一个，in_uv负责匹配当前观察模式。示例配置半径0.9是场景单位。同一份空间坐标能随屏幕尺寸和朝向继续工作。注意编号线索按钮是CSS2DObject，隐藏发现才由这一段射线逻辑处理。', ['src/composables/GameUI.ts：discover()、rebuildHotspots()。','src/utils/clickPoints.ts：findMatchingClickPoint()。','src/utils/hotspots.ts','https://threejs.org/docs/pages/Raycaster.html','插图为本次生成的示意，位置与大小不表示真实尺度。']);
}
{
 const s=slide('为什么选择球面全景',8,{light:true});
 table(s,[['比较','本项目的球面全景','3D 高斯（3DGS）'],['输入','一个观察点的全景图片','多角度照片与相机位姿'],['场景表示','球体内壁的一张贴图','许多带颜色和透明度的空间椭球'],['观察方式','在原地环顾、改变视野','在采集覆盖范围内渲染新视角'],['当前项目','已经实现','未接入']],{h:368,widths:[180,462,510],size:25});
 txt(s,'团队记录：采集条件有限，先保证环顾和解谜体验',64,588,1150,60,28,C.ink,true);
 note(s,'两种技术的差别在于怎样表示场景。全景把一个观察点看到的颜色存进图片，旋转相机就能环顾。3D高斯使用大量位置、形状、颜色和不透明度可调整的高斯体，从多视角照片拟合场景，再把它们投影到新视角并混合成图像。因此它能支持观察位置变化，但效果取决于拍摄覆盖、相机位姿和优化质量。原稿记录我们受采集条件限制，选择全景方案。这是本项目的取舍，不是说全景在所有场景下都比3DGS更好。当前代码没有高斯模型或渲染器。', ['团队选型：docs/展示PPT.pptx，第7页。','实现核验：src/composables/SceneManager.ts、src/components/PanoramaViewer.vue、package.json。','Kerbl等，2023，3D Gaussian Splatting for Real-Time Radiance Field Rendering：https://repo-sam.inria.fr/fungraph/3d-gaussian-splatting/']);
}
{
 const s=slide('紫外线观察：切换素材，再突出标记',9);
 txt(s,'普通素材',64,163,550,50,30,C.gold,true);
 txt(s,'紫外线素材 + 着色器',664,163,550,50,30,C.purple,true);
 await img(s,'normal-mark.png',64,223,552,346,{fit:'contain',alt:'同一朝向的普通模式实际截图'});
 await img(s,'uv-mark.png',664,223,552,346,{fit:'contain',alt:'同一朝向的紫外线模式实际截图，白色预制标记被突出显示'});
 txt(s,'线索先画进专用素材，程序负责让它更醒目',64,599,1150,53,31,C.cream,true);
 note(s,'这里有两个步骤。首先把普通纹理url换成专用的ultraviolet_url，然后启用紫外线着色器。专用素材已经画好了白色标记。着色器让背景偏紫蓝、让白色标记显得更亮。它不会从一张普通照片自动发现真实隐藏文字，也没有在测量真实紫外光。当前截图使用原创教学SVG，代表游戏里的视觉模拟。只有当前时相提供了专用素材，界面才允许开启这个模式。', ['src/composables/SceneManager.ts：loadTexture()。','src/views/GameView.vue','src/data/game.ts：九色秘语的url与ultraviolet_url。','public/art/cave-02.svg、public/art/dunhuang-uv.svg。','图：同一朝向的本地项目截图，素材和效果均来自现有实现。']);
}
{
 const s=slide('着色器给每个像素重新算颜色',10);
 txt(s,'专用素材中已有白色标记',64,164,555,52,27,C.gold,true);
 await img(s,'uv-source.png',64,230,546,273,{fit:'contain',alt:'项目实际使用的紫外线专用素材，预先绘制白色虚线圆和曲线'});
 txt(s,'1  读取像素明暗和色差\n\n2  用“亮且接近白色”找标记\n\n3  背景转紫蓝，标记转亮青\n\n4  采样上下左右，叠加辉光',660,165,558,357,27,C.cream);
 txt(s,'亮度 = 0.2126R + 0.7152G + 0.0722B',64,552,1150,46,30,C.cyan,false,LATIN);
 txt(s,'GPU 在当前画面上逐像素处理，形成可控的视觉滤镜',64,620,1150,44,27,C.cream);
 note(s,'Shader可以理解成一段让GPU对每个像素执行的计算规则。代码先把sRGB纹理解码，在线性颜色空间里用加权RGB算亮度，再用最大分量减最小分量估计色差。白色既亮又没有明显色偏，所以用高亮度、低色差作为荧光候选。smoothstep让阈值平滑过渡。背景按明暗映射到紫蓝色，候选标记映射到亮青色。再取上下左右四个邻点的白色强度做平均，叠加一圈小范围辉光。流程是RenderPass渲染场景、ShaderPass改颜色、OutputPass处理最终输出。它是一种自定义后处理滤镜，不能判断文物的年代、材质或真实隐迹。', ['src/composables/SceneManager.ts：ultravioletShader、initialize()。GLSL中的l()算亮度，w()算白色强度，u()负责颜色映射。','https://threejs.org/docs/pages/ShaderPass.html','https://threejs.org/docs/pages/EffectComposer.html','补充：亮度权重为0.2126、0.7152、0.0722。邻域步长为1.5/resolution。']);
}
{
 const s=slide('功能落地，还要处理加载和恢复',11,{light:true});
 table(s,[['用户遇到的情况','目前的处理'],['快速切换全景','新素材加载成功后替换，丢弃过期结果'],['手机渲染压力较大','像素比上限1.5，普通模式直接渲染'],['刷新或离开页面','保存进度，另有每15秒自动备份'],['素材失败或存档损坏','显示错误和重试入口，恢复前校验数据']],{h:368,widths:[340,812],size:27});
 txt(s,'目前全景仍整图加载，分辨率决定放大后的细节上限',64,592,1150,54,28,C.ink);
 note(s,'除了画面效果，我们也处理真实使用中的问题。异步加载用编号区分新旧请求，避免旧请求覆盖新画面；纹理成功后才替换，并释放旧资源。普通模式直接渲染，紫外模式才运行后处理。存档在关键动作和页面离开时保存，另外每15秒备份。强制结束浏览器时，最后一小段计时仍可能丢失。项目有Vitest和Playwright测试，不能把存在测试等同于完全没有错误。虽然仓库有切片工具，当前渲染器还没有实现分级瓦片加载。', ['src/composables/SceneManager.ts：pixelRatio()、render()、loadTexture()、dispose()。','src/App.vue','src/stores/game.ts','tools/slice-panoramas.py','vitest.config.ts、playwright.config.ts。']);
}
{
 const s=slide('现场演示',12);
 txt(s,'全景与点击',64,167,550,56,33,C.gold,true);
 txt(s,'球内贴图，原地环顾\n射线求交，距离判定',64,244,580,114,36,C.cream);
 txt(s,'紫外线观察',64,408,550,56,33,C.purple,true);
 txt(s,'切换专用素材\n按像素计算颜色和辉光',64,485,580,114,36,C.cream);
 await img(s,'home.png',702,170,514,324,{fit:'contain',alt:'当前项目入口页面'});
 const link=txt(s,'打开项目网页',702,546,510,54,30,C.cyan,true);
 link.text.set([[{run:'打开项目网页',link:{uri:'https://james-chenyuhang987.github.io/dunhuang-mystery/',isExternal:true},textStyle:{color:C.cyan,underline:'sng'}}]]);
 txt(s,'拖动和缩放，切换紫外线，查看线索',64,642,1100,35,23,C.muted);
 note(s,'最后演示三个动作。第一，在同一位置拖动和缩放，观察视野怎样变化。第二，打开紫外线模式，旋转到白色示意标记所在方向，比较两套素材的区别。第三，点击编号线索并打开题目。我们的理解可以压成两句话：全景是在球心看贴图，点击用射线求交和距离判断；紫外线模式先换专用素材，再按规则改变每个像素的颜色。网络不方便时，前面的截图也足以完成讲解。', ['网页地址来自docs/展示PPT.pptx，第20页：https://james-chenyuhang987.github.io/dunhuang-mystery/','图：本次本地运行截图。','演示建议约60秒，总讲解建议约6至8分钟。']);
}

await fs.writeFile(path.join(tmp,'speaker-notes.json'),JSON.stringify(notes,null,2));
const candidate=path.join(tmp,'candidate.pptx');
await (await PresentationFile.exportPptx(ppt)).save(candidate);
for(let i=0;i<ppt.slides.items.length;i++){
 const b=await ppt.export({slide:ppt.slides.items[i],format:'png',scale:1});
 await fs.writeFile(path.join(tmp,'preview',`slide-${i+1}.png`),new Uint8Array(await b.arrayBuffer()));
 console.log(`Rendered ${i+1}`);
}
const final=path.join(root,'docs','敦煌探迹_项目与核心原理_讲解版.pptx');
const result=await finalizePresentation({workspaceDir:root,candidatePath:candidate,finalPath:final,pythonExecutable:py,integrityValidatorPath:path.join(skill,'container_tools/inspect_presentation_package_integrity.py'),layoutValidatorPath:path.join(skill,'container_tools/inspect_presentation_layout_geometry.py'),layoutArgs:['--expected-slide-size-emu','12192000,6858000','--validate-bullet-geometry','--validate-heading-fit',...([4,8,11].flatMap(n=>['--require-native-table-slide',String(n)]))],fontPolicy:{basis:'design',families:[FONT,LATIN]},requiredNativeTableOwnerSlides:[4,8,11],verifyArtifactToolImport:true,receiptPath:path.join(tmp,'final-validation-lecture.json')});
console.log(JSON.stringify(result));
