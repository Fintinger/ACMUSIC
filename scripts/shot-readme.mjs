#!/usr/bin/env node
/**
 * 为 README 拍三张截图：首页 / 歌单详情 / 展开播放器（深色主题、1440×900、未登录）。
 *
 * 前置：本地 dev server 已启动（`yarn serve`），并且装了 Edge。
 * 用法：`yarn shot:readme`（默认输出到 docs/assets/screenshots/）
 *
 * 两个 headless 坑（踩过，别再踩）：
 * 1. 无头浏览器不会主动产帧，Vue 的进入过渡会卡在 opacity:0 —— 必须反复
 *    captureScreenshot 强制出帧，等过渡真的跑完再拍正式图。
 * 2. 带 backdrop-filter 的悬浮按钮在 `--disable-gpu` 下偶尔渲染成黑块，
 *    多刷几帧即可恢复。
 *
 * 截图落盘为 PNG，随后用 Python + Pillow 转 WebP 并删掉 PNG（体积约 1/6）。
 * 没有 Python 时保留 PNG，需自行调整 README 里的图片路径。
 */
import { execFileSync, spawn } from 'node:child_process'
import { mkdtempSync, mkdirSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'

const EDGE = process.env.EDGE_PATH || 'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe'
const PORT = Number(process.env.CDP_PORT || 9340)
const BASE = process.env.PREVIEW_URL || 'http://localhost:8080'
const OUT = resolve(process.argv[2] || 'docs/assets/screenshots')
const SHOTS = ['home', 'playlist', 'player']
const sleep = ms => new Promise(r => setTimeout(r, ms))

if (!existsSync(EDGE)) {
  console.error(`[shots] 找不到浏览器：${EDGE}\n用 EDGE_PATH 环境变量指定可执行文件路径。`)
  process.exit(1)
}

mkdirSync(OUT, { recursive: true })
const edge = spawn(EDGE, ['--headless=new', `--remote-debugging-port=${PORT}`,
  `--user-data-dir=${mkdtempSync(join(tmpdir(), 'acmusic-shots-'))}`,
  '--window-size=1440,900', '--hide-scrollbars', '--no-first-run', '--disable-gpu', '--mute-audio', 'about:blank'], { stdio: 'ignore' })

async function findTarget() {
  for (let i = 0; i < 60; i++) {
    try {
      const list = await (await fetch(`http://127.0.0.1:${PORT}/json/list`)).json()
      const page = list.find(t => t.type === 'page')
      if (page) return page
    } catch (_) { /* 端口还没起来 */ }
    await sleep(250)
  }
  throw new Error('调试端口未就绪')
}

const target = await findTarget()
const ws = new WebSocket(target.webSocketDebuggerUrl)
await new Promise((res, rej) => { ws.onopen = res; ws.onerror = rej })

let seq = 0
const pending = new Map()
ws.onmessage = ev => {
  const msg = JSON.parse(ev.data)
  if (msg.id && pending.has(msg.id)) {
    const { resolve: r, reject } = pending.get(msg.id)
    pending.delete(msg.id)
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : r(msg.result)
  }
}
const send = (method, params = {}) => new Promise((resolve, reject) => {
  const id = ++seq
  pending.set(id, { resolve, reject })
  ws.send(JSON.stringify({ id, method, params }))
})
const evaluate = async expression => {
  const r = await send('Runtime.evaluate', { expression, returnByValue: true, awaitPromise: true })
  return r.result && r.result.value
}
const capture = async (name, save) => {
  const r = await send('Page.captureScreenshot', { format: 'png' })
  if (save) {
    writeFileSync(join(OUT, `${name}.png`), Buffer.from(r.data, 'base64'))
    console.log('  saved', `${name}.png`)
  }
}
/** 反复强制出帧，直到条件满足 */
const settle = async (probe, tries = 24, wait = 120) => {
  for (let i = 0; i < tries; i++) {
    await capture(null, false)
    if (await probe()) return true
    await sleep(wait)
  }
  return false
}

await send('Page.enable')
await send('Runtime.enable')
await send('Emulation.setDeviceMetricsOverride', { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false })
await send('Page.navigate', { url: BASE })
await sleep(5000)
await evaluate("localStorage.setItem('acmusic_theme','dark'); location.reload(); 'ok'")
await sleep(8000)

// 鼠标停在角落，避免 hover 高亮进画面
await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 8, y: 880 })
await sleep(500)
await capture('home', true)

await evaluate("document.querySelector('.playlist') && document.querySelector('.playlist').click()")
await sleep(6500)
await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 8, y: 880 })
await sleep(500)
await capture('playlist', true)

await evaluate("document.querySelector('.tracks .name') && document.querySelector('.tracks .name').click()")
await sleep(4000)
await evaluate("document.querySelector('.barCover') && document.querySelector('.barCover').click()")
await settle(async () => {
  const o = await evaluate("(() => { const el = document.querySelector('.expandedOverlay'); return el ? getComputedStyle(el).opacity : '0' })()")
  return o === '1'
})
// 右栏默认是歌词；这首老歌只有制作人信息，切到「相似歌曲」画面更充实
await evaluate("document.querySelectorAll('.rightTabs span')[1] && document.querySelectorAll('.rightTabs span')[1].click()")
await settle(async () => (await evaluate("document.querySelectorAll('.cardScroll .musicCard').length")) > 0, 20, 150)
await sleep(1500)
await settle(async () => true, 6, 120)
await send('Input.dispatchMouseEvent', { type: 'mouseMoved', x: 8, y: 880 })
await sleep(500)
await capture('player', true)

ws.close()
edge.kill()

// PNG → WebP（可选，依赖 python + Pillow）
try {
  execFileSync('python', ['-c', `
from PIL import Image
import os
files = ${JSON.stringify(SHOTS)}
out = r"""${OUT}"""
for name in files:
    png = os.path.join(out, name + '.png')
    if not os.path.exists(png):
        continue
    im = Image.open(png).convert('RGB')
    webp = os.path.join(out, name + '.webp')
    im.save(webp, 'WEBP', quality=88, method=6)
    os.remove(png)
    print('  %s.webp  %dKB' % (name, os.path.getsize(webp) // 1024))
`], { stdio: 'inherit' })
} catch (e) {
  console.warn('[shots] 未转换为 WebP（需要 python + Pillow），已保留 PNG')
}
console.log('[shots] 完成 →', OUT)
process.exit(0)
