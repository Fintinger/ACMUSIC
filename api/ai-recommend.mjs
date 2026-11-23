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
/**
 * 两阶段的规模参数。
 *
 * 阶段一按关键词宽召回，故意比最终歌单多一倍以上 —— 候选太少，第二阶段没有挑选余地，
 * 模型只能"矮子里拔将军"，那还不如不挑。
 */
const MAX_RECALL = 40
/** 最终歌单首数：太多会稀释"精选感"，16 首约一小时的量 */
const MAX_TRACKS = 16
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

function systemPrompt(vocab, exclude, recentKeywords) {
    const current = Array.isArray(exclude) && exclude.length ? exclude.join('、') : '（无）'
    return `你是 ACMUSIC 的选歌助手。用户会用一句口语说出想听什么，你的任务不是列举歌名，而是把它翻译成「能被曲库搜到的意图」。

只输出一个 JSON 对象，不要 markdown 代码块，不要任何解释文字：
{
  "intent": "music 或 chat",
  "media": "track 或 album",
  "title": "歌单名，6-10 个汉字，有画面感，不加书名号或引号",
  "desc": "一句话说明这张歌单的选歌逻辑，不超过 30 个汉字",
  "reply": "回给用户的一句话",
  "keywords": ["6-10 个搜索词"],
  "exclude": ["1-3 个要排除的方向"]
}

media 决定用哪个曲库通道搜：
- album：用户要的是「整张作品」——影视原声/OST、某张专辑、某部作品的配乐（例：「宫崎骏电影原声」「星际穿越配乐」）
- track：其余情况，一律 track。这是默认值，拿不准就选它
判 album 时，keywords 里至少一个是专辑名或作品名（如「久石让 原声带」「海上钢琴师 OST」）。

先判断 intent：
- music：用户在点歌、要歌单、描述想听什么。包括「随便来点」「再来一张」「换一批」这类省略式请求
- chat：用户在问你能做什么、打招呼、闲聊、问和听歌无关的事（例：「你在干什么」「你是谁」「今天天气怎么样」）

判定门槛要**保守**：只要沾一点「想听什么」的意思就判 music。
用户打开这个页面八成是来点歌的，误判成闲聊比误判成点歌更烦人。
判 chat 时：keywords 和 exclude 都给空数组，title 和 desc 留空，reply 写成一句自然的话（可长一点，60 字以内），
像人在聊天，不要提「歌单」「推荐」这些词。
**身份是 ACMUSIC 的音乐助手**：被问「你是谁」就这么答，全程不要提及其他音乐平台的名字（网易云、QQ 音乐、Spotify 等），
也不要暗示自己是那些产品的一部分。

keywords 是唯一会被拿去搜曲库的东西，规则很硬：
- 给 6-10 个，其中**至少 4 个必须是具体的歌手名/乐队名**。歌手是最可靠的检索锚点：按人搜出来的歌，质量远高于按抽象风格词搜出来的
- 风格词最多 2 个，且要落到具体作品形态上（「钢琴 独奏」「粤语 老歌」「90 年代 摇滚」）
- **不要用「风格 + 语种」这种宽组合**（「摇滚 华语」「电音 英语」「说唱 国语」）：它们搜出来的前排是批量上传的合辑和搬运号，连一首正经单曲都没有
- 「学习」「运动」「助眠」这类纯场景标签**不要单独**当关键词：它们搜出来的同样是标题里堆满这些字的批量上传垫音。要用就和风格绑死（如「钢琴 助眠」）
- 不要用两个抽象概念硬拼（「氛围 电子」「治愈 抒情」「安静 钢琴」）
- 绝对不要写具体歌名。你记忆里的歌名有相当一部分在曲库里不存在或对不上，写了就是浪费一次搜索
- 不要含「推荐」「好听」「歌曲」「音乐」「来点」这类没有检索价值的词
- 几个词之间要拉开方向，不要同义反复：「安静的钢琴」和「钢琴 安静」是同一个词
- 中文优先；用户点名了外语歌手才用原文名

exclude 是用户明确否定的方向，会被用来过滤结果：
- 只写**能被明确定位**的方向：风格（电子/摇滚/说唱）、版本类型（live/翻唱/remix/伴奏）、语种（英语/日语）、有没有人声
- 不要写情绪形容词（抒情/治愈/温暖/怀旧）—— 它们没法用来判断某一首歌，写进去只会自相矛盾
- 「太吵了」→ ["人声","电子","摇滚"]；「不要翻唱」→ ["翻唱"]；「别放英文」→ ["英语"]
- 上一轮生效的是：${current}
  这**只是参考，不是必须保留**。判断标准永远是这一轮的原话：
  原话与某项冲突就删掉（用户要「安静」，上一轮的「慢歌」就必须删），原话再次印证就保留，原话没提到就默认删掉。
  输出调整后的完整列表，不允许出现互相矛盾的项。

${Array.isArray(recentKeywords) && recentKeywords.length
    ? `最近几轮已经用过这些搜索词：${recentKeywords.join('、')}。
这些词搜出来的结果用户都看过了，这一轮尽量换方向——换歌手、换年代、换乐器都可以，除非用户点名要同一个。`
    : ''}

曲库官方标签如下，风格词尽量从这里选，命中率明显更高：
${vocabLines(vocab)}`
}

/**
 * 统一的大模型请求出口。
 * 两阶段都要用，抽出来免得 headers / 超时 / 错误处理抄两遍走样。
 */
