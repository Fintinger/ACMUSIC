# ACMUSIC 视觉体系重构计划（排版收敛 + 深色模式 + 主题色）— 提案

> 状态：**Phase 0–2 已有实现，完整验收未完成；Phase 3 基础接入已实现、调校与验收进行中**（2026-11-04）；Phase 4 暂缓，Phase 5 部分已穿插。复审结论见文末。
> 依据：`analysis/ui-design-review.md`（2026-11-04 全站排版与风格评审）+ `analysis/dark-mode-feasibility.md`（2026-10-21 深色模式可行性研究）
> 核心决策：**先 token 化 → 再一致性收敛 → 深色模式 → 主题色切换**。全程不引入任何新依赖（纯 SCSS/CSS 变量 + 手写覆盖层），符合 `AI_RULES.md` 底线 6。
> 执行约束：每个任务单独提交，按 `AI_RULES.md` 工作流程走（读上下文 → 影响分析 → CHANGELOG_AI.md 登记 → 改码 → lint/build → 浏览器人工核查 → 更新 CHANGELOG）。

---

## 一、目标与总原则

**根因判断**（两份分析的一致结论）：项目有颜色 token，但没有排版 token。间距、字号、行高、圆角、容器宽度散落在 59 个 SFC 里逐页手写；颜色 token 本身覆盖率也仅约 10%（209 处硬编码 hex / 378 处 rgba）。深色模式与主题色切换的成本都与这个数字成正比。

因此总原则只有一条：**先收敛颜色与排版决策进语义 token 层，把 209/378 的基数压下去，再开主题分支。** 顺序做反，每个不一致都会在两个主题下各调一遍，工作量翻倍且必然漏。

不可动摇的边界（引自评审"值得保留"清单，防止改坏）：
- `motion.scss` 动效 token 体系保持为范本，不重写；
- PlayerCore / MusicPlayer 深色体系是全站 UI 质量标杆，只做变量化接入，不动布局与信息结构；
- 发现/搜索/登录页的骨架（hero + 下划线 tab + 1200px 容器）作为全站基准，旧页向它对齐，而不是反向拉平。

## 二、现状基线（关键数据，改动前后对比用）

| 指标 | 现值 | 目标 |
| --- | --- | --- |
| 硬编码 hex / rgba | 209 / 378 处 | Phase 2 结束后新增为 0，存量压到两位数 |
| 主色硬编码（hex + rgba） | 约 57 处（30 + 27） | Phase 4 前收敛为 `$color-main` / `--c-accent` 引用 |
| 内容容器体系 | 3 套（80% / 1200px / 无上限） | 1 套（max-width 1200px + padding 24px） |
| Tab 风格 | 4 种 | 1 种（下划线 + 主题色） |
| 字号体系 | h1: 28~96px / h2: 18~24px 漂移 | h1 28px / h2 20px / 卡片 14px / 辅助 12px |
| 主题数 | 1（浅色，含 3 个深色孤岛） | 2（浅/深），可选 accent 换色 |
| 对比度不达标 | `#888` 3.54:1 / 主色文字 3.17:1 | 全部 ≥ 4.5:1（12px 以上正文） |

## 三、技术架构：token 语义层（Phase 1 的产出，后续所有阶段的共同地基）

采用 dark-mode 文档的**方案 C：CSS 变量语义层 + SCSS 别名 + 定向覆盖**（A 全量重构风险高、B 双主题类名维护成本高，均不取）。

### 3.1 新增 `src/assets/scss/base/tokens.scss`

`:root` 与 `html[data-theme="dark"]` 两个块，全站**唯一**允许出现具体色值的地方（初期只放浅色值）：

