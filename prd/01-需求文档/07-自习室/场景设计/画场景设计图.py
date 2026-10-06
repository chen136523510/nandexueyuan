# -*- coding: utf-8 -*-
"""
诺诺房间场景设计图生成器（R-058 · 2026-10-06）
数据来源：nonono_v7.vrm 站姿骨骼实测（页面 __poc 钩子量取），见《诺诺房间场景设计方案.md》§二
用法：python 画场景设计图.py   → 同目录输出 户型图.png / 立面图-工作区.png / 立面图-北墙东墙.png
所有尺寸单位=米。改动布局只动下方 §布局参数区，重跑即出新图。
"""
import matplotlib
matplotlib.use('Agg')
import matplotlib.pyplot as plt
from matplotlib import font_manager
from matplotlib.patches import Rectangle, Circle, Arc, FancyBboxPatch
import os

# ---------- 字体（Windows 中文） ----------
for f in (r'C:\Windows\Fonts\msyh.ttc', r'C:\Windows\Fonts\simhei.ttf'):
    if os.path.exists(f):
        font_manager.fontManager.addfont(f)
plt.rcParams['font.sans-serif'] = ['Microsoft YaHei', 'SimHei']
plt.rcParams['axes.unicode_minus'] = False

# ================= §布局参数区（院长比对后改这里） =================
ROOM_W, ROOM_D, ROOM_H = 4.5, 5.0, 2.8      # 房间 东西宽 x 南北深 x 层高
DESK = dict(x0=0.00, y0=2.55, w=0.70, l=1.40, h=0.72)   # 桌：深(东西)×长(南北)×面高
CHAIR = dict(cx=1.05, cy=3.25, w=0.65, seat=0.556, back_h=0.96)  # 人体工学椅：中心/座宽/椅面高/椅背顶
LAPTOP = dict(x=0.38, y=3.25, stand=0.31, screen_h=0.22)  # 笔记本：桌面位置/支架高/屏高(合盖立起)
SCREEN_CENTER = CHAIR['seat'] + (1.535 - 0.964)           # =坐姿眼高 1.127，屏幕中心与之齐平
KEYBOARD = dict(x=0.58, y=3.25, w=0.28, d=0.12)
MOUSE = dict(x=0.58, y=2.75)
BED = dict(x0=3.10, y0=3.00, w=1.40, l=2.00, mattress=0.45, headboard_h=1.10)  # 床头贴北墙
WINDOW = dict(y0=0.80, y1=2.60, sill=0.90, top=2.40)      # 东墙（床右侧）
DOOR_EXIT = dict(x0=0.60, x1=1.50)                        # 南墙左门=出房间
DOOR_BATH = dict(x0=3.00, x1=3.90)                        # 南墙右门=独立卫浴
POSTER = dict(x0=3.45, x1=4.15, z0=1.45, z1=2.25)         # 北墙床头海报（MyGO 占位）
LAMP = (2.25, 2.50)                                       # 天花板吸顶灯
EYE_STAND, HIP_JOINT = 1.535, 0.964                        # 实测：站姿眼高/髋关节高
KNEE, ANKLE, HEAD_TOP = 0.556, 0.098, 1.59                # 实测：膝/踝/头顶
# ================================================================

WALL = '#8d6e63'; FLOOR = '#faf3e0'; WOOD = '#d7a86e'
BED_C = '#f8bbd0'; BLANKET = '#f48fb1'; PILLOW = '#ffffff'
DESC = dict(fontsize=8.5, color='#444')

def dim(ax, p0, p1, text, offset=(0, 0), color='#c62828', fs=8.5):
    """两点间红色标注尺寸线"""
    ax.annotate('', xy=p1, xytext=p0,
                arrowprops=dict(arrowstyle='<->', color=color, lw=1.1))
    mx, my = (p0[0]+p1[0])/2 + offset[0], (p0[1]+p1[1])/2 + offset[1]
    ax.text(mx, my, text, color=color, fontsize=fs, ha='center', va='center',
            bbox=dict(fc='white', ec='none', alpha=0.9, pad=1))

# ================= 图一：户型图（俯视，观众在南侧往北看） =================
fig, ax = plt.subplots(figsize=(9, 10))
ax.add_patch(Rectangle((0, 0), ROOM_W, ROOM_D, fc=FLOOR, ec=WALL, lw=6, zorder=0))
# 网格
for gx in range(0, int(ROOM_W*2)+1):
    ax.plot([gx/2, gx/2], [0, ROOM_D], color='#e8dcc0', lw=0.5, zorder=1)
