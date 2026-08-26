// 网站标题统一管理器
// 规范：分隔符统一用「 · 」，品牌名全大写 ACMUSIC
// 优先级：播放中的歌曲标题 > 路由标题

const BASE = 'ACMUSIC'

// 当前路由的基础标题（不含播放状态）
let routeTitle = BASE
// 当前播放歌曲的标题（null 表示无歌曲在播放）
let songTitle = null

function refresh() {
  document.title = songTitle || routeTitle
}

// 路由切换时调用
export function setRouteTitle(title) {
  routeTitle = title || BASE
  refresh()
}

// 播放器状态变化时调用
export function setSongTitle(text) {
  songTitle = text
  refresh()
}

// 无歌曲时清空，回落到路由标题
export function clearSongTitle() {
  songTitle = null
  refresh()
}

export { BASE }
