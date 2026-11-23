#!/usr/bin/env node
/**
 * ACMUSIC 搜索增强辅助服务（默认 127.0.0.1:3003）
 *
 * 只做一件事：在 /cloudsearch 结果里补回被降权的无版权原唱。
 * 数据来源只有两个只读接口：
 *   - /cloudsearch  原样透传 keywords/type/limit/offset/cookie
 *   - /song/detail  用翻唱结果里的 originSongSimpleData.songId 批量反查原唱
 *
 * 红线：不调用 /song/url、/song/url/v1、/song/url/match；不涉及 unblock；
 *       不修改播放器取源顺序与默认音质。
 *
 * 环境变量：
 *   NETEASE_API_BASE      默认 http://127.0.0.1:3000
 *   SEARCH_ENHANCED_PORT  默认 3003
 *   UPSTREAM_TIMEOUT_MS   默认 6000（前端 axios 超时 10s，留余量）
 *   CACHE_TTL_MS          默认 60000
 */

import http from 'node:http'
import { URL } from 'node:url'

const API = (process.env.NETEASE_API_BASE || 'http://127.0.0.1:3000').replace(/\/+$/, '')
const PORT = Number(process.env.SEARCH_ENHANCED_PORT || 3003)
const TIMEOUT = Number(process.env.UPSTREAM_TIMEOUT_MS || 6000)
const TTL = Number(process.env.CACHE_TTL_MS || 60000)
const MAX_IDS = 50
const CACHE_MAX = 300

const cache = new Map()

const log = (...args) => console.log(new Date().toISOString(), ...args)

async function getJson(path, query) {
  const url = API + path + (query ? '?' + query : '')
  const res = await fetch(url, { signal: AbortSignal.timeout(TIMEOUT) })
  if (!res.ok) throw new Error(`upstream ${path} HTTP ${res.status}`)
  return res.json()
}

function pick(params, keys) {
  const q = new URLSearchParams()
  for (const key of keys) {
    const value = params.get(key)
    if (value !== null && value !== '') q.set(key, value)
  }
  return q.toString()
}

async function enhance(params) {
  const type = Number(params.get('type') || 1)
  const raw = await getJson('/cloudsearch', pick(params, ['keywords', 'type', 'limit', 'offset', 'cookie']))
  const result = raw && raw.result
  if (!result || !Array.isArray(result.songs)) return raw
  if (type !== 1) return raw

  const songs = result.songs
  const present = new Set(songs.map(s => Number(s && s.id)).filter(Boolean))
  const need = []
  for (const song of songs) {
    if (!song || !song.id) continue
    const originId = Number(song.originSongSimpleData && song.originSongSimpleData.songId) || 0
    if (!originId || present.has(originId) || need.includes(originId)) continue
    if (need.length >= MAX_IDS) break
    need.push(originId)
  }
  if (!need.length) return raw

  let detail
  try {
    detail = await getJson('/song/detail', 'ids=' + need.join(','))
  } catch (error) {
    log('song/detail failed, return raw search:', error.message)
    return raw
  }

  const songsById = new Map((detail.songs || []).map(s => [Number(s.id), s]))
  const privileges = new Map((detail.privileges || []).map(p => [Number(p.id), p]))
  const inserted = new Set()
  const merged = []

  for (const song of songs) {
    if (!song || !song.id) continue
    const originId = Number(song.originSongSimpleData && song.originSongSimpleData.songId) || 0
    if (originId && !inserted.has(originId) && songsById.has(originId)) {
      inserted.add(originId)
      merged.push({
        ...songsById.get(originId),
        privilege: privileges.get(originId) || null,
        _acOrigin: true,
      })
    }
    merged.push(song)
  }

  result.songs = merged
  result.songCount = (Number(result.songCount) || songs.length) + inserted.size
  return raw
}

const server = http.createServer(async (req, res) => {
  const send = (status, body) => {
    res.writeHead(status, {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    })
    res.end(JSON.stringify(body))
  }

  const url = new URL(req.url, 'http://127.0.0.1')
  if (req.method !== 'GET') return send(405, { code: 405, msg: 'method not allowed' })
  if (url.pathname === '/health') return send(200, { ok: true, upstream: API })
  if (url.pathname !== '/search/enhanced') return send(404, { code: 404, msg: 'not found' })

  const params = url.searchParams
  if (!(params.get('keywords') || '').trim()) return send(400, { code: 400, msg: 'keywords required' })

  // 登录态请求可能带个性化，不写缓存；游客按完整 query 缓存 60s
  const guest = !params.get('cookie')
  const key = guest ? url.search : ''
  if (key) {
    const hit = cache.get(key)
    if (hit && Date.now() - hit.at < TTL) return send(200, hit.body)
  }

  try {
    const body = await enhance(params)
    if (key) {
      cache.set(key, { at: Date.now(), body })
      if (cache.size > CACHE_MAX) cache.delete(cache.keys().next().value)
    }
    send(200, body)
  } catch (error) {
    log('enhance failed:', error.message)
    send(502, { code: 502, msg: 'search enhanced unavailable' })
  }
})

server.listen(PORT, '127.0.0.1', () => {
  log(`search-enhanced listening on 127.0.0.1:${PORT}, upstream ${API}`)
})
