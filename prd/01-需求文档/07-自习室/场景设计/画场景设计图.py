# -*- coding: utf-8 -*-
"""
诺诺房间场景设计图生成器 v2（R-058 · 2026-10-06）
v2 落实院长 11 条裁决：窗北墙(窗台=坐床胸高0.72)/床头东墙/左门西墙南端/右门东墙南端/
海报东墙床头上方/键盘左鼠标右(诺诺右手边=北)/椅面可伸缩/显示屏+机械臂+桌下主机/屏椅微侧。
数据来源：nonono_v7.vrm 站姿骨骼实测，见《诺诺房间场景设计方案.md》§二
用法：python 画场景设计图.py → 同目录输出 户型图.png / 立面图-工作区.png / 立面图-北墙东墙.png
"""
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager
from matplotlib.patches import Rectangle, Circle, Arc, Wedge
import math, os

for f in (r'C:\Windows\Fonts\msyh.ttc', r'C:\Windows\Fonts\simhei.ttf'):
    if os.path.exists(f):
        font_manager.fontManager.addfont(f)
plt.rcParams['font.sans-serif'] = ['Microsoft YaHei', 'SimHei']
plt.rcParams['axes.unicode_minus'] = False

# ================= §布局参数区（v2，院长比对后改这里） =================
ROOM_W, ROOM_D, ROOM_H = 4.5, 5.0, 2.8      # 房间 东西宽 × 南北深 × 层高（实际矩形；观众视角梯形=透视）
DESK = dict(x0=0.00, y0=2.55, w=0.70, l=1.40, h=0.72)   # 桌贴西墙
CHAIR = dict(cx=1.05, cy=3.25, r=0.33, seat=0.556, back_h=0.96, face_deg=205)  # 朝向角：180=正西，205=西偏南20°(微侧露侧颜)
MONITOR = dict(x=0.30, y=3.60, w=0.62, face_deg=165)    # 显示屏：桌面位置/屏宽/法向角(0=朝东，165→微侧15°朝南让观众看到部分)
PC = dict(x0=0.14, y0=2.62, w=0.26, d=0.55, h=0.50)     # 主机机箱：桌下落地
KEYBOARD = dict(x=0.52, y=3.05, w=0.30, d=0.12)          # 键盘(诺诺正前方)
MOUSE = dict(x=0.53, y=3.42)                             # 鼠标在键盘右边=诺诺右手边=北
BED = dict(x0=2.50, y0=3.60, l=2.00, w=1.40, mattress=0.45, headboard_h=1.10)  # 床头贴东墙，沿北墙向西
WINDOW = dict(x0=2.80, x1=4.20, sill=0.72, top=2.10)     # 北墙（窗台=诺诺坐床胸部高度，可搭窗沿）
DOOR_EXIT = dict(y0=0.35, y1=1.25)                       # 左门=西墙南端（出房间）
DOOR_BATH = dict(y0=0.35, y1=1.25)                       # 右门=东墙南端（独立卫浴）
POSTER_MYGO = dict(y0=3.90, y1=4.60, z0=1.30, z1=2.10)   # 东墙床头正上方（3:4 竖版）
LAMP = (2.25, 2.50)
EYE_STAND, HIP_JOINT = 1.535, 0.964
KNEE, ANKLE = 0.556, 0.098
EYE_SEATED = CHAIR['seat'] + (EYE_STAND - HIP_JOINT)     # 坐姿眼高 1.127
SCREEN_CENTER = EYE_SEATED                               # 视线与屏幕齐平（机械臂任意高度可达成）
# ================================================================

WALL = '#8d6e63'; FLOOR = '#faf3e0'; WOOD = '#d7a86e'
BED_C = '#f8bbd0'; BLANKET = '#f48fb1'; PILLOW = '#ffffff'

def dim(ax, p0, p1, text, offset=(0, 0), color='#c62828', fs=8.5):
    ax.annotate('', xy=p1, xytext=p0, arrowprops=dict(arrowstyle='<->', color=color, lw=1.1))
    mx, my = (p0[0]+p1[0])/2 + offset[0], (p0[1]+p1[1])/2 + offset[1]
    ax.text(mx, my, text, color=color, fontsize=fs, ha='center', va='center',
            bbox=dict(fc='white', ec='none', alpha=0.9, pad=1))

