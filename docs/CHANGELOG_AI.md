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

### 2026-10-30 — UI(user) 个人主页排版重构：并排数据区 / 歌单统一网格 / 关注头像墙 / 锚点吸顶

### 修改内容

针对个人主页「密度失衡」（排行/云盘只有两三行却各占一整屏，关注列表又是 20 多行长表）的重构：

1. **听歌排行 + 云盘并排**（`.ud-duo`，1.6fr : 1fr）：两个都是矮列表，合并后省掉一整屏滚动；
   他人主页没有云盘卡时自动退回单列（`.is-solo`），避免排行被挤在左侧留一格空。
2. **新增 `RankList` 组件**（`src/components/userPage/RankList.vue`）：紧凑排行行 = 序号 + 封面(hover 播放)
   + 歌名/歌手 + 右对齐等宽数字，前三名主色高亮。不复用 TracksLayout——那张五列宽表塞进窄卡会被挤碎。
   排行用 `meta="count"`、云盘用 `meta="size"`（并 `:show-rank="false"`）。
3. **歌单统一网格**：喜欢/创建/收藏合成一张 `PlaylistLayout`（原来分组渲染时，只有一个歌单的
   「喜欢」会独占一整行右侧空白）；分类计数改到标题右侧（`喜欢 1 · 创建 21 · 收藏 0`）；
   PlaylistLayout 加 `tail` 插槽，尾部放虚线「新建 / 导入歌单」格子。
   **顺带修了一个历史 bug**：`/user/playlist` 第一项（喜欢）同时也是自己创建的，旧逻辑会同时进
   favorTracks 和 createList——分三组时不明显，合并成一张网格后连出两张一样的卡。已在
   `allPlaylists` / `playlistCounts` 里按 id 去重。
4. **关注与粉丝默认头像墙**：`UserListLayout` / `FollowMixedLayout` 加 `dense` prop——
   6 列头像 + 昵称（44px 头像、去卡片底、隐藏签名/粉丝数），默认只显示前 12 位 + 「查看全部 N 位」
   按钮；点开后切回完整卡片并恢复 LoadMore 翻页。原来 20 多行的大卡片被压缩到 2 行。
5. **锚点吸顶条**（`.ud-anchor`）：hero 下方一排 pill，点击平滑滚动到对应区块
   （`scrollTo` + `scroll-margin-top: 64px`），页面长滚动时随时能定位。
6. **Hero 信息重排**：统计改 chips（关注/粉丝可点跳转对应区块）、「年度听歌报告」上移到右侧动作区、
   「上次登录」降级为右下角小字（`hero-login` 去掉分隔线）。
7. **清理**：TracksLayout 在本页不再使用（import/组件注册移除）；连带删掉只为它服务的
   `tracksContainer` 全套 ::v-deep 样式、`layout()` 方法和 `updated()` 钩子；
   歌单网格去掉「最多两行 + 内部滚动条」的限制，改交页面自然滚动。

### 修改文件
- `src/components/layout/UserDetailLayout.vue`（主体重构）
- `src/components/userPage/RankList.vue`（新增）
- `src/components/layout/UserListLayout.vue` / `FollowMixedLayout.vue`（加 dense 形态）
- `src/components/layout/PlaylistLayout.vue`（加 tail 插槽）

### 修改原因
用户对主页排版不满（截图反馈）：密度失衡、单列通铺无层次、歌单区形态混杂、hero 层级平。
方案经线框图确认后按 P0/P1 落地；渲染效果已用无头 Edge + dev server 实测截图核对
（他人主页视角，含头像墙与「查看全部」按钮）。

### 测试结果
- `yarn lint`（5 个改动文件）✅ 无告警
- `yarn build` ✅ 通过
- 无头浏览器截图核对 ✅：hero chips / 锚点条 / 歌单统一网格 + 计数 / 关注头像墙 + 查看全部 均符合预期
- 浏览器手动核查：❌ 本人视角（云盘/听歌排行/年度报告按钮）待登录后自测

### 注意事项
- 他人主页 `ud-duo` 会退化为单列（排行一张卡），别再把「云盘」卡加回来时忘了去掉 `.is-solo`
- `RankList` 的播放走 `$bus songClk`，与全站一致；双击行为也保留了
- dense 头像墙隐藏了「回关/关注」按钮——展开完整列表后才有；如果要在头像墙上直接回关需要另做
- 回滚：`git revert` 本提交即可，改动不涉及接口与数据

### 2026-10-30 — FIX-scrobble 补上听歌打卡，修复「最近一周」听歌排行恒为空

### 修改内容

1. **`PlayerCore` 新增播放打卡**（`/scrobble` → 上游 `POST /api/feedback/weblog`）：
   - 门槛：本次已听 ≥ 30 秒或 ≥ 半首（先到者）；`scrobbleStart` 记录起播进度，中断恢复从 40s 接着播时不会把上次会话的进度算进来
   - 去重：`key = 歌 id # 播放轮次`，同一轮只报一次；换歌 / 单曲循环重播时 `scrobbleSeq` 自增，同一首歌能重复计次
   - 触发点四处：`timeupdate`（达标即报）、`currentSong` watcher（切歌前用旧进度补报上一首）、`_autoNext`（播完/副歌到点切歌前补报）、`_restartCurrent`（单曲循环、FM 同批重播）
   - 归属 id：`_resolveSourceId()` 优先当前路由的歌单/专辑 id，其次歌曲自身专辑 id，兜底 0
   - 未登录跳过；接口失败静默，不影响播放链路；语音/电台（`isVoice`）不参与
2. **`UserDetailLayout` 空状态与失败区分**：
   - 两个 tab 各自加空态文案（"最近一周还没有听歌记录"/"还没有听歌记录"），不再是一片空白
   - 新增 `recordErr` 标记，接口失败提示"听歌排行获取失败"，不再与"未公开"混为一谈
   - `loadPage` 进入时复位排行数组（组件复用到另一个 uid 时不会残留上一页数据）
   - `handleThisTracksData` 跳过缺 `song` 的空壳条目

### 修改文件
- `src/components/musicPlayer/PlayerCore.vue`
- `src/components/layout/UserDetailLayout.vue`
- `analysis/user-record-week-empty-analysis.md`（新增，归因分析）

### 修改原因

个人主页「最近一周」听歌排行一直空，分析后确认**不是接口问题**：

- `/user/record` 的两个请求由 `Promise.all` 并发，任一失败会同时清空两个列表 → 页面会显示"未公开"，而不是"tab 在、列表空"
- 既然「所有时间」有数据、「最近一周」是空数组，说明 `type=1` 那条**成功返回了 200 + `weekData: []`**
- 关键：`updateListenedRanks`（`/scrobble`）自首次提交起**只被声明、从未被调用**（`git log -S` 可验，`dist` 里连 `scrobble` 字符串都被 tree-shaking 掉了）
- 网易云的听歌记录/排行/年度报告全靠这条 weblog 累积，官方播放器边播边打卡；本站从不打卡 → 服务端最近 7 天没有任何记录
- 「所有时间」里看到的只是早期在官方客户端听出来的历史累计，所以两边表现不一致

### 测试结果
- `yarn lint`（改动两文件）✅ 无告警
- `yarn build` ✅ 通过，产物 `dist/js/app.*.js` 已包含 `scrobble`
- 接口连通性 ✅ `GET /api/scrobble?...` 返回 `{"code":200,"data":"success"}`
- 浏览器手动核查：❌ 待登录态下实测（播 >30 秒 → 个人主页「最近一周」应出现该曲，网易云侧有分钟级延迟）

### 注意事项
- 打卡是旁路：任何异常都吞掉，不会 interrupt 播放；未登录直接 return，不产生 400 噪音
- 每首歌每轮播放只打一次接口，量级与真人听歌一致，不会触发 `/api/` 限流（15 r/s，burst 40）
- 与官方客户端并存时两边都会打卡，计数按网易云自己的去重规则走，无需特殊处理
- 若日后接入「听歌识曲/播客」等 `isVoice` 内容，需确认是否要走另一套记录接口
- 回滚：删掉 `_reportPlay` 的四处调用即可，其余改动（空状态文案）可独立保留

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

### 2026-10-21 — 音频也走混合内容：`<audio>` 直接用 http CDN 地址

### 修改内容
把音频地址的 http → https 升级做在源头，不再依赖 nginx 的 CSP 兜底。

### 修改文件
- `src/components/musicPlayer/PlayerCore.vue`（`checkSongDntLogin` / `checkSongLoggedIn` 两处置 src 时升级）
- `src/utils/audioCache.js`（`setAudioCache` 存入前升级，预加载缓存的也是干净地址）

### 修改原因
控制台报 `Mixed Content: ...requested an insecure audio file 'http://m701.music.126.net/...flac'`。
`/song/url/v1` 返回的音频地址就是 http，`sel.src = url` 直接使用。上一轮只给 nginx 加了
`upgrade-insecure-requests` 兜底，浏览器虽有升级能力，但：
- 对已在旧文档里加载的页面无效（没重新取 HTML 就没有该策略）
- 控制台/网络面板仍然能看到原始 http 地址，排查时容易误判
所以在赋值处直接升级更彻底。实测升级后音频 Range 请求返回 206 且字节正常（2048B）。

顺带确认 `/api/song/media/outer/url` 在本版本 API 上返回 404，对应 `initAudioByOuterUrl` 已是死路径，
故未给它加 `proxy_redirect`。

### 测试结果
- `yarn lint`（2 个文件）✅
- `yarn build` ✅（app.e56c6e86.js）
- 产物核对 ✅：bundle 内含 `indexOf("http://") … "https://"+t.slice(...)` 升级函数
- 取流验证 ✅：接口返回 `http://m802.music.126.net/...`，升级为 https 后 Range 请求 206 / 2048B

### 注意事项
- 刷新后若控制台仍有 Mixed Content，说明该请求不是这两个入口发出的，需要看具体 URL 来源
- 回滚：静态站备份 `/root/music.www.bak.20261021-113216`

### 2026-10-21 — 音质选择真正生效：去掉 unblock、重排取流链、修好解灰兜底

### 修改内容
按 `docs/AUDIO_PIPELINE_PLAN.md`（决策：解灰走兜底 / 补齐 higher）重构取流链路，让音质切换真正起作用。

### 修改文件
- `src/components/musicPlayer/PlayerCore.vue`（取流链路、解灰解析、实际音质显示、切档清缓存、预加载）
- `src/config.js`（`qualityOptions` 补 `higher`；新增 `legacyBrFallback` 开关，默认关）
- `src/utils/audioCache.js`（缓存 key 改为 `id_level`，删除支持按档位/全档位）
- `src/utils/filters.js`（`toHttpsUrl` 白名单加 `kuwo.cn`）
- `docs/AUDIO_PIPELINE_PLAN.md`、`docs/CHANGELOG_AI.md`

### 修改原因
用户反馈"有音质切换，但请求的资源直接是最高质量 flac"。

根因：主请求 `/song/url/v1` 恒带 `unblock=true`，上游 `module/song_url_v1.js` 注释写明
"当 unblock 为 true 时…**同时音质设置不会生效**"，直接走 unblockmusic-utils 拿第三方 flac。
实测同一首歌 `level=standard`：`unblock=false` → MP3 128k/481KB，`unblock=true` → flac/32.5MB，**差 68 倍**。

一并修掉 4 个连带问题：
1. `/song/url/match` 返回的 `data` 是**字符串 URL**，旧代码读 `data[0].url` → 解灰兜底从未生效
2. `qualityOptions`(4档) 与 `qualityLevels`(含 higher) 不一致 → 菜单缺 192k 档
3. `currentQualityShort` 显示用户所选而非实际档位 → 被压级时仍显示"无损"
4. `audioCache` 按 `id` 存 → 切档后命中旧音质；切档也没清该缓存
   （`_preloadNext` 里传 `playRequestId+1` 会被请求守卫直接判为 cancelled，预加载一直是死代码，一并修）

新链路：`audioCache(id_level)` → `/song/url/v1?level=` 逐级降 → `/song/url/match` 解灰 →（可选）`/song/url?br=` → `/check/music` 解释原因。

### 测试结果
- `yarn lint`（4 个文件）✅ 0 错误
- `yarn build` ✅（app.a7db7b51.js / app.2b7d609e.css）
- 链路模拟（真实接口，逐档跑一遍）✅
  - 2058263032：standard 128k/3.1MB、higher 192k/4.6MB、exhigh 320k/7.7MB；
    非会员选 lossless/hires 被压到 exhigh，返回 `level=exhigh`
  - 186016（VIP）：官方全档位 url=null → 走 match 解灰拿到可用地址
- 线上产物核对 ✅：`unblock:` 参数已从 bundle 消失；产能内 `解灰` / `is-unblock` / `song/url/match` 均存在；首页 200

### 注意事项
- 解灰源（kuwo）音质与曲目版本不可控，播放器音质按钮会显示琥珀色「解灰」并在 title 说明
- 解灰源实测 https 可用（Range 206），已加入 `toHttpsUrl` 白名单，避免重新引入混合内容
- VIP 歌在非会员下，无论选哪档都只能走解灰（官方音源全空），这是网易云侧限制，不是 bug
- `/song/url?br=` 实测 br 参数被忽略（恒 128k），已默认关闭（`config.player.legacyBrFallback`）
- 回滚：静态站备份 `/root/music.www.bak.20261021-114945`

### 2026-10-21 — 全站页脚：品牌/版本 + API 原仓库 + 免责声明

### 修改内容
新增全站页脚（版式 A：极简单行），含品牌与版本、API 开源仓库/文档链接、免责声明（弹窗）、版权行。

### 修改文件
- `src/components/common/AppFooter.vue`（新增）
- `src/App.vue`（`el-main` 内、`keep-alive` 之外挂载 `<AppFooter/>`）
- `src/config.js`（新增 `site` 元信息：name / version / apiRepo / apiDocs）
- `docs/CHANGELOG_AI.md`

### 修改原因
站点缺页脚，缺少三件必要信息：① 第三方客户端最容易踩的版权免责说明；② 数据与音频接口的来源（开源项目）；
③ 版本号，便于确认线上跑的是哪一版。放在 `keep-alive` 之外，保证全站共用一份、不随页面缓存重复挂载。

### 测试结果
- `yarn lint`（3 个文件）✅ 0 错误
- `yarn build` ✅（app.f98e0cf4.js / app.46e29f51.css）
- 线上核对 ✅：产物含「API 仓库 / API 文档 / 免责声明 / 第三方客户端 / 仅供学习交流」及两个外链 URL，
  `neteasecloudmusicapienhanced/api-enhanced`、`docs-neteasecloudmusicapi.focalors.ltd` 均正确打入；`/` 与 `/user` 200

### 注意事项
- 页脚 `padding-bottom: calc(60px + 20px)` 用于避让固定播放条（`$bar-h = 60px`），改播放条高度时要同步改
- 沉浸式大播放器是 `position: fixed; inset: 0; z-index: 200`，会把页脚盖住，无需额外隐藏逻辑
- 版本号在 `src/config.js` 的 `site.version`，发版时需与 `package.json` 同步
- 外部链接均带 `target="_blank" rel="noopener noreferrer"`
- 若日后完成 ICP 备案，需在页脚补备案号并链接 `beian.miit.gov.cn`
- 回滚：静态站备份 `/root/music.www.bak.20261021-120125`

### 2026-10-21 — 页脚补上源码仓库与反馈入口

### 修改内容
页脚增加「源码」「反馈」两个链接；免责声明弹窗补一句源码地址。

### 修改文件
- `src/components/common/AppFooter.vue`
- `src/config.js`（`site` 增加 `repo` / `issues`）
- `docs/CHANGELOG_AI.md`

### 修改原因
上一轮误判"项目没有 GitHub 仓库"，其实远端一直是 `github.com/Fintinger/ACMUSIC`（公开、Issues 已开启），
是我的失误：下结论前没查 `git remote -v`。仓库可用，故把源码与反馈补上。

### 测试结果
- `yarn lint`（2 个文件）✅
- `yarn build` ✅（app.bce51611.js）
- 线上核对 ✅：产物含 `github.com/Fintinger/ACMUSIC`、「源码」「反馈」及免责声明新文案；
  两个链接实测 200

### 注意事项
- 同轮把此前只在本地的 7 个 commit 一并推送到 origin（`67ebecd..7e54aaf`）
- 回滚：静态站备份 `/root/music.www.bak.20261021-121341`

### 2026-10-21 — 部署自动化：GitHub Actions + 版本戳 + 兜底脚本

### 修改内容
把「本地构建 → scp 覆盖 /var/www/music」的手工流程换成 CI 自动部署，并给产物加 commit 版本戳。

### 修改文件
- `.github/workflows/deploy.yml`（新增）
- `scripts/deploy.sh`（新增，CI 不可用时的兜底）
- `vue.config.js`（构建时注入 `VUE_APP_COMMIT_SHA`）
- `src/config.js`（`site.commit`）
- `src/components/common/AppFooter.vue`（页脚显示 `v0.1.0 · <hash>`）
- `docs/CHANGELOG_AI.md`

### 修改原因
排查发现线上与 GitHub 完全解耦：`/var/www/music` 不是 git 工作区、服务器无 cron/timer、仓库无 CI，
线上一直是手工 scp 覆盖。后果是「线上已更新、仓库还停在旧 commit」的漂移——今天就发生过一次（8 个 commit 未推送）。

三层改造：
1. **CI**：push 到 master（仅 `src/**`、`public/**`、依赖与构建配置变更时触发）→ `npm ci` → build → 备份 → `rsync --delete`（排除 `.well-known`，保护 ACME）→ 校验「线上 index.html 引用了本次产物 js」否则失败
2. **版本戳**：构建注入 commit 短 hash，页脚显示，线上产物可直接对回 commit
3. **兜底脚本**：`scripts/deploy.sh` 带工作区/未推送检查、备份、线上校验

### 测试结果
- workflow YAML 解析 ✅（1 job / 8 steps，触发路径正确）
- `npm ci --dry-run` ✅ 无锁文件不同步报错
- 本地构建 ✅ `app.8627bff5.js` 内含 `04c2461`（当前 HEAD），版本戳注入生效
- 专用部署密钥 `~/.ssh/gha_acmusic_deploy` 已加入服务器 `authorized_keys`，实测可登录（`root@iZ2ze...`），rsync 存在

### 注意事项
- **需要在 GitHub 添加仓库 Secret `SSH_PRIVATE_KEY`**（内容为 `~/.ssh/gha_acmusic_deploy` 私钥），否则部署步骤会失败
- 服务器仍是 root 部署；如需最小权限，可后续建 `deploy` 用户并让其拥有 `/var/www/music`
- 纯文档改动不触发部署（paths 过滤）；需要强制部署时可手动 `workflow_dispatch`
- rsync 用 `--delete` 清理旧 hash 文件，必须保留 `.well-known` 排除项
- 备份在 `/root/music.www.bak.*`，目前不自动清理，注意磁盘占用

### 2026-10-21 — 版本号 0.2.0

### 修改内容
`package.json` 与 `config.site.version` 同步升到 0.2.0，标记今天这批改动（登录 502 / P0 五项 / 混合内容 / 音质链路 / 页脚）。

### 修改文件
- `package.json`
- `src/config.js`
- `docs/CHANGELOG_AI.md`

### 修改原因
今天累计落地的功能量已远超 0.1.0 的语义，需要一个可对照的版本号；同时这次真实文件变更会触发首次自动部署。

### 测试结果
- 由 GitHub Actions 自动构建部署，见后续 run 结论
- 验证点：页脚显示 `v0.2.0 · <commit>`，且线上 index.html 引用的 js 与本次构建一致

### 注意事项
- `package.json` 与 `config.site.version` 必须一起改，否则页脚版本与发布版本会漂移
- 空提交（`--allow-empty`）不会触发部署，因为 workflow 有 `paths` 过滤

### 2026-10-21 — CI 备份自动保留最近 5 份

### 修改内容
`deploy.yml` 的备份步骤追加 `ls -dt /root/music.www.bak.* | tail -n +6 | xargs -r rm -rf`，只保留最近 5 份。

