"""
合成行走精灵表：cutout 透明 PNG → 256×256 4×4 spritesheet

输入（每套 3 张透明 PNG）：
    public/game/sprites/players/cutout/player_set{N}_front.png
    public/game/sprites/players/cutout/player_set{N}_back.png
    public/game/sprites/players/cutout/player_set{N}_side.png

输出（256×256 spritesheet）：
    public/game/sprites/players/player_set{N}_walk.png

精灵表布局（4 行 × 4 列 = 16 帧，每帧 64×64）：
    行 0 down:  front 图 × [stand, walkL, stand, walkR]
    行 1 up:    back 图  × [stand, walkL, stand, walkR]
    行 2 left:  side 图  × [stand, walkL, stand, walkR]
    行 3 right: side 翻转 × [stand, walkL, stand, walkR]

side 朝向自动检测：AI 生成的 side 图朝左朝右都有可能，
脚本自动检测后，保证 left 行角色面朝左、right 行面朝右。

行走动画（4 帧）：
    帧 0 (stand): 原图
    帧 1 (walkL): 整体上移 2px + 左偏 1px
    帧 2 (stand): 原图
    帧 3 (walkR): 整体上移 2px + 右偏 1px
"""

import os
import sys
from pathlib import Path
from PIL import Image

TILE = 64
GRID = 4
SHEET = TILE * GRID  # 256

CUTOUT_DIR = Path("public/game/sprites/players/cutout")
OUTPUT_DIR = Path("public/game/sprites/players")

# 行映射：spritesheet 行 → 方向 → 源图
# left 行需要角色面朝左，right 行需要角色面朝右
# side 图朝向通过 detect_facing() 自动检测，翻转 flip 标志在 assemble_set 中动态计算
ROW_CONFIG = [
    "front",  # 行 0 = down = front
    "back",   # 行 1 = up = back
    "left",   # 行 2 = left
    "right",  # 行 3 = right
]

# 目标角色高度（留 4px 上下边距）
TARGET_CHAR_H = TILE - 4  # 60px


def detect_facing(img):
    """检测 side 图的角色朝向（左或右）

    通过比较左半和右半的不透明像素分布来判断。
    侧面角色：面朝方向有前伸的肢体/面部 → 面朝侧像素更多。

    Returns:
        True = 面朝右, False = 面朝左
    """
    import numpy as np
    arr = np.array(img.convert("RGBA"))
    alpha = arr[:, :, 3]
    mask = alpha >= 100
    w = mask.shape[1]
    mid = w // 2
    left_count = mask[:, :mid].sum()
    right_count = mask[:, mid:].sum()
    if left_count + right_count == 0:
        return False
    # 右半像素更多 → 面朝右
    return right_count > left_count * 1.02


def load_and_crop(img_path):
    """加载透明 PNG → 裁切透明边 → 清理杂边 → 返回 PIL Image"""
    img = Image.open(img_path)
    if img.mode != "RGBA":
        img = img.convert("RGBA")

    # 裁切透明边
    bbox = img.getbbox()
    if bbox:
        img = img.crop(bbox)

    # 清理边缘杂边（BiRefNet 有时留半透明残影）
    w, h = img.size
    if w > 8 and h > 8:
        img = img.crop((2, 2, w - 2, h - 2))
        bbox2 = img.getbbox()
        if bbox2:
            img = img.crop(bbox2)

    return img


def prepare_tile(img, flip=False, target_h=TARGET_CHAR_H):
    """已裁切的透明图 → 按高度缩放到 target_h → 底部居中放到 64×64

    每张图独立按自己的高度缩放，确保精灵表里角色高度统一。
    宽度自然小于高度（人形角色高>宽），不会溢出。

    Args:
        img: 已裁切透明边的 RGBA Image
        flip: 是否水平翻转
        target_h: 目标高度（默认 60px）
    """
    if flip:
        img = img.transpose(Image.FLIP_LEFT_RIGHT)

    w, h = img.size
    scale = target_h / h
    new_w = max(1, int(w * scale))
    new_h = target_h

    # 保险：如果宽度超出 TILE，按宽度缩
    if new_w > TILE:
        ratio = TILE / new_w
        new_w = TILE
        new_h = max(1, int(new_h * ratio))

    img = img.resize((new_w, new_h), Image.LANCZOS)

    # 底部居中放到 64×64 透明画布上（脚底对齐）
    canvas = Image.new("RGBA", (TILE, TILE), (0, 0, 0, 0))
    offset_x = (TILE - new_w) // 2
    offset_y = TILE - new_h  # 底部对齐
    canvas.paste(img, (offset_x, offset_y), img)

    return canvas


