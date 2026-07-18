"""
立绘 → 像素风转换脚本

用途：
    将透明背景的高分辨率立绘（如 1024×1024 RGBA）转换为像素风精灵，
    同时保留透明通道（ComfyUI ImageScale 会丢 alpha，本脚本解决此问题）。

用法：
    python portrait_to_pixel.py <输入立绘> [--size 128] [--preview 512] [--output <输出路径>]

示例：
    # 默认转 128×128，同时输出 512 预览
    python portrait_to_pixel.py public/game/portraits/nandetong.png

    # 自定义尺寸
    python portrait_to_pixel.py input.png --size 96 --output public/game/sprites/npcs/nandetong.png

算法：
    1. 读取 RGBA 立绘（保留 alpha 通道）
    2. 用 nearest-exact 降采样到目标尺寸（保留锐利像素边缘）
    3. 输出 RGBA 像素图（透明背景保留）
    4. 同时生成放大预览版（nearest-exact 放大，保持像素感）

注意：
    - Python 用 ComfyUI 整合包自带的：E:/ai/ComfyUI-aki(1)/ComfyUI-aki-v3/python/python.exe
    - 依赖 Pillow（已随整合包安装）
"""

import argparse
import os
import sys
from pathlib import Path

from PIL import Image


def portrait_to_pixel(
    input_path: str,
    size: int = 128,
    preview_size: int = 512,
    output_path: str = None,
) -> dict:
    """立绘转像素风，保留透明背景。

    Args:
        input_path: 输入立绘路径（需 RGBA 透明 PNG）
        size: 像素图目标尺寸（正方形边长）
        preview_size: 预览图尺寸（放大版，方便人眼查看）
        output_path: 像素图输出路径；不指定则与输入同目录，加 _pixel 后缀

    Returns:
        dict: 包含 pixel_path 和 preview_path
    """
    input_path = Path(input_path)
    if not input_path.exists():
        raise FileNotFoundError(f"输入文件不存在: {input_path}")

    # 1. 读取立绘，确保是 RGBA 模式
    img = Image.open(input_path)
    if img.mode != "RGBA":
        print(f"⚠️  输入图模式是 {img.mode}，转换为 RGBA")
        img = img.convert("RGBA")

    original_size = img.size
    print(f"输入: {input_path.name}  原始尺寸: {original_size[0]}×{original_size[1]}  模式: {img.mode}")

    # 校验透明通道：四角 alpha 是否为 0
    w, h = img.size
    corners_alpha = [img.getpixel((0, 0))[3], img.getpixel((w - 1, 0))[3],
                     img.getpixel((0, h - 1))[3], img.getpixel((w - 1, h - 1))[3]]
    if all(a == 0 for a in corners_alpha):
        print(f"✓ 背景透明（四角 alpha=0）")
    else:
        print(f"⚠️  四角 alpha={corners_alpha}，背景可能非透明，像素图会带底色")

    # 2. 降采样到目标尺寸（nearest-exact 保留锐利边缘 + alpha 通道）
    pixel_img = img.resize((size, size), Image.NEAREST)
    print(f"像素化: {original_size[0]}×{original_size[1]} → {size}×{size}（nearest）")

    # 3. 确定输出路径
    if output_path is None:
        output_path = input_path.parent / f"{input_path.stem}_pixel{input_path.suffix}"
    else:
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

    # 4. 保存像素图（RGBA，保留透明）
    pixel_img.save(output_path)
    print(f"✓ 像素图已保存: {output_path}  ({os.path.getsize(output_path) // 1024} KB)")

    # 5. 生成放大预览版（nearest 放大，保持像素感，方便人眼查看）
    preview_img = pixel_img.resize((preview_size, preview_size), Image.NEAREST)
    preview_path = output_path.parent / f"{output_path.stem}_preview{output_path.suffix}"
    preview_img.save(preview_path)
    print(f"✓ 预览图已保存: {preview_path}  ({os.path.getsize(preview_path) // 1024} KB)")

    return {
        "pixel_path": str(output_path),
        "preview_path": str(preview_path),
        "pixel_size": (size, size),
        "preview_size": (preview_size, preview_size),
    }


def main():
    parser = argparse.ArgumentParser(
        description="立绘转像素风（保留透明背景）",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  %(prog)s public/game/portraits/nandetong.png
  %(prog)s input.png --size 96 --output public/game/sprites/npcs/nandetong.png
        """,
    )
    parser.add_argument("input", help="输入立绘路径（RGBA 透明 PNG）")
    parser.add_argument("--size", type=int, default=128, help="像素图目标尺寸（默认 128）")
    parser.add_argument("--preview", type=int, default=512, help="预览图尺寸（默认 512）")
    parser.add_argument("--output", help="像素图输出路径（默认输入同目录加 _pixel 后缀）")

    args = parser.parse_args()

    try:
        result = portrait_to_pixel(
            input_path=args.input,
            size=args.size,
            preview_size=args.preview,
            output_path=args.output,
        )
        print(f"\n完成：{result['pixel_size']} 像素图 + {result['preview_size']} 预览图")
    except Exception as e:
        print(f"✗ 失败: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
