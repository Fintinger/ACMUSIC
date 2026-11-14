/**
 * 从「资源位」型响应里捞出歌曲对象。
 *
 * `/song/simi/get`（插播相似歌曲）返回的不是一个 songs 数组，而是十几种资源位：
 * `songDataList`、`resourceShowList[].resources`、`commonResourceList`……
 * 而且不同版本字段名还会变。与其写死一条路径、上游一改就白屏，
 * 不如按「长得像一首歌」来判断，遍历整棵响应把歌挑出来。
 *
 * 判定条件刻意收得比较严：必须有 id、name，且 ar / artists 是数组。
 * 光靠 id + name 会把歌单、歌手、电台都当成歌。
 */

function isSong(node) {
  if (!node || typeof node !== 'object') return false
  if (node.id === undefined || node.id === null) return false
  if (!node.name) return false
  return Array.isArray(node.ar) || Array.isArray(node.artists)
}

/**
 * @param {*} payload 接口返回的 data
 * @param {number} limit 最多取多少首（默认 20，横向卡片一行放得下）
 * @returns {Array} 去重后的歌曲对象，保持原有嵌套顺序
 */
export function collectSongs(payload, limit = 20) {
  const out = []
  const seen = new Set()

  const walk = (node, depth) => {
    if (!node || out.length >= limit || depth > 6) return
    if (Array.isArray(node)) {
      for (const item of node) {
        if (out.length >= limit) return
        walk(item, depth + 1)
      }
      return
    }
    if (typeof node !== 'object') return
    if (isSong(node)) {
      const key = String(node.id)
      if (!seen.has(key)) {
        seen.add(key)
        out.push(node)
      }
      return
    }
    for (const key of Object.keys(node)) {
      if (out.length >= limit) return
      walk(node[key], depth + 1)
    }
  }

  // 最常见的字段先走一遍，命中就不必遍历整棵树
  if (payload && Array.isArray(payload.songDataList)) walk(payload.songDataList, 0)
  if (out.length < limit) walk(payload, 0)
  return out
}
