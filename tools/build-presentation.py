from pathlib import Path
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN, MSO_ANCHOR
from pptx.enum.shapes import MSO_SHAPE, MSO_CONNECTOR
from pptx.enum.dml import MSO_THEME_COLOR
from pptx.enum.text import MSO_AUTO_SIZE
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'docs' / 'DUNHUANG_EXPLORER_TECH_BRIEF.pptx'
SHOT = ROOT / 'test-results' / 'visual-desktop-and-mobile-visual-checks-chromium'

NAVY = RGBColor(10, 21, 35)
NAVY2 = RGBColor(18, 35, 54)
INK = RGBColor(31, 38, 47)
CREAM = RGBColor(246, 241, 231)
WHITE = RGBColor(255, 255, 255)
GOLD = RGBColor(220, 175, 100)
GOLD2 = RGBColor(245, 210, 135)
CYAN = RGBColor(106, 211, 215)
MUTED = RGBColor(166, 176, 184)
RED = RGBColor(235, 126, 116)
GREEN = RGBColor(137, 211, 158)
PURPLE = RGBColor(135, 112, 220)

prs = Presentation()
prs.slide_width = Inches(13.333)
prs.slide_height = Inches(7.5)
blank = prs.slide_layouts[6]


def box(slide, x, y, w, h, fill=None, line=None, radius=False):
    shape_type = MSO_SHAPE.ROUNDED_RECTANGLE if radius else MSO_SHAPE.RECTANGLE
    s = slide.shapes.add_shape(shape_type, Inches(x), Inches(y), Inches(w), Inches(h))
    s.fill.solid()
    s.fill.fore_color.rgb = fill or NAVY
    s.line.color.rgb = line or (fill or NAVY)
    if radius:
        s.adjustments[0] = 0.12
    return s


def text(slide, value, x, y, w, h, size=18, color=WHITE, bold=False, font='PingFang SC', align=PP_ALIGN.LEFT, valign=MSO_ANCHOR.TOP, margin=0.05, italic=False):
    shape = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = shape.text_frame
    tf.clear()
    tf.word_wrap = True
    tf.margin_left = Inches(margin)
    tf.margin_right = Inches(margin)
    tf.margin_top = Inches(margin)
    tf.margin_bottom = Inches(margin)
    tf.vertical_anchor = valign
    p = tf.paragraphs[0]
    p.alignment = align
    run = p.add_run()
    run.text = value
    run.font.name = font
    run.font.size = Pt(size)
    run.font.bold = bold
    run.font.italic = italic
    run.font.color.rgb = color
    return shape


def rich_text(slide, runs, x, y, w, h, size=18, color=WHITE, font='PingFang SC', margin=0.05, align=PP_ALIGN.LEFT):
    shape = slide.shapes.add_textbox(Inches(x), Inches(y), Inches(w), Inches(h))
    tf = shape.text_frame
    tf.clear(); tf.word_wrap = True
    tf.margin_left = tf.margin_right = tf.margin_top = tf.margin_bottom = Inches(margin)
    p = tf.paragraphs[0]; p.alignment = align
    for value, opts in runs:
        r = p.add_run(); r.text = value; r.font.name = opts.get('font', font)
        r.font.size = Pt(opts.get('size', size)); r.font.bold = opts.get('bold', False)
        r.font.color.rgb = opts.get('color', color)
    return shape


def add_img(slide, path, x, y, w, h, crop=True, line=None):
    path = Path(path)
    if not path.exists():
        box(slide, x, y, w, h, fill=NAVY2, line=line or NAVY2, radius=True)
        text(slide, 'asset unavailable', x, y + h/2 - 0.15, w, 0.3, size=11, color=MUTED, align=PP_ALIGN.CENTER)
        return
    with Image.open(path) as im:
        iw, ih = im.size
    target = w / h
    source = iw / ih
    if crop and source > target:
        # python-pptx crop values are fractions of the source image.
        crop_l = (1 - target / source) / 2
        pic = slide.shapes.add_picture(str(path), Inches(x), Inches(y), width=Inches(w), height=Inches(h))
        pic.crop_left = crop_l; pic.crop_right = crop_l
    elif crop and source < target:
        crop_t = (1 - source / target) / 2
        pic = slide.shapes.add_picture(str(path), Inches(x), Inches(y), width=Inches(w), height=Inches(h))
        pic.crop_top = crop_t; pic.crop_bottom = crop_t
    else:
        pic = slide.shapes.add_picture(str(path), Inches(x), Inches(y), width=Inches(w), height=Inches(h))
    if line:
        pic.line.color.rgb = line
        pic.line.width = Pt(1.3)
    return pic


