/**
 * Dynamic Theme System
 * 从封面图片提取多个主题色，过滤、调整后生成多层渐变背景
 */

/**
 * RGB 颜色对象
 * @typedef {{r:number,g:number,b:number}} RGB
 */

/**
 * 从图片元素提取主色调数组
 * @param {HTMLImageElement} img
 * @returns {RGB[]} 按频率降序排列的颜色数组
 */
export function extractColors(img) {
  try {
    const size = 80
    const canvas = document.createElement('canvas')
    canvas.width = size
    canvas.height = size
    const ctx = canvas.getContext('2d')
    ctx.drawImage(img, 0, 0, size, size)
    const data = ctx.getImageData(0, 0, size, size).data

    // 边缘权重降低（取内部 60% 区域避免边框干扰）
    const margin = Math.floor(size * 0.15)
    const buckets = {}

    for (let y = margin; y < size - margin; y++) {
      for (let x = margin; x < size - margin; x++) {
        const i = (y * size + x) * 4
        const r = data[i]
        const g = data[i + 1]
        const b = data[i + 2]
        const a = data[i + 3]
        if (a < 128) continue

        // 量化到 16 级（减少桶数量但保留足够精度）
        const qr = Math.floor(r / 16)
        const qg = Math.floor(g / 16)
        const qb = Math.floor(b / 16)
        const key = `${qr},${qg},${qb}`

        if (!buckets[key]) {
          buckets[key] = { r: 0, g: 0, b: 0, count: 0 }
        }
        buckets[key].r += r
        buckets[key].g += g
        buckets[key].b += b
        buckets[key].count++
      }
    }

    // 按像素数降序排列，取前 8 个候选
    const sorted = Object.values(buckets)
      .sort((a, b) => b.count - a.count)
      .slice(0, 8)
      .map(b => ({
        r: Math.round(b.r / b.count),
        g: Math.round(b.g / b.count),
        b: Math.round(b.b / b.count),
        count: b.count
      }))

    return sorted
  } catch (e) {
    return []
  }
}

/**
 * 计算亮度 (0-1)
 */
function luminance(r, g, b) {
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255
}

/**
 * 计算饱和度 (0-1)
 */
function saturation(r, g, b) {
  const max = Math.max(r, g, b) / 255
  const min = Math.min(r, g, b) / 255
  if (max === 0) return 0
  return (max - min) / max
}

/**
 * 判断颜色是否适合做暗色背景的主色
 */
function isValidDarkColor(r, g, b) {
  const lum = luminance(r, g, b)
  const sat = saturation(r, g, b)
  // 太亮不行，太饱和不行
  if (lum > 0.55) return false
  if (sat > 0.65) return false
  return true
}

/**
 * 调整颜色使其更暗、更低饱和
 */
function darkenColor(r, g, b, factor = 0.45) {
  const h = rgbToHsl(r, g, b)
  return hslToRgb(
    h[0],
    Math.min(h[1], 0.55), // 限制饱和度
    Math.min(h[2] * factor, 0.28) // 降低亮度
  )
}

/**
 * RGB 转 HSL
 */
function rgbToHsl(r, g, b) {
  r /= 255; g /= 255; b /= 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s, l = (max + min) / 2
  if (max === min) { h = s = 0 }
  else {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return [h, s, l]
}

/**
 * HSL 转 RGB
 */
function hslToRgb(h, s, l) {
  let r, g, b
  if (s === 0) { r = g = b = l }
  else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1
      if (t > 1) t -= 1
      if (t < 1 / 6) return p + (q - p) * 6 * t
      if (t < 1 / 2) return q
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6
      return p
    }
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    r = hue2rgb(p, q, h + 1 / 3)
    g = hue2rgb(p, q, h)
    b = hue2rgb(p, q, h - 1 / 3)
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)]
}

/**
 * 查找适合做背景的暗色
 * 从候选色中依次检查，找到第一个合格的暗色
 */
function findDarkColors(candidates) {
  const results = []
  for (const c of candidates) {
    if (isValidDarkColor(c.r, c.g, c.b)) {
      results.push(darkenColor(c.r, c.g, c.b))
      if (results.length >= 3) break
    }
  }
  // 如果合格颜色不够，从所有候选中强行取（降低标准）
  if (results.length < 2) {
    for (const c of candidates) {
      const [r, g, b] = darkenColor(c.r, c.g, c.b, 0.35)
      // 排除已有的
      const exists = results.some(ex =>
        Math.abs(ex[0] - r) < 15 && Math.abs(ex[1] - g) < 15 && Math.abs(ex[2] - b) < 15
      )
      if (!exists) {
        results.push([r, g, b])
        if (results.length >= 2) break
      }
    }
  }
  return results
}

const FALLBACK = '#1a1a2e'

/**
 * 从图片生成完整的背景 CSS 值
 * @param {HTMLImageElement} img
 * @returns {string} CSS background 属性值
 */
export function buildBackground(img) {
  if (!img) return `linear-gradient(170deg, ${FALLBACK} 0%, #0f0f23 100%)`

  const colors = extractColors(img)
  if (!colors.length) return `linear-gradient(170deg, ${FALLBACK} 0%, #0f0f23 100%)`

  const darkColors = findDarkColors(colors)

  const primary = darkColors[0] || [26, 26, 46]
  const secondary = darkColors[1] || [Math.round(primary[0] * 0.7), Math.round(primary[1] * 0.7), Math.round(primary[2] * 0.7)]

  const p = `rgb(${primary[0]},${primary[1]},${primary[2]})`
  const p2 = `rgba(${primary[0]},${primary[1]},${primary[2]},0.4)`
  const s = `rgb(${secondary[0]},${secondary[1]},${secondary[2]})`

  return [
    // 多层叠加的背景
    `radial-gradient(ellipse 80% 60% at 20% 15%, ${p2} 0%, transparent 55%)`,
    `radial-gradient(ellipse 60% 80% at 80% 85%, ${p2} 0%, transparent 55%)`,
    `radial-gradient(ellipse 50% 50% at 50% 50%, rgba(${primary[0]},${primary[1]},${primary[2]},0.12) 0%, transparent 100%)`,
    `linear-gradient(175deg, ${p} 0%, ${s} 40%, #0f0f23 100%)`
  ].join(',\n    ')
}
