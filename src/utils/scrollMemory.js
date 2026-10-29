/**
 * 刷新后的滚动位置记忆（会话级）
 *
 * 为什么需要单独一套：App.vue 的 .el-main 是 overflow:hidden，滚动发生在 window 上，
 * vue-router 的 scrollBehavior 只覆盖 SPA 内部导航（前进/后退靠 savedPosition）。
 * 刷新走的是浏览器原生加载，vue-router 当成"新导航"一律给 (0,0) —— 于是长列表页
 * 刷新永远回顶部。浏览器自带的 scrollRestoration 又因为内容异步渲染而经常失效。
 *
 * 用 sessionStorage 而不是 localStorage：刷新要保留，关掉标签页就该忘掉。
 * 恢复过程要重试（首屏内容异步到达，此时 scrollHeight 还不够，scrollTo 会被夹住）；
 * 用户一旦自己滚了（wheel / touchstart）立刻放手，绝不跟用户抢滚动条。
 */
const KEY = 'acmusic_scroll:'
const TTL = 10 * 60 * 1000

export function saveScroll(fullPath) {
    if (!fullPath) return
    try {
        sessionStorage.setItem(KEY + fullPath, JSON.stringify({
            y: window.scrollY || window.pageYOffset || 0,
            t: Date.now()
        }))
    } catch (e) { /* ignore */ }
}

/**
 * @param {string} fullPath 恢复哪个页面的位置
 * @param {object} [opts]
 * @param {number} [opts.tries] 最多尝试几次（每次间隔 interval）
 * @param {number} [opts.interval] 重试间隔 ms
 * @param {Function} [opts.stopIf] 每次重试前询问"还要继续吗"（路由已切走时返回 true）
 */
export function restoreScroll(fullPath, opts) {
    if (!fullPath) return
    const o = opts || {}
    const tries = o.tries || 14
    const interval = o.interval || 180
    let rec = null
    try { rec = JSON.parse(sessionStorage.getItem(KEY + fullPath) || 'null') } catch (e) { rec = null }
    if (!rec || !rec.y || Date.now() - rec.t > TTL) return

    const target = Math.round(rec.y)
    let n = 0
    let aborted = false
    const abort = () => { aborted = true }
    const cleanup = () => {
        window.removeEventListener('wheel', abort)
        window.removeEventListener('touchstart', abort)
    }
    window.addEventListener('wheel', abort, { passive: true })
    window.addEventListener('touchstart', abort, { passive: true })

    const tick = () => {
        if (aborted || (o.stopIf && o.stopIf())) { cleanup(); return }
        const max = Math.max(0, document.documentElement.scrollHeight - window.innerHeight)
        if (window.scrollY === target && max >= target - 2) { cleanup(); return }
        // 够不着就先滚到当前最大高度，等内容长出来下一轮再补
        window.scrollTo(0, Math.min(target, max))
        if (++n >= tries) { cleanup(); return }
        setTimeout(tick, interval)
    }
    tick()
}
