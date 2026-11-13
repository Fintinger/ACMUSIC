// 网易云歌曲解灰
//
// 直连本地 @unblockneteasemusic/server（UNM），不再走
// @neteasecloudmusicapienhanced/unblockmusic-utils 的模块轮询。
//
// 为什么要改：unblockmusic-utils 的 matchID() 会按文件名顺序依次尝试
//   byfuns -> ddyr -> gdmusic -> msls -> oi -> qijieya -> unm
// 其中只有 unm 是本地实现（不依赖外部站点）。2026-11-13 线上日志实测：
//   byfuns  HTTP 404
//   ddyr    域名 yy.zddyr.top 解析到无效地址，TLS 证书不匹配
//   gdmusic HTTP 503
//   msls / oi / qijieya  同样失败
// 也就是说一次解灰要先把 6 个失效模块跑完，才轮到唯一可用的 unm，
// 公网实测单次耗时 7.4s。本文件让 unm 直接接管。
//
// 顺带把 UNM 本来就返回、但被中间层丢掉的 source / br / size 透出给前端，
// 播放器才能显示"解灰完成 · 波点音乐 320k"而不是笼统的"第三方源"。
//
// 环境变量：
//   UNM_SOURCES=pyncmd,bodian,qq   UNM 内部尝试的音源，逗号分隔（默认值沿用原链路顺序）
//   UNM_TIMEOUT_MS=8000            单次解灰硬超时
//   MATCH_LEGACY_FALLBACK=true     解灰失败时回退旧链路；默认关闭，
//                                  因为旧链路里 6/7 个模块已失效，开启只会让失败多等约 7 秒

const logger = require('../util/logger.js')

const DEFAULT_SOURCES = (process.env.UNM_SOURCES || 'pyncmd,bodian,qq')
  .split(',')
  .map((source) => source.trim())
  .filter(Boolean)

/**
 * 给 Promise 加硬超时。
 * unm 内部若某个源卡住，不应该把整条请求挂到 nginx 的 proxy_read_timeout。
 */
function withTimeout(promise, ms, label) {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`${label} timeout after ${ms}ms`)),
      ms,
    )
    promise.then(
      (value) => {
        clearTimeout(timer)
        resolve(value)
      },
      (error) => {
        clearTimeout(timer)
        reject(error)
      },
    )
  })
}

/**
 * 把 UNM 抛出的错误压成一行可读文案。
 * 全源失败时抛的是 AggregateError，message 为空、真正的原因在 errors 数组里；
 * 也有直接 throw 字符串的分支，所以逐层兜底，避免日志里只剩一个 undefined。
 */
function describeError(error) {
  if (!error) return 'no reason'
  if (Array.isArray(error.errors) && error.errors.length) {
    return error.errors
      .map((item) => (item && (item.message || item.name)) || String(item))
      .join('; ')
  }
  return error.message || error.name || String(error)
}

module.exports = async (query, request) => {
  const id = query.id
  if (!id) {
    return { status: 400, body: { code: 400, msg: 'id is required', data: [] } }
  }

  // query.source 的语义在这里变了：从"unblockmusic-utils 的模块名"改成
  // "UNM 的音源名列表"。前端目前不传，仅保留给排查时手动指定。
  const sources = query.source
    ? String(query.source)
        .split(',')
        .map((source) => source.trim())
        .filter(Boolean)
    : DEFAULT_SOURCES

  let url = ''
  let source = ''
  let br = 0
  let size = 0

  try {
    const match = require('@unblockneteasemusic/server')
    const startedAt = Date.now()
    const result = await withTimeout(
      match(id, sources),
      Number(process.env.UNM_TIMEOUT_MS) || 8000,
      'unm',
    )
    url = (result && result.url) || ''
    source = (result && result.source) || ''
    br = Number(result && result.br) || 0
    size = Number(result && result.size) || 0
    logger.info(
      `解灰: id=${id} source=${source || '-'} br=${br || '-'} ${Date.now() - startedAt}ms`,
    )
  } catch (error) {
    logger.error(`解灰失败: id=${id} ${describeError(error)}`)
  }

  if (!url && process.env.MATCH_LEGACY_FALLBACK === 'true') {
    try {
      const {
        matchID,
      } = require('@neteasecloudmusicapienhanced/unblockmusic-utils')
      const legacy = await matchID(id, query.source)
      const legacyUrl = (legacy && legacy.data && legacy.data.url) || ''
      if (legacyUrl) {
        url = legacyUrl
        source = source || (legacy.data && legacy.data.source) || ''
      }
      logger.warn(`解灰回退旧链路: id=${id} source=${source || '-'}`)
    } catch (error) {
      logger.error(`解灰回退失败: id=${id} ${describeError(error)}`)
    }
  }

  if (!url) {
    // 502 表示"上游没有可用的源"，与代码异常区分开，便于按状态码统计命中率
    return {
      status: 502,
      body: { code: 502, msg: 'no available source', data: [] },
    }
  }

  // 沿用原逻辑：只有酷我系直链需要走 PROXY_URL（防盗链），其余直接给原始地址
  const proxyBase = process.env.PROXY_URL || ''
  const needProxy =
    process.env.ENABLE_PROXY === 'true' &&
    !!proxyBase &&
    url.includes('kuwo')
  const proxyUrl = needProxy ? proxyBase + url : url

  return {
    status: 200,
    body: {
      code: 200,
      data: url,
      proxyUrl,
      source,
      br,
      size,
    },
  }
}
