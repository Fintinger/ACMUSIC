# ACMUSIC — Project Context

> 长期项目知识库。新模型只读本文即可建立完整心智模型。

---

# 项目概述

**ACMUSIC**（package name: `cloudmusic`）是 **网易云音乐** 的第三方 Web 客户端，基于浏览器即可使用。

| 项 | 值 |
| --- | --- |
| 项目名 | ACMUSIC / cloudmusic |
| 作者 | Fintinger |
| 仓库 | `git@github.com:Fintinger/ACMUSIC.git` |
| 当前分支 | `master` |
| 首次提交 | 2022-04-12（基础框架） |
| 最近提交 | 2026-08-27（IP 地理位置） |
| 当前阶段 | **功能稳定 + 持续打磨期**：核心功能已完备（首页 / 发现 / 搜索 / 用户详情 / 歌单专辑歌手 MV/视频详情 / 播放器 / 评论 / 登录）。新版提交多为 UI 细节、播放器容错、用户体验。 |

# 技术栈

## 前端

| 维度 | 选型 |
| --- | --- |
| 框架 | **Vue 2.6**（Options API，无 Composition API） |
| 构建工具 | **Vue CLI 5**（webpack + @vue/cli-service） |
| 语言 | **JavaScript ES6+**，未上 TypeScript |
| UI 库 | **Element UI 2.15**（全局注册 `Vue.use(ElementUI)`） |
| 样式 | **SCSS**（sass-loader 7.3.1 + sass 1.77），`scoped` 为主，少量全局 |
| 状态管理 | **Vuex 3**，3 个命名空间模块 |
| 路由 | **Vue Router 3**（**hash 模式**） |
| 网络 | **axios 0.26**（自定义 `request` 实例统一拦截） |
| 工具库 | `dayjs`（含 relativeTime、duration、zh-cn）、`pubsub-js`、`js-cookie`、`animate.css` |
| 视频播放 | **xgplayer**（MV / 视频） |
| 音频播放 | **原生 `<Audio>`** 元素（被 `new Audio()` 在 `PlayerCore` 中实例化） |
| 图标 | 自研 **BaseIcon** + `ac-font` 字体 + 内联 SVG（统一在 `src/config/icon.js`） |
| 包管理 | yarn / npm，`.npmrc` 设置 `legacy-peer-deps=true` |

## 后端 / 服务

本仓库**没有传统后端**。音视频请求经过：

- **网易云接口**：`NeteaseCloudMusicApi`（社区维护版）部署在 Vercel
- **API Gateway**：`src/config.js` 通过 `VUE_APP_API_BASE_URL` 注入
  - 当前默认：`.env` 中为 `https://api-acmusic-acdtml2wg-fintingers-projects.vercel.app`
- **音频代理**：`api/audio-proxy.js`（Vercel Serverless）— 当本地网络屏蔽 `*.music.126.net` 时，由 Vercel 服务端代为拉取并流式转发
- **本地 DevServer**：开发模式下 `/api/*` 通过 `vue.config.js` 反代到 `https://music.163.com`（仅登录流程使用）

### 中间件 / 部署

- **Vercel**（API 网关 + 音频代理 + 静态站点）
- 浏览器端通过 `withCredentials: true` 携带 cookie 完成网易云账号体系

### 数据库

**无本地数据库**。登录信息全部存在 `Cookies` + `localStorage`。

---

# 开发流程

本项目采用 **AI 辅助长期维护模式**。完整流程参见 `docs/DEVELOPMENT_WORKFLOW.md`，本节为概要。

## AI 协作文档体系（`docs/`）

所有 AI 协作文档集中在 **`docs/`** 目录下，共 5 个文件，**必须** 按以下顺序阅读：

| 文件 | 用途 | 何时读 |
| --- | --- | --- |
| `PROJECT_CONTEXT.md` | 项目长期知识库（技术栈 / 目录 / 模块 / 数据流 / API / 已知问题） | **必读**（每次任务开始） |
| `AI_RULES.md` | AI 修改守则（Vue 规范 / 修改流程 / 禁止行为 / Git 提交规范） | **必读** |
| `ARCHITECTURE_DECISIONS.md` | 14+ 条架构决策记录 | 修改相关模块前必读 |
| `CHANGELOG_AI.md` | 历史修改流水（最近任务在前） | 确认无未完成修改 |
| `DEVELOPMENT_WORKFLOW.md` | 完整开发流程（AI 流程 / Git 规范 / 测试要求 / 发布） | 任务开始前 |

