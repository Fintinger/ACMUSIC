/**
 * 通过民政部行政区划 API 解析地区编码为省市名称
 * API: https://dmfw.mca.gov.cn/9095/xzqh/getList
 */

const cache = {}

function padCode(code) {
  const c = String(code)
  return c.padEnd(12, '0')
}

function getProvinceCode(code) {
  const c = String(code)
  return c.substring(0, 2) + '0000000000'
}

async function fetchRegion(code) {
  const url = `https://dmfw.mca.gov.cn/9095/xzqh/getList?code=${code}&maxLevel=1`
  const res = await fetch(url)
  if (!res.ok) throw new Error('API error')
  const json = await res.json()
  return json.data
}

/**
 * 获取省市名称
 * @param {string|number} code - 6位行政区划代码
 * @returns {Promise<string>} 如 "甘肃省 · 天水市"
 */
export async function getLocationName(code) {
  if (!code) return ''
  try {
    const provinceCode = getProvinceCode(code)
    const targetCode = padCode(code)

    let province
    if (cache[provinceCode]) {
      province = cache[provinceCode]
    } else {
      province = await fetchRegion(provinceCode)
      cache[provinceCode] = province
    }

    const parts = [province.name]
    if (province.children) {
      const city = province.children.find(c => c.code === targetCode)
      if (city) parts.push(city.name)
    }
    return parts.join(' · ')
  } catch (e) {
    console.error('Failed to fetch location:', e)
    return ''
  }
}
