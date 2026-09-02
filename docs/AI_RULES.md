# AI Development Rules — ACMUSIC

> 约束 AI 后续如何修改本项目。所有规则都是**强约束**，不是建议。

---

# AI 开发原则

## 不可违反的底线

1. **不破坏已有功能** — 任何修改不得让现有页面崩溃、播放链路断裂、登录失效。
2. **不进行无意义重构** — 当前代码风格是历史沉淀，新代码应遵循而非"现代化"。
3. **修改前必须先读相关上下文** — 不读代码直接动手 = 必然引入 Bug。
4. **修改前必须先说明方案** — 在 CHANGELOG_AI.md 中记录"为什么改"和"影响范围"。
5. **不删除未知代码** — 看不顺眼 ≠ 应该删除。注释代码、死代码、未引用文件需先确认无引用再清理。
6. **不允许引入大型依赖** — 任何新增依赖（如 UI 库、状态库、动画库）必须先在 CHANGELOG_AI.md 中说明理由，**未经用户许可不得 install**。

## 工作流程（每次修改必须按顺序）

> 完整流程参见 `DEVELOPMENT_WORKFLOW.md` 第 1 节。本节为概要。

### 1. 阅读相关上下文
- 必读：`docs/PROJECT_CONTEXT.md`、`README.md`、`AGENTS.md`
- 必读：`docs/ARCHITECTURE_DECISIONS.md` 中的相关决策
- 必读：`docs/CHANGELOG_AI.md`（确认无未完成修改）
- 必读：`docs/DEVELOPMENT_WORKFLOW.md`
- 必读：目标文件上下游（被谁调用、调用了谁）

### 2. 分析影响范围
- 这个修改影响哪些页面 / 组件？
- 会影响 Vuex、$bus、pubsub 哪些事件？
- 会影响路由哪些 meta？
- 会影响播放器状态机哪些字段？

### 3. 提出修改方案
- 在 CHANGELOG_AI.md 中写：
  - 改了什么
  - 为什么改
  - 影响哪些文件
  - 是否需要回滚策略

### 4. 修改代码
- 严格遵循本文档后续所有规范
- 每次修改单独一个提交 / 一次对话，避免批量改 N 个无关文件

### 5. 执行 lint / build
```bash
yarn lint
yarn build
```
如有报错，必须修复才能交付。

### 6. 浏览器 Console 人工核查
- 改播放器逻辑 → 必须打开 `/listDetail`、点击播放 → 切换音质 → 切歌 → 暂停 → 刷新
- 改登录 → 必须测试匿名登录、二维码登录、退出
- 改搜索 → 必须测试所有 9 个 tab
- 改路由 → 必须测试前进后退、刷新

### 7. 更新 CHANGELOG_AI.md
- "修改内容 / 修改文件 / 修改原因 / 测试结果 / 注意事项"

---

## AI 任务完成标准

**一个任务只有满足以下全部条件才算完成**：

| # | 条件 | 说明 |
| --- | --- | --- |
| 1 | 代码修改完成 | 实际文件已写入 / 修改 |
| 2 | 测试通过 | `yarn lint` + `yarn build` 均成功 |
| 3 | CHANGELOG_AI.md 已更新 | 按模板填写修改条目 |
| 4 | Git 提交范围明确 | 已向用户提交"修改摘要 + Git 建议"，等待确认 |
| 5 | 未影响其他模块 | 跨模块影响已分析并写在 CHANGELOG |

### 失败处理

任何一项不满足，任务**不算完成**，必须：

- 修复修复后重新测试
- 补充 CHANGELOG 条目
- 不主动 commit

---

# 前端规范

## Vue 组件规范

### Options API（**不要尝试引入 Composition API**）

- 全部使用 Vue 2 Options API（`data`、`computed`、`methods`、`watch`、`mounted` 等）
- **禁止**使用 `<script setup>` 或 `setup()` 语法糖
- 单文件组件（SFC）结构固定顺序：
  ```vue
  <template>
    <!-- 模板 -->
  </template>

  <script>
  // import
  // export default { name, components, mixins, props, data, computed, watch, methods, mounted, beforeDestroy }
  </script>

  <style lang="scss" scoped>
  /* 样式 */
  </style>
  ```

### 组件命名

- **文件名**：PascalCase（如 `MusicPlayer.vue`）
- **组件 name**：PascalCase（如 `name: 'MusicPlayer'`），**必须显式声明**
- **Layout 组件**放 `src/components/layout/`，命名以 `*Layout.vue` 结尾
- **通用组件**放 `src/components/common/`

### Props / Emit 规范

- Props 用对象语法声明 `type` 与 `required`
  ```js
  props: {
    list: { type: Array, required: true },
    picName: { type: String, default: 'picUrl' }
  }
  ```
