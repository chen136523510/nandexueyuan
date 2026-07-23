"""
通过 ComfyUI API 批量生成 5 套 × 3 方向 chibi 行走精灵图

策略：
    每套角色生成 3 张 512×512 chibi 风格站立图：
      - front  (正面，朝向镜头)        → spritesheet 行 0 (down)
      - back   (背面，背对镜头)        → spritesheet 行 1 (up)
      - side   (左侧脸，面向左边)      → spritesheet 行 2 (left) + 翻转行 3 (right)

    right 方向 = side 水平翻转，不单独生成。

    chibi 风格：大头小身，缩小到 64×64 后仍清晰。

输出：
    public/game/sprites/players/raw/player_set{1-5}_{front,back,side}.png
"""

import json
import urllib.request
import urllib.parse
import time
import os
import sys
from pathlib import Path

COMFYUI_URL = "http://127.0.0.1:8188"
MODEL = "Qpipi.com_waiIllustriousSDXL_v160.safetensors"
RAW_DIR = Path("public/game/sprites/players/raw")

# ── 5 套角色的特征词（跟立绘保持一致）──
CHARACTERS = {
    1: "1girl, pink hair, twintails with black ribbons, blue eyes, school uniform, navy blazer, white shirt, red ribbon tie, yellow vest, pleated skirt, knee socks, brown shoes",
    2: "1girl, long black hair, straight hair, purple eyes, miko outfit, white kosode, red hakama, traditional japanese clothing, wooden sandals",
    3: "1girl, blonde hair, high ponytail, blue eyes, knight armor, silver breastplate, white cape, golden accents, armored boots",
    4: "1girl, silver hair, short straight hair, blue eyes, mage robe, deep blue hooded robe, silver runes, purple trim, gold lines, leather boots",
    5: "1girl, blue hair, two long braids, blue eyes, cyborg body, mechanical joints, cybernetic arms, metal plating, pink and blue neon accents, tech boots",
}

# ── 3 方向的构图词 ──
DIRECTIONS = {
    "front": "standing pose, front view, facing the camera, looking at viewer, full body from head to toe",
    "back":  "standing pose, back view, facing away from camera, seen from behind, full body from head to toe",
    "side":  "standing pose, viewed completely from the side, 90 degree side angle, body facing left, profile view, only one person, full body from head to toe",
}

# 基础种子（每套 +1000，每方向 +0/+1/+2）
BASE_SEED = 400000

NEGATIVE = (
    "lowres, bad anatomy, bad hands, bad feet, missing legs, extra legs, "
    "text, error, cropped, worst quality, low quality, normal quality, "
    "jpeg artifacts, signature, watermark, username, blurry, "
    "complex background, multiple characters, two characters, split screen, comparison, "
    "design sheet, character sheet, reference sheet, turnarounds, multiple views, "
    "japanese text, chinese text, letters, numbers, "
    "speech bubble, background scenery, environment, buildings, city, street, "
    "nature, landscape, detailed background, busy background, outdoor, indoor"
)


def build_prompt(char_desc, direction_desc, seed, prefix):
    """构建 ComfyUI API prompt（7 节点 txt2img）"""
    positive = (
        f"masterpiece, best quality, chibi style, super deformed, sd character, "
        f"{char_desc}, {direction_desc}, "
        f"character centered, simple plain white background, "
        f"anime style, high detail, flat colors"
    )
    return {
        "4": {
            "class_type": "CheckpointLoaderSimple",
            "inputs": {"ckpt_name": MODEL},
        },
        "6": {
            "class_type": "CLIPTextEncode",
            "inputs": {"text": positive, "clip": ["4", 1]},
        },
        "7": {
            "class_type": "CLIPTextEncode",
            "inputs": {"text": NEGATIVE, "clip": ["4", 1]},
        },
        "5": {
            "class_type": "EmptyLatentImage",
            "inputs": {"width": 512, "height": 512, "batch_size": 1},
        },
        "3": {
            "class_type": "KSampler",
            "inputs": {
                "seed": seed,
                "steps": 25,
                "cfg": 6.0,
                "sampler_name": "dpmpp_2m",
                "scheduler": "karras",
                "denoise": 1.0,
                "model": ["4", 0],
                "positive": ["6", 0],
                "negative": ["7", 0],
                "latent_image": ["5", 0],
            },
        },
        "8": {
            "class_type": "VAEDecode",
            "inputs": {"samples": ["3", 0], "vae": ["4", 2]},
        },
        "9": {
            "class_type": "SaveImage",
            "inputs": {"images": ["8", 0], "filename_prefix": prefix},
        },
    }


