/**
 * 歌手跳转的 id 兜底解析
 *
 * 背景：站内点歌手名一律走 `$bus.$emit('arClk', id)` → `App.artistClick`。
 * 但有两类歌曲手上根本没有歌手 id：
 *   1) 刷新后的播放器队列 —— player_state 里只存了歌手名文本（见 PlayerCore._saveState）；
 *   2) 云盘里自己上传的文件 —— 网易云返回 ar[0].id === 0，只有名字。
 * 以前这两种情况会把 undefined / 0 直接丢给 router，结果是跳到
 * `/artistDetail`（无 id）→ 页面显示「歌手详情加载失败」；云盘那边因为
 * `if (id)` 挡着，干脆毫无反应。
 *
 * 这里用歌手名反查 id：/search?type=100，优先完全同名命中，其次取第一条。
 * 命中结果按名字缓存（一次会话内同一个歌手只查一次），失败不缓存以便重试。
 */

import { search } from '@/api/Search'

/** 合法的网易云资源 id（歌手 / 专辑等）：正整数，0 与空值都不算 */
export function isValidId(id) {
    return /^[1-9]\d*$/.test(String(id == null ? '' : id))
}

// 这些名字搜不出结果，直接跳过请求
const NOISE = new Set(['未知歌手', '未知', 'unknown', 'various artists', '群星'])

// name(normalized) -> 歌手 id
const idCache = new Map()
// name(normalized) -> 正在进行的 Promise（连点去重）
const pending = new Map()

function normalizeName(name) {
    return String(name || '').trim().toLowerCase().replace(/\s+/g, '')
}

/**
 * 拿歌手 id：id 合法就原样返回；否则按名字解析。
 * @param {Number|String} id 手上已有的 id（可能为 0 / undefined）
 * @param {String} name 歌手名（缺失则无从解析）
 * @returns {Promise<Number|null>}
 */
export function resolveArtistId(id, name) {
    if (isValidId(id)) return Promise.resolve(Number(id))

    const raw = String(name || '').trim()
    const key = normalizeName(raw)
    if (!key || NOISE.has(key)) return Promise.resolve(null)
    if (idCache.has(key)) return Promise.resolve(idCache.get(key))
    if (pending.has(key)) return pending.get(key)

    const task = search({ keywords: raw, type: 100, limit: 10 })
        .then(res => {
            const list = (res && res.data && res.data.result && res.data.result.artists) || []
            // 完全同名优先，避免「周杰伦」搜出一堆翻唱/同名用户
            const hit = list.find(a => a && normalizeName(a.name) === key)
                || list.find(a => a && isValidId(a.id))
            const found = hit && isValidId(hit.id) ? Number(hit.id) : 0
            if (found) idCache.set(key, found)
            return found || null
        })
        .catch(() => null) // 网络失败不写缓存，下次点击还能重试
        .then(result => {
            pending.delete(key)
            return result
        })

    pending.set(key, task)
    return task
}

export default { isValidId, resolveArtistId }
