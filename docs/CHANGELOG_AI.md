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