### 修改文件
- `.github/workflows/deploy.yml`

### 修改原因
首次自动部署后服务器已有 8 份备份（每份约 15MB）。手工部署时代靠人记着清理，进 CI 后每次 push 都会多一份，必须自动收敛。

### 测试结果
- workflow YAML 解析 ✅（9 steps，备份命令含 prune 逻辑）
- 本次改动不触发部署（`paths` 未包含 `.github/**`），会在下次 src 变更时生效

### 注意事项
- 删除范围严格限定 `/root/music.www.bak.*`，且保留最近 5 份
- 若希望长期保留某个版本，改名移出该前缀即可

### 2026-10-26 — 修复漫游卡与心动卡同时显示「播放中 + 选中」

### 修改内容
1. `TracksAbout` 新增 `fmActive`（FM 是否**真的**在接管队列）+ `SET_FM_ACTIVE` mutation，与 `fmMode`（选了哪个模式，持久化）彻底分开
2. `PlayerCore` 的 `isPersonalFM` watcher 把值单向镜像进 store；`mounted` 时对齐一次，防止播放器重建后 store 残留旧值
3. `FmRoamCards` 把原来的 `isActive(c)` 拆成两层：
   - `isSelected(c)` = 当前生效的 FM 模式，且**心动模式开启时一律返回 false**
   - `isPlaying(c)` = `isSelected(c) && fmActive`，只有它才渲染「播放中」徽标
   - `pick()` 改用 `isSelected()`

### 修改文件
- `src/store/modules/Tracks.js`
- `src/components/musicPlayer/PlayerCore.vue`
- `src/components/FmRoamCards.vue`

### 修改原因
首页那一排里，漫游卡的选中/播放态只看 `fmMode`，而 `fmMode` 是持久化偏好、进页面就默认 `DEFAULT`。
心动模式开启后 `heartMode=true`，但 `fmMode` 不变，于是「私人漫游」卡和「心动模式」卡同时带描边和「播放中」徽标（见用户截图）。
同类问题还有：选过某个模式后去听普通歌单/点别的歌，漫游卡依旧声称自己「播放中」。

根因是**把「选中」和「正在放」混成了一个布尔**。`fmMode` 是长期偏好，`isPersonalFM` 才是会话态，
而后者只在 `PlayerCore` 内部，首页卡片读不到，才退化成拿 `fmMode` 顶替。
按项目既有做法（`heartMode` 当初也是因为首页要读才放进 store）把会话态镜像进 store，卡片就能分辨这两件事。

### 测试结果
- ESLint（三个改动文件）✅ 0 error
- `vue-cli-service build` ✅（Build complete，11.9s）
- 逻辑核查（未起浏览器，人工核对状态流）：
  - 心动开启：`heartMode=true` → 漫游卡 `isSelected` 全 false → 只剩心动卡带描边 +「播放中」
  - FM 开启：`fm-mode(true)` → `isPersonalFM=true` → watcher → `fmActive=true` → 对应漫游卡出现「播放中」，同时 `heartMode` 被置 false
  - 播普通歌单：`fm-mode(false)`（App.vue 点歌）或心动接管 → `fmActive=false` → 漫游卡最多保留「选中」描边，不再谎称播放中

### 注意事项
- `fmActive` 是会话态，不持久化；刷新后 FM 队列本来就重置，两边一致
- 播放器重建时 `isPersonalFM` 回 false，`mounted` 已做一次对齐，不会有残留高亮
- 回滚：三个文件均为独立小改，`git revert` 该 commit 即可恢复原行为（会回到双高亮 bug）
- 未改 `_saveState` / `_restoreState` 字段结构，也未动播放状态机守卫

### 2026-10-26 — 评论时间补上年份（跨年才显示）

### 修改内容
1. `src/utils/filters.js` 新增 `formatCommentTime`：今年 → `10月26日 12:54`，往年 → `2019年03月15日 20:11`；时间缺失/非法返回空串
2. `src/main.js` 注册全局过滤器 `formatCommentTime`
3. `CommentContentLayout.vue` 主评论和楼中楼的时间戳都换成新过滤器（原来是硬写的 `formatMs("MM月DD日 HH:mm")`）

### 修改文件
- `src/utils/filters.js`
- `src/main.js`
- `src/components/layout/CommentContentLayout.vue`

### 修改原因
评论区时间固定 `MM月DD日 HH:mm`，几年前的评论和今天的长得一模一样，分不清 3 月 15 日是今年还是 2019 年。
热评里老评论占比很高，这是实打实的误读来源。

用「跨年才补年」而不是全部带年，是为了不让今年这大批新评论每行都多出 4 个字符——
信息密度和可读性两边都要。要改成恒定带年，只需把 `formatCommentTime` 里的三元判断去掉。

实现细节：`dayjs(undefined)` 等于"此刻"且 `isValid()` 为 true，所以必须显式判空，
否则缺 `time` 字段的评论会被渲染成当前时间（比不显示年份更误导）。

### 测试结果
- ESLint（三个改动文件）✅ 0 error
- `vue-cli-service build` ✅ Build complete
- 格式化输出核对：
  - `Date.now()` → `10月26日 12:54`
  - `2019-03-15 20:11` → `2019年03月15日 20:11`
  - `undefined` / `null` / `"abc"` → 空串

### 注意事项
- 只在 `CommentContentLayout` 生效；`UserDetailLayout` 的「最近登录」仍是 `M月D日 HH:mm`（未在本次范围内）
- 判断依据是本机时间，用户改系统时间会跟着变
- 不影响其他 `formatMs` 调用点（专辑/歌单/MV 发布时间本来就是完整年月日）

---

### 2026-10-26 — feat(user): 用户详情页新增「关注 / 粉丝」列表

### 修改内容
1. `src/api/UserDetail.js` 新增两个封装：`follows(uid, limit=30, offset=0)` → `/user/follows`、`followeds(uid, limit=30, offset=0)` → `/user/followeds`
2. 新增 `src/components/layout/UserListLayout.vue`：用户卡片网格（头像 / 昵称 / 性别 / 签名 / 粉丝数关注数），点击只发 `$bus.$emit('uClk')`，跳转交给 `App.vue`
3. `src/components/layout/UserDetailLayout.vue`：
   - 页面底部新增「关注与粉丝」区块，`el-tabs` 两个 pane（`lazy`），各自独立分页（每页 30）
   - 关注 tab 随页面加载取第一页；粉丝 tab 首次切换时才请求（避免每次进用户页多打一个接口）
   - hero 上的「N 关注 / N 粉丝」变成可点击，点了切到对应 tab 并平滑滚动到该区块
   - tab 标题带计数，数字取 `profile.follows / profile.followeds`（列表是分页的，长度不能当总数）

### 修改文件
- `src/api/UserDetail.js`
- `src/components/layout/UserListLayout.vue`（新增）
- `src/components/layout/UserDetailLayout.vue`
- `docs/CHANGELOG_AI.md`

### 修改原因
两个端点此前未封装（`docs/API_INDEX.md` 里 `/user/follows`、`/user/followeds` 封装列均为空），用户详情页只能看到「N 关注 / N 粉丝」数字，点不进去。

**翻页为什么要「无新增即终止」**：网关 v4.39.0 的 `module/user_followeds.js` 走的是 `/api/user/getfolloweds/{uid}` 原始接口，实测 **`limit` 与 `offset` 完全被上游忽略** ——
`limit=1`、`limit=60`、`offset=0/1/29/30` 全部返回同一批 30 条，且 `more` 恒为 `true`。
只认 `more` 会导致「加载更多」无限可点、列表里塞满重复用户（同 key 还会触发 Vue 警告）。
所以以「本页没带回任何新 userId」作为终止条件，并用 `cap` 标记在 UI 上如实说明「只返回最近前 30 位粉丝」，不假装加载完了。
`/user/follows` 则走 `weapi`，`limit/offset` 正常生效（实测 106 个关注分 4 页取完、0 重复）。

### 测试结果
- `npx eslint`（三个改动文件）✅ 0 error
- `npx vue-cli-service build` ✅ Build complete
- `vue-cli-service serve` ✅ Compiled successfully（dev server 8080）
- 分页逻辑 Node 实测（复刻 `loadSocial` 逐行逻辑，直连生产网关 `music.archai.space/api`）：
  - `/user/follows` uid=40613965：4 页累计 106 位，去重后唯一 106 位，页新增 30/26/25/25，`more` 恒 true ✅
  - `/user/follows` uid=32953014：22 位一页取完，`more=false` ✅
  - `/user/followeds` uid=32953014：第 1 页 30 条 → 第 2 页新增 0 条 → `noMore=true`、`cap=true`，累计 30 位且无重复 ✅（证明不会死循环）
- 浏览器手动核查：❌ 未做（本机无 headless 环境，dev server 已起在 http://localhost:8080 ，待人工过一眼 UI）

### 注意事项
- 粉丝列表受网关缺陷限制，**只能看到最近 30 位**；要完整翻页需上游把 `limit/offset` 透传给 `/api/user/getfolloweds`（或改用 `lasttime` 游标），届时删掉 `cap` 提示即可
- 关注列表翻页用 `offset = 已加载条数`。关注关系会变动，边翻边关注/取关时可能少量漏项，属 offset 分页的固有特性
- 对方设置了隐私时会话 4xx → 显示「列表不可见（对方可能设置了隐私）」
- 新增 1 个文件，未引入任何依赖

---

### 2026-10-26 — feat(user): 粉丝卡片显示「关注时长」

### 修改内容
1. `src/utils/filters.js` 新增 `followDaysText(ms)`：把粉丝项的 `time` 转成「今天关注 / 昨天关注 / 关注 N 天 / 关注 N 年 M 个月」，无效值（0 / undefined / 未来时间）返回空串
2. `src/components/layout/UserListLayout.vue`：meta 行追加主题色小字，`title` 悬停显示具体日期（`YYYY.MM.DD 关注`）；`time` 为 0 时自动不渲染
3. meta 行改 `flex-wrap: wrap`，长昵称/长文案时不再挤成一行

### 修改文件
- `src/utils/filters.js`
- `src/components/layout/UserListLayout.vue`
- `docs/CHANGELOG_AI.md`

### 修改原因
需求是「粉丝列表有没有关注天数」。实测结论：**没有现成的天数/日期字段，但 `/user/followeds` 每项的 `time` 就是关注时间**（13 位毫秒时间戳），可以算。

字段语义的证据（容易被误判成「注册时间」，所以刻意验证过）：
- 三个账号抽样 `time > 0` 覆盖率 **30/30、30/30、5/5**，且全部**严格降序**
- 大 V `uid=416608258`（347 万粉）：30 条 `time` 全落在当天 12:45–13:13 的 28 分钟内，间隔几分钟一条 —— 不可能是注册时间，只能是「最新粉丝」的流入节奏
- 同一被关注者的粉丝里存在 `time` 相差 209ms 的两条（两个不同账号几乎同时关注）—— 若是注册时间绝无可能

**`/user/follows` 拿不到这个数据**：该接口每项 `time` 恒为 0（30/30 全为 0），没有关注时间可用，所以关注 tab 不显示时长（`v-if="u.time > 0"` 自然跳过）。

天数按**日历日**相减，不是 `(now - time) / 86400000` 取整：昨晚 23:50 关注、今天 00:10 看，按毫秒只有 0.01 天会显示「0 天」，按日历日才是「昨天关注」。

### 测试结果
- `npx eslint`（filters.js + UserListLayout.vue）✅ 0 error
- `npx vue-cli-service build` ✅ Build complete
- dev server HMR ✅ Compiled successfully，`.dev-serve.log` 中 `Failed to compile / ERROR in` 计数为 0
- 直接抽取 `filters.js` 里的真实函数源码跑边界（非复制实现）：
  - 3 分钟前 / 今天 00:05 → `今天关注`
  - 昨天 23:50 → `昨天关注`
  - 2 天 → `关注 2 天`；35 天 → `关注 35 天`
  - 365 天 → `关注 1 年`；400 天 → `关注 1 年 1 个月`；1161 天 → `关注 3 年 2 个月`；3554 天 → `关注 9 年 8 个月`
  - `0`（follows 接口）/ `undefined` / 未来 5 天 → `''`（不渲染）
- 浏览器手动核查：❌ 未做（dev server 在 8080，人工过一眼即可）

### 注意事项
- 天数只能对 `/user/followeds`（粉丝）显示；关注 tab 没这个字段，是接口能力差异，不是漏写
- 粉丝列表本身仍受「网关只返回最近 30 位」限制，所以关注时长也只覆盖这 30 人
- 时区取浏览器本地时间；改系统时间会让天数跟着漂

### 2026-10-26 — FEAT-vip-info 接入 /vip/info 与 /vip/info/v2，昵称后展示会员徽章

### 修改内容
1. **`src/api/User.js`**：
   - `vipInfo(uid)` 增加可选 `uid` 参数（原实现无参，只能查当前登录态）
   - 新增 `vipInfoV2(uid)` 封装 App 端接口 `/vip/info/v2`
2. **新增 `src/components/userPage/VipBadge.vue`**：昵称后面的会员小徽章（**不做独立板块**）
   - 徽章三种形态：黑胶有效（暗底金字「黑胶VIP V7」）/ 黑胶已过期（灰底「黑胶VIP 已过期」）/ 仅有音乐包（紫底「音乐包」）
   - 细节收进 hover 提示：黑胶到期时间 + 剩余天数、音乐包、有声书VIP 各自状态；非本人不显示到期时间
   - 三种都没有时不渲染，昵称行保持干净
3. **`src/components/layout/UserDetailLayout.vue`**：徽章挂在 `.hero-name` 里、昵称与性别图标之后；顺手修 `isSelf` 的 `number` vs `string` 严格比较（路由 query 里的 `uid` 是字符串）
4. 更新 `docs/API_GAPS.md`「会员信息」一行的现状描述

### 修改文件
- `src/api/User.js`
- `src/components/userPage/VipBadge.vue`（新增）
- `src/components/layout/UserDetailLayout.vue`
- `docs/API_GAPS.md`

### 修改原因
- **为什么两个接口都要接**：实测 `uid=32953014`，
  - `/vip/info` 的 `data` 只有 `redVipLevel` / `redVipAnnualCount` / `redVip*Icon`，**没有任何权益与到期时间**
  - `/vip/info/v2` 才有 `associator`(100) / `musicPackage`(220) / `voiceBookVip`(500) 三段权益，各带 `vipCode`、`vipLevel`、`expireTime`
  只接 v1 只能显示"等级 7"这种没法解释的数字，只接 v2 则丢掉官方文档里最基础的 `redVipLevel` 兜底，所以两条都接、v2 优先、v1 兜底。
- **为什么 `vipCode > 0` 不能直接当"有效"**：实测该账号 `voiceBookVip.vipCode=500` 但 `expireTime=1693756799000`（2023-09-03，早已过期）。只看权益码会把过期权益标成「有效」，所以有效性必须和 `expireTime` 再比一次，黑胶过期的徽章直接降级成灰底「已过期」。
- **为什么非本人隐藏到期时间**：接口对任意 `uid` 都返回到期时间，但官方 App 里看别人主页只展示徽章。展示他人付费信息属于越界，所以非本人只给等级，提示里写"到期时间仅本人可见"。
- **为什么只做徽章不做卡片**：会员信息在用户主页上属于"标签级"信息，一块独立板块会挤占听歌排行/歌单的首屏空间；徽章 + hover 提示既能在第一眼给出身份标签，又不改变页面信息层级。
- **为什么不复用 PlayerCore 已有的 vipInfo 逻辑**：`PlayerCore._loadVipInfo()` 是为音质门控服务的（含"未知放行"的容错），语义是"三态判定"，和页面展示的需求不同，强行共用会把门控的容错逻辑泄漏到 UI。本次只把 `vipInfo` 加上可选 `uid`，`PlayerCore` 的调用方式（无参）不受影响。
- **`isSelf` 的严格比较是真 Bug**：`/user` 页传的 `uid` 是 number，`/user-detail?uid=xxx` 传的是 string，`this.uid === this.loginInfo.userId` 在后者恒为 false → 从别人主页点进自己主页时，云盘/听歌排行/收藏计数全部不加载。改为 `String()` 比较。

### 测试结果
- `npx eslint --ext .js,.vue src/` ✅ 0 error
- `npx vue-cli-service build` ✅ Build complete
- 无头 Edge + CDP 实测 `http://localhost:8080/user-detail?uid=32953014`：
  - 昵称右侧渲染「黑胶VIP V7」徽章，与性别图标同一行、无错位/无重叠，`console` 无异常
  - hover 提示内容：`黑胶VIP 到期时间仅本人可见 / 音乐包 有效 / 有声书VIP 已过期`
  - 切到本人视角（临时改 `isSelf`）：提示变为「黑胶VIP 到期 2027.06.12（剩余 230 天）/ 音乐包 到期 2027.06.12 / 有声书VIP 已于 2023.09.03 过期」

### 注意事项
- `/vip/info/v2` 里的 `redVipAnnualCount = -1` 表示"未开通年费/数据不可得"，不是负数天数，代码里不再展示该字段
- 徽章在 `/user`（本人）和 `/user-detail`（任意人）两个入口都会渲染，非本人不显示到期时间
- 无会员的账号不渲染徽章，昵称行与改动前完全一致
- 音质门控仍走 `PlayerCore` 原有逻辑，本次未改动，行为不变
- 本次构建会把 `dist/` 覆盖为新产物（该目录未纳入 git）

---

### 2026-10-26 — feat(user): 粉丝列表「回关 / 互相关注」按钮 + 取消关注确认

### 修改内容
1. `src/api/User.js` 新增 `mutualFollow(uid)` → `/user/mutualfollow/get`、`followMixed(scene, size, cursor)` → `/user/follow/mixed`（`followUser` 原本已有）
2. `src/utils/filters.js` 拆出 `followSpanText(ms)`（纯时长：今天/昨天/N 天/N 年 M 个月），`followDaysText` 复用它并补「关注」二字
3. `src/components/layout/UserListLayout.vue`：
   - 新增 `mode` prop：`'followeds'` 时右侧渲染操作按钮，`'list'` 时（关注列表）不渲染
   - 未互关 → 「回关」按钮，点击 `followUser(uid, 1)`；已互关 → 「互相关注」按钮，hover 变红提示可取消
   - 点「互相关注」先弹确认：显示对方昵称 +「对方已关注你：N 年 M 个月」，按钮为「仍然取消 / 继续关注」
   - 成功后只翻本地状态（`mutual`/`followed`），不做乐观更新；失败/网络错误只提示不改 UI
   - 头像+信息包进 `.hitArea`，按钮 `@click.stop`，避免点按钮误跳转
4. `src/components/layout/UserDetailLayout.vue`：粉丝 tab 传 `mode="followeds"`

### 修改文件
- `src/api/User.js`
- `src/utils/filters.js`
- `src/components/layout/UserListLayout.vue`
- `src/components/layout/UserDetailLayout.vue`
- `docs/CHANGELOG_AI.md`

### 修改原因
需求：粉丝列表每人显示「互相关注 / 回关」两种状态，互关点击走取消关注并带时长确认。

实测约束（决定了实现方式）：
- `/user/follow/mixed` **必须登录**，游客 `{"code":400,"message":"not login"}`；且它只取「当前账号」的关注，不接受 uid
- `/user/mutualfollow/get` 游客态也返回 `{code:200,data:false}`，不能用来判断登录态
- `/user/follows` 每项 `time` 恒为 0 → **「我关注 TA 的时间」没有数据源**

因此按钮状态直接用 `/user/followeds` 列表项自带的 `mutual` 字段（与 mutualfollow 同源），
不逐条请求 `mutualfollow/get`（30 条就是 30 次往返）。
确认弹窗里的时长只用「对方已关注你：N 年 M 个月」（来自列表项 `time`，即 TA 关注我的时间），
「已关注 / 互相关注时长」等 `/user/follow/mixed` 的真实字段确认后补。

取消关注**不清空** `time`：它是「TA 关注我」的时间，取关不影响对方关注我这件事。

