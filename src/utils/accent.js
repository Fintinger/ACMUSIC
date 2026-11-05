// 所有主题角色来自同一基色。文字按浅/深表面调整亮度，避免黄色/深蓝不可读。
export const ACCENT_KEY = 'acmusic_accent'
export const DEFAULT_ACCENT = '#8685ef'
export const ACCENT_PRESETS = ['#e74c3c', '#e67e22', '#27ae60', '#f39c12', '#2c3e50']
let sessionAccent = null

export function normalizeAccent(value) {
  return /^#[0-9a-f]{6}$/i.test(value || '') ? value.toLowerCase() : DEFAULT_ACCENT
}
export function getAccent() {
  if (sessionAccent) return sessionAccent
  try { return normalizeAccent(localStorage.getItem(ACCENT_KEY)) } catch (_) { return DEFAULT_ACCENT }
}
function rgb(hex) { return hex.slice(1).match(/../g).map(n => parseInt(n, 16)) }
function luminance(c) {
  const s = c.map(n => { const x = n / 255; return x <= .04045 ? x / 12.92 : Math.pow((x + .055) / 1.055, 2.4) })
  return s[0] * .2126 + s[1] * .7152 + s[2] * .0722
}
function ratio(a, b) { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05) }
function ink(base, bg, target) {
  for (let i = 0; i <= 100; i++) {
    const c = base.map(n => Math.round(n + (target - n) * i / 100))
    if (ratio(c, bg) >= 4.5) return '#' + c.map(n => n.toString(16).padStart(2, '0')).join('')
  }
}
export function accentTokens(value) {
  const color = normalizeAccent(value), c = rgb(color)
  return {
    '--theme-accent': color,
    '--theme-accent-rgb': c.join(', '),
    '--theme-ink-light': ink(c, [235, 235, 238], 0),
    '--theme-ink-dark': ink(c, [58, 69, 86], 255),
    '--theme-on-accent': ratio(c, [255, 255, 255]) >= 4.5 ? '#ffffff' : '#000000',
  }
}
export function applyAccent(value) {
  Object.entries(accentTokens(value)).forEach(([key, color]) => document.documentElement.style.setProperty(key, color))
}
export function setAccent(value) {
  const color = normalizeAccent(value)
  sessionAccent = color
  try { localStorage.setItem(ACCENT_KEY, color); sessionAccent = null } catch (_) { /* 当前会话仍生效 */ }
  applyAccent(color)
  return color
}
export function watchAccent(callback) {
  const refresh = () => { const color = getAccent(); applyAccent(color); callback(color) }
  const storage = e => { if (e.key === ACCENT_KEY || e.key === null) { sessionAccent = null; refresh() } }
  window.addEventListener('storage', storage)
  refresh()
  return () => window.removeEventListener('storage', storage)
}