function llmRequest(payload) {
    return fetchJson(`${DEEPSEEK_BASE_URL}/chat/completions`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${DEEPSEEK_API_KEY}`
        },
        body: JSON.stringify(payload)
    }, LLM_TIMEOUT_MS)
}

/** 从模型响应里取出 JSON 对象。极少数情况下它会在 JSON 外面裹一层文字，捞最外层花括号重试一次 */
function readJsonContent(json) {
    const content = json && json.choices && json.choices[0] && json.choices[0].message && json.choices[0].message.content
    if (!content) throw new Error('模型返回空内容')
    try {
        return JSON.parse(content)
    } catch (e) {
        const m = content.match(/\{[\s\S]*\}/)
        if (!m) throw new Error('模型输出不是 JSON')
        return JSON.parse(m[0])
    }
}

/**
 * 调 DeepSeek 解析意图。
 * 失败一律抛错，由上层决定降级——这里不做静默兜底，免得把"模型挂了"伪装成"模型说没听懂"。
 */
async function parseIntent(message, history, exclude, recentKeywords) {
    const vocab = await getVocab()
    const payload = {
        model: DEEPSEEK_MODEL,
        messages: [
            {role: 'system', content: systemPrompt(vocab, exclude, recentKeywords)},
            ...normalizeHistory(history),
            {role: 'user', content: message}
        ],
        // json_object 模式要求 prompt 里出现 "json" 字样，system 里已经写了
        response_format: {type: 'json_object'},
        temperature: 1.0,
        max_tokens: 700
    }
    const json = await llmRequest(payload)
    return sanitizeIntent(readJsonContent(json), message)
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

    // 只有明确返回 chat 才算闲聊：字段缺失、值写错，一律按点歌处理。
    // 这是保守方向 —— 把点歌误判成闲聊，用户会觉得系统不听他说话
    const mode = o.intent === 'chat' ? 'chat' : 'music'
    // 闲聊的回复要像人说话，30 字装不下一句完整的解释
    const replyLimit = mode === 'chat' ? 140 : 30
    const reply = String(o.reply || '').trim().slice(0, replyLimit)
        || (mode === 'chat' ? '在的，想听点什么？' : '按你说的挑了一些')

    // 闲聊不检索，也不需要任何意图字段
    if (mode === 'chat') {
        return {mode, title: '', desc: '', reply, keywords: [], exclude: []}
    }

    const title = String(o.title || '').replace(/[《》"“”]/g, '').trim().slice(0, 16) || '给你挑的歌'
    const desc = String(o.desc || '').trim().slice(0, 40)

    let keywords = Array.isArray(o.keywords) ? o.keywords : []
    keywords = keywords
        .map(k => String(k == null ? '' : k).trim())
        .filter(k => k.length >= 2 && k.length <= 24)
    // 上限从 5 提到 10：宽召回是第二阶段能挑得准的前提
    keywords = [...new Set(keywords)].slice(0, 10)
    // 模型没给出可用词时退回原话：搜索质量差，但总比返回空歌单强
    if (!keywords.length) keywords = [message.slice(0, 24)]

    // 排除项最多 4 个，每个 8 字以内：再长就不是"方向"而是句子了，没法用来过滤
    let exclude = Array.isArray(o.exclude) ? o.exclude : []
    exclude = exclude
        .map(x => String(x == null ? '' : x).trim())
        .filter(x => x.length >= 1 && x.length <= 8)
        // 情绪形容词判断不了任何一首歌，模型偶尔还是会写进来（"抒情""治愈"），
        // 一旦进入"已排除"的展示就会和结果自相矛盾，这里兜一道
        .filter(x => !/^(抒情|治愈|温暖|怀旧|安静|好听|悲伤|快乐|舒缓|轻柔|浪漫)$/.test(x))
    exclude = [...new Set(exclude)].slice(0, 4)

    // 搜索通道：OST / 整张原声带这类需求，专辑搜索比单曲准得多（单曲会捞出一堆同名翻唱）
    const media = o.media === 'album' ? 'album' : 'track'

    return {mode, title, desc, reply, keywords, exclude, media}
}

// ---------------------------------------------------------------------------
// 排除项：把"太吵了""不要翻唱"这类否定，变成可以在检索阶段执行的规则
// ---------------------------------------------------------------------------

/**
 * 否定词 → 标题正则。
 *
 * 只有能从**标题**判断的才写成正则；"人声""电子""英语"这类需要听或需要元数据的，
 * re 留空 —— 它们交给第二阶段由模型按歌名/歌手判断，硬套正则会大面积误伤。
 */
const EXCLUDE_RULES = [
    {keys: ['live', '现场', '演唱会'], re: /(\blive\b|演唱会|现场版|concert|unplugged)/i},
    {keys: ['翻唱', 'cover', '原唱', '致敬'], re: /(翻唱|cover|原唱|致敬|改编版)/i},
    {keys: ['remix', '混音', 'dj'], re: /(remix|混音|dj\s*版)/i},
    {keys: ['伴奏', 'instrumental'], re: /(伴奏|instrumental|karaoke)/i},
    {keys: ['纯音乐', '器乐', '人声', '电子', '摇滚', '说唱', '英语', '英文'], re: null}
]

/**
 * 把模型给的排除词编译成可执行的正则列表。
 * 模型可能给"电音"也可能给"电子"，所以用 includes 做双向松匹配，不要求字面完全相等。
 */
function compileExclude(exclude) {
    const words = Array.isArray(exclude) ? exclude : []
    const res = []
    for (const raw of words) {
        const w = String(raw == null ? '' : raw).toLowerCase().trim()
        if (!w) continue
        for (const rule of EXCLUDE_RULES) {
            if (!rule.re) continue
            if (rule.keys.some(k => w.includes(k) || k.includes(w))) res.push(rule.re)
        }
    }
    return [...new Set(res)]
}

/**
 * 原话里有没有否定意图。
 *
 * 必须要有这道代码兜底：模型很爱「为了质量」主动加排除项 —— 让它推荐民谣，
 * 它会顺手返回 exclude:["翻唱","电音"]，理由是"民谣推荐当然不要翻唱"。
 * 逻辑上没错，但它把你没说过的话显示成了「已排除」，用户只会觉得莫名其妙。
 * prompt 里已经写了「不要自己加戏」，模型并不总是听。
 */
const NEGATION_HINT = /(不要|不想|不用|别再|别放|别来|别整|换个|换点|换一|太吵|太闹|太难听|受不了|听腻|腻了|排除|去掉|除了|太困|太嗨|太重|太轻|不太|还是不行|不满意|不对味)/

function hasNegation(text) {
    return NEGATION_HINT.test(String(text || ''))
}

/**
 * 排除项必须有依据：当前这句，或者最近一条用户消息。
 * 只看最近一条而不是整段历史 —— 「你在干什么」这种跟点歌无关的话，
 * 不该继承三轮以前那句「太吵了」留下的排除项。
 */
function excludeHasBasis(message, history) {
    if (hasNegation(message)) return true
    const list = Array.isArray(history) ? history : []
    const lastUser = [...list].reverse().find(m => m && m.role === 'user' && typeof m.content === 'string')
    return !!(lastUser && hasNegation(lastUser.content))
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
 *
 * 分隔符不能只认空格：实测《学习丨阅读丨刷题丨背书集中注意力轻音乐》用的是全角竖线，
 * 所以空格、半角/全角竖线、斜杠、中点都算。判据是「分隔出的片段 ≥4 且整串够长」，
 * 正常歌名（含《千与千寻 主题曲《いつも何度でも》》这种）切不出 4 段。
 */
const TITLE_SEPARATORS = /[\s丨|｜/／·・\-—]+/

function isSpamTitle(name) {
    const s = String(name || '').trim()
    if (!s) return false
    // 超长标题：中文歌名极少超过 26 字。到这个长度基本都是「描述型」标题
    // （带括号补充说明、堆卖点），例如《时代在召唤（第二套广播体操）轻电音 不带鬼畜和运动》
    if (s.length > 26) return true
    const parts = s.split(TITLE_SEPARATORS).filter(Boolean)
    // 切出 4 段以上就不像歌名了。阈值从 18 降到 14：实测《运动 节奏感 活力 -电音燃曲》
    // 只有 15 字，照样是堆词合辑
    return parts.length >= 4 && s.length > 14
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

function isUsable(song, allowJunk, keywords, excludeRes) {
    if (!song || !song.id) return false
    // 时长异常：短于 30s 多半是铃声/片段，长于 15min 多半是电台节目
    const dt = durationOf(song)
    if (dt && (dt < 30000 || dt > 900000)) return false
    // privilege.st < 0 是下架/无版权，能搜到但播不了，进歌单只会让人点一下失败
    const privilege = song.privilege
    if (privilege && typeof privilege.st === 'number' && privilege.st < 0) return false
    const name = String(song.name || '')
    if (!allowJunk && JUNK_PATTERN.test(name)) return false
    if (isSpamTitle(song.name)) return false
    // 用户明确排除的方向（live / 翻唱 / remix / 伴奏），能在标题上判定的在这里就拦掉
    if (excludeRes && excludeRes.length && excludeRes.some(re => re.test(name))) return false
    // 歌手名和歌名一模一样：正常作品不会这样填，基本都是上传者的占位写法
    const lead = leadArtistOf(song)
    if (lead && name.trim() === lead.trim()) return false
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
 * 专辑通道。
 *
 * 「宫崎骏电影原声」「某个 OST」这类需求，用单曲搜索会捞出一堆同名翻唱；
 * 搜专辑拿到的是一张完整的原声带，曲目质量高一个档次。
 * 只取前两个专辑、各抽 want 首，避免整张专辑把歌单灌满。
 */
async function searchAlbumBuckets(keyword, want = 6) {
    try {
        const url = `${NETEASE_API_BASE}/cloudsearch?keywords=${encodeURIComponent(keyword)}&type=10&limit=2`
        const json = await fetchJson(url, {}, SEARCH_TIMEOUT_MS)
        const albums = (json && json.result && json.result.albums) || []
        const picked = albums.slice(0, 2).filter(a => a && a.id)
        if (!picked.length) return []
        const details = await Promise.all(picked.map(a =>
            fetchJson(`${NETEASE_API_BASE}/album?id=${a.id}`, {}, SEARCH_TIMEOUT_MS).catch(() => null)
        ))
        return details
            .map(d => ((d && Array.isArray(d.songs)) ? d.songs.slice(0, want) : []))
            .filter(b => b.length)
    } catch (e) {
        log('[album] 专辑通道失败:', brief(keyword), e.message)
        return []
    }
}

// ---------------------------------------------------------------------------
// 用户偏好画像
// ---------------------------------------------------------------------------

/**
 * 单曲百科元数据缓存。
 *
 * 数据来自 /song/wiki/summary 的 creatives[]：songTag（曲风）、songBizTag（情绪标签）、
 * language（语种），实测 6/6 覆盖。按歌曲 id 缓存 —— 红心歌很少变，
 * 一首歌的曲风也不会变，所以缓存 7 天，用户再次打开时零网络开销。
 */
const META_TTL_MS = 7 * 24 * 60 * 60 * 1000
const META_MAX = 600
const metaCache = new Map()

function readWikiMeta(body) {
    const data = (body && body.data) || body || {}
    const meta = {tags: [], bizTags: [], language: ''}
    for (const block of (data.blocks || [])) {
        for (const c of (block.creatives || [])) {
            const ui = c.uiElement || {}
            if (c.creativeType === 'songTag') {
                for (const res of (c.resources || [])) {
                    const t = res.uiElement && res.uiElement.mainTitle && res.uiElement.mainTitle.title
                    if (t && meta.tags.length < 4) meta.tags.push(String(t).slice(0, 16))
                }
            } else if (c.creativeType === 'songBizTag') {
                for (const res of (c.resources || [])) {
                    const t = res.uiElement && res.uiElement.mainTitle && res.uiElement.mainTitle.title
                    if (t && meta.bizTags.length < 4) meta.bizTags.push(String(t).slice(0, 12))
                }
            } else if (c.creativeType === 'language') {
                const links = ui.textLinks || []
                if (links[0] && links[0].text) meta.language = String(links[0].text).slice(0, 12)
            }
        }
    }
    return meta
}

async function getSongMeta(id) {
    if (!id) return null
    const hit = metaCache.get(id)
    if (hit && Date.now() - hit.at < META_TTL_MS) return hit.meta

    try {
        const json = await fetchJson(`${NETEASE_API_BASE}/song/wiki/summary?id=${id}`, {}, SEARCH_TIMEOUT_MS)
        const meta = readWikiMeta(json)
        // 查过但没有标签也记下来：否则每次都要为没数据的歌重查一遍
        if (metaCache.size >= META_MAX) metaCache.delete(metaCache.keys().next().value)
        metaCache.set(id, {at: Date.now(), meta})
        return meta
    } catch (e) {
        return null
    }
}

/** 限并发的小工具：20 首一起打上游会触发风控，6 路足够快又安全 */
async function mapLimit(items, limit, fn) {
    const out = new Array(items.length)
    let cursor = 0
    const workers = new Array(Math.min(limit, items.length)).fill(0).map(async () => {
        while (cursor < items.length) {
            const i = cursor++
            out[i] = await fn(items[i], i)
        }
    })
    await Promise.all(workers)
    return out
}

/** 统计数组里出现次数最多的前 n 项 */
function topCounts(list, n) {
    const counts = new Map()
    for (const x of list) {
        if (!x) continue
        counts.set(x, (counts.get(x) || 0) + 1)
    }
    return [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, n)
}

/**
 * 把「20 首红心歌」压成一段可读的偏好画像。
 *
 * 这一步是整条链路里唯一需要知道「用户喜欢什么」的地方。以前只把歌名列表丢给模型，
 * 它只能靠自己的记忆猜风格；现在把曲风、情绪标签、语种统计好摆到它面前。
 * 注意这不含时间维度 —— 上游没有红心时间戳，做不了时段分析。
 */
async function buildProfile(taste) {
    const list = Array.isArray(taste) ? taste : []
    if (!list.length) return {digest: '', artists: [], tags: [], bizTags: [], languages: []}

    const metas = await mapLimit(list, 6, item => getSongMeta(item.id))

    const artists = topCounts(list.map(t => t.artist).filter(Boolean), 3)
    const tags = topCounts(metas.flatMap(m => (m && m.tags) || []), 4)
    const bizTags = topCounts(metas.flatMap(m => (m && m.bizTags) || []), 4)
    const languages = topCounts(metas.map(m => m && m.language).filter(Boolean), 2)

    const fmtArtists = artists.map(([name, n]) => (n > 1 ? `${name}×${n}` : name)).join('、')
    // 曲风标签常带子类（「国风-国风纯音乐」），去掉前缀只留主线，读起来更像人话
    const fmtTags = tags.map(([t, n]) => `${String(t).split('-').pop()}${n > 1 ? `×${n}` : ''}`).join('、')
    const fmtBiz = bizTags.map(([t]) => t).join('、')
    const fmtLang = languages.map(([t, n]) => `${t}${n > 1 ? `×${n}` : ''}`).join('、')

    const lines = []
    if (fmtArtists) lines.push(`常听艺人：${fmtArtists}`)
    if (fmtTags) lines.push(`曲风：${fmtTags}`)
    if (fmtBiz) lines.push(`情绪标签：${fmtBiz}`)
    if (fmtLang) lines.push(`语种：${fmtLang}`)
    // 一个标签都没查到（全是冷门歌）时退回歌名列表，至少别让模型瞎猜
    if (!fmtTags && !fmtArtists) {
        const names = list.slice(0, 12).map(t => (t.artist ? `${t.name} - ${t.artist}` : t.name)).filter(Boolean)
        if (names.length) lines.push(`常听：${names.join('；')}`)
    }

    return {
        digest: lines.join('\n'),
        artists: artists.map(x => x[0]),
        tags: tags.map(x => x[0]),
        bizTags: bizTags.map(x => x[0]),
        languages: languages.map(x => x[0])
    }
}

/**
 * 造一个「收歌器」：把去重、过滤、歌手配额这些规则收在一处，
 * 让「轮转填充」和「歌单补位」共用同一套判定，不会出现补位把重复歌塞回来的情况。
 */
function createPicker(allowJunk, keywords = [], excludeRes = [], recentIds = []) {
    const out = []
    const seenId = new Set()
    const seenIdentity = new Set()
    const artistCount = new Map()
    // 「最近给过」的过滤：这些歌用户都看过了，先拦下来。
    // 但不能直接扔 —— 如果过滤完候选太少，还要按顺序放回一部分
    const recentSet = new Set(recentIds.map(String))
    const skippedRecent = []
    const skippedSeen = new Set()

    return {
        add(song) {
            if (out.length >= MAX_RECALL) return false
            if (!song || seenId.has(song.id) || !isUsable(song, allowJunk, keywords, excludeRes)) return false

            // 质量检查都过了才轮到"最近给过"的判断：被质量规则拦下的不补回
            if (recentSet.size && recentSet.has(String(song.id))) {
                if (!skippedSeen.has(String(song.id)) && skippedRecent.length < 30) {
                    skippedRecent.push(song)
                    skippedSeen.add(String(song.id))
                }
                return false
            }

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
        },
        // 被「最近给过」拦下的歌，按遇到顺序排列 —— 过滤后不够数时按这个顺序放回
        get skippedRecent() {
            return skippedRecent
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
            if (picker.list.length >= MAX_RECALL) return
        }
    }
}

// ---------------------------------------------------------------------------
// 第二阶段：精挑
// ---------------------------------------------------------------------------

/**
 * 从召回的候选里挑出最终歌单。
 *
 * 这是整条链路里唯一让模型「动用音乐知识」的地方 —— 第一阶段禁止它写歌名（会编），
 * 这里却要靠它认歌名（只有它知道《Summer》是钢琴曲、《Where Is Armo?》是弦乐）。
 * 同一份知识放在不同位置，一个带来幻觉，一个带来判断力。
 */
/**
 * 按句子边界截断。
 * 定长 slice 会把话切在半截（「宋冬野、陈鸿…」），而理由是要给人读的，
 * 读到一个断句处比读全 110 字却断在词中间更体面。
 */
function trimAtSentence(raw, max) {
    const s = String(raw == null ? '' : raw).trim()
    if (s.length <= max) return s
    const cut = s.slice(0, max)
    // 从后往前找最后一个句读，切在它后面；找不到就退回硬切
    const idx = Math.max(cut.lastIndexOf('。'), cut.lastIndexOf('；'), cut.lastIndexOf('！'), cut.lastIndexOf('？'))
    return idx >= max * 0.5 ? cut.slice(0, idx + 1) : cut
}

async function pickFromCandidates(message, candidates, exclude, profile) {    if (!candidates.length) return {picks: [], reason: ''}

    const list = candidates.map((song, i) => {
        const artist = artistsOf(song).map(a => a.name).filter(Boolean).join('/')
        return `${i + 1}. ${song.name || '未知'}${artist ? ' - ' + artist : ''}`
    }).join('\n')

    const hasProfile = !!(profile && profile.digest)
    const rules = [
        '只能选给定候选里的序号，不要编造',
        '宁缺毋滥：风格明显不符的直接跳过，凑不满就少给，不要为了凑数硬塞',
        '同一歌手最多 2 首',
        '候选只有歌名和歌手，你无法试听。靠你对这些作品的了解判断；完全没把握的不要赌',
        // 这两条是实测出来的「搬运号指纹」：曲库里大量这种条目靠堆关键词骗曝光
        '歌手名像工作室/合辑号的（XX音乐、XX工作室、XX官方、XX传媒、XX Melodies），基本是搬运号，不要选',
        '歌名里堆了多个风格词或卖点的（「运动 节奏感 活力」「XX精选集」），是批量上传的垫音，不要选'
    ]
    if (Array.isArray(exclude) && exclude.length) {
        rules.push(`用户要排除：${exclude.join('、')}。和这些冲突的一律不选；但如果某个排除项和用户当前原话明显矛盾（例如原话要「安静」而排除项里有「慢歌」），以原话为准`)
    }
    // 画像是软约束：只在同等贴合度下起作用，不能让它把话题带偏
    if (hasProfile) {
        rules.push('这个用户的胃口见下方「用户常听」；同等贴合度下可以优先他熟悉的，但不要仅仅因为他常听就选不贴题的')
    }

    const reasonRule = hasProfile
        ? `"reason": "两层理由，硬限制 50 字以内（超出会被直接截断）。用一句话写两个半句：前半句『你常听 A、B』用「用户常听」里的艺人或曲风做证据，后半句『这批偏 C』说这批歌的特质。最多提 2 首歌名，不要罗列，禁止「很适合你」这类空话"`
        : `"reason": "一句话说明取舍，20 字以内"`

    const profileBlock = hasProfile ? `\n用户常听（统计自他的红心歌）：\n${profile.digest}\n` : ''

    const prompt = `你是一位挑剔的选歌编辑。用户的原话是：「${message}」
${profileBlock}
下面是从曲库召回的一批候选，格式为「序号. 歌名 - 歌手」。从中挑出最贴合的 ${MAX_TRACKS} 首，按贴合度从高到低排序。

只输出 JSON：
{"picks": [序号...], ${reasonRule}}

规则：
${rules.map(r => '- ' + r).join('\n')}

候选：
${list}`

    const json = await llmRequest({
        model: DEEPSEEK_MODEL,
        messages: [{role: 'user', content: prompt}],
        response_format: {type: 'json_object'},
        // 选歌要稳定：同一批候选每次挑出来不该差太多，所以温度压到 0.3
        temperature: 0.3,
        max_tokens: 600
    })

    const parsed = readJsonContent(json)
    let picks = Array.isArray(parsed.picks) ? parsed.picks : []
    picks = picks
        .map(n => Number(n))
        .filter(n => Number.isInteger(n) && n >= 1 && n <= candidates.length)
    picks = [...new Set(picks)].slice(0, MAX_TRACKS)
    // 两层理由控制在 58 字（模板要求 50，留 8 字余量给标点）。
    // 模型经常写超，按句读截断而不是硬切，否则会出现「安和桥、斑马斑马、」这种断在半截的列表
    return {picks, reason: trimAtSentence(parsed.reason, hasProfile ? 58 : 40)}
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
        keywords: [text.slice(0, 24)].filter(Boolean),
        exclude: [],
        media: 'track'
    }
}

async function buildPlaylist(message, history, constraints, taste, recent) {
    const allowJunk = JUNK_PATTERN.test(message)
    // 上一轮累积的排除项：即使这一轮模型挂了，也不能把用户的纠正丢掉
    const pendingExclude = Array.isArray(constraints && constraints.exclude) ? constraints.exclude : []
    let intent
    let degraded = null

    /**
     * 画像和意图解析同时开跑。
     * 画像要查 20 首曲库百科（首次约 1-2s），而阶段一完全不依赖它 ——
     * 并起来跑，画像就完全不占额外延迟，等阶段二用的时候早就好了。
     */
    const profilePromise = buildProfile(taste)

    if (!DEEPSEEK_API_KEY) {
        degraded = 'no-key'
        intent = fallbackIntent(message)
    } else {
        try {
            intent = await parseIntent(message, history, pendingExclude, recent.keywords)
        } catch (e) {
            degraded = 'llm-failed'
            log('[llm] 解析失败，降级为直搜:', e.message)
            intent = fallbackIntent(message)
            intent.exclude = pendingExclude
        }
    }

    // 闲聊直接回一句话，不进检索 —— 「你在干什么」不该换来一张 16 首的歌单
    if (intent.mode === 'chat') {
        log('[chat]', brief(message), '→', brief(intent.reply, 30))
        return {mode: 'chat', reply: intent.reply, degraded}
    }

    // 原话和最近一条用户消息里都没有否定意图时，不采纳模型主动加的排除项：
    // 否则「推荐点民谣」也会显示「已排除 翻唱 电音」，用户根本没说过
    if (intent.exclude && intent.exclude.length && !excludeHasBasis(message, history)) {
        log('[exclude] 原话无否定意图，丢弃模型主动加的:', intent.exclude.join(','))
        intent.exclude = []
    }

    const excludeRes = compileExclude(intent.exclude)

    // ---- 第一阶段：宽召回（目标 MAX_RECALL，故意多于最终歌单） ----
    // 模型判断这类需求搜「专辑」更准（OST、整张原声带），其余走单曲
    const useAlbum = intent.media === 'album'
    const buckets = await Promise.all(
        intent.keywords.map(k => useAlbum ? searchAlbumBuckets(k) : searchOnce(k))
    )
    const picker = createPicker(allowJunk, intent.keywords, excludeRes, recent.ids)
    fillRoundRobin(picker, buckets)

    // 专辑通道偏窄（每张专辑只抽几首），不够就用单曲补一轮
    if (useAlbum && picker.list.length < Math.ceil(MAX_RECALL * 0.5)) {
        log('[album] 专辑召回不足（' + picker.list.length + ' 首），补单曲')
        const more = await Promise.all(intent.keywords.slice(0, 3).map(k => searchOnce(k)))
        for (const b of more) fillRoundRobin(picker, [b])
    }

    // 曲目不够就补：场景/情绪类请求靠单曲搜索经常凑不满，歌单种子能把这一档质量拉回来
    if (picker.list.length < Math.ceil(MAX_RECALL * 0.5)) {
        log('[seed] 单曲不足（' + picker.list.length + ' 首），用歌单补位')
        const seedBuckets = await Promise.all(
            intent.keywords.slice(0, 2).map(k => searchPlaylistBuckets(k))
        )
        for (const bucket of seedBuckets.flat()) {
            for (const song of bucket) picker.add(song)
        }
    }

    let candidates = picker.list

    // 关键词全军覆没时用歌单名再捞一次：模型起的名字往往就是最贴近的检索词
    if (!candidates.length && intent.title) {
        log('[search] 关键词无结果，用歌单名兜底:', brief(intent.title))
        const retry = createPicker(allowJunk, [intent.title], excludeRes, recent.ids)
        await Promise.all([
            searchOnce(intent.title, MAX_RECALL).then(b => fillRoundRobin(retry, [b])),
            searchPlaylistBuckets(intent.title, 6).then(bs => {
                for (const b of bs) for (const s of b) retry.add(s)
            })
        ])
        candidates = retry.list
    }

    // 「最近给过」的过滤可能把候选砍得太狠（比如用户连着点了五次钢琴）。
    // 候选少于 8 首时按遇到顺序放回一部分 —— 宁可给重复的，也不能没歌可推
    if (candidates.length < 8 && picker.skippedRecent.length) {
        const need = 8 - candidates.length
        const back = picker.skippedRecent.slice(0, need)
        log('[recent] 候选不足，放回', back.length, '首看过的')
        candidates = candidates.concat(back)
    }

    // ---- 第二阶段：精挑 ----
    // 到这里画像肯定已经好了（阶段一至少花了几百毫秒，而百科查询是并行跑的）
    const profile = await profilePromise
    if (profile.digest) log('[profile]', profile.digest.replace(/\n/g, ' | '))

    let tracks = candidates.slice(0, MAX_TRACKS)
    let pickReason = ''
    // 候选本来就不多时不必再调一次模型：没有挑选余地，只是白烧一次钱
    if (!degraded && candidates.length > MAX_TRACKS) {
        try {
            const {picks, reason} = await pickFromCandidates(message, candidates, intent.exclude, profile)
            if (picks.length >= 6) {
                tracks = picks.map(i => candidates[i - 1]).filter(Boolean)
                pickReason = reason
            } else {
                // 模型只勉强挑出几首，通常意味着候选整体不对路；退回召回顺序至少有 16 首可用
                log('[pick] 模型只选出', picks.length, '首，保留召回顺序')
            }
        } catch (e) {
            log('[pick] 精挑失败，退回召回顺序:', e.message)
        }
    }

    return {
        mode: 'music',
        playlist: {
            title: intent.title,
            desc: intent.desc,
            reply: intent.reply,
            keywords: intent.keywords,
            exclude: intent.exclude,
            tracks,
            pickReason
        },
        // 画像命中情况回给前端只用于调试展示，不参与业务
        profile: {hasProfile: !!profile.digest, tags: profile.tags.slice(0, 3)},
        stats: {recall: candidates.length, final: tracks.length},
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

/**
 * 每日配额。
 *
 * 分钟限流挡不住「慢慢刷」：10 次/分钟 × 1440 分钟，一个 IP 一天最多能打一万多次。
 * 这条把最坏情况的成本从「无限」压到「一天几毛钱」。
 *
 * 只有真正要调模型的请求才扣 —— 缓存命中不花 token，不该占配额。
 */
const DAILY_LIMIT = Number(process.env.AI_DAILY_LIMIT || 200)
const dayBuckets = new Map()

/**
 * 白名单：不限流、不扣配额。
 *
 * 三种识别方式并存，覆盖不同场景：
 *   IP  —— 在常用网络下，零配置自动生效
 *   uid —— IP 变了但还登录着，认账号不认网络（前端只带一串数字）
 *   key —— 既换了网络又没登录，手动在自己浏览器里塞一个，走 X-AI-Key 头
 */
const UNLIMITED_IPS = splitList(process.env.AI_UNLIMITED_IPS)
const UNLIMITED_UIDS = splitList(process.env.AI_UNLIMITED_UIDS)
const UNLIMITED_KEY = String(process.env.AI_UNLIMITED_KEY || '').trim()

function splitList(raw) {
    return String(raw || '').split(',').map(s => s.trim()).filter(Boolean)
}

function isUnlimited(ip, uid, req) {
    if (UNLIMITED_IPS.includes(ip)) return true
    if (uid && UNLIMITED_UIDS.includes(uid)) return true
    if (UNLIMITED_KEY) {
        const given = String(req.headers['x-ai-key'] || '').trim()
        if (given && given === UNLIMITED_KEY) return true
    }
    return false
}

/** 服务器跑在 UTC，配额按北京时间切日，否则早上 8 点才「换天」 */
function todayKey() {
    return new Date().toLocaleDateString('en-CA', {timeZone: 'Asia/Shanghai'})
}

function allowDaily(ip) {
    const key = ip + '|' + todayKey()
    const used = dayBuckets.get(key) || 0
    if (used >= DAILY_LIMIT) return false
    dayBuckets.set(key, used + 1)
    return true
}

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

/**
 * 收口前端传来的会话约束。
 * 这是外部输入，长度和条数都要卡住 —— 排除项会被直接拼进 prompt，不能让它变成一句话。
 */
function normalizeConstraints(raw) {
    const o = raw && typeof raw === 'object' ? raw : {}
    const list = Array.isArray(o.exclude) ? o.exclude : []
    const exclude = [...new Set(
        list.map(x => String(x == null ? '' : x).trim()).filter(x => x.length >= 1 && x.length <= 8)
    )].slice(0, 6)
    return {exclude}
}

/**
 * 用户常听的抽样。
 *
 * 收 `{id, name, artist}`：id 用来查曲库百科（曲风/标签/语种），name/artist 用来统计艺人。
 * 兼容旧的纯字符串形态（那时只能拿歌名去猜风格）。
 * 最多 20 条 —— 这是唯一会把用户数据带出前端的通道，量必须可控。
 */
function normalizeTaste(raw) {
    if (!Array.isArray(raw)) return []
    const out = []
    for (const item of raw) {
        if (item == null) continue
        if (typeof item === 'string') {
            const s = item.trim()
            // 旧格式是「歌名 - 歌手」，拆开还能用
            const m = s.split(/\s+-\s+/)
            if (s.length < 2 || s.length > 80) continue
            out.push({id: '', name: (m[0] || s).slice(0, 50), artist: (m[1] || '').slice(0, 40)})
            continue
        }
        if (typeof item !== 'object') continue
        const id = String(item.id == null ? '' : item.id).trim()
        const name = String(item.name == null ? '' : item.name).trim().slice(0, 50)
        const artist = String(item.artist == null ? '' : item.artist).trim().slice(0, 40)
        if (!name && !id) continue
        // id 只收纯数字：它会拼进上游 URL，不能让它变成路径
        out.push({id: /^\d{1,20}$/.test(id) ? id : '', name, artist})
        if (out.length >= 20) break
    }
    return out.slice(0, 20)
}

/**
 * 前端带来的「最近给过什么」。
 *
 * ids 是最近推荐过的歌曲 id（前端存 localStorage，最多 60 个），召回时直接过滤——
 * 否则同样的关键词永远搜出同样的前排，用户每次都看到卡农和菊次郎。
 * keywords 是最近用过的搜索词，传给模型让它换方向。
 *
 * 这是外部输入，ids 只收纯数字、keywords 限长，防止有人拿它当自由文本注入。
 */
function normalizeRecent(raw) {
    const o = raw && typeof raw === 'object' ? raw : {}
    const ids = Array.isArray(o.ids)
        ? o.ids
              .map(x => String(x == null ? '' : x).trim())
              .filter(x => /^\d{1,20}$/.test(x))
              .slice(0, 60)
        : []
    const keywords = Array.isArray(o.keywords)
        ? o.keywords
              .map(x => String(x == null ? '' : x).trim())
              .filter(x => x.length >= 2 && x.length <= 24)
              .slice(0, 5)
        : []
    return {ids, keywords}
}

function cacheKey(message, history, constraints, taste, recent) {
    const h = normalizeHistory(history).map(m => m.role + ':' + m.content).join('|')
    // 排除项和画像都会改变结果，必须进 key —— 否则"太吵了"会命中上一轮那份不排除人声的缓存
    const c = constraints && constraints.exclude ? constraints.exclude.join(',') : ''
    const t = Array.isArray(taste)
        ? taste.slice(0, 8).map(x => (x && (x.id || x.name)) || '').join(',')
        : ''
    // recent.ids 也必须进 key：排除列表每次都在变，命中旧缓存会让"去重"完全失效
    const r = recent && recent.ids ? recent.ids.join(',') : ''
    return createHash('sha1').update(message + '\n' + h + '\n' + c + '\n' + t + '\n' + r).digest('hex').slice(0, 16)
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

// 定期清理限流表与过期日配额，避免长期运行后按 IP 无限增长
const sweeper = setInterval(() => {
    const now = Date.now()
    for (const [ip, b] of rateBuckets) {
        if (now > b.resetAt + RATE_WINDOW_MS) rateBuckets.delete(ip)
    }
    const today = '|' + todayKey()
    for (const key of dayBuckets.keys()) {
        if (!key.endsWith(today)) dayBuckets.delete(key)
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
            dailyLimit: DAILY_LIMIT,
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

    let body
    try {
        body = await readBody(req)
    } catch (e) {
        return sendJson(res, 400, {ok: false, error: e.message})
    }

    // 白名单要认 uid，所以先读 body 再判限流。body 上限 8KB，提前读没有放大风险
    const uid = String(body.uid || '').trim()
    const unlimited = isUnlimited(ip, uid, req)

    if (!unlimited && !allowRequest(ip)) {
        log('[rate] 触发限流:', ip)
        return sendJson(res, 429, {ok: false, error: '问得有点快，歇一分钟再来'})
    }

    const message = String(body.message || '').trim()
    if (message.length < 2) {
        return sendJson(res, 400, {ok: false, error: '说点什么吧，比如「下雨天想听钢琴」'})
    }
    if (message.length > 200) {
        return sendJson(res, 400, {ok: false, error: '一次说短一点，200 字以内'})
    }

    const history = Array.isArray(body.history) ? body.history : []
    const constraints = normalizeConstraints(body.constraints)
    const taste = normalizeTaste(body.taste)
    const recent = normalizeRecent(body.recent)
    const key = cacheKey(message, history, constraints, taste, recent)
    const cached = readCache(key)
    if (cached) {
        log('[cache] 命中:', brief(message), `${Date.now() - started}ms`)
        // tookMs 用本次真实耗时，别把首次请求的耗时带出去，否则看起来像"缓存也要 2 秒"
        return sendJson(res, 200, {...cached, cached: true, tookMs: Date.now() - started})
    }

    // 缓存没命中 = 这次真要调模型了，才扣日配额
    if (!unlimited && !allowDaily(ip)) {
        log('[quota] 日配额用尽:', ip)
        return sendJson(res, 429, {ok: false, error: `今天的 ${DAILY_LIMIT} 次已经用完了，明天再来`})
    }

    try {
        const result = await buildPlaylist(message, history, constraints, taste, recent)
        const pl = result.playlist
        const payload = {
            ok: true,
            ...result,
            // 闲聊没有歌单，但也要把当前的排除项原样回传，别让前端把会话状态清空了
            constraints: {exclude: (pl && pl.exclude) || (result.mode === 'chat' ? constraints.exclude : [])},
            cached: false,
            tookMs: Date.now() - started
        }
        writeCache(key, payload)
        if (result.mode === 'chat') {
            log('[ok]', brief(message), '→ chat | reply=' + brief(result.reply, 24), `${payload.tookMs}ms`)
        } else {
            log('[ok]', brief(message), '→', brief(pl.title),
                `keywords=${pl.keywords.length}`,
                `recall=${result.stats.recall}`,
                `final=${pl.tracks.length}`,
                (pl.exclude || []).length ? `exclude=${pl.exclude.join(',')}` : '',
                result.degraded ? `degraded=${result.degraded}` : '',
                `${payload.tookMs}ms`)
        }
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
    log(`  限流: ${RATE_LIMIT} 次/分钟，${DAILY_LIMIT} 次/天`)
    log(`  白名单: IP ${UNLIMITED_IPS.length} 个 / uid ${UNLIMITED_UIDS.length} 个 / key ${UNLIMITED_KEY ? '已设置' : '未设置'}`)
})