> 5 个文档**必须按顺序读完**，不得跳过。

## AI 协作流程（9 步）

```
1. 阅读 5 个 AI 文档 + 目标文件上下游
   ↓
2. 理解当前架构 + 历史决策
   ↓
3. 分析任务影响范围（页面 / 事件 / 路由 / 状态机）
   ↓
4. 提出修改方案（一句话）→ 等待用户确认
   ↓
5. 修改代码（最小变更原则）
   ↓
6. 执行 yarn lint + yarn build + 浏览器核查
   ↓
7. 更新 CHANGELOG_AI.md
   ↓
8. 输出"修改摘要 + Git 建议" → 等待用户确认
   ↓
9. （用户确认后）执行 git commit
```

> 详细每步说明：`DEVELOPMENT_WORKFLOW.md` 第 1 节。

## Git 提交规范（摘要）

- 不同类型修改必须**分开 commit**
- 业务代码用 `feat` / `fix` / `refactor`
- AI 文档用 `docs`
- 配置用 `chore`
- AI **不自动 commit**，必须等待用户确认

> 完整规则：`DEVELOPMENT_WORKFLOW.md` 第 2-5 节。

## 测试要求

- 前端：`yarn lint` + `yarn build` + 浏览器 Console 核查
- 后端（Vercel Serverless）：推送到 Vercel 后自动部署
- 本项目**无单元测试**

> 完整要求：`DEVELOPMENT_WORKFLOW.md` 第 6 节。

---

# 项目目录结构

