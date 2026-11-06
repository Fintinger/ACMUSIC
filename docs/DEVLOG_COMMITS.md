# 提交清单（自动生成）

> 由 `scripts/build-devlog.mjs` 从 git 历史生成，**请勿手改**。
> 重新生成：`yarn devlog`。阶段与意图的叙述见 `docs/DEVLOG.md`。

共 174 个提交，时间跨度 2022-04-12 ~ 2026-11-05。

## 2026-11（9 个提交）

- `abf0e23` chore: 版本号升至 1.1.0 并同步文档 　`v1.1.0`
- `3d5b717` fix(ui): 登录页「欢迎回来」居中显示
- `13487e0` feat: 应用内更新日志（CHANGELOG.md + 弹窗 + 未读红点）
- `0dec95d` feat(player): 解灰状态提示、音质按曲目自适应、会员音质与未登录下载
- `2c79ebb` feat: release ACMUSIC 1.0.0 with redesigned UI and themes 　`v1.0.0`
- `3e8a88d` docs(marketing): add music client promotional materials
- `085e707` docs: record UI redesign acceptance for 1.0.0
- `b1bf024` docs: 记录页脚博客入口与移动端未适配提示
- `7daea3c` feat(ui): 页脚加「我的博客」入口，移动端打开提示暂未适配

## 2026-10（51 个提交）

- `497a97c` feat(ui): 统一全站消息通知机制——$toast / $confirmBox / $confirmTyped 　`stage/2026-10-refactor`
- `eddbf5b` ui(user): 收紧页面底部与 footer 的间距（156px → 48px）
- `7ddc2ce` ui(user): 标签分主次——hero 数字突出、区块 tab 一级、列表筛选二级
- `f8a841a` ui(user): 收紧标签尺寸，「云盘与收藏」四个 tab 单行放下
- `d8f1b81` ui(user): 去掉锚点吸顶条，页内切换标签统一为胶囊
- `01adee6` ui(user): 主页补回区块间距、歌单加分类标签、专辑/歌手改小图标
- `4ca4d8c` ui(user): 主页细节修正——两栏等高等宽、歌单改横排并限高
- `82f8c41` ui(user): 主页排版返工——全部样式页内私有实现，回滚对公共组件的改动
- `8082a33` ui(user): 个人主页排版重构——并排数据区/歌单统一网格/关注头像墙/锚点吸顶
- `dee8c5c` chore(ops): nginx 防护配置与部署手册入库
- `637cfac` fix(player): 补上听歌打卡，修复个人主页「最近一周」恒为空
- `7758f40` feat(artist): 歌手页「全部/更多」真正生效——全部歌曲与全部专辑独立分页页
- `c8d7da6` fix(player): 刷新后补全播放状态，修掉心动模式丢失
- `71479cf` fix(user): 他人主页关注按钮被裁切、自己主页误显示关注按钮
- `bd95280` feat: 年度听歌报告 + 用户主页增强（关注粉丝/VIP徽章/歌单导入删除）
- `5c3f764` docs: 记录评论时间补年份的改动与 dayjs 判空坑
- `baaffe8` fix(comment): 评论时间跨年补上年份
- `439fc10` docs: 记录漫游卡/心动卡双高亮的根因与修复
- `bba99c0` fix(home): 漫游卡区分「选中」与「播放中」，修掉与心动模式双高亮
- `61eed3e` feat(comment): 评论楼中楼——楼层展开、分页、点赞回复删除
- `8dd7b10` feat(player): 四层播放模式总览面板 + 底条组合标签
- `ca8c2a1` feat(player): 心动模式（智能播放），接管队列来源并补齐首页入口
- `1f712eb` feat(player): A-B 区间循环 + 定时停止，补齐单曲形态与环境约束两层
- `6fda81b` feat(fm): 私人漫游卡片行——模式与场景统一为独立卡片
- `49cb402` feat(player): 补齐顺序播放第四态，队列支持移除与置顶下一首
- `85e89e8` feat(player): 新增副歌播放模式，区间可视化与一键切换
- `b5ec96d` feat(search): 智能匹配改为等高卡片横向滚动，修复封面与点击范围
- `9a08288` fix(nav): 修复无头像时 ElDropdown 空插槽导致的导航区渲染崩溃
- `c4f14bc` feat(playlist): 歌单编辑闭环——改信息、移出歌曲、调整顺序（仅创建者）
- `08a7b76` perf(assets): 封面懒加载改用原生 loading=lazy，详情页主封面保持 eager
- `f23a2fb` feat(router): 路由级代码分割 + 404 兜底 + 滚动恢复 + 全局错误边界
- `54707df` feat(player): 接入系统媒体控制与全局快捷键，切音质保留播放进度
- `7f11628` chore(dev): 端口固定 8080 并新增清端口脚本，避免 dev server 孤儿进程堆积
- `c700a55` fix(player): 修复黑胶会员被误判为非会员而锁住无损/臻音
- `fa5d255` fix(fm): 私人FM 修复三张卡显示同一首歌
- `8ecc296` fix(video): 播放页推荐改按标题搜索并重排 UI，修 MV 评论与播放器黑框
- `3679421` fix(video): 标签筛选改用视频搜索，修复点击标签后空白
- `ec5267e` ci: 备份只保留最近 5 份，避免长期堆积
- `9c4e962` chore(release): v0.2.0 　`v0.2.0`
- `7c2d90f` ci: 触发首次自动部署（Secret 已配置）
- `b22cdee` ci: GitHub Actions 自动部署 + 产物 commit 版本戳 + 兜底脚本
- `04c2461` feat(footer): 补上源码仓库与反馈入口
- `7e54aaf` feat(footer): 全站页脚 — 品牌/版本、API 原仓库、免责声明
- `8f0fd2c` feat(player): 音质选择真正生效，去掉 unblock 并重排取流链
- `28396a5` fix(player): 音频地址在赋值处升级 https，消除音频混合内容
- `4e76c6c` fix(security): 消除 https 页面的混合内容，"不安全"提示
- `2ae182f` feat(player): P0 五项落地 — 逐字歌词、下载、版权判断、音质门控、收藏计数
- `82530d0` docs(api): add generated endpoint index and capability gap analysis
- `d8c719f` fix(login): surface QR polling gateway errors instead of swallowing them
- `67ebecd` chore(dev): 开发环境 API 指向线上后端，与生产路由完全一致
- `ae78eba` refactor(ip-location): 改为服务端 IP 归属地代理，移除高德 Key