def bg(slide, color=NAVY):
    slide.background.fill.solid(); slide.background.fill.fore_color.rgb = color


def header(slide, kicker, title_value, page, dark=True):
    color = WHITE if dark else INK
    muted = MUTED if dark else RGBColor(108, 116, 123)
    text(slide, kicker.upper(), 0.65, 0.35, 5, 0.28, size=10, color=GOLD, bold=True, font='Aptos')
    text(slide, title_value, 0.65, 0.72, 11.8, 0.6, size=27, color=color, bold=True)
    text(slide, f'{page:02d}  /  DUNHUANG EXPLORER', 10.45, 7.12, 2.25, 0.18, size=8, color=muted, font='Aptos', align=PP_ALIGN.RIGHT)


def pill(slide, label, x, y, w, color=GOLD, text_color=NAVY):
    box(slide, x, y, w, 0.3, fill=color, line=color, radius=True)
    text(slide, label, x, y + 0.025, w, 0.22, size=9, color=text_color, bold=True, align=PP_ALIGN.CENTER, font='Aptos')


def card(slide, title_value, body, x, y, w, h, accent=GOLD, fill=NAVY2, title_size=15, body_size=11):
    box(slide, x, y, w, h, fill=fill, line=RGBColor(46, 66, 86), radius=True)
    box(slide, x, y, 0.06, h, fill=accent, line=accent, radius=True)
    text(slide, title_value, x + 0.23, y + 0.18, w - 0.4, 0.35, size=title_size, color=WHITE, bold=True)
    text(slide, body, x + 0.23, y + 0.62, w - 0.4, h - 0.78, size=body_size, color=RGBColor(211, 218, 221))


def line(slide, x1, y1, x2, y2, color=GOLD, width=2.0, begin=None, end=None):
    l = slide.shapes.add_connector(MSO_CONNECTOR.STRAIGHT, Inches(x1), Inches(y1), Inches(x2), Inches(y2))
    l.line.color.rgb = color; l.line.width = Pt(width)
    if begin: l.line.begin_arrowhead = begin
    if end: l.line.end_arrowhead = end
    return l


def code(slide, value, x, y, w, h, size=10, fill=RGBColor(7, 15, 25)):
    box(slide, x, y, w, h, fill=fill, line=RGBColor(42, 62, 82), radius=True)
    text(slide, value, x + 0.16, y + 0.12, w - 0.32, h - 0.24, size=size, color=RGBColor(202, 220, 224), font='Menlo', margin=0.01)


def dot(slide, x, y, r=0.08, color=CYAN):
    s = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(x-r), Inches(y-r), Inches(2*r), Inches(2*r))
    s.fill.solid(); s.fill.fore_color.rgb = color; s.line.color.rgb = color
    return s

# 1 Cover
slide = prs.slides.add_slide(blank); bg(slide, NAVY)
add_img(slide, SHOT / 'home-desktop.png', 7.3, 0, 6.03, 7.5, crop=True)
box(slide, 6.6, 0, 1.0, 7.5, fill=NAVY, line=NAVY)
text(slide, 'DUNHUANG · EXPLORER', 0.78, 0.72, 5.5, 0.35, size=12, color=GOLD, bold=True, font='Aptos')
text(slide, '一眼千年', 0.75, 1.55, 5.9, 1.0, size=44, color=WHITE, bold=True)
text(slide, '敦煌·探迹', 0.82, 2.63, 5.5, 0.65, size=25, color=GOLD2, bold=True)
text(slide, '产品与代码技术介绍', 0.82, 3.42, 5.5, 0.45, size=21, color=RGBColor(224, 229, 228))
text(slide, '让千年壁画，再次开口。\n从“能用”到“知道为什么能用”。', 0.82, 4.45, 5.3, 0.72, size=15, color=MUTED)
line(slide, 0.82, 5.55, 3.15, 5.55, GOLD, 2)
text(slide, 'Vue 3  ·  TypeScript  ·  Three.js  ·  Pinia', 0.82, 5.8, 5.5, 0.3, size=11, color=CYAN, font='Aptos')
text(slide, '2026  |  PRODUCT + ENGINEERING BRIEF', 0.82, 6.75, 5.7, 0.25, size=9, color=MUTED, font='Aptos')

