import axios from "axios";

/**
 * 歌手粉丝数量
 * @param id 歌手 id
 * @returns {AxiosPromise}
 */
export function fansCount(id) {
    return axios('/artist/follow/count',{params:{id}})
}