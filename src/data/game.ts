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
    hotspots: [{ clue_index: 0, yaw: -12, pitch: 4 }, { clue_index: 1, yaw: 0, pitch: -3 }, { clue_index: 2, yaw: 12, pitch: 7 }],
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
    hotspots: [{ clue_index: 0, yaw: -12, pitch: 4 }, { clue_index: 1, yaw: -4, pitch: -5 }, { clue_index: 2, yaw: 5, pitch: 8 }, { clue_index: 3, yaw: 12, pitch: -2 }],
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
    hotspots: [{ clue_index: 0, yaw: -12, pitch: 4 }, { clue_index: 1, yaw: 0, pitch: -3 }, { clue_index: 2, yaw: 12, pitch: 7 }],
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
    name: '军阵失序', subtitle: '列阵',
    description: '步入陶俑军阵，从姿态、方位与编号记录中找出一尊错列的教学复原俑。',
    panorama: [{ name: '军阵现状', url: '/art/terracotta-01.svg', ultraviolet_url: '/art/terracotta-uv.svg', click_points: [{ vec: new Vector3(10, 0, 0), accept_click_range: 0.9, name: '错列编号', description: '编号位置与虚构军阵记录不符。', in_uv: false }] }],
    hotspots: [{ clue_index: 0, yaw: -12, pitch: 4 }, { clue_index: 1, yaw: 0, pitch: -3 }, { clue_index: 2, yaw: 12, pitch: 7 }],
    clues: [
      { type: 'text', name: '虚构军阵记录', problem_indexes: [0], data: '教学记录按朝向编号：一列与二列面向东，三列面向南。编号B-07原记于二列，不应出现在三列。' },
      { type: 'image', name: '陶片纹样 · 原创教学示意', problem_indexes: [1], data: '/art/terracotta-clue.svg' },
      { type: 'text', name: '观察守则', problem_indexes: [2], data: '姿态与服饰可以协助分类，但仅凭外观不能断定身份。应同时核对编号、位置与修复记录。' },
    ],
    problems: [
      { title: '按军阵记录，哪一编号的位置需要复核？', select: ['A-02', 'B-07', 'C-11', 'D-04'], true_answer: 1, reason: 'B-07原记于二列，却出现在三列，因此需要复核。' },
      { title: '图示中反复出现的主要几何纹样是哪一种？', select: ['连续菱格', '同心圆', '水波线', '五角星'], true_answer: 0, reason: '原创教学示意以连续菱格为主要视觉结构。' },
      { title: '判断陶俑是否错列，最可靠的做法是什么？', select: ['只看面部', '凭身高猜测', '核对编号、位置与修复记录', '移动陶俑查看底部'], true_answer: 2, reason: '交叉核对记录最审慎，也能避免不必要的接触。' },
    ],
  },
  {
    name: '陶片密码', subtitle: '合纹',
    description: '在修复室里寻找相邻陶片，让断开的纹样和编号重新衔接。',
    panorama: [{ name: '修复记录', url: '/art/terracotta-02.svg', click_points: [{ vec: new Vector3(10, 0, 0), accept_click_range: 0.9, name: '双斜线断面', description: '相邻陶片边缘出现连续双斜线。', in_uv: false }] }],
    hotspots: [{ clue_index: 0, yaw: -12, pitch: 4 }, { clue_index: 1, yaw: 0, pitch: -3 }, { clue_index: 2, yaw: 12, pitch: 7 }],
    clues: [
      { type: 'text', name: '修复台编号表', problem_indexes: [0], data: '虚构编号表：T12左缘为双斜线，T13右缘为双斜线；两片登记在同一层位，但仍需核对断面。' },
      { type: 'image', name: '断面记录 · 原创教学示意', problem_indexes: [1], data: '/art/terracotta-clue.svg', hint: '用数字图像与尺寸记录比较断面，由专业人员核验；强行拼压实物可能造成二次损伤。' },
      { type: 'text', name: '数字复原说明', problem_indexes: [2], data: '数字拼合只是提出候选关系；真正结论还需尺寸、材质、层位与专业人员共同核验。' },
    ],
    problems: [
      { title: '编号表首先提示哪两片可能相邻？', select: ['T01与T03', 'T12与T13', 'T13与T20', '无法提出候选'], true_answer: 1, reason: 'T12和T13边缘都记录为双斜线，且来自同一层位。' },
      { title: '比较断面时，不应采取哪种方式？', select: ['查看数字图像', '记录尺寸', '强行拼压实物', '交由专业人员核验'], true_answer: 2, reason: '强行拼压会造成二次损伤，应优先使用非接触记录。' },
      { title: '数字拼合结果应被理解为什么？', select: ['最终历史定论', '可供核验的候选关系', '可以忽略层位', '自动获得文物身份'], true_answer: 1, reason: '数字结果是辅助证据，必须与其他记录共同核验。' },
    ],
  },
  {
    name: '甬道回声', subtitle: '寻源',
    description: '沿虚构甬道追踪三份巡查记录，判断异常声响来自哪里。',
    panorama: [{ name: '巡查时刻', url: '/art/terracotta-03.svg', ultraviolet_url: '/art/terracotta-uv.svg', click_points: [{ vec: new Vector3(10, 0, 0), accept_click_range: 0.9, name: '外罩松动处', description: '设备外罩边缘留有需要专业人员复核的松动痕迹。', in_uv: true }] }],
    hotspots: [{ clue_index: 0, yaw: -12, pitch: 4 }, { clue_index: 1, yaw: 0, pitch: -3 }, { clue_index: 2, yaw: 12, pitch: 7 }],
    clues: [
      { type: 'text', name: '巡查日志对照', problem_indexes: [0], data: '甲：20:10东段无异常，20:18中段听到两次金属轻响。乙：20:19中段通风设备启动，外罩有一处松动，随后停止运行。对照两份日志的位置。' },
      { type: 'text', name: '设备安全提示', problem_indexes: [1], data: '发现松动设施应先封控并报告，由专业人员检查；不擅自拆除、继续运行设备或移动周边陶俑。' },
      { type: 'image', name: '甬道声源核验图', problem_indexes: [2], data: '/art/terracotta-clue.svg', hint: '声响与设备启动的时间、位置相近，使设备成为需检查的声源候选。相关性不能单独证明原因，也没有证据表明文物受损。' },
    ],
    problems: [
      { title: '两份日志共同指向哪个区域需要先检查？', select: ['东段', '中段', '西段', '入口外'], true_answer: 1, reason: '声响与设备启动都记录在中段，且时间相邻。' },
      { title: '面对松动的设备外罩，合适的处理是什么？', select: ['自行拆除', '继续运行观察', '封控、报告并由专业人员检查', '搬动附近陶俑'], true_answer: 2, reason: '安全和遗产保护都要求避免擅自操作。' },
      { title: '目前证据能够支持的结论是哪一项？', select: ['设备一定损坏了文物', '有人进入甬道', '中段设备是需核验的声源候选', '声响来自陶俑'], true_answer: 2, reason: '时间和位置使设备成为候选，但尚不足以断言最终原因。' },
    ],
  },
]