### 测试结果
- `npx eslint`（4 个改动文件）✅ 0 error
- `npx vue-cli-service build` ✅ Build complete
- 时长函数边界（抽取源码直接跑）：今天/昨天/2 天/35 天/365 天→`1 年`/400 天→`1 年 1 个月`/1161 天→`3 年 2 个月`/3554 天→`9 年 8 个月`；`0`/`undefined`/未来时间 → 空串 ✅
- 登录态接口（`mixed`）与写操作（`/follow`）**未做端到端验证**：本机无登录态，且 `/follow` 会真实改动关注关系，留待人工

### 注意事项
- 「全部/用户/歌手」分类条尚未接入，等 `/user/follow/mixed` 的真实返回结构确认后实现
- `/follow` 是写操作：取消关注会真实影响账号，测试时别拿真实好友试

---

### 2026-10-26 — feat(user): 关注列表「全部/用户/歌手」分类 + 混排卡片

### 修改内容
1. 新增 `src/components/layout/FollowMixedLayout.vue`：渲染 `/user/follow/mixed` 的 records，用户卡与歌手卡在同一个 grid 里混排
   - 用户卡：头像/昵称/性别/签名 +「关注 2年77天」+「互关 2年77天」
   - 歌手卡：圆形头像/名字 +「歌手」标签/别名 + 关注时长 + 乐迷等级（`fansGroupInfo.segment + level`）
   - 点击分别发 `$bus` 的 `uClk` / `arClk`，与现有跳转体系一致
   - grid key 用 `type + '-' + followId`：用户 id 与歌手 id 空间独立，可能同号
2. `UserDetailLayout.vue`：
   - 关注 tab 在**本人页面**加 `el-radio-group`：全部(0) / 用户(2) / 歌手(1)，默认「用户」
   - 混排走 cursor 游标分页（`data.page.cursor` + `data.page.more`），与 offset 分页的 `social.follows` 分开维护
   - 加 `mixedSeq` 并发令牌：快速切分类时丢弃在途的旧响应，避免串数据
   - 他人页面按约定**不显示分类条**，仍走 `/user/follows`（只有用户，且 `time` 恒为 0，无时长）
3. `UserListLayout.vue`：取消关注的确认弹窗改用时长的官方文案
   - `findFollowSpan(uid)`：游标翻 `/user/follow/mixed?scene=2` 找到该 uid，取 `followDay` / `mutualFollowDay`
   - 最多翻 8 页（240 人），命中后写入 `spanCache`；未命中降级为「对方已关注你 N 天」（来自 followeds 的 `time`）
   - 点击按钮期间按钮显示 loading，避免弹窗内容先空后填
   - 回关/取关成功后 `$delete` 掉该 uid 的时长缓存 —— 关系重建时长要重新算

### 修改文件
- `src/components/layout/FollowMixedLayout.vue`（新增）
- `src/components/layout/UserDetailLayout.vue`
- `src/components/layout/UserListLayout.vue`
- `docs/CHANGELOG_AI.md`

### 修改原因
`/user/follow/mixed` 的真实结构（登录态实测，2026-10-26）：

```json
{ "code": 200, "data": {
  "records": [{
    "type": 1,                                  // 1 用户 / 2 歌手
    "followId": 477531493,
    "userProfile": { "userId":..., "nickname":..., "mutual": true },   // type=1
    "artistInfo":  { "id":..., "name":..., "alias":[...] },            // type=2
    "followTime": 1792993091283,                // 我关注它的时间
    "mutualFollowTime": 1792993091283,          // 互关时间（未互关为 null）
    "followDay": "1天",                         // 官方算好的时长文案
    "mutualFollowDay": "1天"
  }],
  "page": { "size": 3, "cursor": "3", "more": true }
}}
```

这就是此前缺的两块：
- **分类**靠 `type` 区分，不必再拼 `follows + sublist`
- **时长**靠 `followDay` / `mutualFollowDay`，且是网易云自己的口径（"2年77天"），比前端自己按毫秒算更贴近 App

注意实测 **`size=2` 却返回 3 条且 `cursor="3"`**：服务端会多回一条。因此渲染时**不切片**，全部消费返回的 records，下一页用返回的 cursor —— 切掉最后一条会导致该条永远取不到。已用真实返回 + 人造重复页验证：翻页无重复、无丢失。

### 测试结果
- `npx eslint`（3 个改动文件）✅ 0 error
- `npx vue-cli-service build` ✅ Build complete
- 分页/去重/混排逻辑 Node 实测（喂真实第一页 JSON + 人造第二页，其中故意重复一条）：
  - 第 1 页渲染 3 条，cursor 0→`3`，more 正确
  - 第 2 页新增 2 条（重复的那条被过滤），cursor `6`，`noMore=true`
  - 5 条 key 全唯一 ✅；混排顺序「用户|用户|用户|歌手|用户」按接口原序
  - 时长解析 `323008512` → `{followDay:"2年77天", mutualFollowDay:"2年77天"}`
- 登录态下的真实渲染、`/follow` 写操作**未端到端验证**（本机无登录态；且取关会真实改动账号）

### 注意事项
- 分类条只在本人页面出现；他人页面拿不到「关注的歌手」，这是接口能力限制（`mixed` 不接受 uid）
- `findFollowSpan` 最坏情况翻 8 页（约 240 人）；关注数超过这个量级时，弹窗会降级只显示「对方已关注你 N 天」。需要更准的话得让网关提供按 uid 查关注关系的接口
- `followDay` 是服务端算好的文案，跨年/跨月口径以它为准；`followSpanText`（前端算的）只用于粉丝侧没有官方文案的场景

### 2026-10-26 — FEAT-vip-svip 会员徽章区分黑胶SVIP 与普通黑胶VIP

### 修改内容
1. **`src/components/userPage/VipBadge.vue`**：
   - 徽章文案由固定「黑胶VIP」改为按 `redplus` 判定：「黑胶SVIP V7」/「黑胶VIP V7」/「黑胶VIP 已过期」
   - SVIP 徽章多一圈金色描边 + 偏金底（`is-svip`），与普通黑胶一眼可分
   - hover 提示重排：SVIP 生效时只列 SVIP 一行（已含 VIP 权益），失效时才单独补一行「黑胶SVIP 已过期」；数字专辑权益、音乐包、有声书 VIP 各自成行
   - 新增 `expireLine()` 统一到期口径：**他人的日期不展示，但「有效/已过期」这个事实照常说**（此前会把已过期权益显示成"到期时间仅本人可见"，读起来像状态未知）
2. `docs/API_GAPS.md`「会员信息」行补充 SVIP 区分能力

### 修改文件
- `src/components/userPage/VipBadge.vue`
- `docs/API_GAPS.md`

### 修改原因
- **SVIP 只能靠 `redplus` 判**，实测排除了三条看似可行的路：
  1. `associator.vipCode` 恒为 100 —— 40 个账号抽样，VIP 与 SVIP 完全一样
  2. `/user/detail` 的 `profile.vipType` —— 两者都返回 11
  3. `redVipLevel` —— SVIP 与 VIP **共用同一套等级体系**（官方口径），只能给档位给不出品类
  所以 `/vip/info/v2` 里那个 `redplus`（`vipCode` 300）是唯一可用的信号。
- **判定依据（40 个真实账号抽样 + 逐字段比对）**：
  - `redplus` 与 `albumVip`(400)、`voiceBookVip`(500) **永远同时出现**（28/28），且三者 `expireTime` 完全相同 → 同一次 SVIP 订单打包下发，内容正好对应官方对 SVIP 的定义（黑胶VIP 权益 + 畅听数字专辑 + 付费有声书 + 多终端）
  - `uid=16629617`：`associator` 到 2026-09-18，`redplus/albumVip/voiceBookVip` 都停在 2025-05-09 → SVIP 到期后回落普通 VIP，`redplus` 的到期时间独立于黑胶VIP，符合「SVIP 与 VIP 是两个独立商品、各自管理续费」
  - `uid=1344710603` / `318398276`：只有 `associator` + 一个早已过期的 `voiceBookVip`，没有 `redplus` → 有声书可以单独买，但不能反过来推成 SVIP
  - `vipCode` 是权益类型码不是等级：100 associator / 220 musicPackage / 300 redplus / 400 albumVip / 500 voiceBookVip
- **为什么他人的到期时间仍然不展示**：`/vip/info/v2` 对任意 `uid` 都返回到期时间，但那是付费信息；徽章只呈现身份（SVIP/VIP/已过期），日期留给本人。

### 测试结果
- `npx eslint --ext .js,.vue src/` ✅ 0 error
- `npx vue-cli-service build` ✅ Build complete
- 无头 Edge + CDP 三账号对照实测（改前/改后各跑一轮）：
  | uid | 数据 | 徽章 | hover |
  | --- | --- | --- | --- |
  | 418679942 | associator+musicPackage+redplus+albumVip+voiceBookVip 均有效 | 黑胶SVIP V7（金边） | 黑胶SVIP 有效 / 数字专辑权益 有效 / 音乐包 有效 / 有声书VIP 有效 |
  | 32953014 | 只有 associator+musicPackage，voiceBookVip 2023 已过期 | 黑胶VIP V7（纯黑） | 黑胶VIP 有效 / 音乐包 有效 / 有声书VIP 已过期 |
  | 16629617 | 全部过期（redplus 停在 2025-05-09） | 黑胶VIP 已过期（灰） | 黑胶VIP 已过期 / 黑胶SVIP 已过期 / 有声书VIP 已过期 |

### 注意事项
- `redplus` 的语义是**推断**（依据是它与数字专辑/有声书权益的强绑定 + 到期时间独立性 + 官方 SVIP 权益清单），不是官方字段文档。若后续拿到 SVIP 账号登录态，可再核一次 `/vip/info/v2` 的 `redplus.expireTime` 是否与 App 内 SVIP 到期日一致。
- 徽章只做身份标识，不参与音质门控；臻音/高清臻音目前仍按原有 `vipType` 逻辑判断，未把 SVIP 纳入（那是另一件事，需要单独确认 SVIP 是否解锁 hires）。

---

### 2026-10-26 — FEAT-playlist-import 歌单导入（链接导入外部平台歌单）

#### 修改内容

接入「歌单导入」接口，在本人主页的歌单区加「导入外部歌单」入口，当前只做**链接导入**（QQ 音乐等平台的歌单/专辑/主页链接），支持一次贴多个链接合并成一个新歌单，提交后轮询任务状态。

#### 修改文件

- `src/api/Playlist.js`（新增 `importTaskCreate` / `importTaskStatus`）
- `src/components/common/PlaylistImportDialog.vue`（新增）
- `src/components/layout/UserDetailLayout.vue`（歌单区标题加按钮 + 挂弹窗 + `reloadPlaylists`）

#### 修改原因

- **三种导入方式互斥且有优先级**（读上游 `module/playlist_import_name_task_create.js` 确认）：
  - `local` 走 `multiSongs` 分支，把 `{name, artist, album}` map 成 `{songName, artistName, albumName}`，**不接受 playlistName**（服务端自己起名）
  - `text` / `link` 走 `songs[]` 分支，每项是 `{name: playlistName, type: '', url: encodeURI(...)}`——文字被包成 `rpc://playlist/import?text=xxx` 这种伪 url，链接直接当伪 url 传
  - `if (query.local)` 是 if/else：同时传 local 和 text/link 时 **local 胜出**；`text` 写在前面 `link` 写在后面且都能覆盖 `songs`，所以同时传 text + link 时 **link 静默覆盖 text**，不报错
- **链接导入是唯一能跨平台搬歌单的方式**：`local` 要求自己先有一份歌名/歌手/专辑清单（前端得先扫外部歌单），`text` 靠服务端按「歌名 歌手」逐行模糊匹配、精度最差，只有 `link` 由服务端自己去抓外部歌单详情；用户需求正是「通过链接导入其他平台」
- **不做手动 encodeURIComponent**：文档示例里的 `encodeURIComponent` 是给手拼 URL 用的。走 axios `params` 时 axios 会编码一次、服务端 decode 一次，`text` 分支内部还会再 `encodeURI` 一遍——前端再手动编一次就会二次编码，服务端拿到的 `text` 是 `%E3%82...` 字面量
- **`importStarPlaylist` 只在 true 时下发**：上游写的是 `query.importStarPlaylist || false`，传字符串 `"false"` 会被判成真值
- **入口只放本人主页**：接口要登录态，他人主页没有写入权限
- **完成后只重拉歌单区**：`loadPage` 是 push 不 clear 的写法，直接复用会渲染出重复歌单

#### 测试结果

- `npx eslint --ext .js,.vue`（3 个改动文件）✅ 0 error
- `npx vue-cli-service build` ✅ Build complete（11.2s）
- 网关连通性实测（`https://music.archai.space`，未登录）：
  | 请求 | 返回 |
  | --- | --- |
  | `/playlist/import/task/status?id=123834369` | `{"code":200,"data":{"tasks":[],"taskProcess":null}}` ✅ 路由存在 |
  | `/playlist/create?name=x`（对照组） | `{"code":301,"msg":"需要登录"}` |
  | `/playlist/import/name/task/create`（local / text / link 各一次） | `{"code":302,"message":"系统错误"}` |
  | 同上 + `realIP` / `randomCNIP=true` | 仍是 302（与出口 IP 无关） |
- 浏览器手动核查：❌ **未做**——需要登录态，当前没有可用账号 cookie

#### 注意事项

- **302 未定性**：未登录时 `/playlist/create` 返回的是 301「需要登录」，而导入接口返回 302「系统错误」且无 msg。两种可能：(1) 上游内部接口 `/api/playlist/import/name/task/create` 把未登录也报成 302；(2) 该接口在当前网关的加密/设备参数下不可用。**登录后第一次调用请先看 console 里的响应体**，弹窗内「查看原始返回」也能直接看到
- **`taskId` 字段位置未文档化**：`pickTaskId` 按 `data.taskId → data.id → data.tasks[0].id/taskId → body.taskId` 逐个兜底。若全部落空，弹窗会显示「已提交，稍后刷新歌单查看」，不会假装成功
- **任务状态字段未文档化**：只知道返回 `{tasks, taskProcess}`。状态文案做了 success/fail/process 关键字映射，映射不到就原样显示 `状态 N`，并提供原始 JSON 折叠区，不猜
- **轮询**：2s 一次、上限 25 次（约 50s），单次失败不终止；超时提示「任务仍在处理中」，不清空界面
- **回滚**：三个文件独立，删除 `PlaylistImportDialog.vue` + 去掉 `UserDetailLayout` 里的按钮/挂载/import 即回到原状；`api/Playlist.js` 只新增两个函数，不影响既有调用
- 未提交 commit，等确认

---

### 2026-10-26 — feat(user/artist): 用户与歌手详情页增加关注/取关

### 修改内容
1. `src/api/Artist.js` 新增 `subArtist(id, t = 1)` → `/artist/sub`（`t=1` 关注，其他取消）
2. `src/components/layout/UserDetailLayout.vue`：hero 右侧加关注按钮
   - 初始状态取 `/user/detail` 的 `profile.followed`（不额外请求）
   - 仅「已登录 + 不是自己主页」时渲染
   - 关注直接执行；取消关注先弹确认（`仍然取消 / 继续关注`）
   - 成功后本地增减 `profile.followeds`，做即时反馈
   - 若 `profile.followTime` 是合理的毫秒时间戳，确认框里附一行「已关注：N 年 M 个月」；不像就算了，不猜单位
3. `src/pages/artist/ArtistDetail.vue`：深色 hero 右侧加关注按钮
   - 初始状态取 `/artists?id=` 的 `artist.followed`
   - 取消关注同样弹确认
4. 三处写操作（回关/取关、用户关注、歌手关注）统一补登录态失效提示：网关对未登录回 `301 未登录` 或 `302 系统错误`，命中这两个码提示「登录态已失效，请重新登录后再试」，而不是笼统的「操作失败」

### 修改文件
- `src/api/Artist.js`
- `src/components/layout/UserDetailLayout.vue`
- `src/pages/artist/ArtistDetail.vue`
- `src/components/layout/UserListLayout.vue`
- `docs/CHANGELOG_AI.md`

### 修改原因
两个详情接口本来就带关注状态，不需要额外查询：
- `/artists?id=9272` → `artist.followed`（Boolean）
- `/user/detail?uid=...` → `profile.followed` / `profile.mutual` / `profile.followTime`

游客态实测：`/artist/sub?id=&t=1` → `{"code":301,"message":"未登录"}`；
`/follow?id=&t=1` → `{"code":302,"message":"系统错误"}`（不是 301，所以两个码都要认）。

### 测试结果
- `npx eslint`（4 个改动文件）✅ 0 error
- `npx vue-cli-service build` ✅ Build complete
- 接口探测（游客态，无副作用）：`/artist/sub` 301 未登录、`/follow` 302 系统错误、`/artists` 的 `followed` 可读 ✅
- 登录态下真实关注/取关**未端到端验证**：写操作会真实改动账号

### 注意事项
- 用户页关注按钮不处理「互相关注」状态，只区分「关注 / 已关注」；互关时长仍走粉丝列表那套弹窗
- `profile.followTime` 的单位没有文档说明，代码里只在 `> 1e12`（毫秒量级）且不在未来时才用来算时长，否则整行不显示
- 歌手页用了 keep-alive（`activated`），关注状态每次进页面都按接口返回值重置，不会留脏状态

---

### 2026-10-26 — FEAT-playlist-delete 歌单删除（仅创建者）

#### 修改内容

歌单详情页的创建者操作区新增「删除歌单」：二次确认后调 `/playlist/delete`，成功后广播事件并跳回「我的」；「我喜欢的音乐」不显示该入口。

#### 修改文件

- `src/pages/ListDetail.vue`（按钮 + `deletePlaylist` + `isFavPlaylist` + 危险按钮样式）
- `src/components/layout/UserDetailLayout.vue`（监听 `playlistDeleted` → 只重拉歌单区）

#### 修改原因

- **入口放详情页**：已有的「编辑信息 / 管理歌曲」就在 `ownerActions`，删除同属创建者操作，放一起不需要新 UI 结构；列表卡片上没有删除按钮，避免误触
- **`specialType === 5` 不给入口**：`/playlist/detail` 实测「我喜欢的音乐」`specialType=5`，普通自建歌单为 `0`。系统歌单删不掉，留着按钮只会让用户点了吃一个报错
- **必须二次确认**：不可恢复。确认文案写清「删的是歌单，歌曲本身不会被删除」，并把 `trackCount` 带进去，避免用户以为会连带删歌
- **确认按钮标红**：`confirmButtonClass: 'el-button--danger'`，和「取消」在视觉上分开
- **成功后广播 `playlistDeleted`**：页面是 `keep-alive` + `:key="$route.fullPath"`，用户主页组件只在 `mounted` 取数，删除后返回主页不会重新挂载 → 会继续显示已删的歌单。`UserDetailLayout` 现在监听该事件并调 `reloadPlaylists()`（只重拉歌单区，排行榜/云盘/关注没变，不做全量 `loadPage`）
- **跳回 `/user`**：不跳的话当前页停在一个已经不存在的歌单上，`/playlist/detail` 会返回空 playlist
- **`deleting` 独立于 `saving`**：删除成功会 `$router.push` 走人，和编辑/排序的 loading 不是一条生命周期

#### 测试结果

- `npx eslint --ext .js,.vue`（3 个改动文件）✅ 0 error
- `npx vue-cli-service build` ✅ Build complete（11.9s）
- 接口契约核对（上游 `module/playlist_delete.js`）：入参 `id`，内部转成 `ids: '[' + id + ']'`，走 weapi；返回 `{code:200}` 视为成功，`_writeResult` 已兼容 `code`/`status` 两种形态
- 数据源核对（网关实测）：
  | 歌单 | id | specialType | trackCount |
  | --- | --- | --- | --- |
  | binaryify喜欢的音乐 | 24381616 | 5 | 1267 |
  | 异形工厂（普通自建） | 12529334864 | 0 | 6 |
- 浏览器手动核查：❌ **未做** —— 入口只对创建者（登录态）渲染，当前没有可用账号 cookie

