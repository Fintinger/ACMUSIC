import request from "./request";

/**
 * 歌手详情
 * @param id 歌手 id
 */
export function detail(id) {
    return request('/artists', { params: { id } })
}

/**
 * 歌手热门 50 首
 * @param id 歌手 id
 */
export function topSongs(id) {
    return request('/artist/top/song', { params: { id } })
}

/**
 * 歌手专辑列表
 * 按 popularity/publishTime 倒序，offset 分页，返回 { artist, hotAlbums, more }；
 * more=false 即到底，总数可用 artist.albumSize 参考。
 * @param id 歌手 id
 * @param limit
 * @param offset
 */
export function albums(id, limit = 50, offset = 0) {
    return request('/artist/album', { params: { id, limit, offset } })
}

/**
 * 歌手相关 MV
 * 注意: 不传 limit 时接口只返回 10 条（大牌歌手动辄几百个 MV），
 * 需要「更多」时必须显式带 limit/offset 续拉，返回里的 hasMore 表示还有没有下一页。
 * @param id 歌手 id
 * @param limit 每页数量
 * @param offset 偏移
 */
export function mvs(id, limit = 50, offset = 0) {
    return request('/artist/mv', { params: { id, limit, offset } })
}

/**
 * 相似歌手
 * @param id 歌手 id
 */
export function simi(id) {
    return request('/simi/artist', { params: { id } })
}

/**
 * 歌手视频
 * @param params id / size / cursor 等
 */
export function videos(params) {
    return request('/artist/video', { params })
}

/**
 * 歌手全部歌曲（按字母分组）
 * @param id 歌手 id
 * @param limit
 * @param offset
 */
export function songs(id, limit = 50, offset = 0) {
    return request('/artist/songs', { params: { id, limit, offset } })
}

/**
 * 收藏/取消收藏歌手（关注歌手）(登录)
 * 说明: /artists?id= 返回的 artist.followed 即当前关注状态
 * @param id 歌手 id
 * @param t 1-关注, 其他-取消关注
 */
export function subArtist(id, t = 1) {
    return request('/artist/sub', { params: { id, t } })
}