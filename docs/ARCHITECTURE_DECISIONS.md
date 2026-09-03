# Architecture Decision Records — ACMUSIC

> 项目重要架构决策记录。新增决策时复制下方模板追加即可。

---

## 决策 1：使用 Vue 2 Options API

**日期**：2022-04-12（项目起点）

**背景**：作者当时熟悉 Vue 2，对 Composition API 不熟悉。

**问题**：选用 Vue 2 还是 Vue 3？

**选择方案**：
- A) Vue 3 + Composition API + `<script setup>` — 现代、生态新
- B) Vue 2.6 + Options API — 稳定、文档丰富、生态成熟

**最终方案**：B（Vue 2.6 + Options API）

**原因**：
1. 作者熟悉的栈
2. Element UI 2.x 当时还不完全支持 Vue 3（直到 2022 年底才稳定）
3. 项目规模不大，Options API 完全够用

**影响范围**：全栈。所有 `.vue` 单文件组件都用 Options API。

**未来注意事项**：
- 不要试图"现代化"为 Composition API
- 如需响应式能力，扩展 mixin 或 computed
- 升级到 Vue 3 是大工程（Element UI 升级、`<style scoped>` 行为变化、过滤器移除）

---

## 决策 2：使用 Vuex 3（3 个模块）

**日期**：2022-05-04

**背景**：需要管理登录态、播放列表、应用全局状态。

**问题**：如何组织状态？

**选择方案**：
- A) Vuex 单一 store，所有 state/mutations 在一个文件
- B) Vuex + 模块化（namespaced）

**最终方案**：B，3 个模块：`UserAbout` / `TracksAbout` / `StatusAbout`

**原因**：
1. 模块化隔离关注点
2. `namespaced: true` 避免命名冲突

**影响范围**：所有跨页面状态必须通过 Vuex 模块。

**未来注意事项**：
- `StatusAbout` 实际只占位（仅 `showSearchPage: false`），未来如不需可直接删除
- 不要新增第 4 个模块，临时状态放组件内即可

---

## 决策 3：跨组件通信用 `$bus` + `pubsub-js`

**日期**：2022-04-16

**背景**：卡片点击 → 跳转详情页，但卡片可能在任何页面。

**问题**：跳转逻辑放哪里？

**选择方案**：
- A) 每个 Layout 组件自己 `this.$router.push` — 重复代码
- B) 全局事件总线 `$bus.$emit('xxxClk', id)`，由 App.vue 监听 → 统一跳转
- C) Vuex action 触发跳转 — Vuex 不适合做副作用

**最终方案**：B（$bus 全局事件总线）

**原因**：
1. 业务事件天然松耦合（"用户点击了歌单"是一个事件，不是状态变更）
2. App.vue 是组件树的根，唯一拥有路由实例的地方
3. 比 props drilling 简洁

**事件名约定**：
- `plClk` / `alClk` / `arClk` / `arAsClk` / `songClk` / `mvClk` / `vClk` / `uClk` — 跳转类
- `clearPlaylist` / `loggedIn` / `showArtistList` — 跨组件通知

**为什么同时用 pubsub-js**：
- 播放器（PlayerCore）订阅 `playAll` / `getPersonalFM` 触发播放列表整体播放
- pubsub-js 解耦更强（订阅者无需 Vue 实例），适合播放器内部通信

**影响范围**：所有卡片点击、所有跨页面动作。

**未来注意事项**：
- `$bus.$on` 必须配对 `$bus.$off`（在 `beforeDestroy` 中清理）
- 新增事件必须同步更新 `PROJECT_CONTEXT.md` 中的事件表

---

## 决策 4：详情页用 query 参数 + 路由 props 函数

**日期**：2022-04-13

**背景**：歌单/专辑/歌手详情页需要接收 id。

**问题**：如何传参？

**选择方案**：
- A) `:id` 动态路由段（`/listDetail/:id`）— URL 优雅但耦合路由
- B) query 参数 + 路由 props 函数 — URL 灵活，组件 prop 化

