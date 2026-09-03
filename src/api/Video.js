import request from "./request";

/**
 * 视频详情
 * @param id 视频 id
 */
export function detail(id) {
    return request('/video/detail', { params: { id } })
}

/**
 * 视频播放地址
 * @param id 视频 id
 */
export function url(id) {
    return request('/video/url', { params: { id } })
}

/**
 * 相关视频
 * @param id 视频 id
 */
export function related(id) {
    return request('/related/allvideo', { params: { id } })
}

/**
 * mlog 转 video
 * @param id mlog id
 */
export function mlogToVideo(id) {
    return request('/mlog/to/video', { params: { id } })
}

/**
 * 视频分类列表（全部分类）
 */
export function groupList() {
    return request('/video/group/list')
}

/**
 * 某分类下的视频列表
 * @param id 分类 id
 * @param offset 偏移
 */
export function group(id, offset = 0) {
    return request('/video/group', { params: { id, offset } })
}

/**
 * 视频推荐流（时间线）
 * @param offset 偏移
 */
export function timelineRecommend(offset = 0) {
    return request('/video/timeline/recommend', { params: { offset } })
}