| token | 浅色 | 深色（Phase 3 填入） | 用途 |
| --- | --- | --- | --- |
| `--c-bg-base` | `#FFFFFF` | `#202633` | 页面底 |
| `--c-bg-elevated` | `#FFFFFF` | `#29313E` | 卡片、下拉、弹窗 |
| `--c-bg-sunken` | `#F2F2F4` | `#303949` | 输入框、次级块（原 `$color-theme-sec`） |
| `--c-bg-sunken-hover` | `#EBEBEE` | `#3A4556` | 替代 `darken($color-theme-sec,3%)` |
| `--c-bg-hover` | `rgba(0,0,0,.04)` | `rgba(255,255,255,.06)` | 通用 hover 叠层 |
| `--c-border` / `--c-border-strong` | `rgba(0,0,0,.06)` / `.12` | `rgba(255,255,255,.09)` / `.16` | 描边（深色下承担层级） |
| `--c-text-primary` / `secondary` / `tertiary` | `#000` / `#555` / `#6F6F6F`（原 #888，对比度修正） | `#EDF1F7` / `#C1C9D6` / `#B0B9C8` | 三档文字 |
| `--c-accent` | `#8685EF` | `#9B9AF3` | 主题色（色块场景） |
| `--c-accent-text` | `#5B5AD4`（新增，文字专用，4.5:1+） | `#9B9AF3` | 链接/激活文字 |
| `--c-accent-soft` | `rgba(134,133,239,.12)` | `rgba(155,154,243,.20)` | 选中态浅底 |
| `--c-danger` | `#e5484d` | `#FF5C61` | 危险/删除 |
| `--c-shadow-low/mid/high` | `rgba(0,0,0,.04/.12/.25)` | 深色下仅做边缘暗化，层级改靠 surface 提亮 + 描边 | 阴影三档 |

附排版 token（进 `variables.scss`，非 CSS 变量——它们不随主题变）：
`$fs-page: 28px; $fs-module: 20px; $fs-card: 14px; $fs-body: 14px; $fs-aux: 12px`；`$sp-1..6: 4/8/12/16/24/40px`；`$radius-card: 14px; $radius-img: 12px`。

### 3.2 `variables.scss` 改为别名（19 处现有引用零改动）

```scss
$color-theme:     var(--c-bg-base);
$color-theme-sec: var(--c-bg-sunken);
$font-black:      var(--c-text-primary);
$font-black-1:    var(--c-text-secondary);
$font-black-2:    var(--c-text-tertiary);
```

**例外：`$color-main` 保留字面量** `#8685EF`——它参与 `darken()/lighten()/rgba($var,.x)` 编译期运算，存 `var()` 字符串 Sass 直接报错。另立 `$color-main-text: var(--c-accent-text)`、`$color-main-light: #9d9cf5`（预计算，替代运行时 lighten）。

### 3.3 已知工程坑（实施时直接规避）

1. sass-loader **7.3.1** 只认 `css.loaderOptions.sass.prependData`，写 `additionalData` 静默失效；17 个纯 CSS `<style scoped>` 块进不了 SCSS 变量，只能用 `var()`——这正是选 CSS 变量的原因。
2. 4 处 `darken($color-theme-sec,3%)`（listDetail×2 / AlbumDetail / VideoPlayerLayout）与 2 处 `lighten($color-main,8%)`（commentLayout / sendComment）必须换 token / 预计算字面量，否则别名化后编译失败——它们就是 Layer 2 定向改造清单。
3. Element UI 2.15 无暗色主题、theme-chalk 颜色编译写死；**不引第三方暗色包**（与现存 47 处 `!important` 冲突），手写覆盖层且必须挂在 `main.js:19` 的主题 CSS 之后。

## 四、分阶段任务

### Phase 0 — 杠杆修复（预估 1.5 天，可与 Phase 1 并行启动）

改一处全站受益、且都是后续阶段的前置。每项一个提交。