def rot_line(ax, x, y, deg, length, **kw):
    """从 (x,y) 沿 deg 方向画线（deg=0 朝东，逆时针）"""
    a = math.radians(deg)
    ax.plot([x, x + length*math.cos(a)], [y, y + length*math.sin(a)], **kw)

# ================= 图一：户型图（俯视，观众在南侧往北看） =================
fig, ax = plt.subplots(figsize=(9.5, 10.5))
ax.add_patch(Rectangle((0, 0), ROOM_W, ROOM_D, fc=FLOOR, ec=WALL, lw=6, zorder=0))
for gx in range(0, int(ROOM_W*2)+1):
    ax.plot([gx/2, gx/2], [0, ROOM_D], color='#e8dcc0', lw=0.5, zorder=1)
for gy in range(0, int(ROOM_D*2)+1):
    ax.plot([0, ROOM_W], [gy/2, gy/2], color='#e8dcc0', lw=0.5, zorder=1)
# 桌（西墙）
ax.add_patch(Rectangle((DESK['x0'], DESK['y0']), DESK['w'], DESK['l'], fc=WOOD, ec='#8d6e63', zorder=3))
ax.text(DESK['x0']+0.06, DESK['y0']+DESK['l']-0.12, '桌子 0.72m高', ha='left', va='center', fontsize=8.5, zorder=4)
# 显示屏（机械臂，法向朝东微侧15°，屏面=法向+90°的线段）+键盘+鼠标
ax.add_patch(Rectangle((MONITOR['x']-0.05, MONITOR['y']-0.03), 0.10, 0.06, fc='#37474f', zorder=5))
_sa = math.radians(MONITOR['face_deg'] + 90)
ax.plot([MONITOR['x']-0.31*math.cos(_sa), MONITOR['x']+0.31*math.cos(_sa)],
        [MONITOR['y']-0.31*math.sin(_sa), MONITOR['y']+0.31*math.sin(_sa)], color='#0d2c40', lw=3.5, zorder=5)
ax.text(0.06, 4.14, '显示屏(机械臂)·法向朝东微侧15°→观众见部分屏', fontsize=7.2, color='#0d2c40', zorder=5, ha='left')
ax.add_patch(Rectangle((KEYBOARD['x']-0.06, KEYBOARD['y']-KEYBOARD['w']/2), 0.12, KEYBOARD['w'], fc='#b0bec5', zorder=4))
ax.text(KEYBOARD['x']+0.10, KEYBOARD['y'], '键盘', fontsize=7.5, va='center', zorder=4)
ax.add_patch(Circle((MOUSE['x'], MOUSE['y']), 0.035, fc='#b0bec5', zorder=4))
ax.text(MOUSE['x']+0.06, MOUSE['y'], '鼠标(右手边·北)', fontsize=7, va='center', zorder=4)
# 主机机箱（桌下落地）
ax.add_patch(Rectangle((PC['x0'], PC['y0']), PC['w'], PC['d'], fc='#78909c', ec='#37474f', lw=1.2, zorder=3))
ax.text(PC['x0']+PC['w']/2, PC['y0']+PC['d']/2, '主机\n机箱', ha='center', va='center', fontsize=7, color='white', zorder=4)
# 人体工学椅（微侧 20°，朝西偏南）
ax.add_patch(Circle((CHAIR['cx'], CHAIR['cy']), CHAIR['r'], fc='#ffcc80', ec='#ef6c00', lw=1.5, zorder=3))
ax.add_patch(Wedge((CHAIR['cx'], CHAIR['cy']), CHAIR['r']-0.05, CHAIR['face_deg']-28, CHAIR['face_deg']+28, fc='#ef6c00', alpha=0.75, zorder=4))
ax.text(CHAIR['cx'], CHAIR['cy']-0.52, '人体工学椅(可伸缩)\n微侧20°→露侧颜', ha='center', va='top', fontsize=7.2, color='#e65100', zorder=4)
# 床（床头贴东墙，沿北墙向西；无床底）
ax.add_patch(Rectangle((BED['x0'], BED['y0']), BED['l'], BED['w'], fc=BED_C, ec='#ad1457', zorder=3))
ax.add_patch(Rectangle((BED['x0']+BED['l']-0.45, BED['y0']+0.08), 0.40, BED['w']-0.16, fc=PILLOW, ec='#aaa', zorder=4))
ax.add_patch(Rectangle((BED['x0']+0.08, BED['y0']+0.08), BED['l']-0.70, BED['w']-0.16, fc=BLANKET, alpha=0.55, zorder=4))
ax.add_patch(Rectangle((ROOM_W-0.08, BED['y0']-0.05), 0.08, BED['w']+0.10, fc='#6d4c41', zorder=4))
ax.text(BED['x0']+BED['l']/2, BED['y0']+BED['w']/2-0.30, '床 2.0×1.4 床头朝东\n(无床底·被子枕头)', ha='center', va='center', fontsize=8.5, zorder=5)
ax.text(ROOM_W-0.28, BED['y0']+BED['w']/2, '床头板', rotation=90, va='center', fontsize=7, color='white', zorder=5)
# 窗（北墙，窗台=坐床胸高）
ax.plot([WINDOW['x0'], WINDOW['x1']], [ROOM_D, ROOM_D], color='#4fc3f7', lw=7, solid_capstyle='butt', zorder=4)
ax.text((WINDOW['x0']+WINDOW['x1'])/2, ROOM_D-0.16, '窗户(北墙)·窗台0.72=坐床胸高·可搭窗沿', ha='center', va='top', fontsize=7.5, color='#01579b', zorder=5,
        bbox=dict(fc='white', ec='none', alpha=0.85, pad=0.8))
