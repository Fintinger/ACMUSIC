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
    const res = await fetch(`/api/ip-location?ip=${encodeURIComponent(ip)}`)
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
 * 对 IP 地址打码，仅显示前两段
 * 例：219.101.192.23 → 219.101.***.***
 */
export function maskIP(ip) {
  if (!ip) return ''
  const parts = ip.split('.')
  if (parts.length !== 4) return ip
  return `${parts[0]}.${parts[1]}.***.***`
}
