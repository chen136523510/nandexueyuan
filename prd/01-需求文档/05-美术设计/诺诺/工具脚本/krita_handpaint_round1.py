# -*- coding: utf-8 -*-
"""
诺诺 Krita 手绘轮 round1 —— 虹膜精修 + 泪痣三变体（AI 全驱动）
院长 2026-10-07 四裁决：AI 全驱动 / 保持 #1A2436 深蓝黑家族 / 双高光 / 泪痣出 2~3 变体
运行方式：Krita Scripter（工具→脚本→Scripter）内执行一行：
  exec(open(r'G:/UGit/nandexueyuan/prd/01-需求文档/05-美术设计/诺诺/工具脚本/krita_handpaint_round1.py', encoding='utf-8').read())
产物（手绘轮工作区/）：
  handpaint_iris.png / handpaint_iris.kra            虹膜手绘稿（交付 + 工作文件）
  mole_variant_A/B/C.png + 泪痣变体对比.png           泪痣三变体（挑选定版后再导 handpaint_face_skin.png）
  handpaint_face_skin.kra / iris_preview.png          工作文件 / 自检预览（v7 现版 vs 手绘稿）
设计要点（虹膜）：径向明度分层（内缘亮/外缘暗）+ limbal ring 环状加深 + 眼睑投影 +
  底部反光弧 + 主高光（上侧偏右38°）+ 副高光（下缘偏左215°，与 _03 白点叠层呼应）；
  盘缘 2% 平滑交回底图保留结构线。泪痣：locate_tear_mole.py 基准点 (659,598) ±20px 合理区。
"""
import os
import math
import struct
import traceback
import zlib

import numpy as np
from krita import Krita

ROOT = r'G:/UGit/nandexueyuan/prd/01-需求文档/05-美术设计/诺诺'
SRC = ROOT + '/手绘轮工作区'
LOG = ROOT + '/工具脚本/krita_round1_log.txt'

_log = []


def log(*a):
    s = ' '.join(str(x) for x in a)
    _log.append(s)
    print(s, flush=True)


def flush_log():
    try:
        with open(LOG, 'w', encoding='utf-8') as f:
            f.write('\n'.join(_log))
    except Exception as e:
        print('LOG WRITE FAIL:', e)


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / max(1e-6, (e1 - e0)), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def write_png(path, arr_u8):
    """最小 PNG 写入器（RGBA8, filter 0）——对比图/预览图专用，不依赖 Krita 导出"""
    h, w = arr_u8.shape[:2]
    raw = b''.join(b'\x00' + arr_u8[y].tobytes() for y in range(h))

    def chunk(t, d):
        c = t + d
        return struct.pack('>I', len(d)) + c + struct.pack('>I', zlib.crc32(c))

    png = (b'\x89PNG\r\n\x1a\n'
           + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 6, 0, 0, 0))
           + chunk(b'IDAT', zlib.compress(raw, 6))
           + chunk(b'IEND', b''))
    with open(path, 'wb') as f:
        f.write(png)
    log('png written:', os.path.basename(path), w, 'x', h)


app = Krita.instance()
PERM = [2, 1, 0, 3]      # raw 字节序中 R,G,B,A 的位置（BGRA 假设，虹膜地真校准）
PREMULT = True           # 图层存储是否预乘 alpha（探针校准）


def get_layer_rgba(node, x, y, w, h):
    raw = np.frombuffer(bytes(node.pixelData(x, y, w, h)), np.uint8)
    return raw.reshape(h, w, 4).astype(np.float32) / 255.0


def to_layer_bytes(rgba, premult):
    a = rgba.copy()
    if premult:
        a[..., :3] = a[..., :3] * a[..., 3:4]
    raw = np.empty_like(a)
    raw[..., PERM] = a
    return (np.clip(raw, 0.0, 1.0) * 255.0).round().astype(np.uint8).tobytes()


def close_stale():
    for d in list(app.documents()):
        fn = d.fileName() or ''
        if any(k in fn for k in ('11_iris_recolor_v7', '05__04',
                                 'handpaint_iris.kra', 'handpaint_face_skin.kra')):
            try:
                app.closeDocument(d)
                log('closed stale doc:', fn)
            except Exception as e:
                log('close fail:', e)


def open_doc(path):
    d = app.openDocument(path)
    if d is not None:
        d.waitForDone()
    log('opened:', os.path.basename(path), 'ok' if d is not None else 'FAILED')
    return d