def make_walk_frame(base_tile, frame_idx):
    """从 stand 帧生成行走帧（stand/walkL/stand/walkR）"""
    frame = Image.new("RGBA", (TILE, TILE), (0, 0, 0, 0))
    if frame_idx == 0 or frame_idx == 2:
        # 站立
        frame.paste(base_tile, (0, 0), base_tile)
    elif frame_idx == 1:
        # 迈左脚：上移 2px，左偏 1px
        frame.paste(base_tile, (-1, -2), base_tile)
    elif frame_idx == 3:
        # 迈右脚：上移 2px，右偏 1px
        frame.paste(base_tile, (1, -2), base_tile)
    return frame


def assemble_set(set_num):
    """合成一套角色的 256×256 spritesheet

    side 朝向自动检测：
      - AI 生成的 side 图可能朝左或朝右，不确定
      - 检测后，确保 left 行角色面朝左、right 行面朝右
      - 如果 side 图原本朝右，left 行就翻转，right 行用原图
      - 如果 side 图原本朝左，left 行用原图，right 行翻转
    """
    # 1. 加载并裁切源图
    front_img = None
    back_img = None
    side_img = None

    for direction in ["front", "back", "side"]:
        src_path = CUTOUT_DIR / f"player_set{set_num}_{direction}.png"
        if not src_path.exists():
            print(f"  ⚠ 缺少 {src_path.name}")
            continue
        img = load_and_crop(src_path)
        if direction == "front":
            front_img = img
        elif direction == "back":
            back_img = img
        else:
            side_img = img

    if not front_img and not back_img and not side_img:
        print(f"  ✗ set{set_num} 无源图，跳过")
        return None

    # 2. 检测 side 朝向
    side_faces_right = False
    if side_img:
        side_faces_right = detect_facing(side_img)
        print(f"  side 朝向检测: {'→ 右' if side_faces_right else '← 左'}")

    # 每张图独立按高度缩放到 60px，保证精灵表里角色高度统一、脚底对齐

    # 3. 合成精灵表
    sheet = Image.new("RGBA", (SHEET, SHEET), (0, 0, 0, 0))

    for row_idx, direction in enumerate(ROW_CONFIG):
        # 确定源图和是否翻转
        if direction == "front":
            src = front_img
            flip = False
        elif direction == "back":
            src = back_img
            flip = False
        elif direction == "left":
            src = side_img
            # left 行需要角色面朝左
            # 如果 side 图原本朝右，需要翻转；朝左则不翻
            flip = side_faces_right
        elif direction == "right":
            src = side_img
            # right 行需要角色面朝右
            flip = not side_faces_right

        if src is None:
            continue

        base_tile = prepare_tile(src, flip=flip)

        for col_idx in range(4):
            frame = make_walk_frame(base_tile, col_idx)
            sheet.paste(frame, (col_idx * TILE, row_idx * TILE))

    out_path = OUTPUT_DIR / f"player_set{set_num}_walk.png"
    sheet.save(out_path)
    print(f"  ✓ {out_path.name} ({os.path.getsize(out_path)} bytes)")
    return out_path


def main():
    print("=" * 50)
    print("合成行走精灵表（256×256，4×4 网格）")
    print("=" * 50)

    for set_num in range(1, 6):
        print(f"\nset{set_num}:")
        assemble_set(set_num)

    print(f"\n{'='*50}")
    print("全部完成！精灵表可用于游戏（PreloadScene frameWidth=64 兼容）")


if __name__ == "__main__":
    main()
