"""
封面效果图生成器 —— 生成 1080×1920 版式示意图（非最终成品）。
运行：python marketing/cover-gen.py
最终封面请把「卡片内的模拟界面」替换成你自己的真实截图。

可调参数集中在下面这一块。
"""
from PIL import Image, ImageDraw, ImageFont, ImageFilter

# ---------- 可调参数 ----------
W, H = 1080, 1920
FONT = 'C:/Windows/Fonts/msyh.ttc'
OUT = 'marketing/cover-preview.png'

MAIN = (134, 133, 239, 255)      # 主色 #8685EF
BG_TOP = (15, 15, 35)           # 背景顶部 #0F0F23
CARD = (26, 26, 58, 255)        # 卡片底色
CARD_EDGE = (82, 82, 132, 255)  # 描边
CARD_BOX = (190, 555, 890, 1450)
CARD_RADIUS = 28
SHADOW_OFFSET, SHADOW_BLUR = 30, 55
TITLE_Y, TITLE_SIZE = 340, 132
SUB_Y, SUB_SIZE = 1535, 52
FOOT_Y, FOOT_SIZE = 1625, 26
# ------------------------------


def f(sz):
    return ImageFont.truetype(FONT, sz, index=0)


bg = Image.new('RGBA', (W, H), (*BG_TOP, 255))
d = ImageDraw.Draw(bg)
for y in range(H):
    t = y / H
    d.line([(0, y), (W, y)], fill=(int(BG_TOP[0] + 7*t),
                                   int(BG_TOP[1] + 5*t),
                                   int(BG_TOP[2] + 16*t), 255))

# 主色光晕（垫在卡片后面，制造视觉重心）
glow = Image.new('RGBA', (W, H), (0, 0, 0, 0))
ImageDraw.Draw(glow).ellipse([170, 430, 910, 1300], fill=(*MAIN[:3], 46))
bg = Image.alpha_composite(bg, glow.filter(ImageFilter.GaussianBlur(170)))

# 卡片阴影：模糊 55、下移 30、纯黑 60%
sh = Image.new('RGBA', (W, H), (0, 0, 0, 0))
x1, y1, x2, y2 = CARD_BOX
ImageDraw.Draw(sh).rounded_rectangle(
    [x1, y1 + SHADOW_OFFSET, x2, y2 + SHADOW_OFFSET],
    radius=CARD_RADIUS, fill=(0, 0, 0, 190))
bg = Image.alpha_composite(bg, sh.filter(ImageFilter.GaussianBlur(SHADOW_BLUR)))

d = ImageDraw.Draw(bg)
d.rounded_rectangle(CARD_BOX, radius=CARD_RADIUS,
                     fill=CARD, outline=CARD_EDGE, width=2)

# 卡片内：封面光晕
cov = Image.new('RGBA', (W, H), (0, 0, 0, 0))
ImageDraw.Draw(cov).ellipse([300, 590, 780, 1070], fill=(94, 90, 200, 70))
bg = Image.alpha_composite(bg, cov.filter(ImageFilter.GaussianBlur(90)))
d = ImageDraw.Draw(bg)

# 专辑封面（抽象占位，最终换成真实截图）
ax1, ay1, ax2, ay2 = 370, 625, 710, 965
for yy in range(ay1, ay2):
    t = (yy - ay1) / (ay2 - ay1)
    d.line([(ax1, yy), (ax2, yy)],
           fill=(int(40 + 18*t), int(38 + 16*t), int(105 + 40*t), 255))
d.rounded_rectangle([ax1, ay1, ax2, ay2], radius=14,
                     outline=(110, 108, 180, 120), width=2)
d.ellipse([445, 700, 635, 890], fill=(88, 84, 168, 120))
d.ellipse([495, 750, 585, 840], fill=(20, 20, 50, 220))
d.ellipse([526, 781, 554, 809], fill=MAIN)
for i in range(5):
    d.line([(400, 690 + i*46), (680, 690 + i*46)],
           fill=(255, 255, 255, 14), width=1)


def center(text, y, font, fill, stroke=0, x0=0, x1=W):
    b = d.textbbox((0, 0), text, font=font)
    d.text((x0 + (x1 - x0 - (b[2] - b[0])) / 2, y), text,
           font=font, fill=fill, stroke_width=stroke, stroke_fill=fill)


center('雷 雨', 1005, f(46), (255, 255, 255, 255), stroke=1)
center('许嵩', 1075, f(28), (168, 168, 200, 255))

# 进度条
px1, px2, py = 260, 820, 1160
d.rounded_rectangle([px1, py, px2, py+10], radius=5, fill=(70, 70, 110, 255))
d.rounded_rectangle([px1, py, 560, py+10], radius=5, fill=MAIN)
d.ellipse([550, py-6, 572, py+16], fill=(220, 220, 255, 255))
d.text((px1, py+26), '1:24', font=f(22), fill=(130, 130, 165, 255))
b = d.textbbox((0, 0), '3:48', font=f(22))
d.text((px2-(b[2]-b[0]), py+26), '3:48', font=f(22), fill=(130, 130, 165, 255))

# 控制按钮
cy = 1280
d.ellipse([505, cy-38, 581, cy+38], fill=MAIN)
d.polygon([(528, cy-16), (528, cy+16), (560, cy)], fill=(255, 255, 255, 255))
for cx, flip in [(410, False), (676, True)]:
    d.ellipse([cx-26, cy-26, cx+26, cy+26], fill=(70, 70, 115, 255))
    if flip:
        d.polygon([(cx-8, cy-12), (cx-8, cy+12), (cx+8, cy)], fill=(220, 220, 240, 255))
    else:
        d.polygon([(cx+8, cy-12), (cx+8, cy+12), (cx-8, cy)], fill=(220, 220, 240, 255))

for i, label in enumerate(['喜欢', '下载', '分享']):
    center(label, 1382, f(24), (150, 150, 185, 255), x0=250+i*195, x1=445+i*195)

# 主标题：「网页」主色，其余白色 —— 一行两色，不拆文本框
b1 = d.textbbox((0, 0), '网页', font=f(TITLE_SIZE))
b2 = d.textbbox((0, 0), '音乐播放器', font=f(TITLE_SIZE))
w1, w2 = b1[2]-b1[0], b2[2]-b2[0]
start = (W - (w1 + w2)) / 2
d.text((start, TITLE_Y), '网页', font=f(TITLE_SIZE), fill=MAIN,
       stroke_width=2, stroke_fill=MAIN)
d.text((start + w1, TITLE_Y), '音乐播放器', font=f(TITLE_SIZE),
       fill=(255, 255, 255, 255), stroke_width=2,
       stroke_fill=(255, 255, 255, 255))

center('不用装软件，打开就能用', SUB_Y, f(SUB_SIZE), (196, 194, 240, 255), stroke=1)
center('2022 年搭的框架 · 今年用 AI 重做', FOOT_Y, f(FOOT_SIZE), (110, 110, 150, 255))

bg.convert('RGB').save(OUT, quality=95)
print('saved', OUT, bg.size)
