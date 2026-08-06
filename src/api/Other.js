import request from "./request";

/**
 * 歌手粉丝数量
 * @param id 歌手 id
 * @returns {AxiosPromise}
 */
export function fansCount(id) {
    return request('/artist/follow/count',{params:{id}})
}