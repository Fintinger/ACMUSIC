/**
 * ACMUSIC 统一通知出口
 *
 * 背景：改造前项目里并存三套提示方式 —— Element 原生 `$message`/`$confirm`（71 + 7 处）、
 * 浏览器原生 `alert`/`confirm`（3 处）、以及 `console.error` 静默失败（关键路径 4 处）。
 * 三套皮肤不一致、文案不统一、连点还会刷屏。
 *
 * 这里做的不是「再包一层」而已，顺带修掉两个现有缺陷：
 *   1. 连点刷屏：同类型 + 同文案在 1.5s 内只出一条（原来全项目只有 main.js 的错误兜底做了限频）
 *   2. 被全屏浮层盖住：Element 弹层 z-index 从 2000 起，而评论浮层写了 3000/3100，
 *      在评论区里触发的 toast / 确认框会被完全遮住。这里统一抬到 4000 / 4100。
 *
 * 用法（组件内）：this.$toast.success('已关注')  /  await this.$confirmBox({...})
 * 用法（组件外）：import { toast } from '@/utils/notify'
 */
import Vue from 'vue'
import { Message, MessageBox } from 'element-ui'

/** 弹层层高，需高于 .comment-overlay(3000) / .comment-dialog(3100) */
export const Z_INDEX = {
  toast: 4000,
  modal: 4100
}

/** 同一条提示在该窗口期内只弹一次 */
const DEDUPE_WINDOW_MS = 1500

/** error 停留更久且带关闭按钮，其余快速消失 */
const DURATION = {
  success: 2200,
  info: 2500,
  warning: 3200,
  error: 4500
}

const lastFiredAt = Object.create(null)

function shouldFire(key, force) {
  const now = Date.now()
  if (!force && now - (lastFiredAt[key] || 0) < DEDUPE_WINDOW_MS) return false
  lastFiredAt[key] = now
  return true
}

function liftZIndex(el, z) {
  if (el && el.style) el.style.zIndex = String(z)
}

/**
 * 弹一条 toast
 * @param {string} type success | info | warning | error
 * @param {string|VNode} message
 * @param {object} [options] 透传给 Element Message；force 可跳过去重
 */
function show(type, message, options = {}) {
  const { force = false, ...rest } = options
  const key = `${type}|${typeof message === 'string' ? message : ''}`
  if (!shouldFire(key, force)) return null

  // Element 内部会在 $mount 后把 zIndex 覆写成 PopupManager.nextZIndex()，
  // 所以只能在拿到实例后再抬层高
  const instance = Message({
    type,
    message,
    duration: DURATION[type] || 3000,
    showClose: type === 'error',
    ...rest
  })
  liftZIndex(instance && instance.$el, Z_INDEX.toast)
  return instance
}

export const toast = {
  success: (message, options) => show('success', message, options),
  info: (message, options) => show('info', message, options),
  warning: (message, options) => show('warning', message, options),
  error: (message, options) => show('error', message, options)
}

/**
 * MessageBox 用 popup mixin 的 nextZIndex()，不接受 zIndex 参数，
 * 只能在打开后把 wrapper 与其遮罩一起抬上去
 */
function liftModal() {
  const wrapper = document.querySelector('.el-message-box__wrapper')
  if (wrapper) wrapper.style.zIndex = String(Z_INDEX.modal)
  const modals = document.querySelectorAll('.v-modal')
  if (modals.length) modals[modals.length - 1].style.zIndex = String(Z_INDEX.modal - 1)
}

/**
 * 危险操作确认框
 * @returns {Promise} 用户取消 / 关闭时 reject（沿用 Element 语义，调用方需 catch）
 */
export function confirmBox({
  title = '提示',
  message = '',
  confirmText = '确定',
  cancelText = '取消',
  type = 'warning',
  ...rest
} = {}) {
  const promise = MessageBox.confirm(message, title, {
    type,
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    ...rest
  })
  Vue.nextTick(liftModal)
  return promise
}

/**
 * 不可逆操作的「输入名称确认」
 * @param {string} expect 用户必须原样输入的内容（通常是歌单名）
 * @returns {Promise<{value: string, action: string}>}
 */
export function confirmTyped({
  title = '危险操作',
  message = '',
  expect,
  inputPlaceholder = '',
  confirmText = '确认删除',
  cancelText = '取消',
  ...rest
} = {}) {
  const promise = MessageBox.prompt(message, title, {
    type: 'warning',
    inputPlaceholder,
    inputValidator: value => {
      const v = (value || '').trim()
      if (!v) return '请输入名称以确认'
      return v === expect || `输入不匹配，请输入「${expect}」`
    },
    confirmButtonText: confirmText,
    cancelButtonText: cancelText,
    ...rest
  })
  Vue.nextTick(liftModal)
  return promise
}

/** 供 main.js 挂载到 Vue.prototype */
export default { toast, confirmBox, confirmTyped }