export const gameLocations: location[] = [
  { id: 'dunhuang', name: '敦煌莫高窟', title: '敦煌壁画探索', subtitle: '壁画与残卷的千年回响', introduction: '风沙掩埋了足迹，却未曾带走故事。化身壁画探秘者，在方寸洞窟之间，拾起散落的线索，解开沉睡千年的谜题。', coordinates: '40°02′ N · 94°48′ E', background_url: '/art/landscape.svg', art_caption: '莫高窟 · 九层楼', art_caption_english: 'MOGAO CAVES, DUNHUANG', levels: dunhuangLevels },
  { id: 'terracotta', name: '秦始皇帝陵博物院', title: '兵马俑秘境探索', subtitle: '陶俑军阵中的失落线索', introduction: '暂别大漠壁画，步入沉静的陶俑军阵。循编号、纹样与巡查记录，让深埋地下的线索重新排列。', coordinates: '34°23′ N · 109°16′ E', background_url: '/art/terracotta-landscape.svg', art_caption: '秦俑军阵 · 原创画境', art_caption_english: 'TERRACOTTA ARMY, XI’AN', levels: terracottaLevels },
]

export const gameLevels: level[] = gameLocations[0]?.levels ?? []

export const gameAuthors: authors = [
  { name: 'OpenAI GPT6-Astra', job: 'Coding' },
  { name: '陈禹行 杲子挺 阮泓凯 鲍致成', job: 'Developers' },
]
export const mediaConfig = { introVideoUrl: '/entrance.mp4', introPosterUrl: '/background.jpeg', locationPauseRatio: 0.5 }

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
