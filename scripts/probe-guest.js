// 游客态 vs 未登录态 接口可用性对比探针
// 直接打线上网关 https://music.archai.space/api/*
const BASE = 'https://music.archai.space/api'
const sleep = ms => new Promise(r => setTimeout(r, ms))

async function call(path, opt = {}) {
    const { cookie, method = 'GET', body } = opt
    const url = new URL(BASE + path)
    if (cookie) url.searchParams.set('cookie', cookie)
    url.searchParams.set('timestamp', Date.now())
    const t0 = Date.now()
    try {
        const init = { method, headers: {} }
        if (body) {
            init.headers['content-type'] = 'application/json'
            init.body = JSON.stringify(body)
        }
        const res = await fetch(url, init)
        const text = await res.text()
        let data
        try { data = JSON.parse(text) } catch (e) { data = { _raw: text.slice(0, 100) } }
        return { http: res.status, data, ms: Date.now() - t0 }
    } catch (e) {
        return { http: 'ERR', data: { _err: String(e.message || e) }, ms: Date.now() - t0 }
    }
}

const n = v => (Array.isArray(v) ? v.length : (v && typeof v === 'object' ? Object.keys(v).length : null))

// 每个接口的「可读指标」，用于判断是否真拿到数据
const CASES = [
    { name: '登录状态', path: '/login/status', sum: d => `code=${d.code} profile=${d.data && d.data.profile ? '有' : 'null'} account=${d.account ? '有' : 'null'}` },
    { name: '账号信息', path: '/user/account', sum: d => `code=${d.code} profile=${d.profile ? '有' : 'null'}` },
    { name: '搜索-单曲', path: '/search?keywords=%E5%91%A8%E6%9D%B0%E4%BC%A6&type=1&limit=10', sum: d => `code=${d.code} songs=${d.result && d.result.songCount}` },
    { name: '云搜索', path: '/cloudsearch?keywords=%E5%91%A8%E6%9D%B0%E4%BC%A6&type=1', sum: d => `code=${d.code} songs=${d.result && d.result.songCount}` },
    { name: '歌曲详情', path: '/song/detail?ids=347230,186016', sum: d => `code=${d.code} songs=${n(d.songs)}` },
    { name: '播放地址-v1', path: '/song/url/v1?id=347230&level=standard', sum: d => `code=${d.code} url=${d.data && d.data[0] && d.data[0].url ? '有' : 'null'} br=${d.data && d.data[0] && d.data[0].br}` },
    { name: '播放地址-无损', path: '/song/url/v1?id=347230&level=lossless', sum: d => `code=${d.code} url=${d.data && d.data[0] && d.data[0].url ? '有' : 'null'} br=${d.data && d.data[0] && d.data[0].br}` },
    { name: '歌词', path: '/lyric?id=347230', sum: d => `code=${d.code} lrc=${d.lrc && d.lrc.lyric ? d.lrc.lyric.length + '字' : 'null'}` },
    { name: '评论', path: '/comment/music?id=347230&limit=20', sum: d => `code=${d.code} total=${d.total} hot=${n(d.hotComments)}` },
    { name: '歌单详情', path: '/playlist/detail?id=24381616', sum: d => `code=${d.code} tracks=${d.playlist && d.playlist.trackCount}` },
    { name: '歌单分类', path: '/playlist/catlist', sum: d => `code=${d.code} sub=${n(d.sub)}` },
    { name: '歌手详情', path: '/artist/detail?id=6452', sum: d => `code=${d.code} name=${d.data && d.data.artist && d.data.artist.name}` },
    { name: '专辑详情', path: '/album?id=32311', sum: d => `code=${d.code} name=${d.album && d.album.name}` },
    { name: '相似歌曲', path: '/simi/song?id=347230', sum: d => `code=${d.code} songs=${n(d.songs)}` },
    { name: '推荐歌单', path: '/personalized?limit=6', sum: d => `code=${d.code} result=${n(d.result)}` },
    { name: '推荐新歌', path: '/personalized/newsong?limit=5', sum: d => `code=${d.code} result=${n(d.result)}` },
    { name: '每日推荐', path: '/recommend/songs', sum: d => `code=${d.code} songs=${d.data && n(d.data.dailySongs)}` },
    { name: '推荐资源', path: '/recommend/resource', sum: d => `code=${d.code} rec=${n(d.recommend)}` },
    { name: 'VIP信息', path: '/vip/info', sum: d => `code=${d.code} level=${d.data && d.data.redVipLevel} assoc=${d.associator && d.associator.vipCode}` },
    { name: '首页聚合', path: '/homepage/block/page', sum: d => `code=${d.code} blocks=${d.data && n(d.data.blocks)}` },
    { name: '视频分组', path: '/video/group?id=9104', sum: d => `code=${d.code} datas=${n(d.datas)}` },
    { name: 'MV地址', path: '/mv/url?id=5436712', sum: d => `code=${d.code} url=${d.data && d.data.url ? '有' : 'null'}` },
    { name: '喜欢列表', path: '/likelist?uid=32953014', sum: d => `code=${d.code} ids=${n(d.ids)}` },
    { name: '用户歌单', path: '/user/playlist?uid=32953014&limit=5', sum: d => `code=${d.code} list=${n(d.playlist)}` },
    { name: '私人FM', path: '/personal_fm', sum: d => `code=${d.code} songs=${n(d.data)}` },
    { name: '云随机', path: '/playmode/song/vector?ids=%5B347230%5D', sum: d => `code=${d.code} data=${n(d.data)}` },
    { name: '版权检查', path: '/check/music?id=347230&br=320000', sum: d => `code=${d.code} ok=${d.success} msg=${d.message || ''}` },
    { name: '听歌打卡', path: '/scrobble?id=347230&sourceid=1&time=240', sum: d => `code=${d.code} msg=${d.message || ''}` },
    { name: '收藏-心动', path: '/like?id=347230&like=true', sum: d => `code=${d.code} msg=${d.message || ''}` },
    { name: '关注歌手', path: '/follow?id=6452&t=1', sum: d => `code=${d.code} msg=${d.message || ''}` },
    { name: '搜索建议', path: '/search/suggest?keywords=%E5%91%A8%E6%9D%B0%E4%BC%A6', sum: d => `code=${d.code} allMatch=${n(d.result && d.result.allMatch)}` },
    { name: '热门搜索', path: '/search/hot/detail', sum: d => `code=${d.code} data=${n(d.data)}` },
    { name: '排行版', path: '/toplist', sum: d => `code=${d.code} list=${n(d.list)}` },
    { name: '曲风列表', path: '/style/list', sum: d => `code=${d.code} data=${n(d.data)}` },
    { name: '歌手列表', path: '/artist/list?type=1&area=7&limit=5', sum: d => `code=${d.code} artists=${n(d.artists)}` },
]

