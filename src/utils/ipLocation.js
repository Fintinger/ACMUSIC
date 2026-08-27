/**
 * IP → 地理位置（仅展示用）
 *
 * 策略：
 *   1. 高德 Web 服务 API（国内 IP 精度最高，需 Key，见 .env VUE_APP_AMAP_KEY）
 *   2. 高德解析不出（海外 IP）时，回退 ipwho.is（全球覆盖，免费、CORS 开放、国内可访问）
 *
 * 高德 Key 申请：
 *   1. https://lbs.amap.com/dev/key/app 注册
 *   2. 「添加 Key」→ Key 类型选「Web 服务」（不是 JS API）
 *   3. 填入 .env 的 VUE_APP_AMAP_KEY
 */

const cache = {}

// 去掉「省/市/自治区」等后缀，直辖市省市相同只显示一个
function simplifyCn(name) {
  if (!name) return ''
  return name
    .replace(/省|市|自治区|特别行政区|壮族自治区|回族自治区|维吾尔自治区$/, '')
    .replace('·', '')
    .trim()
}

function formatGlobal(json) {
  if (!json || !json.success) return ''
  const country = json.country || ''
  const city = json.city || json.region || ''
  if (country && city && country !== city) return `${country} · ${city}`
  return country || city
}

export async function getIpLocation(ip) {
  if (!ip) return ''
  if (cache[ip]) return cache[ip]

  // 1) 高德（国内）
  const key = process.env.VUE_APP_AMAP_KEY
  if (key && !key.includes('请替换')) {
    try {
      const url = `https://restapi.amap.com/v3/ip?key=${encodeURIComponent(key)}&ip=${encodeURIComponent(ip)}`
      const res = await fetch(url)
      const json = await res.json()
      if (json.status === '1' && json.province) {
        const prov = simplifyCn(json.province)
        const city = simplifyCn(json.city)
        const loc = prov && city && prov !== city ? `${prov} · ${city}` : (prov || city || '')
        if (loc) { cache[ip] = loc; return loc }
      }
    } catch (e) { /* 高德失败，走兜底 */ }
  }

  // 2) ipwho.is（全球兜底，含海外 IP）
  try {
    const res = await fetch(`https://ipwho.is/${encodeURIComponent(ip)}`)
    const json = await res.json()
    const loc = formatGlobal(json)
    if (loc) { cache[ip] = loc; return loc }
  } catch (e) { /* 忽略 */ }

  return ''
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
