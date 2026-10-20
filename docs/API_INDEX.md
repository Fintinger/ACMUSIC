# 网易云 API 端点索引（自动生成，勿手改）

> 数据来源：生产服务器 `/opt/api-enhanced` **v4.39.0** 的 `module/*.js` + `interface.d.ts`
> 重新生成：`node scripts/gen-api-index.mjs --pkg <API 包目录>`
> 官方文档：<https://docs-neteasecloudmusicapi.focalors.ltd/#/?id=neteasecloudmusicapienhanced>

## 怎么用这张表

- **路径**直接用：`request('/song/download/url', { params })`；get/post 都收，参数走 query 或 body 皆可
- **参数**列：不带 `?` 的是必填，带 `?` 的是可选；超过 6 个用 `+N` 截断，完整表见 `interface.d.ts`
- 官方 d.ts 把大量必填参数也标成了 `?`（历史遗留），拿不准时以官方文档页面为准
- **已封装** = `src/api/*.js` 里已有 wrapper，可直接调用，不用动 API 层
- 说明列 `-` 表示该模块没写注释，用途看文件名或文档

## 统计

| 项 | 数量 |
| --- | --- |
| 端点总数 | 433 |
| 本项目已封装 | 93（21%） |
| 未封装 | 340 |
| 有中文注释 | 372（86%） |
| d.ts 无参数表 | 117 |

## 端点一览

### 登录 / 账号（23）

| 路径 | 说明 | 参数 | 已封装 |
| --- | --- | --- | --- |
| `/activate/init/profile` | 初始化名字 | `nickname` |  |
| `/captcha/safe/sent` | 发送安全验证码 | `ctcode?` |  |
| `/captcha/sent` | 发送验证码 | `phone`, `ctcode?` | ✅ |
| `/captcha/sent/v1` | 发送验证码 | `phone`, `ctcode?` | ✅ |
| `/captcha/verify` | 校验验证码 | `ctcode?`, `phone`, `captcha` | ✅ |
| `/cellphone/existence/check` | 检测手机号码是否已注册 | `phone`, `countrycode` |  |
| `/inner/version` | - | — |  |
| `/login` | 邮箱登录 | `email`, `md5_password` |  |
| `/login/cellphone` | 手机登录 | `phone`, `countrycode?`, `captcha` | ✅ |
| `/login/qr/check` | - | `key?` | ✅ |
| `/login/qr/create` | 构建基础URL | `key?`, `qrimg?` | ✅ |
| `/login/qr/key` | - | — | ✅ |
| `/login/refresh` | 登录刷新 | — | ✅ |
| `/login/status` | - | — | ✅ |
| `/logout` | 退出登录 | — |  |
| `/rebind` | 更换手机 | `captcha`, `phone`, `oldcaptcha`, `ctcode?` |  |
| `/register/anonimous` | 获取游客cookie | — | ✅ |
| `/register/cellphone` | 注册账号 | `captcha`, `phone`, `password`, `nickname` |  |
| `/register/checktoken/v2` | 易盾反作弊 Token 注册端点 | `refresh?` |  |
| `/register/checktoken/v3` | 易盾反作弊 Token 注册端点 | `refresh?` |  |
| `/register/xeapikey` | - | `deviceId?`, `currentKeyVersion?` |  |
| `/verify/getQr` | - | `vid`, `type`, `token`, `evid`, `sign` |  |
| `/verify/qrcodestatus` | - | `qr` |  |

### 用户（71）