**最终方案**：B

```js
{
  path: '/listDetail',
  name: 'listDetail',
  component: ListDetail,
  props: ($route) => ({ id: $route.query.id })
}
```

**原因**：
1. URL 保持 `?id=xxx`，刷新不会丢
2. 组件用 `props: ['id']` 接收，**完全不依赖 this.$route**（更易测试）
3. 路由层处理 query → props 的转换，业务层只关心数据

**影响范围**：所有 detail 页面。

---

## 决策 5：playerProps 模式 — `App.song` → `MusicPlayer` → `PlayerCore`

**日期**：2022-04-17 → 持续优化至今

**背景**：歌曲对象在不同地方触发播放（搜索、播放列表、个人 FM、相似歌曲）。

**问题**：如何让"任何地方点击歌曲 → 通知播放器播放"？

**选择方案**：
- A) PlayerCore 直接 `$bus.$on('songClk')` 自己监听 — 耦合太重
- B) App.vue 监听 `$bus` → 设置 `this.song` → 通过 props 传给 MusicPlayer → MusicPlayer 透传给 PlayerCore

**最终方案**：B

```js
// App.vue
this.$bus.$on('songClk', this.songClick)
// songClick:
  this.song = { ...song }
```

```html
<MusicPlayer :song="song"/>
```

```js
// PlayerCore.vue
watch: {
  song(val) { this.currentSong = normalizeTrack(val) }
}
```

**原因**：
1. App.vue 是 root，天然拥有所有数据
3. props 单向流动，便于追踪
3. PlayerCore 不知道 `$bus`，可以独立测试

**影响范围**：所有调用 `this.$bus.$emit('songClk', song)` 的地方都依赖此链路。

---

## 决策 6：NetEase API 字段适配层 `utils/normalize.js`

**日期**：2022-05（贯穿整个项目）

**背景**：同一字段在不同 API 返回不同名字：
- 封面：`coverImgUrl` / `picUrl` / `al.picUrl` / `album.picUrl` / `artists[0].picUrl`
- 歌手：`ar` / `artists` / `artist`
- 专辑：`al` / `album`
- 时长：`dt` / `duration` / `durationms` / `ms`

**问题**：模板 / 方法里到处写 `t.al ? t.al.picUrl : (t.album ? t.album.picUrl : t.picUrl)`？

**选择方案**：
- A) 模板里到处兜底 — 重复代码
- B) 统一适配层（**只增加字段，不删除原字段**）

**最终方案**：B

```js
normalizeTrack(t) {
  if (t.picUrl === undefined) t.picUrl = coverOf(t)
  if (t.artists === undefined && t.ar) t.artists = t.ar
  if (t.ar === undefined && t.artists) t.ar = t.artists
  // ...
  return t
}
```

**原因**：
1. 一次处理，模板用 `t.picUrl` 或 `t.ar` 都行
2. 不删除原字段，避免破坏第三方 API 兼容性
3. 任何数据源都先过一遍 normalize

**影响范围**：所有 NetEase API 返回的数据。

**未来注意事项**：
- 不要在 normalize 里删除字段
- 模板访问字段时仍推荐用 `t.al.picUrl` 或 `t.picUrl`（normalize 后两者都有）

---

## 决策 7：播放器 URL 音质降级链

**日期**：2025-08 至 2026-08

**背景**：网易云 API 返回的歌曲 URL 受 VIP、版权、地区限制影响，且部分接口本身不稳定。

**问题**：如何最大化让用户能播放？

**选择方案**：
- A) 单接口请求 + 失败报错 — 命中率低
- B) 多接口多音质降级链
- C) 完全依赖第三方解灰服务

**最终方案**：B（本项目自实现） + 浏览器端音频代理兜底

降级顺序：
1. `/song/url/v1`（按用户偏好 level）→ hires / lossless / exhigh / higher / standard
2. `/song/url`（旧接口，带 br 兜底）
3. `/song/url/match`（匹配解灰）
4. **浏览器音频重试**：直连 3 次失败 → 切换到 `/api/audio-proxy?url=...`（Vercel 代理）

