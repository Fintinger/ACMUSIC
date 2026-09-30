// Vercel Serverless 音频代理
// 浏览器请求本函数, 由 Vercel 服务器代为访问网易云 CDN 并流式转发
// 绕过本地网络对 m*.music.126.net 的屏蔽
import { Readable, Transform } from 'node:stream'

/** 允许代理的目标域名白名单（网易云音乐 CDN / 主站） */
const ALLOWED_HOST_PATTERNS = [
  /^m\d+\.music\.126\.net$/i,
  /^[a-z0-9-]+\.music\.126\.net$/i,
  /^[a-z0-9-]+\.music\.163\.com$/i,
  /^(music|interface|m)\.163\.com$/i,
]

/** 上游请求超时（ms） */
const UPSTREAM_TIMEOUT_MS = 30000
/** 无 Content-Length 时的兜底流式上限（字节），防止代理被当作无限下载通道 */
const MAX_STREAM_BYTES = 64 * 1024 * 1024
/** 透传给浏览器的上游响应头 */
const PASS_THROUGH_HEADERS = ['content-type', 'content-length', 'content-range', 'accept-ranges', 'cache-control', 'etag', 'last-modified']

/**
 * 校验目标 URL 是否允许代理。
 * 这是唯一的 SSRF 防线: 只允许 https/http 且 host 命中白名单。
 * @param {string} raw 待校验的 URL 字符串
 * @returns {{ok: true, url: URL} | {ok: false, reason: string}}
 */
export function validateTarget(raw) {
  if (!raw || typeof raw !== 'string') {
    return { ok: false, reason: 'missing url' }
  }
  let parsed
  try {
    parsed = new URL(raw)
  } catch (e) {
    return { ok: false, reason: 'invalid url' }
  }
  if (parsed.protocol !== 'https:' && parsed.protocol !== 'http:') {
    return { ok: false, reason: 'protocol not allowed' }
  }
  const allowed = ALLOWED_HOST_PATTERNS.some(p => p.test(parsed.hostname))
  if (!allowed) {
    return { ok: false, reason: 'host not allowed' }
  }
  return { ok: true, url: parsed }
}

/**
 * 构造上游请求头。
 * 关键: 必须转发客户端 Range, 否则音频拖动进度条无法 seek（上游会返回整段 200）。
 * @param {object} reqHeaders 浏览器请求头
 * @param {URL} target 目标 URL
 */
export function buildUpstreamHeaders(reqHeaders = {}, target) {
  const headers = {
    'Referer': 'https://music.163.com/',
    'User-Agent': reqHeaders['user-agent'] || 'Mozilla/5.0',
  }
  const range = reqHeaders['range'] || reqHeaders['Range']
  if (range) {
    headers['Range'] = range
  }
  if (target && target.origin) {
    headers['Origin'] = target.origin
  }
  return headers
}

/**
 * 生成"流式体积守卫"变换流。
 * 仅用于上游**未声明** Content-Length 的响应(已声明的用 content-length 直接判断),
 * 累计超过 maxBytes 时销毁上游并结束响应, 防止本函数被当作无限下载通道。
 * 用 Transform 而非 'data' 监听: Node 对 buffer chunk 会持有底层 ArrayBuffer,
 * 监听器里 destroy() 在终态不生效, 数据仍会被消费。
 * @param {number} maxBytes
 * @param {() => void} onLimit 超限回调（用于中断上游 fetch）
 */
export function makeSizeGuard(maxBytes, onLimit) {
  let sent = 0
  let tripped = false
  return new Transform({
    transform(chunk, enc, cb) {
      if (tripped) return cb()
      sent += chunk.length
      if (sent > maxBytes) {
        tripped = true
        if (typeof onLimit === 'function') {
          try { onLimit() } catch (e) { /* ignore */ }
        }
        cb(new Error('size limit exceeded'))
        return
      }
      cb(null, chunk)
    },
  })
}

/** 只透传白名单内的响应头, 避免把上游的奇怪头部带给浏览器 */
export function collectResponseHeaders(upstreamHeaders) {
  const out = {}
  // 遍历 entries 而非 get(): 同名头(如 set-cookie)可拿到全部原始值
  upstreamHeaders.forEach((value, name) => {
    const key = String(name).toLowerCase()
    if (PASS_THROUGH_HEADERS.indexOf(key) !== -1) {
      out[key] = value
    }
  })
  if (!out['content-type']) {
    out['content-type'] = 'audio/mpeg'
  }
  return out
}

export default async function handler(req, res) {
  const target = validateTarget(req.query && req.query.url)
  if (!target.ok) {
    // 缺参 400; 非法目标 403（不回显细节, 避免被用来探测白名单）
    res.status(target.reason === 'missing url' ? 400 : 403).send(target.reason)
    return
  }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), UPSTREAM_TIMEOUT_MS)
  try {
    const upstream = await fetch(target.url.href, {
      headers: buildUpstreamHeaders(req.headers, target.url),
      signal: controller.signal,
      redirect: 'follow',
    })
    if (!upstream.ok) {
      res.status(upstream.status).send('upstream ' + upstream.status)
      return
    }

    // 保持上游状态码语义: 206 必须原样回给浏览器（Range 请求的关键）
    res.status(upstream.status)
    const headers = collectResponseHeaders(upstream.headers)
    Object.keys(headers).forEach(name => res.setHeader(name, headers[name]))
    if (!headers['cache-control']) {
      res.setHeader('Cache-Control', 'public, max-age=300')
    }

    const declaredLength = Number(headers['content-length'] || 0)
    if (declaredLength && declaredLength > MAX_STREAM_BYTES) {
      res.status(502).send('upstream payload too large')
      return
    }
    const body = Readable.fromWeb(upstream.body)
    const out = declaredLength ? body : body.pipe(makeSizeGuard(MAX_STREAM_BYTES, () => controller.abort()))
    out.on('error', () => {
      // 已开始写响应则无法再改状态码, 直接结束
      res.end()
    })
    res.on('close', () => out.destroy())
    out.pipe(res)
  } catch (e) {
    const aborted = e && (e.name === 'AbortError' || e.name === 'TimeoutError')
    if (!res.headersSent) {
      res.status(aborted ? 504 : 502).send(aborted ? 'upstream timeout' : 'proxy error')
    } else {
      res.end()
    }
  } finally {
    clearTimeout(timer)
  }
}
