import * as searchApi from "@/api/Search";

/**
 * 相关视频推荐
 *
 * 为什么不用现成接口（实测 2026-10，均针对网关 https://music.archai.space/api）：
 * - /related/allvideo        → 上游 /api/cloudvideo/v1/allvideo/rcmd 恒返回 { data: [] }，
 *                              匿名/匿名 cookie、数字与 hex id 全部为空，视频页相关推荐永远空白
 * - /simi/mv                 → 上游 /api/discovery/simiMV 完全忽略 mvid，
 *                              任何 id 都返回同一份固定列表（"超级面对面 第29~33期"）
 * 因此改用视频搜索（/cloudsearch?keywords=标题&type=1014）做相关推荐，
 * 按内容相关性返回同主题翻唱/现场/其他期数，实测结果质量可用。
 */

/** 去掉标题里的【】[]（）() 等包装与多余空白，留下核心词 */
export function cleanKeyword(title) {
    const raw = String(title || "")
    const stripped = raw
        .replace(/[【[(（(].*?[】\]）)]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    if (stripped) return stripped
    // 标题整体被【】包住时（如"【好想爱这个世界啊X少年的你】"）剥离后为空，
    // 此时取括号内的内容，否则关键词为空 → 搜不到任何相关视频
    const inner = raw
        .replace(/[【[(（)）\]】]/g, " ")
        .replace(/\s+/g, " ")
        .trim()
    return inner || raw.trim()
}

/**
 * 关键词降级候选（依次尝试，取第一个有结果的）
 * 完整标题 → 冒号/期数前主干 → "X/×"连接的前半段 → 视频标签 → 作者/歌手名
 */
export function keywordCandidates(title, fallbackKeyword, extraKeywords = []) {
    const full = cleanKeyword(title)
    const stem = full.split(/第\d+期|[:：|]/)[0].trim()
    const xFirst = full.split(/[Xx×✕]/)[0].trim()
    const extras = (extraKeywords || []).map(k => cleanKeyword(k))
    const fb = cleanKeyword(fallbackKeyword)
    return [full, stem, xFirst, ...extras, fb].filter((v, i, a) => v && a.indexOf(v) === i)
}

/**
 * 拉取与标题相关的视频列表
 * @param {String} title 视频标题 / MV 名称
 * @param {Object} opts
 * @param {String|Number} [opts.excludeId] 从结果中剔除当前视频 id
 * @param {Boolean} [opts.numericOnly] 只保留数字 id（MV 播放页用：hex 视频走 /mv 链路会 502）
 * @param {String} [opts.fallbackKeyword] 标题候选都搜空时的兜底词（作者/歌手名）
 * @param {Array} [opts.extraKeywords] 额外候选词（视频标签 videoGroup 名称，相关性最好）
 * @param {Number} [opts.limit] 最多返回条数
 * @returns {Promise<Array>} type=1014 搜索结果原样数组，失败/无结果返回 []
 */
export async function fetchRelatedVideos(title, { excludeId, numericOnly = false, limit = 10, fallbackKeyword, extraKeywords } = {}) {
    const candidates = keywordCandidates(title, fallbackKeyword, extraKeywords)
    for (const kw of candidates) {
        try {
            const res = await searchApi.searchV2({ keywords: kw, type: 1014, limit: limit + 5 })
            const videos = (res.data && res.data.result && res.data.result.videos) || []
            const picked = videos
                .filter(v => v && v.vid && String(v.vid) !== String(excludeId == null ? "" : excludeId))
                .filter(v => !numericOnly || /^\d+$/.test(String(v.vid)))
                .slice(0, limit)
            if (picked.length) return picked
        } catch (e) {
            // 换下一个候选词重试
        }
    }
    return []
}