| # | 任务 | 涉及文件 | 验收 |
| --- | --- | --- | --- |
| 0-1 | 删 Element 主色死代码，补 `.el-button--primary` 全局覆盖（背景/边框/hover 全走 `$color-main`/`$color-main-1`，与 element-overrides.scss 里 MessageBox 内已有的同款定义合并） | `element-variables.scss:3`、`element-overrides.scss` | 登录页、编辑歌单、导入歌单弹窗的主按钮为紫色；全站搜 `#409EFF` 无残留渲染 |
| 0-2 | 统一内容容器：`.el-main` 与导航行改 `max-width: 1200px; padding: 0 24px`；ListDetail 补自己的容器 | `app.scss:7-14`、`navigationBar.scss:17`、`listDetail.scss` | 1280 视口下导航与内容同宽对齐；换页无边缘跳变；2K 屏行宽 ≤1200px |
| 0-3 | 清死样式（**先确认无引用再删**，AI_RULES 底线 5）：listDetail 的 `background:#000/font-size:5rem` 调试残留、整个 `dailyTracksCard.scss`、空的 `userpage.scss`、`mixin.scss` 的 `scroll-bar()` | `listDetail.scss:99-106` 等四处 | `yarn build` 通过；grep 无引用；页面视觉无变化 |
| 0-4 | emoji 图标换 BaseIcon（🎤📅🎵📍 → singer/calendar/disc/location，icon.js 缺的 path 就补） | `AlbumDetail.vue:12-13`、`UserDetailLayout.vue:26`、`config/icon.js` | 专辑详情/用户 hero 无彩色 emoji |
| 0-5 | 字体层：`index.html` 补 `lang="zh-CN"`；字体栈删 Barlow（或真引入 woff2 仅 latin 子集 ~20KB，二选一，默认删）；全局 `font-variant-numeric: tabular-nums` | `public/index.html:2`、`reset.scss:27` | devtools 计算样式无死字体；时长/计数数字等宽 |

浏览器核查（对应 AI_RULES 第 6 节）：首页 / 发现 5 子页 / 歌单详情 / 专辑详情 / 我的（登录+未登录）/ 搜索面板。

### Phase 1 — token 语义层 + 排版基准（预估 1 天）

产出第 3 节架构。这一步**不做任何视觉变更**（浅色值与现状等价），是纯架构准备：

1. 新增 `tokens.scss`（浅色值）+ `variables.scss` 别名化 + 6 处 darken/lighten 定向改造（3.3-2 清单）；
2. `main.js` 引入 tokens.scss（在 element-variables 之前）；`html { background: var(--c-bg-base) }` 防刷新白闪；
3. 落三个全局规则：页面 h1 统一 28px、模块 h2 统一 20px（删 `reset.scss:131-134` 的 h2 1.5rem）、模块纵向间距统一 `$sp-6`（40px，替换 50/32/28/24 的漂移值）；
4. `DailySongs.vue` 的 96px h1 一并修正为 28px + hero 结构（这是字号基准的第一次实际应用）。

验收：`yarn build` 无 Sass 编译错误（重点盯 `darken()` 改造处）；全站视觉与 Phase 0 后一致（截图对比）；`$font-black-2` 消费处的字色已变为 #6F6F6F（对比度修正随别名生效）。

### Phase 2 — 一致性收敛（预估 3-4 天，每项一个提交）

所有新样式只允许消费 token。这一阶段结束，硬编码基数大幅下降，深色模式的成本被压到最低。