| 路径 | 说明 | 参数 | 已封装 |
| --- | --- | --- | --- |
| `/avatar/upload` | - | — |  |
| `/daily/signin` | 签到 | `type?` |  |
| `/fanscenter/basicinfo/age/get` | 粉丝年龄比例 | — |  |
| `/fanscenter/basicinfo/gender/get` | 粉丝性别比例 | — |  |
| `/fanscenter/basicinfo/province/get` | 粉丝省份比例 | — |  |
| `/fanscenter/overview/get` | 粉丝数量 | — |  |
| `/fanscenter/trend/list` | 粉丝来源 | `startTime?`, `endTime?`, `type?` |  |
| `/follow` | 关注与取消关注用户 | `t`, `id` | ✅ |
| `/get/userids` | - | `nicknames` |  |
| `/history/recommend/songs` | 历史每日推荐歌曲 | — |  |
| `/history/recommend/songs/detail` | 历史每日推荐歌曲详情 | `date?` |  |
| `/nickname/check` | - | `nickname` |  |
| `/recent/listen/list` | 最近听歌列表 | — |  |
| `/setting` | 设置 | — |  |
| `/sign/happy/info` | - | — |  |
| `/signin/progress` | 签到进度 | `moduleId?` |  |
| `/summary/annual` | 年度听歌报告2017-2023 | `year` |  |
| `/user/account` | - | — |  |
| `/user/audio` | 用户创建的电台 | `uid` |  |
| `/user/binding` | - | `uid?` |  |
| `/user/bindingcellphone` | - | `phone`, `captcha`, `countrycode?`, `password?` |  |
| `/user/cloud` | 云盘数据 | — | ✅ |
| `/user/cloud/del` | 云盘歌曲删除 | `id` | ✅ |
| `/user/cloud/detail` | 云盘数据详情 | `id` | ✅ |
| `/user/comment/history` | - | `limit?`, `uid`, `time?` |  |
| `/user/detail` | 用户详情 | `uid` | ✅ |
| `/user/detail/new` | 用户详情 | `uid` | ✅ |
| `/user/dj` | 用户电台节目 | `uid` |  |
| `/user/event` | 用户动态 | `lasttime?`, `limit?`, `uid` |  |
| `/user/event/all` | 获取当前登录用户可被上游枚举的全部动态 | — |  |
| `/user/follow/mixed` | 当前账号关注的用户/歌手 | `size?`, `cursor?`, `scene?` |  |
| `/user/followeds` | 关注TA的人(粉丝) | `uid`, `lasttime?`, `limit?` |  |
| `/user/follows` | TA关注的人(关注) | `uid` |  |
| `/user/level` | 类别热门电台 | — |  |
| `/user/medal` | 用户徽章 | `uid` |  |
| `/user/mutualfollow/get` | 用户是否互相关注 | `uid` |  |
| `/user/playlist` | 用户歌单 | `uid` | ✅ |
| `/user/playlist/collect` | 获取用户的收藏歌单列表 | `uid` | ✅ |
| `/user/playlist/create` | 获取用户的创建歌单列表 | `uid` | ✅ |
| `/user/record` | 听歌排行 | `uid`, `type?` | ✅ |
| `/user/replacephone` | - | `phone`, `captcha`, `oldcaptcha`, `countrycode?` |  |
| `/user/social/status` | 用户状态 | `uid` |  |
| `/user/social/status/edit` | 用户状态 - 编辑 | `type`, `iconUrl?`, `content?`, `actionUrl?` |  |
| `/user/social/status/rcmd` | 用户状态 - 相同状态的用户 | — |  |
| `/user/social/status/support` | 用户状态 - 支持设置的状态 | — |  |
| `/user/subcount` | 收藏计数 | — |  |
| `/user/update` | 编辑用户信息 | `birthday`, `city`, `gender`, `nickname`, `province`, `signature` |  |
| `/vip/growthpoint` | 会员成长值 | — |  |
| `/vip/growthpoint/details` | 会员成长值领取记录 | — |  |
| `/vip/growthpoint/get` | 领取会员成长值 | `ids?` |  |
| `/vip/growthpoint/getall` | 一键领取所有会员成长值 | — |  |
| `/vip/info` | 获取 VIP 信息 | `uid?` |  |
| `/vip/info/v2` | 获取 VIP 信息 | `uid?` |  |
| `/vip/sign` | 黑胶乐签打卡 | — |  |
| `/vip/sign/detail` | 黑胶乐签打卡详情 | `timestamp` |  |
| `/vip/sign/history` | 黑胶乐签打卡历史 / 状态查询 | `type?` |  |
| `/vip/sign/info` | 黑胶乐签未来签到信息 | — |  |
| `/vip/tasks` | 会员任务 | — |  |
| `/vip/tasks/v1` | 会员任务 - 新版 | `id?` |  |
| `/vip/timemachine` | 黑胶时光机 | `startTime?`, `endTime?`, `limit?` |  |
| `/yunbei` | /api/point/today/get | — |  |
| `/yunbei/expense` | - | — |  |
| `/yunbei/info` | - | — |  |
| `/yunbei/rcmd/song` | 云贝推歌 | `id`, `reason?` |  |
| `/yunbei/rcmd/song/history` | 云贝推歌历史记录 | `size?`, `cursor?` |  |
| `/yunbei/receipt` | - | — |  |
| `/yunbei/sign` | - | — |  |
| `/yunbei/task/finish` | - | `userTaskId`, `depositCode?` |  |
| `/yunbei/tasks` | - | — |  |
| `/yunbei/tasks/todo` | - | — |  |
| `/yunbei/today` | - | — |  |

### 歌曲 / 歌词（36）