**原因**：
1. 自有降级链可控、调试友好
2. 不依赖第三方（自己拥有代码）
3. Vercel 代理解决企业网络屏蔽 `*.music.126.net`

**影响范围**：PlayerCore 的 `getSongUrl` / `requestFallbackUrl` / `requestMatchSongUrl` / `_onAudioError`。

**未来注意事项**：
- 不要简化或合并 `checkSongLoggedIn` / `checkSongDntLogin`（已登录 / 未登录走不同链路）
- 不要删除 race condition 控制（`playRequestId` / `playContextId`）

---

## 决策 8：搜索结果 9 个子视图 + searchMixin

**日期**：2022-04-26

**背景**：搜索结果按类型分 9 个 tab（单曲/专辑/歌手/MV/歌词/歌单/用户/视频/声音），每个 tab 数据结构不同但交互模式一致（列表 + 加载更多 + 数量统计）。

**问题**：9 个组件还是 1 个动态组件？

**选择方案**：
- A) 1 个动态组件 + 大量 if/else 渲染不同结构 — 复杂
- B) 9 个独立组件 + 共享 mixin

**最终方案**：B

**原因**：
1. 每种类型数据结构差异大（歌单是 `playlists`，视频是 `videos`）
2. 独立组件便于维护和样式调整
3. mixin 抽取通用状态机（list / totalCount / limit / page / type / loading / noMore / offset / load）

**影响范围**：`src/pages/search/*Res.vue` 9 个文件 + `src/assets/mixin/index.js`。

**未来注意事项**：
- 新增搜索类型：在 router 加子路由 + 新建 `XxxRes.vue` + mixin + SearchResult.vue `tabList`
- mixin 字段名固定，不要随意改

---

## 决策 9：CSS 动画令牌（`motion.scss`）

**日期**：2026-08（项目近期重构）

**背景**：项目各处自定义 transition 时间 / 缓动函数，重复且难统一。

**问题**：如何让动画风格统一？

**选择方案**：建立 `motion.scss` 提供设计令牌：
- 时长：`$motion-fast` (180ms) / `$motion-normal` (300ms) / `$motion-slow` (500ms)
- 缓动：`$ease-standard` / `$ease-smooth`
- 过渡组件：页面切换、骨架屏 shimmer、遮罩淡入、弹窗滑入

**原因**：
1. 全局风格统一
2. 修改一处全站生效
3. 减少硬编码

**未来注意事项**：
- 新增 SCSS 动画必须用 token
- 不要直接写 `transition: all 0.3s ease`

---

## 决策 10：统一图标系统（BaseIcon + config/icon.js）

**日期**：2026-08（项目近期重构）

**背景**：项目原本用 iconfont 字体 + 一些 Emoji + 内联 SVG，混用且不一致。

**问题**：如何统一图标？

**最终方案**：BaseIcon 组件 + 单一 config 注册表：
- `type: 'font'` — 使用字体图标 class
- `type: 'svg'` — 内联 SVG path
- `type: 'fallback'` — BaseIcon 自动降级到占位灰块

**影响范围**：所有页面 / 组件。

**未来注意事项**：
- 新增图标必须先在 `src/config/icon.js` 注册
- 优先使用 SVG（更易自定义 stroke/fill）

---

## 决策 11：本地数据持久化（localStorage）

**日期**：2025-08（播放状态恢复）

**背景**：用户希望刷新后能从上次位置继续听。

**问题**：保存到哪里？

**选择方案**：
- A) 后端 / IndexedDB — 太重
- B) localStorage — 简单、够用

**最终方案**：B

| Key | 内容 |
| --- | --- |
| `acmusic_player_state` | 当前歌曲 + 列表 + 进度 + 模式 |
| `acmusic_player_quality` | 用户偏好音质 |
| `acmusic_play_mode` | 播放模式 |

**TTL**：7 天（PlayerCore `_restoreState` 检查）

