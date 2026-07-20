"""
立绘 → 头像（HUD 用）转换脚本

用途：
    从透明背景的立绘（1024×1024 RGBA）截取头部区域，降采样为正方形头像。
    用于 GameView.vue 角色信息面板（char-avatar）的 40×40 头像。

算法：
    1. 读取 RGBA 立绘（保留 alpha）
    2. 自动裁切透明边（getbbox）得到角色紧致边界
    3. 取上 1/3（头部区域）作为头像源
    4. 在头部区域内找到 alpha 非零的最小正方形中心区域（避免长方形拉伸）
    5. nearest 降采样到目标尺寸（默认 40）
    6. 输出 PNG（保留 alpha 透明背景）

用法：
    python portrait_to_avatar.py <输入立绘> [--output <输出路径>] [--size 40]

示例：
    # 单张
    python portrait_to_avatar.py public/game/portraits/player_set1.png \\
        --output public/game/sprites/avatars/player_set1.png

    # 批量（5 套立绘）
    for i in 1 2 3 4 5; do
        python portrait_to_avatar.py public/game/portraits/player_set${i}.png \\
            --output public/game/sprites/avatars/player_set${i}.png --size 40
    done

注意：
    Python 用 ComfyUI 整合包自带的：
    E:/ai/ComfyUI-aki(1)/ComfyUI-aki-v3/python/python.exe
"""

import argparse
import os
import sys
from pathlib import Path

from PIL import Image


def portrait_to_avatar(
    input_path: str,
    output_path: str = None,
    size: int = 40,
    head_ratio: float = 0.35,
) -> dict:
    """立绘 → 头像 PNG（透明背景）。

    Args:
        input_path: 输入立绘路径（RGBA 透明 PNG，1024×1024）
        output_path: 头像输出路径；不指定则与输入同目录加 _avatar 后缀
        size: 头像目标尺寸（正方形边长，HUD 默认 40）
        head_ratio: 头部占整个角色高度的比例（默认 0.35，上 35%）

    Returns:
        dict: 包含 avatar_path 和 size
    """
    input_path = Path(input_path)
    if not input_path.exists():
        raise FileNotFoundError(f"输入文件不存在: {input_path}")

    # 1. 读取立绘
    img = Image.open(input_path)
    if img.mode != "RGBA":
        print(f"⚠️  输入图模式是 {img.mode}，转换为 RGBA")
        img = img.convert("RGBA")

    print(f"输入: {input_path.name}  原始尺寸: {img.size[0]}×{img.size[1]}")

    # 2. 裁切透明边（拿到角色紧致 bbox）
    bbox = img.getbbox()
    if not bbox:
        raise ValueError("图片全透明，无法定位角色")
    img_cropped = img.crop(bbox)
    cw, ch = img_cropped.size
    print(f"裁切透明边: bbox={bbox}  紧致尺寸: {cw}×{ch}")

    # 3. 取上 head_ratio 比例（头部区域）
    head_h = int(ch * head_ratio)
    head_box = (0, 0, cw, head_h)
    head_img = img_cropped.crop(head_box)
    print(f"头部区域: {head_box[2]}×{head_box[3]}（上 {head_ratio*100:.0f}%）")

    # 4. 在头部区域内找最小非透明正方形（居中裁切）
    head_bbox = head_img.getbbox()
    if not head_bbox:
        # 极端情况：头部区域完全透明，回退到整张图
        print("⚠️  头部区域全透明，回退使用整张立绘降采样")
        head_img = img_cropped
        head_bbox = img_cropped.getbbox()

    hb_x1, hb_y1, hb_x2, hb_y2 = head_bbox
    hb_w = hb_x2 - hb_x1
    hb_h = hb_y2 - hb_y1
    # 取较短边作正方形边长，居中
    square_side = min(hb_w, hb_h)
    center_x = (hb_x1 + hb_x2) // 2
    center_y = (hb_y1 + hb_y2) // 2
    sq_x1 = max(0, center_x - square_side // 2)
    sq_y1 = max(0, center_y - square_side // 2)
    sq_x2 = sq_x1 + square_side
    sq_y2 = sq_y1 + square_side
    square_img = head_img.crop((sq_x1, sq_y1, sq_x2, sq_y2))
    print(f"正方形裁切: {square_side}×{square_side}（中心 {center_x},{center_y}）")

    # 5. nearest 降采样到目标尺寸（保留锐利边缘 + alpha）
    avatar = square_img.resize((size, size), Image.NEAREST)
    print(f"降采样: {square_side}×{square_side} → {size}×{size}")

    # 6. 输出路径
    if output_path is None:
        output_path = input_path.parent / f"{input_path.stem}_avatar{input_path.suffix}"
    else:
        output_path = Path(output_path)
        output_path.parent.mkdir(parents=True, exist_ok=True)

    avatar.save(output_path)
    print(f"✓ 头像: {output_path}  ({os.path.getsize(output_path)} bytes)")

    return {"avatar_path": str(output_path), "size": (size, size)}


def main():
    parser = argparse.ArgumentParser(
        description="立绘 → 头像（HUD 用，从立绘截取头部降采样）",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
示例:
  %(prog)s public/game/portraits/player_set1.png --output public/game/sprites/avatars/player_set1.png
  %(prog)s input.png --size 64
        """,
    )
    parser.add_argument("input", help="输入立绘路径（RGBA 透明 PNG）")
    parser.add_argument("--output", help="头像输出路径（默认输入同目录加 _avatar 后缀）")
    parser.add_argument("--size", type=int, default=40, help="头像尺寸（默认 40，匹配 HUD）")
    parser.add_argument("--head-ratio", type=float, default=0.35, help="头部占立绘高度比例（默认 0.35）")

    args = parser.parse_args()

    try:
        result = portrait_to_avatar(
            input_path=args.input,
            output_path=args.output,
            size=args.size,
            head_ratio=args.head_ratio,
        )
        print(f"\n完成：{result['size']} 头像")
    except Exception as e:
        print(f"✗ 失败: {e}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
