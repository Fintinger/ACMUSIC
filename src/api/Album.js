import axios from "axios";

/**
 * 获取专辑详情
 * @param id
 * @returns {AxiosPromise}
 */
export function getDetail(id) {
    return axios('/album', {params: {id}})
}