- 路由 query 参数透传使用 `props: ($route) => ({ id: $route.query.id })` 模式
- Emit 事件名使用 kebab-case，触发时同样使用 kebab-case
  ```js
  this.$emit('modal-open')
  this.$emit('update:isExpandInPlayerWin', false)
  ```

### 状态管理规范

- **全局状态**：放 Vuex（命名空间模块）
- **跨组件事件**：用 `$bus`（短事件）或 `pubsub-js`（播放器专用）
- **页面局部状态**：`data()` 中声明
- **播放器状态**：放 `PlayerCore.vue` 内部 data，不进 Vuex（避免污染）

#### Vuex 模块边界

- `UserAbout`：仅登录态（profile、IS_LOGIN）
- `TracksAbout`：currentPlaylist、isPersonalFM
- `StatusAbout`：**禁止新增**（已废弃）

### Mixin 规范

- 复用 mixin 放 `src/mixins/`（注意：**不是 `src/assets/mixin/`**）
- 单一职责，每个 mixin 只解决一类问题（如 `coverLight` 只检测亮度）
- data 中加注释说明每个字段含义

### SCSS 规范

- `<style lang="scss" scoped>` 默认
- 跨组件样式覆盖用 `::v-deep`（不要用 `/deep/` 或 `>>>`，已过时）
- 颜色 / 字号 / 间距 **必须引用 `src/assets/scss/base/variables.scss` 中的变量**
- 动画时长 / 缓动 **必须引用 `src/assets/scss/base/motion.scss` 中的 token**

```scss
/* 错误 */
background: #8685EF;
transition: opacity 0.3s ease;

/* 正确 */
background: $color-main;
transition: opacity $motion-normal $ease-standard;
```

### TypeScript 规范

- **本项目不使用 TypeScript**。所有 `.ts` / `.d.ts` 文件均不存在，不要试图引入 TS。

### 文件命名规范

| 类型 | 命名 | 示例 |
| --- | --- | --- |
| Vue 组件 | PascalCase | `MusicPlayer.vue` |
| API 封装 | PascalCase | `Playlist.js` |
| 工具函数 | camelCase | `audioCache.js` |
| Mixin | camelCase | `coverLight.js` |
| 全局样式 | kebab-case | `listDetail.scss` |
| 设计令牌 | camelCase | `$color-main`、`` |

### 图标使用规范

- **一律**用 `<BaseIcon name="..." />`
- 新增图标必须先在 `src/config/icon.js` 注册
- 不允许直接用 `<i class="el-icon-...">`（Element UI 图标）做产品图标
- 已有 `el-icon-male` / `el-icon-female`（UserDetail 用作性别标识）保留，但其他场景用 BaseIcon

---

# 修改流程（强制）

修改任何文件 **必须** 按以下顺序执行：

| 步骤 | 动作 |
| --- | --- |
| 1 | 阅读 PROJECT_CONTEXT.md 中相关章节 |
| 2 | 找到目标文件及其上下游（grep / read） |
| 3 | 阅读 ARCHITECTURE_DECISIONS.md 看是否有相关历史决策 |
| 4 | **在 CHANGELOG_AI.md 中写明本次修改计划**（改什么、为什么、影响范围） |
| 5 | 执行修改（最小变更原则） |
| 6 | `yarn lint` 无错误 |
| 7 | `yarn build` 成功 |
| 8 | 浏览器 console 核查（如涉及播放/登录/路由） |
| 9 | 在 CHANGELOG_AI.md 追加"修改结果 / 测试结果 / 注意事项" |

如果步骤 1-3 中发现有不明确的依赖或副作用，**立即停下来**提问用户。

---

# 禁止行为（清单）

| ❌ 禁止 | ✅ 应做 |
| --- | --- |
| 删除看不顺眼的代码 | 先 grep 确认无引用 → 标记 deprecated → 后续清理 |
| 改 `package.json` 加入大型依赖 | 先在 CHANGELOG_AI.md 中说明并询问用户 |
| 修改 PlayerCore 的核心状态机 | 必须**先完整阅读**整个文件，并在 CHANGELOG_AI.md 中详述影响 |
| 把 Vuex 写入 PlayerCore data | PlayerCore 状态应保持组件内 |
| 用 Composition API 重写组件 | 保持 Options API |
| 用 TypeScript 重写 | 保持 JavaScript |
| 直接 `localStorage.setItem(...)` | 用 `utils/auth.js` 提供的封装 |
| 直接 `Cookies.set(...)` | 用 `utils/auth.js` 提供的封装 |
| 在页面内裸 `this.$axios(...)` 写业务逻辑 | 优先在 `src/api/*.js` 封装 |
| 重复 `src/components/layout/*` 中的已有组件 | 直接复用 |
| 写模板时直接 `t.ar[0].name` | 先 `normalizeTrack(t)` 再访问 |
| 在 `<style>` 中硬编码颜色 / 尺寸 | 用 variables.scss 变量 |
| 修改 SCSS 时跳过 motion token | 必须用 motion-normal / ease-standard |
| 删除 `$bus.$on` 时忘记 `$off` | 必须在 `beforeDestroy` 中清理 |
| 修改 `utils/normalize.js` 删除兼容字段 | 该文件原则：**只增加，不删除** |
| 在 router 改 push 行为 | 不要重写 `VueRouter.prototype.push`（已有兜底） |