def submit_and_wait(prompt_data, client_id):
    """提交 prompt 并等待完成，返回 history"""
    payload = json.dumps({"prompt": prompt_data, "client_id": client_id}).encode("utf-8")
    req = urllib.request.Request(
        f"{COMFYUI_URL}/prompt",
        data=payload,
        headers={"Content-Type": "application/json"},
    )
    resp = urllib.request.urlopen(req)
    result = json.loads(resp.read())
    if "prompt_id" not in result:
        raise RuntimeError(f"提交失败: {result}")
    prompt_id = result["prompt_id"]

    start = time.time()
    while time.time() - start < 120:
        url = f"{COMFYUI_URL}/history/{prompt_id}"
        resp = urllib.request.urlopen(url)
        data = json.loads(resp.read())
        if prompt_id in data:
            return data[prompt_id]

        # 检查是否有错误
        status_url = f"{COMFYUI_URL}/queue"
        time.sleep(2)
        elapsed = int(time.time() - start)
        print(f"      等待... {elapsed}s", end="\r")

    raise TimeoutError(f"超时: {prompt_id}")


def download_image(filename, subfolder, output_path):
    params = urllib.parse.urlencode({
        "filename": filename,
        "subfolder": subfolder,
        "type": "output",
    })
    url = f"{COMFYUI_URL}/view?{params}"
    resp = urllib.request.urlopen(url)
    data = resp.read()
    with open(output_path, "wb") as f:
        f.write(data)
    return len(data)


def main():
    force = "--force" in sys.argv or "-f" in sys.argv

    # 检查 ComfyUI
    try:
        resp = urllib.request.urlopen(f"{COMFYUI_URL}/system_stats")
        stats = json.loads(resp.read())
        print(f"ComfyUI 在线: v{stats['system']['comfyui_version']}")
        print(f"GPU: {stats['devices'][0]['name']}")
    except Exception as e:
        print(f"✗ ComfyUI 未启动: {e}")
        sys.exit(1)

    RAW_DIR.mkdir(parents=True, exist_ok=True)

    success = 0
    total = len(CHARACTERS) * len(DIRECTIONS)

    for set_num in range(1, 6):
        char_desc = CHARACTERS[set_num]
        for dir_idx, (dir_name, dir_desc) in enumerate(DIRECTIONS.items()):
            target = RAW_DIR / f"player_set{set_num}_{dir_name}.png"
            if target.exists() and not force:
                print(f"✓ player_set{set_num}_{dir_name}.png 已存在，跳过")
                success += 1
                continue

            seed = BASE_SEED + set_num * 1000 + dir_idx
            prefix = f"ND_walk_set{set_num}_{dir_name}"

            print(f"\n[{success+1}/{total}] set{set_num} {dir_name} (seed={seed})")

            prompt_data = build_prompt(char_desc, dir_desc, seed, prefix)

            try:
                history = submit_and_wait(prompt_data, client_id=f"walk-{set_num}-{dir_name}")
            except (TimeoutError, Exception) as e:
                print(f"  ✗ 失败: {e}")
                continue

            # 下载结果
            outputs = history.get("outputs", {})
            for node_id, output in outputs.items():
                if "images" in output:
                    for img in output["images"]:
                        size = download_image(
                            img["filename"],
                            img.get("subfolder", ""),
                            target,
                        )
                        print(f"  ✓ {target.name} ({size} bytes)")
                        success += 1

    print(f"\n{'='*50}")
    print(f"完成: {success}/{total} 张行走图")
    print(f"{'='*50}")

    if success == total:
        print("\n下一步: 运行 batch_cutout_walk.py 抠图")


if __name__ == "__main__":
    main()
