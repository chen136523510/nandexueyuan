# -*- coding: utf-8 -*-
"""
诺诺手绘轮 round1 资产无头生成 —— 虹膜精修 + 泪痣三变体
院长 2026-10-07 指示："尽可能通过脚本来编写美术资源，先别用我的电脑"——
本脚本零 GUI（系统 Python + numpy + zlib 纯 PNG 编解码），后台运行。
设计数学与 krita_handpaint_round1.py 同源（Krita Scripter 版留作 GUI 备选路径）。
四裁决（2026-10-07）：AI 全驱动 / 保持 #1A2436 深蓝黑家族 / 双高光 / 泪痣出变体。

产物（手绘轮工作区/）：
  handpaint_iris.png          虹膜手绘稿 1024x512（build_v7_texture.py 换入 _02）
  mole_variant_A/B/C.png      泪痣三变体整图 1024x1024（挑定后选定版改名 handpaint_face_skin.png）
  泪痣变体对比.png             三变体裁片 ×4 纵排（A/B/C 自上而下）
  iris_preview.png            左虹膜盘 before/after ×3 对比
  handpaint_round1_log.txt    运行日志（本目录同名）
"""
import os
import math
import struct
import sys
import zlib

import numpy as np

ROOT = r'G:/UGit/nandexueyuan/prd/01-需求文档/05-美术设计/诺诺'
SRC = os.path.join(ROOT, '手绘轮工作区')
LOG = os.path.join(ROOT, '工具脚本', 'handpaint_round1_log.txt')

_log = []


def log(*a):
    s = ' '.join(str(x) for x in a)
    _log.append(s)
    print(s, flush=True)


# ─────────────────── PNG IO（PIL 接地真，避免手写解码器踩坑） ───────────────────
from PIL import Image


def png_read(path):
    img = Image.open(path)
    if img.mode != 'RGBA':
        img = img.convert('RGBA')
    return np.ascontiguousarray(np.array(img, np.uint8))