---

# 数据规范

## NetEase API 字段适配

**任何**从 NetEase API 拿到的数据**必须先经过 `utils/normalize.js`**：

```js
import { normalizeTrack } from '@/utils/normalize'

this.$axios('/song/detail?ids=' + id).then(res => {
  const song = normalizeTrack(res.data.songs[0])
  // 现在 song 同时有 ar/artists、al/album、picUrl/coverImgUrl
})
```

**严禁**在模板 / 方法里写 `t.ar[0].name || t.artists[0].name || t.artist.name` 这种链式兜底。

---

# 播放器修改守则（强约束）

`components/musicPlayer/PlayerCore.vue` 是项目核心，修改必须遵守：

1. **不要删除** `playRequestId` / `playContextId` / `playlistContextId` / `isRestoring` 这些 race condition 守卫
2. **不要合并** `checkSongLoggedIn` 和 `checkSongDntLogin`（已登录 / 未登录走完全不同的链路）
3. **不要简化** URL 降级链（`hires → lossless → exhigh → higher → standard → /song/url → /song/url/match`）
4. **不要修改** `_saveState` / `_restoreState` 的字段结构（已与 localStorage 持久化数据耦合）
5. 新增音质选项：在 `config.js` 的 `player.qualityOptions` 加条目 + 在 `qualityLevels` 加降级顺序
6. 新增播放模式：扩展 `playMode: 'order' | 'random' | 'loop'` 枚举 + 在 `getNextIndex` / `getPrevIndex` / `_autoNext` 处理

---

# 错误处理规范

- API 错误：统一在 `request.js` 拦截器处理。业务 301 / HTTP 401 派发 `api:unauthorized` 事件
- 页面层不应直接监听 `axios` 错误除非需要自定义提示
- 播放器降级失败：自动切下一首（在播放列表中时），详见 PlayerCore `_inPlaylist()`
- 永远不要 `alert(...)` 做错误提示 — 用 `this.$message.error(...)`（Element UI）

---

# Git 提交规范

> 完整规范参见 `DEVELOPMENT_WORKFLOW.md` 第 2-5 节。本节为 AI 必须遵守的硬规则。

AI 参与开发时 **必须** 遵守项目 Git 管理规则。

## 基本要求

- **修改前**：确认任务范围（属于 `feat` / `fix` / `refactor` / `docs` / `chore` / `style` / `test` 哪一类）
- **修改后**：执行 `git status` 检查暂存内容
- **不自动提交**：必须先向用户输出"修改摘要 + Git 建议"，等待用户确认
- **不混合 commit**：禁止把不同类型修改混入同一 commit

## 类型与范围

| 类型 | 涉及范围 | commit message 示例 |
| --- | --- | --- |
| `feat` | Vue 组件 / JS / API / utils 新功能 | `feat: add volume slider to player bar` |
| `fix` | 已存在问题修复 | `fix: resolve duplicate navigation error` |
| `refactor` | 代码结构优化 | `refactor: extract URL fallback into module` |
| `docs` | AI 协作文档（`docs/*.md`） | `docs: add DEVELOPMENT_WORKFLOW.md` |
| `chore` | 配置 / 构建 / 工具 | `chore: bump axios version` |
| `style` | 仅 SCSS 微调 | `style: polish search tab animation` |
| `test` | 测试添加 / 修改 | `test: add PlayerCore unit test` |

## 禁止行为

- ❌ **混合 commit**：业务代码 + AI 文档 + 配置文件一起提交
- ❌ **无意义大 commit**：一次提交 10+ 文件、无明确主题
- ❌ **不检查暂存**：直接 `git add .` 然后 `git commit`
- ❌ **自动 commit**：未确认就执行 `git commit`
- ❌ **回滚他人 commit**：除非用户明确指示

## 修改文档类提交

涉及 AI 协作文档修改（`docs/*.md`）时：

- 必须使用 `docs:` 前缀
- 必须与业务代码修改**分开 commit**
- 在 `CHANGELOG_AI.md` 中追加条目

---

# CHANGELOG_AI.md
- 每次 AI 修改必须留痕（详见该文件模板）
- 即使 commit 也必须写 CHANGELOG_AI.md
- commit 类型为 `docs` 时同步追加条目

---

# 文档约定

- 所有 Markdown 文件用中文
- 表格保持窄列，避免长行（终端显示友好）
- 代码块使用 ``` 围栏，标注语言（```js / ```vue / ```scss）