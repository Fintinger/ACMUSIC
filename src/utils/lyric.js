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
// 翻译行与原文行的时间戳允许有细微出入（yrc 行首 ms 与 lrc 的 mm:ss.xx 常差几十毫秒）
const TR_MATCH_TOL = 0.35

function tagToSeconds(match) {
  const min = Number(match[1])
  const sec = Number(match[2])
  const ms = match[3] ? Number((match[3] + '00').slice(0, 3)) : 0
  return min * 60 + sec + ms / 1000
}

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

/**
 * 标准 LRC 行 → 时间戳对应的行数组。
 * 老歌词一行常挂多个时间戳（`[00:10.00][01:20.00]副歌`），只取最后一个会让整段重复出现
 * 的副歌在时间轴上凭空少一次，所以这里逐标签展开，正文取最后一个标签之后的部分。
 */
export function parseLrcLines(line) {
  const s = String(line)
  const tags = []
  LRC_TAG_RE.lastIndex = 0
  let m
  while ((m = LRC_TAG_RE.exec(s))) tags.push(m)
  if (!tags.length) return []
  const last = tags[tags.length - 1]
  const text = s.slice(last.index + last[0].length).trim()
  return tags.map(tag => ({ t: tagToSeconds(tag), lytxt: text }))
}

/** 标准 LRC 行 → {t, lytxt}；一行挂多个时间戳时取最后一个（兼容旧调用） */
export function parseLrcLine(line) {
  const rows = parseLrcLines(line)
  return rows.length ? rows[rows.length - 1] : null
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
    const lrcRows = parseLrcLines(line)
    if (lrcRows.length) lrcRows.forEach(r => rows.push({ t: r.t, lytxt: r.lytxt || '<br>', cur: false }))
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
    // 取时间上最接近的一行（容差 TR_MATCH_TOL）。原来用 toFixed(2) 做键精确匹配，
    // 逐字歌词的行首来自 yrc 的毫秒值，和翻译的 mm:ss.xx 常差几十毫秒，翻译会整首丢失。
    const trRows = parseLrcText(tText).filter(r => r.lytxt && r.lytxt !== '<br>')
    if (trRows.length) {
      let j = 0
      rows.forEach(r => {
        // rows / trRows 都按时间升序，最近行的下标只会单调后移
        while (j + 1 < trRows.length && Math.abs(trRows[j + 1].t - r.t) <= Math.abs(trRows[j].t - r.t)) j++
        if (Math.abs(trRows[j].t - r.t) <= TR_MATCH_TOL) r.tr = trRows[j].lytxt
      })
    }
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
