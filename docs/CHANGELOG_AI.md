# AI Change Log — ACMUSIC

> AI 参与本项目开发的完整记录。每次 AI 修改必须在完成后追加条目。

---

## 使用说明

每次 AI 修改代码，请按以下格式在文件末尾追加：

```markdown
## YYYY-MM-DD

### 修改内容
（一句话说明本次改了什么）

### 修改文件
- `path/to/file1.ext`
- `path/to/file2.ext`

### 修改原因
（详细说明为什么改、参考了 PROJECT_CONTEXT.md / ARCHITECTURE_DECISIONS.md 哪些决策）

### 测试结果
- `yarn lint` ✅ / ❌
- `yarn build` ✅ / ❌
- 浏览器手动核查：✅ / ❌（如涉及）
  - 说明核查了哪些页面 / 流程

### 注意事项
（影响范围、回滚策略、潜在的副作用）
```

---

## 历史记录

### 2026-09-30 — HARDEN-audio-proxy + LINT-zero 音频代理加固、lint 归零、深链接回退核实

### 修改内容
1. **`api/audio-proxy.js` 加固**（原实现是完全开放的代理 + 不转发 Range）：
   - 新增 `validateTarget()` 域名白名单（`*.music.126.net` / `*.163.com`），非白名单一律 403；协议仅允许 http/https
   - 新增 `buildUpstreamHeaders()`：**转发客户端 `Range`**（原来完全丢弃 → 代理播放无法 seek），并补 `Origin`/`Referer`
   - 新增 `collectResponseHeaders()`：只透传白名单响应头（content-type/length/range、accept-ranges、cache-control、etag、last-modified），其余（含 set-cookie）不回传
   - 保持上游状态码语义：**206 原样回给浏览器**
   - 新增 30s 上游超时（`AbortController`，超时返回 504）与 64MB 体积上限：已声明 `Content-Length` 超限直接 502；未声明时用 `makeSizeGuard()` 变换流截断并中断上游
   - 流式转发改用 `Readable.fromWeb(upstream.body).pipe(res)`（原手写 `pipeTo(WritableStream)` 忽略背压）
2. **lint 归零（10 → 0）**：
   - `src/api/User.js`：`subAlbumList(limit, offset)` 原来**收了参数却不传给接口**（`/album/sublist` 丢失分页）→ 补 `{params:{limit, offset}}`
   - `src/pages/Playlist.vue`：组件名 `Playlist` → `PlaylistPage`（多词命名）
   - `SendComment.vue` / `CommentContentLayout.vue`：移除未使用的 `res` 形参
   - `MusicPlayer.vue`：`onEsc(e)` 去掉未使用形参；删除未使用的 `containerTop`
   - `PlayerCore.vue`：删除未使用的 `FALLBACK_BG` 常量与 `const prevLen`
   - `src/assets/ac-font/iconfont.js`：文件级 `eslint-disable no-self-assign` + 说明注释（生成器产物，见下）
3. **history 模式深链接：核实已完成，不新增 `vercel.json`**（见修改原因）
4. 更新 `docs/PROJECT_CONTEXT.md` 中与本轮相关的过期描述（待办：见注意事项）

### 修改文件
- `api/audio-proxy.js`（重写为白名单 + Range + 超时 + 体积上限）
- `src/api/User.js`、`src/pages/Playlist.vue`、`src/components/SendComment.vue`、`src/components/layout/CommentContentLayout.vue`、`src/components/musicPlayer/MusicPlayer.vue`、`src/components/musicPlayer/PlayerCore.vue`、`src/assets/ac-font/iconfont.js`

### 修改原因
- **代理为什么必须加白名单**：实测代理对任意外站返回 200（`example.com` 713 字节、Cloudflare 大文件 200000 字节全部转发成功），任何知道地址的人都能拿它当跳板访问内网/绕过网络限制（SSRF）。白名单是唯一防线。
- **为什么必须转发 Range**：源站（实测 raw.githubusercontent / jsdelivr）对 `Range: bytes=0-99` 返回 `206 + Content-Range`，而原实现既不发 Range、也不回传 `Content-Range`，浏览器无法 seek → 代理模式下拖动进度条会失效/整段重下。
- **为什么不新增 `vercel.json`**：实测线上 `https://acmusic.vercel.app/listDetail?id=24381616` 与 `/explore/mvList` 均返回 **200 + SPA HTML**（962 字节，`<div id="app">`），说明 Vercel 平台侧已存在 fallback；仓库内无 rewrite 配置属于「平台配置而非代码缺失」。新增 catch-all rewrite 反而有覆盖现有 `/api/audio-proxy` 路由的风险，且本会话无法在部署前验证，故**不改代码，只把事实写进文档**。
- **`subAlbumList` 是真 Bug 而非仅 lint 噪音**：同文件的 `subTopicList(limit, offset)` 正确传参，只有专辑收藏漏传，导致「我的 → 收藏专辑」使用上游默认分页。
- **`iconfont.js` 为何不删**：grep 确认无任何模块 import 它（图标体系已改为 `BaseIcon` + `src/config/icon.js`：8 个字体 class + 21 个内联 SVG path），属死文件；但守则禁止 AI 自行删除未知代码，故用文件级 eslint 禁用清零告警，删除留待用户决策。

### 测试结果
- `yarn lint` ✅ **No lint errors found**（10 → 0）
- `yarn build` ✅ DONE Build complete
- **代理逻辑 Node 实测** ✅（离线 mock，`node -` 直接执行源码）：
  - 白名单 **15/15** 通过：`m801/m701/p1.music.126.net`、`music.163.com`、`interface.music.126.net` 放行；`evil-music.126.net`、`music.126.net.evil.com`、`example.com`、`169.254.169.254`、`127.0.0.1`、`file://`、`ftp://`、非法串全部拒绝
  - handler 端到端：缺参 → 400；`example.com` / 元数据 IP → 403（且未发起 fetch）；上游 404 → 404；上游 abort → 504；正常 Range → **206** 且 `Content-Range`/`Accept-Ranges`/`Content-Length` 正确回传、`set-cookie` 被过滤
  - Range 转发：`range`/`Range` 两种大小写都注入上游请求头；无 Range 时不伪造
  - 体积上限：无声明超大响应在 **60MB 截断**（上限 64MB）且 `onLimit` 触发一次；声明 200MB → 502
- 浏览器手动核查：❌ 未做（本次改动对 UI 无影响；代理需部署后验证）

### 注意事项
- **部署后必须验证代理**（本会话未能对生产端点完成验证，中途 `acmusic.vercel.app` 连接超时）：带 `Range` 请求一首歌的代理地址，确认返回 **206** 且能拖动 seek。
- **白名单可能误伤**：若某首歌的 `song/url` 返回非 `music.126.net`/`163.com` 的 CDN，代理会返回 403（此时播放会退回直连）。遇到时把该 host 加进 `ALLOWED_HOST_PATTERNS`。
- **redirect: 'follow' 的残余风险**：白名单在发起前校验，上游若 302 到非白名单域仍会被跟随。当前网易 CDN 不发外部跳转，若要加强可改为手动跟随并逐跳校验。
- **`iconfont.js` 待决**：如确认无用可直接 `git rm src/assets/ac-font/iconfont.js`（连带去掉那两行注释），本文件其余字体资源（css/ttf/woff）仍在使用，不可删。
- **`docs/PROJECT_CONTEXT.md` / `AGENTS.md` 的过期描述已在本轮一并更正**：node-sass→dart-sass（构建已实测可在 Node 24 通过）、Vuex 3 模块→2 个、hash→history 模式、API 地址来源→`.env` + `src/config.js`、`searchMixin` 路径→`src/mixins/searchMixin.js`、图标体系说明、并补充音频代理与构建 `spawn EPERM` 的提示。

### Git 建议
- **Commit 类型**：`fix`（代理加固 + lint 归零）；`docs` 单独提交
- **Commit message**：`fix: harden audio proxy (allowlist, Range passthrough, timeout, size cap) and clear all lint errors`
- **包含**：`api/audio-proxy.js`、`src/api/User.js`、`src/pages/Playlist.vue`、`src/components/SendComment.vue`、`src/components/layout/CommentContentLayout.vue`、`src/components/musicPlayer/MusicPlayer.vue`、`src/components/musicPlayer/PlayerCore.vue`、`src/assets/ac-font/iconfont.js`

---

### 2026-09-30 — FIX-tier2 第二档：keep-alive 缓存泄漏、搜索防抖/竞态、load-more 卡死、二维码刷新失效

### 修改内容
修复第二档（长期使用或特定操作才发作）的 8 类问题：
1. **keep-alive 缓存无上限**（`App.vue`）：`<keep-alive>` 未设 max，且以 `$route.fullPath` 为 key，导致每个不同 `?id=` / 搜索词都常驻一份页面实例与 DOM。
2. **`SearchResult.vue:25` key 拼写错误**：`:key="$route.fullpath"`（小写 p）实际恒为 `undefined`。
3. **搜索建议无防抖/无竞态控制**（`DoSearch.vue`）：每按键一次请求，慢的旧响应会覆盖新结果。
4. **load-more 失败后永久卡死**（`searchMixin.js`、`ListDetail.vue`、`AllList.vue`、`VideoList.vue`、`BoutiqueList.vue`、`ArtistAllSongs.vue`、`VoiceRes.vue`）：请求失败无 `.catch`，loading 标志永不恢复，按钮一直显示「加载中...」。
5. **`VideoList.vue` 清错标志位**：按钮读 `loadingMore`，代码却清 `loading`。
6. **搜索分页未重置**：`searchMixin.load()` 只重置过一次的 `page` 会跨关键词沿用；`VoiceRes` 自带 `initLoad`/`load` 覆盖 mixin，绕过修复。
7. **`VoiceRes` 去重逻辑恒为 false**：`item.id === val.baseInfo.mainSong.id === -1` 是链式比较，`findIndex` 结果从未被使用，导致声音搜索重复项。
8. **二维码刷新后不再轮询**（`qrcodeLogin.vue`）：轮询只由 `watch: created` 启动，`refresh()` 时 `created` 已为 `true`，watcher 不再触发 → 二维码失效后点刷新永远扫不上。
9. **MV 列表加载更多重复/跳数据/整表重挂**（`MvList.vue`）：
   - 首屏用 `/mv/first` 取 100 条，而「加载更多」用 `/mv/all`——实测两接口**返回数据零重叠**（`/mv/first` 首批 14689667…，`/mv/all` offset=0 首批 10929613…），翻页必然跳到另一批 MV；
   - 原 offset 取 `limit * page`（page=2 → 24），与首屏区间重叠又跳过中间条目；
   - `load()` 复用了 `loading`，而列表 `<transition v-if="!loading && renderedList.length">` 绑在该标志上，翻页时整个列表被卸载重挂 → 用户看到的「点加载更多后全部重新加载」。
   - 修正：首屏与翻页统一走 `/mv/all`（`limit:12`），offset 取「已渲染条数」，vid 去重；新增独立的 `loadingMore` 标志，翻页期间列表保持挂载。

### 修改文件
- `src/App.vue`：keep-alive 加 `:max="pageCacheMax"(10)`；保留 `$route.fullPath` key（页面刷新机制，见下）；新增 `watch: '$route.fullPath'` + `reapEvictedPages()`
- `src/pages/SearchResult.vue`：移除拼错的 `:key="$route.fullpath"`
- `src/components/DoSearch.vue`：`keyword` watcher 加 300ms 防抖 + 请求序号丢弃过期响应；`concurrentRequests` 加 `.catch`；`beforeDestroy` 清理防抖定时器
- `src/mixins/searchMixin.js`：`initLoad()` 重置 `page` 并容错空数组；`load()` 加 `loading/noMore` 守卫、Set 去重、失败回退 `page`、`.finally` 恢复 `loading`
- `src/pages/ListDetail.vue`、`src/pages/artist/ArtistAllSongs.vue`、`src/pages/explorePage/playlist/AllList.vue`、`src/pages/explorePage/playlist/BoutiqueList.vue`、`src/pages/explorePage/VideoList.vue`：load-more 加守卫 + `.catch`/`.finally`
- `src/pages/search/VoiceRes.vue`：`initLoad` 重置 `page`、`load` 修去重 + 恢复 loading
- `src/pages/explorePage/MvList.vue`：首屏改用 `/mv/all`（不再用 `/mv/first`）、`fetchPage(offset)` 统一取数、offset 按已渲染条数推进、vid 去重、新增 `loadingMore` 与 `loading` 分离、`.catch`/`.finally`
- `src/components/userPage/qrcodeLogin.vue`：新增 `startPolling()`/`stopPolling()`，生成成功与刷新时显式启停；`beforeDestroy` 走 `stopPolling`

