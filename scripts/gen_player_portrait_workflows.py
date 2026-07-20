"""
玩家立绘工作流 JSON 批量生成脚本

用途：
    基于 .ai/comfyui-workflows/npc/portrait_illustrious.json 模板，
    生成 5 套玩家立绘工作流 JSON（鸣潮/原神风少女，1024×1024）。

5 套人设（差异化）：
    set1: 粉色双马尾 + 学院制服
    set2: 黑色长直 + 巫女服
    set3: 金色单马尾 + 骑士轻甲
    set4: 银色短发 + 法师长袍
    set5: 蓝色双长辫（金克丝风）+ 机甲服

模板改造点：
    1. 删除 LoraLoader 节点（mygo 是千早爱音专用，5 套要去差异化）
    2. CheckpointLoader MODEL/CLIP 直连 KSampler/CLIPTextEncode
    3. 每套 prompt 不同（Booru Tags + 鸣潮/原神风关键词）
    4. 每套 seed 不同（100001~100005），保证角色差异
    5. SaveImage 前缀改为 ND_player_portrait_set{N}_raw / _cutout

用法：
    python scripts/gen_player_portrait_workflows.py

输出：
    .ai/comfyui-workflows/players/portrait_player_set{1..5}.json

注意：
    Python 用 ComfyUI 整合包自带的：
    E:/ai/ComfyUI-aki(1)/ComfyUI-aki-v3/python/python.exe
"""

import json
import shutil
from pathlib import Path

# === 项目根目录 ===
ROOT = Path(__file__).parent.parent
TEMPLATE_PATH = ROOT / ".ai" / "comfyui-workflows" / "npc" / "portrait_illustrious.json"
OUTPUT_DIR = ROOT / ".ai" / "comfyui-workflows" / "players"

# === 5 套人设 ===
# 鸣潮/原神风关键词：dynamic pose + cinematic lighting + detailed background + character design sheet + official art
SETS = [
    {
        "id": 1,
        "seed": 100001,
        "prompt": (
            "masterpiece, best quality, 1girl, solo, pink hair, twintails, school uniform, "
            "blazer, pleated skirt, knee socks, ribbon, dynamic pose, looking at viewer, "
            "confident smile, cinematic lighting, detailed background, city street at sunset, "
            "character design sheet, full body, anime style, high detail, official art"
        ),
    },
    {
        "id": 2,
        "seed": 100002,
        "prompt": (
            "masterpiece, best quality, 1girl, solo, black hair, long straight hair, miko, "
            "shrine maiden, red hakama, white kosode, traditional japanese clothes, "
            "dynamic pose, looking at viewer, gentle smile, cinematic lighting, "
            "detailed background, shinto shrine, cherry blossoms, character design sheet, "
            "full body, anime style, high detail, official art"
        ),
    },
    {
        "id": 3,
        "seed": 100003,
        "prompt": (
            "masterpiece, best quality, 1girl, solo, blonde hair, ponytail, knight armor, "
            "breastplate, white cape, holding sword, metal gauntlets, dynamic pose, "
            "looking at viewer, determined expression, cinematic lighting, detailed background, "
            "castle courtyard, battlefield, character design sheet, full body, anime style, "
            "high detail, official art"
        ),
    },
    {
        "id": 4,
        "seed": 100004,
        "prompt": (
            "masterpiece, best quality, 1girl, solo, silver hair, short hair, mage robe, "
            "wide sleeves, star patterns, hood down, holding glowing staff, magic circle, "
            "dynamic pose, looking at viewer, mysterious smile, cinematic lighting, "
            "detailed background, magic tower, starry night, character design sheet, "
            "full body, anime style, high detail, official art"
        ),
    },
    {
        "id": 5,
        "seed": 100005,
        "prompt": (
            "masterpiece, best quality, 1girl, solo, blue hair, two long braids, jinx style braids, "
            "long twin braids, cyberpunk outfit, mechanical arms, glowing neon lines, techwear, "
            "futuristic, dynamic pose, looking at viewer, mischievous smile, cinematic lighting, "
            "detailed background, neon city, cyberpunk, character design sheet, full body, "
            "anime style, high detail, official art"
        ),
    },
]

# 通用负向 prompt（5 套共用）
NEGATIVE_PROMPT = (
    "lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, "
    "fewer digits, cropped, worst quality, low quality, normal quality, jpeg artifacts, "
    "signature, watermark, username, blurry, complex background, multiple characters, "
    "nsfw, nude, bikini, lingerie, child, loli"
)


