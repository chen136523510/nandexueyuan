"""
立绘 → 精灵图（4 方向行走动画）转换脚本

用途：
    从透明背景的立绘（1024×1024 RGBA）生成 128×128 精灵图（4×4 网格）。

精灵图布局（128×128，每格 32×32）：
    行 0: down  | 帧 0(stand) 1(walkA) 2(stand) 3(walkB)
    行 1: up    | 帧 4(stand) 5(walkA) 6(stand) 7(walkB)
    行 2: left  | 帧 8(stand) 9(walkA) 10(stand) 11(walkB)
    行 3: right | 帧 12(stand) 13(walkA) 14(stand) 15(walkB)

策略（立绘只有正面图，无背/侧视图）：
    1. 从立绘裁切透明边 → 得到紧致角色
    2. 取角色全身 → 缩小到 32×32（NEAREST 采样，保留像素感）
    3. 四方向：
       - down: 正面原图
       - up:   正面水平翻转（模拟背面）
       - left: 正面图
       - right: 正面水平翻转
    4. 四帧行走动画：
       - 帧 0 (stand):  角色居中，无偏移
       - 帧 1 (walkA):  角色左偏 1px + 上移 1px（模拟迈左脚）
       - 帧 2 (stand):  同帧 0
       - 帧 3 (walkB):  角色右偏 1px + 上移 1px（模拟迈右脚）

用法：
    python scripts/portrait_to_spritesheet.py <输入立绘> [--output <输出路径>]
    # 批量
    for i in 1 2 3 4 5; do
        python scripts/portrait_to_spritesheet.py \\
            public/game/portraits/player_set${i}.png \\
            --output public/game/sprites/players/player_set${i}_walk.png
    done
"""

import argparse
import os
import sys
from pathlib import Path

from PIL import Image

TILE = 32  # 每帧尺寸
GRID = 4   # 4×4 网格
SHEET = TILE * GRID  # 128×128


def shrink_character(img, target=TILE):
    """从立绘裁取紧致角色并缩小到 target×target。

    Args:
        img: RGBA PIL Image（透明背景立绘）
        target: 目标尺寸（默认 32）
    Returns:
        缩小后的 RGBA Image
    """
    # 1. 裁切透明边
    bbox = img.getbbox()
    if not bbox:
        raise ValueError("图片全透明")
    cropped = img.crop(bbox)

    # 2. 等比缩放到 ≤32px 高（保留长宽比）
    w, h = cropped.size
    scale = min(target / w, target / h)
    new_w = max(1, int(w * scale))
    new_h = max(1, int(h * scale))
    shrunk = cropped.resize((new_w, new_h), Image.NEAREST)

    # 3. 居中放到 32×32 透明画布上
    canvas = Image.new("RGBA", (target, target), (0, 0, 0, 0))
    offset_x = (target - new_w) // 2
    offset_y = (target - new_h) // 2
    canvas.paste(shrunk, (offset_x, offset_y), shrunk)
    return canvas


def make_walk_frame(base_img, frame_idx):
    """从基础 32×32 角色生成行走帧。

    Args:
        base_img: 32×32 RGBA 角色
        frame_idx: 0(stand), 1(walkA), 2(stand), 3(walkB)
    """
    frame = Image.new("RGBA", (TILE, TILE), (0, 0, 0, 0))
    if frame_idx == 0 or frame_idx == 2:
        # 站立
        frame.paste(base_img, (0, 0), base_img)
    elif frame_idx == 1:
        # 迈左脚：整体上移 1px，左偏 1px
        frame.paste(base_img, (-1, -1), base_img)
    elif frame_idx == 3:
        # 迈右脚：整体上移 1px，右偏 1px
        frame.paste(base_img, (1, -1), base_img)
    return frame


def portrait_to_spritesheet(input_path, output_path=None):
    """立绘 → 128×128 4×4 精灵图。

    Args:
        input_path: 输入立绘路径（RGBA 透明 PNG）
        output_path: 精灵图输出路径
    Returns:
        dict: { spritesheet_path, size }
    """
    input_path = Path(input_path)
    if not input_path.exists():
        raise FileNotFoundError(f"输入文件不存在: {input_path}")

    img = Image.open(input_path)
    if img.mode != "RGBA":
        img = img.convert("RGBA")

    print(f"输入: {input_path.name}  原始尺寸: {img.size[0]}×{img.size[1]}")

    # 生成基础 32×32 角色
    base = shrink_character(img)
    # 水平翻转版（用于 up/right 方向）
    base_flip = base.transpose(Image.FLIP_LEFT_RIGHT)

    # 构建 128×128 精灵图
    sheet = Image.new("RGBA", (SHEET, SHEET), (0, 0, 0, 0))

    # 方向到基础图的映射
    dir_bases = [base, base_flip, base, base_flip]  # down, up, left, right

    for row in range(GRID):
        dir_base = dir_bases[row]
        for col in range(GRID):
            frame = make_walk_frame(dir_base, col)
            sheet.paste(frame, (col * TILE, row * TILE), frame)

    # 输出路径
    if output_path is None:
        output_path = input_path.parent / f"{input_path.stem}_walk.png"
    else:
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

    sheet.save(output_path)
    print(f"✓ 精灵图: {output_path}  ({os.path.getsize(output_path)} bytes)")
    return {"spritesheet_path": str(output_path), "size": (SHEET, SHEET)}


def main():
    parser = argparse.ArgumentParser(
        description="立绘 → 128×128 4×4 精灵图（4 方向行走动画）",
        formatter_class=argparse.RawDescriptionHelpFormatter,
    )
    parser.add_argument("input", help="输入立绘路径（RGBA 透明 PNG）")
    parser.add_argument("--output", help="精灵图输出路径")

    args = parser.parse_args()

    try:
        result = portrait_to_spritesheet(args.input, args.output)
        print(f"\n完成：{result['size']} 精灵图")
    except Exception as e:
        print(f"✗ 失败: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
