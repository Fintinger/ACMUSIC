/**
 * 解灰音源的展示文案。
 *
 * 后端 `/song/url/match` 现在会透出三个字段（旧版本只有 url）：
 *   source  具体音源，如 bodian / qq / kuwo / kugou / pyncmd
 *   br      码率，单位 bps
 *   size    文件大小，单位字节
 *
 * 以前界面上只能写"第三方源"，用户和排查都看不出到底从哪儿拿的。
 * 这里统一做映射，缺失时退回中性文案，避免出现"解灰完成 · "这种空档。
 */

const SOURCE_LABELS = {
  netease: '网易云音乐',
  pyncmd: 'GD 音乐台',
  bodian: '波点音乐',
  qq: 'QQ 音乐',
  kuwo: '酷我音乐',
  kugou: '酷狗音乐',
  migu: '咪咕音乐',
  joox: 'JOOX',
  bilibili: '哔哩哔哩',
  youtube: 'YouTube',
  ytdlp: 'YouTube',
}

/** 未知音源原样返回，方便发现后端又加了新源 */
export function sourceLabel(source) {
  if (!source) return ''
  return SOURCE_LABELS[source] || String(source)
}

/** 320000 → "320k"；1411200 → "1.4M" */
export function bitrateLabel(br) {
  const value = Number(br)
  if (!value || value <= 0) return ''
  const kbps = Math.round(value / 1000)
  return kbps >= 1000 ? `${(kbps / 1000).toFixed(1)}M` : `${kbps}k`
}

/** 10792943 → "10.3 MB" */
export function sizeLabel(size) {
  const value = Number(size)
  if (!value || value <= 0) return ''
  return `${(value / 1024 / 1024).toFixed(1)} MB`
}

/**
 * 状态胶囊用的一句话：`波点音乐 320k`，信息缺失时退回 `第三方源`。
 * @param {{source?: string, br?: number}} info
 */
export function unblockBrief(info) {
  const parts = [sourceLabel(info && info.source), bitrateLabel(info && info.br)]
  const text = parts.filter(Boolean).join(' ')
  return text || '第三方源'
}

/**
 * 音质按钮 title / 菜单说明用的长文案：`波点音乐 · 320kbps · 10.3 MB`。
 * 全缺时返回空串，由调用方决定怎么措辞。
 * @param {{source?: string, br?: number, size?: number}} info
 */
export function unblockDetail(info) {
  const rate = bitrateLabel(info && info.br)
  const parts = [
    sourceLabel(info && info.source),
    rate ? `${rate}bps` : '',
    sizeLabel(info && info.size),
  ]
  return parts.filter(Boolean).join(' · ')
}

/**
 * 解灰源只有一档固定音质，按钮上写"解灰"其实没有告诉用户任何信息。
 * 按后端返回的 br 反推实际档位，短到能塞进按钮：
 *   ≥700k → SQ（第三方给的 flac，基本都是 CD 级无损）
 *   ≥300k → 320k
 *   ≥180k → 192k
 *   其余   → 按实际码率写（如 128k）
 * br 缺失（老后端 / 某些源不报）返回空串，由调用方退回"解灰"。
 */
export function qualityTierShort(br) {
  const value = Number(br)
  if (!value || value <= 0) return ''
  if (value >= 700000) return 'SQ'
  if (value >= 300000) return '320k'
  if (value >= 180000) return '192k'
  return `${Math.round(value / 1000)}k`
}
