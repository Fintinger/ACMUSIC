# Development Workflow — ACMUSIC

> 项目级标准开发流程。任何代码 / 文档修改必须遵循本文档。

---

## 1. AI 辅助开发流程

任何 AI 任务执行前 **必须** 按以下顺序操作：

### 步骤 1：阅读上下文文档
- `docs/PROJECT_CONTEXT.md` — 项目知识库
- `docs/AI_RULES.md` — AI 修改守则
- `docs/ARCHITECTURE_DECISIONS.md` — 架构决策记录
- `docs/CHANGELOG_AI.md` — 历史修改记录（**最后阅读**，确认不在进行中的修改）

### 步骤 2：理解当前架构
- 涉及播放器 → 必读 `PlayerCore.vue`（1300+ 行）
- 涉及登录 → 必读 `utils/auth.js`
- 涉及样式 → 必读 `assets/scss/base/variables.scss` + `motion.scss`

### 步骤 3：分析任务影响范围
- 影响哪些页面 / 组件？
- 影响哪些 Vuex / $bus / pubsub 事件？
- 影响哪些路由 meta？
- 影响播放器哪些状态字段？
- 是否涉及 localStorage 持久化？

### 步骤 4：提出修改方案
向用户输出一句话方案，**等待用户回复确认后**再执行。不允许未经同意直接动手。

### 步骤 5：修改代码
- 最小变更原则
- 遵循 `AI_RULES.md` 的全部规范
- 单次任务只改一类东西

### 步骤 6：执行测试
- `yarn lint` ✅
- `yarn build` ✅
- 浏览器 Console 核查 ✅

### 步骤 7：更新 CHANGELOG_AI.md
追加修改条目，按文件模板填写。

---

## 2. Git 提交规范

### 核心原则

**小粒度 commit**。不同类型修改必须分开提交。

> 一次 commit 只表达**一个明确目的**。

### Commit 类型一览

| 类型前缀 | 用途 | 涉及范围 |
| --- | --- | --- |
| `feat` | 新功能 | Vue 组件 / JS 代码 / API / utils |
| `fix` | Bug 修复 | 已存在的问题修复 |
| `refactor` | 重构 | 代码结构优化（不改业务） |
| `docs` | AI 文档修改 | `docs/*.md`（含本工作流文件） |
| `chore` | 配置 / 工具变更 | `vue.config.js` / `package.json` / `.env` / 构建脚本 |
| `style` | 样式微调 | 仅样式修改（不动逻辑） |
| `test` | 测试 | 添加 / 修改测试 |

### 详细规则

#### 功能开发 — `feat`
- 范围：Vue 组件、JS 代码、API 接口、utils 函数
- 格式：`feat: 描述`
- 示例：`feat: add volume slider to player bar`

#### Bug 修复 — `fix`
- 范围：修复已有问题
- 格式：`fix: 描述`
- 示例：`fix: resolve duplicate navigation error on list detail`

#### 重构 — `refactor`
- 范围：代码结构优化，不改业务行为
- 格式：`refactor: 描述`
- 示例：`refactor: extract PlayerCore URL fallback into separate module`

#### AI 文档修改 — `docs`
- 范围：`PROJECT_CONTEXT.md` / `AI_RULES.md` / `ARCHITECTURE_DECISIONS.md` / `CHANGELOG_AI.md` / `DEVELOPMENT_WORKFLOW.md`
- **必须单独提交**，不与代码混在一起
- 格式：`docs: 描述`
- 示例：`docs: add DEVELOPMENT_WORKFLOW.md and update AI rules`

#### 配置修改 — `chore`
- 范围：`vue.config.js` / `package.json` / `.env` / `babel.config.js` / `.npmrc`
- 根据影响单独提交
- 格式：`chore: 描述`
- 示例：`chore: bump axios to 0.27.x`

#### 样式微调 — `style`
- 范围：仅 SCSS 修改
- 格式：`style: 描述`
- 示例：`style: polish search tab underline animation`

> **本项目无博客 / 文章 / Hugo / Go / Vite** — 不适用 `post:` / `content/posts/` 等模式。如未来引入，按本节格式补充。

---

## 3. Commit 边界规则

### 禁止

- ❌ 功能代码 + AI 文档混合 commit
- ❌ 多个无关任务一次 commit
- ❌ "大杂烩" commit（一次提交 10+ 文件、无明确主题）
- ❌ 在 commit 中混入生成产物（`dist/` / `node_modules/`）

### 必须

- ✅ 一个 commit 只表达一个目的
- ✅ AI 修改业务代码 → 单独 `feat` / `fix` / `refactor` commit
- ✅ AI 修改 AI 文档 → 单独 `docs` commit（**永远与代码分开**）
- ✅ AI 修改配置 → 单独 `chore` commit

### 示例

**错误示范**：

```
fix: 修复播放器 bug 并补充 AI 文档
- 修改 PlayerCore.vue
- 修改 docs/PROJECT_CONTEXT.md
- 修改 docs/AI_RULES.md
```

**正确示范**：

```
fix: 修复播放器自动恢复 bug
- 仅修改 PlayerCore.vue

docs: 更新已知问题记录播放器恢复细节
- 仅修改 docs/PROJECT_CONTEXT.md
```

---

## 4. Commit 提交前检查清单

提交前 **必须** 执行：

### Step 1：检查暂存

```bash
git status
git diff --staged
```

### Step 2：核对 commit 目的

暂存文件是否都符合本 commit 目的？

如果存在无关文件：

```bash
git reset HEAD <file>          # 取消暂存
git checkout -- <file>         # 还原修改
```

### Step 3：确认没有混入

