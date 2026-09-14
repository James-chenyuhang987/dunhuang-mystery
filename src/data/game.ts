import { Vector3 } from 'three'
import type { authors, level, location } from '@/types/game'

// All case events and evidence below are fictional educational material, not historical claims.
const dunhuangLevels: level[] = [
  {
    name: '沙海遗简',
    subtitle: '入境',
    description: '一卷遗落沙海的行记，一段被风藏起的往事。循着驼铃，寻找故事的起点。',
    panorama: [
      {
        name: '现状勘查',
        url: '/art/cave-01.svg',
        ultraviolet_url: '/art/dunhuang-uv.svg',
        click_points: [
          { vec: new Vector3(10, 0, 0), accept_click_range: 0.9, name: '蓝签残片', description: '球面中央的蓝签残片与交接簿记载相互呼应。', image: '/art/clue.svg', in_uv: false },
          { vec: new Vector3(10, 0, 0), accept_click_range: 0.9, name: '紫外墨迹', description: '紫外纹理中显出的补记，说明这里曾进行过一次复查。', in_uv: true },
        ],
      },
      {
        name: '旧档复原',
        url: '/art/cave-01.svg',
        click_points: [
          { vec: new Vector3(9.6, -2, 2), accept_click_range: 1.1, name: '匣位刻痕', description: '旧档复原画面里的细小刻痕，为摹本流转提供旁证。', in_uv: false },
        ],
      },
    ],
    hotspots: [{ clue_index: 0, vec: new Vector3(10, 0.7, -2.1) }, { clue_index: 1, vec: new Vector3(10, -0.5, 0) }, { clue_index: 2, vec: new Vector3(10, 1.2, 2.1) }],
    clues: [
      { type: 'image', name: '抄录员的交接簿', problem_indexes: [0], data: '/art/clue.svg', hint: '虚构交接簿记载：甲匣原存蓝签摹本，乙匣原存红签摹本。交接时蓝签摹本暂移至乙匣，归还记录尚未填写。图像为教学示意。' },
      { type: 'text', name: '保管员便笺', problem_indexes: [1], data: '纸签颜色只能提示分类，不能说明移动经过。请核对交接记录，并向当值保管员了解情况。' },
      { type: 'text', name: '现场勘查记录', problem_indexes: [2], data: '本案为虚构教学故事。现场未见破锁或撕裂，也没有指认行为人的直接证据。记录缺漏与盗窃是不同的判断，不能互相替代。' },
    ],
    problems: [
      { title: '按交接簿，蓝签摹本最后被记载移到了哪里？', select: ['甲匣', '乙匣', '洞外沙地', '无法判断任何位置'], true_answer: 1, reason: '交接簿明确写着“蓝签摹本暂移至乙匣”，这是案内最后一条位置记录，并不证明它现在仍在那里。' },
      { title: '发现蓝色纸签后，最可靠的下一步是什么？', select: ['立即指认盗窃者', '按颜色猜测年代', '核对交接簿并询问保管员', '将纸签带走收藏'], true_answer: 2, reason: '颜色仅提示分类；交叉核对记录与当事人证词，比凭单一线索下结论可靠，也避免触碰与带走物品。' },
      { title: '哪一项是这份案卷尚不能支持的结论？', select: ['甲匣原存蓝签摹本', '蓝签摹本曾暂移', '归还记录未填写', '某位保管员偷走了摹本'], true_answer: 3, reason: '没有破锁或撕裂，且没有关于行为人的直接证据。记录缺漏不等同于盗窃，更不能据此指认个人。' },
    ],
  },
  {
    name: '九色秘语',
    subtitle: '寻迹',
    description: '循九色而入，辨壁画中的隐语。在斑驳的色彩之间，找回被遗忘的承诺。',
    panorama: [{
      name: '壁面现状',
      url: '/art/cave-02.svg',
      ultraviolet_url: '/art/dunhuang-uv.svg',
      click_points: [
        { vec: new Vector3(10, 0, 0), accept_click_range: 0.9, name: '九色轮廓', description: '颜料层下方仍能辨认出早期轮廓。', in_uv: true },
      ],
    }],
    hotspots: [{ clue_index: 0, vec: new Vector3(10, 0.7, -2.1) }, { clue_index: 1, vec: new Vector3(10, -0.9, -0.7) }, { clue_index: 2, vec: new Vector3(10, 1.4, 0.9) }, { clue_index: 3, vec: new Vector3(10, -0.35, 2.1) }],
    clues: [
      { type: 'text', name: '展签顺序记录', problem_indexes: [0], data: '教学展签依次写着“救助”“承诺”“背弃”。柜门要求取第二张展签上的两个字。' },
      { type: 'text', name: '策展人的故事卡', problem_indexes: [1], data: '受助者许诺不泄露救助者的所在，后来却为了奖赏泄露了位置。比较许诺的内容与后来的行为。' },
      { type: 'text', name: '褪色观察记录', problem_indexes: [2], data: '记录褪色区域的位置、范围与变化，交由专业人员判断；不自行擦拭、描补或揭取表层。' },
      { type: 'image', name: '教学展签说明', problem_indexes: [3], data: '/art/clue.svg', hint: '展签、柜门和密码均为本游戏编写。图示帮助理解教学谜题，不能据此推断真实文物也包含相同密码。' },
    ],
    problems: [
      { title: '依照修复记录，柜门的两个字应当是什么？', select: ['救助', '承诺', '背弃', '奖赏'], true_answer: 1, reason: '提示要求取第二张展签，记录中第二项是“承诺”。这只是案内编写的文字谜题。' },
      { title: '故事卡中，受助者的行为为何与承诺冲突？', select: ['他为奖赏泄露救助者所在', '他拒绝领取奖赏', '他保护了救助者', '他忘记展签颜色'], true_answer: 0, reason: '承诺是不泄露所在；为了奖赏而泄露，正与这一承诺相违背。' },
      { title: '对于教学记录提到的褪色，哪种做法合适？', select: ['凭想象涂满颜色', '擦拭确认颜料', '记录现象并交由专业人员判断', '揭下表层带走研究'], true_answer: 2, reason: '保护文化遗产应避免擅自接触、擦拭或修补。记录并求助专业人员是更审慎的做法。' },
      { title: '这关的展签密码能证明什么？', select: ['古人一定使用同样密码', '所有九色鹿图像含有密码', '故事在现实中逐字发生', '只能得出本虚构谜题的答案'], true_answer: 3, reason: '教学谜题不是历史证据；展签顺序与柜门密码都由游戏编写，不能推导真实文物具有同样机制。' },
    ],
  },
  {
    name: '藏经余音',
    subtitle: '回响',
    description: '叩开藏经洞的记忆，在残卷与回声里拼合线索，让沉睡的故事重见天光。',
    panorama: [
      { name: '整理前', url: '/art/cave-03.svg', click_points: [{ vec: new Vector3(10, 0, 0), accept_click_range: 0.9, name: '待核编号', description: '残卷边缘的编号仍处于待核验状态。', in_uv: false }] },
      { name: '数字复原后', url: '/art/cave-03.svg', ultraviolet_url: '/art/dunhuang-uv.svg', click_points: [{ vec: new Vector3(10, 0, 0), accept_click_range: 0.9, name: '重合纤维', description: '紫外观察显示两段纸纤维的走向能够衔接。', in_uv: true }] },
    ],
    hotspots: [{ clue_index: 0, vec: new Vector3(10, 0.7, -2.1) }, { clue_index: 1, vec: new Vector3(10, -0.5, 0) }, { clue_index: 2, vec: new Vector3(10, 1.2, 2.1) }],
    clues: [
      { type: 'text', name: '虚构整理室日志', problem_indexes: [0], data: '教学整理室有三份数字摹本记录：A为入库，B为临时借阅，C为归还。时间先后是A、B、C；C备注“已归还原位，编号待核”。' },
      { type: 'text', name: '核验清单', problem_indexes: [1], data: '先核对编号，再核对交接时间，最后联系记录人确认。只有三者吻合才能确认流转；仍有疑点时保留“待核验”，不能凭猜测补齐证据。' },
      { type: 'image', name: '数字摹本传播说明', problem_indexes: [2], data: '/art/clue.svg', hint: '传播数字摹本需保留出处、使用授权和教学材料性质。不能把教学摹本当作新发现的真迹，也不能把游戏剧情当成历史结论。' },
    ],
    problems: [
      { title: '哪份记录在案内时间线上最后出现？', select: ['A：入库', 'B：临时借阅', 'C：归还', '三份没有时间顺序'], true_answer: 2, reason: '日志明确给出A、B、C的先后顺序，因此C是最新记录；其“编号待核”仍需进一步检查。' },
      { title: '看到“已归还原位，编号待核”，应怎样处理？', select: ['立即宣布文物被盗', '先核对编号、交接时间并联系记录人', '删除之前的记录', '自行编造缺失编号'], true_answer: 1, reason: '“待核”说明证据尚不完整。应按核验清单交叉确认，而不是把不确定信息变成既定事实。' },
      { title: '传播这些数字摹本时，哪种说明最准确？', select: ['它们都是本游戏新发现的真迹', '不用标明来源即可商用', '游戏结案等于历史定论', '标明出处、授权与教学摹本性质'], true_answer: 3, reason: '来源、授权和材料性质应清晰区分。本案是虚构教育推理，不能以教学图像或故事宣称历史发现。' },
    ],
  },
]