### 修改原因
- **为什么保留 `$route.fullPath` key**（而非直接去掉）：6 个详情页与 9 个搜索子视图**只在 `activated()` 里取数**且无 id/keyword watcher（`ListDetail:127`、`AlbumDetail:69`、`ArtistDetail:135`、`ArtistAllSongs:91`、`mvPlay:37`、`VideoPlay:93`）。`activated` 仅在 keep-alive 且元素被重新插入时派发（`vue.runtime.esm.js:3160-3171`），去掉 key 后同组件复用不会重新插入 → 「URL 是 B、渲染的是 A」。移除 keep-alive 则 18 个页面完全不取数。故本批保留 key，改用 `:max` 限制上限。
- **为什么需要 `reapEvictedPages()`**：Vue 2 `pruneCacheEntry` 在「同组件、不同 key」时会因 `entry.tag !== current.tag` 跳过 `$destroy`（`vue.runtime.esm.js:5307`），被 max 驱逐的实例仍挂在 `App.$children` 上。该方法在每次路由变化后销毁「已不在缓存 keys 中且不在前台」的页面实例。
- 其余各项均为「失败无 catch → UI 永久卡死」与「重复请求/重复渲染」的确定性缺陷，属既有 bug 修复。

### 测试结果
- `yarn lint` ✅ 10 errors（= 基线，全部为既有未使用变量/组件名，本次改动文件零 error）
- `yarn build` ✅ DONE Build complete
- dev server 编译 ✅ 全部改动 HMR `Compiled successfully`
- **接口实测** ✅（本次沙箱可出网）：网关 `/mv/all?limit=12&offset=0|12|24` 三页各 12 条、两两零重叠，且 `offset=0&limit=24` 的前 24 条与逐页拼接结果**完全一致** → 新翻页逻辑成立；`/mv/first?limit=100` 与 `/mv/all?limit=100&offset=0` 交集为 **0**，证实原实现必然跳变。
- 浏览器手动核查：❌ 未做（本会话无浏览器工具链）

### 注意事项
- **回滚策略**：App.vue 的缓存改动独立于其他项，若出现页面串数据，可先把 `:max` 与 `reapEvictedPages` 一并回滚。
- **依赖 Vue 2 内部字段**：`reapEvictedPages` 读取 `keepAlive.keys`、`$vnode.data.keepAlive`、`_inactive`、`_isDestroyed`。升级 Vue 3 时必须删除（Vue 3 keep-alive 已正确销毁）。
- **下一批架构项（未做）**：更正统的做法是「去掉 `:key` + 6 个详情页加 id watcher + searchMixin 加 keyword watcher」（约 7 文件 40 行），可让缓存按组件复用、回溯不重复取数；但它会改变页面回来时的刷新行为，需在有手测条件时单独做。
- **遗留问题（未处理）**：`ExplorePage.vue:44` 与 `UserPage.vue:140` 的 `$bus.$on` 无配对 `$off`，总线会长期持有组件实例引用——即使实例被 `$destroy`，内存仍被总线引用。

### Git 建议
- **Commit 类型**：`fix`
- **Commit message**：`fix: bound keep-alive page cache, debounce search suggest, recover load-more from failures, fix qrcode refresh polling`
- **包含**：`src/App.vue`、`src/pages/SearchResult.vue`、`src/components/DoSearch.vue`、`src/mixins/searchMixin.js`、`src/pages/ListDetail.vue`、`src/pages/artist/ArtistAllSongs.vue`、`src/pages/explorePage/playlist/AllList.vue`、`src/pages/explorePage/playlist/BoutiqueList.vue`、`src/pages/explorePage/VideoList.vue`、`src/pages/explorePage/MvList.vue`、`src/pages/search/VoiceRes.vue`、`src/components/userPage/qrcodeLogin.vue`
- **不含**：`docs/CHANGELOG_AI.md`（单独 `docs` 提交）

---

### 2026-09-30 — FIX-tier1-3-bugs 修复日常使用必现的 3 个缺陷（第一档）

### 修改内容
修复三个「日常使用几乎必然踩到」的缺陷：
1. 手机验证码登录的倒计时死循环（`tips` watcher 自我重排，数字卡在 0，定时器无限循环且组件卸载后不清理）
2. `/daily-songs` 刷新即崩（歌单靠非 path 路由参数传递，刷新后参数丢失 → `JSON.parse(undefined)` 抛错）
3. 歌曲列表「时长」列渲染两次（两个并列 `v-if`，而 normalize 会把 `dt`/`duration` 互相补齐）

### 修改文件
- 修改 `src/components/userPage/phoneLogin.vue`：
  - 删除 `watch.tips`（造成死循环的根因）
  - 新增 `startCountdown()`：单一 `setInterval` 驱动 `tips` 60→1，结束恢复 `TIP` 文案与 `isSending=false`
  - `sendCode()` 成功分支改为调用 `startCountdown()`，并先 `clearInterval` 保证幂等
  - 新增 `beforeDestroy()` 清理 `tipsTimer`
- 修改 `src/pages/DailySongs.vue`：
  - `props` 增加 `default: ''`，data 增加 `list: []`、`loading: true`
  - 新增 `created()`：有路由参数则解析（带 try/catch 容错），无参数（刷新/直开）则回退到 `tracksApi.recommendSongs()` 重新拉取
  - 模板改用本地 `list`，不再在渲染期 `JSON.parse`；补加载中/加载失败状态
- 修改 `src/components/layout/TracksLayout.vue`：
  - 时长列第二个 `v-if="t.duration"` 改为 `v-else-if`，避免同一行渲染两列时长

### 修改原因
- 倒计时：`n === 0` 分支把 `tips` 重置为 `TIP`，但 `Number.isInteger(0)` 仍成立，于是又排一个 `setTimeout(n-- <= 0 ? 0 : n--)`，`tips` 恒被置回 0 → 每秒自我重触发，永不停止；且文件无 `beforeDestroy`，定时器随组件残留。
- 每日推荐：`HomePage.goDailySongs()` 用 `params: {dailySongs: JSON.stringify(...)}` 传列表，非 path 参数刷新即丢；`DailySongs.vue` 模板直接 `JSON.parse(dailySongs)`，undefined 在渲染期抛 TypeError。
- 时长列：`utils/normalize.js:90-91` 把 `dt` 与 `duration` 双向补齐，故 `t.dt` 与 `t.duration` 同时为真，两个并列 `v-if` 各渲染一列。

### 测试结果
- `yarn lint` ✅（无新增 error，修复文件均无告警）
- `yarn build` ✅ DONE Build complete（本机 Node 24 + dart-sass）
- 浏览器手动核查：待用户确认（需真实 API 网络环境：验证码发送倒计时、刷新 `/daily-songs`、歌单/专辑单曲列表时长列）

### 注意事项
- 影响范围仅限三个文件，未触碰 PlayerCore / 播放状态机 / 路由配置 / Vuex。
- `phoneLogin` 的对外行为不变：仍用 `isSending` 控制按钮禁用，`tips` 仍是按钮文案。
- `DailySongs` 新增的 `/recommend/songs` 回退请求**需要登录态**；游客刷新该页会拿到 301，显示「加载失败」提示而非白屏崩溃（比原行为安全，且 `request.js` 已统一派发 `api:unauthorized`）。
- 未评审：是否需要给 `DailySongs` 增加未登录时的引导文案（超出本次范围）。

### Git 建议
- **Commit 类型**：`fix`
- **Commit message**：`fix: 3 daily-use bugs (sms countdown loop, daily-songs refresh crash, duplicate duration column)`
- **包含**：`src/components/userPage/phoneLogin.vue`、`src/pages/DailySongs.vue`、`src/components/layout/TracksLayout.vue`
- **不含**：`docs/CHANGELOG_AI.md`（单独 `docs` 提交）

---

### 2026-09-04 — FIX-video-side-color-fallback 修复主色提取 CORS 跨域失败导致纯黑

### 修改内容
之前的"视频左右黑边改封面主色"实际**没生效**——NetEase 封面图不返回 CORS 头，`extractColors` 内部 `canvas.drawImage` 抛 SecurityError，被 try/catch 吞掉返回 `[]`。本应在 `colors.length === 0` 时回退到背景色，但代码里没 fallback 路径，导致 `playerBgStyle` 保持初始 `''`，背景仍是 CSS 默认 `#000`（纯黑）。

### 修改文件
- 修改 `src/components/layout/VideoPlayerLayout.vue` `onCoverLoad(img)`：
  - 加 `if (!img || !img.complete)` fallback → `'background: #1a1a2e'`
  - 加 `if (!colors.length)` fallback → `'background: #1a1a2e'`（与 MusicPlayer FALLBACK 同款）

### 修改原因
- 用户实测：背景仍是纯黑
- 根因：NetEase 封面图（`p*.music.126.net`）**没有** `Access-Control-Allow-Origin` 响应头，浏览器 canvas 跨域污染抛 `SecurityError`
- `extractColors` 内部 try/catch 吞异常 → 返回 `[]` → `onCoverLoad` early return → `playerBgStyle` 保持 `''` → 背景默认 `#000`

### 关键设计
- **fallback 用 MusicPlayer 同款 `#1a1a2e`**（深紫黑，比纯黑柔和）
- 不动 `/api/audio-proxy`（那是大改动，超出本任务范围）
- 跨域问题**客户端无解**（要解决必须服务端代理 + 加 CORS 头），但 fallback 至少让背景**不再是纯黑**

### 测试结果
- `yarn build` ✅ DONE Build complete

### 注意事项
- 真正要拿到封面主色，**需服务端代理图片**并加 CORS 头（如扩展 `/api/audio-proxy` 加 image 类型支持）
- 这次 fix 只解决"不再是纯黑"，主色仍然提取不到
- 后续可考虑：扩展 serverless 端点支持图片代理 + CORS

### Git 建议
- **Commit 类型**：`fix`
- **Commit message**：`fix: video side bar falls back to non-black on CORS failure (cover color extraction is blocked)`
- **包含**：`src/components/layout/VideoPlayerLayout.vue`
- **不包含**：docs（独立 docs commit）

---

### 2026-09-04 — REFACTOR-video-side-color 视频左右黑边改为封面主色

### 修改内容
视频 9:16 竖屏时左右"黑边"改为**封面主色渐变**（视觉上更和谐），复用 `utils/colorExtractor.extractColors`。

### 修改文件
- 修改 `src/components/layout/VideoPlayerLayout.vue`：
  - import `extractColors` from `@/utils/colorExtractor`
  - data 加 `playerBgStyle`
  - methods 加 `onCoverLoad(img)`：调 `extractColors` → 取主色 → 构 `linear-gradient(to right, ${main} 0%, #000 35%, #000 65%, ${main} 100%)`
  - 模板 hidden `<img :src="dt_cover" @load="onCoverLoad">`（1px×1px 绝对定位，opacity:0）
  - `.video-player-section` 加 `:style="playerBgStyle"`
  - CSS 加 `.cover-color-source` 隐藏 img 样式

### 修改原因
- 用户反馈：修复非标准尺寸视频（9:16）后，左右黑边刺眼
- 改进方向：参考 MusicPlayer 已用的 `colorExtractor.js`（提取封面主色），让左右填充色跟封面协调

### 关键设计
- **复用现有工具**：`colorExtractor.extractColors` 已 public export（`MusicPlayer.vue:102` 在用同模块的 `buildBackground`）
- **零新增工具**：用现成的 extractColors 拿主色，**不调用** `buildBackground`（那是给整页背景用的多层 radial-gradient，容器级别不适用）
- **隐藏 img 触发**：在 `.video-player-section` 内放 1px×1px 隐藏 img，`@load` 时提取主色
- **video 容器 `object-fit: contain`**（之前修复保留）：主色在黑边区显示，视频居中覆盖主色

### 测试结果
- `yarn build` ✅ DONE Build complete
- `yarn lint` ✅ 错误数不变（7 个预存在）

### 注意事项
- **横屏视频（16:9）**：视频铺满容器，**主色不可见**（视频遮挡），无副作用
- **竖屏视频（9:16）**：左右黑边显示主色渐变，与封面协调
- **首次加载**有 0.x 秒主色提取时间（canvas 像素扫描），提取完成后渐变生效
- `colorExtractor.extractColors` 不是从 video 元素提取，是从 img 元素提取——所以**走封面图**而不是 video 元素（封面图永远先于 video 加载完成）
- 失败 fallback：extractColors 内部 try/catch，失败返回 `[]`，`onCoverLoad` 不设 playerBgStyle（默认 #000 容器底色）

### Git 建议
- **Commit 类型**：`refactor`
- **Commit message**：`refactor: video page side bars use cover-derived main color (not black)`
- **包含**：`src/components/layout/VideoPlayerLayout.vue`
- **不包含**：docs（独立 docs commit）

---

### 2026-09-04 — FIX-video-aspect-ratio 视频播放非标准尺寸 BUG

