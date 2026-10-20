#!/usr/bin/env node
/**
 * 生成 docs/API_INDEX.md —— 网易云 API 端点索引
 *
 * 数据来源（版本必须与服务端一致）：
 *   - module/*.js        端点清单 + 首行中文注释
 *   - interface.d.ts     每个端点的参数表（必选/可选）
 *   - src/api/*.js       本项目已封装的 wrapper
 *
 * 用法：
 *   node scripts/gen-api-index.mjs --pkg <API 包目录>
 *
 * <API 包目录> 取法（二选一）：
 *   1. 生产服务器：tar -czf /tmp/api-meta.tgz -C /opt/api-enhanced module interface.d.ts package.json
 *      再 scp 回本地解包
 *   2. 本地临时目录 npx --package NeteaseCloudMusicApi 安装后指向其目录
 *
 * 只读，不修改任何源文件；输出写 docs/API_INDEX.md。
 */
import fs from 'node:fs'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')

function parseArgs(argv) {
  const out = {}
  for (let i = 0; i < argv.length; i += 2) {
    if (argv[i].startsWith('--')) out[argv[i].slice(2)] = argv[i + 1]
  }
  return out
}

const { pkg } = parseArgs(process.argv.slice(2))
if (!pkg) {
  console.error('缺少 --pkg <API 包目录>')
  process.exit(1)
}
const pkgDir = path.resolve(pkg)

/** 端点分组：key 是路由第一段，value 是中文分组名 */
const GROUP_OF = {
  login: '登录 / 账号',
  logout: '登录 / 账号',
  captcha: '登录 / 账号',
  register: '登录 / 账号',
  activate: '登录 / 账号',
  verify: '登录 / 账号',
  inner: '登录 / 账号',

  user: '用户',
  vip: '用户',
  setting: '用户',
  avatar: '用户',
  nickname: '用户',
  level: '用户',
  follow: '用户',
  yunbei: '用户',
  binding: '用户',
  subcount: '用户',

  song: '歌曲 / 歌词',
  lyric: '歌曲 / 歌词',
  check: '歌曲 / 歌词',
  scrobble: '歌曲 / 歌词',
  like: '歌曲 / 歌词',
  batch: '歌曲 / 歌词',

  playlist: '歌单',
  album: '专辑',
  digitalAlbum: '专辑',
  ugc: '用户内容（UGC）',

  artist: '歌手',
  artists: '歌手',
  simi: '歌手',

  search: '搜索',
  cloudsearch: '搜索',

  comment: '评论 / 互动',
  hug: '评论 / 互动',
  share: '评论 / 互动',
  stars: '评论 / 互动',
  event: '评论 / 互动',
  msg: '评论 / 互动',

  mv: 'MV / 视频',
  video: 'MV / 视频',
  mlog: 'MV / 视频',
  related: 'MV / 视频',

  dj: '电台 / 播客',
  program: '电台 / 播客',
  radio: '电台 / 播客',
  aidj: '电台 / 播客',
  personal_fm: '电台 / 播客',
  fm: '电台 / 播客',

  cloud: '云盘',
  top: '榜单 / 推荐',
  toplist: '榜单 / 推荐',
  recommend: '榜单 / 推荐',
  personalized: '榜单 / 推荐',
  homepage: '榜单 / 推荐',
  banner: '榜单 / 推荐',
  chart: '榜单 / 推荐',
  hot: '云村 / 社区',
  personal: '榜单 / 推荐',
  playmode: '榜单 / 推荐',
  calendar: '榜单 / 推荐',
  style: '榜单 / 推荐',
  stylelist: '榜单 / 推荐',
  topic: '榜单 / 推荐',
  record: '榜单 / 推荐',
  listen: '榜单 / 推荐',
  ad: '商业化 / 其他',
  abroad: '商业化 / 其他',
  country: '商业化 / 其他',
  audio: '商业化 / 其他',
  others: '商业化 / 其他',
  api: '商业化 / 其他',

  // 以下为逐段核对后补充的分类
  cellphone: '登录 / 账号',
  rebind: '登录 / 账号',
  daily: '用户',
  fanscenter: '用户',
  get: '用户',
  history: '用户',
  recent: '用户',
  sign: '用户',
  signin: '用户',
  summary: '用户',
  likelist: '歌曲 / 歌词',
  music: '歌曲 / 歌词',
  pl: '歌单',
  broadcast: '电台 / 播客',
  djRadio: '电台 / 播客',
  voice: '电台 / 播客',
  voicelist: '电台 / 播客',
  send: '评论 / 互动',
  listentogether: '一起听 / 社交',
  musician: '音乐人 / 创作',
  creator: '音乐人 / 创作',
  rep: '云村 / 社区',
  starpick: '云村 / 社区',
  thinktank: '云村 / 社区',
  countries: '工具 / 其他',
  decrypt: '工具 / 其他',
  device: '工具 / 其他',
  eapi: '工具 / 其他',
  lbs: '工具 / 其他',
  middle: '工具 / 其他',
  relay: '工具 / 其他',
  resource: '工具 / 其他',
  sati: '工具 / 其他',
  sheet: '工具 / 其他',
  threshold: '工具 / 其他',
  weblog: '工具 / 其他',
}

