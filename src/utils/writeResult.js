/**
 * 写接口结果解析（收藏歌单 / 歌单加歌 / 歌单信息维护共用）
 *
 * 背景：NeteaseCloudMusicApi 的写接口有三种成功/失败形态，HTTP 状态都是 200：
 *   1. `{code: 200}`                                  —— /playlist/subscribe、/like
 *   2. `{status: 200}`                                —— /playlist/tracks、/song/order/update
 *   3. `{status: 200, body: {code: 400, message}}`     —— 上游业务失败被包进 body
 *
 * 只看顶层 `code || status` 会把第 3 种判成成功（用户看到"已加入"但歌没进去），
 * 所以三个位置都看：出现任何一个非 200 的显式状态就算失败。
 * 三个都没有时按 HTTP 成功处理——有些接口只回 200 空体，不能误判成失败。
 *
 * @param {Object} res axios 响应
 * @param {string} [fallback] 上游没给文案时的兜底提示
 * @returns {{ok: boolean, message?: string, code?: number}}
 */
export function parseWriteResult(res, fallback) {
    const d = (res && res.data) || {}
    const body = d.body || {}
    const raw = []
    if (d.code !== undefined && d.code !== null) raw.push(d.code)
    if (d.status !== undefined && d.status !== null) raw.push(d.status)
    if (body.code !== undefined && body.code !== null) raw.push(body.code)

    if (!raw.length) return { ok: true }

    const codes = raw.map(Number)
    // 200 是成功；有的接口同时回 status:200 + body.code:200，都算成功
    if (codes.every(c => c === 200)) return { ok: true }

    const code = codes.find(c => c !== 200)
    const message = d.message || d.msg || body.message || body.msg ||
        (d.data && (d.data.message || d.data.msg)) || fallback
    return { ok: false, message, code }
}

export default { parseWriteResult }