### 修改内容
视频播放器非标准尺寸（如 9:16 竖屏）下：
- 视频被**裁切上半部分**（fitVideoSize:'auto' 选 'fix-width' 导致垂直超出容器）
- 控制条不可见

### 修改文件
- 修改 `src/components/vidPlayer.vue`：
  - `fitVideoSize: 'auto'` → `'contain'`（强制视频完整显示在容器内）
  - 去掉 `width: 100% !important; height: 100% !important` 的强制拉伸
- 修改 `src/components/layout/VideoPlayerLayout.vue`：
  - `.video-player-section` 加 `max-width: 1100px; margin: 0 auto`（保持 16:9 容器尺寸不变，水平居中）

### 修改原因
- **用户要求**：保持播放器窗口大小（16:9 容器）不变，只让视频内容按窗口缩放
- 原 `fitVideoSize: 'auto'` 在 9:16 视频时会自适应选 `'fix-width'` → 视频按宽度铺满容器 → 高度按 9:16 计算超出容器 → **被 `overflow: hidden` 裁切上半**
- 原 `width: 100% !important; height: 100% !important` 强制 video 拉伸成 16:9，破坏视频原始比例
- 容器固定 `aspect-ratio: 16/9` + xgplayer 默认 fit 模式 = 任何非 16:9 视频都显示异常

### 关键设计
- **`fitVideoSize: 'contain'`**（xgplayer 模式）：强制视频完整显示在容器内，**不裁切**
- **配合容器 `aspect-ratio: 16/9`**：横屏视频完美填满，竖屏视频按高度 fit、左右留黑边（黑边区域显示控制条，不被裁切）
- **去掉 `!important` 强制拉伸**：让 xgplayer 自然占满容器，video 用 `object-fit: contain` 保持原始比例
- **容器尺寸不变**：维持 `aspect-ratio: 16/9`（用户明确要求"窗口大小不变"），视频内容自适应

### 测试结果
- `yarn build` ✅ DONE Build complete
- `yarn lint` ✅ 错误数不变（7 个预存在）

### 注意事项
- **未来非 16:9 视频**（如 4:3、21:9、9:16）会按高度 fit 在 16:9 容器内，可能两侧留黑边
- **控制条 z-index 100** 已确保在黑边/视频上仍可点击
- **如未来需要"完全自适应容器"**（去掉 16:9 aspect-ratio），需要权衡播放器窗口大小
- 这次修复**不动 MV 视频**（mvPlay.vue 用 VideoPlayerLayout 共用同一组件，**MV 视频也受益**）

### Git 建议
- **Commit 类型**：`fix`
- **Commit message**：`fix: video player handles non-standard aspect ratios (9:16 etc.) without cropping`
- **包含**：
  - `src/components/vidPlayer.vue`
  - `src/components/layout/VideoPlayerLayout.vue`
- **不包含**：docs（独立 docs commit）

---

### 2026-09-03 — REFACTOR-router-mode Vue Router 切到 history 模式

### 修改内容
`src/router/index.js` 加 `mode: 'history'`，URL 从 `/#/path` 变成 `/path`。

### 修改文件
- 修改 `src/router/index.js`（+3 行：`mode: 'history'` + 2 行注释）

### 修改原因
- 项目原本用默认 hash 模式（URL `https://acmusic.vercel.app/#/path`），是项目初始化时最简单选择
- 用户要求切到 history 模式：
  - URL 更干净（`/playlist/123` vs `/#/playlist/123`）
  - SEO 友好（搜索引擎可索引子路由）
  - HTML5 history API 原生支持
- Vercel 对 SPA 项目**默认支持** fallback → index.html，无需额外配置
- `PageBack` 组件的 `this.$router.back()` 行为**与 mode 无关**（都是浏览器 history API）

### 关键设计
- **1 行配置改动**——最小影响
- **返回上一页功能不变**：`$router.back()` 内部走浏览器 history API，两种 mode 都支持
- **无业务代码改动**——所有 `<router-link>` / `$router.push` / `$router.go` 行为等价

### 测试结果
- `yarn build` ✅ DONE Build complete
- `yarn lint` ✅ 错误数不变（7 个预存在）

### 注意事项
- **Vercel 自动部署**会立即生效（无需配置 fallback）
- 验证步骤：
  1. push 后访问 `https://acmusic.vercel.app/`（无 `#`）
  2. 点歌单详情 → URL 变 `https://acmusic.vercel.app/listDetail?id=xxx`
  3. **刷新子路由**确认 Vercel fallback 正常（应返回 index.html）
  4. 返回上一页按钮仍正常
- 如果 Vercel fallback 失败（理论上不会），改回 `mode: 'hash'` 即可回滚

### Git 建议
- **Commit 类型**：`refactor`
- **Commit message**：`refactor: switch Vue Router to history mode (clean URLs)`
- **包含**：`src/router/index.js`
- **不包含**：docs（独立 docs commit）

---

### 2026-09-03 — FIX-mixed-content 网易云 CDN http→https 协议升级

### 修改内容
`utils/filters.js` 的 `imgParam` 函数加 http→https 协议升级（仅对网易云 CDN 域名生效），并把 `PersonalFM.vue` 3 处直接绑 `picUrl` 的位置改为走 `imgParam` 过滤器或 `coverUrl()` method。

### 修改文件
- 修改 `src/utils/filters.js`：`imgParam` 加 http→https 升级逻辑（只对 `music.126.net` / `netease.com` 域名升级，避免影响其他 CDN）
- 修改 `src/components/PersonalFM.vue`：
  - 顶部加 `import { imgParam } from "@/utils/filters"`
  - L35 `<img :src="...picUrl...">` → `:src="... | imgParam('300y300')"`
  - L45 同上（reflection 镜像）
  - L28 CSS 变量 `--fm-cover-url` → 改用 `coverUrl(item)` method（inline style 不能用 `|` 过滤器）
  - 加 `coverUrl(item)` method 走 `imgParam` 升级

### 修改原因
- 线上 `https://acmusic.vercel.app/` 控制台报 **Mixed Content** 警告：
  > "The page at 'https://acmusic.vercel.app/#/' was loaded over HTTPS, but requested an insecure element 'http://p3.music.126.net/...'"
- 根因：NetEase API 返回的图片 URL 是 `http://p3.music.126.net/...`（HTTP），虽然浏览器自动升级到 HTTPS，但产生控制台警告噪音
- 网易云 CDN 同时支持 HTTPS（`https://p3.music.126.net/...`），升级不会破坏功能

### 关键设计
- **只升级网易云 CDN 域名**（`music.126.net` / `netease.com`），不盲目升级所有 URL——其他 CDN 可能不支持 HTTPS，升级会坏图
- 在 `imgParam` 函数内升级（**单点修复**），所有用 `| imgParam` 过滤器的位置自动受益
- `PersonalFM` 3 处全部走 `imgParam`（2 处模板用 `| imgParam`，1 处 CSS 变量用 method 包装）

### 测试结果
- `yarn build` ✅ DONE Build complete
- 视觉效果：无变化（HTTPS 资源与 HTTP 资源完全一致，CDN 同时支持）

### 注意事项
- **推荐所有新代码使用 `| imgParam` 过滤器**——这样未来 CDN 协议调整（罕见）只需改 `imgParam` 一处
- **不要绕过 `imgParam` 直接绑 `picUrl`**——否则 mixed content 警告会重现
- 升级到 https 后，图片加载速度可能略有不同（取决于 CDN），通常无感

### Git 建议
- **Commit 类型**：`fix`
- **Commit message**：`fix: upgrade netease CDN http to https to silence Mixed Content warnings`
- **包含**：`src/utils/filters.js` + `src/components/PersonalFM.vue`
- **不包含**：docs（独立 docs commit）

---

### 2026-09-03 — REFACTOR-skeleton-shimmer 7 文件去重 + AlbumDetail 复用公共组件 + 删 3 项低优先级

### 修改内容
3 个 commit 一起做（低优先级清理 + 抽公共组件）：
1. **chore: remove dead t.artists branch in TracksLayout**（7 行删）
2. **refactor: use shared .skeleton-item class**（7 个文件删本地重复 `@keyframes shimmer`，统一用 `motion.scss` 公共 class；顺手删 mvPlay 死 CSS `.mvPlaySkeleton` 21 行）
3. **refactor: AlbumDetail uses PlaylistInfoSkeleton + TrackListSkeleton**（AlbumDetail 删 11 行自定义 `skel-*` CSS，改用公共组件）

### 修改文件
- `src/components/layout/TracksLayout.vue`（删 7 行 `v-else-if="t.artists"` + `v-else` 死代码）
- `src/components/layout/VideoPlayerLayout.vue`（删 `@keyframes shimmer` + 内联 shimmer 样式，加 `skeleton-item` class）
- `src/pages/AlbumDetail.vue`（用 `<PlaylistInfoSkeleton>` + `<TrackListSkeleton>`，删 11 行自定义 CSS + 1 个 `<div class="album-skel">`）
- `src/pages/artist/ArtistDetail.vue`（删 `@keyframes shimmer` + 内联样式，加 `skeleton-item` class）
- `src/pages/search/{Lyric,Track,Voice}Res.vue`（同样处理）
- `src/pages/mvPlay.vue`（删 21 行死 CSS `.mvPlaySkeleton`）
- `docs/PROJECT_CONTEXT.md`（划掉 3 项已修）

### 修改原因
- 之前"未来可改进"列了 3 条（骨架屏 / t.artists 死代码 / 重复 console）
- 实际调查发现 `motion.scss` 早就有公共 `.skeleton-item` + `@keyframes skeleton-shimmer`，**但 7 个文件不知道，全部重复实现**——典型的"公共能力已存在但未复用"
- `TracksLayout.vue` 的 `t.artists` v-else-if 永远不执行（normalizeTrack 保证 `t.ar` 永远 truthy）
- `mvPlay` 的 `.mvPlaySkeleton` 死 CSS（模板不引用）
- `AlbumDetail` 不知道已有 `PlaylistInfoSkeleton` + `TrackListSkeleton` 可用

### 关键设计
- 抽公共 shimmer 不需要新建 SCSS 文件——`motion.scss` 已有公共 `.skeleton-item`
- 替换原则：每个文件保留几何/尺寸样式（width/height/border-radius），**只删** `linear-gradient + background-size + animation`
- HTML 模板加 `skeleton-item` class（替代 CSS 中的 `animation: shimmer`）
- 不抽新组件（每个使用方单点，**抽组件不划算**）

### 测试结果
- `yarn build` ✅ DONE Build complete（每个 commit 都过）
- 视觉影响：shimmer 动画时长统一为 1.6s（之前部分文件用 1.5s）—— 实际看不出差别

### 注意事项
- `motion.scss` 是全局加载（`main.js:25` 引入 reset 链），所以 `.skeleton-item` 全局可用
- `shimmer` keyframe 名称已统一为 `skeleton-shimmer`（在 motion.scss），本地 `shimmer` 名称已全部删除
- 未来如需支持深色模式，shimmer 颜色通过 `$shimmer-color-*` 变量调整（motion.scss 已有 token）

### Git 建议
- **Commit 类型**：`refactor` + `chore`（混合）
- **3 个 commit**（已分别执行）：
  - `chore: remove dead t.artists branch in TracksLayout (normalize guarantees t.ar)`
  - `refactor: use shared .skeleton-item class (motion.scss) instead of 7 duplicate shimmer impls`
  - `refactor: AlbumDetail uses PlaylistInfoSkeleton + TrackListSkeleton (drop 11 custom skel- CSS lines)`
- **不包含**：docs（独立 commit 之前已划掉 PROJECT_CONTEXT 3 条）

---

### 2026-09-03 — FIX-console-runtime-bugs 修复控制台出现的 2 个 runtime BUG

### 修改内容
- **BUG 1**：`VideoPlay.vue:3` 当直接访问 `/video`（无 `?id=...` query）时 `id` 是 undefined，导致 `newId||id` 也为 undefined，触发 Vue 警告 `Missing required prop: "id"`（连锁触发 VideoPlayerLayout + CommentLayout 的同样警告）。加 `v-if="newId || id"` 守卫
- **BUG 2**：`App.vue:170` `clearAll` 直接 `this.$store.state.TracksAbout.currentPlaylist = []` 修改 Vuex state，触发 strict mode 警告 `Do not mutate vuex store state outside mutation handlers`，且与 `PlayerCore.isPersonalFM` watcher（L353）的 `REPLACE_PLAYLIST([currentSong])` 顺序竞争，导致 `_saveState` 保存陈旧状态（oldSong + 空 playlist）→ 刷新后 UI 不一致。改用 `this.$store.commit('TracksAbout/REPLACE_PLAYLIST', [])`
- 顺带：`App.vue:81` 删除上轮 console 清理漏掉的 `import Cookies from 'js-cookie'`（unused import）