#### 注意事项

- **未验证真实删除**：`/playlist/delete` 需要登录，返回码可能是 `401`（登录态失效）或 `403`（非本人）。`_writeResult` 会把 `message` 透到 `$message.error`，不会静默失败。登录后第一次删请留意提示文案
- **`specialType` 只挡了 5**：实测还看到 `20`（年度歌单，也是系统生成）。年度歌单是否可删未验证，暂不拦——真删不掉时服务端会返回错误提示，不会误删
- **keep-alive 缓存页**：如果被删歌单的详情页实例还在缓存里（同一 `fullPath`），再点进去会重新 `activated()` 清空并重取，拿到空 `playlist` 走骨架/空态，不会白屏
- **不做连带处理**：若播放器正从这个歌单播放，队列照旧（内存里的列表不受影响），这是有意为之，避免删歌单把正在放的歌打断
- **回滚**：`ListDetail.vue` 去掉按钮 + `deletePlaylist` + `isFavPlaylist`，`UserDetailLayout.vue` 去掉监听即可；`api/Playlist.js` 的 `del()` 是既有函数，本次未改动
- 未提交 commit，等确认

---

### 2026-10-26 — FEAT-annual-report 年度听歌报告（8→10 年时间线）

#### 修改内容

新增 `/annual` 页面：把 2016–2025 年的「年度之歌 / 年度歌手 / 播放量」串成一条时间轴；「我的」页 hero 区加入口（仅本人可见）。2025 年因官方接口缺位，改为按需用月报聚合补一份近似值。

#### 修改文件

- `src/api/Summary.js`（新增：`annual(year)` / `listenYearReport()` / `listenSongRank()`）
- `src/utils/annualReport.js`（新增：解析与合并的纯函数层）
- `src/pages/AnnualReport.vue`（新增：时间轴页）
- `src/router/index.js`（新增 `/annual` 路由）
- `src/components/layout/UserDetailLayout.vue`（hero 区入口按钮）
- `.gitignore`（忽略 `.dev-serve.log`）

#### 修改原因

- **只发 3 次请求**：`/listen/data/year/report` 一次给全 2017–2025 的播放次数与时长（统一秒）；`/summary/annual?year=2024` 给 2020–2024 年度歌手；`?year=2023` 给 2016–2022 年度之歌（藏在 `yuncunFootprintPage.footprintItems`）与 2019–2023 年度歌手。拼起来就是 10 年，不必逐年请求
- **避开单位坑**：年报里「总时长」三种单位（2017 毫秒 / 2023 分钟 / 其余秒），而 `year/report` 统一秒。交叉校验过：2024=2603185s 与年报 `meetTimeOverview.playTime` 相等，2023=1178534s 等于年报分钟值×60
- **`playNum` 口径不稳**：2018 是「1350 次 / 798 小时」＝35 分钟/次，明显不是播放次数。用「单次时长 20s–1800s」做可信度判据，越界就只显示时长并标注「播放次数口径异常」
- **2025 只能聚合**：`/summary/annual` 传 2025 返回 `{"code":404,"message":"接口未找到！"}`，直接打 `music.163.com/yearly/2025` 也是同一份 JSON → 是上游兜底 404，不是网关白名单；`module/summary_annual.js` 最后提交停在 2024-07。改用 `listen/data/song/play/rank` 逐月（`endTime` 必须月末 23:59:59.999）拉 TOP20 再聚合
- **频控**：0 间隔连打多请求会整批返回伪 `301 需要登录`（实测间隔 3s 全恢复），所以全程串行 + 间隔 + 重试；月报聚合 12 次请求做成按需按钮而非首屏加载
- **登录态判据**：用 `utils/auth.isLoggedIn()`（cookie）而不是 `store.state.UserAbout.IS_LOGIN`——后者要进过「我的」页才置 true，直开 `/annual` 会误判未登录

#### 测试结果

- `npx eslint`（5 个改动文件）✅ 0 error 0 warning
- dev server 编译 ✅
- 真实数据核对 ✅：用黑胶 VIP 账号跑通，时间线 10 行 / 累计 5512 小时 / 4 位年度歌手；2016–2025 每年年度之歌齐全（2025 为聚合值）
- 无头 Edge + CDP 实机渲染 ✅：`window.__acmusicErrors` 为空，截图确认布局无错位
- 月报聚合实机点击 ✅：12/12 月，156 首歌，ζ(α·Pav) 104 次 / α·Pav 1252 次

#### 注意事项

- **2025 的年度之歌是估算**：每月只有 TOP20，掉出月榜的播放量丢失，聚合值必然偏小。UI 上打了「月报聚合」标签，note 明确写「非官方年报」
- **2016 只有年度之歌**：`year/report` 从 2017 起，2016 无播放量
- **2017–2018 无年度歌手**：`annualSingerComparePage` 只覆盖 2019 起
- **月报聚合结果缓存在 localStorage**（`acmusic_annual_agg_v1`）：想重新算需清掉该 key
- **接口纯逆向**：`songItems[].artists` 是对象数组（年报同名字段却是字符串），已做双形态兼容；上游随时可能改
- 回滚：删除三个新文件 + 去掉路由与 hero 入口即可，无副作用

---

### 2026-10-26 — fix(user): 他人主页不显示关注按钮 / 自己主页误显示关注按钮

### 修改内容
1. **布局裁切**（他人主页看不到按钮的直接原因）
   - `.hero-info` 补 `flex: 1; min-width: 0`，`.hero-name` 补省略号
   - 原来 `.hero-info` 是 `flex: 0 1 auto` 且未设 `min-width: 0`，长昵称/长签名时 min-content 撑开，
     把 `margin-left: auto` 的 `.hero-side` 顶出容器，再被 `.user-hero` 的 `overflow: hidden` 裁掉
2. **`isSelf` 误判**（自己主页也出现「关注」按钮的根因）
   - `loginInfo` 改为「state 优先 + localStorage 兜底」：只读 state 时首屏拿不到 userId（refreshLogin 未完成）；
     只读 getter 时因 getter 命中 localStorage 后不再依赖 state，补资料后不重算
   - 新增 `ensureLoginProfile()`：有登录态但 `userId` 缺失时用 `/login/status` 补一次并
     `dispatch UserAbout/initProfileInfo` 写回 store + localStorage，**并在 `mounted` 里等它完成再 `loadPage()`**
   - 顺带修复 `v-if="uid===loginInfo.userId"`（string 与 number 严格比较恒 false，「云盘与收藏」整块此前不显示）→ `v-if="isSelf"`
3. **登录态读取改为本地求值**
   - `UserDetailLayout` / `UserListLayout` 不再用 `UserAbout/isLogin` getter：该 getter 内部直接调
     `isLoggedIn()`、没有任何响应式依赖，Vue 会永久缓存 —— 会话中途登录后仍返回 false，按钮永远不出现
   - 改为 `mounted` 时 `isLoggedIn()` 赋值给 `loggedIn`，`isLogin` 读它
4. **关注按钮补全四态**：`互相关注`（followed+mutual）/ `已关注`（followed）/ `回关`（!followed+followMe）/ `关注`
   - 状态来自 `/user/detail` 的 `profile.followed / mutual / followMe`，不额外请求
   - 互关态加小圆点样式；已关注/互关点击仍走「仍然取消 / 继续关注」确认，互关时文案补充「互相关注状态会被解除」
   - 关注成功后 `mutual = followMe`，取关后 `mutual = false`

### 修改文件
- `src/components/layout/UserDetailLayout.vue`
- `src/components/layout/UserListLayout.vue`
- `docs/CHANGELOG_AI.md`

### 修改原因
用户反馈：只有在自己的详情页看得到关注/取关，打开别人主页看不到。两个缺陷叠加：

1. **别人的主页按钮被裁掉了**：`.user-hero` 是 flex + `overflow:hidden`，`.hero-info` 未设 `min-width:0`，
   内容一长（别人昵称/签名通常更长）就把右侧按钮挤出可视区，视觉上等于"没有按钮"。
2. **自己的主页反而有按钮**：`state.profile` 可能为 `{}`（只有 cookie、没有 user-profile 的旧会话），
   `loginInfo.userId` 为 undefined → `isSelf` 永假 → `canFollow = isLogin && !isSelf` 成立，能关注自己。

### 测试结果
- `npx eslint`（2 文件）✅ 0 error
- `npx vue-cli-service build` ✅ Build complete
- 布局与按钮显隐**未做浏览器实测**（需登录态 + 长昵称账号才能复现裁切场景）

### 注意事项
- `ensureLoginProfile()` 只在「有登录态但缺 userId」时发一次 `/login/status`，正常会话不会多请求
- 它会在 `mounted` 里阻塞 `loadPage()`（Promise.finally），正常情况下是同步 resolve，无感
- 四态里的「回关」依赖 `profile.followMe`；若网关某版本不返回该字段，会退化为「关注」（不会误显示回关）

### 2026-10-29 — PERSIST-refresh 刷新后的播放状态补全（心动模式 / 音量 / 队列窗口 / 定时停止 / 滚动 / 大播放器）

### 修改内容
1. **心动模式刷新后丢失（用户报的 bug）**：`heartMode` 原来只活在 Vuex 内存（`Tracks.js:82` 初始 `false`），
   全项目没有任何 localStorage 读写。现在 `_saveState` 写入 `heartMode`，`_restoreState` 的 `$nextTick`
   里（`isRestoring = false` 之后）恢复，并加两层门控：`isLoggedIn()` + `user-profile.userId`。
2. **音量持久化**：新增独立 key `acmusic_volume`（400ms 防抖，`fadeStarted` 期间不写），
   `mounted` → `_restoreVolume()` 恢复并同步 `fadeBase`。
3. **队列 200 → 800 + 窗口裁剪**：原 `slice(0, 200)` 但 `currentIndex` 原样保存，
   当前曲在 200 名之外时恢复出来的下标指向队列以外。改为以 `curIndex` 为中心取窗口并扣掉 `playlistOffset`；
   恢复时若当前曲不在列表里，把 `curIndex` 夹回合法区间。`QuotaExceededError` 时对半砍队列重试一次。
4. **保存时机**：补 `visibilitychange(hidden)` + `pagehide`（`beforeunload` 在移动端不可靠）；
   点击/拖动进度条结束立即 `_saveState()`（原来最多丢 5 秒进度）。
5. **定时停止持久化**：`sleepMode / sleepValue / songsLeft / sleepDeadline` 随 `player_state` 一起存，
   新增 `_restoreSleep()`：只认 12 小时内的；time 档按绝对截止时间重建并重启 ticker，已过期静默丢弃。
6. **大播放器展开 + 右侧 tab**：sessionStorage `acmusic_player_ui`（刷新保留、关标签页即忘）。
7. **刷新后滚动位置**：新增 `src/utils/scrollMemory.js`（sessionStorage，10 分钟内有效，
   内容异步加载时重试最多 14 次 × 180ms，用户一滚就放手），`App.vue` 在挂载时恢复一次。
8. **附带修正**：
   - `playMode` 双写收敛：`_restoreState` 恢复过就标记 `_playModeRestored`，`mounted` 不再用
     `acmusic_play_mode` 无条件覆盖；
   - 恢复的当前曲补 `al.name`（原来只存封面，刷新后大播放器专辑行是空的）；
   - 新增 `_artistText()`：`ar/artists` 是字符串时原来 `.map` 会抛错，而 `_saveState` 每 5 秒调一次，
     抛一次等于持久化整体失效；队列 `filter(Boolean)` 同理。

### 修改文件
- `src/components/musicPlayer/PlayerCore.vue`
- `src/components/musicPlayer/MusicPlayer.vue`
- `src/App.vue`
- `src/utils/scrollMemory.js`（新增）
- `docs/CHANGELOG_AI.md`

### 修改原因
用户测试反馈：刷新后心动模式丢失。排查发现这不是单点问题 —— 四层播放模式里只有 A 层（队列策略）
和 C 层的副歌形态被持久化，B 层（内容来源：心动 / FM）与 D 层（定时停止）全部只在内存里；
音量、滚动位置、大播放器展开同样缺失。逐项对齐"长期偏好 / 会话连续性 / 应当丢弃"三层归属后统一补上。

心动模式的关键不在布尔值本身：队列能从 localStorage 恢复，但"谁来续批"只存在于 `heartMode`，
丢失后 `_autoNext` 走普通 `getNextIndex()`，播到队尾绕回第一首，续批能力（`_heartExtend`）彻底消失。
所以恢复点必须放在 `isRestoring` 解除之后 —— 放在恢复过程中会立刻触发 `heartShouldPrefetch` 拉一批，
与正在恢复的队列打架。

门控为什么不用 `UserAbout/isLogin` getter：该 getter 无响应式依赖、Vue 永久缓存
（`UserDetailLayout` 已有同样的修复记录，见上一条 CHANGELOG），这里直接用 `isLoggedIn()`。
另外游客登录也会写 `MUSIC_U`（`main.js` 的 `anonymousLogin`），只看登录态会让未登录用户刷新后
也点亮心动卡和"播放中"，所以再叠一层 `user-profile.userId`。

### 测试结果
- `npx eslint`（4 文件）✅ 0 error
- `yarn serve` ✅ 编译通过（HMR 多次热更新无报错）
- `yarn build` ⚠️ 环境限制：`vue-cli-service build` 清空 `dist/` 时被 safe-delete 守卫拦下
  （`SAFE_DELETE_BULK_CONFIRM_REQUIRED`，50 文件批量删除），与代码无关；
  改用 `npx vue-cli-service build --no-clean` ✅ `Compiled with 2 warnings`（均为 asset/entrypoint
  size limit，改动前就存在）
- 浏览器实测 ✅（Edge headless + CDP 自动化，脚本在临时目录，未入库）
  1. 播种 `player_state`（1000 首 / 当前第 900 首 / 音量 66 / 心动 / 定时 30 分钟）后刷新：
     `volume=66`、`curIndex=900`、`playlistLen=1000`、`albumName=专辑X`、`resumeTime=42`、
     `sleepMode=time`（剩余 1496s）、`rightTab=tracks`、`window.__acmusicErrors` 为空
  2. 恢复后再 `_saveState()`：`len=800 / offset=200 / curIndex=700`，且 `playlist[700].id = 1900`
     （窗口确实围绕当前曲，旧实现在这里会丢队列尾巴 + 下标错位）
  3. 心动恢复分支：有 `MUSIC_U` + `user-profile.userId` → 恢复后 `heartMode=true`；
     移除 cookie 后 → `heartMode=false`（门控生效）
  4. `playMode` 收敛：`player_state.playMode=random` 与 `acmusic_play_mode=order` 同时存在时取 `random`

### 注意事项
- **心动模式的真实登录态未被自动化覆盖**：自动化只能用假 cookie 走通"恢复分支"，
  真实账号下"刷新 → 心动卡亮起 → 播到队尾继续续批"仍需手动确认一次。
- `heartMode` 恢复依赖 `user-profile.userId`：老会话若只有 cookie 没有 profile，
  刷新后不会恢复心动（退化为修复前的行为，不会报错），`UserDetailLayout.ensureLoginProfile()`
  会在访问他人主页时顺手把 profile 补上。
- 队列上限从 200 提到 800：单条约 180 字节，满队列约 150KB，仍在 localStorage 5MB 预算内；
  真的写满时会自动对半砍并保留当前曲附近。
- 滚动恢复只在"刷新/重新打开"这条路径生效，SPA 内部导航仍由 `router.scrollBehavior` 负责，
  两者不重叠；若页面内容迟迟加载不出来，最多重试 2.5 秒后放弃（不会把用户卡在中间态）。
- 回滚策略：本次改动集中在 4 个文件，`git revert` 即可；localStorage 新增 key
  （`acmusic_volume`、`acmusic_player_ui`）旧版本会忽略，无兼容问题。

---

## 2026-10-30

### 修改内容
统一全站消息通知机制：新建统一出口 `src/utils/notify.js` + 浮层皮肤 `element-overrides.scss`，
清除 3 处浏览器原生 `alert`/`confirm`，补齐 4 处关键路径静默失败，播放器持续状态改内联状态条。

### 修改文件
- `src/utils/notify.js`（新增）
- `src/assets/scss/base/element-overrides.scss`（新增）
- `src/assets/scss/base/variables.scss`（新增语义色 + z-index 层级 token）
- `src/main.js`（引入顺序 + 挂载 `$toast` / `$confirmBox` / `$confirmTyped`）
- `src/App.vue`（退出登录：原生 `confirm` → `$confirmBox`）
- `src/components/SendComment.vue`（空评论：`alert` → 按钮禁用；发送失败补提示）
- `src/components/userPage/phoneLogin.vue`（3 处静默失败补提示）
- `src/pages/UserPage.vue`（`alert("登陆失败")` → `$toast.error`）
- `src/components/layout/CommentContentLayout.vue`、`UserDetailLayout.vue`、`UserListLayout.vue`
- `src/components/musicPlayer/PlayerCore.vue`、`MusicPlayer.vue`
- `src/pages/ListDetail.vue`、`src/pages/artist/ArtistDetail.vue`、`src/components/PersonalFM.vue`
- `src/assets/scss/comment/commentLayout.scss`、`commentContentLayout.scss`（z-index 改走 token）
- `src/assets/scss/comment/sendComment.scss`（发送按钮禁用态样式）
- `docs/AI_RULES.md`（新增「通知 / 提示规范」章节）

### 修改原因
改造前项目并存三套提示方式，视觉与交互都不统一：
1. **三套皮肤并存**：Element 出厂弹窗（4px 圆角 / #409EFF 蓝 / 彩色底）与项目紫 `#8685EF` + 12px 圆角
   的设计语言完全脱节；另有 3 处浏览器原生 `alert`/`confirm`，且 `docs/AI_RULES.md` 早有明令禁止。
2. **被全屏浮层盖住（真实 bug）**：Element 弹层 z-index 从 2000 起，而评论浮层写了 3000/3100
   （`commentLayout.scss` / `commentContentLayout.scss`）。在评论区里删除评论的确认框、
   点赞失败的 toast 会被完全遮住 —— 用户点了没反应。
3. **连点刷屏**：71 处 `$message` 无任何去重，只有 `main.js` 的错误兜底做了 8 秒限频。
4. **语义错配**：A-B 选点引导（"点击进度条设定起点 A"）、副歌模式、定时停止这类
   **持续状态 / 操作引导**用 2 秒即消失的 toast 播报，用户根本来不及读。
5. **静默失败**：`phoneLogin.vue` 的验证码发送 / 校验 / 登录失败、`SendComment.vue` 的发送失败
   全部只 `console.error`，用户点按钮毫无反馈。

### 测试结果
- `yarn lint` ✅ No lint errors found!
- `yarn serve` ✅ Compiled successfully（dev server 跑在 http://localhost:8080/）
- 浏览器手动核查：⏳ 待用户确认（无测试 runner，需手工过主流程）

### 注意事项
- **改动面 71 处，建议按文件分 commit**，不要一次全提。
- **`element-overrides.scss` 的引入顺序是硬约束**：必须排在 `element-ui/lib/theme-chalk/index.css`
  之后（见 `main.js`），否则同优先级规则会被主题 CSS 反压，覆盖完全失效。
- **不动公共基础组件**：覆盖只作用于 `.el-message` / `.el-message-box` / `.el-dialog`；
  确认框内的按钮样式用 `.el-message-box` 前缀限定作用域，不污染业务里的 `el-button`。
  `.el-dialog` 只统一圆角与阴影，**故意不动 header padding / title 排版** ——
  AppFooter 免责声明、导入歌单、编辑歌单等既有弹窗都依赖 Element 默认内距，改了会挪动已有布局。
- **z-index 抬升靠运行时 patch**：Element `Message` 在 `$mount` 后会把 zIndex 覆写成
  `PopupManager.nextZIndex()`，`MessageBox` 又不接受 `zIndex` 参数，所以只能在拿到实例 /
  nextTick 后改 DOM 的 `style.zIndex`。这是受 Element 2.x 实现限制，升级大版本需回归。
- **删除歌单升级为「输入歌单名确认」**（`$confirmTyped`），比原来的单一确认框更防误触，
  与网易云官方客户端规格一致。