def export_doc(doc, path):
    doc.refreshProjection()
    doc.waitForDone()
    try:
        from krita import Info
        doc.exportImage(path, Info())
    except Exception:
        doc.exportImage(path)
    log('exported:', os.path.basename(path),
        os.path.exists(path) and str(os.path.getsize(path) // 1024) + 'KB')


def calibrate(doc, root):
    """预乘探针：写一块 (0.8,0.4,0.2,a=0.5) 按 PREMULT=True 假设，读回判定存储格式"""
    global PREMULT
    t = doc.createNode('cal_probe', 'paintLayer')
    root.addChildNode(t, None)
    test = np.zeros((16, 16, 4), np.float32)
    test[..., 0], test[..., 1], test[..., 2], test[..., 3] = 0.8, 0.4, 0.2, 0.5
    t.setPixelData(to_layer_bytes(test, True), 8, 8, 16, 16)
    doc.refreshProjection()
    doc.waitForDone()
    back = get_layer_rgba(t, 8, 8, 16, 16)[..., PERM]
    rv = float(back[8, 8, 0])
    if abs(rv - 0.8) < 0.06:
        PREMULT = False
    elif abs(rv - 0.4) < 0.06:
        PREMULT = True
    else:
        PREMULT = True
        log('premult probe ambiguous, rv=', round(rv, 3), '→ fallback PREMULT=True')
    root.removeChildNode(t)
    doc.refreshProjection()
    log('premult verdict:', PREMULT)


# ════════════════════════ PART 1: 虹膜精修 ════════════════════════
def design_disk(rgba, cx, cy, R):
    """单盘虹膜设计（#1A2436 家族 + 双高光），返回 (col HxWx3, alpha HxW)"""
    H, W = rgba.shape[:2]
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    dx = xx - cx
    dy = yy - cy
    r = np.hypot(dx, dy) / R
    th = np.arctan2(-dy, dx)  # 图像 y 向下取负：上=+90°、右=0°

    # 径向明度分层：内芯提亮 / 外缘压暗（换色平涂 → 层次）
    L = (1.0
         + 0.20 * (1.0 - smoothstep(0.0, 0.50, r))
         - 0.28 * smoothstep(0.55, 0.95, r))
    # 眼睑投影：上方扇区随半径加深（垂眼清冷的深度感）
    up = np.clip(np.sin(th), 0.0, 1.0)
    L -= 0.26 * smoothstep(0.35, 0.95, r) * up ** 1.4
    # 底部反光弧：下缘轻微回亮（湿润感）
    dn = np.clip(-np.sin(th), 0.0, 1.0)
    L += 0.13 * smoothstep(0.55, 0.92, r) * dn
    L = np.clip(L, 0.05, 1.6)

    mid = np.array([0.102, 0.141, 0.212], np.float32)  # #1A2436
    col = mid[None, None, :] * L[..., None]

    # limbal ring：0.80R~0.99R 环状加深
    ring = smoothstep(0.80, 0.90, r) * (1.0 - smoothstep(0.94, 0.995, r))
    col = col * (1.0 - 0.62 * ring)[..., None]

    # 瞳孔：纵长椭圆柔边
    e = np.hypot(dx / (0.17 * R), dy / (0.23 * R))
    pupil = 1.0 - smoothstep(0.80, 1.05, e)
    pcol = np.array([0.024, 0.031, 0.051], np.float32)
    col = col * (1 - pupil[..., None]) + pcol[None, None, :] * pupil[..., None]

    # 主高光：上侧偏右 38°（裁决：双高光之主光）
    a1 = math.radians(38.0)
    x1 = cx + 0.46 * R * math.cos(a1)
    y1 = cy - 0.46 * R * math.sin(a1)
    g1 = np.exp(-(((xx - x1) ** 2 + (yy - y1) ** 2) / (2 * (0.105 * R) ** 2)))
    m1 = 0.80 * g1
    h1 = np.array([0.71, 0.78, 0.87], np.float32)
    col = col * (1 - m1[..., None]) + h1[None, None, :] * m1[..., None]

    # 副高光：下缘偏左 215°，小而淡（与 _03 白点叠层融合为副光）
    a2 = math.radians(215.0)
    x2 = cx + 0.52 * R * math.cos(a2)
    y2 = cy - 0.52 * R * math.sin(a2)
    g2 = np.exp(-(((xx - x2) ** 2 + (yy - y2) ** 2) / (2 * (0.075 * R) ** 2)))
    m2 = 0.38 * g2
    h2 = np.array([0.42, 0.50, 0.63], np.float32)
    col = col * (1 - m2[..., None]) + h2[None, None, :] * m2[..., None]

    alpha = 1.0 - smoothstep(0.968, 0.992, r)  # 盘缘 2% 交回底图（保留结构线）
    return col.astype(np.float32), alpha.astype(np.float32)


def part1_iris():
    close_stale()
    doc1 = open_doc(SRC + '/src_v7/11_iris_recolor_v7.png')
    if doc1 is None:
        log('FATAL: iris doc open failed')
        return
    W, H = doc1.width(), doc1.height()
    log('iris doc size:', W, 'x', H)
    root1 = doc1.rootNode()
    base1 = root1.childNodes()[0]
    base1.setName('底层_原v7虹膜(锁)')
    try:
        base1.setLocked(True)
    except Exception:
        log('base lock unsupported, skipped')

    global PERM
    raw1 = get_layer_rgba(base1, 0, 0, W, H)
    m = raw1[..., :3].max(axis=2) > 0.15
    means = raw1[m].mean(axis=0)
    log('iris channel means(raw):', [round(float(v), 4) for v in means])
    PERM = [2, 1, 0, 3] if means[0] > means[2] else [0, 1, 2, 3]
    log('channel order:', 'BGRA' if PERM[0] == 2 else 'RGBA', 'perm=', PERM)
    rgba1 = raw1[..., PERM]

    calibrate(doc1, root1)

    # 盘几何测量（左右两半）
    mask = rgba1[..., :3].max(axis=2) > 0.04
    disks = []
    for xoff in (0, W // 2):
        half = mask[:, xoff:xoff + W // 2]
        ys, xs = np.nonzero(half)
        if len(xs) == 0:
            log('WARN: no disk pixels in half', xoff)
            continue
        cx = float(xs.mean()) + xoff
        cy = float(ys.mean())
        rr = np.hypot(xs - (cx - xoff), ys - cy)
        R = float(np.percentile(rr, 98.5))
        disks.append((cx, cy, R))
        log('disk:', round(cx, 1), round(cy, 1), 'R=', round(R, 1), 'area=', len(xs))
    if len(disks) != 2:
        log('FATAL: disk detection failed,', len(disks), 'disks')
        return

    # 手绘层
    layer_arr = np.zeros_like(rgba1)
    for (cx, cy, R) in disks:
        col, al = design_disk(rgba1, cx, cy, R)
        pos = al > 0
        layer_arr[..., :3][pos] = col[pos]
        layer_arr[..., 3] = np.maximum(layer_arr[..., 3], al)
    node = doc1.createNode('手绘_虹膜精修v1', 'paintLayer')
    root1.addChildNode(node, None)
    node.setPixelData(to_layer_bytes(layer_arr, PREMULT), 0, 0, W, H)
    doc1.refreshProjection()
    doc1.waitForDone()

    export_doc(doc1, SRC + '/handpaint_iris.png')
    try:
        doc1.saveDocument(SRC + '/handpaint_iris.kra')
        log('.kra saved:', os.path.basename(SRC + '/handpaint_iris.kra'))
    except Exception as ex:
        log('.kra save FAILED:', ex)

    # 自检预览：左盘 before/after ×3
    cx, cy, R = disks[0]
    half = int(R * 1.15)
    y0, y1 = int(cy - half), int(cy + half)
    x0, x1 = int(cx - half), int(cx + half)
    before = rgba1[y0:y1, x0:x1, :3]
    after = rgba1[y0:y1, x0:x1, :3].copy()
    a3 = layer_arr[..., 3][y0:y1, x0:x1, None]
    after = after * (1 - a3) + layer_arr[..., :3][y0:y1, x0:x1] * a3
    k = 3
    sep = np.full((before.shape[0] * k, 6, 3), 0.1, np.float32)
    sheet = np.concatenate(
        [np.kron(before, np.ones((k, k, 1), np.float32)), sep,
         np.kron(np.clip(after, 0, 1), np.ones((k, k, 1), np.float32))], axis=1)
    u8 = np.empty((sheet.shape[0], sheet.shape[1], 4), np.uint8)
    u8[..., :3] = (np.clip(sheet, 0, 1) * 255).astype(np.uint8)
    u8[..., 3] = 255
    write_png(SRC + '/iris_preview.png', u8)


# ════════════════════════ PART 2: 泪痣三变体 ════════════════════════
MOLE_VARIANTS = [
    # name, cx, cy, rx, ry, colorRGB, peak（基准红十字=(659,598)，±20px 合理区）
    ('A_基准',   659, 600, 3.2, 4.2, (0.23, 0.16, 0.13), 0.85),
    ('B_大而深', 657, 604, 3.8, 5.0, (0.18, 0.12, 0.10), 0.95),
    ('C_小而淡偏外', 666, 598, 2.6, 3.4, (0.29, 0.22, 0.18), 0.70),
]


def mole_alpha(xx, yy, cx, cy, rx, ry):
    e = np.hypot((xx - cx) / rx, (yy - cy) / ry)
    return 1.0 - smoothstep(0.55, 1.0, e)  # 核心实、边缘柔


def part2_mole():
    doc2 = open_doc(SRC + '/src_v5/05__04.png')
    if doc2 is None:
        log('FATAL: face doc open failed')
        return
    W2, H2 = doc2.width(), doc2.height()
    log('face doc size:', W2, 'x', H2)
    root2 = doc2.rootNode()
    base2 = root2.childNodes()[0]
    base2.setName('底层_原v5面部(锁)')
    try:
        base2.setLocked(True)
    except Exception:
        pass

    rgba2 = get_layer_rgba(base2, 0, 0, W2, H2)[..., PERM]
    # 顺序旁证：面部粉色应 R>B
    sample = rgba2[598:612, 648:672, :3].reshape(-1, 3).mean(axis=0)
    log('mole area skin color RGB:', [round(float(v), 3) for v in sample])
    if sample[0] <= sample[2]:
        log('WARN: skin R<=B — PERM 可能有误！', PERM)

    yy, xx = np.mgrid[0:H2, 0:W2].astype(np.float32)
    nodes = []
    for (name, cx, cy, rx, ry, colr, peak) in MOLE_VARIANTS:
        al = peak * mole_alpha(xx, yy, cx, cy, rx, ry)
        arr = np.zeros_like(rgba2)
        arr[..., 0], arr[..., 1], arr[..., 2] = colr
        arr[..., 3] = al
        nd = doc2.createNode('泪痣_变体' + name, 'paintLayer')
        root2.addChildNode(nd, None)
        nd.setPixelData(to_layer_bytes(arr, PREMULT), 0, 0, W2, H2)
        nodes.append(nd)
        log('mole layer built:', name)
    doc2.refreshProjection()
    doc2.waitForDone()

    # 逐变体导出（只显示当前变体）
    for nd, (name, cx, cy, rx, ry, colr, peak) in zip(nodes, MOLE_VARIANTS):
        for o in nodes:
            o.setVisible(o is nd)
        doc2.refreshProjection()
        doc2.waitForDone()
        export_doc(doc2, SRC + '/mole_variant_' + name.split('_')[0] + '.png')
    nodes[0].setVisible(True)
    for o in nodes[1:]:
        o.setVisible(False)
    doc2.refreshProjection()

    try:
        doc2.saveDocument(SRC + '/handpaint_face_skin.kra')
        log('.kra saved: handpaint_face_skin.kra')
    except Exception as ex:
        log('.kra save FAILED:', ex)

    # 对比图：三变体裁片 ×4 纵排（A/B/C 自上而下）
    half, k = 44, 4
    rows = []
    for (name, cx, cy, rx, ry, colr, peak) in MOLE_VARIANTS:
        e = np.hypot((xx - cx) / rx, (yy - cy) / ry)
        al = (peak * (1.0 - smoothstep(0.55, 1.0, e)))[int(cy - half):int(cy + half),
                                                      int(cx - half):int(cx + half), None]
        base_c = rgba2[int(cy - half):int(cy + half), int(cx - half):int(cx + half), :3]
        comp = base_c * (1 - al) + np.array(colr, np.float32)[None, None, :] * al
        rows.append(np.kron(np.clip(comp, 0, 1), np.ones((k, k, 1), np.float32)))
    sep = np.full((10, rows[0].shape[1], 3), 0.08, np.float32)
    sheet = rows[0]
    for r in rows[1:]:
        sheet = np.concatenate([sheet, sep, r], axis=0)
    u8 = np.empty((sheet.shape[0], sheet.shape[1], 4), np.uint8)
    u8[..., :3] = (np.clip(sheet, 0, 1) * 255).astype(np.uint8)
    u8[..., 3] = 255
    write_png(SRC + '/泪痣变体对比.png', u8)


try:
    part1_iris()
except Exception:
    log('PART1 EXCEPTION:\n' + traceback.format_exc())
try:
    part2_mole()
except Exception:
    log('PART2 EXCEPTION:\n' + traceback.format_exc())
flush_log()
print('ROUND1 DONE', flush=True)
