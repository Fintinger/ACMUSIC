import request from "./request";

/**
 * 综合搜索（保留旧版 /search 接口，部分旧组件仍在用）
 * @param params keywords/type/limit/offset 等
 */
export function search(params) {
    return request('/search', { params })
}

/**
 * 综合搜索新版（/cloudsearch）— 搜索结果页主用
 * @param params keywords/limit/offset/type 等
 */
export function searchV2(params) {
    return request('/cloudsearch', { params })
}

/**
 * 搜索增强（只读）：在 /cloudsearch 结果里补回被降权的无版权原唱。
 * 仅单曲搜索（type=1）使用；3003 不可用时调用方回退 searchV2。
 * 后端：127.0.0.1:3003（ops/search-enhanced/），经 nginx 暴露为 /api/search/enhanced
 */
export function searchEnhanced(params) {
    return request('/search/enhanced', { params })
}

/**
 * 搜索建议（搜索框下拉）
 * @param keywords
 */
export function suggest(keywords) {
    return request('/search/suggest', { params: { keywords } })
}

/**
 * 搜索多重匹配（搜索结果聚合页）
 * @param keywords
 */
export function multimatch(keywords) {
    return request('/search/multimatch', { params: { keywords } })
}

/**
 * 搜索默认值（默认搜索词）
 */
export function defaultKeyword() {
    return request('/search/default')
}

/**
 * 热搜详情
 */
export function hotDetail() {
    return request('/search/hot/detail')
}