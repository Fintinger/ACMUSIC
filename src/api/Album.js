import request from "./request";

/**
 * 获取专辑详情
 * @param id
 * @returns {AxiosPromise}
 */
export function getDetail(id) {
    return request('/album', {params: {id}})
}