function pad(s, w) { s = String(s); return s + ' '.repeat(Math.max(0, w - [...s].reduce((a, c) => a + (c.charCodeAt(0) > 255 ? 2 : 1), 0))) }

async function runGroup(label, cookie) {
    console.log('\n===== ' + label + (cookie ? '  [cookie 长度 ' + cookie.length + ']' : '  [无 cookie]') + ' =====')
    const out = []
    for (const c of CASES) {
        const r = await call(c.path, { cookie })
        let s
        try { s = c.sum(r.data || {}) } catch (e) { s = 'sum-err' }
        const line = `http=${r.http} ${s}`
        console.log(pad(c.name, 14) + ' | ' + line)
        out.push({ name: c.name, http: r.http, data: r.data, sum: line })
        await sleep(350)
    }
    return out
}

;(async () => {
    // 1) 先试 GET（项目当前写法）
    const g = await call('/register/anonimous', { method: 'GET' })
    console.log('GET /register/anonimous ->', g.http, JSON.stringify(g.data).slice(0, 80))

    // 2) 再用 POST 正确调用
    const p = await call('/register/anonimous', { method: 'POST' })
    console.log('POST /register/anonimous ->', p.http, 'code=', p.data.code, 'userId=', p.data.userId, 'cookieLen=', (p.data.cookie || '').length)
    const raw = p.data.cookie || ''
    const mA = (raw.match(/(?:^|;;)MUSIC_A=([^;]+)/) || [])[1]
    const csrf = (raw.match(/(?:^|;;)__csrf=([^;]+)/) || [])[1]
    const hasU = /(?:^|;;)MUSIC_U=/.test(raw)
    console.log('  含 MUSIC_A:', !!mA, ' 含 __csrf:', !!csrf, ' 含 MUSIC_U:', hasU)

    const cookieStr = [mA ? 'MUSIC_A=' + mA : '', csrf ? '__csrf=' + csrf : ''].filter(Boolean).join('; ')
    console.log('  发送用 cookie:', cookieStr.slice(0, 40) + '...')

    const A = await runGroup('未登录（无 cookie）', '')
    const B = await runGroup('游客登录（MUSIC_A）', cookieStr)

    console.log('\n===== 差异汇总 =====')
    for (let i = 0; i < A.length; i++) {
        if (A[i].sum !== B[i].sum) {
            console.log('* ' + pad(A[i].name, 14) + '\n    无cookie: ' + A[i].sum + '\n    游客态  : ' + B[i].sum)
        }
    }
    console.log('\n===== 完全一致的接口 =====')
    console.log(A.filter((x, i) => x.sum === B[i].sum).map(x => x.name).join(' / '))

    // 附：保存原始结果供后续查证
    const fs = require('fs')
    fs.writeFileSync(process.env.TMP + '/guest-probe.json', JSON.stringify({ anon: p.data, A, B }, null, 2))
    console.log('\n原始结果已存 ' + process.env.TMP + '/guest-probe.json')
})()
