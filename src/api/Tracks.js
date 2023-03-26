import axios from "axios";

/**
 * 获取歌词
 * 说明 : 调用此接口,传入音乐 id 可获得对应音乐的歌词 (不需要登录)
 * @param {string} id 歌曲id,必填
 * @returns {AxiosPromise}
 */
export function lyric(id) {
    return axios('/lyric', {params: {id}})
}

/**
 * 获取相似音乐
 * 说明 : 调用此接口 , 传入歌曲 id, 可获得相似歌曲
 * @param{string} id 歌曲id,必填
 * @returns {AxiosPromise}
 */
export function simiTracks(id) {
    return axios('/simi/song', {params: {id}})
}

/**
 * 心动模式/智能播放
 * 说明 : 登录后调用此接口 , 可获取心动模式/智能播放列表
 * @param id(必选) 歌曲id
 * @param pid(必选) 歌单id
 * @param sid(可选) 要开始播放的歌曲的 id
 */
export function smartPlay(id, pid, sid) {
    return axios('/playmode/intelligence/list', {params: {id, pid, sid}})
}

/**
 * 喜欢音乐
 * @param id 歌曲 id
 * @param like 布尔值 , 默认为 true 即喜欢 , 若传 false, 则取消喜欢
 * @returns {AxiosPromise}
 */
export function like(id, like = true) {
    return axios('/like', {params: {id, like}})
}

/**
 * 私人 FM 移除至垃圾桶
 * @param id 歌曲 id
 * @returns {AxiosPromise}
 */
export function fmTrash(id) {
    return axios("/fm_trash",{params:{id}})
}

/**
 * 传入音乐 id, 来源 id，歌曲时间 time，更新听歌排行数据
 * @param id(必选) 歌曲 id
 * @param sourceid(必选) 歌单或专辑 id
 * @param time 歌曲播放时间,单位为秒
 * @returns {AxiosPromise}
 */
export function updateListenedRanks(id,sourceid,time) {
    return axios('/scrobble',{params:{id,sourceid,time}})
}