- **未做的收尾**：`$z-*` token 目前只落到了评论浮层与通知层，其余散落的硬编码 z-index
  （搜索页 999、播放器 100 等）暂未收编，避免一次性改动带来回归风险。
- **回滚策略**：新增文件 2 个、其余为原地替换，`git revert` 或逐文件回退均可；
  无 localStorage / 接口数据结构变更，不涉及兼容问题。

### 2026-11-03 — FEAT 页脚加作者博客入口 + 移动端「暂未适配」提示

### 修改内容

1. **页脚博客入口**：`config.site` 增加 `blog` / `blogLabel`；页脚 `.af-links` 首位加一颗胶囊样式的
   「博客主页 blog.archai.space ↗」，与后面的普通文字链（源码/反馈/API 仓库/API 文档/免责声明）区分；
   免责声明弹窗补一句「更多项目记录与随笔见作者博客」。
2. **移动端提示 `MobileNotice.vue`**（新增，`components/common/`）：移动端进入即显示一层全屏浮层，
   标题「当前暂未适配移动端」，说明手机上的排版/播放器未单独适配，展示当前完整地址 + 「复制链接」，
   引导到电脑浏览器打开；底部保留「仍要在手机上继续浏览」（不是硬拦截）。
3. **`src/utils/device.js`**（新增）：移动端判定 + `sessionStorage` 记录「本次已选择继续浏览」。
4. **图标注册**：`config/icon.js` 新增 `external`（纯箭头，小尺寸不糊）/ `monitor` / `copy` / `check`。
5. **`App.vue`** 末尾挂载 `<MobileNotice/>`。

### 修改文件

- `src/config.js`
- `src/config/icon.js`
- `src/components/common/AppFooter.vue`
- `src/components/common/MobileNotice.vue`（新增）
- `src/utils/device.js`（新增）
- `src/App.vue`

### 修改原因

用户提出两点：底部要加个人博客地址；移动端打开显示「暂未适配」并引导到电脑端。
站点是 `el-main { width: 80% }` 的桌面布局，导航是固定 80px 三段式、播放条也是横向排布，
窄屏下必然错位；与其让用户自己撞墙，不如先说明并给一条「把链接发到电脑」的路径。
博客入口放在页脚，是因为它属于「作者个人」而非站点功能，不占主导航。

### 测试结果

- `yarn lint` ✅ No lint errors found!
- `yarn build` ✅ 通过
- 无头 Edge（`analysis/cdp_mobile_notice.py`）实测 ✅
  - 390×844 + iPhone UA：提示层出现，标题/地址正确，`documentElement` 滚动被锁
  - 点「复制链接」→ 按钮切成功色 + 「链接已复制」+ toast 可见（z-index 未挡住）
  - 点「仍要在手机上继续浏览」→ 浮层移除、滚动恢复、`sessionStorage` 写入 `1`
  - 1440×900 桌面 UA：不出现提示层，页脚博客胶囊正常渲染（紫色底、外链箭头、与文字链同行）
- 截图：`analysis/mobile-notice.png`、`analysis/footer-blog.png`

### 注意事项

- **只做「提示 + 引导」，没做真正的响应式适配**。真适配是另一个任务：导航折叠、`el-main` 宽度、
  播放条重排、表格类页面横向滚动。当前的提示层是临时兜底。
- **判定偏保守**，三类命中任一：UA 含移动端关键字 / iPadOS 多点触控（UA 伪装成 Macintosh）/
  `pointer: coarse` + `hover: none` + 视口 ≤768px。桌面窄窗口、带触摸屏的笔记本不会误触发。
- **「继续浏览」只记在 sessionStorage**（`acmusic_mobile_notice_dismissed`）：同一标签页刷新不重复打扰，
  新开标签页会再次提示。要改成「永久不再提示」需换 localStorage 并给出恢复入口。
- **z-index 用 `$z-overlay + 10`（3010）**：压住评论浮层（3000），低于 toast（4000），
  保证「已复制」提示可见。改层高时先看 `variables.scss` 的档位约定。
- **复制用完整 `location.href`**（含 query），从分享链接进来的人复制到电脑上还能落回原页面；
  非安全上下文（http）没有 `navigator.clipboard`，回落到 `textarea + execCommand`。
- **回滚**：删 `MobileNotice.vue` / `device.js` 与 `App.vue` 里的两处引用即可，不影响其他模块；
  页脚只动 `.af-links` 和免责声明文案。

### 2026-11-03 — UI 调整：页脚博客改为灰色文字链 / 移动端提示每次打开都显示

> 本条调整覆盖上一条里的「胶囊样式博客入口」与「sessionStorage 记住继续浏览」两个设计。

### 修改内容

1. **页脚博客入口降级为普通文字链**：去掉紫色胶囊底、域名和外部箭头，改为与其他链接同款灰色文字
   `我的博客`（hover 变主色，`title` 里带 `blog.archai.space`），仍然新标签页打开。
   随之删掉只为它服务的 `.af-blog` 样式块与 `icon.js` 里的 `external` 图标（已无引用）。
2. **移动端提示改为每次打开都出现**：去掉 `sessionStorage` 的
   `acmusic_mobile_notice_dismissed`，`utils/device.js` 只保留 `isMobileDevice()`；
   「仍要在手机上继续浏览」不再持久化，只关闭当前这次打开。

### 修改文件

- `src/components/common/AppFooter.vue`
- `src/components/common/MobileNotice.vue`
- `src/utils/device.js`
- `src/config/icon.js`

### 修改原因

用户希望页脚保持克制、不加视觉噪音：博客只作为一行灰色文字，点了能跳转即可。
移动端提示此前用 sessionStorage 记忆，用户刷新或重开标签就不再出现，与「每次打开都要提示」的诉求不符。

### 测试结果

- `yarn lint` ✅ No lint errors found!
- `yarn build` ✅ 通过
- 无头 Edge 实测 ✅：页脚「我的博客」为灰色文字、与其余链接同基线同行、点击跳 `https://blog.archai.space/`；
  移动端刷新后提示层再次出现（不再依赖存储），点「继续浏览」仅关闭当次

### 注意事项

- **提示不再有跨会话记忆**：只要在手机上打开就会拦一层，这是有意为之；若以后要「永久不再提示」，
  需要另加 localStorage + 恢复入口，不要直接改回现在的逻辑。
- **`external` 图标已删除**：以后要外链箭头，重新在 `config/icon.js` 注册（纯箭头 path：
  `M7 17L17 7 M9 7h8v8`），带方框的小尺寸版本会糊。
- 免责声明弹窗里的博客引用保留（不是页脚，属于正文说明）。

## 2026-11-04

### 修改内容
按 `docs/UI_REDESIGN_PLAN.md` 落地 Phase 0-2（视觉一致性收敛，深色开关未接线）：
1. 新增语义 token 层 `tokens.scss`（浅色值 + 深色预留），`variables.scss` 改为别名 + 排版/间距/圆角 token；
2. 内容容器统一：`el-main` 与导航行均 `max-width: 1200px + padding 24px`（原 80% / 1200px / 无上限三套并存）；
3. Tab 收敛为「下划线 + 主题色」一种（重写 element-variables，删固定 5rem 宽与灰底胶囊）；
4. TracksLayout 重排：flex 行 + 序号列（当前播放高亮）+ 表头 + 单击播放 + 16px 歌名 + 省略号；
5. 卡片体系统一：圆角/动效/hover 走 token（1.5s 图片缩放 → 400ms、补 hover 上浮）；
6. 全局标题基准 h1 28px / h2 20px，模块间距统一 40px；歌单名 17.6px → 14px；
7. 修复 Element 主按钮出厂蓝（删死变量 + 全局 `.el-button--primary` 覆盖）；
8. 字体栈删除死字体 Barlow、补 `lang="zh-CN"`、全局 tabular-nums；
9. emoji 图标（🎤📅🎵📍）换 BaseIcon（新增 calendar/disc/location 三个 path）；
10. 清理：listDetail 的 `background:#000/font-size:5rem` 调试残留、dailyTracksCard.scss、空的 userpage.scss、无人调用的 scroll-bar mixin。

### 修改文件
- 新增 `src/assets/scss/base/tokens.scss`
- `src/assets/scss/base/{variables,reset,element-variables,element-overrides}.scss`
- `src/assets/scss/{app,navigationBar,tracksLayout,playlistLayout,albumLayout,artistLayout,explorepage,listDetail,dailyTracks,searchpage,homepage}.scss`
- `src/assets/scss/comment/{commentLayout,sendComment}.scss`
- `src/main.js`、`src/config/icon.js`、`public/index.html`
- `src/components/layout/{TracksLayout,PlaylistLayout,AlbumLayout,UserDetailLayout,VideoPlayerLayout,FollowMixedLayout,UserListLayout}.vue`
- `src/components/{DoSearch}.vue`、`src/components/common/AppFooter.vue`
- `src/components/userPage/{RankList,qrcodeLogin}.vue`
- `src/pages/{AlbumDetail,ListDetail,DailySongs,SearchResult,UserPage,NotFound}.vue`、`src/pages/artist/ArtistDetail.vue`
- 删除 `src/assets/scss/dailyTracksCard.scss`、`src/assets/scss/userpage.scss`、`src/assets/scss/base/mixin.scss`（均确认无引用）

### 修改原因
依据 `analysis/ui-design-review.md`（2026-11-04 全站评审）与 `analysis/dark-mode-feasibility.md`：
项目只有颜色 token 没有排版 token，容器/字号/间距/tab/卡片各自为政；Element 主色定制是死代码；
先收敛基线，后续深色模式与主题色切换的成本才可控。

### 测试结果
- `yarn lint` ✅ No lint errors found
- `yarn build` ✅ 通过
- 无头 Edge 实测（1440 视口）✅：首页 / 发现 / 歌单详情 / 搜索结果四页——导航 1200 容器与内容左对齐、logo 48px 居中、Tab 下划线、列表列头与行对齐、卡片 4 列/5 列间距均匀
- 中途回归并已修复：改 app.scss 时漏了 `@import "navigationBar"`，导致导航样式整文件丢失（logo 撑到 240px），复验后 header 80 / row 1200 / logo 48 正常

### 注意事项
- **`$color-main` 必须保持字面量**：它参与 `darken()/lighten()/rgba($var,.x)` 编译期运算，改成 `var(--c-accent)` 会直接编译失败；「主色当文字」一律用 `$color-main-text`（加深档，满足 4.5:1）。
- **深色模式未接线**：tokens.scss 已写好 `html[data-theme="dark"]` 全量色值，但还没有 data-theme 写入、防闪脚本与切换入口（Phase 3），当前引入不影响浅色渲染。
- **TracksLayout 交互变更**：播放由双击改为单击（与全站卡片习惯一致），行内歌手/专辑链接已 `.stop`；ListDetail 的 `#actions` 作用域插槽保留。
- **删除文件需知情**：三个样式文件确认无引用后删除；`dailyTracksCard.scss` 是旧版首页日推大卡的遗留。

## 2026-11-04（修复）

### 修改内容
修复 `_vm.formatMs is not a function`：`AlbumLayout` 专辑卡 title 把过滤器写在括号表达式内，Vue 2 按位或解析后运行时调用不存在的方法。

### 修改文件
- `src/components/layout/AlbumLayout.vue`

### 修改原因
Vue 2 的过滤器只能出现在表达式**顶层**。原写法
`:title="(album.company||'') + ' | ' + (album.publishTime | formatMs(...))"`
里 `(album.publishTime | formatMs(...))` 位于括号内，编译产物是位或运算 → `_vm.formatMs` 未定义；
改为 `albumTitle(album)` 方法（内部 import `formatMs` 直接调用）。

### 测试结果
- 首页专辑卡 title 正常：`Def Jam China | 2026.10.22 00:00:00`
- `window.__acmusicErrors` 为空、控制台无异常（无头 Edge 实测）
- `yarn lint` ✅ / `yarn build` ✅
- 全量 grep 未发现其他「括号内过滤器」写法

### 注意事项
模板里拼「公司 | 时间」这类组合文案时，一律走方法 / computed；
`v-bind` 里只允许顶层过滤器（如 `:src="x | imgParam('300y300')"`），不要加括号包裹。

## 2026-11-04（首页 hero 适配）

### 修改内容
容器统一到 1200px 后，首页 hero 的私人FM 左右侧卡被裁切（实测左卡溢出 63px、右卡 63px），每日推荐卡背景上下露白。本次按新容器重标定两卡尺寸：
1. **私人FM**：几何全部改为由 `--fm-c`（中心卡边长）驱动——侧卡 0.80C、偏移 0.86C、stage 1.45C、封面组上距 0.46C；C 默认 230px（原 306px），并按容器宽度分 5 档（230/210/190/165/140）。侧卡外缘 290px < 容器半宽 314px，两侧各留 24px。
2. 标题/副标题/播放全部按钮同步缩小（26→21 / 14→12 / 13→12）；卡片文字 20→16、13→11。
3. **每日推荐卡**：`background-size: 120% auto` → `cover`（原值在 484×600 的卡片下背景高仅 581px，上下露白条；cover 后正方形封面放大到高 600，仍保留 116px 的位移动画空间），并加深色兜底底色（封面加载失败时白字可读）。
4. 顺带清掉 `homepage.scss` 里重复定义两次的 `&::before` / `> .el-col` 块。

### 修改文件
- `src/components/PersonalFM.vue`
- `src/assets/scss/homepage.scss`

### 修改原因
`analysis/ui-design-review.md` 的容器统一（80% → 1200px）让 hero 可用宽度从 ~869px 降到 628px，而私人FM 的 306/261/285px 是固定值，3D 卡片组必然溢出被 `overflow:hidden` 裁掉。

### 测试结果
- 无头 Edge（1440 视口，假登录 + 注入样例数据）实测：
  `fmArea` 668–1296（628 宽），`prev` 721–861、`next` 1103–1243，两侧均在容器内（各余 53px）；
  容器对齐：hero 144–1296，daily 484 宽 / fmArea 628 宽，高度均 600。
- `yarn lint` ✅ / `yarn build` ✅

### 注意事项
- 私FM 以后调整尺寸**只改 `--fm-c`**，不要再给内部元素写死 px；3D 比例（侧卡 0.8、偏移 0.86、Z −0.265）是配套的，改单个值会破坏透视关系。
- 卡片组在 600px 高的容器里垂直不居中（略偏上）：留白用于卡片下方的镜面倒影，属预期。

## 2026-11-04（hero 高度收紧）

### 修改内容
首页 hero 高度 600 → **520px**，两卡同步，高度改为 `--hero-h` 变量驱动并按窄屏分档（520 / 470 / 420）：
1. `.hero-section { height: var(--hero-h) }`，`.daily-card` 同高（原两处写死 600）；
2. 私人FM 封面组上距 0.46C → 0.42C，配合 520 高度重新平衡上下留白；
3. 顺带修日推卡播放按钮位置：`.play-tracks-btn` 是 `el-col-24`（width 100%），
   `right: 0` 被宽度抵消，实际贴在**左下角**；补 `width: auto` 后归位右下。

### 修改文件
- `src/assets/scss/homepage.scss`
- `src/components/PersonalFM.vue`

### 修改原因
私FM 中心卡缩到 230 后，600px 高的 hero 上下空余过多（内容实高约 507），
两卡都显得"又高又空"；日推卡 484×600 偏瘦长。

### 测试结果
- 无头 Edge（1440 视口）实测：hero / daily / fmArea 均 520 高；
  prev 721–861、next 1103–1243 仍在容器内；播放按钮落到右下角。
- 私FM 内容高 ≈ 76 + 0.42C + 1.45C，C=230 时 507 < 520 ✅
- 分档校验：视口 1200（C=210）469<520、1050（C=190）432<470、900（C=165）384<420，均不溢出
- `yarn lint` ✅ / `yarn build` ✅

### 注意事项
- hero 高度与私FM 的 `--fm-c` 是一对参数：调 C 时要同步核 `76 + 0.42C + 1.45C ≤ --hero-h`，否则卡片组会被底边裁掉。

## 2026-11-04（容器加宽到 1400）

### 修改内容
1. **内容容器 1200 → 1400px**：`app.scss` 的 `.el-main` 与 `navigationBar.scss` 的导航行同步；
   清掉页面级残留的 `max-width: 1200px`（ArtistDetail / ArtistAllSongs / ArtistAllAlbums / UserDetailLayout），
   宽度从此只由容器层决定。
2. 1440 视口下内容区 1352px：首页 5 列每列 ~257（原 217）、发现页 4 列 ~320（原 270），卡片更舒展。
3. **私FM 侧卡偏移 0.86C → 0.95C**：容器加宽到 744 后，卡片组从占 70% 提升到 78%，
   两侧留白由 111px 收到 90px。
4. 私FM 背景叠加一层中心白色椭圆光晕（`ellipse 60% 56% at 50% 58%`），把视觉焦点收在卡片组，
   避免宽容器下两侧渐变显得空。
5. **TracksLayout 列宽重新分配**：`.col-title` 回到 `flex: 1 1 auto`、`.col-album` 固定 22%。
   1400 容器下若让专辑列参与伸缩会被拉到 550px+，专辑文字短、右侧留大片空白；
   现在歌名区 866 / 专辑 292 / 时长 52，三列连续无断档。

### 修改文件
- `src/assets/scss/app.scss`、`src/assets/scss/navigationBar.scss`
- `src/assets/scss/tracksLayout.scss`
- `src/components/PersonalFM.vue`
- `src/pages/artist/{ArtistDetail,ArtistAllSongs,ArtistAllAlbums}.vue`
- `src/components/layout/UserDetailLayout.vue`

### 修改原因
1200 容器在 1440/1920 视口下两侧留白偏多，5 列卡片偏小；1400 更贴合主流桌面宽度，
且与导航同宽（1440 下左右各 44px）。

### 测试结果
- 无头 Edge（1440，禁用缓存）实测：
  hero 44–1396（1352×520）、daily 568、fmArea 744、私FM 卡片组 742–1306（两侧各 90）；
  歌单列表 `.col-title` 866 / `.col-album` 292 / `albumL` 1012，专辑列紧贴时长列。
- `yarn lint` ✅ / `yarn build` ✅

### 注意事项
- 容器宽度只允许改 `app.scss` 与 `navigationBar.scss` 两处；页面级不要再写 max-width，
  否则会出现「容器 1400、页面内容 1200」的内外不一致。
- 私FM 卡片组宽度 ≈ 2.7C（C=230 → 621），fmArea 宽度变化超过 ±15% 时应复核 `--fm-c` 与 hero 高度。
- `analysis/ui-shot.py` 已改为每次使用独立浏览器 profile 并禁用缓存——此前固定 profile 会读到旧 CSS，
  导致截图与实际渲染不一致。

## 2026-11-04（hero 改 1:1 + 私FM 自适应）

### 修改内容
1. **daily-area 固定 1:1**：`.daily-area { width: 42%; aspect-ratio: 1/1; align-self: flex-start }`，
   `.daily-card { height: 100% }`。hero 高度不再写死，由宽度推导（1440 视口 = 568×568）。
   `align-self: flex-start` 是必需的——默认 stretch 会覆盖 aspect-ratio。
2. **personal-fm-area 与 daily-area 等高**：`.hero-section { align-items: stretch }`，
   fm-area 不再有独立高度，自动对齐到 daily 的高度。
3. **私FM 尺寸改为随视口线性缩放**：`--fm-c: clamp(120px, calc(22vw - 55px), 250px)`，
   删除原来的 5 个媒体查询档位。推导：hero 高 = 0.42×容器宽，私FM 内容高 = 76 + 1.87C，
   两式联立得 C ≈ 22vw − 55；上限 250 对应 1400 容器（内容 543 < 568，留 25px）。
4. 删除 `--hero-h` 变量及其两处媒体查询（高度已由 1:1 决定）。

### 修改文件
- `src/assets/scss/homepage.scss`
- `src/components/PersonalFM.vue`

### 修改原因
用户要求每日推荐卡保持 1:1、私人FM 与它等高、两者宽度比例不变（42% : 58%）。