| # | 任务 | 要点 |
| --- | --- | --- |
| 2-1 | Tab 收敛为"下划线 + 主题色"一种 | 抽 `.ac-tabs` 公共类（以发现页实现为蓝本）；重写 `element-variables.scss:6-36` 的 el-tabs 覆盖（删 `width:5rem` 固定宽与 `padding:.5rem!important`）；删 UserDetailLayout 的 8 条 `!important` 抵消（`UserDetailLayout.vue:995-1053`） |
| 2-2 | TracksLayout 重排（全站收益最高单项） | flex 行 + 垂直居中（弃 el-col 与 margin-top 补偿）；40px 序号列（当前播放显示动态高亮）；表头行（歌曲/歌手/专辑/时长，12px 辅助色）；列宽 48/22/20/10 百分比；歌名 19.2→16px、歌手专辑 13px 辅助色；span 28 列溢出隐患随 el-col 弃用消除；单击播放（dblclick 保留一个版本兼容）；行操作按钮沿用现有 hover 浮层 |
| 2-3 | 文字溢出策略统一 | 列表场景一律 `ellipsis` + `title`；`scoText` 跑马灯仅保留页面唯一大标题与播放条 |
| 2-4 | 卡片体系统一 | 圆角 `$radius-card/$radius-img`；三处 `transition: transform 1.5s` → `$motion-normal`；全站卡片 hover 统一 `translateY($card-hover-y) + $card-shadow-hover`；发现页补 hover 上浮 |
| 2-5 | 首页网格改 gap | `reset.scss:82-103` 改 `repeat(5,1fr) + gap:$sp-4`，`li{padding:0}`；删 `explorepage.scss:36-43` 的 fix 覆盖段 |
| 2-6 | 文字用色对比度收尾 | 链接/激活文字从 `$color-main` 切 `$color-main-text`（--c-accent-text）；核查 12px 以下文字不再用三级灰 |
| 2-7 | 颜色收敛 | 本阶段触达的每个文件，顺手把 hex/rgba 换成语义 token（不追求一次清零，改到哪清到哪） |

浏览器核查（比 Phase 0 加码）：TracksLayout 消费方全测——listDetail / albumDetail / dailySongs / 搜索 9 tab（trackList 为主）/ 云盘与收藏 / 听歌排行；双击与单击播放都验一遍。

### Phase 3 — 深色模式落地（预估 1.5 天开发 + 1-1.5 天调校）

前置：Phase 2 验收通过。分两个提交批次。

**批次 A（1-1.5 天，跑通主流程）**
1. `tokens.scss` 填入深色列 + `html[data-theme="dark"] { color-scheme: dark }`；
2. 防首帧白闪：`public/index.html` `<head>` 最前插内联脚本（读 localStorage 写 data-theme）；
3. `src/utils/theme.js`：getStored / resolve(matchMedia) / apply / watchSystem，持久化键 `acmusic_theme`（与 `acmusic_player_quality` 命名一致），默认 `system`；
4. 切换入口：App.vue 导航加入所有访客可用的「外观」选择，支持跟随系统 / 浅色 / 深色；不能藏在仅登录可见的头像菜单。
5. Element 覆盖层 `element-dark.scss`（200-280 行，按实际用量：el-card / el-button / el-input / el-tabs / el-divider / el-dropdown / el-dialog / el-message），挂在 theme-chalk 之后；
6. 播放条深色提亮：`#23242F` + `border-top: rgba(255,255,255,.08)`（防层级消失）。

**批次 B（1-1.5 天，7 个退化点逐项调校——决定成品质感的部分）**

| 退化点 | 处理 |
| --- | --- |
| 阴影系统归零（最严重） | 层级机制换：elevated surface + `--c-border` 描边；弹窗/下拉可保留 0.55-0.65 黑阴影但必须配描边 |
| 白底封面刺眼 | 5 个图片网格的封面容器加 `outline: rgba(255,255,255,.10)` 压边 + `img { filter: brightness(.94) }`（不低于 .9） |
| `darken()` hover 失效 | 已在 Phase 1 换 `--c-bg-sunken-hover`，此处只验收 |
| 叠图文字继承错色 | daily-card `.line`、hero 标题等逐个显式锁色，永不依赖继承 |
| logo 黑字 | `html[data-theme="dark"] .logo img { filter: invert(1) }` |
| 骨架屏白闪 | shimmer 深色值 `#1E1E24→#26262E`（`motion.scss` token 化） |
| personal-fm 亮 ambient | 三色径向 alpha 降至 .10-.14，linear 换 `#1A1A22→#17171E` |
| （顺手）滚动条 | 自定义 `::-webkit-scrollbar` 手写深色值（`color-scheme` 管不到它） |
| （顺手）评论区 | 删 listDetail / AlbumDetail / VideoPlayerLayout 三处 `!important` 反补丁（深色下组件原生即正确）；浅色消费方改走 token——P2-1 顺势完成 |

