/**
 * 设备识别
 *
 * 只服务于一个场景：移动端打开时提示「暂未适配」。判定刻意偏保守 ——
 * 宁可漏判（让手机用户直接看到桌面版），也不要误伤「窄窗口的桌面浏览器」
 * 和「带触摸屏的笔记本」，否则正常用户会被一块关不掉的提示挡住。
 */

// 常见的移动端 UA 关键字（iPad 单独处理，见下）
const MOBILE_UA = /Android|iPhone|iPod|iPad|Windows Phone|IEMobile|Opera Mini|BlackBerry|Kindle|Silk|HarmonyOS/i

/**
 * 是否移动 / 平板设备
 * @returns {boolean}
 */
export function isMobileDevice() {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false

    const ua = navigator.userAgent || ''
    if (MOBILE_UA.test(ua)) return true

    // iPadOS 13+ 默认发送桌面版 UA（Macintosh），靠多点触控区分真 Mac
    if (/Macintosh/i.test(ua) && (navigator.maxTouchPoints || 0) > 1) return true

    // UA 被改写/精简时的兜底：触控优先 + 窄视口
    if (typeof window.matchMedia !== 'function') return window.innerWidth <= 768
    const coarse = window.matchMedia('(pointer: coarse)').matches
    const noHover = window.matchMedia('(hover: none)').matches
    return coarse && noHover && window.matchMedia('(max-width: 768px)').matches
}
