"""
像素风精灵降采样脚本（支持透明边裁切 → 降采样到目标尺寸）

用途：
    1. 自动裁切透明边（getbbox），让 sprite 实际内容紧贴边缘
    2. nearest 降采样到目标尺寸，保留像素锐边
    3. 输出放大 16 倍预览版

用法：
    python sprite_32.py <输入透明图> [--output <输出路径>] [--size 32]

示例：
    python sprite_32.py "ND_npc_sprite_v3_00012_.png"
    python sprite_32.py input.png --output public/game/sprites/npcs/nandetong.png
"""

import argparse
import os
import sys
from pathlib import Path

from PIL import Image


def sprite_crop_and_downscale(
    input_path: str,
    output_path: str = None,
    target_size: int = 32,
) -> dict:
    """透明图 → 裁切透明边 → 降采样到 32×32 透明精灵。"""
    input_path = Path(input_path)
    if not input_path.exists():
        raise FileNotFoundError(f"输入文件不存在: {input_path}")

    # 1. 读取
    img = Image.open(input_path).convert("RGBA")
    w, h = img.size
    print(f"输入: {input_path.name}  尺寸: {w}×{h}")

    # 2. 自动裁切透明边（alpha=0 的全部切掉）
    bbox = img.getbbox()
    if bbox and bbox != (0, 0, w, h):
        img = img.crop(bbox)
        print(f"裁切透明边: bbox={bbox}  新尺寸: {img.size[0]}×{img.size[1]}")
    else:
        print("无需裁切（已是紧致）")

    # 3. 校验透明度
    iw, ih = img.size
    corners = [img.getpixel((0,0))[3], img.getpixel((iw-1,0))[3],
               img.getpixel((0,ih-1))[3], img.getpixel((iw-1,ih-1))[3]]
    if all(a == 0 for a in corners):
        print("✓ 透明背景（四角 alpha=0）")
    else:
        print(f"⚠️  四角 alpha={corners}")

    # 4. nearest 降采样
    sprite = img.resize((target_size, target_size), Image.NEAREST)
    print(f"降采样: {iw}×{ih} → {target_size}×{target_size}")

    # 5. 输出路径
    if output_path is None:
        output_path = input_path.parent / f"{input_path.stem}_sprite{target_size}{input_path.suffix}"
    else:
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

    sprite.save(output_path)
    print(f"✓ 精灵: {output_path}  ({os.path.getsize(output_path)} bytes)")

    # 6. 放大预览
    preview = sprite.resize((target_size * 16, target_size * 16), Image.NEAREST)
    preview_path = output_path.parent / f"{output_path.stem}_preview{output_path.suffix}"
    preview.save(preview_path)
    print(f"✓ 预览: {preview_path}")

    return {"sprite_path": str(output_path), "preview_path": str(preview_path), "size": (target_size, target_size)}


def main():
    parser = argparse.ArgumentParser(description="透明图 → 裁切透明边 → 降采样精灵")
    parser.add_argument("input", help="输入透明图（BiRefNet 抠好的）")
    parser.add_argument("--output", help="输出路径")
    parser.add_argument("--size", type=int, default=32, help="目标尺寸（默认 32）")
    args = parser.parse_args()

    try:
        result = sprite_crop_and_downscale(
            input_path=args.input,
            output_path=args.output,
            target_size=args.size,
        )
        print(f"\n完成: {result['size']} 精灵")
    except Exception as e:
        print(f"✗ 失败: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()