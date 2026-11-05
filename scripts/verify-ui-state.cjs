/* 本地合成验收：读取真实组件方法，用可控 API/时钟检查状态；不访问账号或浏览器。 */
const fs = require('fs')
const path = require('path')
const vm = require('vm')
const assert = require('assert')
const parser = require('@babel/parser')
const generate = require('@babel/generator').default
const t = require('@babel/types')
const root = path.resolve(__dirname, '..')
const read = file => fs.readFileSync(path.join(root, file), 'utf8')
const results = []
async function check(name, run) { await run(); results.push(name); console.log('PASS', name) }
function ast(file) { return parser.parse(read(file).match(/<script>([\s\S]*?)<\/script>/)[1], {sourceType: 'module'}) }
function component(file, env = {}) {
  const tree = ast(file), names = [], values = []
  for (const node of tree.program.body) if (t.isImportDeclaration(node)) for (const spec of node.specifiers) {
    names.push(spec.local.name); values.push(env[spec.local.name] || {})
  }
  tree.program.body = tree.program.body.filter(n => !t.isImportDeclaration(n)).map(n => t.isExportDefaultDeclaration(n) ? t.returnStatement(n.declaration) : n)
  return new Function(...names, generate(tree).code)(...values)
}
function instance(C, props = {}) {
  const x = {...C.data.call(props), ...props, $refs: {}, $route: {query: {}}, $nextTick: f => f()}
  for (const [key, fn] of Object.entries(C.methods || {})) x[key] = fn.bind(x)
  for (const [key, fn] of Object.entries(C.computed || {})) if (typeof fn === 'function') Object.defineProperty(x, key, {get: () => fn.call(x)})
  return x
}
const rows = (start, count) => Array.from({length: count}, (_, i) => ({id: start + i, vid: 'v' + (start + i)}))
function luminance(hex) {
  return hex.slice(1).match(/../g).map(x => parseInt(x, 16) / 255).map(v => v <= .04045 ? v / 12.92 : ((v + .055) / 1.055) ** 2.4).reduce((sum, v, i) => sum + v * [.2126, .7152, .0722][i], 0)
}
function contrast(a, b) { const x = luminance(a), y = luminance(b); return (Math.max(x, y) + .05) / (Math.min(x, y) + .05) }