| 路径 | 说明 | 参数 | 已封装 |
| --- | --- | --- | --- |
| `/batch` | 批量请求接口 | — |  |
| `/check/music` | 歌曲可用性 | `id`, `br` |  |
| `/like` | 红心与取消红心歌曲 | `like?`, `id`, `alg?`, `time?` | ✅ |
| `/likelist` | 喜欢的歌曲(无序) | `uid` | ✅ |
| `/lyric` | 歌词 | `id` | ✅ |
| `/lyric/new` | 新版歌词 - 包含逐字歌词 | `id` |  |
| `/music/first/listen/info` | 回忆坐标 | `id` |  |
| `/scrobble` | 听歌打卡 | `id`, `sourceid`, `time` | ✅ |
| `/scrobble/v1` | 听歌打卡 - NCBL 加密版 (仿桌面客户端 PLV/PLD 上报) | `id`, `time`, `total?`, `sourceid?`, `sourceId?`, `source?` +5 |  |
| `/song/chorus` | 副歌时间 | `id` |  |
| `/song/cloud/download` | 从云盘获取歌曲下载链接 | `id` |  |
| `/song/copyright/rcmd` | 灰色歌曲的其他版本推荐 | `songid?`, `id?` |  |
| `/song/creators` | 歌曲创作者信息 | `id` |  |
| `/song/detail` | 歌曲详情 | `ids` | ✅ |
| `/song/downlist` | 会员下载歌曲记录 | — |  |
| `/song/download/url` | 获取客户端歌曲下载链接 | `id`, `br?` |  |
| `/song/download/url/v1` | 获取客户端歌曲下载链接 - v1 | `id`, `level` |  |
| `/song/dynamic/cover` | 歌曲动态封面 | `id` |  |
| `/song/like` | 喜欢歌曲 | `id`, `like?`, `uid?` |  |
| `/song/like/check` | 歌曲是否喜爱 | `ids` |  |
| `/song/lyrics/mark` | 歌词摘录 - 歌词摘录信息 | `id` |  |
| `/song/lyrics/mark/add` | 歌词摘录 - 添加/修改摘录歌词 | `id`, `markId?`, `data?` |  |
| `/song/lyrics/mark/del` | 歌词摘录 - 删除摘录歌词 | `id` |  |
| `/song/lyrics/mark/user/page` | 歌词摘录 - 我的歌词本 | — |  |
| `/song/monthdownlist` | 会员本月下载歌曲记录 | — |  |
| `/song/music/detail` | 歌曲音质详情 | `id` |  |
| `/song/order/update` | 更新歌曲顺序 | `pid`, `ids` |  |
| `/song/purchased` | 已购单曲 | — |  |
| `/song/red/count` | 歌曲红心数量 | `id` |  |
| `/song/singledownlist` | 已购买单曲 | — |  |
| `/song/url` | 歌曲链接 | `id`, `br?` | ✅ |
| `/song/url/match` | 网易云歌曲解灰(适配SPlayer的UNM-Server) | `id`, `source?` | ✅ |
| `/song/url/ncmget` | 夹带私货的东西就不要放在这里了 | — | ✅ |
| `/song/url/v1` | 歌曲链接 - v1 | `id`, `level` | ✅ |
| `/song/url/v1/302` | 获取客户端歌曲下载链接 - v1 | `id`, `level` | ✅ |
| `/song/wiki/summary` | 音乐百科基础信息 | `id` |  |

### 歌单（28）

| 路径 | 说明 | 参数 | 已封装 |
| --- | --- | --- | --- |
| `/pl/count` | 私信和通知接口 | — |  |
| `/playlist/category/list` | 歌单分类列表 | `cat?`, `limit?` |  |
| `/playlist/catlist` | 全部歌单分类 | — | ✅ |
| `/playlist/cover/update` | - | `id` |  |
| `/playlist/create` | 创建歌单 | `name`, `privacy`, `type?` | ✅ |
| `/playlist/delete` | 删除歌单 | `id` | ✅ |
| `/playlist/desc/update` | 更新歌单描述 | `id`, `desc` |  |
| `/playlist/detail` | 歌单详情 | `id`, `s?` | ✅ |
| `/playlist/detail/dynamic` | 歌单动态信息 | `id` | ✅ |
| `/playlist/detail/rcmd/get` | 相关歌单推荐 | `id` | ✅ |
| `/playlist/highquality/tags` | 精品歌单 tags | — | ✅ |
| `/playlist/hot` | 热门歌单分类 | — |  |
| `/playlist/import/name/task/create` | 歌单导入 - 元数据/文字/链接导入 | `local?`, `importStarPlaylist?` |  |
| `/playlist/import/task/status` | 歌单导入 - 任务状态 | `id` |  |
| `/playlist/mylike` | - | `time?`, `limit` |  |
| `/playlist/name/update` | 更新歌单名 | `id`, `name` |  |
| `/playlist/order/update` | 编辑歌单顺序 | `ids` |  |
| `/playlist/privacy` | 公开隐私歌单 | `id` | ✅ |
| `/playlist/subscribe` | 收藏与取消收藏歌单 | `t`, `id` | ✅ |
| `/playlist/subscribers` | 歌单收藏者 | `id?` |  |
| `/playlist/tags/update` | 更新歌单标签 | `id`, `tags` |  |
| `/playlist/track/add` | - | `pid?`, `ids` |  |
| `/playlist/track/all` | 通过传过来的歌单id拿到所有歌曲数据 | `id`, `s?` | ✅ |
| `/playlist/track/delete` | 收藏单曲到歌单 从歌单删除歌曲 | `pid?`, `ids` |  |
| `/playlist/tracks` | 收藏单曲到歌单 从歌单删除歌曲 | `op`, `pid`, `tracks` | ✅ |
| `/playlist/update` | 编辑歌单 | `id`, `name`, `desc?`, `tags?` |  |
| `/playlist/update/playcount` | 歌单打卡 | `id?` |  |
| `/playlist/video/recent` | - | — |  |

### 专辑（15）