```
ACMUSIC/
├── api/                        # Vercel Serverless Functions
│   └── audio-proxy.js          # 流式音频代理（解决 CDN 屏蔽）
├── public/                     # 静态资源
│   ├── favicon.ico
│   └── index.html              # 模板 HTML
├── src/
│   ├── api/                    # 后端请求薄封装（axios.get / axios()）
│   │   ├── request.js          # ⭐ 统一 axios 实例 + 拦截器（unauthorized 事件）
│   │   ├── auth.js             # 登录相关（匿名、二维码、手机、验证码）
│   │   ├── Album.js
│   │   ├── Comment.js          # 新版 /comment/new 接口
│   │   ├── Other.js
│   │   ├── Playlist.js
│   │   ├── Tracks.js
│   │   └── User.js
│   ├── assets/
│   │   ├── ac-font/            # 字体图标资源（iconfont.css/ttf/woff）
│   │   ├── images/             # logo、vinyl
│   │   ├── mixin/              # ⚠️ 注意：放的是 searchMixin，但路径常被记成 src/mixins
│   │   │   └── index.js        # searchMixin（共享搜索列表状态机）
│   │   └── scss/
│   │       ├── base/
│   │       │   ├── variables.scss    # ⭐ 全局设计令牌（颜色、字号、播放器主题）
│   │       │   ├── motion.scss      # ⭐ 动画令牌（时长/缓动/页面过渡/弹窗/骨架屏）
│   │       │   ├── element-variables.scss # Element UI tab 主题
│   │       │   ├── reset.scss       # CSS reset + .gridLayout 工具类
│   │       │   └── mixin.scss       # 自定义滚动条 mixin（保留未使用）
│   │       ├── comment/         # 评论相关样式（按主题拆）
│   │       ├── app.scss         # 主框架（el-container 边距）
│   │       ├── homepage.scss
│   │       ├── explorepage.scss
│   │       ├── searchpage.scss
│   │       ├── navigationBar.scss
│   │       ├── playlistLayout.scss
│   │       ├── albumLayout.scss
│   │       ├── artistLayout.scss
│   │       ├── tracksLayout.scss
│   │       ├── dailyTracks.scss / dailyTracksCard.scss
│   │       ├── listDetail.scss
│   │       └── personalFmCard.scss
│   ├── components/             # 业务组件
│   │   ├── common/             # ⭐ 全局通用组件
│   │   │   ├── BaseIcon.vue          # ⭐ 统一图标组件（font / svg / fallback）
│   │   │   └── PageBack.vue
│   │   ├── layout/             # ⭐ 列表/详情布局组件（必须按命名复用）
│   │   │   ├── PlaylistLayout.vue
│   │   │   ├── AlbumLayout.vue
│   │   │   ├── ArtistLayout.vue
│   │   │   ├── MvLayout.vue
│   │   │   ├── VideoLayout.vue
│   │   │   ├── TracksLayout.vue
│   │   │   ├── MultimatchLayout.vue
│   │   │   ├── CommentLayout.vue          # 评论区整体（含热门/最新/写评论弹窗）
│   │   │   ├── CommentContentLayout.vue   # 单条评论渲染 + 回复/点赞/删除
│   │   │   ├── UserDetailLayout.vue       # 用户详情（共享给 UserPage + UserDetail）
│   │   │   └── VideoPlayerLayout.vue      # 视频/MV 播放器外壳
│   │   ├── musicPlayer/        # ⭐⭐ 播放器核心（高耦合，请勿随意重构）
│   │   │   ├── MusicPlayer.vue    # 外壳 + mini/expand 模式 + 歌词 + 相似
│   │   │   ├── PlayerCore.vue     # ⭐⭐ 核心控制器（1300+ 行，含播放链路、URL 降级链、缓冲预加载、状态恢复）
│   │   │   └── QualityMenu.vue
│   │   ├── Skeleton/           # 骨架屏
│   │   ├── userPage/           # 登录组件
│   │   │   ├── phoneLogin.vue
│   │   │   └── qrcodeLogin.vue
│   │   ├── DoSearch.vue        # 全局搜索弹层（含热搜 + 联想）
│   │   ├── LoadMore.vue        # 通用加载更多（IntersectionObserver）
│   │   ├── PersonalFM.vue      # 私人 FM 沉浸式 3D 卡片
│   │   ├── playTracksBtn.vue   # "播放全部"按钮
│   │   ├── scoText.vue         # 文字溢出横向滚动（跑马灯）
│   │   ├── SendComment.vue     # 评论输入框
│   │   └── vidPlayer.vue       # xgplayer 包装
│   ├── config.js               # ⭐ 全局配置（API base、播放器音质、降级链）
│   ├── config/
│   │   └── icon.js             # ⭐ 业务图标名 -> 实现（font class 或 SVG path）
│   ├── mixins/
│   │   └── coverLight.js       # 复用 mixin：图片亮度判断（异步 canvas 检测）
│   ├── pages/                  # 路由页面
│   │   ├── HomePage.vue
│   │   ├── ExplorePage.vue     # 发现（Tab 容器）
│   │   ├── UserPage.vue        # 我的（已登录显示详情，未登录显示登录）
│   │   ├── UserDetail.vue      # 用户详情（薄壳，仅透传 uid）
│   │   ├── ListDetail.vue      # 歌单详情
│   │   ├── AlbumDetail.vue
│   │   ├── mvPlay.vue
│   │   ├── VideoPlay.vue
│   │   ├── SearchResult.vue    # 搜索容器（多 tab 子路由）
│   │   ├── DailySongs.vue      # 每日推荐落地页
│   │   ├── Playlist.vue        # 发现/歌单子路由的容器
│   │   ├── explorePage/        # 发现子路由
│   │   │   ├── playlist/
│   │   │   │   ├── AllList.vue          # 全部分类（横向 pill + 下拉）
│   │   │   │   └── BoutiqueList.vue    # 精品歌单（标签滚动条 + 箭头）
│   │   │   ├── LeaderBoard/
│   │   │   │   ├── LeaderBoard.vue
│   │   │   │   └── ArtistList.vue      # 歌手榜（华语/欧美/韩/日）
│   │   │   ├── MvList.vue              # MV 列表 + 多维筛选（地区/类型/排序）
│   │   │   └── VideoList.vue
│   │   ├── artist/
│   │   │   ├── ArtistDetail.vue        # 歌手详情（顶部 hero + 热门 50 / 专辑 / MV / 视频 / 相似）
│   │   │   └── ArtistAllSongs.vue
│   │   └── search/            # 搜索结果 9 个子视图，全部 mixin searchMixin
│   │       ├── TrackRes.vue
│   │       ├── AlbumRes.vue
│   │       ├── ArtistRes.vue
│   │       ├── PlaylistRes.vue
│   │       ├── MvRes.vue
│   │       ├── LyricRes.vue
│   │       ├── UserRes.vue
│   │       ├── VideoRes.vue
│   │       └── VoiceRes.vue
│   ├── router/
│   │   └── index.js            # ⭐ 所有路由 + VueRouter.prototype.push 重写
│   ├── store/
│   │   ├── index.js
│   │   └── modules/
│   │       ├── User.js         # profile / IS_LOGIN（命名空间 UserAbout）
│   │       └── Tracks.js       # currentPlaylist / isPersonalFM（命名空间 TracksAbout）
│   ├── utils/
│   │   ├── auth.js             # ⭐ 统一登录态：setLogin / getLogin / doLogout
│   │   ├── audioCache.js       # 音频 URL 缓存 + pending 去重（TTL 30min）
│   │   ├── colorExtractor.js   # 封面图片 → 主色调背景（HSL 调节）
│   │   ├── filters.js          # 全局过滤器（formatCount/formatMs/formatS/fromNow/imgParam）
│   │   ├── ipLocation.js       # IP → 地理位置（高德 + ipwho.is 兜底）
│   │   ├── areaCode.js         # ⭐ 6 位区划代码 → 省市名（内置 GB/T 2260 表）
│   │   ├── normalize.js        # ⭐⭐ 数据适配层（coverOf/artistOf/normalizeTrack）
│   │   ├── title.js            # document.title 管理（路由标题 + 播放标题）
│   │   └── tools.js            # toggleScrollY（弹层期间锁定 body 滚动）
│   ├── App.vue                 # 根组件（顶栏 + 路由出口 + 全局播放器 + 搜索弹层）
│   └── main.js                 # ⭐ 入口：全局过滤器、Vue.use、$bus、登录初始化
├── .env                        # VUE_APP_API_BASE_URL + 高德 Key
├── .gitignore
├── .npmrc                      # legacy-peer-deps
├── AGENTS.md                   # 简要协作约定
├── README.md                   # ⭐⭐ 开发日志（必读）
├── babel.config.js
├── jsconfig.json               # @/ -> src/ 别名
├── package.json
└── vue.config.js               # webpack / devServer proxy / terser pure_funcs
```