# 2 Contents
slide = prs.slides.add_slide(blank); bg(slide, CREAM); header(slide, 'CONTENTS · 目录', '今天讲三件事：产品是什么、技术怎么做、还能怎么发展', 2, dark=False)
text(slide, '从用户体验出发，再回到代码和原理。', 0.72, 1.5, 11.6, 0.36, size=16, color=INK)
# contents cards
for y, no, title_value, body, col in [
    (2.25, '01', '产品体验', '我们做了什么？用户如何从进入地点走到完成探索？', GOLD),
    (3.45, '02', '技术原理', '全景为什么能转？点击为什么能命中？UV 模式到底做了什么？', PURPLE),
    (4.65, '03', '工程总结', '如何让它稳定、可恢复、可扩展，并继续接入更多文化内容？', CYAN),
]:
    box(slide, 0.85, y, 11.45, 0.86, fill=WHITE, line=RGBColor(220, 213, 197), radius=True)
    text(slide, no, 1.15, y + 0.22, 0.72, 0.3, size=21, color=col, bold=True, font='Aptos')
    text(slide, title_value, 2.1, y + 0.18, 2.0, 0.3, size=18, color=INK, bold=True)
    text(slide, body, 4.1, y + 0.2, 7.6, 0.32, size=13, color=RGBColor(82, 88, 94))
text(slide, '重点技术部分：第 6–9 页，用“先讲人话，再讲实现”的方式解释。', 0.85, 6.15, 11.3, 0.35, size=16, color=INK, bold=True)

# 3 Part A divider
slide = prs.slides.add_slide(blank); bg(slide, NAVY)
text(slide, 'PART A', 0.82, 1.18, 2.2, 0.4, size=14, color=GOLD, bold=True, font='Aptos')
text(slide, '产品体验', 0.8, 2.0, 6.2, 0.8, size=38, color=WHITE, bold=True)
text(slide, '用户如何进入、观察、发现，并完成一段文化探索？', 0.84, 3.1, 7.4, 0.42, size=18, color=RGBColor(216, 224, 225))
line(slide, 0.84, 4.05, 3.4, 4.05, GOLD, 2)
pill(slide, '体验入口', 0.84, 4.55, 1.15, color=GOLD)
pill(slide, '探索闭环', 2.18, 4.55, 1.25, color=CYAN)
pill(slide, '产品形态', 3.62, 4.55, 1.25, color=RGBColor(225,223,212), text_color=INK)
text(slide, '第 1 部分', 0.84, 6.5, 2.0, 0.25, size=10, color=MUTED, font='Aptos')
text(slide, '03  /  DUNHUANG EXPLORER', 10.45, 7.12, 2.25, 0.18, size=8, color=MUTED, font='Aptos', align=PP_ALIGN.RIGHT)

# 4 Product overview
slide = prs.slides.add_slide(blank); bg(slide, CREAM); header(slide, 'PART 1 · 产品体验', '不是看图，而是进入一段可推理的故事', 4, dark=False)
text(slide, '用户在洞窟全景里观察、切换时相、拾取线索，再用问题把证据连接起来。', 0.7, 1.5, 11.8, 0.38, size=15, color=INK)
card(slide, '环顾', '拖动 360° 观察洞窟，滚轮 / 双指改变视野。', 0.7, 2.25, 2.75, 2.0, accent=CYAN, fill=WHITE, title_size=17, body_size=12)
card(slide, '寻迹', '点击全景中的隐藏发现，编号热点直达探秘手札。', 3.65, 2.25, 2.75, 2.0, accent=GOLD, fill=WHITE, title_size=17, body_size=12)
card(slide, '辨色', '切换时间档案与紫外线观察，发现肉眼看不到的线索。', 6.6, 2.25, 2.75, 2.0, accent=PURPLE, fill=WHITE, title_size=17, body_size=12)
card(slide, '推理', '结合线索答题，答错也保留记录，完成一关后形成探索回响。', 9.55, 2.25, 2.75, 2.0, accent=RED, fill=WHITE, title_size=17, body_size=12)
text(slide, '产品形态', 0.72, 5.0, 1.2, 0.25, size=11, color=GOLD, bold=True)
pill(slide, '敦煌莫高窟', 0.72, 5.38, 1.55, color=GOLD)
pill(slide, '云冈石窟', 2.45, 5.38, 1.35, color=CYAN)
pill(slide, '桌面 + 移动端', 3.98, 5.38, 1.75, color=RGBColor(225, 223, 212), text_color=INK)
pill(slide, '原创教学素材', 5.92, 5.38, 1.75, color=RGBColor(225, 223, 212), text_color=INK)
text(slide, '核心价值：把文化内容变成“可进入、可观察、可验证”的互动体验。', 0.72, 6.25, 11.2, 0.4, size=17, color=INK, bold=True)