| 路径 | 说明 | 参数 | 已封装 |
| --- | --- | --- | --- |
| `/album` | 专辑内容 | `id` | ✅ |
| `/album/detail` | 数字专辑详情 | `id` |  |
| `/album/detail/dynamic` | 专辑动态信息 | `id` |  |
| `/album/list` | 数字专辑-新碟上架 | `area?`, `type` |  |
| `/album/list/style` | 数字专辑-语种风格馆 | `area?` |  |
| `/album/new` | 全部新碟 | `area?` |  |
| `/album/newest` | 最新专辑 | — | ✅ |
| `/album/privilege` | 获取专辑歌曲的音质 | `id` |  |
| `/album/songsaleboard` | 数字专辑&数字单曲-榜单 | `albumType?`, `type?`, `year?` |  |
| `/album/sub` | 收藏/取消收藏专辑 | `id`, `t` |  |
| `/album/sublist` | 已收藏专辑列表 | — | ✅ |
| `/digitalAlbum/detail` | 数字专辑详情 | `id` |  |
| `/digitalAlbum/ordering` | 购买数字专辑 | `payment`, `id`, `quantity` |  |
| `/digitalAlbum/purchased` | 我的数字专辑 | — |  |
| `/digitalAlbum/sales` | 数字专辑销量 | `ids` |  |

### 歌手（23）

| 路径 | 说明 | 参数 | 已封装 |
| --- | --- | --- | --- |
| `/artist/album` | 歌手专辑列表 | `id` | ✅ |
| `/artist/desc` | 歌手介绍 | `id` |  |
| `/artist/detail` | - | `id` |  |
| `/artist/detail/dynamic` | 歌手动态信息 | `id` |  |
| `/artist/fans` | 歌手粉丝 | `id` |  |
| `/artist/follow/count` | 歌手粉丝数量 | `id` | ✅ |
| `/artist/list` | 歌手分类 | `area`, `initial?`, `type?` |  |
| `/artist/mv` | 歌手相关MV | `id` | ✅ |
| `/artist/new/mv` | - | `limit?`, `startTimestamp?` |  |
| `/artist/new/song` | - | `limit?`, `startTimestamp?` |  |
| `/artist/new/song/mv/list/v2` | 获取关注歌手的新歌曲和 MV | `startTimestamp?`, `before?`, `sourceType?`, `limit?`, `firstRequest?` |  |
| `/artist/new/song/playall` | 获取所有关注歌手最近的 50 首新歌 | — |  |
| `/artist/songs` | - | `id`, `order?` | ✅ |
| `/artist/sub` | 收藏与取消收藏歌手 | `id`, `t` |  |
| `/artist/sublist` | 关注歌手列表 | — | ✅ |
| `/artist/top/song` | 歌手热门 50 首歌曲 | `id` | ✅ |
| `/artist/video` | 歌手相关视频 | `id`, `size?`, `cursor?`, `order?` | ✅ |
| `/artists` | 歌手单曲 | `id` | ✅ |
| `/simi/artist` | 相似歌手 | `id` | ✅ |
| `/simi/mv` | 相似MV | `mvid` | ✅ |
| `/simi/playlist` | 相似歌单 | `id` | ✅ |
| `/simi/song` | 相似歌曲 | `id` | ✅ |
| `/simi/user` | 相似用户 | `id` |  |

### 搜索（9）

| 路径 | 说明 | 参数 | 已封装 |
| --- | --- | --- | --- |
| `/cloudsearch` | 搜索 | `keywords`, `type?` | ✅ |
| `/search` | 搜索 | `keywords`, `type?` | ✅ |
| `/search/default` | 默认搜索关键词 | — | ✅ |
| `/search/hot` | 热门搜索 | — |  |
| `/search/hot/detail` | 热搜列表 | — | ✅ |
| `/search/match` | 本地歌曲匹配音乐信息 | `title?`, `album?`, `artist?`, `duration?`, `md5?` |  |
| `/search/multimatch` | 多类型搜索 | `type?`, `keywords` | ✅ |
| `/search/suggest` | 搜索建议 | `keywords`, `type?` | ✅ |
| `/search/suggest/pc` | 搜索建议pc端 | `keyword` | ✅ |

### 评论 / 互动（34）