const terracottaLevels: level[] = [
    {
    name: "第三窟的建造工程问题的历史演变",
    subtitle: "第三窟的建造工程问题的历史演变",
    description: "第三窟的建造工程问题的历史演变",
    panorama: [
      { name: "大佛", url: "/yungang/yungang_cave3_pano.jpg", ultraviolet_url: "/yungang/yungang_cave3_pano.jpg", click_points: [] }
    ],
    hotspots: [
      { clue_index: 0, vec: new Vector3(4.4485, 7.3131, -5.17) },
      { clue_index: 1, vec: new Vector3(-9.3335, 3.5714, 0.362) },
      { clue_index: 2, vec: new Vector3(-6.6263, 7.4892, -0.0604) }
    ],
    clues: [
      { type: "text", name: "窟体岩壁的凹陷", problem_indexes: [0], data: "北魏——窟体岩壁的凹陷\n岩壁以砂岩为主，虽然易于开采，但是其本质是碳酸盐矿物，易风化。而当时土木工程技术不完善，所以是否建成了呢？\n太和年间，最初规划以“斩山为壁——向内掘进”的流程建造，但迁都洛阳，经济重心南移，因此窟壁的开凿断面和地面的取石沟槽都留给了后续朝代的建造。" },
      { type: "text", name: "初唐——中央大佛", problem_indexes: [1], data: "唐代利用北魏已完成的岩体框架，在此基础上雕刻了“一佛二菩萨”，十米主佛面相丰腴饱满，与北魏“秀骨清像”的清瘦风格完全不同。这样大大减少了工作量并延续了石窟的宗教供奉功能，造就一窟跨两朝的独特奇观。" },
      { type: "text", name: "辽金——主佛周身的密集小孔", problem_indexes: [2], data: "砂岩易受风化，因此后世人们需要附着黄泥以进行雕刻精修。为了使石像外部美观，工匠遇到了砂岩表面光滑导致泥皮附着力不足等问题，最终采用钻孔的方式，将木楔打入，以此为骨架，在外露部分表面进行敷泥塑形，贴金彩绘。" }
    ],
    problems: [
      { title: "你可以从图中找出北魏工程戛然而止的标志吗？", select: ["大佛钻孔", "砂岩风化裂痕", "取石沟槽", "泥皮"], true_answer: 2, reason: "请结合已解锁线索与题干进行判断。" },
      { title: "即便与北魏原设计不同，唐代工程有什么优势", select: ["增加工程量", "延续宗教功能", "更美观	", "中外融合"], true_answer: 1, reason: "请结合已解锁线索与题干进行判断。" },
      { title: "人们能看见哪些修复痕迹？", select: ["砂岩", "泥皮", "木楔", "布"], true_answer: 1, reason: "请结合已解锁线索与题干进行判断。" }
    ],
  },
    {
    name: "云冈石窟第五窟",
    subtitle: "云冈石窟第五窟",
    description: "云冈石窟第五窟",
    panorama: [
      { name: "大佛", url: "/yungang/yungang_cave5_pano.jpg", ultraviolet_url: "/yungang/yungang_cave5_pano.jpg", click_points: [] }
    ],
    hotspots: [
      { clue_index: 0, vec: new Vector3(-5.1975, 8.4997, 0.861) },
      { clue_index: 1, vec: new Vector3(-8.1449, 5.1217, 2.7256) },
      { clue_index: 2, vec: new Vector3(-5.7062, 4.8164, -6.6514) }
    ],
    clues: [
      { type: "text", name: "大佛为什么这么大", problem_indexes: [0], data: "作为云冈石窟中最大的佛像，高约17米的释迦牟尼佛像几乎占满了眼前的空间。开凿这样的大佛，需要众多工匠合作。云冈石窟的建造有北魏皇家的资助，眼前的石窟便反映了佛教在北魏的重视，也向我们展现了文化对于城市建设的影响。" },
      { type: "text", name: "佛像的衣服内藏着什么变化", problem_indexes: [1], data: "佛教艺术传入中国后，逐渐吸收本土服饰与审美，形成新的造像样式。北魏时期，鲜卑与汉族等不同民族长期交往，孝文帝改革又推动了服饰和习俗的变化。石窟中的衣服，为我们理解这一时代的文化交融提供了线索。" },
      { type: "text", name: "都城搬走后石窟会怎样", problem_indexes: [2], data: "公元494年，孝文帝将都城从平城迁往洛阳。随着政治中心转移，皇家石窟的重心也转向洛阳，龙门石窟开始兴建,不过云冈并没有完全停工，仍在继续营造中小型洞窟。" }
    ],
    problems: [
      { title: "结合大佛的规模与背景资料，哪项最能体现云冈大型石窟的营造条件？", select: ["主要依靠一位工匠独立完成全部工程", "只要山体足够大，就能自然形成佛像", "北魏皇家的支持，以及众多工匠和资源的集中", "每一座普通村落都能修建同等规模的石窟"], true_answer: 2, reason: "请结合已解锁线索与题干进行判断。" },
      { title: "佛教造像出现中原服饰特点，最能说明什么？", select: ["外来的佛教艺术吸收了本土文化，产生新的表现形式", "这是佛教造像的服饰自然演变的结果", "穿中原服饰的佛像，表现的一定是某位汉族人物", "不同文化相遇后，其中一种必然完全消失"], true_answer: 0, reason: "请结合已解锁线索与题干进行判断。" },
      { title: "结合迁都地图与营造资料，哪项判断最合理?", select: ["迁都以后，云冈所有造像活动立即停止", "迁都只改变了都城名称，对文化活动没有影响", "龙门石窟就是将云冈的大佛搬到洛阳后形成的", "政治中心转移影响了皇家营造重心，但云冈仍有后续开凿"], true_answer: 3, reason: "请结合已解锁线索与题干进行判断。" }
    ],
  },
  {
    name: "第六窟 · 衣冠交辉",
    subtitle: "第六窟 · 衣冠交辉",
    description: "第六窟 · 衣冠交辉",
    panorama: [
      { name: "第六窟", url: "/yungang/yungang_cave6_pano.jpg", ultraviolet_url: "/yungang/yungang_cave6_pano.jpg", click_points: [] }
    ],
    hotspots: [
      { clue_index: 0, vec: new Vector3(-7.2303, 2.855, 6.2906) },
      { clue_index: 1, vec: new Vector3(-9.0376, 4.1193, -1.1627) },
      { clue_index: 2, vec: new Vector3(10, 0, 0) }
    ],
    clues: [
      { type: "text", name: "注意看！他们的穿着为什么不同？", problem_indexes: [0], data: "仔细看看这两个人物：他们的帽饰和衣服有什么不同？\n服饰不仅用于日常穿着，也会反映不同的生活习惯与文化传统。图中的差异，为我们认识当时丰富的服饰文化提供了观察入口。" },
      { type: "text", name: "佛像为什么穿上宽袍？", problem_indexes: [1], data: "第6窟的造像出现了具有中原特色的“褒衣博带”式服饰。佛教艺术传入中国后，工匠吸收本土的服饰与审美，让佛像呈现出人们更加熟悉的样子。石像衣服的变化，留下了文化相互影响的痕迹。" },
      { type: "text", name: "一座洞窟里的共同生活", problem_indexes: [2], data: "云冈石窟所在的平城曾是北魏都城。鲜卑、汉族等不同人群在这里交往，共同参与城市生活与文化创造。民族交融，就是不同民族在长期交往中相互学习、相互影响的过程。石窟艺术正是体现了对这一过程的理解。" }
    ],
    problems: [
      { title: "观察问题：仔细观察两个人物的帽饰、衣领和衣袖，猜猜他们分别属于什么民族？", select: ["汉族 + 匈奴族", "汉族 + 鲜卑族", "鲜卑族 + 蒙古族", "汉族 + 藏族"], true_answer: 1, reason: "请结合已解锁线索与题干进行判断。" },
      { title: "佛教造像采用中原“褒衣博带”等服饰特点，说明艺术在传播过程中发生了哪些变化？", select: ["佛教艺术会吸收当地的服饰和审美特点", "外来的艺术形式在传播过程中不会发生本土化变化", "不同文化之间不会相互接触、借鉴和影响", "佛像必须完全保持最初传入中国时的造型，不能发生任何变化"], true_answer: 0, reason: "请结合已解锁线索与题干进行判断。" },
      { title: "结合前两条线索，第6窟中的人物服饰和佛像造型反映了北魏平城怎样的文化现象？", select: ["不同民族各自生活，彼此之间几乎没有文化交流", "不同民族在长期交往中相互学习、相互影响，逐渐出现文化交融", "中原文化完全取代了鲜卑文化，原有文化全部消失", "石窟中的服饰变化只是工匠个人的艺术选择，与社会生活无关"], true_answer: 1, reason: "请结合已解锁线索与题干进行判断。" }
    ],
  },
]