for gy in range(0, int(ROOM_D*2)+1):
    ax.plot([0, ROOM_W], [gy/2, gy/2], color='#e8dcc0', lw=0.5, zorder=1)
# 桌（左/西）+键盘鼠标+笔记本
ax.add_patch(Rectangle((DESK['x0'], DESK['y0']), DESK['w'], DESK['l'], fc=WOOD, ec='#8d6e63', zorder=3))
ax.text(DESK['x0']+0.05, DESK['y0']+DESK['l']-0.15, '桌子 0.72m高', ha='left', va='center', fontsize=9, zorder=4)
ax.add_patch(Rectangle((KEYBOARD['x']-0.02, KEYBOARD['y']-KEYBOARD['w']/2), 0.10, KEYBOARD['w'], fc='#b0bec5', zorder=4))
ax.text(0.10, KEYBOARD['y']-0.32, '键盘(无线)', fontsize=7.5, va='center', ha='left', zorder=4,
        bbox=dict(fc='white', ec='none', alpha=0.8, pad=0.5))
ax.add_patch(Circle((MOUSE['x'], MOUSE['y']), 0.035, fc='#b0bec5', zorder=4))
ax.text(0.10, MOUSE['y']-0.28, '鼠标(无线)', fontsize=7.5, va='center', ha='left', zorder=4,
        bbox=dict(fc='white', ec='none', alpha=0.8, pad=0.5))
ax.add_patch(Rectangle((LAPTOP['x']-0.04, LAPTOP['y']-0.18), 0.08, 0.36, fc='#546e7a', zorder=4))
ax.text(DESK['x0']+0.05, DESK['y0']+DESK['l']+0.18, '笔记本屏幕朝右(东)·支架抬高0.31m【待裁决】',
        fontsize=7.8, color='#37474f', zorder=5)
# 椅
ax.add_patch(Circle((CHAIR['cx'], CHAIR['cy']), 0.33, fc='#ffcc80', ec='#ef6c00', lw=1.5, zorder=3))
ax.text(CHAIR['cx'], CHAIR['cy'], '人体工学椅', ha='center', va='center', fontsize=8, zorder=4)
# 床（右/东，床头贴北墙）
ax.add_patch(Rectangle((BED['x0'], BED['y0']), BED['w'], BED['l'], fc=BED_C, ec='#ad1457', zorder=3))
ax.add_patch(Rectangle((BED['x0'], BED['y0']+BED['l']-0.45), BED['w'], 0.45, fc=PILLOW, ec='#aaa', zorder=4))  # 枕头区
ax.add_patch(Rectangle((BED['x0']+0.06, BED['y0']+0.1), BED['w']-0.12, BED['l']-0.75, fc=BLANKET, alpha=0.55, zorder=4))  # 被子
ax.add_patch(Rectangle((BED['x0']-0.05, ROOM_D-0.08), BED['w']+0.10, 0.08, fc='#6d4c41', zorder=4))  # 床头板(贴北墙)
ax.text(BED['x0']+BED['w']/2, BED['y0']+BED['l']/2-0.35, '床 1.4×2.0\n(无床底·有被子枕头)', ha='center', va='center', fontsize=8.5, zorder=5)
ax.text(BED['x0']+BED['w']/2, ROOM_D-0.17, '床头板', ha='center', va='center', fontsize=7, color='white', zorder=5)
# 窗（东墙=床右侧）
ax.plot([ROOM_W, ROOM_W], [WINDOW['y0'], WINDOW['y1']], color='#4fc3f7', lw=7, solid_capstyle='butt', zorder=4)
ax.text(ROOM_W+0.32, (WINDOW['y0']+WINDOW['y1'])/2, '窗户→沙滩大海', rotation=90, ha='center', va='center', fontsize=8, color='#01579b', zorder=5)
# 南墙双门（靠近观众：左=出房间 右=卫浴）
for dd, name in ((DOOR_EXIT, '左门\n出房间'), (DOOR_BATH, '右门\n独立卫浴')):
    ax.add_patch(Rectangle((dd['x0'], 0), dd['x1']-dd['x0'], 0.08, fc='#81c784', ec='#388e3c', zorder=4))
    ax.text((dd['x0']+dd['x1'])/2, 0.22, name, ha='center', va='bottom', fontsize=8, color='#1b5e20', zorder=5)
    ax.plot([dd['x0'], dd['x0']], [0.08, dd['x1']-dd['x0']], color='#388e3c', lw=1, ls=':', zorder=4)