# 3 Demo shots
slide = prs.slides.add_slide(blank); bg(slide, NAVY); header(slide, 'PART 1 · 产品体验', '一条完整的探索路径', 5)
add_img(slide, SHOT / 'home-desktop.png', 0.7, 1.5, 3.85, 2.68, line=RGBColor(61, 87, 106))
add_img(slide, SHOT / 'selection-desktop.png', 4.74, 1.5, 3.85, 2.68, line=RGBColor(61, 87, 106))
add_img(slide, SHOT / 'game-desktop.png', 8.78, 1.5, 3.85, 2.68, line=RGBColor(61, 87, 106))
text(slide, '01 进入地点', 0.76, 4.35, 3.5, 0.3, size=13, color=GOLD, bold=True)
text(slide, '开场动画只播放一次，入口以地点为单位组织。', 0.76, 4.72, 3.45, 0.45, size=11, color=MUTED)
text(slide, '02 选择关卡', 4.8, 4.35, 3.5, 0.3, size=13, color=GOLD, bold=True)
text(slide, '难度决定题量；关卡、时相和线索全部由数据驱动。', 4.8, 4.72, 3.45, 0.45, size=11, color=MUTED)
text(slide, '03 沉浸探索', 8.84, 4.35, 3.5, 0.3, size=13, color=GOLD, bold=True)
text(slide, '全景 + 时间轴 + 热点 + 题目，形成完整闭环。', 8.84, 4.72, 3.45, 0.45, size=11, color=MUTED)
line(slide, 4.55, 2.83, 4.72, 2.83, CYAN, 2)
line(slide, 8.59, 2.83, 8.76, 2.83, CYAN, 2)
text(slide, '“先看见，再解释；先发现，再作答。”', 0.72, 6.0, 8.0, 0.45, size=19, color=WHITE, bold=True)
text(slide, '视觉验证：Playwright snapshots / desktop + mobile', 8.55, 6.1, 3.8, 0.3, size=10, color=CYAN, font='Aptos', align=PP_ALIGN.RIGHT)

# 4 architecture
slide = prs.slides.add_slide(blank); bg(slide, CREAM); header(slide, 'PART 1 · 产品体验', '一份配置，驱动一条可扩展的产品链路', 6, dark=False)
# layers
box(slide, 0.8, 1.55, 11.75, 0.72, fill=NAVY, line=NAVY, radius=True)
text(slide, 'VIEW LAYER', 1.05, 1.73, 1.45, 0.2, size=10, color=GOLD, bold=True, font='Aptos')
text(slide, 'HomeView  ·  PlaceHome  ·  GameView  ·  EndingView', 2.35, 1.7, 8.9, 0.28, size=15, color=WHITE, bold=True)
box(slide, 0.8, 2.5, 11.75, 0.72, fill=NAVY2, line=NAVY2, radius=True)
text(slide, 'COMPONENTS', 1.05, 2.68, 1.45, 0.2, size=10, color=CYAN, bold=True, font='Aptos')
text(slide, 'PanoramaViewer  ·  CluePanel  ·  DifficultyControl  ·  MediaViewer', 2.35, 2.65, 9.2, 0.28, size=15, color=WHITE, bold=True)
box(slide, 0.8, 3.45, 11.75, 0.72, fill=RGBColor(229, 224, 211), line=RGBColor(201, 194, 178), radius=True)
text(slide, 'STATE', 1.05, 3.63, 1.45, 0.2, size=10, color=PURPLE, bold=True, font='Aptos')
text(slide, 'Pinia game store  ·  答题记录  ·  线索解锁  ·  localStorage 存档', 2.35, 3.6, 9.2, 0.28, size=15, color=INK, bold=True)
box(slide, 0.8, 4.4, 11.75, 0.72, fill=RGBColor(219, 235, 231), line=RGBColor(173, 207, 198), radius=True)
text(slide, 'RENDER', 1.05, 4.58, 1.45, 0.2, size=10, color=RGBColor(36, 127, 126), bold=True, font='Aptos')
text(slide, 'Three.js / WebGL  ·  SphereGeometry  ·  Raycaster  ·  ShaderPass', 2.35, 4.55, 9.2, 0.28, size=15, color=INK, bold=True)
# bottom dependency rail
text(slide, 'TOOLING', 0.8, 5.65, 1.0, 0.25, size=10, color=GOLD, bold=True, font='Aptos')
pill(slide, 'Vite', 1.85, 5.58, 0.75, color=GOLD)
pill(slide, 'Vitest', 2.75, 5.58, 0.9, color=CYAN)
pill(slide, 'Playwright', 3.8, 5.58, 1.2, color=PURPLE)
pill(slide, 'GitHub Pages', 5.15, 5.58, 1.35, color=RGBColor(225, 223, 212), text_color=INK)
text(slide, '新增地点主要改 data/game.ts；新增交互不必重写页面骨架。', 0.8, 6.35, 8.7, 0.36, size=17, color=INK, bold=True)

