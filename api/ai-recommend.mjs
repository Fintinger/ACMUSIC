// AI 点歌辅助服务
//
// 职责只有一件事：把「一句话」翻译成「曲库里真实存在的歌」。
//
// 为什么需要独立服务而不是前端直接调模型：
//   1. API key 不能进 dist —— 仓库是公开的，打包进去等于公开泄露；
//   2. LLM 会编造歌名，必须由服务端拿候选词回查曲库，只有查得到的才交给用户；
//   3. 限流、缓存、超时兜底放在服务端才有意义。
//
// 依赖零第三方包：Node 18+ 自带 fetch，用一个 http server 就够。
// 启动：node api/ai-recommend.mjs
//
// 环境变量：
//   DEEPSEEK_API_KEY   必填才能用真模型；不配则退化为「原话直搜」，功能不崩
//   DEEPSEEK_BASE_URL  默认 https://api.deepseek.com
//   DEEPSEEK_MODEL     默认 deepseek-chat
//   NETEASE_API_BASE   上游 API 根地址。生产默认 http://127.0.0.1:3000（同机直连，不过公网）
//                      本地调试可设 https://music.archai.space/api
//   AI_PORT            默认 3002

import http from 'node:http'
import { createHash } from 'node:crypto'

const PORT = Number(process.env.AI_PORT || 3002)
const DEEPSEEK_API_KEY = (process.env.DEEPSEEK_API_KEY || '').trim()
const DEEPSEEK_BASE_URL = (process.env.DEEPSEEK_BASE_URL || 'https://api.deepseek.com').replace(/\/+$/, '')
const DEEPSEEK_MODEL = process.env.DEEPSEEK_MODEL || 'deepseek-chat'
const NETEASE_API_BASE = (process.env.NETEASE_API_BASE || 'http://127.0.0.1:3000').replace(/\/+$/, '')

/** 单次请求体上限：只收一句话加几轮历史，8KB 绰绰有余，挡住畸形大包 */
const MAX_BODY_BYTES = 8 * 1024
/** 模型超时：DeepSeek 正常 3-8s，30s 还没回就当失败走降级，别让用户干等 */
const LLM_TIMEOUT_MS = 30000
/** 单次搜索超时：网关对 /cloudsearch 有 60s 缓存，这里 8s 足够 */
const SEARCH_TIMEOUT_MS = 8000
/** 一张歌单最多多少首：太多会稀释"精选感"，18 首正好一小时的量 */
const MAX_TRACKS = 18
/** 每个关键词取几条候选，用于轮转合并 */
const PER_KEYWORD = 6

// ---------------------------------------------------------------------------
// 日志：只打决策链路，不打 key、不打完整用户输入（可能含隐私）
// ---------------------------------------------------------------------------

function log(...args) {
    console.log(new Date().toISOString(), ...args)
}

/** 截断成可安全落日志的摘要 */
function brief(text, n = 24) {
    const s = String(text || '').replace(/\s+/g, ' ').trim()
    return s.length > n ? s.slice(0, n) + '…' : s
}

// ---------------------------------------------------------------------------
// 上游请求
// ---------------------------------------------------------------------------

/**
 * 带超时的 fetch。
 * AbortSignal.timeout 在 Node 18+ 可用；超时会抛 TimeoutError，由调用方决定降级还是丢弃。
 */
async function fetchJson(url, init = {}, timeoutMs = 10000) {
    const res = await fetch(url, {...init, signal: AbortSignal.timeout(timeoutMs)})
    if (!res.ok) {
        throw new Error(`upstream ${res.status} ${res.statusText}`)
    }
    return res.json()
}

// ---------------------------------------------------------------------------
// 标签白名单：给模型一份「曲库官方词表」，让它用能搜到的词思考
// ---------------------------------------------------------------------------

/**
 * 从 /recommend/category/configs 取分类与标签。
 * 这份配置只是用来喂 prompt 的参考词表，取不到也不影响主流程（用内置兜底词表），
 * 所以这里所有失败都静默降级，绝不让它阻塞选歌。
 */
