/**
 * 心动模式（智能播放）取流封装
 *
 * 为什么单独抽一个文件：上游这条接口的前置条件散落在三处（登录态 → 红心歌单 id →
 * 红心歌单非空），而且红心歌单 id 一次会话内是稳定的，值得缓存。把这些塞进组件里
 * 会让 PlayerCore 再胖一圈，也拿不到缓存。
 *
 * 上游 /playmode/intelligence/list 的硬约束（2026-10-22 实测，非文档照抄）：
 *   - pid 必须是「我喜欢的音乐」红心歌单 id，传别的歌单 → 400「不支持该歌单类型」
 *   - 红心歌单里必须至少有一首收藏歌曲，否则同样 400
 *   - 种子歌曲可以不在红心歌单里
 *   - count 只是建议值（传 3 可能回 3 也可能回 81），不要按它截断
 *
 * 官方语义：根据**你红心的全部歌曲** + **正在播放的这首**，推荐相似风格的其他歌曲。
 * 所以它不像私人 FM 那样凭空推荐，而是"从你已知的口味往外扩"。
 */
import * as authApi from "@/api/auth";
import * as userDetailApi from "@/api/UserDetail";
import * as tracksApi from "@/api/Tracks";
import { normalizeTrack } from "@/utils/normalize";

// 红心歌单 id 缓存：一次会话内不会变，切账号/登出时由 resetHeartPlaylistId() 清
let heartPlaylistId = 0;

export function resetHeartPlaylistId() {
    heartPlaylistId = 0
}

/**
 * 拿当前账号的红心歌单 id。
 * /user/playlist 的第一项就是「我喜欢的音乐」，但不依赖顺序——先按名字找，
 * 找不到才退回第一项（名字被改过的情况）。
 * @returns {Promise<number>}
 */
export function getHeartPlaylistId() {
    if (heartPlaylistId) return Promise.resolve(heartPlaylistId)
    return authApi.loginStatus().then(res => {
        const d = res && res.data && res.data.data
        const uid = d && d.profile && d.profile.userId
        if (!uid) {
            const e = new Error('未登录或拿不到 uid')
            e.reason = 'NO_UID'
            throw e
        }
        // limit 给小一点：只要第一页里的红心歌单，不必把用户全部歌单拉回来
        return userDetailApi.playlists(uid, 20, 0).then(r2 => {
            const list = (r2 && r2.data && r2.data.playlist) || []
            const liked = list.find(p => p && p.name === '我喜欢的音乐') || list[0]
            if (!liked || !liked.id) {
                const e = new Error('没有红心歌单')
                e.reason = 'NO_HEART_PLAYLIST'
                throw e
            }
            heartPlaylistId = liked.id
            return heartPlaylistId
        })
    })
}

/**
 * 拉一批心动推荐。
 * @param {number|string} seedId 种子歌曲 id（用当前在播的这首）
 * @param {number} count 建议条数
 * @returns {Promise<Array>} 已过 normalizeTrack 的曲目数组（已排除种子本身）
 */
export function fetchHeartBatch(seedId, count = 20) {
    return getHeartPlaylistId().then(pid => {
        return tracksApi.smartPlay(seedId, pid, undefined, count).then(res => {
            const d = res && res.data
            if (!d || d.code !== 200) {
                const e = new Error((d && d.message) || '心动模式不可用')
                // 400 = 红心歌单类型不对 / 红心歌单是空的，这是唯一需要单独解释的错误
                e.reason = (d && d.code === 400) ? 'BAD_PLAYLIST' : 'FAILED'
                throw e
            }
            const seed = String(seedId)
            const raw = d.data || []
            return raw
                .filter(x => x && x.songInfo && String(x.songInfo.id) !== seed)
                .map(x => normalizeTrack(x.songInfo))
                // 上游可能一次给几十上百首，截一下避免队列膨胀到不可控
                .slice(0, 30)
        })
    })
}

export default { getHeartPlaylistId, fetchHeartBatch, resetHeartPlaylistId }