**未来注意事项**：
- localStorage 容量有限（约 5MB），播放列表限制 200 首
- 不要存储 token / 密码（已存 `Cookies` + `store-cookie-` 备份）

---

## 决策 12：Vercel 部署 + Serverless 音频代理

**日期**：2025-08（`88301fa` commit）

**背景**：本地网络可能屏蔽 `*.music.126.net`，音频无法直连。

**问题**：如何让浏览器绕过？

**选择方案**：在 Vercel 部署 serverless 函数作为音频代理：
- 浏览器请求 `/api/audio-proxy?url=...`
- Vercel 函数代为流式 fetch → 返回给浏览器
- 同时设 Referer 头模拟网易云请求

**最终方案**：B

**影响范围**：`api/audio-proxy.js`（serverless）+ `PlayerCore._toProxyUrl()`（浏览器端）

**未来注意事项**：
- 代理服务可能被 Vercel 限制，必要时换 CF Workers
- 直连和代理模式各重试 3 次后才放弃

---

## 决策 13：登录体系

**日期**：2022-04-25

**背景**：网易云登录态完全靠 cookie，前端必须主动解析。

**问题**：如何管理登录态？

**最终方案**：
1. 启动时：未登录 → `anonymousLogin` 拿匿名 cookie；已登录 → `refreshLogin` 续期
2. 登录时：`setLogin(cookie, profile)` 解析 Set-Cookie 字符串
4. 登出时：`doLogout()` 清 `MUSIC_U` / `__csrf`
4. 检测失效：API 业务 code === 301 → `api:unauthorized` 事件 → `doLogout` + 提示

**双保险**：`Cookies.set` + `localStorage`（js-cookie 在某些场景失效）

**影响范围**：`utils/auth.js` + `api/auth.js` + `main.js` 启动逻辑 + `request.js` 拦截器

---

## 决策 14：自定义 `gridLayout` 工具类

**日期**：2022-04-09

**背景**：首页需要 5 列网格展示卡片。

**问题**：用 Element UI 的 `el-row` + `el-col` 还是 CSS Grid？

**最终方案**：CSS Grid + 自定义 `.gridLayout` 类（在 `reset.scss` 中）：

```scss
.gridLayout {
  display: grid;
  grid-template-columns: repeat(5, 20%);
}
```

**原因**：
1. 简单声明式
2. 配合 Layout 组件统一风格
3. 部分页面用 `::v-deep` 覆盖为 `repeat(auto-fill, minmax(200px, 1fr))` 做响应式

**未来注意事项**：
- 不要重新引入其他网格系统
- 调整响应式断点统一改这里

---

## 决策 15：FM 自动续播（PersonalFM.vue 订阅 PlayerCore 事件）

**日期**：2026-09-02

**背景**：
PlayerCore 中 `nextSong()` 与 `_autoNext()` 在 `isPersonalFM === true` 时 publish `'getPersonalFM'` 事件（line 618、630），但全项目从未实现订阅者。FM 列表只能由 HomePage 启动时一次性拉取，播完后无续播能力。

**问题**：如何让 FM 列表耗尽后自动拉取新歌曲？

**选择方案**：
- A) PersonalFM.vue 订阅 `'getPersonalFM'`，收到事件后调用 `/personal_fm` 拉取新一批，追加到 `currentPlaylist`
- B) 维持现状（删除 publish 作为死代码，FM 不续播）
- C) 在 HomePage 中监听并刷新（依赖 HomePage 一直挂载，耦合度更高）

**最终方案**：A

**原因**：
1. PersonalFM.vue 已是 FM 播放的唯一 UI 上下文，订阅与组件生命周期绑定最自然
2. `/personal_fm` 接口本身就支持"每次返回不同歌曲"（基于时间戳），无需新 API
3. 与 PlayerCore 现有 publish 完美契合（仅 FM 模式发布）
4. `store/modules/Tracks.js` 的 `PUSH_PLAYLIST` mutation 已支持去重追加，无需修改

