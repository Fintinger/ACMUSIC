/**
 * 音频 URL 内存缓存
 * TTL 30 分钟，自动过期
 * 内置 pending 去重：同一 songId 并发请求复用同一个 Promise
 *
 * key 由 songId + level 组成：不同音质的 URL 必须分开缓存，否则切换音质后会
 * 命中旧档位的地址（表现为"切了没反应"）。level 省略时视为"未指定档位"，
 * 与显式档位互不命中，避免老调用点误用别的档位。
 */
import { toHttpsUrl } from "@/utils/filters"

const cache = new Map()
const pending = new Map()
const TTL = 30 * 60 * 1000

const makeKey = (id, level) => `${id}_${level || ''}`

export function setAudioCache(id, url, level = '') {
  if (!id || !url) return
  try {
    cache.set(makeKey(id, level), { url: toHttpsUrl(url), timestamp: Date.now() })
    pending.delete(makeKey(id, level))
  } catch (e) { /* ignore */ }
}

export function getAudioCache(id, level = '') {
  try {
    const entry = cache.get(makeKey(id, level))
    if (!entry) {
      return null
    }
    if (Date.now() - entry.timestamp > TTL) {
      cache.delete(makeKey(id, level))
      return null
    }
    return entry.url
  } catch (e) { return null }
}

/**
 * 统一获取音频 URL（缓存 + pending 去重）
 * @param {*} id songId
 * @param {Function} fetchFn 实际请求函数，返回 Promise<url|null>
 * @param {string} level 音质档位，参与缓存 key
 * @returns Promise<url|null>
 */
export function getAudioUrl(id, fetchFn, level = '') {
  const key = makeKey(id, level)
  const cached = getAudioCache(id, level)
  if (cached) return Promise.resolve(cached)

  const existing = pending.get(key)
  if (existing) {
    return existing
  }

  const promise = fetchFn().then(url => {
    if (url) setAudioCache(id, url, level)
    return url
  }).catch(() => {
    pending.delete(key)
    return null
  })
  pending.set(key, promise)
  return promise
}

/**
 * 删除某个（或全部档位的）音频缓存
 * @param {*} id songId
 * @param {string} [level] 不传则清掉该歌曲所有档位
 */
export function removeAudioCache(id, level) {
  try {
    if (level === undefined) {
      for (const key of Array.from(cache.keys())) {
        if (key === makeKey(id, '') || key.startsWith(id + '_')) cache.delete(key)
      }
      pending.delete(makeKey(id, ''))
      return
    }
    cache.delete(makeKey(id, level))
    pending.delete(makeKey(id, level))
  } catch (e) { /* ignore */ }
}

export function clearAudioCache() {
  try { cache.clear(); pending.clear() } catch (e) { /* ignore */ }
}