# 海报（东墙床头正上方——俯视以粗线示意）
ax.plot([ROOM_W, ROOM_W], [POSTER_MYGO['y0'], POSTER_MYGO['y1']], color='#8e24aa', lw=5, alpha=0.8, zorder=4)
ax.text(ROOM_W-0.14, (POSTER_MYGO['y0']+POSTER_MYGO['y1'])/2, 'MyGO海报(床头正上方)', rotation=90, ha='right', va='center', fontsize=6.8, color='#6a1b9a', zorder=5)
# 左门（西墙南端）/右门（东墙南端）
ax.add_patch(Rectangle((0, DOOR_EXIT['y0']), 0.08, DOOR_EXIT['y1']-DOOR_EXIT['y0'], fc='#81c784', ec='#388e3c', zorder=4))
ax.text(0.16, (DOOR_EXIT['y0']+DOOR_EXIT['y1'])/2, '左门\n出房间', fontsize=8, color='#1b5e20', va='center', zorder=5)
ax.add_patch(Rectangle((ROOM_W-0.08, DOOR_BATH['y0']), 0.08, DOOR_BATH['y1']-DOOR_BATH['y0'], fc='#81c784', ec='#388e3c', zorder=4))
ax.text(ROOM_W-0.16, (DOOR_BATH['y0']+DOOR_BATH['y1'])/2, '右门\n独立卫浴', fontsize=8, color='#1b5e20', va='center', ha='right', zorder=5)
# 天花板灯
ax.add_patch(Circle(LAMP, 0.15, fc='#fff59d', ec='#f9a825', lw=1.5, zorder=3))
ax.text(LAMP[0], LAMP[1]-0.30, '天花板灯', ha='center', fontsize=8, color='#f57f17', zorder=4)
# 观众
ax.annotate('', xy=(ROOM_W/2, -0.02), xytext=(ROOM_W/2, -0.75),
            arrowprops=dict(arrowstyle='->', color='#6a1b9a', lw=2.5), zorder=5)
