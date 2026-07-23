"""
批量 BiRefNet 抠图：行走精灵图 raw → cutout

输入：public/game/sprites/players/raw/player_set{1-5}_{front,back,side}.png
输出：public/game/sprites/players/cutout/player_set{1-5}_{front,back,side}.png
"""

import json
import urllib.request
import urllib.parse
import time
import os
import shutil
import sys
from pathlib import Path

COMFYUI_URL = "http://127.0.0.1:8188"
COMFYUI_INPUT_DIR = Path("E:/ai/ComfyUI-aki(1)/ComfyUI-aki-v3/ComfyUI/input")
RAW_DIR = Path("public/game/sprites/players/raw")
CUTOUT_DIR = Path("public/game/sprites/players/cutout")


def build_cutout_prompt(image_name):
    return {
        "1": {"class_type": "LoadImage", "inputs": {"image": image_name}},
        "2": {"class_type": "BiRefNetRMBG", "inputs": {
            "image": ["1", 0], "model": "BiRefNet-portrait",
            "mask_blur": 0, "mask_offset": 0, "invert_output": False,
            "refine_foreground": False, "background": "Alpha", "background_color": "#222222",
        }},
        "3": {"class_type": "SaveImage", "inputs": {
            "images": ["2", 0], "filename_prefix": "ND_walk_cutout",
        }},
    }


def submit_and_wait(prompt_data, client_id):
    payload = json.dumps({"prompt": prompt_data, "client_id": client_id}).encode("utf-8")
    req = urllib.request.Request(
        f"{COMFYUI_URL}/prompt", data=payload,
        headers={"Content-Type": "application/json"},
    )
    resp = urllib.request.urlopen(req)
    result = json.loads(resp.read())
    prompt_id = result["prompt_id"]

    start = time.time()
    while time.time() - start < 120:
        resp = urllib.request.urlopen(f"{COMFYUI_URL}/history/{prompt_id}")
        data = json.loads(resp.read())
        if prompt_id in data:
            return data[prompt_id]
        time.sleep(2)
        print(f"    等待... {int(time.time()-start)}s", end="\r")
    raise TimeoutError(f"超时: {prompt_id}")


def download_image(filename, subfolder, output_path):
    params = urllib.parse.urlencode({
        "filename": filename, "subfolder": subfolder, "type": "output",
    })
    url = f"{COMFYUI_URL}/view?{params}"
    resp = urllib.request.urlopen(url)
    data = resp.read()
    with open(output_path, "wb") as f:
        f.write(data)
    return len(data)


def main():
    CUTOUT_DIR.mkdir(parents=True, exist_ok=True)

    directions = ["front", "back", "side"]
    success = 0
    total = 5 * 3

    for set_num in range(1, 6):
        for direction in directions:
            src = RAW_DIR / f"player_set{set_num}_{direction}.png"
            if not src.exists():
                print(f"✗ {src.name} 不存在，跳过")
                continue

            out_path = CUTOUT_DIR / f"player_set{set_num}_{direction}.png"
            print(f"\n[{success+1}/{total}] set{set_num} {direction}")

            # 复制到 ComfyUI input
            fname = f"nd_walk_{set_num}_{direction}.png"
            shutil.copy2(src, COMFYUI_INPUT_DIR / fname)

            prompt_data = build_cutout_prompt(fname)

            try:
                history = submit_and_wait(prompt_data, f"walk-cutout-{set_num}-{direction}")
            except TimeoutError:
                print(f"  ✗ 超时")
                continue

            for nid, out in history.get("outputs", {}).items():
                if "images" in out:
                    for img in out["images"]:
                        size = download_image(
                            img["filename"], img.get("subfolder", ""), out_path
                        )
                        print(f"  ✓ {out_path.name} ({size} bytes)")
                        success += 1

    print(f"\n{'='*50}")
    print(f"抠图完成: {success}/{total}")

    if success == total:
        print("下一步: 运行 assemble_walk_spritesheet.py 合成精灵表")


if __name__ == "__main__":
    main()
