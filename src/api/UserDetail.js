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

/**
 * 获取用户关注列表（TA 关注的人）
 * 说明: 返回体为 { follow: [...], more: boolean, touchCount }
 * @param uid 用户 id
 * @param limit 返回数量, 默认 30
 * @param offset 偏移数量, (页数 - 1) * limit
 */
export function follows(uid, limit = 30, offset = 0) {
    return request('/user/follows', { params: { uid, limit, offset } })
}

/**
 * 获取用户粉丝列表（关注 TA 的人）
 * 说明: 返回体为 { followeds: [...], more: boolean, size: 粉丝总数 }
 * @param uid 用户 id
 * @param limit 返回数量, 网关默认 20
 * @param offset 偏移数量, (页数 - 1) * limit
 */
export function followeds(uid, limit = 30, offset = 0) {
    return request('/user/followeds', { params: { uid, limit, offset } })
}