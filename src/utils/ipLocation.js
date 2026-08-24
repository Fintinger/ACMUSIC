/**
 * IP → 地理位置 (轻量, 仅展示用)
 * 优先使用 ip-api.com (免费, 无 key), 失败时返回空串
 */

const cache = {}

export async function getIpLocation(ip) {
  if (!ip) return ''
  if (cache[ip]) return cache[ip]
  try {
    const res = await fetch(`https://ip-api.com/json/${encodeURIComponent(ip)}?lang=zh-CN&fields=status,country,regionName,city`)
    const json = await res.json()
    const loc = json.status === 'success'
      ? [json.country, json.regionName, json.city].filter(Boolean).join(' · ')
      : ''
    cache[ip] = loc
    return loc
  } catch (e) {
    return ''
  }
}
