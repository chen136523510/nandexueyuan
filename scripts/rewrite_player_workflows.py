"""
重写 5 套玩家立绘 ComfyUI 工作流 (v3)

变更（v3）：
1. 半身胸像 → 全身照（从头到脚踝/脚）
2. 分辨率 1024×1024 → 832×1216（SDXL 竖版最佳比例）
3. 正面加 full body / standing / from head to toe
4. 负面去掉 full body/shoes/feet，加 cropped body / bust shot / upper body
"""

import json
import copy
from pathlib import Path

WORKFLOW_DIR = Path(".ai/comfyui-workflows/players")

# 5 套角色的提示词配置（v3 全身照版）
SETS = {
    1: {
        "positive": (
            "masterpiece, best quality, 1girl, solo, "
            "pink hair, twintails with black ribbons, blue eyes, "
            "school uniform, navy blazer, white collar shirt, red ribbon tie, yellow vest, "
            "pleated skirt, knee socks, brown shoes, "
            "full body, full body portrait, standing pose, from head to toe, shoes visible, "
            "character centered, looking at viewer, confident smile, "
            "gradient background, soft pink to lavender gradient, clean simple background, "
            "anime style, high detail, official art, genshin impact style character art, full body illustration"
        ),
        "negative": (
            "lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, "
            "cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, "
            "username, blurry, complex background, multiple characters, nsfw, nude, bikini, lingerie, "
            "child, loli, design sheet, character sheet, reference sheet, turnarounds, multiple views, "
            "japanese text, kanji, hiragana, katakana, chinese text, letters, numbers, words, "
            "speech bubble, text overlay, background scenery, environment, buildings, city, street, "
            "nature, landscape, detailed background, busy background, outdoor, indoor, furniture, "
            "cropped body, cut off, bust shot, upper body, chest up, close up, portrait composition, "
            "logo, game logo, genshin logo, hoyoverse, copyright symbol"
        ),
        "seed": 300001,
        "prefix": "ND_player_set1",
    },
    2: {
        "positive": (
            "masterpiece, best quality, 1girl, solo, "
            "long black hair, straight hair, purple eyes, "
            "miko outfit, white kosode, red hakama, traditional japanese clothing, wooden sandals, "
            "full body, full body portrait, standing pose, from head to toe, shoes visible, "
            "character centered, looking at viewer, gentle smile, "
            "gradient background, deep purple to light purple gradient, clean simple background, "
            "anime style, high detail, official art, genshin impact style character art, full body illustration"
        ),
        "negative": (
            "lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, "
            "cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, "
            "username, blurry, complex background, multiple characters, nsfw, nude, bikini, lingerie, "
            "child, loli, design sheet, character sheet, reference sheet, turnarounds, multiple views, "
            "japanese text, kanji, hiragana, katakana, chinese text, letters, numbers, words, "
            "speech bubble, text overlay, background scenery, environment, buildings, city, street, "
            "nature, landscape, detailed background, busy background, outdoor, indoor, furniture, "
            "cropped body, cut off, bust shot, upper body, chest up, close up, portrait composition, "
            "logo, game logo, genshin logo, hoyoverse, copyright symbol"
        ),
        "seed": 300002,
        "prefix": "ND_player_set2",
    },
    3: {
        "positive": (
            "masterpiece, best quality, 1girl, solo, "
            "blonde hair, high ponytail, blue eyes, "
            "knight armor, silver breastplate, white cape, golden accents, armored boots, "
            "full body, full body portrait, standing pose, from head to toe, shoes visible, "
            "character centered, looking at viewer, determined expression, "
            "gradient background, deep blue to light blue gradient, clean simple background, "
            "anime style, high detail, official art, genshin impact style character art, full body illustration"
        ),
        "negative": (
            "lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, "
            "cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, "
            "username, blurry, complex background, multiple characters, nsfw, nude, bikini, lingerie, "
            "child, loli, design sheet, character sheet, reference sheet, turnarounds, multiple views, "
            "japanese text, kanji, hiragana, katakana, chinese text, letters, numbers, words, "
            "speech bubble, text overlay, background scenery, environment, buildings, city, street, "
            "nature, landscape, detailed background, busy background, outdoor, indoor, furniture, "
            "cropped body, cut off, bust shot, upper body, chest up, close up, portrait composition, "
            "holding sword, weapon, "
            "logo, game logo, genshin logo, hoyoverse, copyright symbol"
        ),
        "seed": 300003,
        "prefix": "ND_player_set3",
    },
    4: {
        "positive": (
            "masterpiece, best quality, 1girl, solo, "
            "silver hair, short straight hair, blue eyes, "
            "mage robe, deep blue hooded robe, white star patterns, purple trim, gold lines, leather boots, "
            "full body, full body portrait, standing pose, from head to toe, shoes visible, "
            "character centered, looking at viewer, calm smile, "
            "gradient background, deep navy blue to midnight blue gradient, clean simple background, "
            "anime style, high detail, official art, genshin impact style character art, full body illustration"
        ),
        "negative": (
            "lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, "
            "cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, "
            "username, blurry, complex background, multiple characters, nsfw, nude, bikini, lingerie, "
            "child, loli, design sheet, character sheet, reference sheet, turnarounds, multiple views, "
            "japanese text, kanji, hiragana, katakana, chinese text, letters, numbers, words, "
            "speech bubble, text overlay, background scenery, environment, buildings, city, street, "
            "nature, landscape, detailed background, busy background, outdoor, indoor, furniture, "
            "cropped body, cut off, bust shot, upper body, chest up, close up, portrait composition, "
            "holding staff, weapon, magic circle, glowing orb, "
            "logo, game logo, genshin logo, hoyoverse, copyright symbol"
        ),
        "seed": 300004,
        "prefix": "ND_player_set4",
    },
    5: {
        "positive": (
            "masterpiece, best quality, 1girl, solo, "
            "blue hair, two long braids, blue eyes, "
            "cyberpunk outfit, black techwear, pink and blue neon lines, high collar, tech boots, "
            "full body, full body portrait, standing pose, from head to toe, shoes visible, "
            "character centered, looking at viewer, playful smile, "
            "gradient background, dark teal to cyan gradient, clean simple background, "
            "anime style, high detail, official art, genshin impact style character art, full body illustration"
        ),
        "negative": (
            "lowres, bad anatomy, bad hands, text, error, missing fingers, extra digit, fewer digits, "
            "cropped, worst quality, low quality, normal quality, jpeg artifacts, signature, watermark, "
            "username, blurry, complex background, multiple characters, nsfw, nude, bikini, lingerie, "
            "child, loli, design sheet, character sheet, reference sheet, turnarounds, multiple views, "
            "japanese text, kanji, hiragana, katakana, chinese text, letters, numbers, words, "
            "speech bubble, text overlay, background scenery, environment, buildings, city, street, "
            "nature, landscape, detailed background, busy background, outdoor, indoor, furniture, "
            "cropped body, cut off, bust shot, upper body, chest up, close up, portrait composition, "
            "logo, game logo, genshin logo, hoyoverse, copyright symbol"
        ),
        "seed": 300005,
        "prefix": "ND_player_set5",
    },
}


