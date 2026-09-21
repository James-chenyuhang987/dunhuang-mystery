import { Vector3 } from 'three'
import type { authors, level, location } from '@/types/game'
import { DEFAULT_PANORAMA_FOV } from '@/utils/panorama'

// All case events and evidence below are fictional educational material, not historical claims.
const dunhuangLevels: level[] = [
  {
    name: '莫高窟第172窟',
    subtitle: '莫高窟第172窟',
    description: '莫高窟第172窟',
    panorama: [
      {
        name: '现状勘查',
        url: '/dunhuang/panoramas/mogao-cave-172.png',
        ultraviolet_url: '/art/dunhuang-gilded-uv.svg',
        click_points: [
          {
            vec: new Vector3(10, 0, 0),
            accept_click_range: 1.2,
            name: '镀金题记',
            description: '紫外线下显出的镀金题记，沿着墙面纹样留下了暖金色的荧光痕迹。',
            in_uv: true,
          },
        ],
      },
    ],
    hotspots: [
      { clue_index: 0, vec: new Vector3(1.8283, 2.1378, -9.5962) },
      { clue_index: 1, vec: new Vector3(-4.5878, 1.088, 8.8186) },
      { clue_index: 2, vec: new Vector3(1.5402, 4.9641, -8.5432) },
      { clue_index: 3, vec: new Vector3(9.1162, 2.8847, 2.928) },
    ],
    clues: [
      {
        type: 'text',
        name: '为什么同一部经，在两面墙上画了两遍？',
        problem_indexes: [0],
        data: '第172窟最特别的地方之一，是南、北两壁都画了一整铺《观无量寿经变》。所谓“经变”，就是把经文内容转化成可以直接观看的图像。两面墙虽然讲的是同一部经，却不是简单复制：画家在建筑、山水、人物动作和色调上采用了不同处理。也就是说，同一个宗教主题，在盛唐画工手中可以出现两种不同的视觉表达。',
      },
      {
        type: 'text',
        name: '一整面巨幅壁画，应该从哪里开始“读”',
        problem_indexes: [1],
        data: '如果只看中央，你会看到宏大的宫殿、莲池和佛菩萨；但第172窟的《观无量寿经变》并不只是一幅“净土风景画”。画面中央表现西方净土，两侧还分别用连续场景讲述“未生怨”故事，并描绘“十六观”。画工把一部复杂经文拆成不同区域，让观者既能看主场景，也能像读连环画一样追踪故事和修行步骤。',
      },
      {
        type: 'text',
        name: '没有现代透视法，宫殿为什么仍然显得又高、又宽、又深？',
        problem_indexes: [2],
        data: '仔细看这组建筑，你会发现它并没有严格遵守现代单一视点透视。中央大殿采用偏仰视的处理，显得高大；两侧配殿用俯视角度，让院落显得开阔；后部楼阁又接近平视，把视线带向远处。画家把不同观察角度组合进同一幅画面，让观者同时感受到建筑的高度、宽度和纵深。',
      },
      {
        type: 'dialogue',
        name: '中央主尊的讲述',
        data: '点击《观无量寿经变》中央的佛，听他讲述净土主场景、两侧经变叙事与建筑观看方式。',
        problem_indexes: [0, 1, 2],
        hint: '点击画面中央的主尊佛像。',
        placement: '放在南壁或北壁《观无量寿经变》中央主尊位置。',
        media_note: '无需新增媒体；如需要头像，可从全景中截取中央主尊局部，否则省略 avatar。',
        dialogue_id: 'mogao172_central_buddha',
        dialogue: {
          start: 'start',
          nodes: [
            {
              id: 'start',
              speaker: '中央主尊·阿弥陀佛',
              avatar: '/dunhuang/fo.png',
              text: '善观者，你已来到第172窟。我是这一铺《观无量寿经变》中央的佛。你看见的不是一幅静止的风景，而是一部被画出来的经。你想先问什么？',
              options: [
                { label: '我该从哪里开始看？', next: 'read' },
                { label: '南北两壁为什么同题却不同画？', next: 'two_walls' },
                { label: '这些宫殿为什么又高、又宽、又深？', next: 'architecture' },
                { label: '你是谁？为什么坐在中央？', next: 'identity' },
                { label: '我明白了。', next: null },
              ],
            },
            {
              id: 'identity',
              avatar: '/dunhuang/fo.png',
              speaker: '中央主尊·阿弥陀佛',
              text: '我是这一铺观无量寿经变的中央主尊——阿弥陀佛。中央的莲池、宫殿和菩萨眷属共同组成西方净土；我所在的位置，是整铺画面的视觉中心，也是意义中心。',
              options: [
                { label: '那我该如何读整铺画？', next: 'read' },
                { label: '回到刚才。', next: 'start' },
              ],
            },
            {
              id: 'read',
              avatar: '/dunhuang/fo.png',
              speaker: '中央主尊·阿弥陀佛',
              text: '不要只看中央。先看中央的西方净土主场景，再向两侧移动：两侧分别用连续场景讲述“未生怨”故事，并描绘“十六观”。画工把一部复杂经文拆成不同区域，让你既能看主场景，也能像读连环画一样追踪故事和修行步骤。',
              options: [
                { label: '南北两壁为什么不同？', next: 'two_walls' },
                { label: '建筑为什么显得高大深远？', next: 'architecture' },
                { label: '回到刚才。', next: 'start' },
              ],
            },
            {
              id: 'two_walls',
              avatar: '/dunhuang/fo.png',
              speaker: '中央主尊·阿弥陀佛',
              text: '南、北两壁都画《观无量寿经变》，讲的是同一部经，却不是简单复制。不同画工在建筑、山水、人物动作和色调上各有处理。同一宗教主题，在盛唐画工手中可以出现两种不同的视觉表达。',
              options: [
                { label: '画面结构又是怎样安排的？', next: 'read' },
                { label: '建筑画有什么特别？', next: 'architecture' },
                { label: '回到刚才。', next: 'start' },
              ],
            },
            {
              id: 'architecture',
              avatar: '/dunhuang/fo.png',
              speaker: '中央主尊·阿弥陀佛',
              text: '仔细看这组建筑：它没有严格遵守现代单一视点透视。中央大殿偏仰视，所以显得高大；两侧配殿用俯视，让院落开阔；后部楼阁接近平视，把视线带向远处。画家把不同观察角度组合进同一幅画面，于是你同时感到高度、宽度和纵深。',
              options: [
                { label: '我该从哪里开始看？', next: 'read' },
                { label: '南北两壁为什么不同？', next: 'two_walls' },
                { label: '回到刚才。', next: 'start' },
              ],
            },
          ],
        },
      },
    ],
    problems: [
      {
        title: '南、北两壁题材相同，但画面并不完全一样，这最能说明什么？',
        select: [
          '其中一面一定是画工画错了',
          '同一经文题材可以被不同画家用不同方式表现',
          '两面墙原本属于两个完全不同的洞窟',
          '佛教壁画必须做到左右完全一致',
        ],
        true_answer: 1,
        reason: '请结合已解锁线索与题干进行判断。',
      },
      {
        title: '下面哪一项最符合第172窟《观无量寿经变》的画面结构？',
        select: [
          '画面按现代漫画分成大小完全相同的方格',
          '整面墙只画一尊佛，没有其他情节',
          '左右两侧完全是装饰花纹，与经文无关',
          '中央画西方净土，两侧安排故事与“十六观”',
        ],
        true_answer: 3,
        reason: '请结合已解锁线索与题干进行判断。',
      },
      {
        title: '下列哪组观察最符合第172窟北壁建筑画的处理？',
        select: [
          '所有建筑都采用完全相同的正面平视',
          '中央大殿仰视、两侧配殿俯视、后部楼阁平视',
          '所有建筑都从正上方垂直俯视',
          '所有建筑都采用现代摄影式单一点透视',
        ],
        true_answer: 1,
        reason: '请结合已解锁线索与题干进行判断。',
      },
    ],
  },
  {
    name: '莫高窟第322窟',
    panorama: [
      {
        name: '现状勘查',
        url: '/dunhuang/panoramas/mogao-cave-322.png',
        ultraviolet_url: '/art/dunhuang-uv.svg',
        click_points: [],
      },
    ],
    hotspots: [
      { clue_index: 0, vec: new Vector3(-9.8374, -1.7534, 0.3881) },
      { clue_index: 1, vec: new Vector3(-7.8618, 3.5622, 5.05) },
      { clue_index: 2, vec: new Vector3(0.2669, 9.4603, 3.2298) },
    ],
    clues: [
      {
        type: 'text',
        name: '七身塑像没有姓名牌，为什么我们仍能分清他们？',
        problem_indexes: [0],
        data: '第322窟西壁佛龛保存着一组七身塑像：中央是一尊佛，两侧是迦叶、阿难两位弟子，再向外是两身菩萨与两身天王。工匠没有写下人物姓名，却用造型让身份一目了然：佛安详端庄，弟子呈现不同年龄和性格，菩萨姿态柔和，天王力量感强。人物的服饰、姿态和神情，本身就是帮助人们识别他们最好的线索。',
      },
      {
        type: 'text',
        name: '这位天王，为什么更像现实中的将军？',
        problem_indexes: [1],
        data: '第322窟北侧天王戴头盔、穿铠甲、足踏恶鬼，却没有被塑成龇牙怒目的神怪。他的神情甚至带着微笑，身体比例也更接近现实人物。敦煌研究资料认为，这种处理体现了初唐艺术重视写实的一面：工匠会从现实人物和社会经验中寻找素材，再把这些特征转化到宗教造像中。神佛形象因此也带上了鲜明的时代气息。',
      },
      {
        type: 'text',
        name: '飞天没有翅膀，画面为什么还是像在转动？',
        problem_indexes: [2],
        data: '第322窟藻井外沿画有十六身飞天环绕飞行，洞窟中还出现散花、奏乐和舞蹈的飞天。她们并没有翅膀，画家主要依靠不断变化的身体朝向、飘带、衣裙、云气和花瓣来表现飞行。更重要的是，这些飞天围绕藻井中心连续排列，观者的视线会自然跟着人物绕圈移动，于是静止的壁画产生了旋转和流动的感觉。',
      },
    ],
    problems: [
      {
        title: '第322窟西壁佛龛的七身塑像组合是哪一项？',
        select: [
          '三佛 + 二菩萨 + 二天王',
          '一佛 + 六弟子',
          '一佛 + 二弟子 + 二菩萨 + 二天王',
          '一佛 + 二弟子 + 四天王',
        ],
        true_answer: 2,
        reason: '请结合已解锁线索与题干进行判断。',
      },
      {
        title: '从这尊天王的造型中，最合理的判断是什么？',
        select: [
          '只要穿铠甲，就能确定人物的具体身份和姓名',
          '这尊天王一定就是某位有姓名的真实将军肖像',
          '初唐工匠不会表现神话人物，所以只能照抄士兵',
          '宗教造像可以吸收现实人物的外貌、服饰和气质',
        ],
        true_answer: 3,
        reason: '请结合已解锁线索与题干进行判断。',
      },
      {
        title: '哪些视觉手法没有参与共同制造了“飞起来、转起来”的感觉？',
        select: [
          '飞天围绕藻井连续排列',
          '身体朝向不断变化',
          '飘带、衣裙、云气向外舒展',
          '每一身飞天都画有一对翅膀',
        ],
        true_answer: 3,
        reason: '请结合已解锁线索与题干进行判断。',
      },
    ],
  },
  {
    name: '莫高窟第420窟',
    panorama: [
      {
        name: '现状勘查',
        url: '/dunhuang/panoramas/mogao-cave-420.png',
        ultraviolet_url: '/art/dunhuang-uv.svg',
        click_points: [],
      },
    ],
    hotspots: [
      { clue_index: 0, vec: new Vector3(-5.4257, 1.8021, -8.2045) },
      { clue_index: 1, vec: new Vector3(-6.3588, 3.1381, 7.0511) },
      { clue_index: 2, vec: new Vector3(-3.6806, 6.4737, -6.6742) },
    ],
    clues: [
      {
        type: 'text',
        name: '为什么南、西、北三面墙都要开佛龛？',
        problem_indexes: [0],
        data: '第420窟是一座方形覆斗顶殿堂窟，南、西、北三面墙都开有佛龛。西壁主龛内立有一佛、二弟子、四菩萨，南北两龛各有一佛二菩萨，三组造像共同构成“三佛”形式。这样的设计说明，佛龛并不是后来随意增加的空间，而是从一开始就被纳入整体规划。',
      },
      {
        type: 'text',
        name: '一千四百多年后，为什么菩萨的脸还这么鲜明？',
        problem_indexes: [1],
        data: '第420窟是莫高窟现存隋代洞窟中塑像保存状况较好的代表之一。整组塑像没有缺失，也没有明显的后代改动痕迹，大体保留了隋代原貌。尤其靠近阿难的一尊菩萨，面部颜色保存得格外鲜明，因此常被称为“永葆青春的菩萨”。这种保存状态很重要，它让研究者有机会直接观察隋代塑像的体态、衣饰和彩绘方法，而不是只能看到后世重修后的样子。',
      },
      {
        type: 'text',
        name: '三只兔子为什么一共只有三只耳朵？',
        problem_indexes: [2],
        data: '第420窟藻井的莲花中心画着著名的三兔纹：三只兔子首尾追逐，却一共只画出了三只耳朵。每只兔子看起来都与旁边的兔子共享一只耳朵，三只相连的耳朵又形成一个稳定的中心，配合三只兔子的环形追逐，让整个藻井仿佛在旋转。同时敦煌学者认为这种三兔纹与萨珊波斯的图案传统有关，因此它不仅是一个视觉谜题，也可能保存着丝绸之路上图案传播和文化交流的秘密。',
      },
    ],
    problems: [
      {
        title: '“三面开龛”的布局最能说明什么？',
        select: [
          '三组佛龛与造像经过整体规划，共同组织洞窟空间',
          '三个佛龛原本只是存放工具的凹槽',
          '南、北两龛都是近代为了游客参观才开凿的',
          '西壁佛龛与另外两龛完全没有关系',
        ],
        true_answer: 0,
        reason: '请结合已解锁线索与题干进行判断。',
      },
      {
        title: '第420窟为什么是研究隋代彩塑的重要资料？',
        select: [
          ' 洞窟中的塑像每隔几年都会重新上色',
          '塑像保存较完整、后代改动较少，部分原有色彩仍清晰可见',
          '这里的塑像全部由天然彩色石头雕成',
          '因为第420窟是莫高窟年代最早的洞窟',
        ],
        true_answer: 1,
        reason: '请结合已解锁线索与题干进行判断。',
      },
      {
        title: '从第420窟三兔纹中，可以读出哪些信息？',
        select: [
          '三只兔子通过“共鼻”形成视觉巧思',
          '方形追逐强化了旋转和运动感',
          '这种纹样可能反映跨区域的图案传播',
          '三只耳朵只是因为另外三只耳朵全部脱落了',
        ],
        true_answer: 2,
        reason: '请结合已解锁线索与题干进行判断。',
      },
    ],
  },
]

