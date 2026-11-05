/**
 * 更新日志的"已读"状态。
 *
 * 版本号直接取 config.site.version（来自 package.json），不另存一份 ——
 * 否则日志里写 1.1.0、代码里还是 1.0.0，红点会永远消不掉。
 *
 * localStorage 里存的是"上次看到日志时应用是哪个版本"：
 *   - 没有记录（首次访问）→ 视为未读，让用户知道有这功能；
 *   - 记录与当前版本不同（刚发新版）→ 未读，头像上点一个小红点；
 *   - 相同 → 已读。
 */
import config from '@/config'

const SEEN_KEY = 'acmusic_seen_changelog'

export function currentVersion() {
  return (config.site && config.site.version) || ''
}

export function isChangelogUnread() {
  const v = currentVersion()
  if (!v) return false
  try {
    return localStorage.getItem(SEEN_KEY) !== v
  } catch (e) {
    // 隐私模式等取不到存储时按已读处理，避免每次刷新都亮红点
    return false
  }
}

export function markChangelogSeen() {
  const v = currentVersion()
  if (!v) return
  try { localStorage.setItem(SEEN_KEY, v) } catch (e) { /* ignore */ }
}