---

# 核心模块

## 1. 登录体系（`utils/auth.js` + `api/auth.js`）

**关键设计**：由于网易云 API 不会持久化登录态到 cookie，前端必须**主动解析 Set-Cookie 字符串并写入浏览器**。

- `anonymousLogin()` — 启动时调用，获取匿名 cookie 用于受限接口（如 `/video/group`）
- `refreshLogin()` — 已登录用户每次启动刷新 cookie 有效期（301 → 自动退出游客）
- `setLogin(cookie, profile)` — 解析 `MUSIC_U=...; __csrf=...; ...` 串，逐条 `Cookies.set` + `localStorage` 双备份
- `doLogout()` — 清理 `MUSIC_U` + `__csrf` + `user-profile`
- `isLoggedIn()` — 通过 `MUSIC_U` cookie 判断

> ⚠️ `pages/UserPage.vue` 中 `storeCookie()` 有一段**重复的 cookie 解析逻辑**，应优先复用 `utils/auth.js` 的 `setLogin`。

## 2. 数据适配层（`utils/normalize.js`）⭐⭐

NetEase API **字段极不一致**（同一首歌在不同接口返回 `coverImgUrl` / `picUrl` / `al.picUrl` / `album.picUrl` 等不同字段名）。本层：

- `coverOf(item)` / `artistOf(item)` / `albumOf(item)` / `durationOf(item)` — 按优先级查找
- `normalizeTrack(t)` / `normalizePlaylist(pl)` / `normalizeArtist(ar)` — **只增加兼容字段，不删除原字段**

**任何新增数据源必须先经过 normalize**。直接访问 `t.ar[0].name` 是错误用法。

## 3. 播放器（`components/musicPlayer/PlayerCore.vue`）⭐⭐

项目最复杂的模块（约 1300 行）。核心设计：

### URL 音质降级链

