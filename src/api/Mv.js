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

// 注: 原 simi()(/simi/mv 相似 MV) 已删除 —— 上游 /api/discovery/simiMV 完全忽略 mvid，
// 任何 id 都返回同一份固定列表(2026-10 实测)，相似推荐改用
// utils/relatedVideos.js 的按标题搜索方案。

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