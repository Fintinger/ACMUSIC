/**
 * IP → 地理位置（仅展示用）
 *
 * 由服务端 /api/ip-location 统一解析，前端不再持有任何第三方 Key：
 *   · 服务端主查 ipwho.is（https、无需 Key），失败回退 ip-api.com
 *   · 服务端按 IP 缓存 24h，前端再缓存一层
 *
 * 历史：早期由前端直连第三方 IP 库（需 Key），Key 会打进前端产物且易泄露，
 * 已改为服务端代理，前端不再持有任何 Key。
 */

const cache = {}

export async function getIpLocation(ip) {
  if (!ip || typeof ip !== 'string') return ''
  if (cache[ip]) return cache[ip]

  try {
    // 不能 encodeURIComponent：IPv6 的冒号会被编成 %3A，而 3001 端口的辅助服务
    // 不对 query 参数做 decode，拿到 "240e%3A..." 后查库失败，静默返回空
    // location，页面上就只剩打码 IP（2026-11 实测定位的线上 bug）。
    // IP 的合法字符集（数字 / a-fA-F / '.' / ':'）本身就是 URL 安全字符，原样拼接。
    const res = await fetch(`/api/ip-location?ip=${ip}`)
    const json = await res.json()
    const loc = (json && json.ok && json.location) || ''
    if (loc) cache[ip] = loc
    return loc
  } catch (e) {
    // 展示用信息，失败静默
    return ''
  }
}

/**
 * 判断 IP 是否属于「查不到归属地」的地址
 *
 * 回环 / 内网 / 链路本地 / CGNAT 这些地址在任何 IP 库里都没有城市级结果，
 * 拿去查只会得到空字符串。网易的 lastLoginIP 偶尔就是 127.0.0.1（登录请求
 * 从本机或内网发出时会被记成回环地址），这种情况下不该把它当 IP 展示。
 */
export function isUnlocatableIp(ip) {
  if (!ip) return true
  const v = String(ip).trim().toLowerCase()
  if (!v) return true
  if (v === '::' || v === '::1') return true
  if (v.startsWith('::ffff:')) return isUnlocatableIp(v.slice(7))   // IPv4-mapped IPv6
  if (v.startsWith('fe80:') || v.startsWith('fc') || v.startsWith('fd')) return true  // 链路本地 / ULA
  // IPv4：0.0.0.0/8、10/8、127/8、169.254/16、172.16/12、192.168/16、100.64/10(CGNAT)
  return /^(?:0\.|10\.|127\.|169\.254\.|192\.168\.|172\.(?:1[6-9]|2\d|3[01])\.|100\.(?:6[4-9]|[7-9]\d|1[01]\d|12[0-7])\.)/.test(v)
}

/**
 * 对 IP 地址打码，仅显示前两段
 * 例：219.101.192.23 → 219.101.***.***
 *     240e:3a0:9904:c010::1 → 240e:3a0:***:***（IPv6 同样只留前两组，
 *     原实现按 '.' 切分对 IPv6 不生效，会把完整地址泄露出来）
 */
export function maskIP(ip) {
  if (!ip) return ''
  if (ip.includes(':')) {
    const groups = ip.split(':')
    return groups.length > 2 ? `${groups[0]}:${groups[1]}:***:***` : ip
  }
  const parts = ip.split('.')
  if (parts.length !== 4) return ip
  return `${parts[0]}.${parts[1]}.***.***`
}