| 路径 | 说明 | 参数 | 已封装 |
| --- | --- | --- | --- |
| `/comment` | 发送与删除评论 | `type`, `t`, `threadId`, `content`, `commentId` | ✅ |
| `/comment/add` | 发送评论 | `id`, `type`, `content` |  |
| `/comment/album` | 专辑评论 | `id`, `before?` |  |
| `/comment/delete` | 删除评论 | `id`, `type`, `cid` |  |
| `/comment/dj` | 电台评论 | `id`, `before?` |  |
| `/comment/event` | 获取动态评论 | `threadId`, `before?` |  |
| `/comment/floor` | - | `id`, `parentCommentId`, `type`, `limit?`, `time?` |  |
| `/comment/hot` | 热门评论 | `id`, `type`, `before?` |  |
| `/comment/hug/list` | - | `page`, `cursor`, `idCursor`, `pageSize?` |  |
| `/comment/info/list` | 评论统计数据 | `ids?`, `type?` |  |
| `/comment/like` | 点赞与取消点赞评论 | `id`, `type`, `t`, `cid`, `threadId?` | ✅ |
| `/comment/music` | 歌曲评论 | `id`, `before?` |  |
| `/comment/mv` | MV评论 | `id`, `before?` |  |
| `/comment/new` | 评论 | `type?`, `id`, `pageNo?`, `pageSize?`, `sortType?` | ✅ |
| `/comment/playlist` | 歌单评论 | `id`, `before?` |  |
| `/comment/reply` | 发送评论 | `id`, `type`, `cid`, `content` |  |
| `/comment/report` | 举报评论 | `id`, `cid`, `reason` |  |
| `/comment/video` | 视频评论 | `id`, `before?` |  |
| `/event` | 获取动态列表 | `pagesize?`, `lasttime?` |  |
| `/event/del` | 删除动态 | `evId` |  |
| `/event/forward` | 转发动态 | `forwords`, `evId`, `uid` |  |
| `/event/privacy` | 修改本人动态的可见权限 | `evId`, `privacy` |  |
| `/hug/comment` | - | `uid`, `cid`, `sid` | ✅ |
| `/msg/comments` | 评论 | `uid`, `before?`, `limit?` |  |
| `/msg/forwards` | @我 | — |  |
| `/msg/notices` | 通知 | `limit?`, `lasttime?` |  |
| `/msg/private` | 私信 | — |  |
| `/msg/private/history` | 私信内容 | `before?`, `limit?`, `uid` |  |
| `/msg/recentcontact` | 最近联系 | — |  |
| `/send/album` | 私信专辑 | `id`, `msg?`, `user_ids` |  |
| `/send/playlist` | 私信歌单 | `playlist`, `msg`, `user_ids` |  |
| `/send/song` | 私信歌曲 | `id`, `msg?`, `user_ids` |  |
| `/send/text` | 私信 | `msg`, `user_ids` |  |
| `/share/resource` | 分享歌曲到动态 | `type?`, `msg?`, `id?` |  |

### MV / 视频（22）

| 路径 | 说明 | 参数 | 已封装 |
| --- | --- | --- | --- |
| `/mlog/music/rcmd` | 歌曲相关视频 | `mvid?`, `songid?`, `limit?` |  |
| `/mlog/to/video` | 将mlog id转为video id | `id?` | ✅ |
| `/mlog/url` | mlog链接 | `id?`, `res?` |  |
| `/mv/all` | 全部MV | `area?`, `type?`, `order?` | ✅ |
| `/mv/detail` | MV详情 | `mvid?` | ✅ |
| `/mv/detail/info` | MV 点赞转发评论数数据 | `mvid` | ✅ |
| `/mv/exclusive/rcmd` | 网易出品 | — |  |
| `/mv/first` | 最新MV | `area?`, `limit?` | ✅ |
| `/mv/sub` | 收藏与取消收藏MV | `t`, `mvid` |  |
| `/mv/sublist` | 已收藏MV列表 | — | ✅ |
| `/mv/url` | MV链接 | `id?`, `r?` | ✅ |
| `/related/allvideo` | 相关视频 | `id` | ✅ |
| `/related/playlist` | 相关歌单 | `id` |  |
| `/video/category/list` | 视频分类列表 | — |  |
| `/video/detail` | 视频详情 | `id` | ✅ |
| `/video/detail/info` | 视频点赞转发评论数数据 | `vid` | ✅ |
| `/video/group` | 视频标签/分类下的视频 | `id`, `offset?` | ✅ |
| `/video/group/list` | 视频标签列表 | — | ✅ |
| `/video/sub` | 收藏与取消收藏视频 | `t?`, `id` |  |
| `/video/timeline/all` | 全部视频列表 | `offset?` |  |
| `/video/timeline/recommend` | 推荐视频 | `offset?` | ✅ |
| `/video/url` | 视频链接 | `id`, `res?` | ✅ |

### 电台 / 播客（49）