验收：12 条路由 × 2 主题 × 3 状态（加载/空/有数据），复用 dark-mode 文档第 6 节清单；重点：硬刷新 10 次无白闪、播放条与页面分层清晰、叠图标题可读。

### Phase 4 — 主题色切换（可选，预估 0.5-1 天）

前置：全站主色消费已收敛（Phase 2-7 压缩后剩余的 PlayerCore/MusicPlayer/ModeMenu 等约 50 处硬编码在本阶段清完）。

- PlayerCore 的 `$accent: #8685EF` 局部变量 → `var(--c-accent)`；其 `lighten($accent,6%)` 预计算为 `$color-main-light`；
- rgba 主色场景用 `color-mix(in srgb, var(--c-accent) 10%, transparent)`（2026 浏览器全支持，无新依赖）；
- 换色即改 `--c-accent` 一个变量；如需用户可选，在切换入口旁加色板（浅/深主题 × accent 的组合 = `data-theme` + `--c-accent` 两个维度，互不干扰）。
- 注意：换 accent 时 `--c-accent-text` 需同档提供加深值（保持 4.5:1），色板定义时每个候选色成对给。

### Phase 5 — 打磨项（预估 4-5 天，可穿插、可裁剪）

| # | 任务 | 要点 |
| --- | --- | --- |
| 5-1 | 空态/错误态组件化 | 新增 `EmptyState`（BaseIcon 48px + 主说明 14px + 可选操作），替换"听歌排行获取失败"式裸文字；搜索空结果/云盘空/歌单空统一 |
| 5-2 | 首页色彩收敛 | FmRoamCards 11 渐变统一规则（主题紫域明度分档或饱和度 ≤60% 单色相）；PersonalFM ambient alpha .15-.22；HeartModeCard 同规则——深色模式批次 B 已顺带做了一半 |
| 5-3 | DailySongs 页面升级 | hero（28px 标题 + 日期副标题 + 封面模糊背景条）+ 播放全部工具条（复用 TracksLayout btns）；Phase 1 只修了字号，此处补完整页面 |
| 5-4 | 品牌层 | 品牌字体定案（若 Phase 0-5 选了引入 Barlow，此处扩展到数字/英文标题全用）；两种绿分工文档（`$color-ornament` 装饰 / `$feedback-success` 语义，或合并）；产出 Design Token 速查表 |
| 5-5 | 玩家内深浅一致性 | DoSearch 纯黑系（`rgba(10,10,10,.5)` + 层叠黑）换播放器深蓝紫系（#1a1a2e 域），统一"深色=播放语境"的隐喻 |

## 五、风险与规避

| 风险 | 规避 |
| --- | --- |
| 别名化后 Sass 编译失败（`rgba($var,.x)` 类） | Phase 1 只改 6 处已知运算点；build 红了立即回滚该文件别名（字面量与 `var()` 可逐文件灰度，这是方案 C 的核心优势：**可分批、可随时停**） |
| TracksLayout 重排破坏 6+ 消费方 | 重排前后截图对比；`recordPlayCount`/`fileSize`/actions 插槽逐个验；保留 dblclick 一个版本 |
| Element 覆盖层顺序错误被反压 | 覆盖层必须 import 在 `main.js:19` 之后，写注释锁定（element-overrides.scss 已有先例注释） |
| 深色下某页面漏调（白块/黑字） | 12 路由 × 3 状态清单硬验收；`window.__acmusicErrors` 无新增渲染错误 |
| keep-alive 缓存页面主题不同步 | 纯 CSS 变量切换，缓存实例无需重渲染（dark-mode 文档已论证无风险），但仍列入核查项 |
| 改坏播放器 | PlayerCore/MusicPlayer 仅做变量化接入（`$accent` → var），不动布局；音质/副歌/A-B/定时/播放列表逐项功能测 |

