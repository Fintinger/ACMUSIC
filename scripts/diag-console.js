// 临时诊断脚本：自己拉起无头 Edge，用 CDP 抓页面加载期的 console 错误与未捕获异常
// 仅本地排查用，不进入构建产物，不提交
const http = require('http')
const path = require('path')
const fs = require('fs')
const { spawn } = require('child_process')
const WebSocket = require('ws')

const EDGE = 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const PORT = 9334
const TARGET = process.argv[2] || 'http://localhost:8083/'
const WAIT_MS = Number(process.argv[3] || 9000)
const PROFILE = path.join(require('os').tmpdir(), 'edge-diag-' + Date.now())

function getJSON(p) {
  return new Promise((resolve, reject) => {
    http.get({ host: '127.0.0.1', port: PORT, path: p }, res => {
      let body = ''
      res.on('data', c => (body += c))
      res.on('end', () => { try { resolve(JSON.parse(body)) } catch (e) { reject(e) } })
    }).on('error', reject)
  })
}

const sleep = ms => new Promise(r => setTimeout(r, ms))

;(async () => {
  if (!fs.existsSync(EDGE)) throw new Error('Edge not found')
  const child = spawn(EDGE, [
    '--headless=new', '--disable-gpu', '--no-first-run', '--no-default-browser-check',
    '--remote-debugging-port=' + PORT, '--user-data-dir=' + PROFILE, 'about:blank',
  ], { stdio: 'ignore' })

  let list = null
  for (let i = 0; i < 40; i++) {
    try { list = await getJSON('/json/list'); if (list && list.length) break } catch (e) { /* not up yet */ }
    await sleep(250)
  }
  if (!list || !list.length) throw new Error('CDP not reachable')

  const page = list.find(t => t.type === 'page') || list[0]
  const ws = new WebSocket(page.webSocketDebuggerUrl, { perMessageDeflate: false })
  let id = 0
  const send = (method, params) => ws.send(JSON.stringify({ id: ++id, method, params: params || {} }))
  const logs = []

  ws.on('message', raw => {
    const msg = JSON.parse(raw)
    const frames = st => (st && st.callFrames || []).slice(0, 8)
      .map(f => `    at ${f.functionName || '(anon)'} ${String(f.url).replace(/^https?:\/\/localhost:\d+/, '')}:${f.lineNumber + 1}:${f.columnNumber + 1}`).join('\n')
    if (msg.method === 'Runtime.consoleAPICalled' && msg.params.type === 'error') {
      logs.push({ kind: 'console.error', text: msg.params.args.map(a => a.value || a.description || a.type).join(' '), stack: frames(msg.params.stackTrace) })
    }
    if (msg.method === 'Runtime.exceptionThrown') {
      const d = msg.params.exceptionDetails
      logs.push({ kind: 'uncaught', text: (d.exception && (d.exception.description || d.exception.value)) || d.text, stack: frames(d.stackTrace) })
    }
    if (msg.method === 'Log.entryAdded' && msg.params.entry.level === 'error') {
      logs.push({ kind: 'log.error', text: msg.params.entry.text, stack: msg.params.entry.url || '' })
    }
  })

  await new Promise(r => ws.on('open', r))
  send('Runtime.enable')
  send('Log.enable')
  send('Page.enable')
  await sleep(300)
  send('Page.navigate', { url: TARGET })
  await sleep(WAIT_MS)

  // --seed：模拟"老用户"的本地持久化状态（播放记录 + 音质档位 + 登录态标记），再刷新复现
  if (process.env.SEED_STATE === '1') {
    const evalOnce = expr => new Promise(resolve => {
      const myId = ++id
      const onMsg = raw => {
        const m = JSON.parse(raw)
        if (m.id === myId) { ws.off('message', onMsg); resolve(m.result) }
      }
      ws.on('message', onMsg)
      ws.send(JSON.stringify({ id: myId, method: 'Runtime.evaluate', params: { expression: expr, returnByValue: true } }))
    })
    const seed = {
      song: { id: 1974443814, name: '测试曲目', cover: 'http://p1.music.126.net/x.jpg', artists: '测试歌手' },
      playlist: Array.from({ length: 5 }, (_, i) => ({
        id: 1974443814 + i, name: '测试曲目' + i, artists: '测试歌手',
        album: '测试专辑', picUrl: 'http://p1.music.126.net/x.jpg', duration: 240000, source: '',
      })),
      currentIndex: 2,
      currentTime: 63.5,
      duration: 240,
      quality: { requested: 'exhigh', actual: 'exhigh' },
      source: 'playlist',
      playMode: 'order',
      timestamp: Date.now(),
    }
    await evalOnce(`localStorage.setItem('acmusic_player_state', ${JSON.stringify(JSON.stringify(seed))}); localStorage.setItem('acmusic_play_mode','order'); 'seeded'`)
    logs.length = 0
    send('Page.reload', { ignoreCache: true })
    await sleep(WAIT_MS)
  }

  // 页面里 Vue 的 errorHandler 会把错误打到 console.error，这里再兜一次全局标记
  const probe = await new Promise(resolve => {
    const myId = ++id
    const onMsg = raw => {
      const m = JSON.parse(raw)
      if (m.id === myId) { ws.off('message', onMsg); resolve(m.result) }
    }
    ws.on('message', onMsg)
    ws.send(JSON.stringify({
      id: myId, method: 'Runtime.evaluate',
      params: { expression: 'JSON.stringify({title: document.title, toasts: Array.from(document.querySelectorAll(".el-message")).map(e=>e.innerText), bodyLen: document.body.innerText.length})', returnByValue: true },
    }))
  })
  console.log('DOM:', probe && probe.result && probe.result.value)

  if (!logs.length) {
    console.log('\nNO_ERRORS')
  } else {
    console.log('\n共 ' + logs.length + ' 条：')
    logs.forEach((l, i) => {
      console.log(`\n[${i + 1}] ${l.kind}`)
      console.log('  ' + String(l.text).split('\n').slice(0, 8).join('\n  '))
      if (l.stack) console.log(l.stack)
    })
  }

  ws.close()
  child.kill()
  await sleep(500)
  try { fs.rmSync(PROFILE, { recursive: true, force: true }) } catch (e) { /* ignore */ }
  process.exit(0)
})().catch(e => { console.error('DIAG_FAIL:', e.message); process.exit(1) })
