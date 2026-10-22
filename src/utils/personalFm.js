import * as tracksApi from "@/api/Tracks"

/**
 * 私人 FM 批次拉取：一次结果不足时补请求并按 id 去重，保证 UI 拿到互不重复的歌曲。
 *
 * 背景（2026-10-21 实测 https://music.archai.space/api/personal_fm）：
 *  - 未登录态每调用一次只返回 **1 首**歌（多次连续调用返回不同歌曲）
 *  - 组件旧的 displayList 对 len=1 做 "取模三次" 补位 → 三张卡渲染同一首歌
 * 因此这里在接口返回不足 size 首时并发补拉（总请求数上限 maxRequests），
 * 按 id 去重后返回；凑不满也不重复补位，由 UI 按实际数量出卡。
 *
 * @param {number} size 需要凑够的歌曲数（默认 3，对应横向三卡）
 * @param {number} maxRequests 允许的最大请求次数（默认 4）
 * @param {Array} excludeIds 需要排除的歌曲 id（如当前正在展示的批次，避免换批看起来没变化）
 * @param {{mode:string, submode?:string}} [opts] 走 /personal/fm/mode 而非 /personal_fm
 * @returns {Promise<Array>} 不重复的歌曲数组（长度 0 ~ size）
 */
export async function fetchFmBatch(size = 3, maxRequests = 4, excludeIds = [], opts = null) {
    const seen = new Set(excludeIds)
    const songs = []
    // 同一时间窗内被 excludeIds 过滤掉的歌：全被过滤时用它兜底，
    // 宁可重播同一模式的歌，也不能偷偷换成默认推荐流
    const repeats = []
    const mode = opts && opts.mode
    const submode = opts && opts.submode

    const collect = (res) => {
        const batch = (res && res.data && res.data.data) || []
        if (!Array.isArray(batch)) return
        batch.forEach(s => {
            if (!s || s.id == null) return
            if (seen.has(s.id)) {
                if (!repeats.some(r => r.id === s.id)) repeats.push(s)
                return
            }
            seen.add(s.id)
            songs.push(s)
        })
    }

    /**
     * 单次拉取。
     * 两种情况都带不同的时间戳：
     *  - /personal_fm：绕开网关缓存
     *  - /personal/fm/mode：不带 t 时同一时间窗内恒返回同一批（实测 2 分钟一轮），
     *    带了 t 每次都是新的一批 → 补量循环才真的能凑够 3 首不同的歌
     */
    const pullOnce = (offset) => (mode
        ? tracksApi.personalFmMode(mode, submode, undefined, Date.now() + offset)
        : tracksApi.personalFM(Date.now() + offset)
    )
        .then(collect)
        .catch(() => { /* 单次失败忽略，靠余下请求兜底 */ })

    // 先发一次：登录态通常一次就够 3 首，避免无谓请求
    await pullOnce(0)

    let used = 1
    while (songs.length < size && used < maxRequests) {
        const batchCount = Math.min(maxRequests - used, size - songs.length)
        const jobs = []
        for (let i = 0; i < batchCount; i++) jobs.push(pullOnce(used + i))
        await Promise.all(jobs)
        used += batchCount
    }

    if (songs.length) return songs.slice(0, size)

    /**
     * 一首新的都没拉到，两种情况要分开处理：
     *  1. 有返回但全被 excludeIds 过滤 → 说明撞上了同一个 2 分钟时间窗，
     *     这时候**必须继续用同一模式的歌**（重播），绝不能回落到 /personal_fm，
     *     否则用户会听到"运动场景放完 3 首就变成默认推荐"。
     *  2. 请求全失败 / 上游返回空 → 返回空数组，由调用方提示并保持原样。
     */
    if (mode) return repeats.slice(0, size)
    return []
}