# 7 Part B divider
slide = prs.slides.add_slide(blank); bg(slide, RGBColor(29, 24, 51))
text(slide, 'PART B', 0.82, 1.18, 2.2, 0.4, size=14, color=GOLD, bold=True, font='Aptos')
text(slide, '技术原理', 0.8, 2.0, 6.2, 0.8, size=38, color=WHITE, bold=True)
text(slide, '不只知道怎么用，还要知道全景、点击和 UV 到底怎么工作。', 0.84, 3.1, 9.2, 0.42, size=18, color=RGBColor(224, 220, 239))
line(slide, 0.84, 4.05, 3.4, 4.05, PURPLE, 2)
pill(slide, '先讲人话', 0.84, 4.55, 1.25, color=PURPLE)
pill(slide, '再讲实现', 2.28, 4.55, 1.25, color=CYAN)
pill(slide, '能做产品', 3.72, 4.55, 1.25, color=GOLD)
text(slide, '第 2 部分 · 技术重点', 0.84, 6.5, 3.0, 0.25, size=10, color=MUTED, font='Aptos')
text(slide, '07  /  DUNHUANG EXPLORER', 10.45, 7.12, 2.25, 0.18, size=8, color=MUTED, font='Aptos', align=PP_ALIGN.RIGHT)

# 8 file map
slide = prs.slides.add_slide(blank); bg(slide, NAVY); header(slide, 'PART 2 · 技术原理', '代码怎么分工：让“页面、状态、渲染、数据”各司其职', 8)
code(slide, 'src/\n├─ views/                 页面编排\n├─ components/            交互组件\n│  ├─ PanoramaViewer.vue   WebGL 全景 / 热点 / UV\n│  ├─ CluePanel.vue        线索锁定与展开\n│  └─ MediaViewer.vue      全屏、缩放、拖动\n├─ stores/game.ts          Pinia + 存档 + 答题规则\n├─ data/game.ts            地点 / 关卡 / 线索 / 题目\n├─ utils/\n│  ├─ clickPoints.ts       最近命中判断\n│  └─ hotspots.ts          3D → CSS2D 投影\n└─ types/game.ts           领域模型', 0.75, 1.42, 5.55, 4.7, size=11)
# right responsibilities
card(slide, '数据驱动', '地点 → 关卡 → panorama → click_points / hotspots / clues / problems\n\n同一套 UI 可以承载敦煌和云冈两套内容。', 6.75, 1.5, 5.75, 1.65, accent=GOLD)
card(slide, '渲染隔离', 'PanoramaViewer 只处理“如何看见”；GameView 处理“看见后怎么推进”。', 6.75, 3.35, 5.75, 1.4, accent=CYAN)
card(slide, '状态持久化', 'Pinia 记录进行中的事实，localStorage 让刷新、切换页面、后台恢复都可继续。', 6.75, 4.98, 5.75, 1.4, accent=PURPLE)
text(slide, '核心原则：配置是内容，组件是能力，store 是进度。', 0.78, 6.5, 11.3, 0.4, size=20, color=GOLD2, bold=True)

# 6 deep dive panorama
slide = prs.slides.add_slide(blank); bg(slide, CREAM); header(slide, 'PART 2 · 技术原理', '360° 全景：把一张 2:1 图片变成“可以走进去”的球', 9, dark=False)
# left diagram
box(slide, 0.72, 1.45, 6.35, 4.9, fill=WHITE, line=RGBColor(220, 213, 197), radius=True)
text(slide, '等距柱状全景 → 球内壁 → 摄像机在球心', 1.02, 1.72, 5.5, 0.3, size=13, color=INK, bold=True)
# equirect image stripe
box(slide, 1.0, 2.3, 2.0, 0.78, fill=RGBColor(90, 73, 56), line=GOLD, radius=True)
text(slide, '2:1 pano\n(u, v)', 1.0, 2.47, 2.0, 0.35, size=15, color=WHITE, bold=True, align=PP_ALIGN.CENTER)
# sphere
s = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(3.52), Inches(2.12), Inches(2.35), Inches(2.35))
s.fill.solid(); s.fill.fore_color.rgb = RGBColor(20, 48, 65); s.fill.transparency = 12
s.line.color.rgb = CYAN; s.line.width = Pt(2)
# inner arcs/points
for i in range(4):
    line(slide, 3.75 + i*0.48, 2.35, 3.75 + i*0.48, 4.2, RGBColor(70, 143, 157), 0.7)