const FALLBACK_VOCAB = {
    曲风: ['华语流行', '欧美流行', '民谣', '摇滚', '说唱', '电音', 'R&B', '爵士', '古典', '轻音乐', '国风', '二次元', '独立', '金属', '蓝调', '乡村'],
    情绪: ['伤感', '放松', '抒情', '欢快', '浪漫', '兴奋', '思念', '治愈'],
    场景: ['学习', '助眠', '运动', '驾车', '聚会', '通勤', '咖啡厅']
}

let vocabCache = {at: 0, vocab: FALLBACK_VOCAB}
const VOCAB_TTL_MS = 6 * 60 * 60 * 1000

async function getVocab() {
    if (Date.now() - vocabCache.at < VOCAB_TTL_MS) return vocabCache.vocab
    try {
        const json = await fetchJson(`${NETEASE_API_BASE}/recommend/category/configs`, {}, 5000)
        const cats = json && json.data && json.data.categorys
        if (Array.isArray(cats) && cats.length) {
            const vocab = {}
            for (const c of cats) {
                const names = (c.tagVOList || []).map(t => t.tagName).filter(Boolean)
                if (names.length) vocab[c.categoryName] = names
            }
            if (Object.keys(vocab).length) {
                vocabCache = {at: Date.now(), vocab}
                return vocab
            }
        }
    } catch (e) {
        log('[vocab] 拉取失败，沿用兜底词表:', e.message)
    }
    // 失败也刷新时间戳，避免每个请求都去打一次上游
    vocabCache = {at: Date.now(), vocab: vocabCache.vocab}
    return vocabCache.vocab
}

/** 把词表压成一行行「分类：a、b、c」，控制在 prompt 可接受的长度 */
function vocabLines(vocab) {
    return Object.entries(vocab)
        .map(([cat, names]) => `${cat}：${names.slice(0, 20).join('、')}`)
        .join('\n')
}

// ---------------------------------------------------------------------------
// 意图解析
// ---------------------------------------------------------------------------

function systemPrompt(vocab) {
    return `你是网易云音乐的选歌编辑。用户会用一句口语说出想听什么，你的任务不是列举歌名，而是把它翻译成「能被曲库搜到的意图」。

只输出一个 JSON 对象，不要 markdown 代码块，不要任何解释文字：
{
  "title": "歌单名，6-10 个汉字，有画面感，不加书名号或引号",
  "desc": "一句话说明这张歌单的选歌逻辑，不超过 30 个汉字",
  "reply": "回给用户的一句话，口语化，不超过 20 个汉字",
  "keywords": ["3-5 个搜索词"]
}

keywords 是唯一会被拿去搜曲库的东西，规则很硬：
- 3-5 个关键词里，至少 2 个必须是具体的歌手名/乐队名。歌手是最可靠的检索锚点：按人搜出来的歌，质量远高于按抽象风格词搜出来的
- 剩下 1-2 个给「风格 + 乐器/语种」这种能落到具体作品上的方向（如「粤语 老歌」「钢琴 独奏」「爵士 人声」）
- 不要用两个抽象概念硬拼（「氛围 电子」「治愈 抒情」「安静 钢琴」）。这类词搜出来的前排都是把关键词直接当歌名的批量上传垫音，不是真的歌
- 绝对不要写具体歌名。你记忆里的歌名有相当一部分在曲库里不存在或对不上，写了就是浪费一次搜索
- 不要含「推荐」「好听」「歌曲」「音乐」「来点」这类没有检索价值的词
- 几个词之间要拉开方向，不要同义反复：「安静的钢琴」和「钢琴 安静」是同一个词
- 中文优先；用户点名了外语歌手才用原文名

曲库官方标签如下，风格词尽量从这里选，命中率明显更高：
${vocabLines(vocab)}`
}

/**
 * 调 DeepSeek 解析意图。
 * 失败一律抛错，由上层决定降级——这里不做静默兜底，免得把"模型挂了"伪装成"模型说没听懂"。
 */
