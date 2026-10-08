# -*- coding: utf-8 -*-
"""诺诺虹膜 round2 设计模块（纯函数，无 Krita 依赖，可在系统 Python 下预览迭代）

设计原则（2026-10-08 黑机，基于渲染实证）：
  1. **贴图方向 = 屏幕方向**（VRM UV 实测 corr(uv.v,Y)=-1.000 / corr(uv.u,X)=+1.000，两盘同向不镜像；
     v5 原稿渲染实证：贴图下方的光池在屏幕下方）。
  2. 原稿（v5 琥珀）自带正确结构：上缘眼睑投影暗 → 瞳孔上缘柔亮晕 → 瞳孔 → 瞳孔下方光池亮 →
     外缘暗环。v7 程序化重染把它压成 0.004~0.089 的死黑，v9 手绘稿更把光池反转成"中心亮"
     → 渲染成一颗黑玻璃球。round2 = **保留原稿结构 + 换到 #1A2436 深蓝黑家族 + 手绘层次**。
  3. 高光按院长裁决：主高光上侧偏右 38°，副高光下左 215°（与 _03 白点同侧错位，叠层成双catch）。
"""
import numpy as np

# 命名 = 层名（Krita 里逐层可见/可调）
RAMP = [
    (0.00, (0.010, 0.017, 0.032)),
    (0.20, (0.026, 0.044, 0.078)),
    (0.44, (0.060, 0.098, 0.166)),
    (0.66, (0.115, 0.170, 0.258)),   # 略亮于 #1A2436 家族锚（远距必须有亮度余量，见下）
    (0.86, (0.185, 0.270, 0.392)),
    (1.00, (0.300, 0.420, 0.560)),   # 受光区峰值 ≈ #4C6B8F 蓝（对标 v5 亮下缘；上缘/环仍深）
]


def smoothstep(e0, e1, x):
    t = np.clip((x - e0) / max(1e-6, (e1 - e0)), 0.0, 1.0)
    return t * t * (3 - 2 * t)


def ramp_color(L):
    """分段线性映射 L(0..1) → RGB"""
    pos = np.array([p for p, _ in RAMP], np.float32)
    cols = np.array([c for _, c in RAMP], np.float32)
    out = np.empty(L.shape + (3,), np.float32)
    Lc = np.clip(L, 0, 1)
    for ch in range(3):
        out[..., ch] = np.interp(Lc, pos, cols[:, ch])
    return out


def luminance(rgb):
    return rgb[..., 0] * 0.299 + rgb[..., 1] * 0.587 + rgb[..., 2] * 0.114