# 天花板灯（俯视位置）
ax.add_patch(Circle(LAMP, 0.15, fc='#fff59d', ec='#f9a825', lw=1.5, zorder=3))
ax.text(LAMP[0], LAMP[1]-0.32, '天花板灯', ha='center', fontsize=8, color='#f57f17', zorder=4)
# 观众/相机位
ax.annotate('', xy=(ROOM_W/2, -0.02), xytext=(ROOM_W/2, -0.75),
            arrowprops=dict(arrowstyle='->', color='#6a1b9a', lw=2.5), zorder=5)
ax.text(ROOM_W/2, -0.88, '观众视角（全景机位·朝北看）', ha='center', fontsize=10, color='#6a1b9a', zorder=5)
# 尺寸标注
dim(ax, (0, -0.35), (ROOM_W, -0.35), '房间东西 4.5m', offset=(0, -0.18))
dim(ax, (-0.42, 0), (-0.42, ROOM_D), '房间南北 5.0m', offset=(-0.30, 0), fs=9)
dim(ax, (BED['x0'], ROOM_D+0.15), (ROOM_W, ROOM_D+0.15), '床宽 1.4', offset=(0, 0.12))
dim(ax, (ROOM_W+0.18, BED['y0']), (ROOM_W+0.18, ROOM_D), '床长 2.0\n(床头贴北墙)', offset=(0.34, 0), fs=8)
ax.text(-0.34, DESK['y0']+DESK['l']/2, '桌长 1.4', rotation=90, va='center', ha='center', color='#c62828', fontsize=8.5,
        bbox=dict(fc='white', ec='none', alpha=0.85, pad=0.5))
dim(ax, (BED['x0'], BED['y0']), (CHAIR['cx'], CHAIR['cy']), '床尾-椅 ≈2.0m\n(“两三个人”待裁决)', offset=(0.1, -0.35), fs=8)
dim(ax, (DESK['x0']+DESK['w'], CHAIR['cy']), (CHAIR['cx'], CHAIR['cy']), '椅心距桌沿 0.35m', offset=(0, 0.46), fs=8)
dim(ax, (ROOM_W, WINDOW['y0']), (ROOM_W, WINDOW['y1']), '窗 1.8m', offset=(-0.32, 0), fs=8)
ax.set_xlim(-0.85, ROOM_W+0.9); ax.set_ylim(-1.25, ROOM_D+0.55)
ax.set_aspect('equal'); ax.axis('off')
ax.set_title('诺诺房间 · 户型图 v1（俯视·单位米·红色=待比对尺寸）', fontsize=13, pad=10)
fig.tight_layout()
fig.savefig(os.path.join(os.path.dirname(__file__), '户型图.png'), dpi=160)
plt.close(fig)

# ================= 图二：工作区立面（朝西看，桌椅人屏关系） =================
fig, ax = plt.subplots(figsize=(10, 6.5))
ax.add_patch(Rectangle((-0.15, 0), 0.35, ROOM_H, fc='#efebe9', ec='none'))  # 西墙剖面带
ax.plot([0, 0], [0, ROOM_H], color=WALL, lw=5)
# 桌
ax.add_patch(Rectangle((0, DESK['h']-0.04), 0.72, 0.04, fc=WOOD, ec='#8d6e63'))  # 桌面
ax.plot([0.05, 0.05], [0, DESK['h']-0.04], color='#8d6e63', lw=3)
ax.plot([0.56, 0.56], [0, DESK['h']-0.04], color='#8d6e63', lw=3)
ax.text(-0.02, DESK['h']+0.13, f"桌面 {DESK['h']:.2f}m（=坐姿肘高0.74，可微调）", fontsize=8.5, ha='left')
# 键盘 + 笔记本支架 + 屏幕
ax.add_patch(Rectangle((0.30, DESK['h']), 0.28, 0.025, fc='#b0bec5'))
ax.add_patch(Rectangle((0.10, DESK['h']), 0.08, LAPTOP['stand'], fc='#90a4ae'))  # 支架
ax.add_patch(Rectangle((0.06, DESK['h']+LAPTOP['stand']), 0.05, LAPTOP['screen_h'], fc='#546e7a'))  # 屏幕
ax.plot([0.11, 0.22], [DESK['h']+LAPTOP['stand'], DESK['h']+0.02], color='#546e7a', lw=2)  # 键盘面斜连
sc = DESK['h'] + LAPTOP['stand'] + LAPTOP['screen_h']/2
ax.text(0.52, 1.00, f"支架 {LAPTOP['stand']:.2f}m 【待裁决】", fontsize=8.5, ha='left', color='#c62828')
ax.text(0.10, sc+0.05, f'屏幕中心 {sc:.2f}m', fontsize=8, ha='center')
# 椅（侧视）+ 诺诺坐姿示意
cx = CHAIR['cx']
ax.add_patch(Rectangle((cx-0.33, CHAIR['seat']-0.06), 0.66, 0.06, fc='#ffcc80', ec='#ef6c00'))   # 座面
ax.plot([cx+0.30, cx+0.33], [CHAIR['seat'], CHAIR['seat']+CHAIR['back_h']], color='#ef6c00', lw=5)  # 背靠（西侧）
ax.plot([cx+0.33, cx+0.33], [CHAIR['seat'], 0], color='#ef6c00', lw=2, ls=':')  # 椅柱
# 人：面朝桌（西）。髋在椅上、大腿水平向西伸进桌下、小腿垂直、脚掌平踩地
hip = (cx+0.02, CHAIR['seat'])
knee_x = hip[0] - 0.409                                            # 大腿长实测 0.409，膝盖伸向桌下
ax.plot([hip[0], knee_x], [hip[1], hip[1]], color='#5d4037', lw=4)                 # 大腿（水平向西）
ax.plot([knee_x, knee_x], [hip[1], ANKLE], color='#5d4037', lw=4)                  # 小腿（垂直）
ax.plot([knee_x-0.10, knee_x+0.03], [0.015, 0.015], color='#5d4037', lw=4)         # 脚掌（平踩地面）
ax.add_patch(Circle(hip, 0.055, fc='#5d4037'))                                     # 髋
torso_top = CHAIR['seat'] + (EYE_STAND - HIP_JOINT)                                # 坐姿眼高 1.127
ax.plot([hip[0], hip[0]], [hip[1], torso_top], color='#8d6e63', lw=6, alpha=0.85)  # 躯干
ax.add_patch(Circle((hip[0], torso_top+0.10), 0.105, fc='#ffe0b2', ec='#8d6e63', lw=1.5))  # 头
# 视线：眼 → 屏幕中心（向西）
ax.plot([hip[0]-0.09, 0.115], [torso_top, sc], color='#c62828', lw=1.0, ls='--')
ax.annotate('', xy=(0.115, sc), xytext=(hip[0]-0.30, torso_top+0.005),
            arrowprops=dict(arrowstyle='->', color='#c62828', lw=1.2))
