import request from "./request";

/**
 * 新版评论接口
 * 说明 : 调用此接口 , 传入资源类型和资源 id,以及排序方式,可获取对应资源的评论:
 * @param id 资源 id, 如歌曲 id,mv id
 * @param type 数字 , 资源类型 ,0-歌曲 1-mv 2-歌单  3-专辑  4-电台 5-视频 6-动态
 * @param{Object}args 其他参数
 * pageNo:分页参数,第 N 页,默认为 1
 * pageSize:分页参数,每页多少条数据,默认 20
 * sortType: 排序方式, 1:按推荐排序, 2:按热度排序, 3:按时间排序
 * cursor: 当sortType为 3 时且页数不是第一页时需传入,值为上一条数据的 time
 */
export function gain(id, type, args = {}) {
    return request('/comment/new', {params: {id, type, ...args}})
}

/**
 * 楼层评论(楼中楼)
 * 调用此接口 , 传入资源 parentCommentId、资源类型 type 和资源 id, 可获得该评论下的回复列表
 * @param parentCommentId 楼层(父)评论 id, 即主评论的 commentId
 * @param id 资源 id, 如歌曲 id,mv id
 * @param type 数字 , 资源类型 ,0-歌曲 1-mv 2-歌单 3-专辑 4-电台 5-视频 6-动态 7-电台节目
 * @param{Object}args 其他参数
 * limit:取出楼层数量, 实测硬上限 40(传 100/500 也只回 40 条)
 * time:分页参数, 直接用上一页响应里的 data.time
 *
 * 返回结构(实测): data = { ownerComment, currentComment, comments[], hasMore, totalCount, time, bestComments }
 * 注意: totalCount 只在第一页(不带 time)返回真实值, 翻页请求恒返回 0 —— 不能无条件覆盖,
 *      也不能用 totalCount 减已拉条数来算剩余; 能否继续翻页只看 hasMore。
 * 注意: 楼层是一层平铺, 子评论没有 replyCount, 不能再嵌套; 回复关系由 beReplied[].user 表达
 */
export function floor(parentCommentId, id, type, args = {}) {
    return request('/comment/floor', {params: {parentCommentId, id, type, ...args}})
}

/**
 * 给评论点赞( 需要登录 )
 * @param id 资源 id, 如歌曲 id,mv id
 * @param cid 评论 id
 * @param t 是否点赞 , 1 为点赞 ,0 为取消点赞
 * @param type 数字 , 资源类型 , 0-歌曲 1-mv 2-歌单  3-专辑  4-电台 5-视频 6-动态
 * @returns {AxiosPromise}
 */
export function like(id, cid, t = 1, type) {
    return request('/comment/like', {params: {id, cid, t, type}})
}

/**
 * 抱一抱评论
 * @param uid 用户 id
 * @param cid 评论 id
 * @param sid 资源 id
 */
export function hug(uid, cid, sid) {
    return request('/hug/comment', {params: {uid, cid, sid}})
}

/**
 * 发送评论
 * @param t 1-发送 2-回复
 * @param type 资源类型
 * @param id 对应资源 id
 * @param content 要发送的内容
 * @param commentId 回复的评论 id (回复评论时必填)
 * @returns {AxiosPromise}
 */
export function send(t = 1, type, id, content, commentId) {
    return request('/comment', {params: {t, type, id, content, commentId}})
}

/**
 * 删除评论
 * @param type 资源类型
 * @param id 对应资源 id
 * @param commentId 内容 id,可通过 /comment/mv 等接口获取
 * @returns {AxiosPromise}
 */
export function del(type, id, commentId) {
    return request('/comment', {params: {t: 0, type, id, commentId}})
}