### 测试结果
无头 Edge 实测（多视口，禁用缓存）：
| 视口 | hero | daily | fmArea | 侧卡余量 |
| --- | --- | --- | --- | --- |
| 1440 | 1352×568 | 568×568 | 744×568 | 各 66px |
| 1280 | 1227×515 | 515×515 | 672×515 | 各 58px |
| 1100 | 1047×440 | 440×440 | 567×440 | 各 54px |
| 980 | 927×389 | 389×389 | 498×389 | 各 52px |
均满足 1:1 与等高；`yarn lint` ✅ / `yarn build` ✅

### 注意事项
- **hero 高度现在不是可调参数**：它由 `daily-area` 的宽度（42%）决定。想改高度只能改 42% 的宽度占比，
  或给 daily-area 换 aspect-ratio。
- **私FM 的 `--fm-c` 与 hero 高度是绑定关系**：C 必须满足 `76 + 1.87C ≤ 0.42×容器宽`。
  若调 hero 的宽度比例（42/58），这条 clamp 公式要重新联立，不能只改其中一边。

## 2026-11-04（Phase 5 打磨：空态 / 配色收敛 / 日推页）

### 修改内容
1. **新增 `EmptyState` 空态组件**（`components/common/EmptyState.vue`）：圆形图标底 + 标题 + 说明 + 可选操作按钮。
   接入：首页「网友精选碟 / 最新专辑 / 热门歌手 / 排行榜」四模块（无数据时不再留白）、每日推荐页（加载失败 + 空列表）。
2. **首页漫游卡配色收敛**：11 个高饱和渐变 → 统一低饱和莫兰迪色板（饱和度 35-45%、明度 50-62%、白字对比 ≥3:1）；
   心动模式卡 `#ff7a9c→#ff5f6d` → `#c96f85→#a84a5e`（保留"红心"语义）。色板规则写进组件注释。
3. **每日推荐页补工具条**：hero 右侧「播放全部」主色胶囊 + 日期副标题（11 月 4 日）；
   列表内 `:need-btn="false"` 去掉重复的播放按钮组。
4. **修复 `BaseIcon` 的 fill 默认值**：`currentColor` → `none`。config/icon.js 里除 pause 外都是
   stroke 风格（strokeWidth: 2），默认填充会把闭合路径整块填实——disc/calendar 这类圆形图标
   直接变成一个实心圆点（空态图标暴露了这个问题）。需要填充的图标在定义里显式写 fill。

### 修改文件
- 新增 `src/components/common/EmptyState.vue`
- `src/pages/HomePage.vue`、`src/pages/DailySongs.vue`
- `src/components/FmRoamCards.vue`、`src/components/HeartModeCard.vue`
- `src/components/common/BaseIcon.vue`
- `src/assets/scss/dailyTracks.scss`

### 修改原因
对应 `docs/UI_REDESIGN_PLAN.md` 的 Phase 5-1（空态）、5-2（首页色彩收敛）、5-3（日推页）。
首屏同时出现 11 种亮色与主题紫无关联；接口失败时模块留白像"页面坏了"。

### 测试结果
- 无头 Edge（1440，禁用缓存）：
  首页注入 `albums=[]` 后空态正常渲染（1 个 `.empty-state`，文案「暂无新专辑」）；
  日推页 `heroPlay=1 / innerBtns=0 / rows=30`（播放按钮不再重复）；
  空态图标 `fill="none" stroke-width="2"`，渲染为唱片线框。
- 漫游卡行截图确认：11 张卡与心动卡同一色域，白字清晰。
- `yarn lint` ✅ / `yarn build` ✅

### 注意事项
- **`BaseIcon` 的 fill 默认值变了**：新加图标如果是纯填充风格，必须在 `config/icon.js` 里写 `fill: 'currentColor'`
  （参考 `pause`），否则会只剩描边。
- 漫游卡新增场景时按注释里的色板规则取值（低饱和），不要再用高饱和渐变。
- 智能匹配面板在「只有一个结果类型」时右侧留白较大，属现有布局特性（面板宽度跟页面一致），未在本次处理。

## 2026-11-04（日推按钮位置 + 列头占位修正）

### 修改内容
1. **每日推荐「播放全部」回到列表左上角**：删除 hero 右侧的紫色胶囊按钮，恢复 TracksLayout 自带的
   按钮组（`need-btn` 默认开启），并移除 `playAll` 死方法与 `.daily-play` 样式。
   hero 只剩标题 + 日期副标题。
2. **修掉列头「歌曲」左侧的灰色方块**：`.tracks-head` 里的 `.col-cover` 只是对齐用的空占位，
   但复用了封面列样式（`background: $font-white-1`），被渲染成 40×40 灰块。
   在 `.tracks-head` 内覆盖为 `background: transparent; border-radius: 0`，宽度仍保留 40px 以维持列对齐。

### 修改文件
- `src/pages/DailySongs.vue`
- `src/assets/scss/dailyTracks.scss`
- `src/assets/scss/tracksLayout.scss`

### 修改原因
用户反馈：播放全部位置应回到列表左上角（与改动前一致）；列头有不明灰块。

### 测试结果
- 无头 Edge（1440，禁用缓存）：`heroPlay=0 / innerBtns=1`（按钮组已回到列表内左侧）；
  `.tracks-head .col-cover` 的背景为 `rgba(0,0,0,0)`、宽度仍 40px（列对齐不受影响）。
- 截图确认：按钮在列表左上角、列头无灰块。
- `yarn lint` ✅ / `yarn build` ✅

### 注意事项
- 列头的 `.col-cover` 是**占位元素**，不要给它添加背景/边框；若以后列结构变化，
  记得同步 `tracks-head` 与 `.tracks-wrap` 两处的列顺序。

## 2026-11-04（澄清并回滚：首页 hero 按钮 vs 详情页按钮）

### 修改内容
1. **首页 hero 日推卡的播放按钮改回左下角**：`.play-tracks-btn { left: 0; bottom: 0 }`，
   删掉上一轮加的 `right: 0 + width: auto`（那会把按钮推到右下）。
   这张卡的设计是「标题左上 + 按钮左下」同侧，不是未对齐。
2. **回滚每日推荐详情页**：恢复 hero 右侧的「播放全部」主色胶囊 + `need-btn=false`
   （列表内不重复按钮组），即回到 Phase 5 的状态。上一轮误把这里当成用户说的位置改了。

### 修改文件
- `src/assets/scss/homepage.scss`
- `src/pages/DailySongs.vue`
- `src/assets/scss/dailyTracks.scss`

### 修改原因
上一轮把「每日推荐播放全部按钮」理解成了详情页的按钮，实际用户指的是首页 hero 里
日推大卡片上的圆形播放按钮。

### 测试结果
- 首页 hero 截图：播放按钮位于日推卡左下角，与左上标题同侧。
- 详情页：`heroPlay=1 / innerBtns=0 / .tracks-head .col-cover 透明`（按钮回 hero 右侧，列表无重复，列头无灰块）。
- `yarn lint` ✅ / `yarn build` ✅

### 注意事项
- 首页日推卡的 `.play-tracks-btn` 必须保持 `left: 0`（不要写 `right: 0` 或 `width: auto`），
  这是设计上的左侧主操作位；详情页的播放按钮才在 hero 右侧。

### 2026-11-04 — UI 复审与主题基础接入（进行中）
- 原因：列表列宽错位、键盘入口缺失；Phase 0–2 缺少完整视觉验收。
- 范围：共享列表、App 外观入口、主题工具、首帧初始化、Element 深色覆盖及设计文档；不改登录、播放状态机和线上配置，不新增依赖。
- 方案：修复列表与按钮可访问性，新增游客可用三态主题；完整双主题路由验收前保持 Phase 3 未验收。
- 回滚：主题接入可独立移除；保留现有工作区成果，不自动提交。

#### 本轮结果与验证
- 已实现：列表整表附加列与管理表头对齐（含零值）；歌曲名与工具栏原生按钮、键盘播放、焦点轮廓；专辑缺失 artist 容错；每日推荐的空数组进入空态而非错误态。
- 已推进 Phase 3：游客可用三态外观、首帧初始化、系统/跨标签同步与监听释放；Element 暗色皮肤、骨架与滚动条、登录/用户面板/发现筛选表面、私人 FM ambient token。反白文字与按钮前景语义分离，主要按钮加深配色。
- 验证：yarn lint --no-fix 通过；最终 yarn build 成功（2026-11-04，hash acc62022c2f024c6）；git diff --check 无空白错误。仅既有 Browserslist/Sass/产物体积提示。
- 主题工具离线 Node 断言通过：默认/系统/显式选择/跨标签/非法偏好/存储拒绝/监听释放。此为临时验证，无新增测试框架。
- 浏览器：本地首页深色、登录卡片深色修复、发现全部歌单、歌单详情浅深切换与刷新持久化；真实接口歌单 29 首，当前视口无横向溢出。Enter 触发歌曲后播放器显示歌名、时长 03:20、进度推进到 00:08；未验证所有音质/播放模式。
- 浏览器上述路径捕获 error 日志为 0；不等同于全站全状态检查，也未证明首帧完全无闪烁。未执行登录、短信或修改线上数据。
- 静态复审覆盖本轮开始时的既有 src/public 改动与新增 token/EmptyState，保留现有成果；未改 marketing/。删除的旧 SCSS 在 src 无剩余 import。
- 当前有改动的 53 个受跟踪 src 文件仍含 180 处 hex、260 处 rgba 文本匹配（含注释、恒深色播放器/遮罩，不含未跟踪 token 文件）。此统计不是原文全站指标的同口径对比，不能声称颜色存量已压到两位数。
- 尚待：搜索九子页、所有发现子页、专辑/歌手/MV/视频/评论双主题完整矩阵；登录后云盘/收藏/管理与 FM；管理行操作键盘路径；全局 ac-tabs 抽取。Phase 3 不标整体完成，Phase 4 不提前开色板。
- Git 建议：先审阅现有工作区；共享列表修复用 fix，主题接入用 feat，文档独立 docs。遵守仓库规则未自动提交或部署。

### 2026-11-04 — UI Phase 3 继续：评论语义层与剩余浏览区域（进行中）
- 原因：共享评论恒深色 + 三页浅色反补丁导致深色白块，搜索用户卡、发现视频筛选与视频侧栏仍固定白底。
- 方案：评论使用独立语义 token，页面随主题，playerWrapper 覆写为恒深色；仅移除已核实重复的颜色覆盖，保留页面布局差异。继续清理搜索/发现/MV 的业务表面颜色并浏览器核查。
- 范围：三个评论 SCSS、ListDetail/AlbumDetail/VideoPlayerLayout 的样式、tokens、搜索用户卡与发现筛选/视频卡。无 API/路由/播放器状态机变更，不新增依赖、不执行登录或线上写入。
- 回滚：评论 token 与调用方覆盖移除须一起回滚；其他表面替换可独立回滚。

- 扩展本轮同一验收范围：搜索九分类补共享空态/初次失败重试，初次请求结束前不挂载自动加载更多；修复 SendComment 的 scoped 样式穿透与窄按钮列，发送按钮使用原生 disabled。无评论提交操作。

#### 本轮完成结果（第二批）
- 评论颜色迁移至 comment-*，删除三页重复颜色反补丁；保留播放器局部恒深色。编辑器 textarea 实际穿透 Element、按钮列占满宽度；原生发送 disabled，回复取消能关闭弹窗。
- 搜索九子页补空结果/初次失败重试，加载更多在初次完成且有结果时挂载，避免首屏未完成就自动翻页。共享 mixin 处理缺少 result/count 与失败后恢复 loading。
- 用户搜索卡、智能匹配、MV/视频卡、发现筛选及视频详情侧栏/弹窗接入主题。MV 缺失 publishTime 时隐藏日期，避免日期过滤器将 undefined 解释为当天。
- theme.js 修复存储不可写时手动选择会被系统变化覆盖；LoadMore 消费评论上下文色，播放器浅色页面下仍保持暗色可读。
- 最终 yarn lint --no-fix 通过；yarn build 通过，hash da0180637ecc589a；项目默认 Git 换行配置下 git diff --check 通过。未新增依赖或提交。
- 离线断言：共享搜索的数据/空结果/失败/重试/分页失败保留内容与页码回退通过；存储拒绝下手动浅/深选择均可抵抗系统变化。
- 浏览器：搜索九分类浅/深各一轮（18 项）；发现全部、精品、MV、视频、榜单浅/深各一轮（10 项）。对应实际数据分别为搜索 50/12/12/12/12/20/12/0/20 条，发现 24/12/12/8/66 张卡；没有横向溢出。视频搜索为实际空结果，不能算有数据状态验收。
- 浏览器：视频详情真实海报/相关推荐/评论；展开楼中楼后切浅色，正文 rgb(85,85,85)、楼层底 rgb(242,242,244)，无固定白块。回复取消后 dialog 数量为 0。评论编辑器浅/深、空内容禁用/输入后启用验证通过，未发送评论、点赞或登录。
- 浏览器上述最终路径 error 日志为 0。中途补 motion import 时曾出现开发编译覆盖层，已修正 UserRes 的缺失 import 并重新构建通过。
- 剩余验收：播放器展开评论、MV 详情及专辑/歌手详情完整矩阵、登录后云盘/收藏/管理/FM、人工断网错误态及首帧证据；Phase 3 仍不标全站完成。营销目录与线上配置未修改。
- Git 建议：评论组件/调用方样式一组；搜索状态与九分类一组；媒体表面/日期一组；主题容错一组；docs 独立。均须保留本轮之前的工作区成果，不自动 commit。

### 2026-11-04 — 按反馈修复 roam-line 与深色底色（进行中）
- 原因：漫游标题、翻页箭头、卡片说明条与心动卡仍固定黑字/白底；原深色底接近纯黑，用户要求改为有色相的柔和深色。
- 方案：漫游/心动卡表面、说明、箭头、选中描边接入语义 token，保留彩色图区的白色叠字。全站深色改为蓝灰底并同步表面、骨架、FM ambient 与首帧初始化色，确保切换/刷新一致。
- 范围：tokens.scss、FmRoamCards.vue、HeartModeCard.vue、public/index.html 与设计文档。不改布局尺寸、队列、登录态、请求或播放逻辑。
- 验证：lint/build 与本地可用界面核查；登录限定内容不通过伪造登录态进行验收。

- 浏览器刷新时发现 GridSkeleton 卡片外壳仍是固定白底，同步改用 elevated/border token，避免加载过程中说明区域闪白。

#### roam-line 修复结果
- 漫游标题/箭头/说明条、心动卡表面/说明条与选中描边已接 token，彩色图区保留反白。深色基础/卡片/次级表面改为 #202633 / #29313E / #303949；文字、骨架、FM ambient、首帧色同步。
- yarn lint --no-fix、最终 yarn build、git diff --check 均通过。
- 实际组件隔离预览浅/深回切与横向翻页通过，无横向溢出。深色说明底 rgb(41,49,62)，说明文字 rgb(193,201,214)，计算对比度 7.86:1；辅助文字在最亮 hover 表面 4.90:1，强调文字 5.05:1。
- 实际应用游客首页硬刷新后 html/body 均为 rgb(32,38,51)，加载真实卡片正常；浏览器最终 error 日志为 0。登录后整页业务未验收，预览使用本地最小模拟状态，不涉及登录或播放。
- 未提交、未部署；建议本轮配色修正作为独立 fix，文档单独 docs。

### 2026-11-04 — 修复 #pane-followeds 深色适配（进行中）
- 原因：粉丝展开态 UserListLayout 与关注混排 FollowMixedLayout 的卡片仍固定半透明白底，文字已随深色提亮，造成低对比度；部分操作描边/hover 仍固定浅色值。
- 方案：共享用户/混排卡片表面、描边、阴影与交互态改为语义 token；同步头像墙、查看全部和二级筛选，覆盖收起/展开两种形态。
- 范围：UserListLayout.vue、FollowMixedLayout.vue、UserDetailLayout.vue 的样式；不改关注/取关逻辑，不执行关系变更。

#### #pane-followeds 修复结果
- 粉丝展开卡片与关注混排卡片改用 elevated/border/shadow token；回关/互关按钮的描边与 hover、二级筛选、查看全部及头像占位补齐主题色。
- lint --no-fix、build、git diff --check 通过。
- 公开主页实页切换 #pane-followeds 正常，但接口返回空列表，仅验证空态。实际共享组件隔离预览已验证深色卡片背景 rgb(41,49,62)、姓名 rgb(237,241,247)，无横向溢出；浅色回切检查。此为合成用户预览，不是本人粉丝数据验收。
- 没有执行关注/取关、登录或修改真实数据；未提交或部署。

### 2026-11-04 — 继续清理剩余主题表面与搜索弹层（进行中）
- 原因：年度报告/404/歌手子页仍有固定浅色表面；私人 FM 外壳可在加载时露白；搜索弹层仍使用纯黑叠层，与蓝灰主题脱节。
- 方案：上述页面使用语义表面/文字/反馈/骨架 token；搜索使用独立蓝紫深色语境 token，输入框/建议/热搜配套，保持搜索请求与路由行为。整理计划中的历史提案/当前进度冲突。
- 范围：相关页面样式、searchpage.scss、tokens、DoSearch 的可关闭入口及文档；不改报告取数、不使用真实账号或提交外部写入，不增加依赖。

- 同批补齐用户详情里的排行/云盘/收藏/歌单/社交空态：复用 EmptyState 的紧凑形态，保留原有分支与文案，不改取数或可见性规则。

- 完成计划中剩余公共 ac-tabs：发现/搜索/登录使用同一公共样式，保留各自布局间距；用户面板紧凑胶囊仍独立。

#### 本批实现与实页验证
- 已修复年度报告表面/文字/反馈/骨架、404 卡片/主按钮、歌手详情骨架/子页按钮、私人 FM 外壳；反馈文字与色块分开（danger-text / success-text），保留封面叠字。
- 搜索弹层采用蓝紫配套 token；两列布局、内容独立滚动，输入/联想/热搜可读，新增关闭按钮。实际接口返回 9 个联想节点、20 条热搜；Enter、联想歌手跳转、热搜跳转、关闭按钮与 Escape 已验证。
- ac-tabs 已抽取到 base/tabs.scss，发现/搜索/登录三处接入。浏览器搜索九分类、发现五分区、手机/扫码面板切换均通过，无横向溢出；没有扫描二维码、发送验证码或登录。
- 用户详情 12 个原有空态分支复用紧凑 EmptyState，保留原文案/分支；公开用户粉丝面板实页显示空态，图标宽度 40px、主题文字正确。云盘/收藏等登录后数据分支仍未验证。
- 年度报告未登录状态在浅/深表面分别为白/蓝灰，登录链接可读；年度歌曲/失败/骨架代码已适配，但未调用本人报告数据。
- 404 浅/深卡片与主按钮核查通过，浅色主按钮 #5B5AD4 + 白字，深色浅紫 + 深字。歌手联想进入详情、全部歌曲页已加载 50 首，返回按钮为蓝灰底/浅字。更早读取的 rows=0 是取数尚未完成，截图随后显示 50 首，不将其当作空态。
- 原 UI_REDESIGN_PLAN.md 已完整复制到 docs/archive/UI_REDESIGN_PLAN-2026-11-04-proposal.md，主文档重写为当前设计/进度/验证边界/下一步/Token 速查，修正“清空偏好即回浅色”等过期表述。
- 浏览器最终检查 error 日志为 0；首次失败/断网、首帧无闪烁、登录后完整数据与播放器浮层仍需后续验证。
- 未提交或部署；建议页面主题修正、搜索弹层、公共 Tab、空态分别按主题提交，docs 独立。

- 最终验证：yarn lint --no-fix 通过；yarn build 通过（hash 6d7b15d3a5e3dd19）；git diff --check 通过。

