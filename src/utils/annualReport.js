/**
 * 年度听歌报告 —— 数据归一化（纯函数，不发起请求）
 *
 * 为什么需要这一层：
 *   接口每年一套 schema，字段名、层级、单位全都不一样，UI 层不该碰这些差异。
 *   这里只做「多源 → 统一形态」的转换，所有函数都是纯函数，方便对照真实响应核对。
 *
 * 统一形态：
 *   song   = { id, name, artist, cover, playCnt, playDays, userCount, publishYear }
 *   singer = { id, name, cover }
 *   row    = { year, song, singer }        // singer 可能为 null（早年接口不提供）
 */

/** 网关放行的年份（超出范围返回 code 404「接口未找到！」） */
export const SUPPORTED_YEARS = [2017, 2018, 2019, 2020, 2021, 2022, 2023, 2024]

function num(v) {
    const n = Number(v)
    return isFinite(n) ? n : null
}

/**
 * 年度之歌（2022–2024 都有 annualSong；2021 只有一首、字段名不同，暂不解析）
 * @param {object} data 接口返回的 data
 * @returns {object|null}
 */
export function pickAnnualSong(data) {
    const s = data && data.annualSong
    // annualSong 可能为空壳（2022 的 items 结构不同），只认带歌名的
    if (!s || !s.songName) return null
    return {
        id: s.songId,
        name: s.songName,
        artist: s.artistNameList || '',
        cover: s.songPicUrl || '',
        playCnt: num(s.playCnt),
        playDays: num(s.playDays),
        userCount: num(s.userCountOfThisAnnualSong),
        publishYear: ''
    }
}

/**
 * 逐年足迹（**2023 年独有**）：一次返回 2016–2022 的「年度之歌」
 * 这是跨年时间线能只发 2 个请求的关键 —— 2024 没有这块数据。
 * @param {object} data 接口返回的 data
 * @returns {Array<{year:number, song:object}>}
 */
export function pickFootprint(data) {
    const list = data && data.yuncunFootprintPage && data.yuncunFootprintPage.footprintItems
    if (!Array.isArray(list)) return []
    return list
        .map(it => {
            const s = (it && it.song) || {}
            const year = num(it && it.year)
            if (!year || !s.songName) return null
            return {
                year,
                song: {
                    id: s.songId,
                    name: s.songName,
                    artist: s.artistName || '',
                    cover: s.songCoverUrl || '',
                    playCnt: null,
                    playDays: null,
                    userCount: null,
                    publishYear: it.publishYear || ''
                }
            }
        })
        .filter(Boolean)
}

/**
 * 多年年度歌手对比（2023 覆盖 2019–2023，2024 覆盖 2020–2024）
 * 注意：这块只有 year / singerId / singerName / singerPicUrl，**没有播放次数**。
 * @param {object} data 接口返回的 data
 * @returns {Array<{year:number, singer:object}>}
 */
export function pickSingerCompare(data) {
    const list = data && data.annualSingerComparePage && data.annualSingerComparePage.singers
    if (!Array.isArray(list)) return []
    return list
        .map(it => {
            const year = num(it && it.year)
            if (!year || !it.singerName) return null
            return {
                year,
                singer: {
                    id: it.singerId,
                    name: it.singerName,
                    cover: it.singerPicUrl || ''
                }
            }
        })
        .filter(Boolean)
}

/**
 * 逐年「播放次数 / 时长」（来自 /listen/data/year/report）
 * 该接口一次返回全部年份，playDuration 统一为**秒**，且包含 2025。
 * @param {object} body 响应体
 * @returns {{displayYear:number|null, stats:Map<number,{playNum:number, playDuration:number}>}}
 */
export function pickYearStats(body) {
    const data = body && body.code === 200 ? body.data : null
    const stats = new Map()
    if (!data || !Array.isArray(data.yearItems)) {
        return {displayYear: null, stats}
    }
    data.yearItems.forEach(it => {
        const year = num(it && it.year)
        if (!year) return
        stats.set(year, {
            playNum: num(it.playNum) || 0,
            playDuration: num(it.playDuration) || 0
        })
    })
    return {displayYear: num(data.displayYear), stats}
}

/**
 * 把多个年份的响应合并成一条时间线
 * @param {Array<{year:number, body:object}>} sources 每项是一次 /summary/annual 响应体
 * @param {Map<number,{playNum:number,playDuration:number}>} [stats] 逐年量化数据
 * @returns {Array<{year:number, song:object|null, singer:object|null, stats:object|null, ratio:number}>} 年份倒序
 */