ax.text(ROOM_W/2, -0.88, '观众视角（全景机位·朝北看）·透视下房间呈上短下长梯形(实际矩形)', ha='center', fontsize=9, color='#6a1b9a', zorder=5)
# 尺寸
dim(ax, (0, -0.35), (ROOM_W, -0.35), '房间东西 4.5m', offset=(0, -0.18))
dim(ax, (-0.42, 0), (-0.42, ROOM_D), '房间南北 5.0m', offset=(-0.30, 0), fs=9)
dim(ax, (BED['x0'], ROOM_D+0.15), (ROOM_W, ROOM_D+0.15), '床长 2.0', offset=(0, 0.12))
dim(ax, (ROOM_W+0.18, BED['y0']), (ROOM_W+0.18, ROOM_D), '床宽 1.4\n(床头贴东墙)', offset=(0.36, 0), fs=8)
dim(ax, (WINDOW['x0'], ROOM_D), (WINDOW['x1'], ROOM_D), '窗 1.4m', offset=(0, 0.16), fs=8)
ax.text(-0.34, DESK['y0']+DESK['l']/2, '桌长 1.4', rotation=90, va='center', ha='center', color='#c62828', fontsize=8.5,
        bbox=dict(fc='white', ec='none', alpha=0.85, pad=0.5))
dim(ax, (BED['x0'], BED['y0']+0.3), (CHAIR['cx'], CHAIR['cy']), '床尾-椅 ≈1.6m\n(“两三个人”)', offset=(0.15, -0.38), fs=8)
ax.set_xlim(-0.85, ROOM_W+0.9); ax.set_ylim(-1.25, ROOM_D+0.55)
ax.set_aspect('equal'); ax.axis('off')
ax.set_title('诺诺房间 · 户型图 v2（俯视·单位米·红字=待比对）', fontsize=13, pad=10)
fig.tight_layout()
fig.savefig(os.path.join(os.path.dirname(__file__), '户型图.png'), dpi=160)
plt.close(fig)

# ================= 图二：工作区立面（朝西看，桌椅人屏关系） =================
fig, ax = plt.subplots(figsize=(10, 6.5))
ax.add_patch(Rectangle((-0.15, 0), 0.35, ROOM_H, fc='#efebe9', ec='none'))
ax.plot([0, 0], [0, ROOM_H], color=WALL, lw=5)
# 桌 + 桌下主机
ax.add_patch(Rectangle((0, DESK['h']-0.04), 0.72, 0.04, fc=WOOD, ec='#8d6e63'))
ax.plot([0.05, 0.05], [0, DESK['h']-0.04], color='#8d6e63', lw=3)
ax.plot([0.56, 0.56], [0, DESK['h']-0.04], color='#8d6e63', lw=3)
ax.text(-0.02, DESK['h']+0.13, f"桌面 {DESK['h']:.2f}m（坐姿肘高0.74，可微调）", fontsize=8.5, ha='left')
ax.add_patch(Rectangle((0.12, 0.02), 0.26, PC['h'], fc='#78909c', ec='#37474f', lw=1.2))
ax.text(0.25, PC['h']/2+0.02, '主机机箱\n(RGB)', ha='center', va='center', fontsize=7.5, color='white')
# 机械臂 + 显示屏（屏中心=视线高度）
arm_base = (0.06, DESK['h'])
ax.plot([arm_base[0], arm_base[0]], [arm_base[1], SCREEN_CENTER+0.28], color='#546e7a', lw=4)
ax.plot([arm_base[0], 0.20], [SCREEN_CENTER+0.28, SCREEN_CENTER+0.24], color='#546e7a', lw=4)
ax.add_patch(Rectangle((0.14, SCREEN_CENTER-0.19), 0.05, 0.38, fc='#0d2c40'))
ax.text(0.42, SCREEN_CENTER+0.10, '显示屏(机械臂)\n屏中心=视线1.127 √\n微侧15°', fontsize=8, ha='left', color='#0d2c40')
ax.text(-0.02, SCREEN_CENTER+0.42, '机械臂：支架矛盾解除', fontsize=8.5, ha='left', color='#1b5e20')
# 键盘
ax.add_patch(Rectangle((0.30, DESK['h']), 0.28, 0.025, fc='#b0bec5'))
# 椅（可伸缩）+ 诺诺坐姿（面朝桌/微侧）
cx = CHAIR['cx']
ax.add_patch(Rectangle((cx-0.33, CHAIR['seat']-0.06), 0.66, 0.06, fc='#ffcc80', ec='#ef6c00'))
ax.plot([cx+0.30, cx+0.33], [CHAIR['seat'], CHAIR['seat']+CHAIR['back_h']], color='#ef6c00', lw=5)
ax.plot([cx+0.33, cx+0.33], [CHAIR['seat'], 0], color='#ef6c00', lw=2, ls=':')
ax.text(1.62, 0.42, f"椅面 {CHAIR['seat']:.3f}m（可伸缩，建模时定）", fontsize=8.5, ha='left', color='#e65100')
hip = (cx+0.02, CHAIR['seat'])
knee_x = hip[0] - 0.409
ax.plot([hip[0], knee_x], [hip[1], hip[1]], color='#5d4037', lw=4)
ax.plot([knee_x, knee_x], [hip[1], ANKLE], color='#5d4037', lw=4)
ax.plot([knee_x-0.10, knee_x+0.03], [0.015, 0.015], color='#5d4037', lw=4)
ax.add_patch(Circle(hip, 0.055, fc='#5d4037'))
torso_top = EYE_SEATED
ax.plot([hip[0], hip[0]], [hip[1], torso_top], color='#8d6e63', lw=6, alpha=0.85)
ax.add_patch(Circle((hip[0], torso_top+0.10), 0.105, fc='#ffe0b2', ec='#8d6e63', lw=1.5))
ax.plot([hip[0]-0.09, 0.19], [torso_top, torso_top], color='#c62828', lw=1.0, ls='--')
ax.annotate('', xy=(0.19, torso_top), xytext=(hip[0]-0.30, torso_top),
            arrowprops=dict(arrowstyle='->', color='#c62828', lw=1.2))
