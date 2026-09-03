import request from "./request";

/**
 * 新建歌单
 * 说明 : 调用此接口 , 传入歌单名字可新建歌单
 * @param name(必选) 歌单名
 * @param privacy 是否设置为隐私歌单，默认否，传'10'则设置成隐私歌单
 * @param type 歌单类型,默认'NORMAL',传 'VIDEO'则为视频歌单,传 'SHARED'则为共享歌单
 */
export function create(name, privacy, type = 'NORMAL') {
    return request('/playlist/create', {params: {name, privacy, type}})
}

/**
 * id : 歌单 id,可多个,用逗号隔开:?id=5013464397,5013427772
 * @param id
 */
export function del(id) {
    return request('/playlist/delete', {params: {id}})
}

/**
 * 收藏/取消收藏歌单
 * 说明 : 调用此接口 , 传入类型和歌单 id 可收藏歌单或者取消收藏歌单
 * @param t 类型:1-收藏,2-取消收藏
 * @param id 歌单 id
 * @returns {AxiosPromise}
 */
export function subscribe(t = 1, id) {
    return request('/playlist/subscribe', {params: {t, id}})
}

/**
 * 歌单添加或删除歌曲
 * 说明 : 调用此接口 , 可以添加歌曲到歌单或者从歌单删除某首歌曲 ( 需要登录 )
 * @param op 从歌单增加单曲为 add, 删除为 del
 * @param pid 歌单 id
 * @param tracks 歌曲 id,可多个,用逗号隔开
 * @returns {AxiosPromise}
 */
export function addTracks(op = 'add', pid, tracks) {
    return request('/playlist/tracks', {params: {op, pid, tracks}})
}

/**
 *将当前用户的隐私歌单公开
 * @param id 歌单 ID
 * @returns {AxiosPromise}
 */
export function open(id) {
    return request('/playlist/privacy',{params:{id}})
}

/**
 * 获取歌单所有歌曲
 * 说明 : 由于网易云接口限制，歌单详情只会提供 10 首歌，通过调用此接口，传入对应的歌单id，即可获得对应的所有歌曲
 * @param id 歌单id
 * @param params limit-默认值为当前歌单的歌曲数量,offset-默认值为0
 * @returns {AxiosPromise}
 */
export function getAllTrack(id,params={}){
    return request('/playlist/track/all',{params:{id,...params}})
}

/**
 * 歌单详情
 * @param id 歌单 id
 */
export function detail(id) {
    return request('/playlist/detail', { params: { id } })
}

/**
 * 歌单分类（全部分类）
 */
export function catlist() {
    return request('/playlist/catlist')
}

/**
 * 精品歌单标签
 */
export function highqualityTags() {
    return request('/playlist/highquality/tags')
}

/**
 * 精品歌单
 * @param cat 分类
 * @param limit
 * @param before 分页游标
 */
export function highquality(cat, before) {
    return request('/top/playlist/highquality', { params: { limit: 12, cat, before } })
}

/**
 * 歌单（分类筛选）
 * @param params cat/order/limit/offset 等
 */
export function top(params) {
    return request('/top/playlist', { params })
}

/**
 * 所有榜单详情
 */
export function toplistDetail() {
    return request('/toplist/detail')
}

/**
 * 歌手榜
 * @param type 榜单类型
 */
export function toplistArtist(type) {
    return request('/toplist/artist', { params: { type } })
}

/**
 * 新专辑速递
 */
export function newest() {
    return request('/album/newest')
}

/**
 * 热门歌手
 * @param limit
 */
export function topArtists(limit = 10) {
    return request('/top/artists', { params: { limit } })
}