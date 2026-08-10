<script setup>
import { useDialogStore } from '../stores/dialog'
import { onMounted, onUnmounted } from 'vue'

const dialog = useDialogStore()

// ESC 键关闭（与原生弹窗行为一致：confirm 的 ESC=取消，alert 的 ESC=关闭）
function onKeydown(e) {
  if (e.key === 'Escape' && dialog.visible) {
    dialog.handleCancel()
  }
}
onMounted(() => window.addEventListener('keydown', onKeydown))
onUnmounted(() => window.removeEventListener('keydown', onKeydown))
</script>

<template>
  <Transition name="modal">
    <div
      v-if="dialog.visible"
      class="modal-overlay"
      role="dialog"
      aria-modal="true"
      :aria-label="dialog.title"
      @click.self="dialog.handleCancel"
    >
      <div class="modal-card gd-card" @click.stop>
        <div class="modal-header">
          <h2 class="modal-title">{{ dialog.title }}</h2>
        </div>
        <div class="gd-body">
          <p class="gd-message">{{ dialog.message }}</p>
        </div>
        <div class="gd-actions">
          <button
            v-if="dialog.type === 'confirm'"
            class="gd-btn gd-btn-cancel"
            aria-label="取消"
            data-testid="dialog-cancel-btn"
            @click="dialog.handleCancel"
          >
            {{ dialog.cancelText }}
          </button>
          <button
            class="gd-btn gd-btn-confirm"
            :class="{ 'gd-btn-danger': dialog.danger }"
            :aria-label="dialog.confirmText"
            :data-testid="dialog.type === 'alert' ? 'dialog-ok-btn' : 'dialog-confirm-btn'"
            @click="dialog.handleConfirm"
          >
            {{ dialog.confirmText }}
          </button>
        </div>
      </div>
    </div>
  </Transition>
</template>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.45);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: var(--md-z-modal);
}

.gd-card {
  background: var(--md-bg-card);
  border-radius: var(--md-radius-lg);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.16);
  max-width: 400px;
  width: 90vw;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  padding: 20px 24px 12px;
}

.modal-title {
  margin: 0;
  font-size: var(--md-fs-lg);
  color: var(--md-text);
  font-weight: 600;
}

.gd-body {
  padding: 0 24px 20px;
}

.gd-message {
  margin: 0;
  font-size: var(--md-fs-base);
  color: var(--md-text-secondary);
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-word;
}

.gd-actions {
  display: flex;
  justify-content: flex-end;
  gap: 12px;
  padding: 0 24px 20px;
}

.gd-btn {
  padding: 8px 20px;
  border-radius: var(--md-radius-md);
  font-size: var(--md-fs-base);
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 0.2s;
}

.gd-btn-cancel {
  background: var(--md-bg-soft);
  color: var(--md-text-secondary);
  border-color: var(--md-border);
}

.gd-btn-cancel:hover {
  background: var(--md-bg);
  color: var(--md-text);
}

.gd-btn-confirm {
  background: var(--md-primary);
  color: var(--md-text-on-primary);
}

.gd-btn-confirm:hover {
  background: var(--md-primary-hover);
}

.gd-btn-danger {
  background: var(--md-danger);
}

.gd-btn-danger:hover {
  background: #B89090;
}

/* 过渡动画（与全站 Dialog 统一） */
.modal-enter-active,
.modal-leave-active {
  transition: opacity 0.25s;
}

.modal-enter-active .gd-card,
.modal-leave-active .gd-card {
  transition: transform 0.25s, opacity 0.25s;
}

.modal-enter-from,
.modal-leave-to {
  opacity: 0;
}

.modal-enter-from .gd-card,
.modal-leave-to .gd-card {
  transform: scale(0.95);
  opacity: 0;
}
</style>