## 六、验收与提交纪律

- 每任务一提交，提交信息引用本计划编号（如 `ui: phase 2-2 tracks layout rework (#UI_PLAN)`）；
- 每提交前 `yarn lint && yarn build`；Sass deprecation 告警为噪声不处理（AGENTS.md 已注明）；
- 每提交后在 CHANGELOG_AI.md 登记：修改内容 / 文件 / 原因 / 测试结果 / 注意事项；
- 浏览器核查范围随阶段递增（Phase 0 基础 6 页 → Phase 2 加 TracksLayout 全消费方 + 搜索 9 tab → Phase 3 双主题全路由）；
- 视觉回归以截图对比为主（项目无测试 runner，analysis/ 的 cdp_*.py 脚本可复用做定点截图）。

## 七、里程碑与工时汇总

```
M0  Phase 0 完成            ~1.5 天   蓝按钮消失、容器对齐、死样式清零        ← 可独立发布
M1  Phase 1 完成            +1 天     token 地基，视觉零变化（含对比度修正）  ← 可独立发布
M2  Phase 2 完成            +3-4 天   tab/列表/卡片/字号全站收敛             ← 大版本发布点
M3  Phase 3 完成            +2.5-3 天 深色模式上线                          ← 大版本发布点
M4  Phase 4（可选）         +0.5-1 天 主题色切换
M5  Phase 5（可选穿插）     +4-5 天   空态/色彩收敛/品牌层
                              ————
核心路径 M0→M3 合计约 8-9.5 天；含可选项 13-15 天。
```

每个里程碑都是可叫停点：M0/M1 视觉风险为零；M2 即使不做深色也独立成立；方案 C 的分批特性允许在任何一步停住不损失已投入工作。

## 八、回滚策略

- **Phase 0/2**：常规 git revert 单提交；
- **Phase 1 别名化**：`variables.scss` 逐文件灰度——任一文件出问题，把该文件的别名换回字面量即可，不影响其他文件；
- **Phase 3 深色**：删 `data-theme` 写入（或 localStorage 清 `acmusic_theme`）即回浅色；覆盖层 `element-dark.scss` 独立文件可直接不引入；
- **Phase 4**：`--c-accent` 回默认值 `#8685EF`。

---

## 附：实施前需用户拍板的 3 个决策点

1. **Barlow 字体**：删（诚实回退系统字体）还是真引入（+20KB woff2，数字/英文标题更有品牌感）？——影响 Phase 0-5 与 5-4；
2. **深色模式默认值**：`system`（跟随系统）还是 `light`（用户手动开）？——影响 Phase 3 批次 A；建议 `system`；
3. **Phase 4/5 是否排期**：主题色切换与打磨项是"做"还是"砍"？——不影响 M0-M3 核心路径。


## 九、2026-11-04 复审修订（当前实施依据）

### 已修正的设计问题

- 验收状态：完成代码替换不等于通过全站验收。Phase 0–2 不再标成验收完成；Phase 3 当前是基础接入，仍须执行路由/状态矩阵。
- 容器：保留当前代码已有的 1400px 含内边距上限，不倒退到 1200px；导航和内容同宽。1200px 是原提案值，尚不能用“视觉零变化”描述这轮改造。详情标题 32px、页面标题 28px 是有意分层。
- 列表：保留歌曲名与歌手的两行结构，不强行拆为四个百分比列。单击歌曲名播放，采用原生 button 支持键盘；点击空白不播放。附加列以整表统一显隐并保留零值，表头与管理模式共享预留宽度。
- 对比度：反白文字恒为白色，新增按钮前景 token；文字强调色与装饰强调色分开。主要实心按钮采用加深底色，不能以“主题紫 + 白字”直接视为合格。
- 主题：游客可见的三态选择、首帧初始化、系统变化/跨标签页同步、监听清理、存储受限容错。主题存储由独立 theme.js 管理，登录存储仍由 auth.js 管理。
- 深色适配：需要业务表面、Element 局部覆盖与骨架颜色共同接入，不能宣称仅覆写 token 即全站零改动。个人 FM 的 ambient 背景也走主题 token。
- 色值规则：具体颜色集中维护是方向，图片遮罩、恒深色播放器、首帧脚本允许有明确用途的字面量。Phase 4 必须同步 accent/text/soft/button 成套色值，禁止只改一个 accent 就声称完成换色。
- Tab：全局移除无必要的 padding !important；用户面板紧凑筛选仍允许胶囊，不以“统一”删除层级语义。公共 ac-tabs 抽取尚未完成。
- 提交：不追溯拆分用户已有工作区，不自动 commit；按 docs/AI_RULES.md 提供分组建议，文档与业务分别提交。