### 修改文件
- 修改 `src/pages/VideoPlay.vue`（+1 v-if 守卫 + 1 注释）
- 修改 `src/App.vue`（`clearAll` 改用 commit；删 `import Cookies`）
- 修改 `docs/CHANGELOG_AI.md`（本条目）

### 修改原因
用户报告 dev server 控制台出现 2 个 BUG，审计后发现：
- BUG 1：路由进入 `/video` 无 query 时 Vue prop required 警告
- BUG 2：与上次 isPersonalFM 拆分同期遗留的同类反模式（App.vue:136 修了，但 L170 没修）

### 关键设计
- BUG 1 用 `v-if` 而非 fallback 值（如 `:id="id || 'placeholder'"`）—— 避免在子组件中引入"假 id"导致后续 API 调用错误
- BUG 2 用 commit 而非直接赋值——Vuex 响应式链路正常触发，且 strict mode 不报警告

### 测试结果
- `yarn build` ✅ DONE Build complete
- `yarn lint` ✅ 错误数从 8 降到 7（修了 Cookies unused）

### 注意事项
- `v-if` 守卫意味着 id 不存在时**整个组件不渲染**（连占位 DOM 都没有），符合 required prop 约束
- Vuex state 直接赋值在其他位置可能还有，需要 grep 后续审查
- 上次 `isPersonalFM` 拆分决策 26 强调"禁止再写回 Vuex"——本次 BUG 2 的修复是同一原则的延伸

### Git 建议
- **Commit 类型**：`fix`
- **Commit message**：`fix: resolve 2 console runtime bugs (VideoPlay prop + clearAll mutation)`
- **包含**：2 个源文件
- **不包含**：docs（独立 docs commit）

---

### 2026-09-03 — FIX-clear-persisted-playlist 清空播放列表时同步删除 localStorage

### 修改内容
`PlayerCore.clearPlaylist` 成功回调中显式 `localStorage.removeItem('acmusic_player_state')`，避免清空后刷新页面被 `_restoreState` "复活"。

### 修改文件
- 修改 `src/components/musicPlayer/PlayerCore.vue`（`clearPlaylist` 内增加 1 行 `try { localStorage.removeItem(...) } catch {}`）
- 修改 `docs/CHANGELOG_AI.md`（本条目）

### 修改原因
- BUG 链路：
  1. `PlayerCore.clearPlaylist` 弹窗 → `$bus('clearPlaylist')` → `App.clearAll` 直接 `state.currentPlaylist = []`
  2. `_saveState` 守卫 `if (!s || !s.id) return`（song.id 空时不写）
  3. **旧 localStorage 残留** → 下次刷新 → `_restoreState` (L1113) 读出旧 playlist → 列表"复活"

### 关键设计
- 显式 removeItem（不能依赖 _saveState 自动清，因为守卫原因）
- try-catch 包裹（避免 localStorage 异常导致整个清空失败）
- 放在 `$bus.emit('clearPlaylist')` 之后，确保 UI 状态先更新

### 测试结果
- `yarn build` ✅ DONE Build complete

### 注意事项
- 验证路径：听几首歌（让 _saveState 存了 localStorage）→ 点清空列表 → 刷新页面 → 列表应为空
- 如有其他清空入口（如 logout），也需要同步清 localStorage

### Git 建议
- **Commit 类型**：`fix`
- **Commit message**：`fix: clear localStorage when clearing playlist`
- **包含**：`src/components/musicPlayer/PlayerCore.vue`
- **不包含**：docs（独立 docs commit）

---

### 2026-09-03 — REFACTOR-fm-state isPersonalFM 从 Vuex 下沉到 PlayerCore

### 修改内容
将 `isPersonalFM` 从 Vuex store 下沉到 PlayerCore 内部 data，通过 `$bus` 通信。删除 `SET_PERSONAL_FM` mutation，PersonalFM/HomePage/App 改用 `$bus.$emit('fm-mode', val)` 通知 PlayerCore。

### 修改文件
- 修改 `src/components/musicPlayer/PlayerCore.vue`：
  - `mapState` 删除 `isPersonalFM`
  - `data()` 加 `isPersonalFM: false`（与 `playMode` 同类）
  - `mounted` 监听 `$bus.$on('fm-mode', this._fmModeHandler)`
  - `beforeDestroy` 清理 `$bus.$off('fm-mode', this._fmModeHandler)`
  - `isPersonalFM` watcher 行为保留（true→false 时 REPLACE_PLAYLIST [currentSong]）
- 修改 `src/components/PersonalFM.vue`（3 处）：`this.$store.state.TracksAbout.isPersonalFM = true` → `this.$bus.$emit('fm-mode', true)`
- 修改 `src/pages/HomePage.vue`（1 处）：同上
- 修改 `src/App.vue`（1 处 + 修 bug）：`this.$store.state.isPersonalFM = false`（缺模块前缀，写到根 state，**实际没生效**）→ `this.$bus.$emit('fm-mode', false)`
- 修改 `src/store/modules/Tracks.js`：
  - 删 `state.isPersonalFM: false`
  - 删 `SET_PERSONAL_FM` mutation
  - `playAllTracks` action 内不再 commit `SET_PERSONAL_FM`
- 修改 `docs/ARCHITECTURE_DECISIONS.md`（新增决策 26 + 划掉"未来可改进"项 1）

### 修改原因
- "未来可改进"中识别：`isPersonalFM` 与 `playMode` 同性质但分散在 Vuex，**不一致**
- 4 处组件跨边界直接 `state.X = true`，违反 Vuex 原则
- App.vue:136 隐藏 bug（写错根 state，完全没生效）
- PlayerCore 依赖 Vuex 读取纯内部状态 → 跨组件耦合

### 关键设计
- **单数据源**：PlayerCore.data 唯一真源
- **唯一写入点**：PlayerCore mounted 监听 `$bus('fm-mode')`，所有外部请求都走此
- **不引入新依赖**：$bus 已有 25+ 事件（`clearPlaylist` / `loggedIn` / `vClk` 等），与项目模式一致
- **零业务逻辑变化**：PlayerCore 内部 6 处 `if (this.isPersonalFM)` 逻辑全部保持

### 测试结果
- `yarn build` ✅ DONE Build complete
- `yarn lint` ⚠️ 8 个错误，其中 7 个为预存在，**1 个为上轮 commit 漏修**（`App.vue:81 'Cookies' is defined but never used`——上轮删 `console.log(Cookies.get())` 后 import 未清理，**不属于本任务范围**，建议下个 commit 顺手修）

### 注意事项
- `$bus('fm-mode')` 是新的全局事件，命名遵循 `$bus('xxx')` 风格
- 写入唯一性：禁止在 PlayerCore 之外的任何地方直接修改 `isPersonalFM`（包括 Vuex 路径）
- 之后新增的 FM 相关跨组件通信，沿用 `$bus('fm-mode:xxx')` 风格

### Git 建议
- **Commit 类型**：`refactor`
- **Commit message**：`refactor: move isPersonalFM from Vuex to PlayerCore (with $bus)`
- **包含**：5 个源文件
- **不包含**：docs（独立 docs commit）

---

### 2026-09-03 — CHORE-console-cleanup 清理临时 console 日志

### 修改内容
删除 15 个文件中的 30 处 `console.log` / `console.trace` 临时调试日志，3 处 `console.log(err.message)` 升级为 `console.error(err.message)`。PlayerCore.vue 全部 68 处保留（语义化追踪标签）。

### 修改文件
- `src/utils/audioCache.js`（6 log 删）
- `src/App.vue`（4 log 删）
- `src/components/userPage/phoneLogin.vue`（1 删 + 3 升级 log→error）
- `src/pages/AlbumDetail.vue`（2 log 删，warn/error 保留）
- `src/components/DoSearch.vue`（2 log 删）
- `src/components/musicPlayer/MusicPlayer.vue`（1 升级）
- `src/pages/UserPage.vue`（1 升级）
- `src/pages/search/TrackRes.vue`（1 log 删）
- `src/components/layout/TracksLayout.vue`（1 log 删）
- `src/components/layout/CommentContentLayout.vue`（1 log 删）
- `src/components/SendComment.vue`（1 log 删）
- `src/pages/HomePage.vue`（1 log 删）
- `src/pages/VideoPlay.vue`（1 log 删）
- `src/pages/explorePage/VideoList.vue`（1 log 删）
- `src/pages/artist/ArtistAllSongs.vue`（1 log 删）

### 修改原因
- 之前"未来可改进"中列出"大量 console.log / console.trace"
- 项目散落大量临时调试 echo 风格的 log，无语义化标签
- 这些 log 既不保留错误信息，也无法定位问题（与 PlayerCore 的语义化 log 形成对比）

### 关键设计
- **保留原则**：`console.error` / `console.warn` 永远保留（生产环境排查错误必需）
- **PlayerCore 例外**：68 处 console 都是带语义化标签的播放流程追踪（`[PlayIntent]` / `[SongState]` / `[SourceChange]` 等），删除后排查播放问题困难 → 全部保留
- **升级原则**：`console.log(err.message)` 升级为 `console.error(err.message)`，错误追踪更准确

### 测试结果
- `yarn build` ✅ DONE Build complete
- 净减 23 处 console（107 → 84），error 反而增加 5 处（升级）

### 注意事项
- 未来新增代码：优先用语义化标签（`[Context] message`）而不是裸 console.log
- 生产构建依赖 terser 剥离 log/trace（vue.config.js），但开发体验仍应保持干净
- `console.error` / `console.warn` 是必需的运行时反馈，不可删

### Git 建议
- **Commit 类型**：`chore`
- **Commit message**：`chore: clean up console.log/trace (keep error/warn)`
- **包含**：15 个源文件
- **不包含**：docs（独立 docs commit）

---

### 2026-09-03 — REFACTOR-api-wrappers API 封装补全

### 修改内容
将散落在页面里的 `$axios(...)` 调用统一到 `src/api/*.js`，新建 5 个封装 + 扩充 2 个封装 + 替换 23 个调用方。

### 修改文件
- 新增 `src/api/Search.js`（6 个导出：search/searchV2/suggest/multimatch/defaultKeyword/hotDetail）
- 新增 `src/api/Video.js`（8 个：detail/url/related/mlogToVideo/groupList/group/timelineRecommend）
- 新增 `src/api/Mv.js`（5 个：detail/url/simi/all/first）
- 新增 `src/api/Artist.js`（7 个：detail/topSongs/albums/mvs/simi/videos/songs）
- 新增 `src/api/UserDetail.js`（3 个：detail/playlists/record）
- 扩充 `src/api/Tracks.js`（+9 个：personalFM/songUrlV1/songUrl/songUrlMatch/detail/recommendSongs/personalized/recommendResource/simiPlaylist）
- 扩充 `src/api/Playlist.js`（+9 个：detail/catlist/highqualityTags/highquality/top/toplistDetail/toplistArtist/newest/topArtists）
- 替换 23 个 .vue 调用方
- 修复 `AlbumDetail.vue:61` 路径 `'album'`（缺前导 `/`）→ 用 `Album.getDetail()` 正确路径
- 修改 `docs/ARCHITECTURE_DECISIONS.md`（新增决策 24 + 划掉"未来可改进"项 2）
- 修改 `docs/CHANGELOG_AI.md`（本条目）

### 修改原因
- 之前"未来可改进"清单中识别"50% API 调用散落在页面里"
- 违反了"所有 API 走 `src/api/*.js`"设计
- 不利于 URL 集中管理、TypeScript 类型化、单测 mock

### 关键设计
- 严格 1:1 替换：不动逻辑、不改参数形状、不改响应处理
- 命名空间 import：`import * as xxxApi from "@/api/..."` 区分模块
- 已有 wrapper 不动：仅追加新导出，不修改原函数签名
- 故意保留 1 处直接 `$axios`：`PlayerCore.vue:559` 的 `/song/url/v1` 带额外 `level/unblock/timestamp` 参数，当前 wrapper 不支持这些参数

### 测试结果
- `yarn lint` ✅ 7 个错误全部为预存在
- `yarn build` ✅ DONE Build complete（26 个文件，241 行新代码 / 94 行删除）

### 注意事项
- 建议实际跑一遍：首页/搜索/歌单详情/歌手详情/MV/视频/专辑详情
- 替换 ≠ 完成：需要在浏览器验证主流程无回归

### Git 建议
- **Commit 类型**：`refactor`
- **Commit message**：`refactor: consolidate scattered API calls into api wrappers`
- **包含**：5 个新增封装 + 2 个扩充 + 23 个 .vue 替换
- **不包含**：docs（独立 docs commit）

---

### 2026-09-03 — FIX-song-like 歌曲喜欢真正接入 NetEase /like API

