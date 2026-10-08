# -*- coding: utf-8 -*-
"""虹膜 round2 预览（系统 Python + PIL，快速迭代用；不进仓库成品，输出到 .ai/tmp）
用法: python 工具脚本/iris_r2_preview.py
输出:
  .ai/tmp/iris_r2.png            新虹膜全图（1024x512，alpha 保持原稿）
  .ai/tmp/iris_r2_compare.png    v7现版 / v9手绘 / r2新稿 三栏对比（左盘 3x）
"""
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)                       # .../05-美术设计/诺诺
WS = os.path.join(ROOT, '手绘轮工作区')


def _repo_root(start):
    p = start
    while p and not os.path.isdir(os.path.join(p, '.git')):
        parent = os.path.dirname(p)
        if parent == p:
            break
        p = parent
    return p


OUT = os.path.join(_repo_root(HERE), '.ai', 'tmp')
sys.path.insert(0, HERE)
import iris_r2_design as D  # noqa: E402


def load(p):
    a = np.asarray(Image.open(p).convert('RGBA')).astype(np.float32) / 255.0
    return a[..., :3], a[..., 3]


def save(rgb, alpha, path):
    a = np.empty(rgb.shape[:2] + (4,), np.uint8)
    a[..., :3] = np.clip(rgb, 0, 1) * 255
    a[..., 3] = np.clip(alpha, 0, 1) * 255
    Image.fromarray(a, 'RGBA').save(path)
    print('written', path, rgb.shape[1], 'x', rgb.shape[0])


def profile(rgb, alpha, label):
    disks = D.measure_disks(alpha)
    cx, cy, R = disks[0]
    lum = D.luminance(rgb)
    out = [label + ' (左盘 R=%.0f)' % R]
    for frac, lab in [(0.75, '上75%'), (0.45, '上45%'), (0.0, '中'), (-0.45, '下45%'), (-0.75, '下75%')]:
        y = int(cy - frac * R)
        row = lum[y, int(cx - R * 0.5):int(cx + R * 0.5)]
        m = alpha[y, int(cx - R * 0.5):int(cx + R * 0.5)] > 0.5
        v = row[m].mean() if m.any() else float('nan')
        out.append('   %-6s lum=%.3f' % (lab, v))
    return '\n'.join(out)


def zoom(rgb, alpha, k=3, half=None, disk=0):
    disks = D.measure_disks(alpha)
    cx, cy, R = disks[disk]
    half = half or int(R * 1.12)
    y0, y1 = int(cy - half), int(cy + half)
    x0, x1 = int(cx - half), int(cx + half)
    sub = rgb[y0:y1, x0:x1]
    a = alpha[y0:y1, x0:x1, None]
    # 棋盘底（看 alpha 覆盖）
    bg = np.zeros_like(sub)
    yy, xx = np.mgrid[0:sub.shape[0], 0:sub.shape[1]]
    chk = ((yy // 16 + xx // 16) % 2).astype(np.float32) * 0.12 + 0.06
    bg[..., :] = chk[..., None]
    comp = bg * (1 - a) + sub * a
    return np.kron(np.clip(comp, 0, 1), np.ones((k, k, 1), np.float32))


def main():
    base_rgb, base_alpha = load(os.path.join(WS, 'src_v5', '03__02.png'))
    v7_rgb, v7_a = load(os.path.join(WS, 'src_v7', '11_iris_recolor_v7.png'))
    v9_rgb, v9_a = load(os.path.join(WS, 'handpaint_iris.png'))

    rgb, alpha, merged, order = D.build(base_rgb, base_alpha)
    save(rgb, alpha, os.path.join(OUT, 'iris_r2.png'))

    print()
    print(profile(base_rgb, base_alpha, 'v5原稿(琥珀·结构基准)'))
    print(profile(v7_rgb, v7_a, 'v7现版(程序化重染)'))
    print(profile(v9_rgb, v9_a, 'v9手绘稿(round1)'))
    print(profile(rgb, alpha, 'r2新稿'))

    tiles = [zoom(v7_rgb, v7_a), zoom(v9_rgb, v9_a), zoom(rgb, alpha)]
    h = max(t.shape[0] for t in tiles)
    tiles = [np.pad(t, ((0, h - t.shape[0]), (0, 0), (0, 0))) for t in tiles]
    sep = np.full((h, 8, 3), 0.35, np.float32)
    sheet = np.concatenate([tiles[0], sep, tiles[1], sep, tiles[2]], axis=1)
    a4 = np.empty(sheet.shape[:2] + (4,), np.uint8)
    a4[..., :3] = np.clip(sheet, 0, 1) * 255
    a4[..., 3] = 255
    Image.fromarray(a4, 'RGBA').save(os.path.join(OUT, 'iris_r2_compare.png'))
    print('\n对比图: .ai/tmp/iris_r2_compare.png  (左→右: v7现版 | v9手绘 | r2新稿)')


if __name__ == '__main__':
    main()
