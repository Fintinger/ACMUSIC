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