## 2026-09（61 个提交）

- `896e202` docs: correct stale project facts and record proxy hardening 　`stage/2026-09-cleanup`
- `3070da8` fix: harden audio proxy (allowlist, Range passthrough, timeout, size cap) and clear all lint errors
- `d65181e` chore: tidy audio-proxy comment wording
- `ae3a99e` docs: record tier1+tier2 bug fixes in CHANGELOG_AI
- `d9dd511` fix: tier1+tier2 bug fixes (login countdown, daily-songs, cache, search, load-more, MV paging)
- `acc7d27` docs: record video side color CORS fallback
- `06b37f4` fix: video side bar falls back to non-black on CORS failure (cover color extraction is blocked)
- `cb850c7` docs: record video cover color side bar
- `394b7ed` refactor: video page side bars use cover-derived main color (not black)
- `f814a2b` docs: record video aspect ratio fix
- `99a07fb` fix: video player handles non-standard aspect ratios (9:16 etc.) without cropping
- `a8f48ee` chore: gitignore .omo/ (opencode tool scratch state)
- `4172c6a` chore: gitignore analysis/ (local scratch docs)
- `4300302` docs: record Vue Router history mode switch
- `b34cf98` refactor: switch Vue Router to history mode (clean URLs)
- `5482771` docs: record mixed content fix
- `963c19e` fix: upgrade netease CDN http to https to silence Mixed Content warnings
- `32d2c12` docs: record skeleton cleanup + mark 3 low-priority items resolved
- `f2be100` refactor: AlbumDetail uses PlaylistInfoSkeleton + TrackListSkeleton (drop 11 custom skel- CSS lines)
- `4c50c75` refactor: use shared .skeleton-item class (motion.scss) instead of 7 duplicate shimmer impls
- `90ae136` chore: remove dead t.artists branch in TracksLayout (normalize guarantees t.ar)
- `0544343` docs: record 2 console runtime bug fixes
- `4518ca6` fix: resolve 2 console runtime bugs (VideoPlay prop + clearAll mutation)
- `674f63d` docs: record clear-persisted-playlist fix
- `9b9d303` fix: clear localStorage when clearing playlist
- `c86778b` docs: record isPersonalFM state split decision
- `d589f57` refactor: move isPersonalFM from Vuex to PlayerCore (with \)
- `cf88bc3` docs: record console cleanup decision
- `0f61dbe` chore: clean up console.log/trace (keep error/warn)
- `7690c27` docs: record API wrapper consolidation decision
- `a5f585c` refactor: replace scattered \ calls with api wrappers (23 vue files)
- `b67a835` refactor: consolidate scattered API calls into api wrappers
- `424952a` fix: emit likeChange on song change so MusicPlayer red icon updates
- `3e2bef3` docs: record song like /like API fix decision
- `87178d4` fix: song like actually calls /like API
- `78b37ce` docs: record comment like Vue state decision
- `5c82ca5` fix: comment like uses Vue state instead of DOM
- `0a02af4` docs: record mixin path consolidation decision
- `dbffb15` refactor: consolidate mixins into src/mixins/
- `97172f2` docs: record FM shuffle disable decision
- `64d0d61` fix: disable shuffle in FM mode (preserve recommendation order)
- `b52cb5e` docs: record hardened _autoNext lock with audio ended event
- `ecfc038` fix: harden _autoNext lock with setTimeout + audio ended event
- `6cd5a9b` docs: record autoNextLocked bugfix decision
- `058a945` fix: lock _autoNext to prevent multi-fire on natural song end
- `5e17398` docs: record FM staged batch dual-event flow
- `0eaf5ed` refactor: FM staged batch with dual-event flow
- `50c4f17` docs: record FM prefetch coordination decision
- `a6b3c3d` fix: FM prefetch no longer interrupts current song
- `c83f074` docs: record FM 3-song cycle + proactive prefetch decision
- `9956950` feat: FM 3-song cycle + proactive prefetch
- `e2d63a8` docs: record isPersonalFM reset architecture decision
- `6c400cc` fix: reset isPersonalFM on playAllTracks + tighten FM debounce
- `2cb4250` docs: record FM auto-refresh + new batch architecture decisions
- `9f3fa90` feat: PersonalFM auto-refresh + advance curIndex on new batch
- `043b470` fix: listDetail cover-image self-closing tag
- `43f0853` docs: sync PROJECT_CONTEXT for dead code removal
- `0d299de` chore: remove dead code (location, icon config, VoiceLayout, Status module, custom nextTick)
- `45849e6` docs: add AI collaboration system and workflow prompts
- `367f46e` refactor: replace <img> with <cover-image> in 14 layout/page files for a11y
- `3cb7bc3` feat: add CoverImage component for unified image rendering with alt