line(slide, 3.72, 3.3, 5.63, 3.3, RGBColor(70, 143, 157), 0.7)
# camera and ray
dot(slide, 4.69, 3.3, 0.11, GOLD)
text(slide, 'camera', 4.32, 3.58, 0.75, 0.25, size=10, color=GOLD, align=PP_ALIGN.CENTER)
dot(slide, 5.76, 2.75, 0.08, RED)
line(slide, 4.69, 3.3, 5.76, 2.75, RED, 1.4)
text(slide, 'ray', 5.32, 2.7, 0.5, 0.22, size=10, color=RED, font='Aptos')
text(slide, 'SphereGeometry(10)\nscale(-1, 1, 1)', 3.76, 4.75, 2.1, 0.45, size=11, color=INK, font='Menlo', align=PP_ALIGN.CENTER)
# right text
card(slide, '1 / 贴图', '把 2:1 等距柱状纹理贴到球面；反转 X 轴，把可见面放到球体内部。', 7.45, 1.55, 5.05, 1.22, accent=GOLD, fill=NAVY, body_size=11)
card(slide, '2 / 看见', '相机留在球心，拖动改变经纬角；FOV 改变“望远 / 广角”。', 7.45, 2.95, 5.05, 1.22, accent=CYAN, fill=NAVY, body_size=11)
card(slide, '3 / 命中', '屏幕点击 → Raycaster 射线 → 球面交点 → 最近点击点。', 7.45, 4.35, 5.05, 1.22, accent=RED, fill=NAVY, body_size=11)
text(slide, '同一坐标数据，不依赖屏幕尺寸。', 7.5, 6.08, 4.8, 0.32, size=16, color=INK, bold=True)

# 7 hit detection
slide = prs.slides.add_slide(blank); bg(slide, NAVY); header(slide, 'PART 2 · 技术原理', '点击发现的核心：不是“猜屏幕坐标”，而是比较两个 3D 点', 10)
code(slide, "const hit = position.distanceTo(point.vec)\nif (hit <= point.accept_click_range)\n  return nearestIndex", 0.78, 1.55, 5.7, 1.55, size=15)
text(slide, '数据示例', 0.82, 3.45, 1.2, 0.25, size=11, color=GOLD, bold=True, font='Aptos')
code(slide, "{\n  vec: new Vector3(10, 0, 0),\n  accept_click_range: 0.9,\n  in_uv: false\n}", 0.78, 3.8, 5.7, 1.95, size=12)
# formula/flow right
text(slide, '命中判定', 7.05, 1.55, 1.2, 0.25, size=11, color=CYAN, bold=True, font='Aptos')
# circles
for x, label, sub, col in [(7.35,'点击','射线与球相交',RED),(9.0,'交点','position',GOLD),(10.65,'配置点','point.vec',CYAN)]:
    s = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(x), Inches(2.0), Inches(1.1), Inches(1.1)); s.fill.solid(); s.fill.fore_color.rgb = NAVY2; s.line.color.rgb = col; s.line.width = Pt(2)
    text(slide, label, x, 2.32, 1.1, 0.25, size=13, color=WHITE, bold=True, align=PP_ALIGN.CENTER)
    text(slide, sub, x-0.18, 3.23, 1.46, 0.25, size=9, color=MUTED, font='Menlo', align=PP_ALIGN.CENTER)
line(slide, 8.5, 2.55, 8.95, 2.55, CYAN, 1.8)
line(slide, 10.15, 2.55, 10.6, 2.55, CYAN, 1.8)
text(slide, 'distance(position, point.vec) ≤ accept_click_range', 7.18, 4.0, 4.8, 0.35, size=15, color=GOLD2, bold=True, font='Menlo', align=PP_ALIGN.CENTER)
text(slide, '如果普通模式与 UV 模式各有一个同位置点，\nin_uv 会把两种观察状态隔离开。', 7.18, 4.78, 4.95, 0.65, size=14, color=RGBColor(207, 216, 219), align=PP_ALIGN.CENTER)
text(slide, '一句话：把交互语义绑定到空间，而不是绑定到屏幕。', 0.8, 6.45, 11.2, 0.35, size=19, color=GOLD2, bold=True)

