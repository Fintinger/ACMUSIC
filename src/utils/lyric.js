/**
 * 网易云歌词解析（纯函数，无 Vue 依赖，便于单测）
 *
 * `/lyric/new` 返回多份歌词，且 lrc / yrc 内可能混有三种行格式：
 *   1. 标准 LRC            [mm:ss.xxx]文本
 *   2. 富文本行（原样透传）  {"t":1000,"c":[{"tx":"作词: "},{"tx":"周杰伦","li":"..."}]}
 *   3. yrc 逐字行          [行起始ms,行时长ms](字起始ms,字时长ms,保留)字...
 *
 * 老歌大量没有 yrc，此时退化到 lrc 逐行高亮。
 * 输出统一为 { t, lytxt, cur, words?, wcur?, tr? }，按 t 升序。
 */

const LRC_TAG_RE = /\[(\d{1,3}):(\d{1,2})(?:[.:](\d{1,3}))?\]/g
const YRC_HEAD_RE = /^\[(\d+),(\d+)\]/
const YRC_WORD_RE = /\((\d+),(\d+),-?\d+\)([^()]*)/g

/** 富文本行 → {t, lytxt}；不是富文本返回 null */
export function parseJsonLyricLine(line) {
  if (String(line).charAt(0) !== '{') return null
  try {
    const o = JSON.parse(line)
    if (!o || typeof o.t !== 'number' || !Array.isArray(o.c)) return null
    const txt = o.c.map(x => (x && (x.tx || x.txt)) || '').join('').trim()
    return { t: o.t / 1000, lytxt: txt }
  } catch (e) {
    return null
  }
}

/** 标准 LRC 行 → {t, lytxt}；一行挂多个时间戳时取最后一个 */
export function parseLrcLine(line) {
  LRC_TAG_RE.lastIndex = 0
  if (!LRC_TAG_RE.test(String(line))) return null
  LRC_TAG_RE.lastIndex = 0
  let last = null
  let m
  while ((m = LRC_TAG_RE.exec(line))) last = m
  const min = Number(last[1])
  const sec = Number(last[2])
  const ms = last[3] ? Number((last[3] + '00').slice(0, 3)) : 0
  return { t: min * 60 + sec + ms / 1000, lytxt: line.slice(last.index + last[0].length).trim() }
}

/** yrc 逐字行 → {t, lytxt, words:[{t,d,txt}]} */
export function parseYrcLine(line) {
  const s = String(line)
  const head = YRC_HEAD_RE.exec(s)
  if (!head) return null
  const body = s.slice(head[0].length)
  const words = []
  YRC_WORD_RE.lastIndex = 0
  let m
  while ((m = YRC_WORD_RE.exec(body))) {
    words.push({ t: Number(m[1]) / 1000, d: Number(m[2]) / 1000, txt: m[3] })
  }
  if (!words.length) return null
  return { t: Number(head[1]) / 1000, lytxt: words.map(w => w.txt).join(''), words }
}

/** 逐行歌词文本（标准 LRC 与富文本混排）→ 行数组 */
export function parseLrcText(text) {
  const rows = []
  String(text || '').split('\n').forEach(raw => {
    const line = raw.trim()
    if (!line) return
    const jsonRow = parseJsonLyricLine(line)
    if (jsonRow) {
      if (jsonRow.lytxt) rows.push({ t: jsonRow.t, lytxt: jsonRow.lytxt, cur: false })
      return
    }
    const lrcRow = parseLrcLine(line)
    if (lrcRow) rows.push({ t: lrcRow.t, lytxt: lrcRow.lytxt || '<br>', cur: false })
  })
  return rows.sort((a, b) => a.t - b.t)
}

/** 逐字歌词文本（yrc）→ 行数组，每行带 words/wcur */
export function parseYrcText(text) {
  const rows = []
  String(text || '').split('\n').forEach(raw => {
    const line = raw.trim()
    if (!line) return
    const jsonRow = parseJsonLyricLine(line)
    if (jsonRow) {
      if (jsonRow.lytxt) rows.push({ t: jsonRow.t, lytxt: jsonRow.lytxt, cur: false })
      return
    }
    const yrcRow = parseYrcLine(line)
    if (yrcRow) rows.push({ t: yrcRow.t, lytxt: yrcRow.lytxt || '<br>', words: yrcRow.words, wcur: -1, cur: false })
  })
  return rows.sort((a, b) => a.t - b.t)
}

/**
 * 解析 `/lyric/new` 的整体返回。
 * @param {object} data 接口 data
 * @returns {Array} 行数组，已挂翻译 tr（若有）
 */
export function parseLyricData(data) {
  const d = data || {}
  const yText = d.yrc && d.yrc.lyric
  const lText = d.lrc && d.lrc.lyric
  const tText = d.tlyric && d.tlyric.lyric

  let rows = yText ? parseYrcText(yText) : []
  // yrc 里可能只有版权行没有逐字行，这种情况仍退化到 lrc
  if (!rows.some(r => r.words && r.words.length)) rows = lText ? parseLrcText(lText) : []
  if (!rows.length) return []

  if (tText) {
    const trMap = {}
    parseLrcText(tText).forEach(r => {
      if (r.lytxt && r.lytxt !== '<br>') trMap[r.t.toFixed(2)] = r.lytxt
    })
    rows.forEach(r => {
      const tr = trMap[r.t.toFixed(2)]
      if (tr) r.tr = tr
    })
  }
  return rows
}

/**
 * 计算某个时刻应该高亮的行下标。
 * @param {Array} rows 已排序行数组
 * @param {number} time 当前播放秒数
 * @returns {number} 下标，-1 表示还没到第一行
 */
export function findActiveIndex(rows, time) {
  if (!rows || !rows.length) return -1
  let idx = -1
  for (let i = 0; i < rows.length; i++) {
    if (rows[i].t <= time) idx = i
    else break
  }
  return idx
}

/**
 * 计算行内逐字进度：返回最后一个已到时间的字下标，-1 表示还没开始。
 */
export function findActiveWord(line, time) {
  if (!line || !line.words || !line.words.length) return -1
  let idx = -1
  for (let i = 0; i < line.words.length; i++) {
    if (line.words[i].t <= time) idx = i
    else break
  }
  return idx
}