- ❌ 没有混入无关代码
- ❌ 没有混入 AI 文档（除非本 commit 是 docs）
- ❌ 没有混入配置文件（除非本 commit 是 chore）
- ❌ 没有混入 `dist/` / `node_modules/` 等产物

### Step 4：commit message 格式

```
<类型>: <一句话描述>

（可选）详细说明
```

- 类型前缀必填（`feat` / `fix` / `refactor` / `docs` / `chore` / `style` / `test`）
- 一句话描述简洁明确
- 描述用中文（项目历史风格）

---

## 5. AI 提交建议流程

**AI 完成修改后不直接执行 commit**。必须先输出建议，等待用户确认。

### 输出格式

#### 修改摘要

```
### 修改内容
（一句话说明）

### 修改文件
- `path/to/file1.ext`
- `path/to/file2.ext`
```

#### 测试结果

```
- `yarn lint` ✅ / ❌
- `yarn build` ✅ / ❌
- 浏览器核查：✅ / ❌（如涉及）
  - 说明核查了哪些页面
```

#### Git 建议

```
### Commit 类型
docs: / feat: / fix: / chore: /

### Commit message
类型: 一句话描述

### 包含文件
- `path/to/file1.ext`
- `path/to/file2.ext`

### 不包含文件
（确认本次不提交的文件，如有特殊原因说明）
```

#### 等待用户确认

输出后**立即停止**，不主动执行 `git add` / `git commit`。

### 用户确认后

用户回复 "提交" / "commit" / "go" 后，由 AI 执行：

```bash
git add <files>
git commit -m "<type>: <description>"
```

> ⚠️ 用户回复 "全部提交" / "提交所有" 时，AI **仍需逐个 commit**，不允许合并多个目的。

---

## 6. 测试要求

### 前端修改完成后必须执行

| 类型 | 命令 | 说明 |
| --- | --- | --- |
| Lint | `yarn lint` | ESLint 校验 |
| Build | `yarn build` | 生产构建（dist/ 输出） |
| Console | 浏览器 DevTools | 手动核查 console 错误 |

### 后端 / 服务端函数修改

| 类型 | 命令 | 说明 |
| --- | --- | --- |
| Serverless | （Vercel 自动） | 修改 `api/*.js` 后推送到 Vercel 即可 |

> 本项目**无单元测试**（已在 `AGENTS.md` 中说明）。不强制要求单测。

### 浏览器 Console 核查清单

涉及以下功能时必须**手动浏览器核查**：

- **播放器逻辑**：打开 `/listDetail`，点击播放 → 切换音质 → 切歌 → 暂停 → 刷新页面（验证恢复）
- **登录**：测试匿名登录、二维码登录、手机号登录、退出登录
- **搜索**：测试所有 9 个 tab
- **路由**：前进 / 后退 / 刷新 / 直接访问详情 URL
- **评论**：发布 / 回复 / 点赞 / 删除
- **样式改动**：不同分辨率 / 主题 / 浏览器

---

## 7. 发布流程

> 本项目目前**无正式 CI/CD**。手动发布流程如下。

### 手动发布步骤

1. **本地验证**
   ```bash
   yarn lint
   yarn build
   ```
   确认 `dist/` 生成成功。

2. **推送代码**
   ```bash
   git push origin master
   ```
   Vercel 会自动构建并部署。

3. **验证 Vercel 部署**
   - 打开 Vercel Dashboard
   - 查看最新部署状态
   - 测试线上 URL

4. **Serverless 函数（如修改了 `api/`）**
   - Vercel 会自动部署 `api/audio-proxy.js` 等
   - 验证线上音频代理功能

### 版本号

- 本项目**未使用语义化版本**（`package.json` 固定 `0.1.0`）
- 不需要打 tag / release
- 通过 commit 历史追踪版本演进

---

## 8. 文档更新规则

### AI 协作文档（`docs/`）

| 修改类型 | 提交类型 |
| --- | --- |
| `PROJECT_CONTEXT.md` 内容更新 | `docs:` |
| `AI_RULES.md` 新增规则 | `docs:` |
| `ARCHITECTURE_DECISIONS.md` 新增决策 | `docs:` |
| `CHANGELOG_AI.md` 新增条目 | `docs:` |
| `DEVELOPMENT_WORKFLOW.md` 新增 / 修改 | `docs:` |

> 所有 `docs/` 修改必须独立 commit，**绝不与业务代码混合**。

### README.md / AGENTS.md

- `README.md`：开发日志，作者手动维护
- `AGENTS.md`：项目简要说明，作者手动维护
- AI 修改这两个文件 → 也用 `docs:` commit

### 修改时机

- 发现新架构决策 → 追加 `ARCHITECTURE_DECISIONS.md`
- 发现新已知问题 → 追加 `PROJECT_CONTEXT.md` 的"已知问题"章节
- 修改业务代码 → 追加 `CHANGELOG_AI.md`
- 修改 AI 规则 → 同步更新 `AI_RULES.md` 与本文件，保持一致

---

## 9. 工作流自检

完成本工作流的修改后，AI 自问自答：

1. ✅ 我读完了所有 `docs/*.md` 吗？
2. ✅ 我的修改属于 `feat` / `fix` / `refactor` / `docs` / `chore` / `style` / `test` 哪一类？
3. ✅ 我只把该类型的文件加入了暂存？
4. ✅ 我的 commit message 符合格式？
5. ✅ 我没有自动 commit？
6. ✅ 我输出了"修改摘要 + Git 建议"等待用户确认？

任何一项为 "否"，立即停止提交并修正。

---

**最后更新**：2026-09-02
**维护者**：AI（与项目主协同维护）