### 修改内容
让 PlayerCore / MusicPlayer 的红心按钮真实调用 `/like` API，登录后拉 `/likelist` 填充 likedSongIds Set，歌曲切换时同步 liked 状态。

### 修改文件
- 修改 `src/api/Tracks.js`（+ `likelist()` wrapper）
- 修改 `src/components/musicPlayer/PlayerCore.vue`：
  - 加 `likedSongIds: Set`、`likePending: boolean` data
  - 加 `isLogin` watcher：登录变化时重新拉 `/likelist`
  - 加 `currentSong` watcher 同步：从 Set 判断初始 `isLiked`
  - 加 `_initLikedSet()`：fetch `/likelist` 填充 Set
  - 改写 `toggleLike()`：登录检查 + 乐观更新 + `/like` API + 失败回滚 + emit `likeChange`
  - mounted 启动登录后立即拉一次
  - 加 `import * as tracks from "@/api/Tracks"`
- 修改 `src/components/musicPlayer/MusicPlayer.vue`：
  - 删 `isLiked: false`、`likedCount: 0` data
  - 加 `likeMirror: false` data + `isLiked` computed
  - mounted 监听 PlayerCore emit 的 `'likeChange'` 事件
  - `toggleLike()` 委托给 `this.$refs.pgPanel.toggleLike()`（单数据源）
  - 模板：去掉 `likedCount` 显示（NetEase 无此 API）

### 修改原因
- 原 `toggleLike` 只本地翻 `isLiked`，**完全没接 `/like` API**
- `likedCount++` 是假数据（NetEase 无 likedCount 公开 API）
- 用户点击红心后，"我的喜欢歌单"中**没有**这首歌
- `Tracks.like()` API 封装存在但从未被调用

### 关键设计
- **单数据源**：PlayerCore 维护真实 `isLiked` + `likedSongIds` Set，MusicPlayer 通过 `$on('likeChange')` 镜像展示
- **持久化**：likedSongIds Set 增量同步（toggleLike 成功后 add/delete），避免每次切歌查接口
- **乐观更新 + 失败回滚**：UI 立即翻转体验好，失败不影响服务端
- **并发保护**：`likePending` 锁，快速连点不会多次请求
- **登录复用**：用项目 `UserAbout/isLogin` getter（与 App.vue/HomePage.vue 一致）

### 测试结果
- `yarn lint` ✅ 7 个错误全部为预存在
- `yarn build` ✅ DONE Build complete

### 需要在浏览器验证
- Network 标签：登录后看到 `/likelist` 请求；点红心看到 `/like?id=xxx&like=true`
- 音乐平台「我的喜欢」歌单确认歌曲出现
- 快速连点：只发1 次请求
- 不同歌曲切换：liked 状态从服务端真实同步
- 刷新页面：服务端返回的 liked 状态正确显示

### Git 建议
- **Commit 类型**：`fix`
- **Commit message**：`fix: song like actually calls /like API`
- **包含**：
- `src/api/Tracks.js`
- `src/components/musicPlayer/PlayerCore.vue`
- `src/components/musicPlayer/MusicPlayer.vue`
- **不包含**：
- docs（独立 docs commit）

---

### 2026-09-03 — FIX-comment-like 评论点赞改为 Vue 状态驱动

### 修改内容
重写 `CommentContentLayout.toggleLike`，从 DOM 操作改为 Vue 响应式状态。

### 修改文件
- 修改 `src/components/layout/CommentContentLayout.vue`（模板 + 脚本）：
  - 模板：`@click="handleLike($event,cm)"` → `@click="toggleLike(cm)"`，加 `:class="{ pending }"`
  - data：：加 `likePending: {}`
  - computed：：加 `isLogin`（复用项目 `UserAbout/isLogin` getter）
  - methods：：删 `handleLike` / `toggleLike` / `alertLike` / `alertUnlike` / `alertErr`，合并为新 `toggleLike(cm)`
- 修改 `src/assets/scss/comment/commentContentLayout.scss`（加 `.like.pending { opacity: 0.5; cursor: wait; }`）

### 修改原因
- 原实现用 DOM 操作（`evt.target.classList.replace` + `nextElementSibling.innerText`）
- evt.target 依赖 BaseIcon 渲染结构，点击不同位置（`<i>` vs `<span>`）会失效
- DOM 操作不响应 Vue 状态变化，刷新后 class 不会跟随服务端 `liked` 字段
- 快速连点无并发保护，innerText 累加错误
- 与项目"Vue 状态驱动 UI"的设计哲学不符

### 关键设计
- **状态绑定**：直接修改 `cm.liked` / `cm.likedCount`（API 返回的对象自带这些字段，Vue 2 已自动响应）
- **$set 兜底**：用 `this.$set(cm, 'liked', !wasLiked)` 保证响应式更新
- **并发保护**：`likePending[cm.commentId]` map，仅锁当前评论，不影响其他评论
- **安全模式**：API 成功后才更新 UI，失败仅提示不修改
- **计数防护**：`Math.max(0, prev + delta)` 防止负数
- **登录判断**：复用 `UserAbout/isLogin` getter
- **消息提示**：复用项目 `this.$message`（success / warning / error）

### 测试结果
- `yarn lint` ✅ 7 个错误全部为预存在
- `yarn build` ✅ DONE Build complete

### 注意事项
- 未在浏览器实际点击测试（仅完成代码 + lint/build 验证）
- 用户需要在浏览器 console 验证 Network 请求和参数

### Git 建议
- **Commit 类型**：`fix`
- **Commit message**：`fix: comment like uses Vue state instead of DOM`
- **包含**：
- `src/components/layout/CommentContentLayout.vue`
- `src/assets/scss/comment/commentContentLayout.scss`
- **不包含**：
- docs（独立 docs commit）

---

### 2026-09-03 — OPT-mixin mixin 路径统一

### 修改内容
合并 `src/assets/mixin/` 与 `src/mixins/` 到 `src/mixins/`。

### 修改文件
- 新增 `src/mixins/searchMixin.js`（从 `src/assets/mixin/index.js` 移过来）
- 删除 `src/assets/mixin/index.js` 和 `src/assets/mixin/` 目录
- 修改 9 个 search 结果组件 import 路径：`@/assets/mixin` → `@/mixins/searchMixin`
  - `src/pages/search/AlbumRes.vue`
  - `src/pages/search/ArtistRes.vue`
  - `src/pages/search/LyricRes.vue`
  - `src/pages/search/MvRes.vue`
  - `src/pages/search/PlaylistRes.vue`
  - `src/pages/search/TrackRes.vue`
  - `src/pages/search/UserRes.vue`
  - `src/pages/search/VideoRes.vue`
  - `src/pages/search/VoiceRes.vue`
- 修改 `docs/PROJECT_CONTEXT.md`（从中优先级清单移除已修复项）
- 修改 `docs/ARCHITECTURE_DECISIONS.md`（新增第 21 条）
- 修改 `docs/CHANGELOG_AI.md`（本条目）

### 修改原因
- 项目内有两处 mixin 目录，新代码不知道该往哪加
- 路径分裂影响可维护性

### 关键设计
- 沿用 `src/mixins/` 命名（与 `coverLight.js` 一致）
- SCSS mixin 保持原位（不同语境，不受影响）

### 测试结果
- `yarn lint` ✅ 7 个错误全部为预存在
- `yarn build` ✅ DONE Build complete

### 注意事项
- 第一次尝试用 PowerShell `Set-Content` 批量替换时，因 LF→CRLF 转换导致 build 失败
- 第二次改用逐文件 `edit` 工具成功（保持原 LF 行尾）

### Git 建议
- **Commit 类型**：`refactor`
- **Commit message**：`refactor: consolidate mixins into src/mixins/`
- **包含**：
  - `src/mixins/searchMixin.js`（新增）
  - `src/assets/mixin/index.js`（删除）
  - 9 个 search 结果组件的 import 路径
- **不包含**：
  - `docs/`（独立 docs commit）

---

### 2026-09-03 — OPT-FM-random FM 模式下禁用随机播放

### 修改内容
`getNextIndex` / `getPrevIndex` 入口加 `isPersonalFM` 短路，FM 模式下不走 shuffle。

### 修改文件
- 修改 `src/components/musicPlayer/PlayerCore.vue`（getNextIndex / getPrevIndex 各加 3 行短路逻辑）
- 修改 `docs/ARCHITECTURE_DECISIONS.md`（新增第 20 条）
- 修改 `docs/CHANGELOG_AI.md`（本条目）

### 修改原因
- NetEase `/personal_fm` 接口返回的歌曲已按推荐度排序
- shuffle 破坏推荐顺序，且不符合 NetEase 推荐算法"听完整首=喜欢"的信号反馈
- 之前决策 15-19 的 nextSong / _autoNext 已自定义走顺序，但 preSong 走 getPrevIndex 仍可能命中 shuffle

### 关键设计
- 源头短路最干净（`getNextIndex` / `getPrevIndex` 入口判断）
- 不影响 playMode 状态（用户切出 FM 后仍是 random 模式）
- shuffle 数据保留，离开 FM 后仍有效
- 非 FM 模式行为完全不变

### 测试结果
- `yarn lint` ✅ 7 个错误全部为预存在
- `yarn build` ✅ DONE Build complete

### 注意事项
- 之前决策 15-19 全部不受影响
- 用户可以保持 random 模式，进入 FM 时自动走顺序，切出 FM 仍是 random

### Git 建议
- **Commit 类型**：`fix`
- **Commit message**：`fix: disable shuffle in FM mode (preserve recommendation order)`
- **包含**：
  - `src/components/musicPlayer/PlayerCore.vue`
- **不包含**：
  - `docs/`（独立 docs commit）

---

### 2026-09-03 — OPT-FM-fix7 加强 _autoNext 锁（setTimeout + audio ended）

### 修改内容
`_autoNext` 锁改用 `setTimeout(1000)` 替代 `$nextTick`，并加 audio 'ended' 事件监听作为主触发器。

### 修改文件
- 修改 `src/components/musicPlayer/PlayerCore.vue`（锁改 setTimeout + 加 audio 'ended' 监听 + _onAudioEnded 方法）
- 修改 `docs/ARCHITECTURE_DECISIONS.md`（更新决策 19.1）
- 修改 `docs/CHANGELOG_AI.md`（本条目）

### 修改原因
- 决策 19.1 用 `$nextTick` 释放锁，但实测仍有问题
- 根因：`$nextTick` 是 microtask，audio timeupdate 是 macrotask，audio 暂停前已 dispatch 的 timeupdate 在 `$nextTick` 之后才执行
- 修复：用 `setTimeout(1000)` 覆盖所有残留 audio 事件；加 audio 'ended' 事件作为主触发器

### 关键设计
- `setTimeout(1000)`：1s 锁覆盖所有 audio 事件（microtask + macrotask）
- `audio.pause()`：在 `_autoNext` 入口同步调用，立即阻止后续 timeupdate
- `audio 'ended'`：主触发器（audio 播到结尾时由浏览器原生触发）
- `timeNow` watcher 保留：作为兜底，处理 'ended' 未触发的边缘情况

### 测试结果
- `yarn lint` ✅ 7 个错误全部为预存在
- `yarn build` ✅ DONE Build complete

### 注意事项
- 1s 锁对正常歌曲切换无影响（歌曲 >1min）
- `_onAudioEnded` 和 timeNow watcher 都调 `_autoNext`，锁防止重复

### Git 建议
- **Commit 类型**：`fix`
- **Commit message**：`fix: harden _autoNext lock with setTimeout + audio ended event`
- **包含**：
  - `src/components/musicPlayer/PlayerCore.vue`
- **不包含**：
  - `docs/`（独立 docs commit）

---

### 2026-09-03 — OPT-FM-fix6 修复自然播完跳到第二首

### 修改内容
加 `autoNextLocked` 锁防止 song end 期间 timeNow watcher 多次触发 _autoNext。

### 修改文件
- 修改 `src/components/musicPlayer/PlayerCore.vue`（+1 data 字段 + 4 行 _autoNext 入口代码）
- 修改 `docs/ARCHITECTURE_DECISIONS.md`（追加决策 19.1）
- 修改 `docs/CHANGELOG_AI.md`（本条目）

### 修改原因
- 决策 19 实施后用户实测：自然播完 song 3 时跳到新批次第二首而非第一首
- 根因：timeNow watcher 在 audio 距结束 0.5s 内即触发 _autoNext，每次 timeupdate 都触发，导致 _autoNext 被多次调用
- 第一次 _autoNext 触发过渡（curIndex 2→0），后续 _autoNext 看到 curIndex=0 误判为"未到末尾"，执行 curIndex++ 到 1

### 关键设计
- `_autoNext` 入口加锁：`if (this.autoNextLocked) return`
- 第一次触发后设锁，$nextTick 回调释放（覆盖同步过渡 + Vue watcher flush + 残留 audio event）
- 不影响手动点击（无残留 timeupdate 事件）