/** 分组展示顺序 */
const GROUP_ORDER = [
  '登录 / 账号', '用户', '歌曲 / 歌词', '歌单', '专辑', '歌手', '搜索',
  '评论 / 互动', 'MV / 视频', '电台 / 播客', '一起听 / 社交', '云村 / 社区',
  '音乐人 / 创作', '云盘', '榜单 / 推荐', '用户内容（UGC）',
  '商业化 / 其他', '工具 / 其他', '其他',
]

/** 读 interface.d.ts：拿每个端点的参数表 */
function parseParams(dtsPath) {
  const text = fs.readFileSync(dtsPath, 'utf8')
  // 去掉 // 注释，避免误匹配
  const clean = text.replace(/\/\/[^\n]*/g, '')
  const map = new Map()
  const fnRe = /export function (\w+)\(([\s\S]*?)\)\s*:\s*Promise/g
  let m
  while ((m = fnRe.exec(clean))) {
    const name = m[1]
    const sig = m[2]
    const list = []
    const start = sig.indexOf('{')
    const end = sig.lastIndexOf('}')
    if (start !== -1 && end > start) {
      const body = sig.slice(start + 1, end)
      const memberRe = /(?:^|[\s,{])(\w+)(\?)?\s*:/g
      let mm
      while ((mm = memberRe.exec(body))) {
        list.push({ key: mm[1], optional: !!mm[2] })
      }
    }
    map.set(name, list)
  }
  return map
}

/** 读 module/*.js：拿端点名 + 首行中文注释 */
function parseModules(moduleDir) {
  return fs.readdirSync(moduleDir)
    .filter(f => f.endsWith('.js'))
    .map(f => {
      const name = f.replace(/\.js$/, '')
      const src = fs.readFileSync(path.join(moduleDir, f), 'utf8')
      const head = src.split('\n').slice(0, 12)
      const line = head.find(l => l.trim().startsWith('//'))
      const desc = line ? line.trim().replace(/^\/\/\s*/, '').trim() : ''
      return { name, desc }
    })
}

/** 读 src/api/*.js：本项目已封装的接口路径 */
function parseUsed() {
  const dir = path.join(ROOT, 'src', 'api')
  const used = new Set()
  if (!fs.existsSync(dir)) return used
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.js')) continue
    const src = fs.readFileSync(path.join(dir, f), 'utf8')
    const re = /request\(\s*['"`]([^'"`$]+)['"`]/g
    let m
    while ((m = re.exec(src))) {
      used.add(m[1].replace(/\/+$/, ''))
    }
  }
  return used
}

const pkgJson = JSON.parse(fs.readFileSync(path.join(pkgDir, 'package.json'), 'utf8'))
const params = parseParams(path.join(pkgDir, 'interface.d.ts'))
const modules = parseModules(path.join(pkgDir, 'module'))
const used = parseUsed()

/** 端点名 → 路由路径：下划线换斜杠 */
const toRoute = name => '/' + name.replace(/_/g, '/')

const rows = modules.map(({ name, desc }) => {
  const route = toRoute(name)
  const p = params.get(name) || []
  // 已封装判定：路径前缀相同也算（如 /comment/new 与 /comment）
  const wrapped = used.has(route) || used.has(route.split('/').slice(0, 3).join('/'))
  const seg = route.split('/')[1] || ''
  const group = GROUP_OF[seg] || '其他'
  return { name, route, desc, params: p, wrapped, group }
})

rows.sort((a, b) => a.route.localeCompare(b.route))

const byGroup = new Map()
for (const r of rows) {
  if (!byGroup.has(r.group)) byGroup.set(r.group, [])
  byGroup.get(r.group).push(r)
}

const unknown = [...byGroup.keys()].filter(g => !GROUP_ORDER.includes(g))
const total = rows.length
const wrappedCount = rows.filter(r => r.wrapped).length
const withDesc = rows.filter(r => r.desc).length
const noParams = rows.filter(r => r.params.length === 0).length

/** 参数列：key 表示必填、key? 表示可选；过多时截断 */
function fmtParams(list) {
  if (!list.length) return '—'
  const shown = list.slice(0, 6).map(p => p.optional ? `${p.key}?` : p.key)
  const more = list.length > 6 ? ` +${list.length - 6}` : ''
  return '`' + shown.join('`, `') + '`' + more
}

function renderTable(list) {
  const out = []
  out.push('| 路径 | 说明 | 参数 | 已封装 |')
  out.push('| --- | --- | --- | --- |')
  for (const r of list) {
    out.push(`| \`${r.route}\` | ${r.desc || '-'} | ${fmtParams(r.params)} | ${r.wrapped ? '✅' : ''} |`)
  }
  return out
}

const lines = []
lines.push('# 网易云 API 端点索引（自动生成，勿手改）')
lines.push('')
lines.push(`> 数据来源：生产服务器 \`/opt/api-enhanced\` **v${pkgJson.version}** 的 \`module/*.js\` + \`interface.d.ts\``)
lines.push('> 重新生成：`node scripts/gen-api-index.mjs --pkg <API 包目录>`')
lines.push('> 官方文档：<https://docs-neteasecloudmusicapi.focalors.ltd/#/?id=neteasecloudmusicapienhanced>')
lines.push('')
lines.push('## 怎么用这张表')
lines.push('')
lines.push('- **路径**直接用：`request(\'/song/download/url\', { params })`；get/post 都收，参数走 query 或 body 皆可')
lines.push('- **参数**列：不带 `?` 的是必填，带 `?` 的是可选；超过 6 个用 `+N` 截断，完整表见 `interface.d.ts`')
lines.push('- 官方 d.ts 把大量必填参数也标成了 `?`（历史遗留），拿不准时以官方文档页面为准')
lines.push('- **已封装** = `src/api/*.js` 里已有 wrapper，可直接调用，不用动 API 层')
lines.push('- 说明列 `-` 表示该模块没写注释，用途看文件名或文档')
lines.push('')
lines.push('## 统计')
lines.push('')
lines.push('| 项 | 数量 |')
lines.push('| --- | --- |')
lines.push(`| 端点总数 | ${total} |`)
lines.push(`| 本项目已封装 | ${wrappedCount}（${Math.round(wrappedCount / total * 100)}%） |`)
lines.push(`| 未封装 | ${total - wrappedCount} |`)
lines.push(`| 有中文注释 | ${withDesc}（${Math.round(withDesc / total * 100)}%） |`)
lines.push(`| d.ts 无参数表 | ${noParams} |`)
lines.push('')

lines.push('## 端点一览')
lines.push('')
for (const g of GROUP_ORDER) {
  const list = byGroup.get(g)
  if (!list || !list.length) continue
  lines.push(`### ${g}（${list.length}）`)
  lines.push('')
  lines.push(...renderTable(list))
  lines.push('')
}
for (const g of unknown) {
  const list = byGroup.get(g)
  lines.push(`### ${g}（${list.length}）`)
  lines.push('')
  lines.push(...renderTable(list))
  lines.push('')
}

fs.mkdirSync(path.join(ROOT, 'docs'), { recursive: true })
fs.writeFileSync(path.join(ROOT, 'docs', 'API_INDEX.md'), lines.join('\n') + '\n', 'utf8')

console.log(`v${pkgJson.version} | 端点 ${total} | 已封装 ${wrappedCount} | 有注释 ${withDesc}`)
console.log('未归入既定分组:', unknown.map(g => `${g}(${byGroup.get(g).length})`).join(', ') || '无')
console.log('参数表缺失的端点:', rows.filter(r => r.total === 0).length)