def main():
    # 加载 set1 作为模板
    with open(WORKFLOW_DIR / "portrait_player_set1.json", "r", encoding="utf-8") as f:
        template = json.load(f)

    print(f"模板节点数: {len(template['nodes'])}")

    # 修改 EmptyLatentImage 分辨率为 832x1216（SDXL 竖版最佳）
    for n in template["nodes"]:
        if n["type"] == "EmptyLatentImage":
            n["widgets_values"] = [832, 1216, 1]
            print(f"分辨率改为 832x1216（竖版全身）")

    # 为每套生成工作流
    for set_num, config in SETS.items():
        wf = copy.deepcopy(template)
        wf["id"] = f"ndexueyuan-wf-player-portrait-set{set_num}-v3"
        wf["revision"] = 3

        for n in wf["nodes"]:
            if n["id"] == 6:  # 正面提示词
                n["widgets_values"] = [config["positive"]]
            elif n["id"] == 7:  # 负面提示词
                n["widgets_values"] = [config["negative"]]
            elif n["id"] == 3:  # KSampler
                vals = n["widgets_values"]
                vals[0] = config["seed"]
                n["widgets_values"] = vals
            elif n["id"] == 9:  # SaveImage
                n["widgets_values"] = [config["prefix"]]

        out_path = WORKFLOW_DIR / f"portrait_player_set{set_num}.json"
        with open(out_path, "w", encoding="utf-8") as f:
            json.dump(wf, f, ensure_ascii=False, indent=2)

        print(f"set{set_num}: seed={config['seed']}  prefix={config['prefix']}")
        print(f"  positive: {config['positive'][:70]}...")

    print("\n全部完成!")


if __name__ == "__main__":
    main()
