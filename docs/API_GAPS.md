# API 能力缺口与扩展建议

> 配套文件：`docs/API_INDEX.md`（433 个端点的自动生成索引，含参数与封装状态）
> 本文回答的是另一个问题：**接下来做什么功能值得做、成本多大**

## 结论先行

**不建议把 433 个端点的文档"读进记忆"。** 三个理由：

1. **体量不对等** —— 官方文档几十万字，塞进上下文会稀释检索精度，且每次会话都要重新加载。真正需要长期沉淀的是"端点索引 + 缺口判断"，不是文档全文。
2. **必然过期** —— 文档站是 docsify，正文从 jsDelivr 拉 GitHub 仓库 `NeteaseCloudMusicApiEnhanced/api-enhanced` 的 `public/docs`，跟 `main` 分支实时联动。本地存一份"背诵版"，升级后就会误导。
3. **有更准的信源** —— 生产服务器跑的是 v4.39.0，`/opt/api-enhanced/module/*.js`（端点+中文注释）和 `interface.d.ts`（参数表）才是与实际行为一致的权威来源，比线上文档更可信。

替代方案（已经落地）：**索引常驻 + 详情按需取**。

| 层 | 载体 | 用途 |
| --- | --- | --- |
| 索引 | `docs/API_INDEX.md` | 查"有没有这个能力"、参数是什么、本项目是否已封装 |
| 判断 | 本文 | 查"接下来做什么值、成本多大" |
| 详情 | 官方文档页 / 服务器包内模块源码 | 真要写某个接口时现取，不落库 |

## 现状盘点

| 项 | 数量 |
| --- | --- |
| 端点总数 | 433 |
| 本项目已封装（`src/api/*.js`） | 93（21%） |
| 未封装 | 340 |

已覆盖的主要面：登录（扫码/手机/匿名）、歌曲与音质降级、歌单读写、专辑、歌手、搜索、评论、MV/视频、私人FM、每日推荐、云盘读取、听歌打卡。

## P0：低成本、直接提升体验

都是"一个 wrapper + 一处 UI"的量级，不涉及架构改动。

| 能力 | 端点 | 现状与收益 |
| --- | --- | --- |
| 逐字歌词 | `/lyric/new` | 现在用 `/lyric` 只有整行时间轴。新版返回 `yrc`（逐字）+ 翻译 + 罗马音，歌词组件可以做逐字高亮，这是播放器最容易感知的升级 |
| 首页聚合 | `/homepage/block/page`、`/homepage/dragon/ball` | 首页目前是瀑布式发多个请求（`/personalized`、`/toplist/detail` 等串起来）。这两个接口一次给全量首页数据，首屏少 5～8 个请求 |
| 歌曲下载 | `/song/download/url/v1` | 现在只有播放 `url`，没有下载入口 |
| 版权可用性 | `/check/music` | 播放前预判灰色歌曲，减少"点了没声音"的困惑 |
| 会员信息 | `/vip/info` | 现在音质下拉对所有用户都开 `hires`，非会员点了必然走降级链。拿到 `vipType` 后可以只展示可用音质 |
| 收藏计数 | `/user/subcount` | 我的页缺"歌单/收藏/关注"数量 |

## P1：把"能听"变成"能管理"

| 能力 | 端点 | 说明 |
| --- | --- | --- |
| 歌单编辑闭环 | `/playlist/update`、`/playlist/track/add`、`/song/order/update` | 目前只能创建/删除/订阅，**改不了歌单内容**，这是明显的功能断口 |
| 关注体系 | `/user/follows`、`/user/followeds` | 关注/粉丝列表页，配合已有的 `/follow` 就能形成闭环 |
| 每日任务 | `/daily/signin`、`/vip/growthpoint/getall`、`/vip/tasks` | 签到 / 一键领成长值，能撑起一个"每日打卡"模块 |
| 动态与消息 | `/user/event`、`/user/comment/history`、`/msg/notices` | 我的动态、我的评论、通知中心 |
| 新歌与日历 | `/top/song`、`/calendar` | 新歌速递页、音乐日历（按时间轴听当天发行的歌） |

## P2：要做产品设计，别当小需求排

| 能力 | 端点 | 主要成本 |
| --- | --- | --- |
| 云盘上传 | `/cloud/upload/token` → `/cloud/upload/complete` | 分片上传 + 秒传判定 + 进度管理，工作量大 |
| 听歌识曲 | `/audio/match` | 需要前端录音、音频指纹提取，浏览器权限与兼容性都要处理 |
| 一起听 | `/listentogether/*` | 房间/心跳/播放状态同步，本质是个长连接状态机 |
| 批量请求 | `/batch` | 能显著减请求数，但要改 `request` 层，且会绕过网关缓存，历史上踩过 `460` |

## 踩过的坑（写新功能前先看）

- **未登录接口返回 `code 301`**：`src/api/request.js` 已统一派发 `api:unauthorized`，新接口不要各自判断一次。
- **`randomCNIP` / `realIP` 默认关闭**：会绕过 Gateway 缓存导致高频 `460`，除非明确需要，不要开。
- **音质降级链**：`config.player.qualityLevels` 是全局兜底，新功能如果自己调 `/song/url/v1`，别绕开这条链。
- **响应头体量**：网易云 API 会把 163 的整批 cookie 透传，响应头峰值 4KB+。线上 nginx 已把 `proxy_buffer_size` 调到 16k，换服务器/换反代时这个坑会原样复现（表现为随机 502）。
- **必须在 `src/api/*.js` 里加 wrapper**，组件内禁止直接 `request`，否则参数拼装和错误处理会各写一套。

## 怎么按需取详情

1. 先在 `docs/API_INDEX.md` 里定位路径和参数；
2. 需要完整参数语义 / 返回结构时，三选一：
   - 官方文档：<https://docs-neteasecloudmusicapi.focalors.ltd/#/?id=neteasecloudmusicapienhanced>（左侧目录按功能分组，锚点即页面 `id`）
   - 服务器包内源码：`/opt/api-enhanced/module/<下划线路径>.js`（最准，能直接看到上游 url 和字段拼装）
   - 历史版本差异：对比 `package.json` 的 version 与本索引表头记录

## 维护

API 升级后重新生成索引（索引表头会记录生成时的版本号）：

```bash
# 服务器：打包端点清单与类型定义
tar -czf /tmp/api-meta.tgz -C /opt/api-enhanced module interface.d.ts package.json

# 本地：取回并解包
scp root@<host>:/tmp/api-meta.tgz /tmp/api-meta.tgz
mkdir -p /tmp/apipkg && tar -xzf /tmp/api-meta.tgz -C /tmp/apipkg

# 重新生成 docs/API_INDEX.md（会打印版本/封装数/未归类分组）
node scripts/gen-api-index.mjs --pkg /tmp/apipkg
```
