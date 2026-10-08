# -*- coding: utf-8 -*-
"""泪痣贴图生成（院长 2026-10-08 定：用 C 的形态，位置再靠右一些、下一些）

C 原参：中心 (666, 598)，rx 2.6 / ry 3.4，色 (0.29,0.22,0.18)，峰值 0.70（round1 handpaint_generate.py 配方）
本脚本按同一形态换中心，输出 手绘轮工作区/handpaint_face_skin.png（build_v7_texture.py 的面皮肤手绘钩子）
用法：python mole_r3_generate.py [cx] [cy]
"""
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
WS = os.path.join(ROOT, '手绘轮工作区')
SRC = os.path.join(WS, 'src_v5', '05__04.png')          # v5 原版面皮肤（1024²）

CX = int(sys.argv[1]) if len(sys.argv) > 1 else 678      # 666 → 678：右移
CY = int(sys.argv[2]) if len(sys.argv) > 2 else 612      # 598 → 612：下移
RX, RY = 2.6, 3.4                                        # C 形态：小而淡
COLOR = (0.29, 0.22, 0.18)
PEAK = 0.70


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / max(1e-6, (e1 - e0)), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def main():
    a = np.asarray(Image.open(SRC).convert('RGBA')).astype(np.float32) / 255.0
    H, W = a.shape[:2]
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    e = np.hypot((xx - CX) / RX, (yy - CY) / RY)
    al = PEAK * (1.0 - smoothstep(0.55, 1.0, e))          # 核心实、边缘柔（round1 同法）
    out = a.copy()
    for c in range(3):
        out[..., c] = a[..., c] * (1 - al) + COLOR[c] * al
    img = Image.fromarray((np.clip(out, 0, 1) * 255).astype(np.uint8), 'RGBA')
    dst = os.path.join(WS, 'handpaint_face_skin.png')
    img.save(dst)
    # 局部放大图便于核对落点
    k = 6
    y0, y1 = CY - 26, CY + 26
    x0, x1 = CX - 26, CX + 26
    crop = img.crop((x0, y0, x1, y1)).resize((52 * k, 52 * k), Image.NEAREST)
    crop.save(os.path.join(WS, '泪痣C_落点核对.png'))
    print('mole center=(%d,%d) alpha_max=%.3f -> %s' % (CX, CY, al.max(), dst))
    print('落点核对图 -> 泪痣C_落点核对.png')


if __name__ == '__main__':
    main()