const terracottaLevels: level[] = [
  {
    name: '云冈石窟第三窟',
    subtitle: '第三窟 · 石间春秋',
    description: '从北魏开凿、初唐续造到辽金修缮，以石间遗痕串起历代岁月。',
    panorama: [
      {
        name: '大佛',
        url: '/yungang/yungang_cave3_pano.jpg',
        ultraviolet_url: '/yungang/yungang_cave3_pano.jpg',
        initial_view: { longitude: 180, latitude: 30, fov: DEFAULT_PANORAMA_FOV },
        click_points: [],
      },
    ],
    timeline: [
      { label: '北魏', panorama_index: 0, clue_indexes: [0] },
      { label: '初唐', panorama_index: 0, clue_indexes: [1] },
      { label: '辽金', panorama_index: 0, clue_indexes: [2] },
    ],
    hotspots: [
      { clue_index: 0, vec: new Vector3(-5.0762, 8.1731, -2.7265) },
      { clue_index: 1, vec: new Vector3(-8.1635, 5.7726, 0.1835) },
      { clue_index: 2, vec: new Vector3(-6.3383, 7.6475, 1.1582) },
    ],
    clues: [
      {
        type: 'text',
        name: '北魏——窟体岩壁的凹陷',
        problem_indexes: [0],
        placement: '窟体岩壁',
        media_note: '表面岩层',
        data: '岩壁以砂岩为主，虽然易于开采，但是其本质是碳酸盐矿物，易风化。而当时土木工程技术不完善，所以是否建成了呢？太和年间，最初规划以“斩山为壁——向内掘进”的流程建造，但迁都洛阳后，经济重心南移，因此窟壁的开凿断面和地面的取石沟槽都留给后续朝代来建造。',
      },
      {
        type: 'text',
        name: '初唐——中央大佛',
        problem_indexes: [1],
        placement: '中央大佛上身中央',
        media_note: '中央大佛全身照',
        data: '唐代利用北魏已完成的岩体框架，在此基础上雕刻了“一佛二菩萨”，十米主佛面相丰腴饱满，与北魏“秀骨清像”的清瘦风格完全不同。这样既减少了工作量，又延续了石窟的宗教供奉功能，造就一窟跨两朝的独特奇观。',
      },
      {
        type: 'text',
        name: '辽金——主佛周身的密集小孔',
        problem_indexes: [2],
        placement: '主佛周身的密集小孔，任意一个都可',
        media_note: '钻孔特写',
        data: '砂岩易受风化，因此后世人们需要附着黄泥以进行雕刻精修。为了使石像外部美观，工匠遇到了砂岩表面光滑导致泥皮附着力不足等问题，最终采用钻孔的方式，将木楔打入，以此为骨架，在外露部分表面进行敷泥塑形，贴金彩绘。',
      },
    ],
    problems: [
      {
        title: '你可以从图中找出北魏工程戛然而止的标志吗？',
        select: ['大佛钻孔', '砂岩风化裂痕', '取石沟槽', '泥皮'],
        true_answer: 2,
        reason:
          '取石沟槽和未完成的岩壁断面，说明开凿工程曾经开始却没有完成；大佛钻孔和泥皮则属于后世修整留下的痕迹。',
      },
      {
        title: '即便与北魏原设计不同，唐代工程有什么优势',
        select: ['减少工程量', '延续宗教功能', '更美观', '中外融合'],
        true_answer: 1,
        true_answers: [0, 1],
        reason:
          '唐代利用北魏已经完成的岩体框架，减少了重新开凿的工作量，同时继续承担礼佛供奉功能；题目要求选择这两项直接体现的优势。',
      },
      {
        title: '人们能看见哪些修复痕迹？',
        select: ['砂岩', '泥皮', '木楔', '大佛钻孔'],
        true_answer: 1,
        true_answers: [1, 3],
        reason:
          '后世修整时先在主佛周身钻孔，再用木楔固定骨架、敷泥塑形，因此泥皮和大佛钻孔是能够直接观察到的修复痕迹。',
      },
    ],
  },
  {
    name: '云冈石窟第五窟',
    subtitle: '第五窟 · 云冈遗韵',
    description: '将大佛的恢宏、衣冠的变化与迁都后的余韵，收进一窟之中。',
    panorama: [
      {
        name: '大佛',
        url: '/yungang/yungang_cave5_pano.jpg',
        ultraviolet_url: '/yungang/yungang_cave5_pano.jpg',
        initial_view: { longitude: 180, latitude: 25, fov: DEFAULT_PANORAMA_FOV },
        click_points: [],
      },
    ],
    timeline: [
      { label: '北魏营造', panorama_index: 0, clue_indexes: [0] },
      { label: '服饰交融', panorama_index: 0, clue_indexes: [1] },
      { label: '迁都余波', panorama_index: 0, clue_indexes: [2] },
    ],
    hotspots: [
      { clue_index: 0, vec: new Vector3(-5.5103, 8.3392, 0.3081) },
      { clue_index: 1, vec: new Vector3(-8.1449, 5.1217, 2.7256) },
      { clue_index: 2, vec: new Vector3(-9.0971, -0.6908, -4.0946) },
    ],
    clues: [
      {
        type: 'text',
        name: '大佛为什么这么大',
        problem_indexes: [0],
        data: '作为云冈石窟中最大的佛像，高约17米的释迦牟尼佛像几乎占满了眼前的空间。开凿这样的大佛，需要众多工匠合作。云冈石窟的建造有北魏皇家的资助，眼前的石窟便反映了佛教在北魏的重视，也向我们展现了文化对于城市建设的影响。',
      },
      {
        type: 'text',
        name: '佛像的衣服内藏着什么变化',
        problem_indexes: [1],
        data: '佛教艺术传入中国后，逐渐吸收本土服饰与审美，形成新的造像样式。北魏时期，鲜卑与汉族等不同民族长期交往，孝文帝改革又推动了服饰和习俗的变化。石窟中的衣服，为我们理解这一时代的文化交融提供了线索。',
      },
      {
        type: 'text',
        name: '都城搬走后石窟会怎样',
        problem_indexes: [2],
        data: '公元494年，孝文帝将都城从平城迁往洛阳。随着政治中心转移，皇家大型工程减少，云冈进入晚期营建阶段，但并没有完全停工，仍在继续营造中小型洞窟。造像风格也受到洛阳汉文化审美影响，逐渐从早期雄健厚重的样式向“秀骨清像”过渡。',
      },
    ],
    problems: [
      {
        title: '结合大佛的规模与背景资料，哪项最能体现云冈大型石窟的营造条件？',
        select: [
          '主要依靠一位工匠独立完成全部工程',
          '只要山体足够大，就能自然形成佛像',
          '北魏皇家的支持，以及众多工匠和资源的集中',
          '每一座普通村落都能修建同等规模的石窟',
        ],
        true_answer: 2,
        reason:
          '约17米高的大佛需要长期、协同的开凿与雕刻，背后离不开北魏皇家的支持，以及工匠、材料和组织资源的集中。',
      },
      {
        title: '佛教造像出现中原服饰特点，最能说明什么？',
        select: [
          '外来的佛教艺术吸收了本土文化，产生新的表现形式',
          '这是佛教造像的服饰自然演变的结果',
          '穿中原服饰的佛像，表现的一定是某位汉族人物',
          '不同文化相遇后，其中一种必然完全消失',
        ],
        true_answer: 0,
        reason:
          '佛教艺术传入中国后并非原样不变，而是吸收了中原服饰和审美，形成了具有本土特色的新造像样式。',
      },
      {
        title: '结合迁都地图与营造资料，哪项判断最合理?',
        select: [
          '迁都以后，云冈所有造像活动立即停止',
          '迁都只改变了都城名称，对文化活动没有影响',
          '龙门石窟就是将云冈的大佛搬到洛阳后形成的',
          '政治中心转移影响了皇家营造重心，但云冈仍有后续开凿',
        ],
        true_answer: 3,
        reason:
          '迁都使皇家营造资源和文化重心逐渐转向洛阳，但云冈并未立刻停止，后续仍保留了中小型洞窟和风格演变。',
      },
    ],
  },
  {
    name: '云冈石窟第六窟',
    subtitle: '第六窟 · 衣冠交辉',
    description: '以人物服饰与佛像衣纹为引，映照不同民族相遇、相知与文化交融。',
    panorama: [
      {
        name: '第六窟',
        url: '/yungang/yungang_cave6_pano.jpg',
        ultraviolet_url: '/yungang/yungang_cave6_pano.jpg',
        initial_view: { longitude: 180, latitude: 20, fov: DEFAULT_PANORAMA_FOV },
        click_points: [],
      },
    ],
    timeline: [
      { label: '族群服饰', panorama_index: 0, clue_indexes: [0] },
      { label: '褒衣博带', panorama_index: 0, clue_indexes: [1] },
      { label: '平城交融', panorama_index: 0, clue_indexes: [2] },
    ],
    hotspots: [
      { clue_index: 0, vec: new Vector3(-7.2435, 5.5666, 4.0675) },
      { clue_index: 1, vec: new Vector3(-9.0376, 4.1193, -1.1627) },
      { clue_index: 2, vec: new Vector3(-7.3076, 2.201, -6.4617) },
    ],
    clues: [
      {
        type: 'text',
        name: '注意看！他们的穿着为什么不同？',
        problem_indexes: [0],
        data: '仔细看看这两个人物：他们的帽饰和衣服有什么不同？\n服饰不仅用于日常穿着，也会反映不同的生活习惯与文化传统。图中的差异，为我们认识当时丰富的服饰文化提供了观察入口。',
      },
      {
        type: 'text',
        name: '佛像为什么穿上宽袍？',
        problem_indexes: [1],
        data: '第6窟的造像出现了具有中原特色的“褒衣博带”式服饰。佛教艺术传入中国后，工匠吸收本土的服饰与审美，让佛像呈现出人们更加熟悉的样子。石像衣服的变化，留下了文化相互影响的痕迹。',
      },
      {
        type: 'text',
        name: '一座洞窟里的共同生活',
        problem_indexes: [2],
        data: '云冈石窟所在的平城曾是北魏都城。鲜卑、汉族等不同人群在这里交往，共同参与城市生活与文化创造。民族交融，就是不同民族在长期交往中相互学习、相互影响的过程。石窟艺术正是体现了对这一过程的理解。',
      },
    ],
    problems: [
      {
        title: '观察问题：仔细观察两个人物的帽饰、衣领和衣袖，猜猜他们分别属于什么民族？',
        select: ['汉族 + 匈奴族', '汉族 + 鲜卑族', '鲜卑族 + 蒙古族', '汉族 + 藏族'],
        true_answer: 1,
        reason:
          '结合帽饰、衣领和衣袖等服饰线索，人物形象分别呈现汉族与鲜卑族的特征，也反映了北魏多民族共同生活的背景。',
      },
      {
        title: '佛教造像采用中原“褒衣博带”等服饰特点，说明艺术在传播过程中发生了哪些变化？',
        select: [
          '佛教艺术会吸收当地的服饰和审美特点',
          '外来的艺术形式在传播过程中发生了本土化变化',
          '不同文化之间会相互接触、借鉴和影响',
          '佛像必须完全保持最初传入中国时的造型，不能发生任何变化',
        ],
        true_answer: 0,
        true_answers: [0, 1, 2],
        reason:
          '“褒衣博带”说明佛教造像吸收了中原服饰审美；艺术传播不是简单复制，而是在接触、借鉴中完成了本土化和再创造。',
      },
      {
        title: '结合前两条线索，第6窟中的人物服饰和佛像造型反映了北魏平城怎样的文化现象？',
        select: [
          '不同民族各自生活，彼此之间几乎没有文化交流',
          '不同民族在长期交往中相互学习、相互影响，逐渐出现文化交融',
          '中原文化完全取代了鲜卑文化，原有文化全部消失',
          '石窟中的服饰变化只是工匠个人的艺术选择，与社会生活无关',
        ],
        true_answer: 1,
        reason:
          '服饰与造像的共同变化说明平城各民族长期接触、相互学习，最终在艺术中留下了文化交融的痕迹，而不是一方完全取代另一方。',
      },
    ],
  },
]

