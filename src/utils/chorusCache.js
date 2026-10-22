/**
 * 副歌区间缓存
 *
 * 数据来源：`/song/chorus`（见 `src/api/Tracks.js` 的 songChorus 注释）。
 * 上游返回毫秒时间戳，这里统一换算成**秒**，与 `<audio>.currentTime` 同一单位，
 * 调用方不需要再做单位换算。
 *
 * 三个刻意的取舍：
 *  1. `chorus` 为空数组时接口 `code` 仍为 200 —— 判空不判 code。
 *  2. 区间过短的标注视为脏数据丢弃。下限取 5 秒而不是更高：
 *     实测（2026-10-22）热歌榜 39 首有数据样本里，最短的合法标注是 6.5 秒
 *     （《愿与愁》），《归山》（木小雅）只有 11.5 秒（36.5s–48.0s）——
 *     用 15 秒下限会把这些"短促但真实"的高潮段整首误判成"无副歌数据"。
 *     只有短到 5 秒以下才认为上游标注异常。
 *  3. 失败结果只缓存 60 秒（NEGATIVE_TTL），避免一次网络抖动把某首歌永久判成"无副歌"。
 */
import { songChorus } from "@/api/Tracks"

const cache = new Map()     // songId -> { value: {start,end}|null, at: number, ttl: number }
const pending = new Map()   // songId -> Promise
const TTL = 6 * 60 * 60 * 1000
const NEGATIVE_TTL = 60 * 1000
// 副歌段硬下限：低于 5s 的标注当作上游脏数据
const MIN_SPAN = 5

function readCache(key) {
    const entry = cache.get(key)
    if (!entry) return null
    if (Date.now() - entry.at > entry.ttl) {
        cache.delete(key)
        return null
    }
    return { hit: true, value: entry.value }
}

function parseChorus(res) {
    const list = (res && res.data && res.data.chorus) || []
    const first = Array.isArray(list) ? list[0] : null
    if (!first) return null
    const start = Number(first.startTime) / 1000
    const end = Number(first.endTime) / 1000
    if (!isFinite(start) || !isFinite(end)) return null
    if (start < 0 || end <= start) return null
    if (end - start < MIN_SPAN) return null
    return { start, end }
}

/**
 * 取某首歌的副歌区间（秒）
 * @param {string|number} id 歌曲 id
 * @returns {Promise<{start:number,end:number}|null>} 永不会 reject，无数据返回 null
 */
export function getChorus(id) {
    if (!id) return Promise.resolve(null)
    const key = String(id)

    const cached = readCache(key)
    if (cached) return Promise.resolve(cached.value)

    if (pending.has(key)) return pending.get(key)

    const promise = songChorus(id)
        .then(res => {
            const value = parseChorus(res)
            cache.set(key, { value, at: Date.now(), ttl: value ? TTL : NEGATIVE_TTL })
            pending.delete(key)
            return value
        })
        .catch(() => {
            // 网络/网关问题：短缓存，别当成"这首歌没有副歌"
            cache.set(key, { value: null, at: Date.now(), ttl: NEGATIVE_TTL })
            pending.delete(key)
            return null
        })

    pending.set(key, promise)
    return promise
}

/** 预热：切歌时提前拉，失败静默 */
export function prefetchChorus(id) {
    getChorus(id).catch(() => { /* ignore */ })
}

export function clearChorusCache() {
    cache.clear()
    pending.clear()
}