```
user preferred (config.player.level)
  ↓ 失败
config.player.qualityLevels = ['hires', 'lossless', 'exhigh', 'higher', 'standard']
  ↓ 全部失败
/song/url (旧接口，带 br 兜底) ← requestFallbackUrl
  ↓ 失败
/song/url/match (匹配解灰) ← requestMatchSongUrl
  ↓ 失败
song/detail 检查 fee:
  fee=1 → VIP 歌曲
  fee=4 → 专辑独占
  其他 → 暂无可用音源 → 自动 nextSong（仅在播放列表中时）
```

### 状态机关键字段

- `currentSong`、`playRequestMode`（递增计数器，用于 race condition 取消旧请求）
- `playContextId` / `playlistContextId` — 区分"用户在播放列表中切歌" vs"单首搜索播放"
- `currentSongSource`：`'unknown' | 'playlist' | 'restore' | 'search' | 'fm'`
- `isRestoring`、`isPersonalFM`、`playMode` (`order` / `random` / `loop`)

### 状态持久化

`localStorage['acmusic_player_state']`：每 5 秒 / 暂停 / 卸载时保存；启动时 `_restoreState()` 还原歌曲 + 进度 + 播放列表（去重，限制 200 首）。

### 音频重试

`_onAudioError`：直连失败 3 次后切换到 `/api/audio-proxy?url=...`（Vercel 代理绕过 CDN 屏蔽）。

### 与外部通信

`PlayerCore` **不直接持有歌曲**，而是通过 `props.song` 接收外部触发（如 `App.vue` 监听 `songClk` 事件），再触发自己的 `currentSong` watcher 进入播放链路。`MusicPlayer.vue` 是 `PlayerCore` 的容器，负责 mini / expand 模式切换、歌词、相似歌单、评论。

> **修改 PlayerCore 必须谨慎**：所有 `watch` 都参与状态判断，删错一个字段会导致"刷新后自动播放"等历史 Bug 复发。

## 4. 搜索体系（`assets/mixin/index.js`）

**9 个搜索结果子视图**（单曲 / 专辑 / 歌手 / MV / 歌词 / 歌单 / 用户 / 视频 / 声音）共用 `searchMixin`：

```js
data: { list, totalCount, limit, page, type, loading, resultIn, countIn, id }
computed: { noMore, offset }
methods: { getList, initLoad, load }
```

子视图只需覆写 `data` 中的 `type` / `limit` / `resultIn` / `countIn` / `id`。

## 5. 跨组件通信

- **`$bus`（Vue.prototype）**：路由跳转、点击事件总线。事件名见下表
- **`pubsub-js`**：
  - `PlayerCore` 订阅 `'playAll'`（来自 store action `TracksAbout/playAllTracks`）
  - `PlayerCore` 在 FM 模式 publish `'getPersonalFM'`（详见 ARCHITECTURE_DECISIONS 第 15 条）
  - `PersonalFM.vue` 订阅 `'getPersonalFM'` 实现 FM 自动续播

### $bus 事件一览

| 事件 | 参数 | 来源 | 监听 |
| --- | --- | --- | --- |
| `plClk` | id | 歌单卡片 | App → listDetail |
| `alClk` | id | 专辑卡片 | App → albumDetail |
| `arClk` | id | 歌手卡片 | App → artistDetail |
| `arAsClk` | id | 歌手全部歌曲 | App → artistAllSongs |
| `songClk` | song obj | 歌曲点击 | App.songClick → MusicPlayer |
| `mvClk` | id | MV 卡片 | App → mvPlay |
| `vClk` | id | 视频卡片 | App → videoPlay |
| `uClk` | uid | 用户卡片 | App → userDetail |
| `clearPlaylist` | — | PlayerCore 清空 | App → 清空播放器 |
| `loggedIn` | cookie | qrcodeLogin/phoneLogin | UserPage 写 cookie |
| `showArtistList` | — | LeaderBoard | ExplorePage → ArtistList |

## 6. 路由（`router/index.js`）

**所有 detail 页通过 query 传 id/uid，并在路由 props 函数中解构**：

```js
{
  path: '/listDetail',
  name: 'listDetail',
  component: ListDetail,
  props: ($route) => ({ id: $route.query.id })
}
```

