#!/usr/bin/env bash
# ComfyUI 模型下载脚本（玩家精灵四方向行走动画工作流用）
#
# 用途：下载 SDXL Base + Pixel-Art-XL LoRA + Control-LoRA OpenPose SDXL
# 黑机无法直连 HuggingFace/GitHub，统一走 hf-mirror.com 镜像
#
# 用法：
#   bash scripts/download_models.sh
#
# 验证：下载完成后 ls 检查文件大小
#
# 注意：本脚本只在黑机执行，下载到 ComfyUI 模型目录
#       ComfyUI 实际路径：E:/ai/ComfyUI-aki(1)/ComfyUI-aki-v3/ComfyUI/

set -e  # 任一命令失败立即退出

# ComfyUI 模型根目录（黑机实际路径）
COMFYUI_ROOT="E:/ai/ComfyUI-aki(1)/ComfyUI-aki-v3/ComfyUI"
CKPT_DIR="${COMFYUI_ROOT}/models/checkpoints"
LORA_DIR="${COMFYUI_ROOT}/models/loras"
CTRL_DIR="${COMFYUI_ROOT}/models/controlnet"

# hf-mirror 镜像根
HF_MIRROR="https://hf-mirror.com"

echo "=========================================="
echo " ComfyUI 模型下载脚本（玩家精灵工作流用）"
echo "=========================================="
echo "ComfyUI 根目录: ${COMFYUI_ROOT}"
echo ""

# 检查目录存在
mkdir -p "${CKPT_DIR}" "${LORA_DIR}" "${CTRL_DIR}"

# --- 模型 1: SDXL 1.0 Base ---
echo "[1/3] 下载 SDXL 1.0 Base (~6.5GB) ..."
echo "  来源: ${HF_MIRROR}/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/sd_xl_base_1.0.safetensors"
SDXL_FILE="${CKPT_DIR}/sd_xl_base_1.0.safetensors"
if [ -f "${SDXL_FILE}" ]; then
    echo "  ✓ 已存在，跳过: ${SDXL_FILE}"
else
    curl -L -o "${SDXL_FILE}" \
        "${HF_MIRROR}/stabilityai/stable-diffusion-xl-base-1.0/resolve/main/sd_xl_base_1.0.safetensors"
    echo "  ✓ 下载完成: ${SDXL_FILE}"
fi
echo ""

# --- 模型 2: Pixel-Art-XL LoRA ---
# 注意：Civitai 需要登录，hf-mirror 可能没有。改用 liblib 国内站或手动下载
# 尝试 hf-mirror 上的镜像，失败则提示用户手动下载
echo "[2/3] 下载 Pixel-Art-XL LoRA (~100MB) ..."
PIXEL_LORA_FILE="${LORA_DIR}/pixel-art-xl.safetensors"
if [ -f "${PIXEL_LORA_FILE}" ]; then
    echo "  ✓ 已存在，跳过: ${PIXEL_LORA_FILE}"
else
    # 尝试 hf-mirror 上的 Pixel-Art-XL 镜像
    # 如果该 URL 失效，请手动到 liblib 或吹牛 TusiArt 下载后放入 ${LORA_DIR}
    PIXEL_URL="${HF_MIRROR}/pcpixel/pixel-art-xl/resolve/main/pixel-art-xl.safetensors"
    echo "  尝试: ${PIXEL_URL}"
    if curl -L --fail -o "${PIXEL_LORA_FILE}" "${PIXEL_URL}" 2>/dev/null; then
        echo "  ✓ 下载完成: ${PIXEL_LORA_FILE}"
    else
        echo "  ⚠️  hf-mirror 镜像不可用，请手动下载 Pixel-Art-XL LoRA："
        echo "     1. 国内站：吹牛 TusiArt (https://www.tusiatohui.com) 或 liblib (https://www.liblib.art)"
        echo "     2. 搜索 'Pixel-Art-XL' 或 '像素风 SDXL LoRA'"
        echo "     3. 下载后重命名为 pixel-art-xl.safetensors"
        echo "     4. 放到 ${LORA_DIR}/"
        rm -f "${PIXEL_LORA_FILE}"  # 清理空文件
    fi
fi
echo ""

# --- 模型 3: Control-LoRA OpenPose SDXL ---
echo "[3/3] 下载 Control-LoRA OpenPose SDXL (~1.5GB) ..."
echo "  来源: ${HF_MIRROR}/stabilityai/control-lora/resolve/main/control-LoRAs-rank128/control-lora-rank128-openpose-sdxl.safetensors"
CTRL_FILE="${CTRL_DIR}/control-lora-rank128-openpose-sdxl.safetensors"
if [ -f "${CTRL_FILE}" ]; then
    echo "  ✓ 已存在，跳过: ${CTRL_FILE}"
else
    curl -L -o "${CTRL_FILE}" \
        "${HF_MIRROR}/stabilityai/control-lora/resolve/main/control-LoRAs-rank128/control-lora-rank128-openpose-sdxl.safetensors"
    echo "  ✓ 下载完成: ${CTRL_FILE}"
fi
echo ""

# --- 验证 ---
echo "=========================================="
echo " 下载完成，验证文件："
echo "=========================================="
ls -lh "${SDXL_FILE}" 2>/dev/null || echo "  ✗ SDXL Base 缺失"
ls -lh "${PIXEL_LORA_FILE}" 2>/dev/null || echo "  ✗ Pixel-Art-XL LoRA 缺失（请手动下载）"
ls -lh "${CTRL_FILE}" 2>/dev/null || echo "  ✗ Control-LoRA OpenPose 缺失"
echo ""
echo "下一步："
echo "  1. 启动 ComfyUI（运行启动器）"
echo "  2. 在 ComfyUI 中加载 .ai/comfyui-workflows/players/spritesheet_player_set{1..5}_*.json"
echo "  3. 调试 OpenPose 工作流，验证角色一致性"