def png_write(path, arr_u8):
    Image.fromarray(arr_u8, 'RGBA').save(path)
    log('png written:', os.path.basename(path), arr_u8.shape[1], 'x', arr_u8.shape[0],
        os.path.getsize(path) // 1024, 'KB')


def f32(u8):
    return u8.astype(np.float32) / 255.0


def u8(arr):
    return (np.clip(arr, 0.0, 1.0) * 255.0).round().astype(np.uint8)


# ─────────────────── 设计数学（与 Krita 版同源） ───────────────────
def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / max(1e-6, (e1 - e0)), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def design_disk(cx, cy, R, yy, xx):
    """单盘虹膜设计 v2——只重绘不透明盘芯（r<R），裙边（暗 limbal 带/光环/软边）由底图保留。
    色度锚定：mid=#1A2436×0.75（与 v7 现版盘芯明度对齐），内盘提亮+外缘压暗+眼睑投影+底部反光
    +limbal ring 接续裙边暗带 + 双高光（主 38° 上右 / 副 215° 下左）。"""
    dx = xx - cx
    dy = yy - cy
    r = np.hypot(dx, dy) / R
    th = np.arctan2(-dy, dx)

    L = 1.0
    # 内盘（瞳周）椭圆提亮
    e_in = np.hypot(dx / (0.46 * R), dy / (0.60 * R))
    L += 0.26 * (1.0 - smoothstep(0.35, 1.00, e_in))
    # 内盘轮廓环（椭圆边界微暗，复刻原版内盘描边结构）
    L -= 0.22 * smoothstep(0.85, 1.05, e_in) * (1.0 - smoothstep(1.25, 1.55, e_in))
    # 中外环带压暗（原版此处很暗，是"环状分层"观感的来源）
    L -= 0.34 * smoothstep(0.45, 0.95, r)
    # 眼睑投影：上方扇区随半径加深
    up = np.clip(np.sin(th), 0.0, 1.0)
    L -= 0.32 * smoothstep(0.25, 0.95, r) * up ** 1.3
    # 底部反光弧
    dn = np.clip(-np.sin(th), 0.0, 1.0)
    L += 0.10 * smoothstep(0.50, 0.90, r) * dn
    L = np.clip(L, 0.10, 1.50)

    mid = np.array([0.077, 0.106, 0.159], np.float32)  # #1A2436 × 0.75
    col = mid[None, None, :] * L[..., None]

    # limbal ring：0.70R~1.0R 环状加深（外缘与裙边原有暗带衔接）
    ring = smoothstep(0.70, 0.82, r) * (1.0 - smoothstep(0.93, 1.0, r))
    col = col * (1.0 - 0.60 * ring)[..., None]

    # 瞳孔：纵长椭圆 + 外圈描边环
    e_p = np.hypot(dx / (0.14 * R), dy / (0.20 * R))
    pupil = 1.0 - smoothstep(0.85, 1.05, e_p)
    pcol = np.array([0.020, 0.027, 0.043], np.float32)
    col = col * (1 - pupil[..., None]) + pcol[None, None, :] * pupil[..., None]
    p_rim = smoothstep(0.95, 1.10, e_p) * (1.0 - smoothstep(1.35, 1.60, e_p))
    col = col * (1.0 - 0.45 * p_rim)[..., None]

    # 主高光：上侧偏右 38°
    a1 = math.radians(38.0)
    x1 = cx + 0.46 * R * math.cos(a1)
    y1 = cy - 0.46 * R * math.sin(a1)
    g1 = np.exp(-(((xx - x1) ** 2 + (yy - y1) ** 2) / (2 * (0.10 * R) ** 2)))
    m1 = 0.72 * g1
    h1 = np.array([0.70, 0.77, 0.86], np.float32)
    col = col * (1 - m1[..., None]) + h1[None, None, :] * m1[..., None]

    # 副高光：下缘偏左 215°（与 _03 白点叠层融合）
    a2 = math.radians(215.0)
    x2 = cx + 0.52 * R * math.cos(a2)
    y2 = cy - 0.52 * R * math.sin(a2)
    g2 = np.exp(-(((xx - x2) ** 2 + (yy - y2) ** 2) / (2 * (0.07 * R) ** 2)))
    m2 = 0.30 * g2
    h2 = np.array([0.40, 0.48, 0.60], np.float32)
    col = col * (1 - m2[..., None]) + h2[None, None, :] * m2[..., None]

    # 只写盘芯，0.88R→1.0R 平滑交回底图（裙边结构原样保留）
    alpha = 1.0 - smoothstep(0.88, 1.00, r)
    return col.astype(np.float32), alpha.astype(np.float32)


MOLE_VARIANTS = [
    # name, cx, cy, rx, ry, colorRGB, peak（基准红十字=(659,598)，±20px 合理区）
    ('A', 659, 600, 3.2, 4.2, (0.23, 0.16, 0.13), 0.85),
    ('B', 657, 604, 3.8, 5.0, (0.18, 0.12, 0.10), 0.95),
    ('C', 666, 598, 2.6, 3.4, (0.29, 0.22, 0.18), 0.70),
]
MOLE_NAMES = {'A': 'A_基准', 'B': 'B_大而深', 'C': 'C_小而淡偏外'}


def mole_alpha(xx, yy, cx, cy, rx, ry):
    e = np.hypot((xx - cx) / rx, (yy - cy) / ry)
    return 1.0 - smoothstep(0.55, 1.0, e)  # 核心实、边缘柔


# ─────────────────── 主流程 ───────────────────
def main():
    log('=== 诺诺手绘轮 round1 无头生成 ===', ' '.join(sys.argv))

    # ---- PART 1: 虹膜 ----
    iris_src = png_read(os.path.join(SRC, 'src_v7', '11_iris_recolor_v7.png'))
    H, W = iris_src.shape[:2]
    log('iris src:', W, 'x', H)
    rgba = f32(iris_src)
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)

    mask = rgba[..., :3].max(axis=2) > 0.04
    disks = []
    for xoff in (0, W // 2):
        halfm = mask[:, xoff:xoff + W // 2]
        ysm, xsm = np.nonzero(halfm)
        if len(xsm) == 0:
            continue
        # 不透明像素质心（裙边 alpha 衰减会拉偏全掩码质心）
        op = halfm & (rgba[:, xoff:xoff + W // 2, 3] >= 0.9)
        yso, xso = np.nonzero(op)
        cx = float(xso.mean()) + xoff
        cy = float(yso.mean())
        # 盘芯半径：角向平均 alpha 沿半径首次跌破 0.99 处（裙边起点）
        rad = np.hypot(xx - cx, yy - cy)
        half_a = rgba[:, xoff:xoff + W // 2, 3]
        half_r = rad[:, xoff:xoff + W // 2]
        R = 60.0
        for r0 in np.arange(40, 160, 2.0):
            sel = (half_r >= r0) & (half_r < r0 + 2.0)
            if sel.sum() == 0 or float(half_a[sel].mean()) < 0.99:
                R = float(r0)
                break
        disks.append((cx, cy, R))
        log('disk:', round(cx, 1), round(cy, 1), 'R_core=', round(R, 1),
            'opaque_area=', int(op.sum()))
    if len(disks) != 2:
        log('FATAL: disk detection failed,', len(disks), 'disks')
        return

    layer_rgb = np.zeros_like(rgba[..., :3])
    layer_a = np.zeros((H, W), np.float32)
    for (cx, cy, R) in disks:
        col, al = design_disk(cx, cy, R, yy, xx)
        pos = al > 0
        layer_rgb[pos] = col[pos]
        layer_a = np.maximum(layer_a, al)
    out = rgba.copy()
    a3 = layer_a[..., None]
    out[..., :3] = rgba[..., :3] * (1 - a3) + layer_rgb * a3
    png_write(os.path.join(SRC, 'handpaint_iris.png'), u8(out))

    # 预览：左盘 before/after ×3
    cx, cy, R = disks[0]
    half_px = int(R * 1.15)
    y0, y1 = int(cy - half_px), int(cy + half_px)
    x0, x1 = int(cx - half_px), int(cx + half_px)
    before = rgba[y0:y1, x0:x1, :3]
    after = out[y0:y1, x0:x1, :3]
    k = 3
    sep = np.full((before.shape[0] * k, 6, 3), 0.1, np.float32)
    sheet = np.concatenate(
        [np.kron(before, np.ones((k, k, 1), np.float32)), sep,
         np.kron(after, np.ones((k, k, 1), np.float32))], axis=1)
    u8s = np.empty((sheet.shape[0], sheet.shape[1], 4), np.uint8)
    u8s[..., :3] = u8(sheet)
    u8s[..., 3] = 255
    png_write(os.path.join(SRC, 'iris_preview.png'), u8s)

    # ---- PART 2: 泪痣 ----
    face_src = png_read(os.path.join(SRC, 'src_v5', '05__04.png'))
    H2, W2 = face_src.shape[:2]
    log('face src:', W2, 'x', H2)
    face = f32(face_src)
    yy2, xx2 = np.mgrid[0:H2, 0:W2].astype(np.float32)
    sample = face[598:612, 648:672, :3].reshape(-1, 3).mean(axis=0)
    log('mole area skin RGB:', [round(float(v), 3) for v in sample])
    assert sample[0] > sample[2], 'skin not R-dominant — 落点或读图有误'

    H, W = yy.shape
    rows = []
    half_crop, k = 44, 4
    for (name, cx, cy, rx, ry, colr, peak) in MOLE_VARIANTS:
        al_full = peak * mole_alpha(xx2, yy2, cx, cy, rx, ry)
        comp_full = face[..., :3] * (1 - al_full[..., None]) + \
            np.array(colr, np.float32)[None, None, :] * al_full[..., None]
        o = face.copy()
        o[..., :3] = comp_full
        png_write(os.path.join(SRC, 'mole_variant_%s.png' % name), u8(o))
        # 对比图行
        sl = (slice(int(cy - half_crop), int(cy + half_crop)),
              slice(int(cx - half_crop), int(cx + half_crop)))
        comp_c = comp_full[sl]
        rows.append(np.kron(comp_c, np.ones((k, k, 1), np.float32)))
        log('variant', name, MOLE_NAMES[name], 'built')
    sep2 = np.full((10, rows[0].shape[1], 3), 0.08, np.float32)
    sheet2 = rows[0]
    for r in rows[1:]:
        sheet2 = np.concatenate([sheet2, sep2, r], axis=0)
    u8b = np.empty((sheet2.shape[0], sheet2.shape[1], 4), np.uint8)
    u8b[..., :3] = u8(sheet2)
    u8b[..., 3] = 255
    png_write(os.path.join(SRC, '泪痣变体对比.png'), u8b)

    log('=== ROUND1 HEADLESS DONE ===')


if __name__ == '__main__':
    try:
        main()
    except Exception:
        import traceback
        log('EXCEPTION:\n' + traceback.format_exc())
    finally:
        with open(LOG, 'w', encoding='utf-8') as f:
            f.write('\n'.join(_log))

