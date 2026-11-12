/**
 * 歌曲 → MV 的关联解析
 *
 * 上游没有「按歌曲查 MV」的接口，关联字段就是歌曲对象自带的 `mv`（MV id，0 = 无）。
 * 实测字段覆盖并不均匀（2026-11-12）：
 *   - /playlist/track/all、/album、/artist/top/song、/cloudsearch、/recommend/songs 都带
 *   - /search（旧）、/personal_fm、/personal/fm/mode 不带（老结构）
 *   - PlayerCore 持久化后恢复的歌曲是 lite 结构，也不带
 * 所以这里做两件事：
 *   1. 同步读 `song.mv`（大多数列表够用，不发请求）
 *   2. 缺失时用 /song/detail?ids= 按需补一次，结果按歌曲 id 缓存
 *
 * 另一个坑：`song.mv` 不为 0 不代表 MV 还能播。周杰伦《叶惠美》里的
 * 154071 / 506024 / 507015、彩虹的 5293415 实测 /mv/detail 直接 {code:404}（版权下架）。
 * 播不了的 id 记进负缓存，徽标下一次就不再亮，避免用户反复点进空页。
 */

import Vue from "vue"
import * as tracksApi from "@/api/Tracks"

const DEAD_KEY = 'acmusic_mv_dead'
// 下架是长期状态，但曲库会回补，留一周后重试
const DEAD_TTL = 7 * 24 * 60 * 60 * 1000

/**
 * 失效 MV 集合做成响应式：MV 页报 404 后，列表徽标 / 播放条角标要立刻消失。
 * 普通 Set 改了模板不会重算，所以挂一个 Vue.observable。
 */
export const mvState = Vue.observable({ dead: {} })

// 歌曲 id -> mv id（含 0，表示确实没有 MV，避免重复请求）
const mvCache = new Map()
const inflight = new Map()

function readDead() {
    try {
        const raw = JSON.parse(localStorage.getItem(DEAD_KEY) || '{}')
        const now = Date.now()
        const alive = {}
        Object.keys(raw).forEach(id => {
            if (now - Number(raw[id]) < DEAD_TTL) alive[id] = raw[id]
        })
        mvState.dead = alive
        return alive
    } catch (e) {
        return {}
    }
}

function writeDead() {
    try {
        localStorage.setItem(DEAD_KEY, JSON.stringify(mvState.dead))
    } catch (e) { /* 隐私模式/配额满，忽略 */ }
}

readDead()

/**
 * 取出歌曲自带的 MV id，非法值一律当 0
 * 只认纯数字：hex 视频 id 走 /mv/detail、/mv/url 会 502（见 mvPlay.vue 的同类守卫）
 * @param {Object} song
 * @returns {Number} MV id，0 表示没有
 */
export function mvIdOf(song) {
    if (!song) return 0
    const raw = song.mv
    if (raw === undefined || raw === null || raw === '') return 0
    if (!/^[1-9]\d{0,15}$/.test(String(raw))) return 0
    return Number(raw)
}

/**
 * 这个 MV 是否已被判定失效（404）
 * @param {Number|String} id
 */
export function isMvDead(id) {
    if (!id) return false
    return !!mvState.dead[String(id)]
}

/**
 * 标记 MV 失效（/mv/detail 返回 404 时调用）
 * @param {Number|String} id
 */
export function markMvDead(id) {
    if (!id) return
    const key = String(id)
    if (mvState.dead[key]) return
    mvState.dead = { ...mvState.dead, [key]: Date.now() }
    writeDead()
}

/**
 * 拿不到 `song.mv` 时按需补一次
 * 同一个 song id 的并发请求会合并，失败不写缓存（下次还能重试）
 * @param {Object} song
 * @returns {Promise<Number>} MV id，0 表示确实没有
 */
export function ensureMvId(song) {
    if (!song || !song.id) return Promise.resolve(0)

    const direct = mvIdOf(song)
    if (direct) {
        mvCache.set(song.id, direct)
        return Promise.resolve(direct)
    }
    if (mvCache.has(song.id)) return Promise.resolve(mvCache.get(song.id))
    if (inflight.has(song.id)) return inflight.get(song.id)

    const promise = tracksApi.detail(song.id)
        .then(res => {
            const row = res && res.data && res.data.songs && res.data.songs[0]
            const id = mvIdOf(row)
            mvCache.set(song.id, id)
            return id
        })
        .catch(() => 0)
        .finally(() => { inflight.delete(song.id) })

    inflight.set(song.id, promise)
    return promise
}

export default { mvIdOf, ensureMvId, isMvDead, markMvDead, mvState }