### 继续推进顺序

1. 完成 Phase 3 的剩余业务面 token 化与双主题路由验收，重点用户详情、MV/视频、评论、搜索九子页及播放器浮层。
2. 登录后云盘、收藏、每日推荐、私人 FM 与歌单管理需真实会话核查；游客截图不能替代。
3. 再决定主题色板；EmptyState 与每日推荐 hero 已部分实现，不能将 Phase 5 整体视为完成。

首帧脚本使用的基础色须与 tokens.scss 同步；禁止通过十次刷新截图宣称证明完全无白闪，应补录首帧证据。


## 十、2026-11-04 继续实施记录

- 评论：共享组件采用 comment-* 语义变量，普通页面随浅/深切换；playerWrapper 局部保持恒深色。已删除歌单、专辑、视频页三套重复颜色 !important，保留标题隐藏、入口定位等布局差异。
- 编辑器：修正 Element textarea 的 scoped 穿透和按钮列宽，发送改为原生 disabled 按钮；回复取消事件现能关闭弹窗。验证未提交评论或点赞。
- 搜索：九分类统一空结果与首次失败重试；首屏加载结束且有结果才挂载自动加载更多；空结果与网络失败分开。分页失败保留已有内容并回退页码。
- 媒体：搜索用户卡、智能匹配、MV/视频卡、筛选/侧栏/编辑器表面接入主题；缺少发布日期的 MV 不再误显示当天日期。
- 主题容错：存储不可写时保留会话内手动选择，系统变化不能将其覆盖。

### 本轮浏览器覆盖

| 区域 | 覆盖 | 结果 |
| --- | --- | --- |
| 搜索九分类 | 同一关键词，浅/深各一轮 | 八类有数据；视频空态；无横向溢出 |
| 发现五分区 | 浅/深各一轮 | 全部/精品/MV/视频/榜单均有数据，无横向溢出 |
| 视频详情 | 海报、相关推荐、真实评论 | 深色可读，浅色回切正确 |
| 楼中楼 | 展开实际回复、切主题 | 层级可辨，无固定白块 |
| 评论编辑器 | 浅/深、空内容/输入、取消 | 显示正常；原生发送状态正确；不执行提交 |

这些覆盖不等于全部状态矩阵：首次失败/重试与分页失败通过离线断言验证，未在浏览器人为断网；视频搜索只覆盖空态，未验证有数据。播放器评论的恒深色规则已接入，但展开播放器后的交互尚待验收。登录后的云盘/收藏/管理、首帧无闪烁证据及全站状态矩阵仍未完成，Phase 3 保持进行中。


## 十一、roam-line 与深色基调修订

- 按用户反馈，深色采用蓝灰页面底 #202633、浮起表面 #29313E、输入/次级表面 #303949，避免接近纯黑。辅助文字随表面提亮，强调文字改用更亮的紫色。刷新首帧、骨架与 FM ambient 同步配套。
- 漫游行的标题、卡片表面/说明条、心动卡说明条、翻页箭头和选中描边全部消费主题 token。彩色图区保留反白叠字。
- 本轮漫游配色通过实际组件的隔离本地预览核查（使用模拟的最小队列状态，无登录/网络/播放）；不能等同于登录后完整首页业务验收。