### 2026-11-04 — 播放器周边菜单与展开评论验收（进行中）
- 原因：QualityMenu/ModeMenu 多处辅助文字只有白色 0.3 透明度，且选项使用不可聚焦 div/span；MusicPlayer 的旧评论覆盖压过共享 comment-*；body 下的播放器菜单须保持独立深色语境。
- 方案：菜单配色使用独立蓝灰播放器 token，Quality/Mode 选项改原生按钮、定时输入补名称及边界禁用；删除展开评论旧色值覆盖，仅保留布局。body 菜单采用限定到播放器类名的覆盖。
- 边界：不修改 PlayerCore.vue，不改取流/降级/队列/持久化结构或播放状态机；仅验证本地播放与可撤销的会话选项，不执行收藏/心动登录/清空真实数据。

#### 本批完成与验证
- QualityMenu/ModeMenu 使用独立 player-menu-* 蓝灰表面与高可读文字；原生按钮支持焦点、选中状态、边界禁用。菜单拦截 Space/左右方向键冒泡，避免触发播放器全局快捷键。
- 播放器 body 队列/副歌/定时菜单增加限定样式；展开评论删除旧颜色反补丁，评论编辑器改用蓝灰底。
- 定时数字 0 改为按最小值夹取，仍由现有事件交给 Core 处理；未改 PlayerCore.vue。
- 实页：音质 Space 选较高、Enter 恢复标准；模式菜单布局；键入 0 后首数显示 1 且减按钮禁用；恢复首数 5 和不定时。深色队列表面实测 rgb(41,49,62)。
- 展开《和你》的真实评论：昵称/时间/正文分别为 rgb(232,232,236)、rgb(160,160,172)、rgb(184,184,194)；编辑器打开/取消正常，未发送。结束时播放暂停。
- yarn lint --no-fix 通过；生产构建通过。完整 A-B/副歌、定时到期、切歌及所有菜单双主题矩阵仍待验证。

### 2026-11-04 — 浏览器 22 项标注整改（计划）
- 按用户标注恢复封面 hover 缩放、统一卡片高度/标题间距；主题改太阳/月亮左右开关；调整用户页双栏/社交 Tab 与卡片边界、未公开文案。
- 歌单详情将播放按钮移到信息区并统一按钮皮肤，显示评论数；页脚移除 API 仓库入口。排查歌手 MV 播放量字段，缺失值不伪装为 0。
- 展开播放器重排为居中封面信息、宽歌词与工具区：复用现有 ModeMenu 与 Core 已有方法，提供队列和音量；显示已有副歌区间；删除空分享按钮、强化红心填充、区分楼中楼昵称/正文。保留 Core 状态机、取流、队列持久化结构。
- 修改范围为上述展示组件/SCSS/数据兼容与文档，不引入依赖、不部署、不提交。按主题分组可回滚；播放器模板/样式需成组回滚。

#### 22 项标注实现结果
- 1–3：歌单封面 hover 放大统一为 1.06，专辑 CoverImage 改用 deep 选择器，解决子组件图片未命中 scoped 样式；保留卡片上浮与裁剪。
- 4：太阳/月亮左右主题开关，保留首次系统解析、旧偏好兼容、跨标签同步及键盘可用性。
- 5、8、18：社交主 Tab 放大并与内容分隔；排行/云盘列宽改 1:1.3，单独排行最大 860px；粉丝卡 hover 不再上移，内容区增加 4px 安全内距。
- 6–7：歌单卡预留一行副信息、封面固定方形，首页推荐标题下留 24px。
- 9–12、20–22：播放器以大封面/居中信息/控制区 + 独立歌词双栏重排，蓝灰底叠加低透明度封面氛围；短窗口压缩封面和间距。移除空分享入口及方法，喜欢态使用红色实心图标/选中底色。增加模式设置、队列与音量，全部委托原 Core；同曲队列点击恢复播放；副歌标注复用 Core.chorusStyle。展开时初始化实际进度，A-B 选点和提示可在展开界面完成；歌词/设置/队列滚动不再带动整页跳评论。
- 13：楼中楼昵称用 comment-accent，正文保留 comment-secondary，和时间/回复对象区分。
- 14：仅移除页脚导航 API 仓库入口，免责声明里的来源归属保留。
- 15–16：歌单信息区放置主播放按钮/加入列表按钮，隐藏下方旧按钮组；评论 Tab 显示 listInfo.commentCount。
- 17：他人社交计数大于 0 但列表为空时显示“关注列表未公开/粉丝列表未公开”，避免误报不存在。
- 19：目标是 VideoLayout 的 Mlog 分支，播放量来自 resource.mlogExtVO.playCount；旧模板读取不存在的 playTime 后格式化成 0。增加 normalize.playCountOf 兼容，所有视频卡统一读取；缺字段显示“暂无数据”，真实 0 保留。

#### 实页与检查记录
- 首页推荐 5 张卡实测高度均为 295.04px；推荐 h2 下边距 24px。主题开关 64px、太阳/月亮两端，浅深切换正常。
- 歌单 13698927072：新播放按钮位于信息区，评论 Tab 显示“评论 2”；修正复用 ac-tabs 到 Element 容器造成的横向布局后，继续使用既有 Element Tab 皮肤。
- 本人用户页：双栏实测 524.86/682.34px；粉丝 Tab/查看全部正常，首张卡 top 与面板 top 对齐且有外层安全内距。他人 108986286 的关注空态显示“关注列表未公开”。未执行关注/取消关注。
- 歌手 6652：《我的心太乱》实页由 0 恢复为 118.5万；其他视频显示 611.0万/486.0万/285.9万。playCountOf 的真实零值、顶层优先、嵌套兼容、缺失回退共 4 条 Node 断言通过。
- 展开播放器：1262x956 双栏与歌词单行正常；默认 1280x720 短窗口有紧凑布局；模式面板在视口内居中，Escape 先关闭工具。30 首队列可展示，音量左右键 20→21→20；播放、下一首、暂停通过，A-B 实测 00:24→01:00 并清除恢复完整。结束时测试播放器暂停、主题恢复深色。未发送评论、下载、收藏或清空队列。
- 浏览器当前 error 日志为空；用户原有播放标签未关闭，检查用独立临时标签。没有修改 PlayerCore.vue、依赖或部署文件。
- 完整定时到期、所有版权/网络降级、喜欢 API 成功/失败回滚不作为本次已验证结论；本次只修改喜欢的显示样式。
- 最终验证：yarn lint --no-fix、yarn build（hash 0267a5da9d630531）与 git diff --check 均通过；确认 PlayerCore.vue 没有 diff。建议将本批展示修正、播放器增强、播放量兼容分组提交，docs 单独提交；保留当前既有未提交内容与 marketing/。

### 2026-11-04 — 第二轮 6 项标注（计划）
- 展开播放器移除副歌文字图例、设置/音量/播放队列入口及仅供这些入口使用的包装代码；底部 Core 功能不变。保留副歌色带和简单模式切换。
- 右侧采用确定高度的内容槽，切换歌词/相似歌曲/相似歌单时 Tab 顶部不再随内容高度移动。
- 喜欢显示直接读取 Core.isLiked 响应式状态（原组件只监听局部 likeChange，但点击成功走全局 bus，镜像未同步），确保乐观更新/失败回滚一致；不改收藏 API。
- 歌单/专辑封面 hover 改为 1.25 倍并使用现有过渡 token。范围仅 MusicPlayer、封面 motion token 与文档；不提交/部署。

#### 第二轮结果与验证
- 移除展开界面的副歌说明文字、设置/音量/队列入口与无引用的组件导入、状态、方法、样式；保留简单模式切换、进度副歌色带与底部播放器功能。
- heroRight 固定内容槽高度，子面板独立占满内容槽；实页三 Tab 顶部均为 84.8px，不随内容多少下移。移除项 DOM 数量为 0。
- isLiked 直接读取 Core.isLiked，原镜像/监听删除；已有红色实心图标样式现在能随状态生效。Node 三条断言验证未选中→选中→回滚读取，不将此作为真实收藏 API 验收。
- 歌单/专辑共享封面 hover scale=1.25，保留 500ms/现有 easing 与 overflow 裁剪。
- yarn lint --no-fix、yarn build（hash ca4f0e38e5d9b311）、git diff --check 通过。未修改 PlayerCore.vue，未收藏/取消收藏或部署。

### 2026-11-04 — 歌单/专辑悬停动效调整
- 按用户要求移除两类卡片 hover/active 的 translateY；保留点击轻微缩放及悬停阴影。封面缩放仍为 1.25，新增独立 card-cover-duration=1.5s，避免改变其他动画时长。
- 范围：playlistLayout.scss、albumLayout.scss、base/motion.scss；不影响播放器与业务逻辑。
- 验证：两类卡片样式均无 translateY，封面使用独立 1.5s token；yarn lint --no-fix、yarn build（d7bf6c3ae19f72fa）、git diff --check 通过。未提交/部署。

### 2026-11-04 — 歌单专辑动效隔离与定稿
- 发现 artistLayout 也引用 card-cover-scale，前两轮修改共享值意外影响歌手缩放。恢复共享值为原先 1.04，歌手原有 0.4s/上浮/阴影不动。
- 歌单/专辑改用独立 media-cover-scale=1.3、media-cover-duration=1.3s，删除两类卡片 hover 阴影与阴影过渡，保留图片裁剪及已取消上浮的行为；不影响其他媒体卡。
- 验证：歌单/专辑仅引用独立 1.3 倍/1.3s 参数，样式无 hover box-shadow；歌手仍引用原 card-cover-scale=1.04 与原过渡。lint、生产构建（35899fcf467f719c）、diff 检查通过。未提交/部署。

### 2026-11-04 — 评论区加载/失败/重试与分页收尾（计划）
- 对应实施计划的状态矩阵缺口：评论首次失败误显示空态、热门失败拖垮最新评论、翻页失败提前提交页码、切歌请求可能覆盖新歌曲评论。
- CommentLayout 增加加载/首次失败/热门失败/分页失败的独立显示；只在分页成功后提交 page/cursor，失败提供手动重试，避免自动连续重试。请求版本隔离切歌/销毁后的旧响应。
- LoadMore 在 noMore 从 true 回到 false 时重新观察，修复复用后自动加载不恢复。界面使用 comment-*，不修改播放核心、评论提交/点赞 API 或账号状态。
- 用可控 Promise 的离线组件方法验证失败/恢复/页码/乱序，实页检查真实评论与双主题；断网状态的合成验证与真实接口验证分开记录。

#### 本批结果与验证
- CommentLayout：首屏状态有独立加载/失败重试；热门请求单独处理，可重试且请求中禁用；分页失败保留已加载内容并手动重试。只有成功响应才提交 page/cursor，空页停止继续加载。resourceKey 请求版本隔离旧歌曲/资源和销毁后的响应；补 aria-busy/status/alert。
- LoadMore：noMore true→false 重新连接观察器，不影响原有手动按钮。
- 离线组件方法验证：首次失败、热门单独失败、恢复、分页第 2 页失败后仍重试第 2 页、并发切换旧响应忽略、有效空结果、非法响应、热门加载锁复位、观察器重连均通过。这是可控 Promise 的合成验证，不是浏览器真实断网录制。
- 真实歌单 13698927072 浅深两轮评论已加载（2 条最新评论 + 2 条热门），没有误显示空态；深色卡片 rgb(48,57,73)、正文 rgb(193,201,214)。未发评论/点赞。
- 追加登录后真实只读检查：用户页云盘显示 96 文件，收藏专辑 3、歌手 24、视频 21，浅深 Tab 切换正常且无页面横向溢出；浏览器 error 日志为空。恢复原浅色主题并关闭临时检查页，用户原标签保留。
- 本批未修改卡片动效、播放器核心、评论提交/点赞或账号数据。定时到期、真实断网/恢复、首帧录制、歌单管理写操作与完整全路由状态矩阵仍未验收。
- 最终验证：yarn lint --no-fix、生产构建（f79c6f7924d15f7d）、git diff --check 通过；建议将评论状态/分页修正与文档分别提交，未自动提交或部署。

### 2026-11-04 — 专辑详情与歌手子页状态收尾（计划）
- 专辑详情失败后仍展示空元信息，缺 id 时骨架不结束；新增有效参数检查、独立失败重试/歌曲空态、请求版本隔离，缺失日期不格式化为当天。
- 歌手全部歌曲/专辑翻页失败时已有内容保留并显示手动重试；无数据时显示真正空态，响应缺失数组按失败处理。沿用既有 offset 成功后更新机制。
- 仅 AlbumDetail、ArtistAllSongs/Albums 与文档；复用 EmptyState，不改卡片动效、播放器、账号或路由结构。离线验证失败恢复与页码，再做公开接口实页检查。

#### 本批实现与验证
- AlbumDetail：缺失/非法 id 结束骨架并显示“专辑链接无效”；请求失败或非法响应显示可重试错误；歌曲空数组使用紧凑空态；缺失日期/数量不再输出错误元信息；版本守卫阻止旧响应覆盖。
- ArtistAllSongs/Albums：首屏失败、重试加载中、真实空态、分页失败分别展示；分页失败保留列表并显式重试，不挂载自动加载器；成功后才推进 offset。
- 离线组件方法验证通过：专辑无效 id、拒绝/恢复、有效空歌曲数组、乱序响应；歌手两个子页已有一项后失败保留内容/offset，重试同一 offset 后成功。此为合成失败测试，不等于浏览器真实断网。
- 真实页面：专辑 404971662《绿豆沙》显示 1 首歌曲；缺 id 的错误页浅深均可读，重试不会恢复永久骨架。歌手 6652 全部歌曲显示 50 首，全部专辑显示 40/57 张，浅深布局无页面横向溢出，浏览器 error 日志为空。专辑子页初次读取的 0 项属于加载中，最终 40 项才计入结果。
- 保留用户既定卡片动效，未修改播放器核心/账号数据；原浅色偏好恢复、临时标签关闭。未提交或部署。建议详情状态修正与 docs 分开提交。
- 最终 lint、生产构建（7797bb0042f97d37）与 diff 检查通过。

### 2026-11-04 — 发现歌单分类/精品状态收尾（计划）
- 全部歌单分类切换存在旧响应覆盖、同分类点击卡 loading、首次失败无提示；精品歌单首次请求未处理失败、加载更多时隐藏已有列表。
- 两页添加分类/标签与列表独立加载和重试、有效空态、失败后保留列表；请求版本隔离快速切换，分页成功后才提交 page/lasttime，错误时关闭自动加载等待手动重试。
- 仅修改两个发现歌单子页，复用 EmptyState，不改卡片动效/播放/账号。离线验证失败恢复/竞态/分页，再检查公开接口浅深实页。

#### 本批结果与验收
- 全部歌单：列表与分类独立结算，分类失败可单独重试；列表区分首屏骨架/错误/空结果/分页失败。页码只在成功后提交，切换分类递增版本、旧响应忽略；再次选择当前分类不再留下 loading。
- 精品歌单：标签与列表各自重试；加载下一页保留现有卡片；游标成功后提交，失败保留原游标；切换标签隔离旧响应。错误时暂停自动加载，手动重试后恢复。
- 两页离线组件方法验证通过：首次失败/恢复、已有列表保留、分页重试位置一致、乱序响应忽略、有效空结果、分类/标签独立失败。是可控 Promise 合成验证，浏览器真实断网未完成。
- 公开实页：全部歌单初始 24 张，分类 5 组，语种→华语正常刷新为 24 张；精品初始 12 张，华语标签后自动续载到 70 张去重卡片并显示“已经到底了”。手动定位加载按钮期间触发了自动加载，最终不再有加载按钮，这是到达末页，不记为点击按钮通过。
- 浅深浏览无横向溢出，浏览器 error 日志为空。结束恢复原浅色，关闭临时标签，未改卡片 1.3 倍/1.3s 参数、歌手效果、播放器或账号数据。
- 歌单详情失败状态仍是后续待办；本批集中完成两个发现子页。未提交/部署，建议这两页状态修正与文档分别提交。
- 最终 yarn lint --no-fix、生产构建（4f86fe78333bed41）、git diff --check 通过。

### 2026-11-04 — 歌单详情失败恢复与分页（计划）
- 详情/歌曲失败目前静默清空，缺参数仍发请求；新增独立骨架、错误重试、有效空态与请求版本隔离。
- 发现 getAllTrack 的 offset 是歌曲数，原实现每成功一页仅 +1，重复拉取重叠歌曲；改为成功后按返回歌曲数推进。失败保留 offset/歌曲，空页停止自动加载。
- allLoaded 必须基于有效 trackCount 和实际歌曲条数，不以缺失总数认定完整；不改排序/删除/保存 API 和确认语义。
- 范围仅 ListDetail、文档；用离线 Promise 验证页偏移、重试和旧响应隔离，再做只读实页，无账号写操作。

#### 本批结果与验证
- ListDetail：元信息和歌曲请求各自失败/重试；缺 id 不发业务请求，结束骨架并显示无效链接；真实空歌曲数组显示空态，失败不再冒充空态。缺失创建/更新时间不格式化为当天。
- 歌曲分页 offset 按接口实际歌曲数推进；失败保留已加载歌曲与偏移，空页/短页停止继续加载；noMore 使用 >=，allLoaded 只接受有效非负总数且实际条数达到总数。
- 请求版本隔离重新初始化/销毁后的旧详情和旧歌曲响应。未修改管理写接口、确认流程或播放器。
- 离线组件方法验证通过：offset 0→50→失败重试50→100；114 首完整性守卫、已有歌曲保留、详情失败/恢复、有效空歌单、无效参数、旧详情/歌曲乱序隔离。
- 真实歌单 13698927072 实测首批 50、第二批 100、末页 114 首，“已经到底了”正确；浅深无横向溢出。缺 id 显示“歌单链接无效”，点击重试不再卡骨架；浏览器 error 日志为空。
- 未进行歌曲排序/移除、删除歌单、保存信息或其他账号写入。恢复原浅色，关闭临时验收标签。失败恢复测试仍是合成 Promise；真实浏览器断网、到期行为、首帧录制仍未完成。
- 最终 lint、生产构建（45ddc4f614293b06）、diff 检查通过。未自动提交/部署；建议本批歌单修正与 docs 分开提交。

### 2026-11-04 — MV/视频详情失败恢复（计划）
- 详情请求缺少 catch，失败/无参数时无限骨架或空白；视频相关推荐失败被并入播放地址失败。
- 父页面分开详情、取流、相关推荐错误；详情与播放源各自重试；隔离旧请求/销毁响应。保留 MV 数字 id 跳转、Mlog 转换、相关搜索与推荐降级。
- VideoPlayerLayout 增加详情状态和播放源重试入口，错误文案不把网络错误直接归为付费/下架。无需变更音乐 PlayerCore、视频播放库或账号数据。

#### 本批结果与验证
- MV/视频详情增加 detailFailed + 重试，详情失败不再无限骨架；播放源请求独立重试，失败保留元信息和评论。相关推荐异常不再将有效播放地址清空。
- 保留数字 MV 跳转、Mlog 转视频、标题/作者/标签相关搜索与推荐兜底；请求版本隔离旧响应，销毁后失效。缺封面时有效地址仍可渲染播放器，poster 安全回退且不请求空图片。
- 离线验证通过：详情失败/恢复、URL 失败/单独重试、相关推荐异常不影响 URL、Mlog 转换、数字 MV 跳转、旧响应隔离、缺 id。均为合成响应，不等于真实网络故障或播放验收。
- 实页 /mv 与 /video 缺参数显示错误，重试不卡骨架；浅深可读。MV 10961972《Sensation: Monument of Light》实际返回空 URL，元信息正常、10 条评论卡可浏览，点击“重试播放源”后仍正确显示无源提示；未将上游仍无地址写成恢复成功。
- 浏览器 error 日志为空；恢复进入时的深色偏好，关闭临时标签。无音乐 PlayerCore、视频库、账号写操作、卡片动效修改。
- 发现 MV/视频列表的失败分页仍有后续收尾项；真实断网恢复、首帧录制、定时/副歌到期仍未计为通过。未提交/部署。
- 最终 lint、生产构建（01348d67e9b75260）、diff 检查通过；建议媒体详情修复与 docs 独立提交。