export const gameLocations: location[] = [
  {
    id: 'dunhuang',
    name: '敦煌莫高窟',
    title: '敦煌壁画探索',
    subtitle: '壁画与残卷的千年回响',
    introduction:
      '风沙掩埋了足迹，却未曾带走故事。化身壁画探秘者，在方寸洞窟之间，拾起散落的线索，解开沉睡千年的谜题。',
    coordinates: '40°02′ N · 94°48′ E',
    intro_video_url: '/entrance.mp4',
    destination_video_url: '/entry/ToDunhuang.mp4',
    background_url: '/dunhuang/background.jpeg',
    art_caption: '莫高窟 · 九层楼',
    art_caption_english: 'MOGAO CAVES, DUNHUANG',
    levels: dunhuangLevels,
  },
  {
    id: 'yungang',
    name: '云冈石窟',
    title: '云冈石窟探索',
    subtitle: '石窟造像中的失落线索',
    introduction:
      '暂别大漠壁画，步入沉静的石窟造像之间。循编号、纹样与巡查记录，让深埋岁月的线索重新排列。',
    coordinates: '40°06′ N · 113°07′ E',
    destination_video_url: '/entry/ToYungang.mp4',
    background_url: '/yungang/background.jpeg',
    art_caption: '云冈石窟 · 原创画境',
    art_caption_english: 'YUNGANG GROTTOES, DATONG',
    levels: terracottaLevels,
  },
]

