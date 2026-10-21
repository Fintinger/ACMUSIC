import request from "./request";

/**
 * 获取歌词
 * 说明 : 调用此接口,传入音乐 id 可获得对应音乐的歌词 (不需要登录)
 * @param {string} id 歌曲id,必填
 * @returns {AxiosPromise}
 */
export function lyric(id) {
    return request('/lyric', {params: {id}})
}

/**
 * 新版歌词（逐字 + 翻译 + 罗马音）
 * 说明 : 返回 lrc / yrc / tlyric / romalrc 等多份歌词。
 *   - yrc: 逐字歌词，形如 [行起始,行时长](字起始,字时长,0)字...
 *   - lrc: 可能混有两种行格式（原样透传上游）：
 *       [mm:ss.xxx]文本  标准 LRC
 *       {"t":1000,"c":[{"tx":"作词: "}...]}  富文本行（带歌手跳转信息）
 *   - tlyric: 翻译歌词（标准 LRC）
 * 注意 : 大量老歌没有 yrc，此时只能退化到 lrc 逐行高亮
 * @param {string} id 歌曲id,必填
 * @returns {AxiosPromise}
 */
export function lyricNew(id) {
    return request('/lyric/new', {params: {id}})
}

/**
 * 歌曲可用性检查
 * 说明 : 返回 success 与 message，可直接用于提示"暂无版权"等具体原因
 * @param {string|number} id 歌曲 id
 * @param {number} br 码率，默认 999000
 * @returns {AxiosPromise<{success:boolean, message:string}>}
 */
export function checkMusic(id, br = 999000) {
    return request('/check/music', {params: {id, br}})
}

/**
 * 歌曲下载链接（客户端下载接口）
 * 说明 : 需要登录；无权限/无版权时 data.url 为 null，data.code 为 -110
 * @param {string|number} id 歌曲 id
 * @param {string} level 音质等级 standard|higher|exhigh|lossless|hires
 * @returns {AxiosPromise}
 */
export function downloadUrlV1(id, level = 'standard') {
    return request('/song/download/url/v1', {params: {id, level}})
}

/**
 * 获取相似音乐
 * 说明 : 调用此接口 , 传入歌曲 id, 可获得相似歌曲
 * @param{string} id 歌曲id,必填
 * @returns {AxiosPromise}
 */
export function simiTracks(id) {
    return request('/simi/song', {params: {id}})
}

/**
 * 心动模式/智能播放
 * 说明 : 登录后调用此接口 , 可获取心动模式/智能播放列表
 * @param id(必选) 歌曲id
 * @param pid(必选) 歌单id
 * @param sid(可选) 要开始播放的歌曲的 id
 */
export function smartPlay(id, pid, sid) {
    return request('/playmode/intelligence/list', {params: {id, pid, sid}})
}

/**
 * 喜欢音乐
 * @param id 歌曲 id
 * @param like 布尔值 , 默认为 true 即喜欢 , 若传 false, 则取消喜欢
 * @returns {AxiosPromise}
 */
export function like(id, like = true) {
    return request('/like', {params: {id, like}})
}

/**
 * 获取喜欢的歌曲 id 列表（我的喜欢歌单）
 * 说明 返回 ids 数组，为当前用户所有喜欢歌曲 id
 * 需要登录
 * @returns {AxiosPromise<{ ids: (string|number)[] }>}
 */
export function likelist() {
    return request('/likelist')
}

/**
 * 私人 FM 移除至垃圾桶
 * @param id 歌曲 id
 * @returns {AxiosPromise}
 */
export function fmTrash(id) {
    return request("/fm_trash",{params:{id}})
}

/**
 * 传入音乐 id, 来源 id，歌曲时间 time，更新听歌排行数据
 * @param id(必选) 歌曲 id
 * @param sourceid(必选) 歌单或专辑 id
 * @param time 歌曲播放时间,单位为秒
 * @returns {AxiosPromise}
 */
export function updateListenedRanks(id,sourceid,time) {
    return request('/scrobble',{params:{id,sourceid,time}})
}

/**
 * 私人 FM（拉取下一批推荐）
 * @param t 时间戳，用于避免缓存
 */
export function personalFM(t = Date.now()) {
    return request('/personal_fm', { params: { t } })
}

/**
 * 歌曲 URL（v1，可指定码率）
 * @param id 歌曲 id
 * @param br 码率（如 999000 = 无损）
 */
export function songUrlV1(id, br) {
    return request('/song/url/v1', { params: { id, br } })
}

/**
 * 歌曲 URL（标准接口，按等级）
 * @param id 歌曲 id
 * @param br 码率（默认 999000）
 */
export function songUrl(id, br = 999000) {
    return request('/song/url', { params: { id, br } })
}

/**
 * 歌曲 URL match 接口（fallback）
 * @param id 歌曲 id
 */
export function songUrlMatch(id) {
    return request('/song/url/match', { params: { id } })
}

/**
 * 歌曲详情（单个或多个，逗号分隔）
 * @param ids 歌曲 id 字符串（逗号分隔）
 */
export function detail(ids) {
    return request('/song/detail', { params: { ids } })
}

/**
 * 每日推荐歌曲
 */
export function recommendSongs() {
    return request('/recommend/songs')
}

/**
 * 私人推荐歌单（每日推荐）
 * @param limit
 */
export function personalized(limit = 10) {
    return request('/personalized', { params: { limit } })
}

/**
 * 网友推荐歌单
 * @param limit
 */
export function recommendResource(limit = 10) {
    return request('/recommend/resource', { params: { limit } })
}

/**
 * 相似歌单
 * @param id 歌单 id
 */
export function simiPlaylist(id) {
    return request('/simi/playlist', { params: { id } })
}