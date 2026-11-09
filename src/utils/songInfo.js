/**
 * 歌曲资料聚合：把三条互不相同的接口拼成播放详情页「歌曲信息」要的一份视图模型。
 *
 * 数据来源（缺一个不影响其余，任何一路失败都按空处理）：
 *   1. `/ugc/song/get`       结构化事实 —— 词曲编曲、语种、发行时间、公司、原曲
 *   2. `/song/wiki/summary`  音乐百科 DSL —— 曲风、推荐标签、BPM、获奖、影视出处、乐评正文
 *   3. `/album`              专辑详情 —— `description` 是唯一一处成段的长文，常常就是创作背景
 *
 * 为什么不在组件里直接取值：百科是 blocks → creatives 的通用 DSL，取法跟字段位置都很反直觉
 * （语种/BPM 的值在 textLinks 而不是 resources），散在模板里会变成一坨链式兜底。
 * 这里统一成固定结构，模板只做渲染。
 *
 * 纯函数，不发请求，便于单独核对字段；上游字段缺失时一律返回空数组 / 空串，不返回 undefined。
 */

import { formatMs } from "@/utils/filters"

/** 取数组，过滤掉 null 项（上游很喜欢塞 null 占位） */
function listOf(value) {
    return Array.isArray(value) ? value.filter(Boolean) : []
}

/** uiElement.mainTitle.title —— 板块名 / 资源名 */
function titleOf(uiElement) {
    return (uiElement && uiElement.mainTitle && uiElement.mainTitle.title) || ''
}

/**
 * uiElement.textLinks 里的纯文本。
 * 语种、BPM 这类「标签 + 一个短值」的 creative 不填 resources，值只存在于 textLinks。
 */
function textLinkOf(uiElement) {
    return listOf(uiElement && uiElement.textLinks)
        .map(link => (link && link.text) || '')
        .filter(Boolean)
        .join(' / ')
}

/** uiElement.descriptions[].description 拼接（乐评正文在这里） */
function descriptionOf(uiElement) {
    return listOf(uiElement && uiElement.descriptions)
        .map(item => (item && item.description) || '')
        .filter(Boolean)
        .join('\n')
}

/**
 * artistRepVos / artists → [{id, name}]
 * 百科里的歌手是 `artistRepVos: [{artistId, artistName}]`，MV/歌曲接口又是 `ar: [{id, name}]`；
 * 同一个名字可能在不同字段重复出现（Beyond 既是编曲又是演唱），这里按 id + 名字去重。
 */
function artistsOf(value) {
    const out = []
    listOf(value).forEach(item => {
        const name = item.artistName || item.name
        if (!name) return
        const id = Number(item.artistId || item.id) || 0
        if (out.some(a => a.id === id && a.name === name)) return
        out.push({ id, name })
    })
    return out
}

/**
 * 专辑介绍：**原样保留上游文本**，只做两件不丢内容的事——
 *   1. 去掉开头的 BOM（U+FEFF），它会让首行莫名缩进一个看不见的字符
 *   2. 去掉整篇首尾的空白
 * 中间的换行、空行、全角空格一律不动：老专辑简介里混着「歌曲下载代码表」「铃声下载方式」
 * 这类段落（例：范玮琪《Faces Of FanFan》7154 字，后 1/3 是 129 行「歌名/歌手/313299」），
 * 看着像乱码，但那确实是上游原文，按用户要求保留原样展示，不做内容裁剪。
 */
function cleanDesc(text) {
    if (typeof text !== 'string') return ''
    return text.replace(/^\uFEFF/, '').trim()
}

/**
 * 解析音乐百科 blocks。
 * ⚠️ 必须按 `creativeType` 遍历，不能按下标取：板块数量与顺序随歌曲变化
 * （《孤勇者》3 个块、《海阔天空》4 个块，是否带乐评/获奖/影视各不相同）。
 */