ax.text(0.58, torso_top+0.06, '视线=屏幕中心 √', fontsize=8, color='#c62828', ha='center')
ax.text(1.45, 1.02, f'视距(眼-屏)≈{hip[0]-0.09-0.19:.2f}m', fontsize=8.5, color='#37474f', ha='left')
ax.add_patch(Arc((knee_x, hip[1]), 0.36, 0.36, angle=0, theta1=180, theta2=270, color='#c62828', lw=1.5))
ax.text(knee_x-0.05, hip[1]-0.24, '膝 90°(脚掌踩地)', fontsize=8, color='#c62828', ha='center',
        bbox=dict(fc='white', ec='none', alpha=0.9, pad=1))
for h, name, c in ((ANKLE, f'踝 {ANKLE:.2f}', '#777'), (KNEE, f'膝 {KNEE:.3f}', '#e65100'),
                   (DESK['h'], f'桌面 {DESK["h"]:.2f}', '#8d6e63'), (torso_top, f'坐姿眼高 {torso_top:.3f}', '#c62828')):
    ax.plot([-0.5, 2.6], [h, h], color=c, lw=0.7, ls=':', alpha=0.8)
    ax.text(-0.52, h+0.02, name, fontsize=7.5, color=c, ha='right')
ax.text(2.68, 2.42, '【已解决】原支架矛盾→机械臂+显示屏\n（高度自由，视线齐平达成；\n笔记本方案备档：需定制0.31m高支架）', fontsize=9, color='#1b5e20',
        ha='right', bbox=dict(fc='#e8f5e9', ec='#1b5e20', lw=1))
ax.set_xlim(-0.75, 2.75); ax.set_ylim(-0.15, ROOM_H)
ax.set_aspect('equal'); ax.axis('off')
ax.set_title('工作区立面（朝西看）· v2 显示屏+机械臂方案', fontsize=13, pad=10)
fig.tight_layout()
fig.savefig(os.path.join(os.path.dirname(__file__), '立面图-工作区.png'), dpi=160)
plt.close(fig)

# ================= 图三：北墙 + 东墙立面 =================
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12.5, 5.5))
# 北墙（窗，下方是床侧影）
ax1.add_patch(Rectangle((0, 0), ROOM_W, ROOM_H, fc=FLOOR, ec='none'))
ax1.add_patch(Rectangle((WINDOW['x0'], WINDOW['sill']), WINDOW['x1']-WINDOW['x0'], WINDOW['top']-WINDOW['sill'],
                        fc='#b3e5fc', ec='#0277bd', lw=2))
