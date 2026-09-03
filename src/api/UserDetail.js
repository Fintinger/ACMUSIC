import request from "./request";

/**
 * 用户详情
 * @param uid 用户 id
 */
export function detail(uid) {
    return request('/user/detail', { params: { uid } })
}

/**
 * 用户歌单
 * @param uid 用户 id
 * @param limit
 * @param offset
 */
export function playlists(uid, limit = 2000, offset = 0) {
    return request('/user/playlist', { params: { uid, limit, offset } })
}

/**
 * 用户听歌排行
 * @param uid 用户 id
 * @param type 1 = week, 0 = all
 */
export function record(uid, type = 0) {
    return request('/user/record', { params: { uid, type } })
}