export const gameLocations: location[] = [
  { id: 'dunhuang', name: '敦煌莫高窟', title: '敦煌壁画探索', subtitle: '壁画与残卷的千年回响', introduction: '风沙掩埋了足迹，却未曾带走故事。化身壁画探秘者，在方寸洞窟之间，拾起散落的线索，解开沉睡千年的谜题。', coordinates: '40°02′ N · 94°48′ E', intro_video_url: '/entrance.mp4', destination_video_url: '/entry/ToDunhuang.mp4', background_url: '/dunhuang/background.jpeg', art_caption: '莫高窟 · 九层楼', art_caption_english: 'MOGAO CAVES, DUNHUANG', levels: dunhuangLevels },
  { id: 'yungang', name: '云冈石窟', title: '云冈石窟探索', subtitle: '石窟造像中的失落线索', introduction: '暂别大漠壁画，步入沉静的石窟造像之间。循编号、纹样与巡查记录，让深埋岁月的线索重新排列。', coordinates: '40°06′ N · 113°07′ E', destination_video_url: '/entry/ToYungang.mp4', background_url: '/yungang/background.jpeg', art_caption: '云冈石窟 · 原创画境', art_caption_english: 'YUNGANG GROTTOES, DATONG', levels: terracottaLevels },
]

export const gameLevels: level[] = gameLocations[0]?.levels ?? []

export const gameAuthors: authors = [
  { name: 'OpenAI GPT6-Astra', job: 'Coding' },
  { name: '陈禹行 杲子挺 阮泓凯 鲍致成', job: 'Developers' },
]
export const siteConfig = {
  title: '敦煌壁画探索',
  subtitle: '一眼千年',
  brand: '敦煌 · 探迹',
  brandEnglish: 'DUNHUANG EXPLORER',
  heroEnglish: 'BEYOND THE MURALS',
  introduction: '风沙掩埋了足迹，却未曾带走故事。化身壁画探秘者，在方寸洞窟之间，拾起散落的线索，解开沉睡千年的谜题。',
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
