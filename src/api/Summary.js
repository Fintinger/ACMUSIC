import request from "./request";

/**
 * 年度听歌报告
 * 说明 : 登录后调用，返回当前登录用户某一年的年度报告数据包。
 *
 * 实测要点（2026-10，黑胶 VIP 账号）：
 *   1. 网关只放行 2017–2024。传 2025/2026/2016 会返回
 *      `{"code":404,"message":"接口未找到！"}` —— 注意是 message 字段（网关自造），
 *      与上游自身的 `{"code":404,"msg":"资源不存在"}` 用 msg 字段，可据此区分两种 404。
 *   2. 每年一套完全不同的 schema：2017 全名（54 键）、2018/2019 全缩写（88/65 键）、
 *      2020–2024 语义化（21/19/24/33/26 键）。**没有任何跨年统一的字段名**。
 *   3. 「总时长」单位三种：2017 毫秒、2023 分钟、其余为秒。别按一套系数换算。
 *   4. 0 间隔连打多个年份会整批返回 `code:301 需要登录`（频控伪装，不是登录失效）；
 *      间隔 3 秒全部正常。调用方必须串行 + 重试，禁止并发拉 8 年。
 *
 * @param {number|string} year 报告年份（2017–2024）
 * @returns {AxiosPromise}
 */
export function annual(year) {
    return request('/summary/annual', {params: {year}})
}

/**
 * 听歌足迹 —— 年度听歌足迹（逐年播放次数 / 时长）
 *
 * 这是**跨年最可靠的一个接口**，实测价值高于 8 份年报：
 *   1. 一次返回 2017–2025 全部年份（`displayYear` 指示最新年），不需要按年循环；
 *   2. `playDuration` **统一是秒**，正好绕开年报里 2017 毫秒 / 2023 分钟 / 其余秒的坑；
 *      实测 2024 = 2603185s 与年报 meetTimeOverview.playTime 完全一致，2023 = 1178534s
 *      也与年报「分钟 × 60」吻合，可互相校验。
 *   3. 包含 **2025**，而 `/summary/annual` 的年份被网关写死白名单到 2024。
 *
 * 注意：只有「量」，没有年度之歌 / 年度歌手。想要内容仍需 `/summary/annual`（上限 2024）。
 * @returns {AxiosPromise<{code:number, data:{displayYear:number, yearItems:Array<{year:number, playNum:number, playDuration:number}>}}>}
 */
export function listenYearReport() {
    return request('/listen/data/year/report')
}

/**
 * 听歌足迹 —— 歌曲播放排行（每个区间只返回 TOP20）
 *
 * 用途：官方年度报告接口只到 2024，2025 的「年度之歌」拿不到，
 * 只能按月拉取再聚合。**这是近似值，不等于官方年度之歌**。
 *
 * 实测要点：
 *   - `type` 只支持 `week` / `month`；传 `year` 返回 `code:400`
 *   - `endTime` 必须是**该月末 23:59:59.999**（传月初或月中都返回空）
 *   - 每项字段：`songId / songName / artists / picUrl / albumName / playCount`
 *   - 12 个月串行请求较慢且有频控，调用方必须节流 + 重试 + 缓存
 *
 * @param {number} endTime 月末时间戳（毫秒）
 * @param {'month'|'week'} type
 * @returns {AxiosPromise}
 */
export function listenSongRank(endTime, type = 'month') {
    return request('/listen/data/song/play/rank', {params: {type, endTime}})
}
