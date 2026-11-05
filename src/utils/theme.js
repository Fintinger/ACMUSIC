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

export function setTheme(preference) {
  const mode = THEME_OPTIONS.includes(preference) ? preference : 'system'
  sessionTheme = mode
  try {
    localStorage.setItem(THEME_KEY, mode)
    sessionTheme = null
  } catch (_) { /* 存储不可写时由内存保留本次选择，系统变化不能覆盖手动选择 */ }
  applyTheme(mode)
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