function readWiki(wiki) {
    const result = {
        styles: [],          // 曲风，如 摇滚-流行摇滚 / 流行
        moods: [],           // 推荐标签，如 治愈 / 悲伤 / 自信
        honors: [],          // [{award: 颁奖礼, work: 奖项}]
        entertainment: [],   // 影视/综艺出处文案
        language: '',
        bpm: '',
        review: null         // {text, author}
    }

    listOf(wiki && wiki.blocks).forEach(block => {
        listOf(block && block.creatives).forEach(creative => {
            const ui = creative.uiElement || {}
            const type = creative.creativeType

            if (type === 'songTag' || type === 'songBizTag') {
                const bucket = type === 'songTag' ? result.styles : result.moods
                listOf(creative.resources).forEach(res => {
                    const tag = titleOf(res.uiElement)
                    if (tag && bucket.indexOf(tag) === -1) bucket.push(tag)
                })
                return
            }

            if (type === 'language') {
                result.language = textLinkOf(ui)
                return
            }

            if (type === 'bpm') {
                result.bpm = textLinkOf(ui)
                return
            }

            if (type === 'songAward') {
                listOf(creative.resources).forEach(res => {
                    const resUi = res.uiElement || {}
                    const award = titleOf(resUi)
                    // subTitles 形如 [{title:'获'}, {title:'动感101年度金曲'}]
                    const work = listOf(resUi.subTitles).map(s => (s && s.title) || '').filter(Boolean).join(' ')
                    if (!award && !work) return
                    result.honors.push({ award, work })
                })
                return
            }

            if (type === 'entertainment') {
                listOf(creative.resources).forEach(res => {
                    const title = titleOf(res.uiElement)
                    if (title && result.entertainment.indexOf(title) === -1) result.entertainment.push(title)
                })
                return
            }

            if (type === 'songComment' && !result.review) {
                // 一首歌可能有多条乐评资源，取第一条有正文的
                listOf(creative.resources).some(res => {
                    const resUi = res.uiElement || {}
                    const text = descriptionOf(resUi)
                    if (!text) return false
                    result.review = {
                        text,
                        author: titleOf(resUi).replace(/^乐评来自\s*/, '')
                    }
                    return true
                })
            }
        })
    })

    return result
}

/**
 * 组装视图模型。
 * @param {Object} sources
 * @param {Object|null} sources.ugc   `/ugc/song/get` 的 data
 * @param {Object|null} sources.wiki  `/song/wiki/summary` 的 data
 * @param {Object|null} sources.album `/album` 的 album（用于取 description）
 * @returns {Object} 见下方字段注释；`hasData` 为 false 时调用方显示空态
 */
export function buildSongInfo(sources) {
    const source = sources || {}
    const ugc = source.ugc || {}
    const wiki = readWiki(source.wiki)
    const album = source.album || null

    // ---------- 事实行：一行一个 label/value，模板直接渲染 ----------
    const facts = []

    const publishTime = Number(ugc.publishTime) || 0
    if (publishTime > 0) facts.push({ label: '发行时间', value: formatMs(publishTime, 'YYYY.MM.DD') })

    // 「未知」是上游的占位值，别当成语种显示
    const language = ugc.language && ugc.language !== '未知' ? ugc.language : wiki.language
    if (language) facts.push({ label: '语种', value: language })

    // ugc 的 company 常年为 null，专辑详情里反而有（《海阔天空》= 滚石唱片），补一层兜底
    const company = ugc.company || (album && album.company) || ''
    if (company) facts.push({ label: '唱片公司', value: company })
    if (wiki.bpm) facts.push({ label: 'BPM', value: wiki.bpm })
    if (ugc.transName) facts.push({ label: '译名', value: ugc.transName })

    // 翻唱曲目才有 originalSong；部分歌曲把它写在 songSubTitle 里，两条都留
    const original = ugc.originalSong || null
    if (original && original.originalSongName) {
        const by = original.originalSongArtistName ? ' — ' + original.originalSongArtistName : ''
        facts.push({ label: '原曲', value: original.originalSongName + by })
    }

    // ---------- 词曲编曲：歌手名可点，跳歌手页 ----------
    const credits = []
    const pushCredit = (role, value) => {
        const artists = artistsOf(value)
        if (artists.length) credits.push({ role, artists })
    }
    pushCredit('作词', ugc.lyricArtists)
    pushCredit('作曲', ugc.composeArtists)
    pushCredit('编曲', ugc.arrangeArtists)
    // roleArtists 是「制作人 / 混音」这类扩展角色，结构未文档化，按 role + artistRepVos 兜底
    listOf(ugc.roleArtists).forEach(item => {
        const role = item.role || item.roleName
        if (role) pushCredit(role, item.artistRepVos || item.artists)
    })

    const desc = cleanDesc(album && album.description)
    const albumInfo = desc
        ? {
            id: (album && (album.id || album.albumId)) || 0,
            name: (album && album.name) || '',
            desc
        }
        : null

    const subtitle = ugc.songSubTitle || ''

    const hasData = !!(
        subtitle ||
        facts.length ||
        credits.length ||
        wiki.styles.length ||
        wiki.moods.length ||
        wiki.honors.length ||
        wiki.entertainment.length ||
        wiki.review ||
        albumInfo
    )

    return {
        subtitle,                       // 影视/游戏/原曲出处，一句话
        facts,                          // [{label, value}]
        credits,                        // [{role, artists:[{id,name}]}]
        styles: wiki.styles,            // [String]
        moods: wiki.moods,              // [String]
        honors: wiki.honors,            // [{award, work}]
        entertainment: wiki.entertainment, // [String]
        review: wiki.review,            // {text, author} | null
        album: albumInfo,               // {id, name, desc} | null
        hasData
    }
}
