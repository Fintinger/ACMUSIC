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
 * @returns {Promise<Array>} 不重复的歌曲数组（长度 0 ~ size）
 */
export async function fetchFmBatch(size = 3, maxRequests = 4, excludeIds = []) {
    const seen = new Set(excludeIds)
    const songs = []

    const pullOnce = (offset) => tracksApi.personalFM(Date.now() + offset)
        .then(res => {
            const batch = (res && res.data && res.data.data) || []
            if (!Array.isArray(batch)) return
            batch.forEach(s => {
                if (!s || s.id == null || seen.has(s.id)) return
                seen.add(s.id)
                songs.push(s)
            })
        })
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

    return songs.slice(0, size)
}