async function parseIntent(message, history) {
    const vocab = await getVocab()
    const payload = {
        model: DEEPSEEK_MODEL,
        messages: [
            {role: 'system', content: systemPrompt(vocab)},
            ...normalizeHistory(history),
            {role: 'user', content: message}
        ],
        // json_object 模式要求 prompt 里出现 "json" 字样，system 里已经写了
        response_format: {type: 'json_object'},
        temperature: 1.0,
        max_tokens: 600
    }
    const json = await fetchJson(`${DEEPSEEK_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify(payload)
    }, LLM_TIMEOUT_MS)

    const content = json && json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content
    if (!content) throw new Error('模型返回空内容')

    let parsed
    try {
        parsed = JSON.parse(content)
    } catch (e) {
        // 极少数情况下模型会在 JSON 外面包一层文字，捞最外层花括号再试一次
        const m = content.match(/\{[\s\S]*\}/)
        if (!m) throw new Error('模型输出不是 JSON')
        parsed = JSON.parse(m[0])
    }
    return sanitizeIntent(parsed, message)
}

/** 历史只留最近 6 条、每条 200 字：够理解「再来点更吵的」这类追问，又不至于把歌单塞进 prompt */
function normalizeHistory(history) {
    if (!Array.isArray(history)) return []
    return history
        .filter(m => m && (m.role === 'user' || m.role === 'assistant') && typeof m.content === 'string')
        .slice(-6)
        .map(m => ({role: m.role, content: m.content.slice(0, 200)}))
}

/**
 * 收口模型输出。
 * 模型是外部输入源，字段缺失、类型错误、超长都必须在这里挡住，
 * 否则一个 null 的 keywords 会让后面 Promise.all 直接炸掉。
 */
function sanitizeIntent(raw, message) {
    const o = raw && typeof raw === 'object' ? raw : {}
    const title = String(o.title || '').replace(/[《》"“”]/g, '').trim().slice(0, 16) || '给你挑的歌'
    const desc = String(o.desc || '').trim().slice(0, 40)
    const reply = String(o.reply || '').trim().slice(0, 30) || '按你说的挑了一些'

    let keywords = Array.isArray(o.keywords) ? o.keywords : []
    keywords = keywords
        .map(k => String(k == null ? '' : k).trim())
        .filter(k => k.length >= 2 && k.length <= 24)
    keywords = [...new Set(keywords)].slice(0, 5)
    // 模型没给出可用词时退回原话：搜索质量差，但总比返回空歌单强
    if (!keywords.length) keywords = [message.slice(0, 24)]

    return {title, desc, reply, keywords}
}

// ---------------------------------------------------------------------------
// 曲库检索
// ---------------------------------------------------------------------------

/** 明确的垃圾条目：翻唱伴奏、铃声片段、试听版。用户点名要这些时保留 */
const JUNK_PATTERN = /(伴奏|片段|铃声|试听|升调|降调|抢听)/

/**
 * 堆关键词的"SEO 歌名"。
 * 实测搜「氛围 电子」会捞出《氛围 电子 旋律说唱 TRAP 慢速度 沉浸（氛围2）》这类条目 ——
 * 它们把搜索词直接写进标题骗曝光，实际是低成本批量上传的音频。
 * 特征很稳定：标题很长且被空格切得很碎，正常歌名不会这样。
 */
function isSpamTitle(name) {
    const s = String(name || '')
    if (!s) return false
    return s.length > 22 && s.trim().split(/\s+/).length >= 4
}

/** 同一个歌手的上限：不设的话，"久石让"一个关键词就能把半张歌单占满 */
const MAX_PER_ARTIST = 2

/**
 * 歌手数组。
 * cloudsearch 返回 `ar`，/playlist/track/all 的老数据可能只有 `artists` ——
 * 取不到歌手会让「每歌手最多 2 首」和「蹭词判定」同时失效，所以这里必须兼容两种。
 */
function artistsOf(song) {
    const a = song && (song.ar || song.artists)
    return Array.isArray(a) ? a : []
}

/** 时长：`dt` 是云搜索格式，`duration` 是老格式 */
function durationOf(song) {
    return Number((song && (song.dt || song.duration)) || 0)
}

/**
 * 蹭关键词的歌。
 *
 * 搜「氛围 电子」时，第一屏常年是《氛围电子》《氛围电子配乐》这类条目 ——
 * 作者把搜索词直接当歌名，靠精确匹配骗曝光，实际是批量上传的氛围垫音。
 * 判据：多词关键词去空格后出现在歌名里，而歌手名里并没有这个词。
 * 实测这类条目往往长成《谁 钢琴独奏》《Maybe 钢琴独奏2》——词在中间，所以用 contains 而非 startsWith。
 *
 * 只对**多词**关键词生效：单个词（钢琴、爵士）本身可能就是正当歌名，套用会误杀。
 */
function isKeywordBait(song, keywords) {
    const name = String(song.name || '').replace(/\s+/g, '').toLowerCase()
    if (!name) return false
    const artists = artistsOf(song).map(a => String(a.name || '').replace(/\s+/g, '').toLowerCase())
    for (const kw of keywords) {
        const raw = String(kw || '')
        if (!/\s/.test(raw)) continue
        const compact = raw.replace(/\s+/g, '').toLowerCase()
        if (compact.length < 3) continue
        if (artists.some(a => a && a.includes(compact))) continue
        if (name.includes(compact)) return true
    }
    return false
}

function isUsable(song, allowJunk, keywords) {
    if (!song || !song.id) return false
    // 时长异常：短于 30s 多半是铃声/片段，长于 15min 多半是电台节目
    const dt = durationOf(song)
    if (dt && (dt < 30000 || dt > 900000)) return false
    // privilege.st < 0 是下架/无版权，能搜到但播不了，进歌单只会让人点一下失败
    const privilege = song.privilege
    if (privilege && typeof privilege.st === 'number' && privilege.st < 0) return false
    if (!allowJunk && JUNK_PATTERN.test(String(song.name || ''))) return false
    if (isSpamTitle(song.name)) return false
    // 歌手名和歌名一模一样：正常作品不会这样填，基本都是上传者的占位写法
    const lead = leadArtistOf(song)
    if (lead && String(song.name || '').trim() === lead.trim()) return false
    if (keywords && keywords.length && isKeywordBait(song, keywords)) return false
    return true
}

/** 去重键：同名不同版（Live/Remaster/不同专辑）在曲库里是两条记录，用户眼里却是同一首 */
function identityOf(song) {
    const name = String(song.name || '').toLowerCase().replace(/\s+/g, '')
    const first = artistsOf(song)[0]
    const artist = first && first.name ? String(first.name).toLowerCase() : ''
    return name + '@' + artist
}

/** 主歌手名，用于限流每个歌手的出现次数 */
function leadArtistOf(song) {
    const first = artistsOf(song)[0]
    return (first && first.name) || ''
}

async function searchOnce(keyword, limit = PER_KEYWORD) {
    const url = `${NETEASE_API_BASE}/cloudsearch?keywords=${encodeURIComponent(keyword)}&type=1&limit=${limit}`
    try {
        const json = await fetchJson(url, {}, SEARCH_TIMEOUT_MS)
        const songs = json && json.result && json.result.songs
        return Array.isArray(songs) ? songs : []
    } catch (e) {
        // 单个词失败不影响其他词：并发里一个 502 不该让整张歌单归零
        log('[search] 失败:', brief(keyword), e.message)
        return []
    }
}

/**
 * 歌单补位。
 *
 * 单曲搜索的短板是「边角料」：按「下雨天 钢琴」搜单曲，会捞出一堆名字里带这两个词、
 * 但没人听过的上传作品。而同一个词搜**歌单**，排在前面的往往是几万人收藏过的编排结果 ——
 * 人工选过的曲目列表，质量天然高一档。
 *
 * 所以只在单曲搜索凑不够曲目时用它补位：平时不付这份延迟，缺料时才有兜底。
 * 返回的是若干候选桶（不在这里合并），由调用方的 picker 统一去重与限流。
 */
async function searchPlaylistBuckets(keyword, want = 8) {
    try {
        const searchUrl = `${NETEASE_API_BASE}/cloudsearch?keywords=${encodeURIComponent(keyword)}&type=1000&limit=3`
        const json = await fetchJson(searchUrl, {}, SEARCH_TIMEOUT_MS)
        const lists = (json && json.result && json.result.playlists) || []
        // 取前两个高播放量歌单：单个歌单容易偏向某一种编排口味
        const picked = lists.slice(0, 2).filter(p => p && p.id)
        if (!picked.length) return []

        const details = await Promise.all(picked.map(p =>
            fetchJson(`${NETEASE_API_BASE}/playlist/track/all?id=${p.id}&limit=${want}`, {}, SEARCH_TIMEOUT_MS)
                .catch(() => null)
        ))
        return details.map(d => (d && Array.isArray(d.songs)) ? d.songs : []).filter(b => b.length)
    } catch (e) {
        log('[seed] 歌单补位失败:', brief(keyword), e.message)
        return []
    }
}

/**
 * 造一个「收歌器」：把去重、过滤、歌手配额这些规则收在一处，
 * 让「轮转填充」和「歌单补位」共用同一套判定，不会出现补位把重复歌塞回来的情况。
 */
function createPicker(allowJunk, keywords = []) {
    const out = []
    const seenId = new Set()
    const seenIdentity = new Set()
    const artistCount = new Map()

    return {
        add(song) {
            if (out.length >= MAX_TRACKS) return false
            if (!song || seenId.has(song.id) || !isUsable(song, allowJunk, keywords)) return false

            const identity = identityOf(song)
            if (seenIdentity.has(identity)) return false

            const artist = leadArtistOf(song)
            if (artist) {
                const used = artistCount.get(artist) || 0
                if (used >= MAX_PER_ARTIST) return false
                artistCount.set(artist, used + 1)
            }

            seenId.add(song.id)
            seenIdentity.add(identity)
            out.push(song)
            return true
        },
        get list() {
            return out
        }
    }
}

/**
 * 多关键词轮转填充。
 *
 * 不用「拼起来按相关性排」的原因：cloudsearch 的相关性分数不可比，
 * 第一个词的前 6 首会把后面所有词挤掉，歌单就变成"一个人的歌"。
 * 按轮次交错（每个词各取第 1 首、再各取第 2 首…）能让风格自然铺开。
 */
function fillRoundRobin(picker, buckets) {
    const depth = buckets.reduce((m, b) => Math.max(m, b.length), 0)
    for (let i = 0; i < depth; i++) {
        for (const bucket of buckets) {
            picker.add(bucket[i])
            if (picker.list.length >= MAX_TRACKS) return
        }
    }
}

// ---------------------------------------------------------------------------
// 主流程
// ---------------------------------------------------------------------------

/** 没有 key 时的降级：原话直接搜。宁可给一张不那么准的歌单，也不要给用户一个报错页 */
function fallbackIntent(message) {
    const text = String(message || '').trim()
    return {
        title: text.slice(0, 12) || '按你说的找',
        desc: '没接上大模型，先按你的原话搜了一遍',
        reply: '先按原话搜的，可能不太准',
        keywords: [text.slice(0, 24)].filter(Boolean)
    }
}

async function buildPlaylist(message, history) {
    const allowJunk = JUNK_PATTERN.test(message)
    let intent
    let degraded = null

    if (!DEEPSEEK_API_KEY) {
        degraded = 'no-key'
        intent = fallbackIntent(message)
    } else {
        try {
            intent = await parseIntent(message, history)
        } catch (e) {
            degraded = 'llm-failed'
            log('[llm] 解析失败，降级为直搜:', e.message)
            intent = fallbackIntent(message)
        }
    }

    const buckets = await Promise.all(intent.keywords.map(k => searchOnce(k)))
    const picker = createPicker(allowJunk, intent.keywords)
    fillRoundRobin(picker, buckets)

    // 曲目不够就补：场景/情绪类请求靠单曲搜索经常凑不满，歌单种子能把这一档质量拉回来
    if (picker.list.length < Math.ceil(MAX_TRACKS * 0.6)) {
        log('[seed] 单曲不足（' + picker.list.length + ' 首），用歌单补位')
        const seedBuckets = await Promise.all(
            intent.keywords.slice(0, 2).map(k => searchPlaylistBuckets(k))
        )
        for (const bucket of seedBuckets.flat()) {
            for (const song of bucket) picker.add(song)
        }
    }

    const tracks = picker.list

    // 关键词全军覆没时用歌单名再捞一次：模型起的名字往往就是最贴近的检索词
    if (!tracks.length && intent.title) {
        log('[search] 关键词无结果，用歌单名兜底:', brief(intent.title))
        const retry = createPicker(allowJunk, [intent.title])
        await Promise.all([
            searchOnce(intent.title, MAX_TRACKS).then(b => fillRoundRobin(retry, [b])),
            searchPlaylistBuckets(intent.title, 6).then(bs => {
                for (const b of bs) for (const s of b) retry.add(s)
            })
        ])
        tracks = retry.list
    }

    return {
        playlist: {
            title: intent.title,
            desc: intent.desc,
            reply: intent.reply,
            keywords: intent.keywords,
            tracks
        },
        degraded
    }
}

// ---------------------------------------------------------------------------
// 限流与缓存
// ---------------------------------------------------------------------------

/** 每 IP 每分钟 10 次。模型按 token 计费，这里必须有一道闸，否则被刷就是直接烧钱 */
const RATE_LIMIT = 10
const RATE_WINDOW_MS = 60 * 1000
const rateBuckets = new Map()

function allowRequest(ip) {
    const now = Date.now()
    let b = rateBuckets.get(ip)
    if (!b || now > b.resetAt) {
        b = {count: 0, resetAt: now + RATE_WINDOW_MS}
        rateBuckets.set(ip, b)
    }
    b.count++
    return b.count <= RATE_LIMIT
}

/**
 * 结果缓存：同一句话 5 分钟内只打一次模型。
 * 用户手抖连点两次发送、或刷新页面重问，都不该产生第二次 token 账单。
 */
const CACHE_TTL_MS = 5 * 60 * 1000
const CACHE_MAX = 200
const resultCache = new Map()

function cacheKey(message, history) {
    const h = normalizeHistory(history).map(m => m.role + ':' + m.content).join('|')
    return createHash('sha1').update(message + '\n' + h).digest('hex').slice(0, 16)
}

function readCache(key) {
    const hit = resultCache.get(key)
    if (!hit) return null
    if (Date.now() - hit.at > CACHE_TTL_MS) {
        resultCache.delete(key)
        return null
    }
    return hit.value
}

function writeCache(key, value) {
    if (resultCache.size >= CACHE_MAX) {
        // Map 保持插入顺序，删最早的一条即可，不必引入 LRU 实现
        const oldest = resultCache.keys().next().value
        if (oldest) resultCache.delete(oldest)
    }
    resultCache.set(key, {at: Date.now(), value})
}

// 定期清理限流表，避免长期运行后按 IP 无限增长
const sweeper = setInterval(() => {
    const now = Date.now()
    for (const [ip, b] of rateBuckets) {
        if (now > b.resetAt + RATE_WINDOW_MS) rateBuckets.delete(ip)
    }
}, 10 * 60 * 1000)
sweeper.unref()

// ---------------------------------------------------------------------------
// HTTP
// ---------------------------------------------------------------------------

function sendJson(res, status, body) {
    const buf = Buffer.from(JSON.stringify(body))
    res.writeHead(status, {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Length': buf.length,
        // 这个服务只被同源 nginx 反代，不需要 CORS；显式禁掉缓存，
        // 结果的新鲜度由服务端自己的 5 分钟缓存决定，不由浏览器/CDN 决定
        'Cache-Control': 'no-store'
    })
    res.end(buf)
}

function readBody(req) {
    return new Promise((resolve, reject) => {
        let size = 0
        const chunks = []
        req.on('data', chunk => {
            size += chunk.length
            if (size > MAX_BODY_BYTES) {
                reject(new Error('请求体过大'))
                req.destroy()
                return
            }
            chunks.push(chunk)
        })
        req.on('end', () => {
            const raw = Buffer.concat(chunks).toString('utf8')
            if (!raw) return resolve({})
            try {
                resolve(JSON.parse(raw))
            } catch (e) {
                reject(new Error('请求体不是合法 JSON'))
            }
        })
        req.on('error', reject)
    })
}

/** 取真实客户端 IP：nginx 反代时 X-Real-IP 才是准的，直连时用 remoteAddress */
function clientIp(req) {
    const forwarded = req.headers['x-real-ip'] || (req.headers['x-forwarded-for'] || '').split(',')[0]
    return (forwarded || req.socket.remoteAddress || 'unknown').trim()
}

const server = http.createServer(async (req, res) => {
    const started = Date.now()
    const url = new URL(req.url || '/', 'http://localhost')

    // 健康检查同时接受裸路径和带 /api 前缀的路径：
    // 直连 3002 调试走 /health，经 nginx（/api/ai/ → 3002/api/ai/）走 /api/ai/health
    if (req.method === 'GET' && (url.pathname === '/health' || url.pathname === '/api/ai/health')) {
        return sendJson(res, 200, {
            ok: true,
            model: DEEPSEEK_API_KEY ? DEEPSEEK_MODEL : null,
            // 前端拿这个决定要不要提示「AI 未启用」
            aiEnabled: Boolean(DEEPSEEK_API_KEY),
            upstream: NETEASE_API_BASE
        })
    }

    if (url.pathname !== '/api/ai/playlist') {
        return sendJson(res, 404, {ok: false, error: 'not found'})
    }
    if (req.method !== 'POST') {
        return sendJson(res, 405, {ok: false, error: '只接受 POST'})
    }

    const ip = clientIp(req)
    if (!allowRequest(ip)) {
        log('[rate] 触发限流:', ip)
        return sendJson(res, 429, {ok: false, error: '问得有点快，歇一分钟再来'})
    }

    let body
    try {
        body = await readBody(req)
    } catch (e) {
        return sendJson(res, 400, {ok: false, error: e.message})
    }

    const message = String(body.message || '').trim()
    if (message.length < 2) {
        return sendJson(res, 400, {ok: false, error: '说点什么吧，比如「下雨天想听钢琴」'})
    }
    if (message.length > 200) {
        return sendJson(res, 400, {ok: false, error: '一次说短一点，200 字以内'})
    }

    const history = Array.isArray(body.history) ? body.history : []
    const key = cacheKey(message, history)
    const cached = readCache(key)
    if (cached) {
        log('[cache] 命中:', brief(message), `${Date.now() - started}ms`)
        // tookMs 用本次真实耗时，别把首次请求的耗时带出去，否则看起来像"缓存也要 2 秒"
        return sendJson(res, 200, {...cached, cached: true, tookMs: Date.now() - started})
    }

    try {
        const result = await buildPlaylist(message, history)
        const payload = {
            ok: true,
            ...result,
            cached: false,
            tookMs: Date.now() - started
        }
        writeCache(key, payload)
        log('[ok]', brief(message), '→', brief(result.playlist.title),
            `keywords=${result.playlist.keywords.length}`,
            `tracks=${result.playlist.tracks.length}`,
            result.degraded ? `degraded=${result.degraded}` : '',
            `${payload.tookMs}ms`)
        return sendJson(res, 200, payload)
    } catch (e) {
        log('[err]', brief(message), e && e.stack ? e.stack.split('\n')[0] : e)
        return sendJson(res, 500, {ok: false, error: '选歌失败了，稍后再试一次'})
    }
})

server.listen(PORT, '127.0.0.1', () => {
    log(`AI 选歌服务已启动 http://127.0.0.1:${PORT}`)
    log(`  上游曲库: ${NETEASE_API_BASE}`)
    log(`  模型: ${DEEPSEEK_API_KEY ? DEEPSEEK_MODEL : '未配置 DEEPSEEK_API_KEY（降级为原话直搜）'}`)
})
