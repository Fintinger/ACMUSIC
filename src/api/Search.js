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