`VueRouter.prototype.push` 已被全局重写，捕获 duplicate navigation 错误并吞掉（避免控制台报红）。

`meta.level` 用于 `PageBack.vue` 是否显示返回按钮：`level > 1` 才显示。

---

# 数据流

## 整体

```
[页面 / 组件]
    │
    ├── this.$bus.$emit('plClk', id) ─────────► App.vue
    │                                              ▼
    │                                          this.$router.push({ name, query })
    │                                              ▼
    │                                          [路由] → Detail Page
    │                                              ▼
    │                                          activated() → axios 请求 → setState
    │
    ├── this.$bus.$emit('songClk', song) ─────► App.vue
    │                                          this.song = { ...song }
    │                                              ▼
    │                                          MusicPlayer :song="song"
    │                                              ▼
    │                                          PlayerCore watch('song')
    │                                              ▼
    │                                          playAll / qualityLevel / fallback chain
    │                                              ▼
    │                                          Audio.load() → play()
    │
    ├── this.$store.dispatch('TracksAbout/playAllTracks', list)
    │                                              ▼
    │                                          pubsub.publish('playAll')
    │                                              ▼
    │                                          PlayerCore pubsub subscriber
    │                                              ▼
    │                                          currentSong = playlist[0/random]
    │
    └── this.$axios.get('/api/...') ─────────► request.js
                                               ▼
                                            axios → Gateway → NetEaseCloudMusicApi
                                            ▲
                                            └── 业务 code === 301 → window.dispatchEvent('api:unauthorized')
                                                                              ▼
                                                                       App.vue: doLogout + 提示
```

## 关键状态路径

- **登录态**：`cookies(MUSIC_U, __csrf)` + `localStorage(user-profile)` + `Vuex(USER.STATE.IS_LOGIN)`
- **播放器**：`Vuex(TracksAbout.currentPlaylist, isPersonalFM)` + `PlayerCore.currentSong`
- **持久化**：`localStorage('acmusic_player_state', 'acmusic_player_quality', 'acmusic_play_mode')`

---

# 组件关系

```
App.vue
├── el-header（顶栏）   ──► BaseIcon × 3
├── router-view（主区）   ──► pages/*
│                                │
│                                ├── HomePage
│                                │   ├── PlaylistLayout / AlbumLayout / ArtistLayout / PersonalFM
│                                │   └── playTracksBtn
│                                ├── ExplorePage (tabs)
│                                │   ├── AllList / BoutiqueList / MvList / VideoList / LeaderBoard / ArtistList
│                                │   └── (子) PlaylistLayout / VideoLayout / ArtistLayout
│                                ├── UserPage
│                                │   ├── 未登录 → phoneLogin / qrcodeLogin
│                                │   └── 已登录 → UserDetailLayout
│                                ├── ListDetail / AlbumDetail / ArtistDetail / ArtistAllSongs
│                                │   └── PlaylistLayout / AlbumLayout / TracksLayout / MvLayout / VideoLayout
│                                ├── mvPlay / VideoPlay → VideoPlayerLayout → vidPlayer (xgplayer)
│                                ├── SearchResult (tabs)
│                                │   └── 9 个 search/*Res 子视图 + MultimatchLayout
│                                ├── UserDetail → UserDetailLayout
│                                └── DailySongs → TracksLayout
├── DoSearch（搜索弹层） ──► ElementUI (autocomplete-style suggest + 热搜榜)
└── MusicPlayer（播放器）
    ├── PlayCore (核心)
    │   └── Audio (原生 <audio> 元素实例)
    ├── QualityMenu（音质选择弹层）
    └── CommentLayout（评论区，详情模式下展开）
        └── CommentContentLayout / SendComment
```

# API 结构

所有 API 调用通过 `src/api/*.js` 薄封装，传入字符串路径到 `request(url, {params})`，最终统一走 `src/api/request.js`。

## 已封装接口（不全）