### 测试结果
- `yarn lint` ✅ 7 个错误全部为预存在
- `yarn build` ✅ DONE Build complete

### 注意事项
- 锁覆盖整个微任务周期，包括 audio 暂停前的最后一两个 timeupdate
- 普通歌单（非 FM）的 _autoNext 也被锁住，但下一首歌曲是下一 tick，无副作用

### Git 建议
- **Commit 类型**：`fix`
- **Commit message**：`fix: lock _autoNext to prevent multi-fire on natural song end`
- **包含**：
  - `src/components/musicPlayer/PlayerCore.vue`
- **不包含**：
  - `docs/`（独立 docs commit）

---

### 2026-09-03 — OPT-FM-fix5 FM staged batch + 双事件路径

### 修改内容
彻底重构 FM 预加载机制：proactive prefetch 只拉数据并 stage 到 store，**不 REPLACE_PLAYLIST**；reactive 在歌曲自然结束时应用 staged batch 并切换。

### 修改文件
- 修改 `src/store/modules/Tracks.js`（+1 state `fmStagedBatch` + 2 mutations）
- 修改 `src/components/PersonalFM.vue`（重构为 fetchAndStage / applyStagedOrFetch / _doFetch / _applyBatch + 双事件订阅 + fmPendingApply 标志）
- 修改 `src/components/musicPlayer/PlayerCore.vue`（删除 currentPlaylist watcher，fmShouldPrefetch 改 publish 'fmPrefetch'，nextSong/_autoNext 末尾 publish 'getPersonalFM'，playFmNewBatch 恢复简单逻辑）
- 修改 `docs/ARCHITECTURE_DECISIONS.md`（重写第 19 条）

### 修改原因
- 决策 18 + 19 实测均失败：proactive 仍会打断当前 song 3
- 用户明确要求"proactive 只拉元数据不做任何操作，等 song 3 自然结束再切换"
- 类比 NetEase 项目的"预加载下一首歌信息"模式

### 关键设计
- **staged batch**：proactive 拉到的数据暂存到 `store.state.TracksAbout.fmStagedBatch`，不替换 playlist
- **双事件**：`'fmPrefetch'`（proactive）+ `'getPersonalFM'`（reactive），PersonalFM 分别处理
- **fmPendingApply**：处理"reactive 触发时 proactive fetch 还在进行"的边缘情况
- **currentPlaylist watcher 已删除**：之前就是这个 watcher 导致数据竞争

### 测试结果
- `yarn lint` ✅ 7 个错误全部为预存在
- `yarn build` ✅ DONE Build complete

### 注意事项
- 首次 FM session（无 staged）有 ~200ms 静音，可接受
- 多次点 next 不会引起重复 fetch（in-flight + 1.5s debounce）

### Git 建议
- **Commit 类型**：`refactor`
- **Commit message**：`refactor: FM staged batch with dual-event flow`
- **包含**：
  - `src/store/modules/Tracks.js`
  - `src/components/PersonalFM.vue`
  - `src/components/musicPlayer/PlayerCore.vue`
- **不包含**：
  - `docs/`（独立 docs commit）

---

### 2026-09-03 — OPT-FM-fix4 修复预加载打断当前歌曲

### 修改内容
让 proactive prefetch 不打断当前歌曲（song 3 继续播完），同时保证末尾 reactive trigger 能无缝过渡到新批次。

### 修改文件
- 修改 `src/components/musicPlayer/PlayerCore.vue`（nextSong/_autoNext 末尾 set curIndex=0 + 新增 currentPlaylist watcher + playFmNewBatch 改 no-op）
- 修改 `docs/ARCHITECTURE_DECISIONS.md`（新增第 19 条决策记录）

### 修改原因
- 决策 18 实施后用户反馈：进入第 3 首的瞬间，proactive prefetch 触发的 playFmNewBatch 把 curIndex=0，旧 song 3 被立即打断
- 根因：proactive 和 reactive 共用同一事件，PersonalFM.fetchMoreFM 总是 publish fmNewBatch 强制 curIndex=0
- 之前的 fmPendingTransition flag 方案有 bug：proactive 完成后 reactive publish 走 in-flight 跳过，curIndex 永远不推进

### 关键设计
- **proactive 不动 curIndex**：fmShouldPrefetch 仅 publish，PersonalFM fetchMoreFM 拉数据 + REPLACE_PLAYLIST
- **reactive 直接 set curIndex=0**：nextSong/_autoNext 末尾 set curIndex=0 立即过渡，不依赖事件
- **currentPlaylist watcher 兜底**：当 REPLACE_PLAYLIST 发生时，若 currentSong 不在新列表，重新按 curIndex 同步
- **playFmNewBatch 改 no-op**：curIndex 推进由 nextSong/_autoNext 和 watcher 协调

### 测试结果
- `yarn lint` ✅ 7 个错误全部为预存在
- `yarn build` ✅ DONE Build complete

### 注意事项
- 时序：reactive set curIndex=0 后，proactive 完成 REPLACE_PLAYLIST，watcher 重新同步 currentSong
- playFmNewBatch 订阅保留（no-op），不破坏 PersonalFM 事件流

### Git 建议
- **Commit 类型**：`fix`
- **Commit message**：`fix: FM prefetch no longer interrupts current song`
- **包含**：
  - `src/components/musicPlayer/PlayerCore.vue`
- **不包含**：
  - `docs/`（独立 docs commit）

---

### 2026-09-03 — OPT-FM-fix3 FM 预加载 + 3 首循环模式

### 修改内容
实现 FM "3 首循环 + 替换 + 预加载"模式，移除累积追加和反应式空白。

### 修改文件
- 修改 `src/pages/HomePage.vue`（playPersonalFM 取前 3 首）
- 修改 `src/components/PersonalFM.vue`（fetchMoreFM 改为 REPLACE_PLAYLIST 替换 + 同步 currentList）
- 修改 `src/components/musicPlayer/PlayerCore.vue`（nextSong/_autoNext 智能切歌 + fmShouldPrefetch computed + watcher）
- 修改 `docs/ARCHITECTURE_DECISIONS.md`（新增第 18 条决策记录）

### 修改原因
- 用户实测反馈：当前 3 首 + 点 next 应切下一首，而不是跳到新加载的歌曲
- 用户期望：列表始终显示 3 首，循环播放
- 反应式 fetch 有 ~0.5s 静音缝隙，改预加载消除

### 关键设计
- **3 首循环**：HomePage 启动时 slice(0, 3)，fetchMoreFM REPLACE_PLAYLIST 替换
- **智能切歌**：FM 模式下 nextSong / _autoNext 在 curIndex < length-1 时 curIndex++，仅在末尾才 publish
- **预加载**：PlayerCore fmShouldPrefetch computed 监听 curIndex === length-1，提前一首歌触发 fetch
- **兜底机制**：_autoNext / nextSong 在末尾的反应式 publish 保留，作为网络失败的 retry 路径

### 测试结果
- `yarn lint` ✅ 7 个错误全部为预存在
- `yarn build` ✅ DONE Build complete

### 注意事项
- fmShouldPrefetch 在非 FM 模式永远 false，watcher 不会误触发
- 预加载与反应式可能同时触发，但 fetchMoreFM 的 1.5s 去抖 + in-flight 检查保证只有一次 fetch

### Git 建议
- **Commit 类型**：`feat`
- **Commit message**：`feat: FM 3-song cycle + proactive prefetch`
- **包含**：
  - `src/pages/HomePage.vue`
  - `src/components/PersonalFM.vue`
  - `src/components/musicPlayer/PlayerCore.vue`
- **不包含**：
  - `docs/`（独立 docs commit）

---

### 2026-09-03 — OPT-FM-fix2 修复 next 失效 + isPersonalFM 状态污染

### 修改内容
恢复 `playAllTracks` action 的 isPersonalFM 重置逻辑（pre-existing bug），并调整 PersonalFM 调用顺序，把 fetchMoreFM 去抖窗口从 5s 缩短至 1.5s。

### 修改文件
- 修改 `src/store/modules/Tracks.js`（加 `SET_PERSONAL_FM` mutation + 恢复 commit）
- 修改 `src/components/PersonalFM.vue`（3 处调用顺序 + 去抖 5s→1.5s）
- 修改 `docs/ARCHITECTURE_DECISIONS.md`（新增第 17 条决策记录）

### 修改原因
- 决策 15-16 实施后测试发现：进入 FM 模式后 `isPersonalFM` 被永久置为 `true`
- `PlayerCore.nextSong` 检查 `isPersonalFM === true` → publish + return → 普通模式 next 按钮失效
- `App.vue:137` 也有 bug：写的是 `state.isPersonalFM`（缺模块前缀），重置无效
- FM 模式主动 next 还会因 5s 去抖被卡（用户连点体验差）

### 关键设计
- **入口前置**：`playAllTracks` action 入口 commit `SET_PERSONAL_FM false`，所有非 FM 来源都安全
- **顺序覆盖**：PersonalFM 3 处调用（playCard / playAllFM / initPlay）改为"先 dispatch 后 set true"，让重置生效后再覆盖
- **去抖优化**：5s → 1.5s，让快速连点 next 不被卡（自然播放完间隔是分钟级，1.5s 足够）

### 测试结果
- `yarn lint` ✅ 7 个错误全部为预存在
- `yarn build` ✅ DONE Build complete

### 注意事项
- 任何新增播放入口若绕过 `playAllTracks`，需自行重置 `isPersonalFM`
- 1.5s 去抖是 UX 折中，若实测触发过于频繁可回调

### Git 建议
- **Commit 类型**：`fix`
- **Commit message**：`fix: reset isPersonalFM on playAllTracks + tighten FM debounce`
- **包含**：
  - `src/store/modules/Tracks.js`
  - `src/components/PersonalFM.vue`
- **不包含**：
  - `docs/`（独立 docs commit）

---

### 2026-09-03 — OPT-FM-fix 修复 FM 续播卡住

### 修改内容
PersonalFM 拉取新批次后通知 PlayerCore 推进 curIndex，解决"自然播完最后一首后 UI 卡在暂停状态"的 bug。

### 修改文件
- 修改 `src/components/PersonalFM.vue`（fetchMoreFM 中加 3 行：捕获 oldLength + publish）
- 修改 `src/components/musicPlayer/PlayerCore.vue`（加 1 方法 + mounted/beforeDestroy 订阅管理）
- 修改 `docs/ARCHITECTURE_DECISIONS.md`（新增第 16 条决策记录）

### 修改原因
- 实测发现：仅决策 15 后，FM 列表播完最后一首时，UI 卡在"已暂停"状态
- 根因：`_autoNext` / `nextSong` 在 FM 模式下 publish 后直接 return，无人推进 curIndex
- 手动点击 FM 卡片看似"能播"，是因为 `playCard` → `playAllTracks` 替换了整个 playlist + 触发 `playAll` 事件

### 关键设计
- PersonalFM 在 PUSH_PLAYLIST 前捕获 `oldLength`，追加后 publish `('fmNewBatch', oldLength)`
- PlayerCore `playFmNewBatch` 订阅后把 `curIndex = oldLength`，`watch.curIndex` 链路自动播放
- 严格边界检查：仅 FM 模式生效、startIndex 必须合法、不能越界
- 独立 `fmBatchId` 字段，与原 `pubId` 生命周期独立

### 测试结果
- `yarn lint` ✅ 7 个错误全部为预存在，本轮未新增错误
- `yarn build` ✅ DONE Build complete

### 注意事项
- 若新 batch 较小（如 < 3 首），可能仍然无法"自然循环"，需实测
- 当前实现是"反应式"（耗尽时触发），如需"预加载"见决策 16 未来注意事项

### Git 建议
- **Commit 类型**：`fix`
- **Commit message**：`fix: advance curIndex on FM new batch (resolve play-end stall)`
- **包含**：
  - `src/components/PersonalFM.vue`
  - `src/components/musicPlayer/PlayerCore.vue`
- **不包含**：
  - `docs/`（独立 docs commit）

---

### 2026-09-02 — OPT-FM 实现 FM 自动续播

### 修改内容
补全 PlayerCore 早先 publish 但无人订阅的 `'getPersonalFM'` 事件链路，实现 FM 列表耗尽时自动拉取新歌曲。

### 修改文件
- 修改 `src/components/PersonalFM.vue`（+ 1 import、3 data 字段、1 方法、2 处 lifecycle 钩子改动）
- 修改 `docs/ARCHITECTURE_DECISIONS.md`（新增第 15 条决策记录）
- 修改 `docs/PROJECT_CONTEXT.md`（移除该问题 + 修正 pubsub 描述）

