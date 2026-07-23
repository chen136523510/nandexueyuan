"""
批量抠图：立绘 → 透明背景角色图（用于精灵图生成）

用途：
    读取 public/game/portraits/player_set{1-5}.png（带渐变背景）
    通过 ComfyUI BiRefNet API 抠图
    输出到 public/game/portraits/cutout/player_set{1-5}.png（透明背景）

    精灵图脚本用透明版本生成；立绘本身保留渐变背景不变。

用法：
    python scripts/batch_cutout_api.py
"""

import json
import urllib.request
import urllib.parse
import time
import os
import sys
from pathlib import Path
from PIL import Image

COMFYUI_URL = "http://127.0.0.1:8188"
INPUT_DIR = Path("public/game/portraits")
CUTOUT_DIR = Path("public/game/portraits/cutout")
COMFYUI_INPUT_DIR = Path("E:/ai/ComfyUI-aki(1)/ComfyUI-aki-v3/ComfyUI/input")


def copy_to_comfyui_input(filepath):
    """直接复制图片到 ComfyUI input 目录（避免 multipart upload 问题）"""
    filename = f"nd_cutout_{os.path.basename(filepath)}"
    dest = COMFYUI_INPUT_DIR / filename
    import shutil
    shutil.copy2(filepath, dest)
    return filename


def build_cutout_prompt(image_name):
    """构建 BiRefNet 抠图 API 工作流"""
    return {
        "1": {
            "class_type": "LoadImage",
            "inputs": {"image": image_name},
        },
        "2": {
            "class_type": "BiRefNetRMBG",
            "inputs": {
                "image": ["1", 0],
                "model": "BiRefNet-portrait",
                "mask_blur": 0,
                "mask_offset": 0,
                "invert_output": False,
                "refine_foreground": False,
                "background": "Alpha",
                "background_color": "#222222",
            },
        },
        "3": {
            "class_type": "SaveImage",
            "inputs": {
                "images": ["2", 0],
                "filename_prefix": "ND_cutout",
            },
        },
    }


def submit_and_wait(prompt_data, client_id="cutout"):
    """提交并等待完成"""
    payload = json.dumps({"prompt": prompt_data, "client_id": client_id}).encode("utf-8")
    req = urllib.request.Request(
        f"{COMFYUI_URL}/prompt",
        data=payload,
        headers={"Content-Type": "application/json"},
    )
    resp = urllib.request.urlopen(req)
    result = json.loads(resp.read())
    prompt_id = result["prompt_id"]

    start = time.time()
    while time.time() - start < 120:
        url = f"{COMFYUI_URL}/history/{prompt_id}"
        resp = urllib.request.urlopen(url)
        data = json.loads(resp.read())
        if prompt_id in data:
            return data[prompt_id]
        time.sleep(2)
        elapsed = int(time.time() - start)
        print(f"    等待... {elapsed}s", end="\r")
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
    # 检查 ComfyUI
    try:
        resp = urllib.request.urlopen(f"{COMFYUI_URL}/system_stats")
        stats = json.loads(resp.read())
        print(f"ComfyUI 在线: v{stats['system']['comfyui_version']}")
    except Exception as e:
        print(f"✗ ComfyUI 未启动: {e}")
        sys.exit(1)

    CUTOUT_DIR.mkdir(parents=True, exist_ok=True)

    success = 0
    for i in range(1, 6):
        input_path = INPUT_DIR / f"player_set{i}.png"
        if not input_path.exists():
            print(f"\n✗ player_set{i}.png 不存在，跳过")
            continue

        print(f"\n{'='*40}")
        print(f"抠图 set{i}")

        # 复制到 ComfyUI input
        print(f"  复制 {input_path.name}...")
        image_name = copy_to_comfyui_input(str(input_path))

        # 构建 prompt
        prompt_data = build_cutout_prompt(image_name)

        # 提交并等待
        print(f"  提交 BiRefNet 抠图...")
        try:
            history = submit_and_wait(prompt_data, client_id=f"cutout-set{i}")
        except TimeoutError:
            print(f"  ✗ 超时")
            continue

        # 下载结果
        outputs = history.get("outputs", {})
        for node_id, output in outputs.items():
            if "images" in output:
                for img in output["images"]:
                    out_path = CUTOUT_DIR / f"player_set{i}.png"
                    size = download_image(
                        img["filename"],
                        img.get("subfolder", ""),
                        out_path,
                    )
                    print(f"  ✓ 透明角色: {out_path} ({size} bytes)")
                    success += 1

    print(f"\n{'='*40}")
    print(f"完成: {success}/5 套透明角色图")

    if success == 5:
        print("\n下一步: 运行 portrait_to_avatar.py + portrait_to_spritesheet.py")


if __name__ == "__main__":
    main()
