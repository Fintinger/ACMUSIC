import request from "./request";

/**
 * MV 详情
 * @param id MV id
 */
export function detail(id) {
    return request('/mv/detail', { params: { mvid: id } })
}

/**
 * MV 播放地址
 * @param id MV id
 * @param r 分辨率（默认 1080）
 */
export function url(id, r) {
    return request('/mv/url', { params: { id, r } })
}

/**
 * 相似 MV
 * @param id MV id
 */
export function simi(id) {
    return request('/simi/mv', { params: { mvid: id } })
}

/**
 * 最新 MV（全部）
 * @param params area/limit 等
 */
export function all(params) {
    return request('/mv/all', { params })
}

/**
 * 最新 MV（首发）
 * @param limit 数量
 */
export function first(limit = 100) {
    return request('/mv/first', { params: { limit } })
}