# 8 UV shader
slide = prs.slides.add_slide(blank); bg(slide, CREAM); header(slide, 'PART 2 · 技术原理', '紫外线观察：一条可解释的 Shader，把隐迹“提”出来', 11, dark=False)
add_img(slide, SHOT / 'game-desktop.png', 0.72, 1.55, 4.2, 2.92, line=RGBColor(198, 190, 175))
add_img(slide, SHOT / 'game-desktop-ultraviolet.png', 4.98, 1.55, 4.2, 2.92, line=RGBColor(198, 190, 175))
text(slide, '普通纹理', 0.8, 4.63, 1.5, 0.25, size=12, color=INK, bold=True)
text(slide, 'UV Shader 输出', 5.05, 4.63, 1.8, 0.25, size=12, color=PURPLE, bold=True)
# pipeline right
text(slide, 'Render pipeline', 9.65, 1.55, 2.1, 0.25, size=11, color=GOLD, bold=True, font='Aptos')
for y, label, col in [(2.05,'RenderPass\n原始场景',CYAN),(3.02,'ShaderPass\n亮度 / 色差 / 辉光',PURPLE),(3.99,'OutputPass\n输出到屏幕',GOLD)]:
    box(slide, 9.6, y, 2.75, 0.7, fill=NAVY, line=col, radius=True)
    text(slide, label, 9.6, y+0.16, 2.75, 0.35, size=12, color=WHITE, bold=True, align=PP_ALIGN.CENTER)
    if y < 3.99: line(slide, 10.98, y+0.7, 10.98, y+0.95, col, 1.5)
code(slide, 'luminance = 0.2126R + 0.7152G + 0.0722B\nchroma = max(rgb) - min(rgb)\nwhite = high luminance + low chroma\nglow = neighbor samples × blue', 0.72, 5.35, 8.45, 1.05, size=10)
text(slide, '不是滤镜：是“输入 → 特征 → 颜色映射 → 可观察结果”。', 9.42, 5.45, 2.9, 0.72, size=14, color=INK, bold=True, align=PP_ALIGN.CENTER)

# 12 Part C divider
slide = prs.slides.add_slide(blank); bg(slide, NAVY)
text(slide, 'PART C', 0.82, 1.18, 2.2, 0.4, size=14, color=GOLD, bold=True, font='Aptos')
text(slide, '工程总结', 0.8, 2.0, 6.2, 0.8, size=38, color=WHITE, bold=True)
text(slide, '把一次演示，变成可继续、可恢复、可扩展的产品。', 0.84, 3.1, 8.8, 0.42, size=18, color=RGBColor(216, 224, 225))
line(slide, 0.84, 4.05, 3.4, 4.05, CYAN, 2)
pill(slide, '稳定性', 0.84, 4.55, 1.0, color=CYAN)
pill(slide, '可维护', 2.02, 4.55, 1.0, color=GOLD)
pill(slide, '下一步', 3.2, 4.55, 1.0, color=RGBColor(225,223,212), text_color=INK)
text(slide, '第 3 部分', 0.84, 6.5, 2.0, 0.25, size=10, color=MUTED, font='Aptos')
text(slide, '12  /  DUNHUANG EXPLORER', 10.45, 7.12, 2.25, 0.18, size=8, color=MUTED, font='Aptos', align=PP_ALIGN.RIGHT)

# 13 engineering robustness
slide = prs.slides.add_slide(blank); bg(slide, NAVY); header(slide, 'PART 3 · 工程总结', '产品体验背后：把“能跑”变成“可继续、可恢复、可维护”', 13)
card(slide, '异步资源不串台', '每次纹理加载都有 loadId；新时相加载后，旧回调自动丢弃。旧纹理及时 dispose。', 0.75, 1.55, 3.72, 1.7, accent=CYAN)
card(slide, '性能有边界', '设备像素比限制为 1.5；普通模式绕开 EffectComposer，只在 UV 模式启用后处理。', 4.8, 1.55, 3.72, 1.7, accent=GOLD)
card(slide, '进度不丢失', 'pagehide / visibilitychange / 15 秒备份；刷新后按题目指纹校验并恢复。', 8.85, 1.55, 3.72, 1.7, accent=PURPLE)
card(slide, '失败可重试', '纹理、图片、视频、WebGL context lost 均提供错误态和重新加载入口。', 0.75, 3.7, 3.72, 1.7, accent=RED)
card(slide, '内容可扩展', '新地点、新关卡、新时相主要是配置新增；组件能力复用，页面骨架不变。', 4.8, 3.7, 3.72, 1.7, accent=GREEN)
card(slide, '验证可复现', 'Vitest 验证纯函数和 store；Playwright 验证关键路径与视觉快照。', 8.85, 3.7, 3.72, 1.7, accent=CYAN)
text(slide, '工程底线：用户的探索状态是事实，渲染层只是事实的一个视图。', 0.78, 6.35, 11.3, 0.4, size=19, color=GOLD2, bold=True)