**关键设计（防止滥用 API 配额）**：
- **in-flight 检查**：fetch 进行中 → 跳过
- **5 秒时间戳去抖**：上次成功 fetch 5s 内 → 跳过
- **错误降级**：网络失败仅 console.error + Element UI Message 提示，不影响当前播放

**影响范围**：仅修改 `src/components/PersonalFM.vue`（+ 1 个 import + 3 个 data 字段 + 1 个方法 + 2 个 lifecycle 钩子改动）

**未来注意事项**：
- 若未来 FM 接口返回格式变更，需调整 `res.data.data` 解析
- 5 秒去抖时间窗是经验值，若实测仍触发频繁请求可上调

---

## 决策 16：FM 续播 curIndex 推进机制（解决"自然播完卡住"）

**日期**：2026-09-03

**背景**：
决策 15 实现了 PersonalFM 订阅 `'getPersonalFM'` 拉取新批次，但**测试发现**：当最后一首自然播完触发 `_autoNext` 时，仅 publish 事件后 `return`，无任何代码把 `curIndex` 推进到新追加的歌曲上 → **UI 卡在"暂停"状态**，用户必须手动点 FM 卡片才能继续。

**根因**（PlayerCore.vue:628-633）：
```js
_autoNext() {
  if (this.playMode === 'loop') { this._restartCurrent(); return }
  if (this.isPersonalFM) { pubsub.publish('getPersonalFM', ...); return }  // ← 直接 return
  if (!this._inPlaylist()) return
  this.curIndex = this.getNextIndex()  // ← 永远走不到
}
```

**最终方案**：双端协调
- **PersonalFM.fetchMoreFM** 成功时记录追加前的 `oldLength`，追加后 `pubsub.publish('fmNewBatch', oldLength)`
- **PlayerCore.playFmNewBatch** 订阅后把 `curIndex = oldLength`（即新批次的首曲），`watch.curIndex` 链路自动播放

**原因**：
1. 利用已有 `curIndex` watch（line 296-305），无需新增播放触发逻辑
2. payload 仅为 `number`（oldLength），接口最简
3. 边界检查齐全（仅 FM 模式、startIndex 合法、未越界）
4. 复用已有 pubsub 体系，与决策 15 风格一致

**关键设计**：
- `playFmNewBatch` **只在 FM 模式**生效，模式切换不会误触发
- 严格的越界检查（`startIndex >= currentPlaylist.length` 直接 return）防止非预期状态
- 单独的 `fmBatchId` 字段，与原 `pubId`（playAll）独立管理生命周期

**影响范围**：仅修改 2 个文件
- `src/components/PersonalFM.vue`（fetchMoreFM 中加 3 行）
- `src/components/musicPlayer/PlayerCore.vue`（加 1 方法 + 2 lifecycle 改动）

**未来注意事项**：
- 若未来 FM 接口每次返回的 batch 大小变化，需评估"curIndex 跳到 oldLength"是否会跳过未播歌曲（当前未播歌曲会被新批次顶到列表后部，体验可接受）
- 若决定从"反应式续播"改为"预加载式"（决策 17 候选项），需重新评估本机制

---

# 未来可改进（非决策）

> 以下不是已落地的决策，是分析时识别出的潜在改进点。AI **不得擅自** 进行这些修改，需用户明确指示。

1. **状态管理拆分**：可以把播放器的 `isPersonalFM` 标志从 Vuex 移到 PlayerCore 内部（避免跨组件耦合）
2. **API 封装补全**：目前 50% 的 API 调用直接写在页面里，可统一封装到 `src/api/*.js`
3. **TypeScript 迁移**：项目庞大，可逐步迁移到 Vue 3 + TS + Pinia（但需要用户授权且是大工程）
4. **CSS 主题化**：变量已存在，可考虑 dark mode 支持
5. **测试**：项目零测试，未来加 Vitest + Vue Test Utils
6. **`mixin` 路径统一**：`src/assets/mixin/` 与 `src/mixins/` 分裂，新代码建议统一到 `src/mixins/`