| 路径 | 说明 | 参数 | 已封装 |
| --- | --- | --- | --- |
| `/aidj/content/rcmd` | 私人 DJ | `latitude?`, `longitude?` |  |
| `/broadcast/category/region/get` | 广播电台 - 分类/地区信息 | — |  |
| `/broadcast/channel/collect/list` | 广播电台 - 我的收藏 | — |  |
| `/broadcast/channel/currentinfo` | 广播电台 - 电台信息 | `id` |  |
| `/broadcast/channel/list` | 广播电台 - 全部电台 | `categoryId?`, `regionId?`, `lastId?`, `score?` |  |
| `/broadcast/sub` | 广播电台 - 收藏/取消收藏电台 | `t`, `id` |  |
| `/dj/banner` | 电台banner | — |  |
| `/dj/category/excludehot` | 电台非热门类型 | — |  |
| `/dj/category/recommend` | 电台推荐类型 | — |  |
| `/dj/catelist` | 电台分类列表 | — |  |
| `/dj/detail` | 电台详情 | `rid` |  |
| `/dj/difm/all/style/channel` | DIFM电台 - 分类 | `sources?` |  |
| `/dj/difm/channel/subscribe` | DIFM电台 - 收藏频道 | `id` |  |
| `/dj/difm/channel/unsubscribe` | DIFM电台 - 取消收藏频道 | `id` |  |
| `/dj/difm/playing/tracks/list` | DIFM电台 - 播放列表 | `channelId`, `limit?`, `source?` |  |
| `/dj/difm/subscribe/channels/get` | DIFM电台 - 收藏列表 | `sources?` |  |
| `/dj/hot` | 热门电台 | — |  |
| `/dj/paygift` | 付费电台 | — |  |
| `/dj/personalize/recommend` | 电台个性推荐 | `limit?` |  |
| `/dj/program` | 电台节目列表 | `rid`, `asc` |  |
| `/dj/program/detail` | 电台节目详情 | `id` |  |
| `/dj/program/toplist` | 电台节目榜 | — |  |
| `/dj/program/toplist/hours` | 电台24小时节目榜 | `limit?` |  |
| `/dj/radio/hot` | 类别热门电台 | `cateId` |  |
| `/dj/recommend` | 精选电台 | — |  |
| `/dj/recommend/type` | 精选电台分类 | `type` |  |
| `/dj/sub` | 订阅与取消电台 | `t`, `rid` |  |
| `/dj/sublist` | 订阅电台列表 | — |  |
| `/dj/subscriber` | 电台详情 | `id`, `limit?`, `time?` |  |
| `/dj/today/perfered` | 电台今日优选 | `page?` |  |
| `/dj/toplist` | 新晋电台榜/热门电台榜 | `type?` |  |
| `/dj/toplist/hours` | 电台24小时主播榜 | `limit?` |  |
| `/dj/toplist/newcomer` | 电台新人榜 | — |  |
| `/dj/toplist/pay` | 付费精品 | `limit?` |  |
| `/dj/toplist/popular` | 电台最热主播榜 | `limit?` |  |
| `/djRadio/top` | 电台排行榜获取 | `djRadioId?`, `sortIndex?`, `dataGapDays?`, `dataType?` |  |
| `/fm/trash` | 垃圾桶 | `id`, `time?` |  |
| `/program/recommend` | 推荐节目 | `type` |  |
| `/radio/sport/get` | 跑步漫游 | `bpm?` |  |
| `/voice/delete` | - | `ids` |  |
| `/voice/detail` | - | `id` |  |
| `/voice/lyric` | - | `id` |  |
| `/voice/upload` | - | `songFile`, `name`, `data`, `imgFile?`, `name`, `data` +12 |  |
| `/voicelist/detail` | - | `id` |  |
| `/voicelist/list` | - | `voiceListId` |  |
| `/voicelist/list/search` | 声音搜索 | `limit?`, `offset?`, `name?`, `displayStatus?`, `type?`, `voiceFeeType?` +1 |  |
| `/voicelist/my/created` | 我创建的播客声音 | `limit?` |  |
| `/voicelist/search` | - | `keyword?`, `limit?`, `offset?` |  |
| `/voicelist/trans` | - | `radioId?`, `programId?`, `position?` |  |

### 一起听 / 社交（9）

| 路径 | 说明 | 参数 | 已封装 |
| --- | --- | --- | --- |
| `/listentogether/accept` | - | `roomId`, `inviterId` |  |
| `/listentogether/end` | 一起听 结束房间 | `roomId` |  |
| `/listentogether/heatbeat` | 一起听 发送心跳 | `roomId`, `songId`, `playStatus`, `progress` |  |
| `/listentogether/play/command` | 一起听 发送播放状态 | `roomId`, `commandType`, `progress?`, `playStatus`, `formerSongId`, `targetSongId` +1 |  |
| `/listentogether/room/check` | 一起听 房间情况 | `roomId` |  |
| `/listentogether/room/create` | 一起听创建房间 | — |  |
| `/listentogether/status` | 一起听状态 | — |  |
| `/listentogether/sync/list/command` | 一起听 更新播放列表 | `roomId`, `commandType`, `userId`, `version`, `randomList`, `displayList` |  |
| `/listentogether/sync/playlist/get` | 一起听 当前列表获取 | `roomId` |  |

### 云村 / 社区（15）