| 模块 | 接口 |
| --- | --- |
| **auth** | `/register/anonimous` · `/login/refresh` · `/login/qr/key` · `/login/qr/create` · `/login/qr/check` · `/captcha/sent` · `/captcha/verify` · `/login/cellphone` · `/login/status` |
| **Album** | `/album` |
| **Playlist** | `/playlist/create` · `/playlist/delete` · `/playlist/subscribe` · `/playlist/tracks` · `/playlist/privacy` · `/playlist/track/all` |
| **Tracks** | `/lyric` · `/simi/song` · `/playmode/intelligence/list` · `/like` · `/fm_trash` · `/scrobble` |
| **Comment** | `/comment/new` · `/comment/like` · `/hug/comment` · `/comment` (send/del) |
| **User** | `/artist/sublist` · `/album/sublist` · `/topic/sublist` · `/mv/sublist` · `/follow` · `/user/record` · `/user/cloud` · `/user/cloud/detail` · `/user/cloud/del` |

## 散落在页面里的直接请求（应逐步封装）

- 首页 6 个并发请求：`/personalized` `/top/playlist` `/album/newest` `/top/artists` `/toplist/detail` `/recommend/resource` `/personal_fm` `/recommend/songs`
- 歌单详情：`/playlist/detail` `/playlist/track/all`
- 歌手详情：`/artists` `/artist/top/song` `/artist/album` `/artist/mv` `/simi/artist` `/artist/video`
- 专辑详情：`/album`
- 视频 / MV：`/mv/detail` `/mv/url` `/simi/mv` `/video/detail` `/video/url` `/related/allvideo` `/mlog/to/video`
- 搜索：`/cloudsearch` `/search/multimatch` `/search` (voice) `/search/suggest` `/search/default` `/search/hot/detail`
- 用户：`/user/detail` `/user/playlist` `/user/record` `/login/status`
- 评论：`/comment/new` `/comment/like`
- 发现：`/playlist/catlist` `/top/playlist` `/playlist/highquality/tags` `/top/playlist/highquality` `/mv/all` `/mv/first` `/video/group/list` `/video/group` `/video/timeline/recommend` `/toplist/artist`
- 排行榜：`/toplist/detail`

> ⚠️ 大量页面直接 `this.$axios(...)`。**新增 API 调用应优先复用 `src/api/*`，复杂业务再单独建文件**。

# 数据库结构

**无数据库**。所有持久化：

| Key | 内容 | 用途 |
| --- | --- | --- |
| `MUSIC_U` (cookie) | 网易登录 token | 接口鉴权 |
| `__csrf` (cookie) | csrf | 接口鉴权 |
| `store-cookie-MUSIC_U` (localStorage) | 备份 | js-cookie 偶发失效兜底 |
| `user-profile` (localStorage) | `{nickname, avatarUrl, userId, ...}` | 顶栏头像 / 用户名 |
| `acmusic_player_state` (localStorage) | `{song, playlist[], currentIndex, currentTime, duration, quality, source, playMode, timestamp}` | 刷新后恢复播放 |
| `acmusic_player_quality` (localStorage) | `{level: 'standard'\|...}` | 音质偏好 |
| `acmusic_play_mode` (localStorage) | `'order' \|'\|'loop'` | 播放模式 |

# 当前架构

```
┌─────────────────────────────────────────────────────────────────┐
│                           App.vue                                 │
│  ┌─────────────────────────────────────────────────────────────┐ │
│  │ $bus (Vue.prototype)                                         │ │
│  │ pubsub (pubsub-js)                                           │ │
│  │ Vuex (3 modules)                                             │ │
│  │ Vue Router (hash mode)                                       │ │
│  └─────────────────────────────────────────────────────────────┘ │
└──────┬──────────────────────────────┬──────────────────────────────┘
       │                              │
       ▼                              ▼
   [Pages Layer]                 [Player Layer]
   路由驱动                       PlayerCore (Audio)
   监听 $bus                       watch(song/props)
   axios 拉数据                    URL 降级链
   渲染 Layout                     持久化状态
```

# 已知问题

## 高优先级

1. **`pages/UserPage.vue` 内有重复的 cookie 解析逻辑**（`storeCookie` 方法）— 与 `utils/auth.js` 的 `setLogin` 功能重叠，应重构统一

> 以下已通过 OPT-5 清理（2026-09-02 commit `chore: remove dead code`）：
> - ~~`playTracksBtn.vue` 中覆盖了 Vue 内置 `nextTick`~~ ✅
> - ~~`VoiceLayout.vue` 是空壳组件~~ ✅
> - ~~`utils/config/icon.js` 是死文件~~ ✅
> - ~~`utils/location.js` 已被 `areaCode.js` 取代~~ ✅
> - ~~`store/modules/Status.js` 仅占位~~ ✅（连同 `store/index.js` 注册同步移除）

