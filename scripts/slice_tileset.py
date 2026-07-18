"""
Tiny Dungeon tilemap 批量切片脚本

用途：
    从 tiny-dungeon/Tilemap/tilemap_packed.png（16×16 单瓦片）
    切出塔楼改造需要的瓦片，放大 2 倍到 32×32，输出到 public/game/tilesets/sliced/

用法：
    python scripts/slice_tileset.py

切片清单（来自 Tiny Dungeon 索引图分析）：
    - 石墙 3 色调（深/棕/浅）+ 变体
    - 木地板 6 变体
    - 木门 3 段、楼梯上下、火把、窗户
    - 家具：桌椅、床、宝箱、书架、木桶、骷髅
"""

import os
from PIL import Image

# 路径
SRC = 'G:/UGit/nandexueyuan/.ai/asset-staging/tiny-dungeon/Tilemap/tilemap_packed.png'
OUT = 'G:/UGit/nandexueyuan/public/game/tilesets/sliced'

# Tiny Dungeon 原始瓦片尺寸 16×16，放大到 32×32（×2）
SRC_TS = 16
DST_TS = 32

# 切片清单：(输出名, col, row)
SLICES = [
    # 石墙 - 深蓝灰（底层）
    ('wall_dark_1',    9, 0),
    ('wall_dark_2',   10, 0),
    ('wall_dark_3',   11, 0),
    # 石墙 - 棕砖（中层）
    ('wall_brown_1',   0, 0),
    ('wall_brown_2',   1, 0),
    ('wall_brown_3',   3, 0),
    # 石墙 - 浅灰（顶层）
    ('wall_light_1',   6, 0),
    ('wall_light_2',   7, 0),
    # 木地板 6 变体
    ('floor_wood_1',   0, 4),
    ('floor_wood_2',   1, 4),
    ('floor_wood_3',   2, 4),
    ('floor_wood_4',   3, 4),
    ('floor_wood_5',   4, 4),
    ('floor_wood_6',   5, 4),
    # 门（3 段拼接）
    ('door_left',      9, 2),
    ('door_mid',      10, 2),
    ('door_right',    11, 2),
    # 楼梯
    ('stair_up',      10, 5),
    ('stair_down',     9, 5),
    # 火把 + 窗户
    ('torch_wall',     0, 6),
    ('torch_small',    1, 6),
    ('window',         2, 6),
    # 家具：桌椅（2x2）
    ('table_tl',       6, 5),
    ('table_tr',       7, 5),
    ('table_bl',       8, 5),
    # 家具：床（2x1）
    ('bed_head',       3, 7),
    ('bed_foot',       4, 7),
    # 家具：宝箱
    ('chest_closed',   3, 6),
    ('chest_open',     5, 6),
    # 家具：书架/柜台
    ('shelf_1',        5, 8),
    ('shelf_2',        6, 8),
    ('counter',        7, 8),
    # 装饰
    ('barrel',         7, 6),
    ('skull',          3, 10),
    # 地板花纹（顶层用）
    ('floor_pattern_1', 0, 5),
    ('floor_pattern_2', 1, 5),
]


def main():
    os.makedirs(OUT, exist_ok=True)
    src = Image.open(SRC).convert('RGBA')
    print(f'源 tilemap: {src.size}')

    count = 0
    for name, col, row in SLICES:
        x = col * SRC_TS
        y = row * SRC_TS
        tile = src.crop((x, y, x + SRC_TS, y + SRC_TS))
        # 放大 2 倍（nearest 保留像素锐边）
        tile = tile.resize((DST_TS, DST_TS), Image.NEAREST)
        out_path = os.path.join(OUT, f'{name}.png')
        tile.save(out_path)
        count += 1
        print(f'  {name:<20} (col={col}, row={row}) -> {out_path}')

    print(f'\n完成：切出 {count} 个瓦片（32×32）到 {OUT}')


if __name__ == '__main__':
    main()