| 路径 | 说明 | 参数 | 已封装 |
| --- | --- | --- | --- |
| `/hot/topic` | 热门话题 | — |  |
| `/rep/ugc/activity/collect` | 云小编领取任务积分 | `activityId?` |  |
| `/rep/ugc/activity/get` | 云小编活动信息 | — |  |
| `/rep/ugc/exam/info/get` | 云小编考试状态 | `examType` |  |
| `/rep/ugc/exam/question/single/get` | 云小编考试取题 | `examType`, `taskId` |  |
| `/rep/ugc/exam/result/get` | 云小编考试结果 | `examType`, `taskId` |  |
| `/rep/ugc/exam/start` | 云小编考试开始 | `examType` |  |
| `/rep/ugc/exam/submit` | 云小编考试提交 | `examType`, `taskId`, `questionId`, `answer` |  |
| `/rep/ugc/user/collect-vip` | 云小编领取一日会员 | — |  |
| `/rep/ugc/user/get` | 云小编获取用户详情 | — |  |
| `/rep/ugc/user/sign` | 云小编每日签到 | — |  |
| `/rep/ugc/user/vip` | 云小编查询会员任务状态 | — |  |
| `/starpick/comments/summary` | 云村星评馆 - 简要评论列表 | — |  |
| `/thinktank/audit/resource/detail` | 云小编获取任务 | `type?` |  |
| `/thinktank/audit/resource/update` | 云小编提交任务 | `type?`, `taskId`, `judgement` |  |

### 音乐人 / 创作（9）

| 路径 | 说明 | 参数 | 已封装 |
| --- | --- | --- | --- |
| `/creator/authinfo/get` | 获取达人用户信息 | — |  |
| `/musician/cloudbean` | 账号云豆数 | — |  |
| `/musician/cloudbean/obtain` | 领取云豆 | `id`, `period` |  |
| `/musician/data/overview` | 音乐人数据概况 | — |  |
| `/musician/play/trend` | 音乐人歌曲播放趋势 | `startTime`, `endTime` |  |
| `/musician/sign` | 音乐人签到 | — |  |
| `/musician/tasks` | 获取音乐人任务 | — |  |
| `/musician/tasks/new` | 获取音乐人任务 | — |  |
| `/musician/vip/tasks` | 获取音乐人任务 | — |  |

### 云盘（6）

| 路径 | 说明 | 参数 | 已封装 |
| --- | --- | --- | --- |
| `/cloud` | - | `songFile`, `name`, `data` |  |
| `/cloud/import` | 云盘导入歌曲 | `md5`, `id?`, `bitrate?`, `fileSize?`, `artist?`, `album?` +1 |  |
| `/cloud/lyric/get` | 获取云盘歌词 | `uid`, `sid` |  |
| `/cloud/match` | - | `uid`, `sid`, `asid` |  |
| `/cloud/upload/complete` | - | `songId`, `resourceId`, `md5`, `filename`, `song?`, `artist?` +2 |  |
| `/cloud/upload/token` | - | `md5`, `fileSize`, `filename`, `bitrate?` |  |

### 榜单 / 推荐（52）

| 路径 | 说明 | 参数 | 已封装 |
| --- | --- | --- | --- |
| `/banner` | 首页轮播图 | `type?` |  |
| `/calendar` | - | `startTime?`, `endTime` |  |
| `/chart/detail` | 获取指定维度音乐排行榜详情 | `chartCode`, `targetId`, `targetType` |  |
| `/chart/song/detail` | 获取指定维度音乐排行榜列表 | `chartCode`, `targetId`, `targetType` |  |
| `/homepage/block/page` | 首页-发现 block page | `refresh?`, `cursor?` |  |
| `/homepage/dragon/ball` | 首页-发现 dragon ball | — |  |
| `/listen/data/realtime/report` | 听歌足迹 - 本周/本月收听时长 | `type?` |  |
| `/listen/data/report` | 听歌足迹 - 周/月/年收听报告 | `type?`, `endTime?` |  |
| `/listen/data/song/play/rank` | 听歌足迹 - 歌曲播放排行 (Top20) | `type?`, `endTime?` |  |
| `/listen/data/today/song` | 听歌足迹 - 今日收听 | — |  |
| `/listen/data/total` | 听歌足迹 - 总收听时长 | — |  |
| `/listen/data/year/report` | 听歌足迹 - 年度听歌足迹 | — |  |
| `/personal/fm` | 私人FM | — |  |
| `/personal/fm/mode` | 私人FM - 模式选择 | `mode`, `submode?`, `limit?` |  |
| `/personalized` | 推荐歌单 | `limit?` | ✅ |
| `/personalized/djprogram` | 推荐电台 | — |  |
| `/personalized/mv` | 推荐MV | — |  |
| `/personalized/newsong` | 推荐新歌 | `area?`, `limit?` |  |
| `/personalized/privatecontent` | 独家放送 | — |  |
| `/personalized/privatecontent/list` | 独家放送列表 | — |  |
| `/playmode/intelligence/list` | 智能播放 | `id`, `pid`, `sid?`, `count?` | ✅ |
| `/playmode/song/vector` | 云随机播放 | `ids` |  |
| `/recommend/resource` | 每日推荐歌单 | — | ✅ |
| `/recommend/songs` | 每日推荐歌曲 | — | ✅ |
| `/recommend/songs/dislike` | 每日推荐歌曲-不感兴趣 | `id` | ✅ |
| `/record/recent/album` | - | `limit?` |  |
| `/record/recent/dj` | - | `limit?` |  |
| `/record/recent/playlist` | - | `limit?` |  |
| `/record/recent/song` | - | `limit?` |  |
| `/record/recent/video` | - | `limit?` |  |
| `/record/recent/voice` | - | `limit?` |  |
| `/style/album` | 曲风-专辑 | `tagId`, `size?`, `cursor?`, `sort?` |  |
| `/style/artist` | 曲风-歌手 | `tagId`, `size?`, `cursor?` |  |
| `/style/detail` | 曲风详情 | `tagId` |  |
| `/style/list` | 曲风列表 | — |  |
| `/style/playlist` | 曲风-歌单 | `tagId`, `size?`, `cursor?` |  |
| `/style/preference` | 曲风偏好 | — |  |
| `/style/song` | 曲风-歌曲 | `tagId`, `size?`, `cursor?`, `sort?` |  |
| `/top/album` | 新碟上架 | `area?`, `type?`, `year?`, `mouth?` |  |
| `/top/artists` | 热门歌手 | — | ✅ |
| `/top/list` | 排行榜 | `id` |  |
| `/top/mv` | MV排行榜 | `area?` |  |
| `/top/playlist` | 分类歌单 | `cat?`, `order?` | ✅ |
| `/top/playlist/highquality` | 精品歌单 | `cat?`, `before?`, `limit?` | ✅ |
| `/top/song` | 新歌速递 | `type` |  |
| `/topic/detail` | - | `actid?` |  |
| `/topic/detail/event/hot` | - | `actid?` |  |
| `/topic/sublist` | 收藏的专栏 | — | ✅ |
| `/toplist` | 所有榜单介绍 | — |  |
| `/toplist/artist` | 歌手榜 | `type?` | ✅ |
| `/toplist/detail` | 所有榜单内容摘要 | — | ✅ |
| `/toplist/detail/v2` | 所有榜单内容摘要v2 | — | ✅ |