def remove_lora_loader(wf: dict) -> dict:
    """删除 LoraLoader 节点，CheckpointLoader 直连 KSampler/CLIPTextEncode。

    原模板：
        CheckpointLoader --MODEL/CLIP--> LoraLoader --MODEL/CLIP--> KSampler/CLIPTextEncode
    改造后：
        CheckpointLoader --MODEL/CLIP--> KSampler/CLIPTextEncode
    """
    # 1. 删除 LoraLoader 节点（id=12）
    wf["nodes"] = [n for n in wf["nodes"] if n["id"] != 12]

    # 2. 删除 LoRA 相关 links: 1, 3, 5, 13, 14
    #    新增直连 links: 1, 3, 5（复用原 link_id，target 端不变，source 端改为 CheckpointLoader id=4）
    new_links = []
    for link in wf["links"]:
        link_id = link[0]
        if link_id in [1, 3, 5, 13, 14]:
            continue  # 删除 LoRA 相关
        new_links.append(link)

    # 新增直连（link_id 复用，避免乱编号）
    # [link_id, source_node_id, source_slot, target_node_id, target_slot, type]
    new_links.append([1, 4, 0, 3, 0, "MODEL"])  # CheckpointLoader MODEL -> KSampler
    new_links.append([3, 4, 1, 6, 0, "CLIP"])   # CheckpointLoader CLIP -> 正向 CLIPTextEncode
    new_links.append([5, 4, 1, 7, 0, "CLIP"])   # CheckpointLoader CLIP -> 负向 CLIPTextEncode
    wf["links"] = new_links

    # 3. 更新 CheckpointLoader (id=4) 的 outputs links 数组
    for n in wf["nodes"]:
        if n["id"] == 4:
            n["outputs"][0]["links"] = [1]    # MODEL -> KSampler
            n["outputs"][1]["links"] = [3, 5] # CLIP -> 正/负向 CLIPTextEncode
            # VAE 不变（links=[8]）

    return wf


def apply_set_config(wf: dict, s: dict) -> dict:
    """应用每套人设的配置（seed/prompt/SaveImage 前缀/workflow id）"""
    # 1. workflow id
    wf["id"] = f"ndexueyuan-wf-player-portrait-set{s['id']}-v1"

    # 2. 遍历节点修改
    for n in wf["nodes"]:
        # KSampler (id=3): 改 seed（widgets_values[0]）
        if n["type"] == "KSampler":
            n["widgets_values"][0] = s["seed"]

        # CLIPTextEncode 正向 (id=6): 改 prompt
        if n["id"] == 6:
            n["widgets_values"][0] = s["prompt"]

        # CLIPTextEncode 负向 (id=7): 改通用负向
        if n["id"] == 7:
            n["widgets_values"][0] = NEGATIVE_PROMPT

        # SaveImage raw (id=9): 改前缀
        if n["id"] == 9:
            n["widgets_values"][0] = f"ND_player_portrait_set{s['id']}_raw"

        # SaveImage cutout (id=11): 改前缀
        if n["id"] == 11:
            n["widgets_values"][0] = f"ND_player_portrait_set{s['id']}_cutout"

    return wf


def main():
    print("=" * 60)
    print(" 玩家立绘工作流 JSON 批量生成")
    print("=" * 60)
    print(f"模板: {TEMPLATE_PATH}")
    print(f"输出: {OUTPUT_DIR}")
    print()

    # 加载模板
    if not TEMPLATE_PATH.exists():
        raise FileNotFoundError(f"模板文件不存在: {TEMPLATE_PATH}")
    with open(TEMPLATE_PATH, "r", encoding="utf-8") as f:
        template = json.load(f)
    print(f"✓ 模板加载成功（{len(template['nodes'])} 个节点，{len(template['links'])} 条连线）")

    # 创建输出目录
    OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

    # 生成 5 套
    for s in SETS:
        # 深拷贝模板
        wf = json.loads(json.dumps(template))

        # 1. 删除 LoRA
        wf = remove_lora_loader(wf)

        # 2. 应用本套配置
        wf = apply_set_config(wf, s)

        # 3. 保存
        out_path = OUTPUT_DIR / f"portrait_player_set{s['id']}.json"
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(wf, f, ensure_ascii=False)

        print(f"  ✓ set{s['id']}: {out_path.name}  seed={s['seed']}  ({len(wf['nodes'])} 节点, {len(wf['links'])} 连线)")

    print()
    print("=" * 60)
    print(f" 完成！共生成 5 套立绘工作流 JSON")
    print("=" * 60)
    print()
    print("下一步：")
    print("  1. 启动 ComfyUI（秋叶整合包启动器）")
    print("  2. 在 ComfyUI 中加载 .ai/comfyui-workflows/players/portrait_player_set{1..5}.json")
    print("  3. 检查节点是否全部识别（无红色缺失节点）")
    print("  4. 逐个运行，把输出的 ND_player_portrait_set{N}_cutout 文件")
    print("     从 ComfyUI output 目录复制到 public/game/portraits/player_set{N}.png")
    print("  5. 用 scripts/portrait_to_avatar.py 生成 5 张 40×40 头像")


if __name__ == "__main__":
    main()
