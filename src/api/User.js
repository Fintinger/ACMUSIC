import request from "./request";

/**
 * 收藏的歌手列表,调用此接口,可获取收藏的歌手列表
 * @returns {AxiosPromise}
 */
export function subArtistList() {
    return request('/artist/sublist')
}
/**
 * 收藏的专辑列表
 * 说明: 接口参数为 limit/offset, 不传时上游默认只返回第一页
 * @param limit 返回数量, 默认 2000
 * @param offset 偏移数量
 * @returns {AxiosPromise}
 */
export function subAlbumList(limit = 2000, offset = 0) {
    return request('/album/sublist', {params: {limit, offset}})
}
/**
 * 收藏的专栏
 * @param limit 默认为 50
 * @param offset
 * @returns {AxiosPromise}
 */
export function subTopicList(limit = 50, offset = 0) {
    return request('/topic/sublist', {params: {limit, offset}})
}

/**
 * 收藏的 MV 列表
 * @returns {AxiosPromise}
 */
export function subMvList() {
    return request('/mv/sublist')
}

/**
 * 关注/取消关注用户(登录)
 * 说明 : 登录后调用此接口 , 传入用户 id, 和操作 t,可关注/取消关注用户
 * @param id 用户id
 * @param t(可选) 1-关注,其他为取消关注
 */
export function followUser(id, t = 1) {
    return request('/follow', {params: {id, t}})
}

/**
 * 获取用户播放记录
 * @param uid
 * @param type type=1返回 weekData, type=0返回 allData
 */
export function record(uid, type = 0) {
    return request('/user/record', {params: {uid, type}})
}

/**
 * 获取云盘数据(登录)
 * @param limit 返回数量 , 默认为 200
 * @param offset 偏移数量，用于分页 , 如 :( 页数 -1)*200, 其中 200 为 limit 的值 , 默认为 0
 * @returns {AxiosPromise}
 */
export function getCloud(limit = 200, offset = 0) {
    return request('/user/cloud', {params: {limit, offset}})
}

/**
 * 云盘数据详情
 * @param id 歌曲 id,可多个,用逗号隔开
 * @returns {AxiosPromise}
 */
export function cloudDetail(id) {
    return request('/user/cloud/detail', {params: {id}})
}

/**
 * 删除云盘歌曲
 * @param id 歌曲 id,可多个,用逗号隔开
 * @returns {AxiosPromise}
 */
export function cloudDel(id) {
    return request('/user/cloud/del', {params: {id}})
}

/**
 * 当前登录用户的收藏计数
 * 说明 : 无需 uid，返回当前登录态（游客返回游客账号）的各类收藏数量
 * @returns {AxiosPromise<{createdPlaylistCount:number, subPlaylistCount:number, artistCount:number, mvCount:number, djRadioCount:number, programCount:number}>}
 */
export function subcount() {
    return request('/user/subcount')
}

/**
 * 会员信息
 * 说明 : 返回 associator（黑胶VIP）与 musicPackage（音乐包）两套权益，vipCode 为 0 即无该权益。
 *   用于判断能否使用无损/臻音等高音质，避免给非会员默认开 hires 造成必然降级。
 * @returns {AxiosPromise<{associator:{vipCode:number,vipLevel:number}, musicPackage:{vipCode:number}}>}
 */
export function vipInfo() {
    return request('/vip/info')
}