ax.text(0.62, torso_top+0.05, '视线=屏幕中心', fontsize=8, color='#c62828', ha='center')
ax.text(1.45, 1.02, f'视距(眼-屏)≈{hip[0]-0.09-0.115:.2f}m', fontsize=8.5, color='#37474f', ha='left')
ax.text(1.62, 0.42, f"椅面 {CHAIR['seat']:.3f}m =站姿膝高", fontsize=8.5, ha='left', color='#e65100')
# 90° 膝角（大腿向西、小腿向下，弧在膝点西南象限）
ax.add_patch(Arc((knee_x, hip[1]), 0.36, 0.36, angle=0, theta1=180, theta2=270, color='#c62828', lw=1.5))
ax.text(knee_x-0.05, hip[1]-0.24, '膝 90°(脚掌踩地)', fontsize=8, color='#c62828', ha='center',
        bbox=dict(fc='white', ec='none', alpha=0.9, pad=1))
# 高度标尺线
for h, name, c in ((ANKLE, f'踝 {ANKLE:.2f}', '#777'), (KNEE, f'膝 {KNEE:.3f}', '#e65100'),
                   (DESK['h'], f'桌面 {DESK["h"]:.2f}', '#8d6e63'), (torso_top, f'坐姿眼高 {torso_top:.3f}', '#c62828')):
    ax.plot([-0.5, 2.6], [h, h], color=c, lw=0.7, ls=':', alpha=0.8)
    ax.text(-0.52, h+0.02, name, fontsize=7.5, color=c, ha='right')
ax.text(2.68, 2.42, '【矛盾点】视线齐平屏幕需支架 0.31m\n（常规支架 0.12~0.20m）；\n若支架 0.15m → 视线俯角 ≈15°（人体工学上限内）', fontsize=9, color='#c62828',
        ha='right', bbox=dict(fc='#fff3e0', ec='#c62828', lw=1))
ax.set_xlim(-0.75, 2.75); ax.set_ylim(-0.15, ROOM_H)
ax.set_aspect('equal'); ax.axis('off')
ax.set_title('工作区立面（朝西看）· 桌椅高度按诺诺实测身材推导', fontsize=13, pad=10)
fig.tight_layout()
fig.savefig(os.path.join(os.path.dirname(__file__), '立面图-工作区.png'), dpi=160)
plt.close(fig)