### 修改原因
- 参考 `docs/优化.md` 中的 OPT-7 计划
- 分析 NeteaseCloudMusicApi Enhanced 文档后确认：`/personal_fm` 接口已支持"每次返回不同歌曲"（基于时间戳），无需新 API
- `pubsub.publish('getPersonalFM', ...)` 在 PlayerCore line 618/630 已发布多年，但全项目**无任何订阅者**
- FM 模式播完首批后无法继续，体验差

### 关键设计
- **5 秒去抖**（`fmLastFetchAt`）+ **in-flight 检查**（`fmFetching` flag）→ 防止快速切歌触发重复请求
- **错误降级** → 网络失败仅 `console.error` + Element UI Message 提示，不影响当前播放
- **复用现有 mutation** → `TracksAbout/PUSH_PLAYLIST` 已存在（含去重逻辑），无需修改
- **生命周期绑定** → mounted 订阅 / beforeDestroy unsubscribe，无内存泄漏

### 测试结果
- `yarn lint` ✅（8 个错误均为预存在，本轮首次新增错误已修复）
  - **自修复**：首次 lint 触发 `Parsing error: The only valid meta property for new is new.target`（line 227:47），因变量名 `newSongs` 误用 `new` 关键字；改名为 `songs` 后通过
- `yarn build` ✅（DONE Build complete，dist 生成成功）

### 注意事项
- 5 秒去抖时间窗是经验值，若实测仍频繁请求可上调
- `/personal_fm` 接口格式若未来变化，需调整 `res.data.data` 解析路径
- 完整架构决策记录见 `ARCHITECTURE_DECISIONS.md` 第 15 条

### Git 建议
- **Commit 1 类型**：`feat`
- **Commit 1 message**：`feat: implement PersonalFM auto-refresh via pubsub (5s debounce)`
- **Commit 1 包含**：
  - `src/components/PersonalFM.vue`
- **Commit 1 不包含**：
  - `docs/`（独立 docs commit）

- **Commit 2 类型**：`docs`
- **Commit 2 message**：`docs: record FM auto-refresh architecture decision`
- **Commit 2 包含**：
  - `docs/ARCHITECTURE_DECISIONS.md`
  - `docs/PROJECT_CONTEXT.md`
  - `docs/CHANGELOG_AI.md`

---

### 2026-09-02 — OPT-5 清理死代码

### 修改内容
清理 5 项死代码 / 残留配置，每项都已 grep 确认无外部引用：

1. 删除 `src/utils/location.js`（已被 `areaCode.js` 取代）
2. 删除 `src/utils/config/icon.js`（早期 iconify 残留，整目录变空）
3. 删除 `src/components/layout/VoiceLayout.vue`（空壳组件，未被任何路由/页面引用）
4. 删除 `src/store/modules/Status.js`（仅占位 `showSearchPage: false`），并从 `src/store/index.js` 模块注册中移除 `StatusAbout`
5. 清理 `src/components/playTracksBtn.vue` 中 line 55-59 自定义 `nextTick` 方法（覆盖 Vue 内置、仅 console.log）+ 移除 line 53 注释的 `// ...mapActions(...)`

### 修改文件
- 删除 `src/utils/location.js`
- 删除 `src/utils/config/icon.js`（同时 `src/utils/config/` 目录变空，未来可一起删目录）
- 删除 `src/components/layout/VoiceLayout.vue`
- 删除 `src/store/modules/Status.js`
- 修改 `src/store/index.js`（移除 `StatusAbout` import 和注册）
- 修改 `src/components/playTracksBtn.vue`（删除 7 行死代码）
- 修改 `docs/PROJECT_CONTEXT.md`（同步清理：移除死代码在已知问题中的引用 +目录树）

### 修改原因
- 参考 `docs/优化.md` 中的 OPT-5 优化分析
- 每个文件都 grep 验证无引用 → 安全删除
- `playTracksBtn.vue` 自定义方法覆盖 Vue 内置 `nextTick`，是潜在踩坑点
- 同步 PROJECT_CONTEXT.md 避免后续 AI 重复识别这些"已知问题"

### 测试结果
- `yarn lint` ✅（错误数从 8 降至 7 — `VoiceLayout.vue` 的 `vue/valid-template-root` 错误随之消失，剩余 7 个均为预存在）
- `yarn build` ✅（DONE Build complete，dist 生成成功）

### 注意事项
- `src/utils/config/` 目录现在为空（仅删除子文件，未删父目录，避免 IDE 重启等副作用）
- 后续 OPT-3b / 其他清理任务时一并删除空目录
- `playTracksBtn.vue` 删除自定义 `nextTick` 后，未来如需真正的 next-tick 行为，可直接用 Vue 内置 `this.$nextTick(...)`

### Git 建议
- **Commit 类型**：`chore`（代码清理，不影响功能）
- **Commit message**：`chore: remove dead code (location, icon config, VoiceLayout, Status module, custom nextTick)`
- **包含文件**：
  - 上述 4 个删除（git rm）
  - `src/store/index.js`（修改）
  - `src/components/playTracksBtn.vue`（修改）
- **不包含文件**：
  - `docs/PROJECT_CONTEXT.md`（docs/AI 文档，独立 docs commit）

---

### 2026-09-02 — OPT-3 a11y 修复（图片 alt 文本）

### 修改内容
新增 `CoverImage` 组件统一封装 `<img>` 渲染，强制业务方提供有意义的 `alt` 文本，解决 30+ 处 `alt=""` 无障碍性问题。

### 修改文件
- 新增 `src/components/common/CoverImage.vue`
- 修改（Layout 组件 × 9）：
  - `src/components/layout/TracksLayout.vue`（3 个 img）
  - `src/components/layout/AlbumLayout.vue`（1 个 img）
  - `src/components/layout/ArtistLayout.vue`（1 个 img）
  - `src/components/layout/MvLayout.vue`（1 个 img）
  - `src/components/layout/VideoLayout.vue`（2 个 img）
  - `src/components/layout/MultimatchLayout.vue`（4 个 img）
  - `src/components/layout/UserDetailLayout.vue`（1 个 img）
  - `src/components/layout/CommentContentLayout.vue`（2 个 img）
  - `src/components/layout/VideoPlayerLayout.vue`（1 个 img）
- 修改（页面 × 4）：
  - `src/pages/AlbumDetail.vue`（1 个 img）
  - `src/pages/ListDetail.vue`（1 个 img）
  - `src/pages/artist/ArtistDetail.vue`（1 个 img）
  - `src/pages/artist/ArtistAllSongs.vue`（1 个 img）
  - `src/pages/search/UserRes.vue`（1 个 img）

合计 15 个文件，约 21 处替换。

### 修改原因
- 参考 `docs/优化.md` 中的 OPT-3 优化分析
- 项目中 `<img>` 普遍使用 `alt=""`，屏幕阅读器会跳过 → 无障碍性差
- 通过 `CoverImage` 组件统一封装，未来新组件天然有 alt
- 与 `BaseIcon` / `BaseLayout` 等"统一封装"风格一致

### 测试结果
- `yarn lint` ✅（剩余 8 个错误均为预存在、未触动文件：User.js / iconfont.js / VoiceLayout.vue / MusicPlayer.vue / PlayerCore.vue / Playlist.vue）
- `yarn build` ✅（DONE Build complete，dist 生成成功）
- ⚠️ 中途修复 1 个自引入的 lint 错误：MultimatchLayout.vue 模板替换时多余了一个 `}`，已立即修复

### 注意事项
- ⚠️ **本轮未覆盖**（defer 到 OPT-3b）：App.vue（logo/avatar）、PersonalFM.vue（coverLight mixin）、DoSearch.vue（热搜图标）、qrcodeLogin.vue（二维码）、SendComment.vue（评论头像）、PlayerCore.vue / MusicPlayer.vue（播放器封面 - `@load="onCoverLoad"` 用于 colorExtractor）
- 本轮覆盖 21 个 `<img>`，约还有 9 个 img 未处理
- CrossOrigin / ref / load 事件等 HTML 属性通过 `v-bind="$attrs"` 透传保留
- 播放器封面（MusicPlayer/PlayerCore）defer 原因：@load 事件被 colorExtractor 用于提取主色，CoverImage 已通过 emit 透传 load 事件，但需独立验证

### Git 建议
- **Commit 类型**：`feat`（新组件） + `refactor`（替换）
- **Commit 拆分**：建议 2 个独立 commit
  - Commit 1 (feat): 新增 CoverImage.vue
  - Commit 2 (refactor): 替换 14 个文件中的 `<img>`

---

### 2026-09-02 — 升级 AI 协作文档体系（增加开发流程）

### 修改内容
在原有 4 个文档基础上，建立完整的 AI 辅助开发工作流：
- 新增 `docs/DEVELOPMENT_WORKFLOW.md`（项目完整开发流程：AI 流程 / Git 规范 / 测试要求 / 发布）
- 更新 `docs/AI_RULES.md`：
  - 替换原"提交规范"为详细的"Git 提交规范"（含类型与范围表、docs 提交强约束）
  - 新增"AI 任务完成标准"小节（5 项必达条件）
- 更新 `docs/PROJECT_CONTEXT.md`：新增"# 开发流程"章节（说明 docs/ 文档体系、AI 协作 7 步、Git 摘要、测试要求）

### 修改文件
- 新增 `docs/DEVELOPMENT_WORKFLOW.md`
- 修改 `docs/AI_RULES.md`
- 修改 `docs/PROJECT_CONTEXT.md`

### 修改原因
- 原 4 文档缺少"开发流程"层，AI 任务执行步骤散落在 AI_RULES 中，不够系统
- Git 提交规范过于简单（仅 feat/fix/refactor/chore 4 种），缺少 `docs` / `style` / `test` 分类
- 缺少"AI 任务完成标准"的明确判定条件
- 缺少 `docs/` 文档体系的总览，新模型可能误以为只需读 PROJECT_CONTEXT

### 测试结果
- 未执行 `yarn lint` / `yarn build`（本次仅修改 Markdown 文档）
- 跨文档引用核验：
  - `PROJECT_CONTEXT.md` → 引用 `DEVELOPMENT_WORKFLOW.md` 第 1 / 2-5 / 6 节
  - `AI_RULES.md` → 引用 `DEVELOPMENT_WORKFLOW.md` 第 1 节 + 第 2-5 节
  - `DEVELOPMENT_WORKFLOW.md` → 引用 `AI_RULES.md` + `PROJECT_CONTEXT.md` + `ARCHITECTURE_DECISIONS.md`

