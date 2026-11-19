import request from "./request";

/**
 * 音乐黑名单（屏蔽歌曲 / 歌手）
 *
 * 三个接口是 2026-11 从网易云 PC 客户端挖出来的，走 /api/ 明文通道、账号级存储，
 * 官方客户端同样生效。参数格式与坑见 docs/API_BLACKLIST.md。
 */

/**
 * 拉取当前账号的屏蔽名单。
 *
 * 必须带时间戳：网关对所有 200 的 GET 有 2 分钟缓存（server.js 的 apicache），
 * 屏蔽/解除后立刻查会拿到旧名单。
 *
 * @returns {Promise} 响应 data.data = { songIdList, artistIdList, podcastIds, checkPoint }
 */
export function fetchList() {
    return request('/music/dislike/get', { params: { t: Date.now() } })
}

/**
 * 加入黑名单
 * @param {'song'|'artist'} contentType
 * @param {String|Number|Array} ids 单个 id、id 数组或逗号分隔串
 */
export function add(contentType, ids) {
    return request('/music/blacklist/add', {
        method: 'post',
        params: { contentType, contentIdList: toIdList(ids) }
    })
}

/**
 * 解除屏蔽
 * @param {'song'|'artist'} contentType
 * @param {String|Number|Array} ids
 */
export function remove(contentType, ids) {
    return request('/music/blacklist/delete', {
        method: 'post',
        params: { contentType, contentIdList: toIdList(ids) }
    })
}

/**
 * 上游要求 contentIdList 是 JSON 数组字符串（如 ["123"]），
 * 传 "123"、[123]、contentIdList[0]=123 都会被判 400。
 */
function toIdList(ids) {
    const arr = Array.isArray(ids) ? ids : String(ids == null ? '' : ids).split(',')
    return JSON.stringify(arr.map(s => String(s).trim()).filter(Boolean))
}
