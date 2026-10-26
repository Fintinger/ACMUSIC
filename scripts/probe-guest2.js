// 第二轮：GET/POST 稳定性 + 更多「疑似需要登录」接口 + 差异项复测
const BASE = 'https://music.archai.space/api'
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function call(path, opt = {}) {
    const { cookie, method = 'GET', ua } = opt
    const url = new URL(BASE + path)
    if (cookie) url.searchParams.set('cookie', cookie)
    url.searchParams.set('timestamp', Date.now())
    try {
        const headers = {}
        if (ua) headers['user-agent'] = ua
        const res = await fetch(url, { method, headers })
        const text = await res.text()
        let data
        try { data = JSON.parse(text) } catch (e) { data = { _raw: text.slice(0, 80) } }
        return { http: res.status, data }
    } catch (e) { return { http: 'ERR', data: { _err: String(e.message) } } }
}
const n = v => (Array.isArray(v) ? v.length : (v && typeof v === 'object' ? Object.keys(v).length : null))

;(async () => {
    console.log('### A. /register/anonimous 方法稳定性（各 6 次）')
    const cfg = [
        ['GET 默认UA', { method: 'GET' }],
        ['GET 浏览器UA', { method: 'GET', ua: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/130.0.0.0 Safari/537.36' }],
        ['POST', { method: 'POST' }],
    ]
    for (const [label, opt] of cfg) {
        const codes = []
        for (let i = 0; i < 6; i++) {
            const r = await call('/register/anonimous', opt)
            codes.push(`${r.http}/${r.data.code}${r.data.cookie ? '(有cookie)' : ''}`)
            await sleep(400)
        }
        console.log('  ' + label + ': ' + codes.join('  '))
    }

    // 拿一份游客 cookie
    const p = await call('/register/anonimous', { method: 'POST' })
    const raw = p.data.cookie || ''
    const mA = (raw.match(/(?:^|;;)MUSIC_A=([^;]+)/) || [])[1]
    const csrf = (raw.match(/(?:^|;;)__csrf=([^;]+)/) || [])[1]
    const cookieStr = [mA ? 'MUSIC_A=' + mA : '', csrf ? '__csrf=' + csrf : ''].filter(Boolean).join('; ')

    console.log('\n### B. 更多疑似「需要登录/cookie」的接口')
    const MORE = [
        ['视频分组-修正参数', '/video/group?id=9104&offset=0'],
        ['视频时间线', '/video/timeline/recommend'],
        ['用户详情', '/user/detail?uid=32953014'],
        ['用户等级', '/user/level'],
        ['用户绑定', '/user/binding'],
        ['用户分区计数', '/user/subcount'],
        ['听歌排行', '/record/recent/song?limit=5'],
        ['云盘列表', '/cloud?limit=10'],
        ['歌曲下载地址', '/song/download/url/v1?id=347230&level=standard'],
        ['enhance播放地址', '/song/enhance/player/url/v1?ids=%5B347230%5D&level=standard'],
        ['会员成长值', '/vip/growthpoint'],
        ['私信列表', '/msg/private?limit=5'],
        ['动态列表', '/event?pagesize=5'],
        ['播客推荐', '/dj/recommend'],
        ['收藏计数', '/playlist/subscribe?t=1'],
        ['新歌速递', '/top/song?type=0'],
        ['曲风-分类详情', '/style/detail'],
        ['音乐日历', '/calendar?startTime=1790000000000&endTime=1792991200000'],
        ['首次收听信息', '/music/first/listen/info'],
        ['批量接口', '/batch?e_r=true'],
        ['歌单-我喜欢的', '/playlist/detail?id=0'],
        ['搜索-歌手', '/search?keywords=%E5%91%A8%E6%9D%B0%E4%BC%A6&type=100'],
        ['评论-楼中楼', '/comment/hot?id=347230&type=0&limit=5'],
        ['相似歌单', '/simi/playlist?id=24381616'],
        ['相似歌手', '/simi/artist?id=6452'],
    ]
    const rows = []
    for (const [name, path] of MORE) {
        const a = await call(path, {})
        await sleep(320)
        const b = await call(path, { cookie: cookieStr })
        const sig = d => {
            const c = d.code ?? d.status
            const bits = []
            for (const k of ['datas', 'data', 'songs', 'list', 'event', 'msg', 'message', 'total']) {
                if (d[k] !== undefined) {
                    if (Array.isArray(d[k])) bits.push(k + '=' + d[k].length)
                    else if (d[k] && typeof d[k] === 'object') bits.push(k + '=obj' + Object.keys(d[k]).length)
                    else if (typeof d[k] === 'string' && k !== 'message') bits.push(k + '=' + (d[k].slice(0, 14) || '空'))
                }
            }
            return 'code=' + c + ' ' + bits.join(' ')
        }
        rows.push({ name, a: sig(a.data), b: sig(b.data) })
        const mark = sig(a.data) === sig(b.data) ? ' ' : '≠'
        console.log(mark + ' ' + name.padEnd(16) + ' 无cookie: ' + sig(a.data).slice(0, 62))
        if (mark === '≠') console.log('  ' + ' '.repeat(16) + ' 游客态  : ' + sig(b.data).slice(0, 62))
        await sleep(320)
    }

    console.log('\n### C. 上一轮出现差异的项，各测 4 次')
    const FLUC = [
        ['私人FM', '/personal_fm'],
        ['喜欢列表', '/likelist?uid=32953014'],
        ['推荐资源', '/recommend/resource'],
        ['每日推荐', '/recommend/songs'],
    ]
    for (const [name, path] of FLUC) {
        const out = []
        for (let i = 0; i < 4; i++) {
            const a = await call(path, {})
            const b = await call(path, { cookie: cookieStr })
            out.push(`无=${a.data.code}/` + (a.data.data ? n(a.data.data) : a.data.ids ? n(a.data.ids) : a.data.recommend ? n(a.data.recommend) : '?') +
                ` 游=${b.data.code}/` + (b.data.data ? n(b.data.data) : b.data.ids ? n(b.data.ids) : b.data.recommend ? n(b.data.recommend) : '?'))
            await sleep(400)
        }
        console.log('  ' + name.padEnd(10) + ' ' + out.join(' | '))
    }
})()