### 注意事项
- 文档体系现为：5 个文件，按"必读 → 摘要 → 执行细节"分层
- `docs/DEVELOPMENT_WORKFLOW.md` 是**单一事实源**：Git / 测试 / 发布规则的完整定义都在该文件
- `AI_RULES.md` 的 Git 章节**引用而非复制** `DEVELOPMENT_WORKFLOW.md`，避免重复维护
- 本项目无 Hugo / Go / Vite 等，开发工作流未涉及这些（按需后续补充）
- `docs/*.md` 修改必须独立 `docs:` commit`（详见 DEVELOPMENT_WORKFLOW 第 3 节）

---

### 2026-09-02 — 建立 AI 协作上下文体系

### 修改内容
首次接管项目，扫描整个代码库，建立 4 个 AI 长期协作文件：
- `PROJECT_CONTEXT.md` — 项目知识库（技术栈 / 目录 / 核心模块 / 数据流 / 组件关系 / API / 已知问题）
- `AI_RULES.md` — AI 开发守则（Vue 规范 / 修改流程 / 禁止行为清单）
- `ARCHITECTURE_DECISIONS.md` — 14 条架构决策记录
- `CHANGELOG_AI.md` — 本文件，AI 修改流水

### 修改文件
- 新增 `docs/PROJECT_CONTEXT.md`
- 新增 `docs/AI_RULES.md`
- 新增 `docs/ARCHITECTURE_DECISIONS.md`
- 新增 `docs/CHANGELOG_AI.md`

### 修改原因
- 项目无既有 AI 协作上下文，每次新模型接手需重新扫描
- 现有 `AGENTS.md` 过于简略，无法承载项目复杂度的完整说明
- 播放器（PlayerCore.vue, 1300+ 行）属于"易破坏核心"，必须有强约束
- README.md 是历史开发日志，不适合作为 AI 协作上下文

### 测试结果
- 未执行 `yarn lint` / `yarn build`（本次仅新增 Markdown 文档，不涉及业务代码）
- 内容已对照源码核验：
  - $bus 事件表（grep 全量 emit/on）
  - pubsub 事件（'playAll' / 'getPersonalFM'，后者无订阅者，已记入已知问题）
  - Vuex 模块、路由表、mixin 路径
  - API 接口清单
  - localStorage 键名

### 注意事项
- 四个文件是**初始版本**，基于首次扫描，可能遗漏细节
- 项目中真实存在的"已知问题"已写入 `PROJECT_CONTEXT.md` 第 478-501 行
- AI 后续修改必须先读 `PROJECT_CONTEXT.md` + `ARCHITECTURE_DECISIONS.md` + `AI_RULES.md`
- 未做任何业务代码修改，严格遵守"现在不要修改业务代码"的指令

---

### YYYY-MM-DD — 模板示例

### 修改内容
（占位）

### 修改文件
- （占位）

### 修改原因
（占位）

### 测试结果
- （占位）

### 注意事项
（占位）

---

### 2026-10-20 — 扫码登录 502 的真实成因（nginx 缓冲区）与轮询错误可见化

### 修改内容
上线后扫码登录轮询持续 502 的排查结论 + 前端把网关错误从"静默吞掉"改为"连续失败即提示可重试"，并补齐 keep-alive 页面的轮询泄漏。

### 修改文件
- `src/components/userPage/qrcodeLogin.vue`
- `docs/CHANGELOG_AI.md`
- 线上（不在本仓库）：`/etc/nginx/sites-available/music` 的 `location /api/` 增加 `proxy_buffer_size 16k` 等三行

### 修改原因
线上 `music.archai.space` 间歇性 502，`/var/log/nginx/music.error.log` 全部是
`upstream sent too big header while reading response header from upstream`。
直接打后端 3000 端口量响应头：`/register/anonimous` 常态 454 字节、峰值 **4164 字节**，
内容是网易云 API 把 163 下发的整批设备 cookie（`MUSIC_A`、二十余条 `MUSIC_A_T`/`MUSIC_R_T`）原样透传，
超过 nginx 默认 4k 的 `proxy_buffer_size` → nginx 直接回 502。当日 990 请求 / 31 个 502，
分布 `register/anonimous` 26、`login/qr/check` 4、`login/cellphone` 1 —— 所以手机号登录、匿名登录同样会随机失败，
并非二维码本身的问题。

前端次生问题：`checkQR().catch(() => {})` 把错误全吞了，502 时界面永远停在"请使用 App 扫码"，
用户只看到控制台报错、页面像卡死；且组件在 `keep-alive` 内，离开页面不触发 `beforeDestroy`，
1s 一次的轮询会永久打接口。

### 测试结果
- `yarn lint`（单文件 ESLint）✅
- `yarn build` ✅（Node 22.22.2，13s）
- 线上验证 ✅
  - nginx reload 后 `register/anonimous` 连打 200 次：200 × 200，0 个 502，error.log 新增 too-big-header 0 条
  - 混合 300 次压测：255 × 200 + 30 × 406 + 15 × 509（406/509 是网易云侧对突发流量的限频，非本次问题）
  - 真实节奏（1 次/秒）轮询 30 次：全部 200；扫码 `qr/create` + 轮询串起来正常
  - 新产物已上线并核验：`/` 引用 `js/app.c9eabf8b.js`，产物内含"服务异常/点击重试""二维码未加载"文案，`/user` 路由 200

### 注意事项
- 回滚：nginx 配置备份在服务器 `/root/music.nginx.bak.20261020-183545`；静态站备份在 `/root/music.www.bak.20261020-183930`
- 不建议用 `proxy_hide_header Set-Cookie` 一把剥掉了事：`NMTID` 是扫码会话的连续性凭据，剥掉后 qr/create 与 qr/check 不再同源，二维码会变成"不存在或已过期"
- 若日后后端仍需下发大批 cookie，`proxy_buffer_size` 需同步调大，否则同样的 502 会以别的接口形式复现
- 轮询连续失败 3 次即停并提示，属于有意的降级：宁可让用户看到"重试"按钮，也不要静默空转

### 2026-10-20 — API 端点索引生成器 + 能力缺口分析

### 修改内容
把"要不要把 433 个端点的官方文档读进记忆"这个问题，落成可维护的产物：自动生成的端点索引 + 人工判断的缺口/优先级清单，替代"背文档"。

### 修改文件
- `scripts/gen-api-index.mjs`（新增）
- `docs/API_INDEX.md`（新增，自动生成，勿手改）
- `docs/API_GAPS.md`（新增）
- `docs/CHANGELOG_AI.md`

### 修改原因
后续要持续加功能，需要能快速回答三件事：这个能力有没有对应接口、参数是什么、本项目是否已封装。
官方文档站是 docsify + jsDelivr 拉 GitHub `main` 分支，正文随时变，且全文体量过大不适合常驻上下文；
生产服务器跑的是 v4.39.0，`/opt/api-enhanced/module/*.js`（端点+中文注释）与 `interface.d.ts`（参数表）
才是与实际行为一致的权威来源。因此改为"索引常驻 + 详情按需取"。

索引数据来源：服务器 `/opt/api-enhanced` 的 `module/*.js` + `interface.d.ts` + 本仓库 `src/api/*.js`（判断是否已封装）。

### 测试结果
- `node scripts/gen-api-index.mjs --pkg /tmp/apipkg` ✅
  - 识别 v4.39.0，端点 433，已封装 93（21%），有中文注释 372（86%），参数表缺失 0
  - 18 个分组全部归类，无「其他」兜底残留（首版曾把 98 个端点漏进「其他」，已逐段核对补全映射）
- `yarn lint` / `yarn build`：本次未改 `src/`，未重跑

### 注意事项
- `docs/API_INDEX.md` 是生成物，改分类逻辑请改 `scripts/gen-api-index.mjs` 的 `GROUP_OF` / `GROUP_ORDER`，不要手改 md
- API 版本升级后需重新生成，索引表头会记录版本号，便于发现漂移
- 官方 d.ts 把大量必填参数标成了 `?`（历史遗留），参数列只能作参考，写代码前以文档页或 `module/*.js` 为准

### 2026-10-21 — P0 五项落地：逐字歌词、下载、版权判断、音质门控、收藏计数

### 修改内容
按 `docs/API_GAPS.md` 的 P0 清单落地五项（首页聚合经实测不可行，暂缓并记录原因）。

### 修改文件
- `src/utils/lyric.js`（新增，纯函数解析器）
- `src/api/Tracks.js`（新增 `lyricNew` / `checkMusic` / `downloadUrlV1`）
- `src/api/User.js`（新增 `subcount` / `vipInfo`）
- `src/config.js`（新增 `player.vipOnlyLevels`）
- `src/config/icon.js`（新增 `download` 内联 SVG 图标）
- `src/components/musicPlayer/MusicPlayer.vue`（歌词渲染 + 下载按钮）
- `src/components/musicPlayer/PlayerCore.vue`（VIP 权益 + 取流失败原因）
- `src/components/musicPlayer/QualityMenu.vue`（VIP 标记与拦截）
- `src/components/layout/UserDetailLayout.vue`（收藏计数）
- `docs/API_GAPS.md`、`docs/CHANGELOG_AI.md`

### 修改原因
1. **逐字歌词**：`/lyric` 只有整行时间轴。`/lyric/new` 的 `yrc` 带逐字时间。
   实测发现同一接口返回三种行格式混排（标准 LRC / 富文本 JSON 行 / yrc 逐字行），且大量老歌没有 yrc，
   所以解析器写成三格式兼容 + 逐字优先 + lrc 退化 + 旧接口兜底四层。
2. **音质门控**：非会员选无损必然走降级链，抖动且费时。`/vip/info` 的 `associator.vipCode`
   才是判定依据；拉取失败记为 -1（未知）不做门控，避免把真会员误拦。
3. **版权判断**：取流全失败时原来用 `song/detail` 的 `fee` 字段猜原因，`/check/music` 能直接给出
   "亲爱的,暂无版权"，更准。只在失败路径调用，不影响正常播放耗时。
4. **收藏计数 / 下载**：补上主页与播放器缺失的两处能力。
5. **首页聚合暂缓**：游客侧 `/homepage/block/page` 仅 3 个 block（无 banner），`/homepage/dragon/ball` 返回空数组，
   替换现有首页等于重做版式，单独立项。

顺带修掉歌词高亮的老 bug：原 `needUpdate` 取的是"下一行"，导致高亮永远提前一行、逐字进度无法对齐。

### 测试结果
- `yarn lint`（单文件 ESLint，10 个文件）✅ 0 错误
- `yarn build` ✅（app.e39bfd6f.js / app.4af86632.css）
- 解析器真机数据测试 ✅（未提交的临时脚本，跑完即删）
  - 33894312（有 yrc）：49 行，逐字 47 行，`t=13.93s → 行 2 / 字 4` 与手工计算一致
  - 2058263032（有 tlyric）：64 行，翻译挂载 50 行
  - 347230（纯 lrc）/ 186016（富文本 JSON 行）：均正确解析，时间单调递增
  - 旧 `/lyric` 兜底：49 行正常
- 线上部署复核 ✅：`/` 引用 `js/app.e39bfd6f.js`，产物含"下载歌曲需要登录/需要黑胶VIP/创建歌单/收藏歌单"文案，
  CSS 含 `lyricWord`，`/` 与 `/user` 均 200

### 注意事项
- `/lyric/new` 并非所有歌都有 yrc，实测 4/7 有逐字；没有时自动退化逐行，不是缺陷
- 逐字高亮精度受 `tUpdate` 事件频率限制（约 4Hz），逐字偏快时观感略跳，后续可用 rAF 平滑
- 下载走 `/song/download/url/v1`，未登录返回 `code:-110`；跨域 URL 的 `download` 属性无效，浏览器可能直接打开而非落盘
- 回滚：静态站备份 `/root/music.www.bak.20261021-111946`

### 2026-10-21 — 修掉 https 页面的混合内容（地址栏"不安全"）

### 修改内容
消除 https 页面里的 http 子资源：nginx 下发 `upgrade-insecure-requests`，前端把网易云图片/音频地址在源头升级为 https。

### 修改文件
- `src/utils/filters.js`（新增 `toHttpsUrl`，`imgParam` 复用它）
- `src/main.js`（注册全局过滤器 `https`）
- `src/utils/normalize.js`（`coverOf` 返回值统一升级）
- `src/components/common/CoverImage.vue`（computed `realSrc` 统一升级）
- `src/App.vue`、`src/components/DoSearch.vue`、`src/components/SendComment.vue`、
  `src/components/layout/VideoPlayerLayout.vue`、`src/pages/HomePage.vue`、
  `src/pages/explorePage/LeaderBoard/LeaderBoard.vue`（裸 `:src` 绑定补 `| https`）
- 线上（不在本仓库）：`/etc/nginx/sites-available/music` 加
  `add_header Content-Security-Policy "upgrade-insecure-requests" always;`

### 修改原因
地址栏出现"不安全 / 与此站点的连接并非完全安全，攻击者可能会看到你在此站点上浏览的图像"，不是证书问题，
是 **Mixed Content（被动混合内容）**：页面是 https，但子资源是 http。

实测来源：网易云接口大量字段原样返回 http 地址，且不止图片——
- 图片：`toplist/detail`、`playlist/detail` 的 `coverImgUrl` 形如 `http://p1.music.126.net/...`
- 音频：`/song/url/v1` 返回 `http://m702.music.126.net/...`，`<audio>.src` 直接用它

原先只有 `imgParam` 过滤器做了协议升级，但 25 处裸 `:src` 绑定（如首页排行榜 `:src="l.coverImgUrl"`）绕过了它。

修复分两层：
1. 源头：所有经过 `CoverImage`、`normalize`、`imgParam` 的图片，以及 6 处裸绑定，统一 `http → https`
   （按 `music.126.net` / `netease.com` 白名单升级，其他域名原样返回，避免把不支持 https 的图升坏）
2. 兜底：nginx 下发 `upgrade-insecure-requests`，浏览器把所有遗漏的 http 子资源自动升级（含 CSS 内联背景、音频）

升级可行性先验证过再动手：图片 CDN 与音频 CDN 的 https 均可用（图片 200、音频 Range 请求 206 且返回真实字节）。

### 测试结果
- `yarn lint`（10 个文件）✅ 0 错误
- `yarn build` ✅（app.74d0cb10.js / app.5f13d169.css）
- 线上复核 ✅
  - `curl -I /` 与 `/user` 均返回 `Content-Security-Policy: upgrade-insecure-requests`
  - 产物内含全局 `https` 过滤器，js/css 均 200
  - 图片 CDN `https://p1.music.126.net/...` = 200；音频 `https://m702.music.126.net/...` Range = 206/1024B

### 注意事项
- 该警告与本次 P0 改动无关，是历史遗留（首页排行榜封面一直是裸 `:src`），本次一并修掉
- 若有新接口返回新的 CDN 域名，`toHttpsUrl` 的白名单需要同步加，否则只靠 CSP 兜底
- 回滚：nginx 配置备份 `/root/music.nginx.bak.20261020-183545`，静态站 `/root/music.www.bak.20261021-112901`