### 用户内容（UGC）（7）

| 路径 | 说明 | 参数 | 已封装 |
| --- | --- | --- | --- |
| `/ugc/album/get` | 专辑简要百科信息 | `id` |  |
| `/ugc/artist/get` | 歌手简要百科信息 | `id` |  |
| `/ugc/artist/search` | 搜索歌手 | `keyword`, `limit?` |  |
| `/ugc/detail` | 用户贡献内容 | `auditStatus?`, `type?`, `sortBy?`, `order?` |  |
| `/ugc/mv/get` | mv简要百科信息 | `id` |  |
| `/ugc/song/get` | 歌曲简要百科信息 | `id` |  |
| `/ugc/user/devote` | 用户贡献条目、积分、云贝数量 | — |  |

### 商业化 / 其他（5）

| 路径 | 说明 | 参数 | 已封装 |
| --- | --- | --- | --- |
| `/ad/get` | 获取广告 | `type_ids?` |  |
| `/ad/listening/rights` | 获取免费听时长状态 | — |  |
| `/ad/listening/rights/gain` | 看广告免费听歌 - 领取免费听权益 | `reqUid?`, `creativeType?`, `exposureTime?`, `clickTime?`, `rightsGainMethod?`, `rightsGainDuration?` +8 |  |
| `/api` | - | `uri`, `data?`, `crypto?` |  |
| `/audio/match` | - | `duration`, `audioFP` |  |

### 工具 / 其他（20）

| 路径 | 说明 | 参数 | 已封装 |
| --- | --- | --- | --- |
| `/countries/code/list` | 国家编码列表 | — |  |
| `/decrypt` | - | `crypto?`, `data?`, `hexString?`, `isReq?` |  |
| `/device/kickoff` | 强制下线设备 | `deviceKey`, `captcha?` |  |
| `/device/list` | 登录设备列表 | — |  |
| `/eapi/decrypt` | - | `hexString`, `isReq?` |  |
| `/lbs/city/code` | 多级行政区划数据获取接口 | `bizCode?` |  |
| `/middle/play/do/lottery` | 云小编每日抽奖 | `activityId?`, `drawCount?` |  |
| `/middle/play/lottery/remain/chance` | 云小编抽奖剩余次数查询 | `activityId?` |  |
| `/relay/play/state/submit` | 提交歌曲播放状态 | `id`, `sessionId?`, `progress?`, `playMode?`, `type?` |  |
| `/resource/like` | 点赞与取消点赞资源 | `t`, `type`, `id?`, `threadId?` |  |
| `/sati/resource/list` | 助眠解压 - 获取标签下资源列表 | `tag` |  |
| `/sati/resource/list/more` | 助眠解压 - 查看同类推荐 | `id` |  |
| `/sati/resource/sub` | 助眠解压 - 收藏 | `id`, `cancel?` |  |
| `/sati/resource/sub/list` | 助眠解压 - 收藏列表 | — |  |
| `/sati/tag/list` | 助眠解压 - 标签列表 | — |  |
| `/sati/timescene/resources/get` | 助眠解压 - 特定时间场景下的推荐资源 | — |  |
| `/sheet/list` | 乐谱列表 | `id`, `abTest?` |  |
| `/sheet/preview` | 乐谱预览 | `id` |  |
| `/threshold/detail/get` | 获取达人达标信息 | — |  |
| `/weblog` | 操作记录 | `data?` |  |