ax1.text((WINDOW['x0']+WINDOW['x1'])/2, (WINDOW['sill']+WINDOW['top'])/2, '窗→沙滩大海\n(二楼海景)', ha='center', va='center', fontsize=9, color='#01579b')
ax1.plot([0, ROOM_W], [BED['mattress'], BED['mattress']], color='#ad1457', lw=3)
ax1.text(BED['x0']+0.1, BED['mattress']+0.06, '床垫顶 0.45（床沿北墙，坐此搭窗沿）', fontsize=8, color='#ad1457', ha='left')
for h, name in ((WINDOW['sill'], f'窗台 {WINDOW["sill"]}=坐床胸高'), (WINDOW['top'], f'窗顶 {WINDOW["top"]}')):
    ax1.plot([-0.15, ROOM_W+0.15], [h, h], color='#0277bd', lw=0.7, ls=':')
    ax1.text(-0.18, h+0.04, name, fontsize=7.5, color='#0277bd', ha='right')
ax1.annotate('', xy=(WINDOW['x0'], WINDOW['sill']-0.12), xytext=(WINDOW['x0'], 0.45),
             arrowprops=dict(arrowstyle='-', color='#0277bd', lw=0.8, ls=':'))
ax1.set_xlim(-0.85, ROOM_W+0.2); ax1.set_ylim(0, ROOM_H+0.15); ax1.set_aspect('equal'); ax1.axis('off')
ax1.set_title('北墙立面（窗+床沿，坐床可搭窗沿）', fontsize=12)
# 东墙（床头板+MyGO海报+右门卫浴）
ax2.add_patch(Rectangle((0, 0), ROOM_D, ROOM_H, fc=FLOOR, ec='none'))
ax2.add_patch(Rectangle((ROOM_D-BED['w'], 0), BED['w'], BED['headboard_h'], fc='#6d4c41', ec='#4e342e'))
ax2.text(ROOM_D-BED['w']/2, BED['headboard_h']/2, f'床头板(贴此墙)\n高 {BED["headboard_h"]}', ha='center', va='center', color='white', fontsize=9)
ax2.add_patch(Rectangle((POSTER_MYGO['y0'], POSTER_MYGO['z0']), POSTER_MYGO['y1']-POSTER_MYGO['y0'], POSTER_MYGO['z1']-POSTER_MYGO['z0'],
                        fc='#e1bee7', ec='#6a1b9a', lw=1.5))
ax2.text((POSTER_MYGO['y0']+POSTER_MYGO['y1'])/2, (POSTER_MYGO['z0']+POSTER_MYGO['z1'])/2,
         'MyGO 海报\n0.6×0.8 (3:4)\n床头正上方', ha='center', va='center', fontsize=8.5, color='#4a148c')
ax2.add_patch(Rectangle((DOOR_BATH['y0'], 0), DOOR_BATH['y1']-DOOR_BATH['y0'], 2.05, fc='#c8e6c9', ec='#388e3c', lw=1.5))
ax2.text((DOOR_BATH['y0']+DOOR_BATH['y1'])/2, 1.0, '右门\n独立卫浴', ha='center', va='center', fontsize=9, color='#1b5e20')
ax2.set_xlim(-0.3, ROOM_D+0.2); ax2.set_ylim(0, ROOM_H+0.15); ax2.set_aspect('equal'); ax2.axis('off')
ax2.set_title('东墙立面（床头贴此墙·MyGO海报·右门=卫浴）', fontsize=12)
fig.suptitle('诺诺房间 · 墙面立面图 v2（单位米）· 孤独摇滚海报(横版)位置待定未画', fontsize=13)
fig.tight_layout()
fig.savefig(os.path.join(os.path.dirname(__file__), '立面图-北墙东墙.png'), dpi=160)
plt.close(fig)

print('''已生成 v2：户型图 / 立面图-工作区 / 立面图-北墙东墙
——诺诺实测（v7）：眼1.535 髋0.964 膝0.556 踝0.098
推导：椅面0.556(可伸缩) 坐姿眼高1.127 桌面0.72
窗台=坐床胸高0.72（床垫0.45+坐姿胸段≈0.27）；屏中心=视线1.127（机械臂达成）
待定：孤独摇滚海报(横版)位置；屏/椅微侧角度(15°/20°初值)''')
