/**
 * 音频 URL 内存缓存
 * TTL 30 分钟，自动过期
 * 内置 pending 去重：同一 songId 并发请求复用同一个 Promise
 */
const cache = new Map()
const pending = new Map()
const TTL = 30 * 60 * 1000

export function setAudioCache(id, url) {
  if (!id || !url) return
  try {
    cache.set(id, { url, timestamp: Date.now() })
    pending.delete(id)
  } catch (e) { /* ignore */ }
}

export function getAudioCache(id) {
  try {
    const entry = cache.get(id)
    if (!entry) {
      return null
    }
    if (Date.now() - entry.timestamp > TTL) {
      cache.delete(id)
      return null
    }
    return entry.url
  } catch (e) { return null }
}

/**
 * 统一获取音频 URL（缓存 + pending 去重）
 * @param {*} id songId
 * @param {Function} fetchFn 实际请求函数，返回 Promise<url|null>
 * @returns Promise<url|null>
 */
export function getAudioUrl(id, fetchFn) {
  const cached = getAudioCache(id)
  if (cached) return Promise.resolve(cached)

  const existing = pending.get(id)
  if (existing) {
    return existing
  }

  const promise = fetchFn().then(url => {
    if (url) setAudioCache(id, url)
    return url
  }).catch(() => {
    pending.delete(id)
    return null
  })
  pending.set(id, promise)
  return promise
}

export function removeAudioCache(id) {
  try { cache.delete(id); pending.delete(id) } catch (e) { /* ignore */ }
}

export function clearAudioCache() {
  try { cache.clear(); pending.clear() } catch (e) { /* ignore */ }
}