export function mergeTimeline(sources, stats) {
    const songs = new Map()
    const singers = new Map()

    ;(sources || []).forEach(src => {
        const data = src && src.body && src.body.code === 200 ? src.body.data : null
        if (!data) return

        // 歌手对比：当年份更全时覆盖（2024 的列表比 2023 多新一年）
        pickSingerCompare(data).forEach(x => singers.set(x.year, x.singer))

        // 逐年足迹：2016–2022
        pickFootprint(data).forEach(x => songs.set(x.year, x.song))

        // 当年年度之歌：优先级高于足迹（更详细，带播放次数）
        const own = pickAnnualSong(data)
        if (own && src.year) songs.set(Number(src.year), own)
    })

    const yearSet = new Set([...songs.keys(), ...singers.keys()])
    if (stats) stats.forEach((_, year) => yearSet.add(year))

    // 条形长度按最长年份归一，避免 2017 那种 37 小时被压成看不见
    let maxDuration = 0
    if (stats) stats.forEach(v => { maxDuration = Math.max(maxDuration, v.playDuration || 0) })

    return Array.from(yearSet)
        .sort((a, b) => b - a)
        .map(year => {
            const st = (stats && stats.get(year)) || null
            // playNum 口径并非每年一致：实测 2019 = 3.6 分钟/次（合理），
            // 2018 = 35 分钟/次（明显不是"播放次数"，更像听过的不同歌曲数）。
            // 单次落在这个区间外就认定不可用，宁可只显示时长也不展示荒谬数字。
            const secPerPlay = st && st.playNum ? st.playDuration / st.playNum : 0
            return {
                year,
                song: songs.get(year) || null,
                singer: singers.get(year) || null,
                stats: st,
                countReliable: secPerPlay >= 20 && secPerPlay <= 1800,
                ratio: st && st.playDuration && maxDuration ? st.playDuration / maxDuration : 0
            }
        })
}

/**
 * 某年某月的月末时间戳。
 * 排行接口的 endTime 必须是月末 23:59:59.999（实测传月初/月中都返回空数组）。
 * @param {number} year
 * @param {number} month 1-12
 * @returns {number}
 */
export function monthEnd(year, month) {
    // new Date(y, m, 0) = 该月最后一天 00:00，减 1ms 得到末日 23:59:59.999
    return new Date(year, month, 0, 23, 59, 59, 999).getTime() - 1
}

/**
 * 聚合 12 个月的 TOP20 排行，估算「年度最常播放」。
 *
 * 局限（必须如实标注）：
 *   - 每个月只给 TOP20，掉出月榜的播放量丢失，聚合值必然**小于**真实总量；
 *   - 每首歌的 `artists` 是对象数组，拆成单个歌手名后累加，合作曲会同时计入双方；
 *   - 这是近似，不等于官方年度之歌。
 *
 * @param {Array<object>} monthBodies 每月一次响应体
 * @returns {{topSong:object|null, topArtist:object|null, months:number, songCount:number}}
 */
export function aggregateYearRank(monthBodies) {
    const songs = new Map()
    const artists = new Map()
    let months = 0

    ;(monthBodies || []).forEach(body => {
        const data = body && body.code === 200 ? body.data : null
        const items = (data && data.songItems) || []
        if (!items.length) return
        months++

        items.forEach(it => {
            const id = num(it && it.songId)
            const cnt = num(it && it.playCount) || 0
            if (!id || !it.songName) return

            // 实测 songItems[].artists 是 [{artistId, artistName}] 对象数组，
            // 但别处（年报）同名字段是字符串，两种都兜住
            const names = Array.isArray(it.artists)
                ? it.artists.map(a => (a && a.artistName) || '').filter(Boolean)
                : String(it.artists || '').split(/[,、&/]/).map(s => s.trim()).filter(Boolean)

            const cur = songs.get(id) || {
                id,
                name: it.songName,
                artist: names.join(' / '),
                cover: it.picUrl || '',
                playCnt: 0
            }
            cur.playCnt += cnt
            songs.set(id, cur)

            names.forEach(name => artists.set(name, (artists.get(name) || 0) + cnt))
        })
    })

    const topSong = Array.from(songs.values()).sort((a, b) => b.playCnt - a.playCnt)[0] || null
    const topArtistEntry = Array.from(artists.entries()).sort((a, b) => b[1] - a[1])[0]

    return {
        topSong,
        topArtist: topArtistEntry ? {name: topArtistEntry[0], playCnt: topArtistEntry[1]} : null,
        months,
        songCount: songs.size
    }
}

/**
 * 把接口失败翻译成人话（区分网关 404 与上游 404）
 * @param {object} body 响应体
 * @returns {string} 空串表示无错误
 */
export function describeFailure(body) {
    if (!body) return '接口无响应'
    if (body.code === 200) return ''
    if (body.code === 404) {
        // 网关自造用 message，上游用 msg
        if (body.message) return '该年份报告未开放（网关仅支持 2017–2024）'
        return '该年份没有你的听歌记录'
    }
    if (body.code === 301) return '请求过于频繁，稍后再试'
    return body.msg || body.message || ('接口返回 ' + body.code)
}