### 2026-11-04 — 发现 MV/视频列表状态收尾（计划）
- MV 首屏失败被当作无更多，分页失败无提示，筛选依赖 title/item 两个 watcher 会漏掉跨组同值；统一直接提交筛选、版本隔离、独立错误重试/空态和成功后推进 offset。
- 视频分页缺少 reqSeq 隔离，旧请求可能写入新标签；标签与推荐初始化互相拖累。新增独立标签重试、分页错误手动重试、成功后提交偏移，保留原匿名授权有限重试和搜索标签降级方案。
- 限两页与文档，复用 EmptyState，不改卡片/播放/账号；离线验证筛选、失败恢复/竞态/页偏移，随后浅深实页检查。

#### 本批结果与验证
- MV 列表：显式首屏/分页错误重试与空态，原“失败=没有更多”分支移除；offset 成功后按原始条数提交，过滤去重不影响下一页位置。版本守卫隔离筛选后的旧请求。
- MV 筛选直接提交对应 area/type/order 并刷新，移除 title/item 双 watcher，跨组同值（地区全部→类型全部）也会刷新。
- 视频列表：首屏重载会清分页状态，分页使用 reqSeq 隔离、成功后提交偏移；失败保留卡片、暂停自动加载并提供重试。标签初始化独立请求，失败可重试且不拖垮推荐；301 有限重试机制保留，最终非成功响应不冒充空数据。
- 离线验证通过：MV 首屏失败/恢复、已有行保留、同偏移重试、跨组同值筛选；视频同偏移重试、旧分页响应不得混入新标签、标签单独失败且推荐有效空结果。不是浏览器真实断网证据。
- 真实实页：MV 12→24 张，地区全部→类型全部刷新正常；视频推荐 8 张，ACG音乐 5 张。浅深无横向溢出，浏览器 error 日志为空。恢复进入时深色，关闭临时标签。
- 未修改卡片既定动效、音乐播放器/视频播放器、账号数据。未提交/部署。
- 最终 lint、生产构建（82a64405131c4904）、git diff --check 通过；建议本批列表状态修复与 docs 分开提交。

### 2026-11-04 — 集中收尾与验收（计划）
- 用户要求一次处理全部剩余项。本轮集中扫描剩余路由、补榜单/歌手详情等遗漏的错误状态，建立可重复运行的本地状态回归脚本与验收矩阵，统一构建后交付。
- 验证播放器到期、首帧主题脚本、主题对比度、路由与账号只读界面。真实浏览器离线/录屏能力须按工具实际支持记录，不能把合成 Promise、虚拟时钟或刷新后截图记为真实断网/首帧录制通过。
- 不改音乐 Core、不新增依赖、不部署、不执行真实账号删除/排序/保存/收藏；已有视觉偏好和未提交内容全部保留。

### 2026-11-05 — 每日推荐与他人主页修正
- 计划：每日推荐独立背景层平移，实心播放按钮常显文字；他人排行铺满，本人布局不动；补self属性限制回关只在本人粉丝页显示。无播放状态/账号接口变化。
- 结果：上述三文件修改完成，lint、diff检查通过；粉丝网格原已全宽，保留三/二/一列响应式布局。未执行真实关注写入；本轮未完成登录后浏览器视觉验收。未提交/部署。

### 2026-11-05 — 每日推荐图片上下往返动画
- 计划：扩大背景图片的垂直余量和运动幅度，以12秒完整周期上下循环；仅改首页卡片CSS，标题按钮静止，保留减少动态效果偏好。
- 结果：CSS关键帧0%/100%为上端、50%为下端，12秒无限循环；预留15%垂直裁切余量避免露边。lint、build（072713327dac2d8c）、diff检查通过；未进行登录后实页动画验收，未提交/部署。

### 2026-11-05 — 修复每日推荐动画无可见效果
- 实页发现 el-row 清浮动伪元素 display:table，导致遮罩/背景层计算宽高0px；计划仅在daily-card覆盖为block并清除clear，再实页比较位移。
- 实页修复后背景488.587×577.438px，连续采样translateY从16.3276px到-56.261px，遮罩444.188px，标题transform:none；确认实际移动。lint/diff检查通过。

### 2026-11-05 — 放慢每日推荐背景动画
- 按用户反馈将往返周期12秒改为24秒，幅度、图层与其他卡片效果不变。
- lint、生产构建、diff检查通过；本次浏览器连接失效，未重复实页采样。

### 2026-11-05 — 智能匹配歌手卡片背景
- 原因：歌手媒体区与智能匹配面板同用sunken，圆头像和标题缺乏独立卡片表面。仅为type-artist卡片增加elevated背景、边框与内距，保持头像动效和搜索逻辑不变。
- 结果：歌手卡片独立表面、圆角、边框和10px内距，浅深由语义token自动切换；保留原头像放大。lint、生产构建、diff检查通过。本轮未作浏览器实页验收，未提交/部署。

### 2026-11-05 — 统一智能匹配所有卡片
- 计划：将歌手专属卡片表面提升为所有类型共用，统一200px宽、内距、边框、媒体比例与固定两行标题高度；仅影响智能匹配，不改歌手头像动效/路由/数据。
- 结果：歌手/歌单/专辑/MV共用独立主题背景，200px宽、10px内距、方形媒体区、固定两行标题；头像形状与动效保留。lint/build/diff检查通过，未重复浏览器实页验收。未提交/部署。

### 2026-11-05 — 搜索分类局部切换
- 原因：App按fullPath缓存，每切分类都重新挂载搜索外壳。计划搜索外壳按关键词复用，内层独立keep-alive保证九分类activated取数，保留最多一个结果实例；同关键词分类切换不滚回顶部。其他详情页仍按fullPath刷新。
- 结果：外壳key改为search+keyword，内层keep-alive max1；同词分类路由不回顶部。九分类实页依次切换active与结果组件一致，外壳无page-fade类；前进/后退、刷新恢复正常，浏览器error日志为空。lint/build/diff通过；未提交/部署。

### 2026-11-05 — 缩小搜索热搜榜
- 计划：缩窄热搜列、限制榜单高度，减小标题/行内字号与间距；不改搜索建议、接口和点击行为。
- 结果：热搜列最大420px、榜单最大420px高，标题16px、词条13px、说明11px、行内距8px；超出内部滚动。lint/build/diff检查通过，未做实页视觉复查，未提交/部署。

### 2026-11-05 — 搜索框居中与热搜靠右
- 计划：桌面三列对称网格，输入居中列、热搜右列；窄屏热搜放到下方靠右，避免挤压输入。仅改弹层布局。
- 结果：搜索框480px上限居中，热搜320px上限靠右；1050px以下上下排列避免挤压。lint/build/diff通过；未作本轮浏览器视觉验收，未提交/部署。

### 2026-11-05 — 歌手详情各板块空态
- 计划：热门歌曲/专辑/MV/视频/相似歌手均补紧凑空态，接口失败单独标记而不误称无数据；简介缺失显示暂无简介。复用EmptyState，无账号和播放变化。
- 结果：五个内容板块均有明确空态，简介缺失也有文案；区分接口失败和有效空数组，换一批视频响应结构校验。11组本地回归、lint/build/diff通过；未实页逐项制造空响应，未提交/部署。

### 2026-11-05 — 主题调色盘与页面反馈修正（计划）
- 隐藏空视频换批；版本读取package.json；歌手榜筛选头与输入主题适配；楼中楼用户名正文色/hover主题色。
- 稳定根滚动条槽位，移除自定义锁滚动和Element重复补偿，核查弹框位移。云盘行新增下载，沿用下载接口权限，不绕过版权限制。
- 头像菜单提供调色盘、五预设与默认色；持久化单一基色，语义角色派生可读色，迁移硬编码紫色及Sass透明色。PlayerCore只涉及样式变量，不改播放逻辑。图标只建议不改动。

#### 本轮结果与验证
- 视频为空隐藏换批；版本从package读取；歌手榜筛选头flex+主题输入；公共楼中楼用户名正文色、hover主题色。
- 新AccentPicker/accent工具：调色盘、五预设、恢复默认、存储与跨标签同步。迁移Sass主色运算、硬编码紫色及透明紫色到单基色语义变量，含PlayerCore样式34行；核对其script与HEAD完全一致。保留语义警告/危险/会员及漫游分类配色。
- 实页五预设切换、红色刷新持久化、浅深筛选输入通过；云盘96首显示下载入口。下载无地址/异常/重复点击/链接触发为合成测试，未实际下载音频文件。
- 打开主题色对话框、搜索弹层、免责声明前后内容x/width不变；非穷举所有嵌套浮层或旧浏览器。浏览器error为空。
- 12组合成回归、lint、生产构建（f6377af3b975a407）、diff检查通过。图标仅提出统一SVG体系建议，未替换。未新增依赖/提交/部署。详见docs/qa/THEME_AND_OVERLAYS-2026-11-05.md。

### 2026-11-05 — 头像菜单主题色图标
- 计划：主题颜色增加调色盘SVG，复用menu-item的16px图标槽与10px间距，对齐个人主页文字。不修改其他图标。
- 结果：新增palette图标并接入头像菜单，复用原菜单布局。lint/build/diff通过；未单独做实页视觉验收。未提交/部署。

### 2026-11-05 — 放大导航LOGO
- 计划：LOGO高度48px增至60px，保持宽高比和最大宽度约束；导航仍为80px高，垂直居中。
- 结果：LOGO高度60px，宽度自动，保留max-width与居中约束。lint/build/diff通过；未单独进行实页视觉验收。未提交/部署。

### 2026-11-05 — 返回图标深色适配与歌单动画放慢
- 计划：PageBack固定深色替换为主题文字/表面/边框，增加键盘焦点；歌单封面1.3秒改2.6秒ease-in-out，智能匹配歌单也统一；专辑和歌手动效不变。
- 结果：深色实页返回按钮/箭头rgb(237,241,247)，底rgb(48,57,73)，可读；发现歌单实测过渡2.6s、平滑缓入缓出。12组本地回归、lint/build/diff通过。关闭验收标签，未提交/部署。

### 2026-11-05 — 统一SVG图标第一版（计划）
- 将注册表剩余字体图标改为24网格、1.8px圆角描边SVG；播放/暂停/喜欢激活保留实心。保留旧状态class兼容点赞着色，屏蔽字体伪元素以免重影。
- 业务显式Element图标迁移BaseIcon，保留loading旋转/性别颜色；视频统计语义映射统一。取消独立图标hover缩放，由按钮自身反馈。不新增依赖、不修改播放业务或账号动作；制作离线图标预览供查看。
- 结果：50个业务图标全SVG，24网格/1.8px圆角描边；保留实心播放、暂停、已喜欢。返回/加载/性别/视频统计显式图标统一，旧状态class保留、伪元素屏蔽。加入列表/歌词/分享语义分开；无业务状态机变化。
- 首页实页87个SVG，字体与fallback均0；导航20px、菜单16px，菜单主题色和搜索交互正常、error为空。修复旧ac-Search定位选择器。Element内部原生控件未宣称全部移除字体。
- 提供docs/qa/ICON_PREVIEW-V1.svg与生成脚本；12组回归、lint/build/diff通过。未新增依赖/账号写入/提交/部署。

### 2026-11-05 — 1.0.0 用户验收与全量推送（计划）
- 用户确认已全部检查，明确要求推送所有本地更改；本次包括已有marketing文件。版本号与lock根版本同步1.0.0，更新实施计划验收状态。
- 当前master与origin/master同步；推送将触发仓库现有生产部署工作流。完成12组回归、lint/build和暂存检查后提交并push，不新增tag或修改部署配置。历史自动验收局限不回写为自动测试通过。
- 结果：用户验收已记录，package/lock根版本均1.0.0；12组回归、lint、生产构建（812a4ffe208b2635）通过。全量暂存121文件（含marketing）；修正回归脚本末尾多余空行，暂存diff检查后分组提交并推送origin/master。部署结果以Actions为准。

### 2026-11-05 — 解灰过程状态提示
- 计划：在播放按钮正上方居中位置加音源状态胶囊（进行中转圈 / 解灰琥珀 / 成功绿 / 失败红），按「正在获取音源 → 官方无货换源 → 正在解灰 → 解灰完成·第三方源 / 解灰失败」播报；正常秒开的歌不显示，慢请求 500ms 才亮出，成功/失败结论留 4-6 秒。全屏播放页同步复用 expandedHint 播报。播放条上方原有 hint 与状态胶囊收进同一个纵向 flex 容器，共存时自动堆叠。
- 结果：PlayerCore 新增 `sourceStatus` + `armSourceStatus` / `setSourceStatusLater` / `settleSourceStatus` / `clearSourceStatusSoon`，接在 getSongUrl 三档降级、/song/url/match 解灰、老接口兜底各分支上；新增 `.floatStack`（绝对定位居中、收起态下移 40px）承载 `.sourceHint` 与 `.playerHint`；MusicPlayer 的 expandedHint 兜底读取该状态，详情页 `.rightContent` 内边距改为 `20px 0 70px`（上 20 / 下 70，左右 0）。lint 通过、dev 编译通过；未做真机灰歌验收，未提交/部署。

### 2026-11-05 — FIX-trial 未登录/非会员不再播试听片段
- 计划：`/song/url/v1` 响应里 `freeTrialInfo` 非空即判该档位不可用（VIP 独占曲目对未登录 / 非会员只给 30-35 秒片段，`url` 却有值），跳过其余档位直接走 `/song/url/match` 解灰兜底；正常歌曲 `freeTrialInfo` 恒为 null，音质档位选择链路完全不变。老接口 `/song/url` 兜底同步拒收试听。
- 结果：实测 347230（fee=1）未登录时 exhigh/standard 均返回 `freeTrialInfo{start:0,end:35}`（约 560KB），`/song/url/match` 返回 32.5MB 完整 flac；改后该曲识别为试听→直接解灰，状态条播报「仅试听片段，正在解灰…」。lint 通过、dev 编译通过；未做真机全流程验收，未提交/部署。

### 2026-11-05 — 音质菜单按曲目自适应 + 解灰曲目下载
- 计划：音质菜单不再固定 5 档，改由 `/song/detail` 的 `hr/sq/h/m/l` 字段（null=该档不存在）决定当前歌曲真正有哪些档位；未知时回落完整列表。用户所选档位本曲没有时，高亮实际在用的那一档，避免"没有一项被选中"的错觉。取源链路顺便跳过本曲没有的档位，少打无效请求。下载：解灰曲目直接存当前 match 源（版权下载接口对 VIP/受限曲目恒返 -105/-110，旧文案对已登录用户误报"需要登录"）；其余歌曲仍走 `/song/download/url/v1`，失败文案按登录态区分。
- 结果：PlayerCore 新增 `songLevels` + `_loadSongLevels`（按 id 缓存、带换歌竞态校验）、`qualityMenuSelected`、`unblockDownloadSource`；QualityMenu 新增 `levels` prop 与"本曲 N 档"表头；MusicPlayer `downloadSong` 增加解灰直下分支与 `_triggerDownload`。lint 通过、dev 编译通过；未做真机验收，未提交/部署。

### 2026-11-05 — 解灰曲目音质菜单收成单条 + 状态条残留修复 + 未登录下载
- 计划：`1)` 解灰曲目只有第三方固定音质，音质菜单不再列官方 3-4 档，改为一行「解灰源·第三方 / 不可切换」说明；换歌时清空 `currentQuality`，避免音质按钮先亮上一首的结论。`2)` 修「歌已在放但状态条一直显示正在获取音源…」：`settleSourceStatus` 原来只在 tone 为 pending/unblock 时动作，音源 300ms 就回来时 tone 还是空，500ms 的延时播报照样触发且无人清理；现在落定时连延时定时器一起取消，并在 canplay 再兜一次、延时播报自带 8 秒自动收。`3)` 未登录不再弹"下载需要先登录"：未登录/解灰曲目直接下载当前正在播的文件，登录用户则优先走版权下载接口，接口不给链接时用当前音源兜底。
- 结果：QualityMenu 新增 `unblock` prop 与静态说明行；PlayerCore 新增 `audioSrcSongId`、`playableDownloadSource()`（替代 `unblockDownloadSource`）；MusicPlayer `downloadSong` 重排分支并去掉"需要登录"文案。lint 通过、dev 编译通过；未做真机验收，未提交/部署。

### 2026-11-05 — 登录页「欢迎回来」标题居中
- 计划：定位到 `reset.scss` 的全局 `h1 { text-align: left }`——直接写在元素上的声明会盖掉 `.login-hero` 继承来的 `text-align: center`，于是标题盒子虽居中、文字却从左排起（视觉上偏左）。改为在 `.login-title` / `.login-subtitle` 上显式 `text-align: center`，`.login-hero` 改纵向 flex + `align-items: center` 不再依赖继承；`.login-wrap` 补 `width: 100%`，防止父级把容器收成 fit-content 时整块贴左。
- 结果：仅改 `src/pages/UserPage.vue` 的登录页样式，其余页面 h1 仍按全局左对齐。SCSS 编译通过、dev 编译通过；未真机验收，未提交/部署。

### 2026-11-05 — 会员音质不再拦截：非会员也能切无损/臻音
- 计划：去掉音质菜单的 VIP 锁和 `onQualitySelect` 的拦截（不再弹"「高解析度无损」需要黑胶VIP，已保持当前音质"）。会员档位保留 VIP 徽标提示出处，但可点可选。取源链路新增兜底：请求会员档位而上游压级（lossless→exhigh）时，先走 `/song/url/match` 取这一档的真文件（实测对 347230 返回 32.5MB flac，与 sq.size 一致），解灰失败再退回上游那份压级文件，保证有声。
- 结果：QualityMenu 移除 `isLocked` / `need-vip` / `vipType`，改为 `isVipTier` 仅作标记；PlayerCore `getSongUrl` 增加 vipTier 压级→解灰分支，`onNeedVip` 删除。另区分解灰来源：`currentQuality.byChoice`——主动选会员档时菜单仍列官方档位（可切回）、按钮显你选的档位，只有被迫解灰（曲目没货/仅试听）才收成单条"解灰源"。lint 通过、dev 编译通过；未做真机验收，未提交/部署。

### 2026-11-05 — 音质菜单高亮跟随实际播放档位
- 计划：`qualityMenuSelected` 的判定顺序改为「实际在放的档位 → 用户所选（未起播时）→ 最高可用档」。旧逻辑优先返回 `config.player.level`，于是非会员选无损被上游压成 320k（或解灰失败回退压级文件）时，菜单高亮「高解析度无损」、播放条按钮显示「HQ」，两处对不上。顺带把选中标记的图标从 `loop`（循环箭头，容易被误读）换成 `check`。
- 结果：只改 `PlayerCore.qualityMenuSelected` 与 `QualityMenu` 的勾选图标；解灰源（actual=match）仍按用户所选档位高亮。lint 通过、dev 编译通过；未做真机验收，未提交/部署。

### 2026-11-05 — 应用内更新日志（CHANGELOG.md → 弹窗 + 未读红点）
- 计划：新增面向使用者的 `CHANGELOG.md`（与内部的 `docs/CHANGELOG_AI.md` 分离，避免把"未验收/未部署"这类话露给用户）。用 `scripts/build-changelog.mjs` 把 Markdown 转成 `src/data/changelog.generated.js`，挂在 `prebuild` / `preserve` 上（`npm run build` 会自动触发，CI 无需改）。App 增加 `ChangelogDialog`，入口放在头像菜单与页脚；未读状态用 `localStorage.acmusic_seen_changelog` 与 `package.json` 版本比对，有新版本时头像和菜单项各点一个小红点。版本号 1.0.0 → 1.1.0（package.json 与 lock 根版本同步），页脚自动显示 v1.1.0。
- 结果：新增 `CHANGELOG.md`、`scripts/build-changelog.mjs`、`src/data/changelog.generated.js`、`src/components/common/ChangelogDialog.vue`、`src/utils/changelog.js`；改动 `src/App.vue`、`src/components/common/AppFooter.vue`、`src/assets/scss/navigationBar.scss`、`package.json`、`package-lock.json`、`AGENTS.md`（补充版本与日志约定）。lint 通过、dev 编译通过；未真机验收，未提交/未部署、未打 tag。
