import request from "./request";

/**
 * AI 点歌
 *
 * 走独立辅助服务（生产 nginx: /api/ai/ → 127.0.0.1:3002），不在 NeteaseCloudMusicApi 上。
 * 返回的是**已经过曲库校验**的歌曲对象数组，可以直接丢给播放器，不需要前端再查一遍。
 *
 * @param {Object} payload
 * @param {string} payload.message 用户原话
 * @param {Array}  [payload.history] 最近几轮对话，用于理解「再来点更吵的」这类追问
 */
export function recommendPlaylist(payload) {
    return request('/ai/playlist', {
        method: 'post',
        data: payload,
        // 冷启动时模型 + 5 个并发搜索要几秒，默认 10s 会误判超时
        timeout: 45000
    })
}