# ================= 图三：北墙 + 东墙立面 =================
fig, (ax1, ax2) = plt.subplots(1, 2, figsize=(12, 5.5))
# 北墙
ax1.add_patch(Rectangle((0, 0), ROOM_W, ROOM_H, fc=FLOOR, ec='none'))
ax1.add_patch(Rectangle((BED['x0']-0.05, 0), BED['w']+0.10, BED['headboard_h'], fc='#6d4c41', ec='#4e342e'))
ax1.text(BED['x0']+BED['w']/2, BED['headboard_h']/2, f'床头板\n高 {BED["headboard_h"]}', ha='center', va='center', color='white', fontsize=9)
ax1.add_patch(Rectangle((POSTER['x0'], POSTER['z0']), POSTER['x1']-POSTER['x0'], POSTER['z1']-POSTER['z0'],
                        fc='#ce93d8', ec='#6a1b9a', lw=1.5, ls='--'))
ax1.text((POSTER['x0']+POSTER['x1'])/2, (POSTER['z0']+POSTER['z1'])/2, 'MyGO 海报\n(0.7×0.8 占位\n院长供图)', ha='center', va='center', fontsize=8.5)
ax1.text((POSTER['x0']+POSTER['x1'])/2, POSTER['z0']-0.15, '床头正上方', ha='center', fontsize=8, color='#6a1b9a')
ax1.add_patch(Rectangle((0, BED['mattress']), ROOM_W, 0.02, fc='none'))  # 占位
ax1.plot([BED['x0'], ROOM_W], [BED['mattress'], BED['mattress']], color='#ad1457', lw=3)
ax1.text(1.2, 0.22, f'床垫高 {BED["mattress"]}（待定，横线为其高度）', fontsize=8, color='#ad1457', ha='center')
ax1.set_xlim(-0.2, ROOM_W+0.2); ax1.set_ylim(0, ROOM_H+0.15); ax1.set_aspect('equal'); ax1.axis('off')
ax1.set_title('北墙立面（床头贴此墙）', fontsize=12)
# 东墙（南北向展开）
ax2.add_patch(Rectangle((0, 0), ROOM_D, ROOM_H, fc=FLOOR, ec='none'))
ax2.add_patch(Rectangle((WINDOW['y0'], WINDOW['sill']), WINDOW['y1']-WINDOW['y0'], WINDOW['top']-WINDOW['sill'],
                        fc='#b3e5fc', ec='#0277bd', lw=2))
ax2.text((WINDOW['y0']+WINDOW['y1'])/2, (WINDOW['sill']+WINDOW['top'])/2, '窗→沙滩大海\n(二楼海景)', ha='center', va='center', fontsize=9, color='#01579b')
ax2.add_patch(Rectangle((ROOM_D-BED['l'], 0), BED['l'], BED['mattress'], fc=BED_C, ec='#ad1457'))
ax2.text(ROOM_D-BED['l']/2, BED['mattress']/2+0.06, '床侧影(床头在右端)', ha='center', fontsize=8, color='#880e4f')
for h, name in ((WINDOW['sill'], f'窗台 {WINDOW["sill"]}'), (WINDOW['top'], f'窗顶 {WINDOW["top"]}')):
    ax2.plot([-0.15, ROOM_D+0.15], [h, h], color='#0277bd', lw=0.7, ls=':')
    ax2.text(-0.18, h+0.03, name, fontsize=7.5, color='#0277bd', ha='right')
ax2.set_xlim(-0.3, ROOM_D+0.2); ax2.set_ylim(0, ROOM_H+0.15); ax2.set_aspect('equal'); ax2.axis('off')
ax2.set_title('东墙立面（床右侧=窗，窗外沙滩大海）', fontsize=12)
fig.suptitle('诺诺房间 · 墙面立面图 v1（单位米）', fontsize=13)
fig.tight_layout()
fig.savefig(os.path.join(os.path.dirname(__file__), '立面图-北墙东墙.png'), dpi=160)
plt.close(fig)

print('''已生成：户型图.png / 立面图-工作区.png / 立面图-北墙东墙.png
——诺诺实测身体数据（v7 模型）——
站姿眼高 %.3f | 髋关节 %.3f | 膝 %.3f | 踝 %.3f | 头顶≈%.2f
推导：椅面=%.3f(站姿膝高) 坐姿眼高=%.3f 桌面=%.2f(坐姿肘高0.742取整)
屏幕中心=坐姿眼高=%.3f → 支架=%.2f（⚠️偏高，见立面图矛盾点标注）'''
        % (EYE_STAND, HIP_JOINT, KNEE, ANKLE, HEAD_TOP, CHAIR['seat'], CHAIR['seat']+(EYE_STAND-HIP_JOINT), DESK['h'], SCREEN_CENTER, LAPTOP['stand']))