export const gameLevels: level[] = gameLocations[0]?.levels ?? []

export const gameAuthors: authors = [
  { name: 'OpenAI GPT6-Astra', job: 'Coding' },
  { name: '陈禹行 杲子挺 阮泓凯 鲍致成', job: 'Developers' },
]
export const siteConfig = {
  title: '敦煌壁画探索',
  subtitle: '一眼千年',
  brand: '石窟 · 探秘',
  brandEnglish: 'CAVE EXPLORATIONS',
  heroEnglish: 'BEYOND THE MURALS',
  introduction:
    '风沙掩埋了足迹，却未曾带走故事。化身壁画探秘者，在方寸洞窟之间，拾起散落的线索，解开沉睡千年的谜题。',
  homeHeading: '执灯，开启探索',
  selectionHeading: '择一卷，入画境',
  endingHeading: '画卷有终，探索无尽。',
  aboutHeading: '让千年壁画，再次开口。',
  chapterCompleteHeading: '此卷疑云，已然散尽。',
  backgroundUrl: '/art/landscape.svg',
  backgroundAlt: '敦煌莫高窟风格山崖与沙海插画',
  headerNote: '一眼千年 · 一步一谜',
  eyebrow: '一场穿越千年的壁画寻踪',
  edition: 'VOL. 01 — 2026',
  seal: ['循迹', '千年'],
  verticalText: '于无声处，听见历史的回响',
  coordinates: '40°02′ N · 94°48′ E',
  location: '中国 · 甘肃 · 敦煌莫高窟',
  artCaption: '莫高窟 · 九层楼',
  artCaptionEnglish: 'MOGAO CAVES, DUNHUANG',
  footerText: '以好奇为灯，照见千年之美。',
  footerMotto: '大漠有境，探索无尽',
  artworkNotice: '原创示意画境 · 非实景影像',
}