async function main() {
  await check('首帧主题脚本：浅/深/系统/非法偏好与存储受限', () => {
    const script = read('public/index.html').match(/<script>([\s\S]*?)<\/script>/)[1]
    for (const pref of ['light', 'dark', 'system', 'invalid', null]) for (const systemDark of [false, true]) for (const blocked of [false, true]) {
      const element = {style: {}, setAttribute(k, v) { this[k] = v }}
      vm.runInNewContext(script, {document: {documentElement: element}, window: {matchMedia: () => ({matches: systemDark})}, localStorage: {getItem() { if (blocked) throw Error(); return pref }}})
      const dark = blocked ? systemDark : pref === 'dark' || (pref !== 'light' && systemDark)
      assert.equal(element['data-theme'], dark ? 'dark' : 'light')
      assert.equal(element.style.backgroundColor, dark ? '#202633' : '#ffffff')
    }
  })
  await check('浅深文字/按钮语义配色对比度及卡片动效隔离', () => {
    const source = read('src/assets/scss/base/tokens.scss')
    const colors = text => Object.fromEntries([...text.matchAll(/--([\w-]+):\s*(#[\da-f]{6})\s*;/gi)].map(m => [m[1], m[2]]))
    const light = colors(source.match(/:root \{([\s\S]*?)\n\}/)[1])
    const dark = {...light, ...colors(source.match(/html\[data-theme="dark"\] \{([\s\S]*?)\n\}/)[1])}
    const accent = vm.runInNewContext(read('src/utils/accent.js').replace(/\bexport /g, '') + ';({accentTokens, normalizeAccent})')
    assert.equal(accent.normalizeAccent('url(bad)'), '#8685ef')
    for (const value of ['#8685ef', '#e74c3c', '#e67e22', '#27ae60', '#f39c12', '#2c3e50', '#000000', '#ffffff', '#777777']) for (const [index, palette] of [light, dark].entries()) {
      const tokens = accent.accentTokens(value)
      const c = {...palette, 'c-accent-text': tokens[index ? '--theme-ink-dark' : '--theme-ink-light'], 'c-text-on-accent': tokens['--theme-on-accent'], 'c-button-primary': tokens['--theme-accent']}
      for (const fg of ['c-text-primary', 'c-text-secondary', 'c-text-tertiary', 'c-accent-text']) for (const bg of ['c-bg-base', 'c-bg-elevated', 'c-bg-sunken', 'c-bg-sunken-hover']) assert(contrast(c[fg], c[bg]) >= 4.5, `${fg}/${bg}`)
      assert(contrast(c['c-text-on-accent'], c['c-button-primary']) >= 4.5)
    }
    const motion = read('src/assets/scss/base/motion.scss')
    assert(motion.includes('$media-cover-scale: 1.3;') && motion.includes('$media-cover-duration: 1.3s;') && motion.includes('$card-cover-scale: 1.04;'))
    for (const file of ['playlistLayout', 'albumLayout']) { const text = read(`src/assets/scss/${file}.scss`); assert(!text.includes('translateY(')); assert(!text.includes('$card-shadow-hover')); assert(text.includes('$media-cover-scale')) }
    assert(read('src/assets/scss/artistLayout.scss').includes('scale($card-cover-scale)'))
  })
  await check('评论首屏失败、热门独立失败、同页重试和旧响应隔离', async () => {
    let gain
    const C = component('src/components/layout/CommentLayout.vue', {comment: {gain: (...a) => gain(...a)}})
    const x = instance(C, {id: 'one', type: '0'})
    const response = id => ({data: {data: {comments: [{commentId: id}], totalCount: 45, cursor: 'cursor'}}})
    gain = () => Promise.reject(Error()); await x.getCommentByParams(); assert(x.loadError && !x.initialLoading)
    gain = (id, type, p) => p.sortType === 2 ? Promise.reject(Error()) : Promise.resolve(response(1)); await x.getCommentByParams(); assert(x.hotError && !x.loadError)
    const pages = []
    gain = (id, type, p) => { pages.push(p.pageNo); return Promise.reject(Error()) }; await x.loadMoreNewComment(); assert(x.page === 1 && x.pageError)
    gain = (id, type, p) => { pages.push(p.pageNo); return Promise.resolve(response(2)) }; await x.loadMoreNewComment(); assert.deepEqual(pages, [2, 2])
    const old = []; gain = () => new Promise(r => old.push(r)); const pending = x.getCommentByParams()
    x.id = 'two'; gain = () => Promise.resolve(response(200)); await x.getCommentByParams(); old.forEach(r => r(response(100))); await pending
    assert.equal(x.newComment[0].commentId, 200); assert.equal(x.hotComment[0].commentId, 200)
  })
  await check('歌单分页 0/50/重试50/100，完整性与详情恢复', async () => {
    let tracks, info
    const C = component('src/pages/ListDetail.vue', {playlistApi: {detail: () => info(), getAllTrack: (...a) => tracks(...a)}})
    const x = instance(C, {id: '123'}), offsets = []
    info = () => Promise.resolve({data: {playlist: {id: 123, trackCount: 114}}})
    tracks = (id, p) => { offsets.push(p.offset); return Promise.resolve({data: {songs: rows(1, 50)}}) }; await x.initialize(); assert(!x.allLoaded)
    tracks = (id, p) => { offsets.push(p.offset); return Promise.reject(Error()) }; await x.load(); assert(x.songsError && x.songs.length === 50)
    tracks = (id, p) => { offsets.push(p.offset); return Promise.resolve({data: {songs: rows(51, 50)}}) }; await x.load()
    tracks = (id, p) => { offsets.push(p.offset); return Promise.resolve({data: {songs: rows(101, 14)}}) }; await x.load()
    assert.deepEqual(offsets, [0, 50, 50, 100]); assert(x.allLoaded && x.noMore)
    info = () => Promise.reject(Error()); tracks = () => Promise.resolve({data: {songs: []}}); await x.initialize(); assert(x.infoError)
    x.id = undefined; await x.initialize(); assert.equal(x.infoError, '歌单链接无效')
  })
  await check('专辑与榜单错误恢复/歌手详情局部失败', async () => {
    let result
    const A = component('src/pages/AlbumDetail.vue', {albumApi: {getDetail: () => result()}})
    const a = instance(A, {id: '123'}); result = () => Promise.reject(Error()); await a.loadAlbum(); assert(a.loadError)
    result = () => Promise.resolve({data: {album: {id: 123}, songs: []}}); await a.loadAlbum(); assert(!a.loadError && !a.songs.length)
    const L = component('src/pages/explorePage/LeaderBoard/LeaderBoard.vue', {playlistApi: {toplistDetail: () => result()}})
    const l = instance(L); result = () => Promise.reject(Error()); await l.load(); assert(l.error && !l.loading)
    result = () => Promise.resolve({data: {list: []}}); await l.load(); assert(!l.error)
    const S = component('src/pages/artist/ArtistDetail.vue', {artistApi: {}})
    const s = instance(S, {id: '123'})
    s.getAtDetail = async () => ({data: {artist: {name: 'artist'}}}); s.getTop50 = async () => ({data: {songs: []}})
    s.getAlbum = async () => { throw Error() }; s.getMVs = async () => ({data: {mvs: []}}); s.getSimiAt = async () => ({data: {artists: []}}); s.getVid = async () => ({data: {data: {records: [], page: {cursor: 0}}}})
    await s.loadArtist(); assert(s.partialError && !s.loadError && !s.loading)
    s.getAtDetail = async () => { throw Error() }; await s.loadArtist(); assert(s.loadError)
  })
  await check('发现歌单及精品列表：失败保留、同偏移重试、乱序隔离', async () => {
    for (const file of ['AllList', 'BoutiqueList']) {
      let request
      const C = component(`src/pages/explorePage/playlist/${file}.vue`, {playlistApi: {top: (...a) => request(...a), highquality: (...a) => request(...a)}})
      const x = instance(C), key = file === 'AllList' ? 'renderList' : 'listForCurrentTag'
      const response = id => ({data: {playlists: [{id}], more: true, lasttime: 100}})
      request = () => Promise.resolve(response(1)); await x.fetchList(true)
      const positions = []; request = (...a) => { positions.push(file === 'AllList' ? a[0].offset : a[1]); return Promise.reject(Error()) }; await x.load(); assert(x.listError && x[key].length === 1)
      request = (...a) => { positions.push(file === 'AllList' ? a[0].offset : a[1]); return Promise.resolve(response(2)) }; await x.retryList(); assert.equal(positions[0], positions[1])
      let resolve; request = () => new Promise(r => { resolve = r }); const old = x.fetchList(true)
      request = () => Promise.resolve(response(200)); await x.fetchList(true); resolve(response(100)); await old; assert.equal(x[key][0].id, 200)
    }
  })
  await check('搜索九分类共用分页失败重试、旧响应隔离与有效空结果', async () => {
    let request
    const code = read('src/mixins/searchMixin.js').replace(/^import .*$/gm, '').replace('export const searchMixin', 'const searchMixin')
    const C = new Function('searchV2', 'EmptyState', code + '; return searchMixin')((...a) => request(...a), {})
    const x = instance(C, {keyword: 'test', limit: 2, type: 1, resultIn: 'songs', countIn: 'songCount'})
    const response = start => ({data: {code: 200, result: {songs: rows(start, 2), songCount: 10}}})
    request = () => Promise.reject(Error()); await x.initLoad(); assert(x.searchError && !x.searchLoading)
    request = () => Promise.resolve(response(1)); await x.initLoad()
    const offsets = []; request = p => { offsets.push(p.offset); return Promise.reject(Error()) }; await x.load(); assert(x.searchPageError && x.page === 0)
    request = p => { offsets.push(p.offset); return Promise.resolve(response(3)) }; await x.load(); assert.deepEqual(offsets, [2, 2]); assert.equal(x.list.length, 4)
    let resolve; request = () => new Promise(r => { resolve = r }); const old = x.load()
    request = () => Promise.resolve(response(200)); await x.initLoad(); resolve(response(100)); await old; assert.equal(x.list[0].id, 200)
    request = () => Promise.resolve({data: {code: 200, result: {}}}); await x.initLoad(); assert(x.noMore && !x.searchError)
    for (const file of fs.readdirSync(path.join(root, 'src/pages/search')).filter(f => f.endsWith('.vue'))) assert(read('src/pages/search/' + file).includes(':error="searchPageError"'))
  })
  await check('MV 筛选与视频分页隔离', async () => {
    let request
    const M = component('src/pages/explorePage/MvList.vue', {mvApi: {all: p => request(p)}}), m = instance(M)
    const queries = []; request = p => { queries.push(p); return Promise.resolve({data: {data: rows(1, 12), hasMore: true}}) }
    await m.selectItem('地区', '全部'); await m.selectItem('类型', '全部'); assert.equal(queries.length, 2); assert.equal(queries[1].type, '全部')
    request = () => Promise.reject(Error()); await m.load(); assert(m.listError && m.offset === 12 && m.renderedList.length === 12)
    const V = component('src/pages/explorePage/VideoList.vue', {videoApi: {}, searchApi: {searchV2: p => request(p)}}), v = instance(V, {curId: 1})
    request = () => Promise.resolve({data: {code: 200, result: {videos: rows(1, 30)}}}); await v.reload()
    let resolve; request = () => new Promise(r => { resolve = r }); const old = v.load()
    v.curId = 2; request = () => Promise.resolve({data: {code: 200, result: {videos: rows(200, 1)}}}); await v.reload()
    resolve({data: {code: 200, result: {videos: rows(100, 30)}}}); await old; assert.equal(v.renderList[0].vid, 'v200'); assert.equal(v.offset, 0)
  })
  await check('媒体详情相关推荐失败不影响 URL，保留 Mlog 与 MV 跳转', async () => {
    const V = component('src/pages/VideoPlay.vue', {videoApi: {detail: async () => ({data: {data: {title: 'video'}}}), url: async () => ({data: {urls: [{url: 'https://example.test/stream'}]}}), mlogToVideo: async () => ({data: {data: 'HEXVIDEO'}})}, fetchRelatedVideos: async () => { throw Error() }, fetchRecommendVideos: async () => []})
    const v = instance(V, {id: 'a1demo'}); await v.loadMedia(); assert(!v.urlFailed && !v.detailFailed && v.url); assert.equal(v.newId, 'HEXVIDEO')
    v.id = '123'; v.$router = {replace: r => { v.redirect = r }}; await v.loadMedia(); assert.equal(v.redirect.name, 'mvPlay')
    v.id = undefined; await v.loadMedia(); assert(v.detailFailed)
  })
  await check('用户主页失败结束骨架、重试不重复累加歌单', async () => {
    const C = component('src/components/layout/UserDetailLayout.vue')
    const x = instance(C, {uid: '2'})
    x.$store = {state: {UserAbout: {profile: {userId: 1}}}, getters: {}}
    x.getPlaylist = async () => ({data: {playlist: [{id: 10, creator: {userId: 2}}]}})
    x.loadSocial = async () => {}
    x.getUserInfo = async () => { throw Error() }
    await x.loadPage(); assert(x.pageError && !x.pageLoading)
    x.getUserInfo = async () => { x.userInfo = {profile: {userId: 2}} }
    await x.loadPage(); await x.loadPage()
    assert(!x.pageError && !x.pageLoading); assert.equal(x.createList.length, 1); assert.equal(x.favorTracks.length, 1)
  })
  await check('云盘下载权限、重复点击、异常复位（合成响应）', async () => {
    let result, opened = 0, calls = 0, warnings = 0
    const C = component('src/components/userPage/RankList.vue', {downloadUrlV1: () => { calls++; return result() }, config: {player: {level: 'standard'}}})
    const x = instance(C, {$set: (o, k, v) => { o[k] = v }, $toast: {warning() {warnings++}, error() {warnings++}, info() {}}})
    const saved = global.document
    global.document = {createElement: () => ({click() {opened++}, remove() {}}), body: {appendChild() {}}}
    try {
      result = () => Promise.resolve({data: {data: {url: null}}}); await x.download({id: 1}); assert.equal(opened, 0); assert(!x.downloading[1])
      result = () => Promise.reject(Error()); await x.download({id: 1}); assert(!x.downloading[1]); assert.equal(warnings, 2)
      let resolve; result = () => new Promise(r => {resolve = r})
      const pending = x.download({id: 1, name: 'test'}); await x.download({id: 1}); assert.equal(calls, 3)
      resolve({data: {data: {url: 'https://example.test/audio', type: 'mp3'}}}); await pending
      assert.equal(opened, 1); assert(!x.downloading[1])
    } finally { global.document = saved }
  })
  await check('播放器定时、首数停止、副歌到点与单曲副歌循环（虚拟时钟）', () => {
    const tree = ast('src/components/musicPlayer/PlayerCore.vue')
    const obj = tree.program.body.find(n => t.isExportDefaultDeclaration(n)).declaration
    const group = name => obj.properties.find(p => p.key.name === name).value
    let now = 1000, tick, paused = 0, next = 0
    const make = node => new Function('Date', 'setInterval', 'clearInterval', 'setTimeout', 'console', `return (${generate(t.functionExpression(null, node.params, node.body, node.generator, node.async)).code})`)({now: () => now}, fn => { tick = fn; return 1 }, () => {}, () => {}, {log() {}})
    const x = {volume: 20, fadeSec: 20, sleepFade: true, fadeStarted: false, sleepTimerId: null, timeDuration: 180, timeNow: 100, sel: {currentTime: 0}, showHint() {}, pauseSong() { paused++ }, _autoNext() { next++ }}
    for (const key of ['_applySleep', '_clearSleepClock', '_cancelFade', '_startSleepClock', '_maybeFade', '_fadeRemainSec', '_sleepStop', '_consumeSleep', '_onRangeTick']) x[key] = make(group('methods').properties.find(p => p.key && p.key.name === key)).bind(x)
    Object.defineProperty(x, 'sleepRemainSec', {get: make(group('computed').properties.find(p => p.key && p.key.name === 'sleepRemainSec')).bind(x)})
    x._applySleep('time', 1, true); now += 61000; tick(); assert.equal(paused, 1); assert.equal(x.sleepMode, 'off'); assert.equal(x.volume, 20)
    x._applySleep('count', 2, true); assert(!x._consumeSleep()); assert(x._consumeSleep()); assert.equal(paused, 2)
    x._applySleep('song', 0, true); assert(!x._consumeSleep(true)); assert(x._consumeSleep(false)); assert.equal(paused, 3)
    Object.assign(x, {effectiveForm: 'chorus', chorusRangeValid: true, chorusRange: {start: 20, end: 40}, autoNextLocked: false, playMode: 'order', currentSong: {id: 1}})
    assert(!x._onRangeTick(30)); assert(x._onRangeTick(40)); assert.equal(next, 1)
    x.playMode = 'loop'; x.autoNextLocked = false; x._onRangeTick(40); assert.equal(x.sel.currentTime, 20); assert.equal(next, 1)
  })
  const output = {kind: 'local-synthetic', generatedAt: new Date().toISOString(), passed: results.length, results, limits: ['不证明真实断网恢复', '不证明首帧全过程无闪烁', '虚拟时钟不等于真实音频播放', '未执行账号写操作或外部部署']}
  if (process.env.ACMUSIC_QA_OUTPUT) fs.writeFileSync(process.env.ACMUSIC_QA_OUTPUT, JSON.stringify(output, null, 2))
  console.log(`全部通过：${results.length} 组；边界见输出报告。`)
}
main().catch(error => { console.error(error); process.exitCode = 1 })
