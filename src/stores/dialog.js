import { defineStore } from 'pinia'
import { ref } from 'vue'

/**
 * 全局弹窗 store（替代原生 alert/confirm）
 *
 * 用法：
 *   import { useDialogStore } from '@/stores/dialog'
 *   const dialog = useDialogStore()
 *
 *   // 确认弹窗（返回 Promise<boolean>，兼容原生 confirm 的调用习惯）
 *   if (!await dialog.confirm('确定删除？')) return
 *
 *   // 危险确认（确认按钮红色）
 *   if (!await dialog.confirm('确定删除？', { danger: true })) return
 *
 *   // 提示弹窗（返回 Promise<void>）
 *   await dialog.alert('操作失败')
 *
 *   // 完整选项
 *   await dialog.confirm('正文', { title: '自定义标题', confirmText: '删除', cancelText: '再想想', danger: true })
 *
 * 关联规范：prd/01-需求文档/04-德塔/02-设计/技术设计/前端可访问性与测试钩子规范.md
 */
export const useDialogStore = defineStore('dialog', () => {
  const visible = ref(false)
  const type = ref('confirm') // 'confirm' | 'alert'
  const title = ref('')
  const message = ref('')
  const confirmText = ref('确认')
  const cancelText = ref('取消')
  const danger = ref(false) // true=确认按钮显示危险色（莫兰迪红）

  let resolver = null

  function open(opts) {
    return new Promise((resolve) => {
      resolver = resolve
      visible.value = true
      type.value = opts.type
      title.value = opts.title || (opts.type === 'alert' ? '提示' : '请确认')
      message.value = opts.message
      confirmText.value = opts.confirmText || (opts.type === 'alert' ? '知道了' : '确认')
      cancelText.value = opts.cancelText || '取消'
      danger.value = opts.danger || false
    })
  }

  /** 确认弹窗，返回 Promise<boolean> */
  function confirm(msg, opts = {}) {
    return open({ ...opts, type: 'confirm', message: msg })
  }

  /** 提示弹窗，返回 Promise<void> */
  function alert(msg, opts = {}) {
    return open({ ...opts, type: 'alert', message: msg }).then(() => {})
  }

  function handleConfirm() {
    if (resolver) {
      resolver(true)
      resolver = null
    }
    visible.value = false
  }

  function handleCancel() {
    if (resolver) {
      resolver(type.value === 'confirm' ? false : undefined)
      resolver = null
    }
    visible.value = false
  }

  return {
    visible, type, title, message, confirmText, cancelText, danger,
    confirm, alert, handleConfirm, handleCancel,
  }
})
