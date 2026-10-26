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
 * 是否与某用户互相关注(登录)
 * 说明 : 传入对方 uid，返回 data: true/false。注意游客态也返回 code 200 + data:false，
 *   不能用它判断「登录态是否有效」，只能判断互关关系。
 * @param uid 对方用户 id
 * @returns {AxiosPromise<{code:number, data:boolean}>}
 */
export function mutualFollow(uid) {
    return request('/user/mutualfollow/get', {params: {uid}})
}

/**
 * 当前账号关注的用户/歌手(登录)
 * 说明 : 只取「当前登录账号」的关注，不接受 uid；cursor 传上一页返回值即可翻页。
 * @param scene 0-全部 1-歌手 2-用户, 默认 0
 * @param size 返回数量, 默认 30
 * @param cursor 游标, 默认 0
 * @returns {AxiosPromise}
 */
export function followMixed(scene = 0, size = 30, cursor = 0) {
    return request('/user/follow/mixed', {params: {scene, size, cursor}})
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
 * 获取 VIP 信息
 * 说明 : 登录后调用此接口，可获取当前 VIP 信息。
 *   用于判断能否使用无损/臻音等高音质，避免给非会员默认开 hires 造成必然降级。
 *   实测这里的 data 只有 redVipLevel / redVip*Icon 几个字段；associator（黑胶VIP）与
 *   musicPackage（音乐包）只在 App 端接口 `/vip/info/v2` 才有 —— 想拿到期时间请用 vipInfoV2。
 * @param uid(可选) 用户 id，不传则取当前登录态
 * @returns {AxiosPromise<{code:number, data:{redVipLevel:number, redVipAnnualCount:number, redVipLevelIcon:string}}>}
 */
export function vipInfo(uid) {
    return request('/vip/info', {params: uid ? {uid} : {}})
}

/**
 * 获取 VIP 信息（App 端）
 * 说明 : 登录后调用此接口，可获取当前 VIP 信息。比 `/vip/info` 多返回权益明细与到期时间。
 *   associator = 黑胶VIP，musicPackage = 音乐包，voiceBookVip = 有声书VIP；
 *   各自的 vipCode > 0 才算该权益有效（vipCode 是权益类型码：100/220/500，不是"等级"）。
 * @param uid(可选) 用户 id，不传则取当前登录态
 * @returns {AxiosPromise<{code:number, data:{redVipLevel:number, associator:Object, musicPackage:Object, voiceBookVip:Object}}>}
 */
export function vipInfoV2(uid) {
    return request('/vip/info/v2', {params: uid ? {uid} : {}})
}