# 10 data flow
slide = prs.slides.add_slide(blank); bg(slide, CREAM); header(slide, 'PART 3 · 工程总结', '从配置到用户动作：一条闭环如何跑起来', 14, dark=False)
steps = [
    ('配置', 'data/game.ts\nlevels / panorama / clues', GOLD),
    ('渲染', 'PanoramaViewer\nThree.js + WebGL', CYAN),
    ('发现', 'Raycaster\nclick point / hotspot', RED),
    ('推理', 'GameView\n题目与线索', PURPLE),
    ('持久化', 'Pinia → localStorage\n恢复与迁移', GREEN),
]
xs = [0.65, 3.15, 5.65, 8.15, 10.65]
for i, (label, body, col) in enumerate(steps):
    s = slide.shapes.add_shape(MSO_SHAPE.OVAL, Inches(xs[i]), Inches(2.0), Inches(1.0), Inches(1.0)); s.fill.solid(); s.fill.fore_color.rgb = col; s.line.color.rgb = col
    text(slide, label, xs[i], 2.32, 1.0, 0.25, size=15, color=NAVY, bold=True, align=PP_ALIGN.CENTER)
    text(slide, body, xs[i]-0.38, 3.32, 1.75, 0.65, size=11, color=INK, align=PP_ALIGN.CENTER)
    if i < len(steps)-1: line(slide, xs[i]+1.0, 2.5, xs[i+1]-0.08, 2.5, NAVY, 2)
# highlighted loop
box(slide, 1.0, 5.02, 11.25, 0.78, fill=NAVY, line=NAVY, radius=True)
text(slide, '用户动作 → 产生事实 → store 记录事实 → UI 反映事实 → 下一次动作', 1.0, 5.25, 11.25, 0.3, size=18, color=WHITE, bold=True, align=PP_ALIGN.CENTER)
text(slide, '这也是为什么“产品功能”和“底层原理”可以同时讲清楚：每个体验动作都有对应的数据和算法。', 0.8, 6.25, 11.7, 0.36, size=15, color=INK, bold=True, align=PP_ALIGN.CENTER)

# 11 conclusion
slide = prs.slides.add_slide(blank); bg(slide, NAVY); header(slide, 'PART 3 · 工程总结', '两项重点功能，用最短的话讲清楚', 15)
box(slide, 0.78, 1.55, 5.75, 3.7, fill=NAVY2, line=CYAN, radius=True)
text(slide, '全景 + 点击发现', 1.1, 1.92, 4.8, 0.4, size=22, color=CYAN, bold=True)
text(slide, '一张 2:1 全景图\n→ 球内壁\n→ 相机在球心\n→ 射线与球求交\n→ 3D 距离命中配置点', 1.1, 2.65, 4.85, 1.85, size=18, color=WHITE, bold=True)
text(slide, '空间坐标让交互跨设备复用。', 1.1, 4.78, 4.8, 0.3, size=13, color=MUTED)
box(slide, 6.8, 1.55, 5.75, 3.7, fill=NAVY2, line=PURPLE, radius=True)
text(slide, 'UV Shader', 7.12, 1.92, 4.8, 0.4, size=22, color=PURPLE, bold=True)
text(slide, '原始纹理\n→ 亮度 / 色差\n→ 深紫蓝映射\n→ 高亮低色差识别\n→ 邻域采样产生辉光', 7.12, 2.65, 4.85, 1.85, size=18, color=WHITE, bold=True)
text(slide, '不是染色，而是可解释的特征提取。', 7.12, 4.78, 4.8, 0.3, size=13, color=MUTED)
text(slide, '下一步：把更多真实内容接入同一套“数据 → 渲染 → 发现 → 推理”框架。', 0.8, 6.2, 11.7, 0.4, size=19, color=GOLD2, bold=True, align=PP_ALIGN.CENTER)

prs.save(OUT)
print(f'Wrote {OUT} ({OUT.stat().st_size:,} bytes, {len(prs.slides)} slides)')
