# -*- coding: utf-8 -*-
"""为 Krita 层写入预生成原始像素缓冲（Krita 内置 Python 无 numpy，故所有计算在系统 Python 完成）

输出到 .ai/tmp/klayer/：
  layer_<n>_<层名>__<perm>__<pre>.raw   8 位 RGBA 缓冲（按候选通道序/预乘约定转换）
  probe__<perm>__<pre>.raw              8x8 校准探针块
  manifest.txt                          层序与文件名清单
候选约定：perm ∈ {rgba=0123, bgra=2103}；pre ∈ {0=直通, 1=预乘}
"""
import os
import sys

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
WS = os.path.join(ROOT, '手绘轮工作区')


def _repo_root(start):
    p = start
    while p and not os.path.isdir(os.path.join(p, '.git')):
        parent = os.path.dirname(p)
        if parent == p:
            break
        p = parent
    return p


OUT = os.path.join(_repo_root(HERE), '.ai', 'tmp', 'klayer')
sys.path.insert(0, HERE)
import iris_r2_design as D  # noqa: E402

PERMS = {'rgba': [0, 1, 2, 3], 'bgra': [2, 1, 0, 3]}


def to_raw(rgba, perm, premult):
    a = rgba.copy()
    if premult:
        a[..., :3] = a[..., :3] * a[..., 3:4]
    out = np.empty_like(a)
    out[..., perm] = a
    return (np.clip(out, 0, 1) * 255.0).round().astype(np.uint8).tobytes()


def main():
    os.makedirs(OUT, exist_ok=True)
    base = np.asarray(Image.open(os.path.join(WS, 'src_v5', '03__02.png')).convert('RGBA')).astype(np.float32) / 255.0
    rgb, alpha, merged, order = D.build(base[..., :3], base[..., 3])

    # 校准探针：8x8 已知色块（含半透明，能同时区分通道序与预乘）
    probe = np.zeros((8, 8, 4), np.float32)
    probe[..., 0], probe[..., 1], probe[..., 2], probe[..., 3] = 0.90, 0.30, 0.10, 0.60

    manifest = []
    for pk, perm in PERMS.items():
        for pre in (0, 1):
            tag = '%s__%d' % (pk, pre)
            with open(os.path.join(OUT, 'probe__%s.raw' % tag), 'wb') as f:
                f.write(to_raw(probe, perm, bool(pre)))
    for i, name in enumerate(order):
        rgb_l, a_l = merged[name]
        arr = np.empty(rgb.shape[:2] + (4,), np.float32)
        arr[..., :3] = rgb_l
        arr[..., 3] = a_l
        for pk, perm in PERMS.items():
            for pre in (0, 1):
                tag = '%s__%d' % (pk, pre)
                fn = 'layer_%02d__%s__%s.raw' % (i, name, tag)
                with open(os.path.join(OUT, fn), 'wb') as f:
                    f.write(to_raw(arr, perm, bool(pre)))
        manifest.append('%02d\t%s' % (i, name))
    with open(os.path.join(OUT, 'manifest.txt'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(manifest) + '\n')
    # numpy 参考合成（供 Krita 导出后比对）
    ref = np.empty(rgb.shape[:2] + (4,), np.uint8)
    ref[..., :3] = np.clip(rgb, 0, 1) * 255
    ref[..., 3] = np.clip(alpha, 0, 1) * 255
    Image.fromarray(ref, 'RGBA').save(os.path.join(OUT, 'reference.png'))
    print('wrote %d layers x4 + probe x4 -> %s' % (len(order), OUT))
    for line in manifest:
        print('  ', line)


if __name__ == '__main__':
    main()