## 2026-08（49 个提交）

- `7d946ab` feat(user): IP geolocation - Amap for CN + ipwho.is global fallback, unified hero-login line 　`stage/2026-08-player`
- `7876366` fix(ui): style playCount/fileSize columns in user tracks, fix fileSize calculation (÷1024)
- `479b76a` fix(ui): daily-card dark-bg text color CSS specificity override (closes #0073917)
- `0073917` fix(ui): adaptive text contrast for daily card and user hero based on cover brightness
- `25d154c` fix(ui): scale PersonalFM 3D cards to 90% (from 80%)
- `59c86d2` fix(ui): scale down PersonalFM 3D cards to 80%, fix autoplay blocked pause button state
- `0127de2` fix(ui): comment overlay fullscreen + search scrollbar shift
- `4226b75` fix(ui): search overlay transition and user dropdown popper-class fix
- `38a3f12` fix(navbar): keep avatar from wrapping, refine user dropdown, narrow search box
- `91905a2` fix(album): remove dead cover placeholder url and use local gradient
- `8d2c72b` chore(build): strip debug console output in production via terser pure_funcs
- `708e8ec` fix(player): fix refresh state, vertical volume popover, and shuffle-based random
- `55ea2c1` fix(navbar): enlarge search box, widen nav spacing, and add active tab underline
- `906899f` fix(layout): remove redundant el-main padding and align page bottom spacing
- `c606e25` fix(album): make album card clickable to open detail page
- `7fc28aa` fix(player): fix playback restore race and unify url fallback chain
- `73e3cd7` feat(player): sync document title with route and playing song
- `4e963fe` feat(user): Apple Music style profile page and login experience
- `69669f8` feat(explore): video/boutique tag scroller arrows and loading states
- `5a49057` refactor(explore): Apple Music style playlist filter and accordion nav
- `5b6e7be` fix(player): restore play switching and add expanded player mode controls
- `10a8867` feat(player): add play mode (order/random/loop) with persistence
- `88301fa` feat(player): add server-side audio proxy fallback for CDN blocked networks
- `31e451c` fix(player): retry same audio url instead of switching CDN domain
- `c012a64` fix(player): add audio error auto-retry with CDN domain rotation
- `9294264` chore: add .npmrc with legacy-peer-deps for npm install
- `b290833` feat(player): add playlist empty state, active song auto-scroll and audio buffer progress
- `0fd6f96` feat(player): sync search playback with playlist
- `fe81f20` feat(player): persist playlist state across refresh
- `40a0fc3` fix(player): fix repeated song click ignored due to same object reference
- `074cd77` feat: add player state persistence 　`v1.3-player-state`
- `407b1e5` feat: add global page back navigation 　`v1.3-page-navigation`
- `85fc820` fix: stabilize player playback state and race conditions 　`v1.2-player-stability`
- `9a96107` feat: stabilize player url fallback and error handling 　`v1.1-player-stability`
- `2d7a611` feat: improve music playback url fallback and error handling
- `a906439` feat: implement v1.3 motion design system 　`v1.3.0-motion-design`
- `c63c676` feat: PersonalFM 3D镜面倒影系统 + 播放按钮优化
- `883e896` feat: implement unified icon system 　`v1.2.0-icon-system`
- `91bc77c` fix: align logo with content in navbar 　`v1.1-ui-polish`
- `96ec0de` fix: improve homepage ui experience
- `b080df7` feat: complete ACMUSIC api modernization 　`v1.0-api-upgrade`
- `be5d906` feat(search): 重构智能匹配布局并优化 MV/视频卡片样式
- `0b6efd2` feat: optimize user and artist detail page layout
- `c00d813` fix: update listDetail comment styles and GridSkeleton padding
- `03ba66a` feat(search): optimize MV and video result card metadata display
- `2126a24` feat: optimize video player page layout and styles
- `ca7bee3` fix: optimize homepage skeleton layout and loading transition
- `d37f849` feat: optimize page skeleton loading and layout styles
- `5410c83` feat: 优化发现页列表布局与卡片样式

## 2026-07（1 个提交）

- `1aacf64` feat(comment): polish comment system UI and interaction

## 2023-07（1 个提交）

- `e36e5e5` bugfix:mv播放界面定位BUG

## 2023-03（1 个提交）

- `8c54656` +complete basic functions

## 2022-04（1 个提交）

- `c5b72a1` 利用elementUI和一些样式搭建好基本框架结构🤨 　`v0.1.0`

## 标签索引

- `stage/2026-08-player` → `7d946ab`
- `stage/2026-09-cleanup` → `896e202`
- `stage/2026-10-refactor` → `497a97c`
- `v0.1.0` → `c5b72a1`
- `v0.2.0` → `9c4e962`
- `v1.0-api-upgrade` → `b080df7`
- `v1.0.0` → `2c79ebb`
- `v1.1-player-stability` → `9a96107`
- `v1.1-ui-polish` → `91bc77c`
- `v1.1.0` → `abf0e23`
- `v1.2-player-stability` → `85fc820`
- `v1.2.0-icon-system` → `883e896`
- `v1.3-page-navigation` → `407b1e5`
- `v1.3-player-state` → `074cd77`
- `v1.3.0-motion-design` → `a906439`