## 中优先级

1. ~~**`commentContentLayout.toggleLike` 用 DOM 操作**（`evt.target.classList.replace`）而非响应式状态 — 点赞切换不可预期~~ ✅ 2026-09-03 commit `fix: comment like uses Vue state instead of DOM`

> 以下已通过本次 commit `fix: song like actually calls /like API` 修复（2026-09-03）：
> - ~~歌曲"喜欢"功能完全没接 API（PlayerCore/MusicPlayer `toggleLike` 只本地翻 `isLiked`，`likedCount++` 是假数据；`Tracks.like` API 封装存在但从未被调用）~~ ✅ PlayerCore 真实调用 `/like`，登录后 fetch `/likelist` 填充 `likedSongIds` Set，歌曲切换时同步初始状态

> 以下已通过 OPT-FM 修复（2026-09-02 commit `feat: implement FM auto-refresh`）：
> - ~~`pubsub.publish('getPersonalFM', ...)` 无订阅者~~ ✅ PersonalFM.vue 已订阅 + 实现 fetchMoreFM（5s 去抖 + 错误处理）

## 低优先级 / 已容忍

1. ~~大量 `console.log` / `console.trace` — 生产构建通过 `terser pure_funcs` 已剥离~~ ✅ 2026-09-03 commit `chore: clean up console.log/trace (keep error/warn)`（决策 25）
2. 多次重复的"骨架屏 → 列表"切换 — 各页面独立实现，未抽公共组件
3. `TracksLayout.vue` 模板中 `el-col v-if="t.artists"` 处 `t.artists` 永远为 truthy（数组永远存在）— 不影响功能
4. SCSS 文件中**模块化分割但 `<style lang="scss" scoped>` 大量覆盖到子组件样式**—通过 `::v-deep` 实现，可能影响可维护性

# 开发注意事项

## 修改 PlayerCore 时

- `watch.currentSong` 是入口，所有触发播放的代码最终都走这里
- `watch.curIndex` 是用户在播放列表切歌的入口
- `playRequestId` / `playContextId` / `playlistContextId` 用于 race condition 控制，**不要删除这些守卫**
- `_restoreState()` 是浏览器刷新后恢复的核心，注意它和 `watch.currentSong` 之间的 isRestoring flag
- `_saveState()` 每 5 秒自动保存一次

## 修改 API 时

- 新增 API 优先在 `src/api/*.js` 薄封装，避免在页面里写裸 `this.$axios(...)`
- NetEase API 字段名不一致，**必须经过 `utils/normalize.js`**
- 任何业务 code === 301 由 `request.js` 的拦截器统一派发 `api:unauthorized` 事件
- 加锁场景：`/video/group` 等受限接口需要匿名 cookie，`VideoList.vue` 自带 `retryOnce` 重试逻辑

## 修改样式时

- 全局变量在 `src/assets/scss/base/variables.scss`
- 动画令牌在 `src/assets/scss/base/motion.scss`，**复用 `motion-normal` / `ease-standard` 而非新写**
- 主题色 `$color-main: #8685EF` 是产品色，跨页面统一
- Element UI 主题覆盖在 `src/assets/scss/base/element-variables.scss`

## 修改图标时

- 所有图标必须用 `<BaseIcon name="..." />`
- 新增图标：在 `src/config/icon.js` 中加条目（`type: 'font'` 用字体 class；`type: 'svg'` 用 path）

## 修改路由时

- 详情页必须通过 `props: ($route) => ({...})` 透传 query 参数
- `meta.level > 1` 用于 PageBack 按钮的显隐

## 启动 / 构建

```bash
yarn serve     # vue-cli-service serve (HMR)
yarn build     # vue-cli-service build → dist/
yarn lint      # eslint 校验
```

> ⚠️ `lintOnSave: false` — dev 期间不会立刻报错，必须主动 `yarn lint`
> ⚠️ 生产构建通过 `vue.config.js` 的 `terser pure_funcs` 剥离 console `log/info/debug/trace`