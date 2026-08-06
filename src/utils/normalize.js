/**
 * 数据适配层：解决 Enhanced API 各接口字段不一致问题
 * 核心原则：只增加兼容字段，绝不删除原字段
 */

/**
 * 统一封面图
 * 优先级: coverImgUrl -> picUrl -> album.picUrl -> al.picUrl -> artist.picUrl -> pic
 * @param {Object} item
 * @returns {String}
 */
export function coverOf(item) {
    if (!item) return ''
    return item.coverImgUrl
        || item.picUrl
        || (item.album && item.album.picUrl)
        || (item.al && item.al.picUrl)
        || (item.artist && item.artist.picUrl)
        || (item.artists && item.artists[0] && item.artists[0].picUrl)
        || item.pic
        || ''
}

/**
 * 统一播放量
 * 兼容: playCount / playTime / playCountStr
 * @param {Object} item
 * @returns {Number|String}
 */
export function playCountOf(item) {
    if (!item) return 0
    if (item.playCount !== undefined && item.playCount !== null) return item.playCount
    if (item.playTime !== undefined && item.playTime !== null) return item.playTime
    if (item.playCountStr !== undefined && item.playCountStr !== null) return item.playCountStr
    return 0
}

/**
 * 统一歌手列表
 * 兼容: ar / artists / artist(s)
 * @param {Object} item
 * @returns {Array}
 */
export function artistOf(item) {
    if (!item) return []
    let arts = item.ar || item.artists || item.artist
    if (!Array.isArray(arts)) arts = arts ? [arts] : []
    return arts
}

/**
 * 统一专辑对象
 * 兼容: al / album
 * @param {Object} item
 * @returns {Object|null}
 */
export function albumOf(item) {
    if (!item) return null
    return item.al || item.album || null
}

/**
 * 统一歌曲时长(ms)
 * 兼容: dt / duration / durationms / ms
 * @param {Object} item
 * @returns {Number}
 */
export function durationOf(item) {
    if (!item) return 0
    const v = item.dt ?? item.duration ?? item.durationms ?? item.ms
    return Number(v) || 0
}

/**
 * 处理歌曲对象: 补全兼容字段(不删除原字段)
 * @param {Object} t
 * @returns {Object}
 */
export function normalizeTrack(t) {
    if (!t || typeof t !== 'object') return t
    // 封面
    if (t.picUrl === undefined) t.picUrl = coverOf(t)
    // 歌手数组
    if (t.artists === undefined && t.ar) t.artists = t.ar
    if (t.ar === undefined && t.artists) t.ar = t.artists
    // 专辑
    if (t.album === undefined && t.al) t.album = t.al
    if (t.al === undefined && t.album) t.al = t.album
    // 时长
    if (t.dt === undefined && t.duration) t.dt = t.duration
    if (t.duration === undefined && t.dt) t.duration = t.dt
    return t
}

/**
 * 处理歌单对象: 补全兼容字段
 * @param {Object} pl
 * @returns {Object}
 */
export function normalizePlaylist(pl) {
    if (!pl || typeof pl !== 'object') return pl
    if (pl.picUrl === undefined) pl.picUrl = coverOf(pl)
    if (pl.playCount === undefined && pl.playTime !== undefined) pl.playCount = pl.playTime
    return pl
}

/**
 * 处理歌手对象: 补全兼容字段
 * @param {Object} ar
 * @returns {Object}
 */
export function normalizeArtist(ar) {
    if (!ar || typeof ar !== 'object') return ar
    if (ar.picUrl === undefined) ar.picUrl = coverOf(ar)
    return ar
}

export default {
    coverOf,
    playCountOf,
    artistOf,
    albumOf,
    durationOf,
    normalizeTrack,
    normalizePlaylist,
    normalizeArtist
}