def measure_disks(alpha, thresh=0.5):
    """从 alpha 量两个虹膜盘：(cx, cy, R) —— R 取 98.5 分位（盘缘）"""
    disks = []
    H, W = alpha.shape
    m = alpha > thresh
    for x0, x1 in ((0, W // 2), (W // 2, W)):
        sub = m[:, x0:x1]
        ys, xs = np.nonzero(sub)
        if len(xs) < 50:
            continue
        cx = xs.mean() + x0
        cy = ys.mean()
        R = np.percentile(np.hypot(xs + x0 - cx, ys - cy), 98.5)
        disks.append((float(cx), float(cy), float(R)))
    return disks


def design(base_rgb, base_alpha, cx, cy, R):
    """单盘设计 → dict(层名 → (rgb, alpha))；所有层都在整图上，未覆盖处 alpha=0"""
    H, W = base_alpha.shape
    yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    dx = xx - cx
    dy = yy - cy
    rr = np.hypot(dx, dy) / R
    th = np.arctan2(-dy, dx)          # 图像 y 向下取负：上=+90°、右=0°
    v = np.clip((dy / R + 1.0) / 2.0, 0, 1)   # 0=盘顶、1=盘底

    in_disk = rr <= 1.0
    L0 = luminance(base_rgb)

    layers = {}

    # ── L1 基底：保留原稿明暗结构，重映射到深蓝黑家族 ───────────────
    L = np.clip((L0 - 0.02) / 0.70, 0, 1) ** 1.15     # 归一化 + 压中间调（亮部收窄）
    L *= (0.88 + 0.18 * v)                            # 垂直受光强化（上暗下亮）
    band = smoothstep(0.52, 0.74, rr) * (1.0 - smoothstep(0.84, 0.98, rr))
    L *= (1.0 - 0.20 * band)                          # 压原稿外圈亮带（否则渲染成"发光环"）
    L = smoothstep(0.0, 1.0, np.clip(L, 0, 1))        # 保底平滑
    rgb_base = ramp_color(L)
    a_base = np.ones_like(base_alpha, np.float32)   # 覆盖整块不透明区（含盘缘软裙边）
    layers['基底_蓝黑重染'] = (rgb_base, a_base)

    # ── L2 limbal ring：外缘环状加深（清冷的锐度来源）───────────────
    ring = smoothstep(0.74, 0.86, rr) * (1.0 - smoothstep(0.93, 0.995, rr))
    rgb_ring = np.zeros_like(rgb_base)
    a_ring = (0.60 * ring).astype(np.float32)
    layers['limbal ring'] = (rgb_ring, a_ring)        # 黑色叠加层（alpha 控制深度）

    # ── L3 眼睑投影：盘顶扇区再压暗（深度感）───────────────────────
    up = np.clip(np.sin(th), 0, 1)
    lid = smoothstep(0.45, 1.0, up) * smoothstep(0.30, 0.95, rr) * 0.55
    layers['眼睑投影'] = (np.zeros_like(rgb_base), (0.50 * lid).astype(np.float32))

    # ── L4 光池：瞳孔下方的柔亮（"活"的来源，原稿已有→加强成形）────
    e_pool = np.hypot(dx / (0.60 * R), (dy - 0.24 * R) / (0.40 * R))
    pool = np.exp(-0.5 * e_pool ** 2)
    pool *= smoothstep(0.15, 0.45, rr) * (1 - smoothstep(0.80, 0.97, rr))
    layers['光池_下缘'] = (np.ones_like(rgb_base) * np.array([0.30, 0.45, 0.63], np.float32),
                       (0.42 * pool).astype(np.float32))

    # ── L5 瞳孔：纵长椭圆 + 柔边（比原稿更明确）─────────────────────
    e_pup = np.hypot(dx / (0.155 * R), dy / (0.215 * R))
    pup = 1.0 - smoothstep(0.78, 1.05, e_pup)
    layers['瞳孔'] = (np.zeros_like(rgb_base), (0.92 * pup).astype(np.float32))

    # ── L6 纤维：径向条纹（手绘质感；只在中段，微弱不喧宾夺主）─────────
    fib = (np.cos(41.0 * th + 2.7 * rr) * 0.5 + 0.5) * 0.6 \
        + (np.cos(17.0 * th - 1.9 * rr) * 0.5 + 0.5) * 0.4
    fib = (fib - 0.5) * 2.0
    fib *= smoothstep(0.22, 0.50, rr) * (1 - smoothstep(0.72, 0.95, rr))
    a_fib = np.clip(np.abs(fib) * 0.055, 0, 1).astype(np.float32)
    rgb_fib = np.where(fib[..., None] > 0, 0.34, 0.0) * np.ones_like(rgb_base)
    layers['纤维_径向'] = (rgb_fib, a_fib)

    # ── L7 主高光：上侧偏右 38°（院长裁决）硬核 + 柔晕 ──────────────
    a1 = np.radians(38.0)
    x1, y1 = cx + 0.48 * R * np.cos(a1), cy - 0.48 * R * np.sin(a1)
    d1 = np.hypot(xx - x1, yy - y1)
    core = np.exp(-0.5 * (d1 / (0.075 * R)) ** 2) * 0.95
    glow = np.exp(-0.5 * (d1 / (0.20 * R)) ** 2) * 0.35
    a_h1 = np.clip(np.maximum(core, glow), 0, 1)
    layers['主高光_上右38'] = (np.ones_like(rgb_base) * np.array([0.83, 0.89, 0.96], np.float32),
                          a_h1.astype(np.float32))

    # ── L8 副高光：下缘偏左 215°，小而淡（与 _03 白点呼应成双catch）──
    a2 = np.radians(215.0)
    x2, y2 = cx + 0.56 * R * np.cos(a2), cy - 0.56 * R * np.sin(a2)
    d2 = np.hypot(xx - x2, yy - y2)
    a_h2 = (np.exp(-0.5 * (d2 / (0.085 * R)) ** 2) * 0.50).astype(np.float32)
    layers['副高光_下左215'] = (np.ones_like(rgb_base) * np.array([0.55, 0.65, 0.80], np.float32),
                           a_h2)

    # 覆盖范围 = 底图不透明区（含盘缘软裙边，避免残留下方原稿琥珀色边缘）
    cover = smoothstep(0.002, 0.020, base_alpha)   # 连极淡边一起改色，杜绝原稿琥珀描边
    for k, (rgb, a) in list(layers.items()):
        layers[k] = (rgb, (a * cover).astype(np.float32))
    return layers


def compose_over(base_rgb, base_alpha, layer_list):
    rgb = base_rgb.copy()
    a_out = base_alpha.copy()
    for rgb_l, a_l in layer_list:
        a3 = a_l[..., None]
        rgb = rgb * (1 - a3) + rgb_l * a3
        a_out = np.maximum(a_out, a_l)
    return rgb, a_out


def build(base_rgb, base_alpha):
    """整图：两盘各建层 → 返回 (合成图, 所有层)"""
    all_layers = []
    for (cx, cy, R) in measure_disks(base_alpha):
        layers = design(base_rgb, base_alpha, cx, cy, R)
        for name in layers:
            all_layers.append((name, layers[name]))
    # 按层名归并（左右盘合并同一层）
    merged = {}
    for name, (rgb, a) in all_layers:
        if name in merged:
            r0, a0 = merged[name]
            a_new = np.maximum(a0, a)
            src = np.where((a > a0)[..., None], rgb, r0)
            merged[name] = (src, a_new)
        else:
            merged[name] = (rgb, a)
    order = ['基底_蓝黑重染', 'limbal ring', '眼睑投影', '光池_下缘', '瞳孔',
             '纤维_径向', '主高光_上右38', '副高光_下左下215'.replace('下左下', '下左')]
    order = ['基底_蓝黑重染', 'limbal ring', '眼睑投影', '光池_下缘', '瞳孔',
             '纤维_径向', '主高光_上右38', '副高光_下左215']
    seq = [(merged[n][0], merged[n][1]) for n in order if n in merged]
    rgb, alpha = compose_over(base_rgb, base_alpha, seq)
    return rgb, alpha, merged, order
