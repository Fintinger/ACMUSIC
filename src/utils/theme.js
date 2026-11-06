// 外观偏好独立于登录态；存储不可用时仍可在当前页面切换。
export const THEME_KEY = 'acmusic_theme'
export const THEME_OPTIONS = ['system', 'light', 'dark']
let sessionTheme = null

export function getStoredTheme() {
  if (sessionTheme) return sessionTheme
  try {
    const value = localStorage.getItem(THEME_KEY)
    return THEME_OPTIONS.includes(value) ? value : 'system'
  } catch (_) { return 'system' }
}

export function applyTheme(preference) {
  const mode = THEME_OPTIONS.includes(preference) ? preference : 'system'
  const dark = mode === 'dark' || (mode === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)
  document.documentElement.dataset.theme = dark ? 'dark' : 'light'
  document.documentElement.style.removeProperty('background-color')
  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
}

/* ---------------------------------------------------------------------------
 * 主题切换过渡动画（双层方案）
 *
 * 主路径：View Transitions API（Chrome/Edge 111+，Safari 18+）。
 *   截取切换前后的两帧位图做位图合成，不依赖 CSS 变量逐元素过渡。
 *   方向按目标主题区分（用户指定）：
 *     · 切到浅色 → 新主题从点击位置圆形展开（new 图层作为裁剪层逐渐变大）
 *     · 切到深色 → 反过来，旧主题收缩进点击位置，深色从四周向中心聚拢
 *       （旧图层在上、clip-path 由满屏缩到 0，露出下面的深色）
 * 降级路径：给 <html> 挂 .theme-anim 类，全局对背景/文字/描边/图标色做
 *   480ms 的 CSS 过渡，结束后移除（常驻会拖慢正常 hover 反馈）。
 *
 * 两条路径都尊重 prefers-reduced-motion：直接切换，不做动画。
 * 首帧初始化 / 系统主题自动变化走 applyTheme（不带 origin），不动画，
 * 避免页面加载时白闪一段动画。
 * ------------------------------------------------------------------------- */
const THEME_ANIM_MS = 480
// 连点保护：只有最后一次切换能清理 ::view-transition 上的变量
let transitionSeq = 0

function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export function applyThemeWithTransition(preference, origin) {
  if (!origin || prefersReducedMotion()) {
    applyTheme(preference)
    return
  }
  const dark = preference === 'dark'
    || (preference === 'system' && window.matchMedia('(prefers-color-scheme: dark)').matches)

  if (typeof document.startViewTransition === 'function') {
    const root = document.documentElement
    // 圆形扩散/收缩的圆心 = 点击位置，半径取到视口最远角的距离，保证覆盖整个视口
    const radius = Math.hypot(
      Math.max(origin.x, window.innerWidth - origin.x),
      Math.max(origin.y, window.innerHeight - origin.y)
    )
    root.style.setProperty('--theme-reveal-x', origin.x + 'px')
    root.style.setProperty('--theme-reveal-y', origin.y + 'px')
    root.style.setProperty('--theme-reveal-r', radius + 'px')
    // 切深色：旧层收缩到点击点（旧层压在上面）；切浅色：新层从点击点展开（新层压在上面）
    root.style.setProperty('--theme-vt-old-anim', dark ? 'theme-circle-converge' : 'none')
    root.style.setProperty('--theme-vt-new-anim', dark ? 'none' : 'theme-circle-reveal')
    root.style.setProperty('--theme-vt-old-z', dark ? '2' : '1')
    root.style.setProperty('--theme-vt-new-z', dark ? '1' : '2')

    const seq = ++transitionSeq
    const transition = document.startViewTransition(() => { applyTheme(preference) })
    transition.finished.finally(() => {
      if (seq !== transitionSeq) return
      ;['--theme-vt-old-anim', '--theme-vt-new-anim', '--theme-vt-old-z', '--theme-vt-new-z']
        .forEach(name => root.style.removeProperty(name))
    })
    return
  }

  // 降级：全局颜色过渡。类名先挂再改 data-theme，浏览器才会把变色算进过渡
  const root = document.documentElement
  root.classList.add('theme-anim')
  applyTheme(preference)
  window.setTimeout(() => { root.classList.remove('theme-anim') }, THEME_ANIM_MS + 40)
}

export function setTheme(preference, origin) {
  const mode = THEME_OPTIONS.includes(preference) ? preference : 'system'
  sessionTheme = mode
  try {
    localStorage.setItem(THEME_KEY, mode)
    sessionTheme = null
  } catch (_) { /* 存储不可写时由内存保留本次选择，系统变化不能覆盖手动选择 */ }
  applyThemeWithTransition(mode, origin)
}

export function watchTheme(onChange) {
  const media = window.matchMedia('(prefers-color-scheme: dark)')
  const refresh = () => {
    const mode = getStoredTheme()
    applyTheme(mode)
    onChange(mode)
  }
  const storage = event => {
    if (event.key !== THEME_KEY && event.key !== null) return
    sessionTheme = null
    refresh()
  }
  if (media.addEventListener) media.addEventListener('change', refresh)
  else media.addListener(refresh)
  window.addEventListener('storage', storage)
  refresh()
  return () => {
    if (media.removeEventListener) media.removeEventListener('change', refresh)
    else media.removeListener(refresh)
    window.removeEventListener('storage', storage)
  }
}
