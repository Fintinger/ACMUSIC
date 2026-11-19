# 音乐黑名单：屏蔽歌曲 / 歌手

> 2026-11-19 实测定稿。接口来源：网易云 PC 客户端 3.1.42 的 `web.pack`（本机解包得到，非猜测）。
> 配套：`docs/API_INDEX.md`（自动索引；上游后来新增了只读的 `dislike_list.js`，见下文「与上游实现的关系」）、`docs/API_GAPS.md`（能力缺口清单）。

## 结论先行

官方客户端的「音乐黑名单」由三个 `/api/` 明文接口组成，**不涉及 eapi/weapi 加密**，只需登录 cookie。
已在生产后端落地为三个 module，接口可用性、参数格式、增删闭环全部实测通过。

| 能力 | 本站路由（经网关） | 上游路径 | 方法 |
| --- | --- | --- | --- |
| 取名单 | `/api/music/dislike/get` | `/api/music/dislike/get` | GET / POST |
| 添加屏蔽 | `/api/music/blacklist/add` | `/api/music-blacklist/add` | POST |
| 解除屏蔽 | `/api/music/blacklist/delete` | `/api/music-blacklist/delete` | POST |

后端文件（`/opt/api-enhanced/module/`）：

- `music_dislike_get.js`
- `music_blacklist_add.js`
- `music_blacklist_delete.js`

> 新增文件即挂载路由（`server.js` 扫描 `module/*.js`，文件名 `_` → `/`），不需要注册路由表。
> 三个文件已提交为 `bae1a69`，并推送到 `Fintinger/api-enhanced`（合并提交 `6689f10`）。服务器重建后 `git clone` 即可恢复，本文末仍保留源码备份。

## 与上游实现的关系

2026-11-19 上游 `NeteaseCloudMusicApiEnhanced/api-enhanced` 合并了 PR #301（`d89fc60 feat: 新增不感兴趣列表、播客分类树与收藏播客接口`），其中 `module/dislike_list.js` 实现了同一个**只读**接口：

```js
// 抓包来源：PC 客户端 3.1.43（xeapi）
const createOption = require('../util/option.js')
module.exports = (query, request) => {
  const data = {}
  return request(`/api/music/dislike/get`, data, createOption(query, 'xeapi'))
}
```

两边的关系：

| | 本项目（服务器 module） | 上游 PR #301 |
| --- | --- | --- |
| 文件 | `music_dislike_get.js` + `music_blacklist_add.js` + `music_blacklist_delete.js` | `dislike_list.js` |
| 路由 | `/music/dislike/get`、`/music/blacklist/add`、`/music/blacklist/delete` | `/dislike/list` |
| crypto | `api`（明文表单） | `xeapi`（加密） |
| 能力 | 查 + 增 + 删 | 只有查 |

三点结论：

1. **路径可信**：两个独立来源都指向 `/api/music/dislike/get`，抓包结果一致。
2. **不需要替换**：上游只做了只读，没有 add/delete，本项目的三个 module 仍然更完整。
3. **协议有退路**：上游用 `xeapi` 说明新版客户端已切加密通道，`/api/` 明文路径属于老客户端兼容。若将来明文通道被关，把 `createOption(query, 'api')` 换成 `'xeapi'` 即可，请求层已支持（`util/request.js` 有 `xeapi` 分支与 `xeapi_public_key`）。

## 实测响应

取名单（匿名也可调，返回空列表）：

```json
{
  "code": 200,
  "data": {
    "songIdList": ["999999999"],
    "artistIdList": [],
    "podcastIds": [],
    "checkPoint": 1795058027201
  },
  "message": ""
}
```

增删均返回：

```json
{ "code": 200, "data": true, "message": "" }
```

`code: 301` = 未登录（与 `src/api/request.js` 现有约定一致）；`code: 400` = 参数格式不对，见下节。

## 三个必须知道的坑

### 1. `contentIdList` 必须是 JSON 数组字符串

这是最容易踩的一条。同一个接口，四种写法只有一种能过：

| 传法 | 上游结果 |
| --- | --- |
| `contentIdList=123` | `400 请求请设置正确的资源id列表` |
| `contentIdList[0]=123` | 网关序列化失败，502 |
| `contentIdList=[123]`（数组被 URLSearchParams 拍平） | `400` |
| **`contentIdList=["123"]`** | **`200 {"data":true}`** |

module 里的 `toIdList()` 统一做这层转换，调用方传 `"123"` / `"1,2,3"` / `[1,2,3]` 都可以：

```js
function toIdList(v) {
  if (Array.isArray(v)) return JSON.stringify(v.map(String))
  if (v === undefined || v === null || v === '') return '[]'
  const s = String(v).trim()
  if (s.startsWith('[')) {
    try {
      const arr = JSON.parse(s)
      if (Array.isArray(arr)) return JSON.stringify(arr.map(String))
    } catch (e) {
      // 不是合法 JSON，退到逗号分隔
    }
  }
  return JSON.stringify(s.split(',').map((x) => x.trim()).filter(Boolean))
}
```

### 2. 名单里的 id 是字符串

`songIdList` / `artistIdList` 返回的都是字符串数组（实测 `"999999999"`，不是数字）。
播放链路里的 `song.id` 多数是数字，比较前必须 `String()` 归一化，否则 `includes` 永远 false。

### 3. GET 有 2 分钟全局缓存

`server.js:265` 是 `app.use(cache('2 minutes', ...))`，所有 200 的 GET 都会进缓存，**写操作后立刻查名单会拿到旧数据**（实测 `checkPoint` 都没变）。
前端拉名单时带一个时间戳绕开：

```
GET /api/music/dislike/get?t=<Date.now()>
```

项目里 `utils/personalFm.js` 对 `/personal_fm` 用的就是同一招。

## 官方判定逻辑

客户端源码里的原始实现（`84.chunk`），可直接照抄：

```js
const blocked = (blackList, track) => {
  if (!track || typeof track !== 'object' || !('artists' in track)) return false
  const ids = track.artists.map((a) => a.id)
  return (
    blackList.songIdList.includes(track.id) ||
    ids.some((id) => blackList.artistIdList.includes(id))
  )
}
```

即：**歌 id 命中，或该歌任一歌手 id 命中**。没有"只屏蔽主唱"的细分，合唱曲目同样会被屏蔽。

`contentType` 只有 `song` / `artist` 两种（客户端里按 `String(contentId)` 比较）。
返回体里的 `podcastIds` 说明服务端还支持播客，但客户端代码中没有对应的写入调用，`contentType` 取值未验证，先不用。

## 前端接入要点

1. **`src/api/Block.js`** 加三个 wrapper（注意 get 带时间戳）：
   ```js
   export function blocklist(params) {
     return request('/music/dislike/get', { params: { t: Date.now(), ...params } })
   }
   export function blockAdd(contentType, contentIdList) {
     return request('/music/blacklist/add', { method: 'post', params: { contentType, contentIdList: JSON.stringify(contentIdList.map(String)) } })
   }
   export function blockRemove(contentType, contentIdList) { /* 同上，路径 delete */ }
   ```
2. **登录后才可用**：未登录返回 301，会被 `request.js` 派发成 `api:unauthorized`，不要再单独判断一次。
3. **名单只影响官方客户端，不会让本网页自动跳过**。本地仍需一份缓存 + 展示层过滤 + 播放调度跳过，接口的价值是"账号级同步"和"影响官方推荐"。
4. **批量屏蔽要节流**：短时间大量 add 容易触发上游风控（`460`），建议逐个提交、间隔 200–300ms。

## 顺带发现的软反馈接口（未接入）

客户端里还有一组"不感兴趣"能力的接口，只影响推荐流，不等同于黑名单：

| 上游路径 | 用途 |
| --- | --- |
| `/api/radio/trash/add` | 私人 FM 垃圾桶（后端已有 `fm_trash` module，前端从未调用） |
| `/api/v1/radio/skip` | FM 跳过 |
| `/api/common/feed/resource/dislike` | 推荐反馈，带 `dislikeReasonType` / `dislikeReasonId`，会返回补位资源 `repushResource` |
| `/api/v2/discovery/recommend/dislike` | 推荐流不感兴趣（后端已有 `recommend_songs_dislike` module） |

## 验证命令

```bash
B=https://music.archai.space/api

# 取名单（匿名返回空列表即通路正常）
curl -s "$B/music/dislike/get?t=$(date +%s)"

# 添加 / 删除（需登录 cookie；匿名返回 301）
curl -s -X POST "$B/music/blacklist/add?contentType=song&contentIdList=123456"
curl -s -X POST "$B/music/blacklist/delete?contentType=artist&contentIdList=123456"
```

服务器侧自检：

```bash
systemctl status acmusic-api
journalctl -u acmusic-api -n 30 --no-pager | grep -E "music/(dislike|blacklist)"
# 正常会看到：[INFO] Request Success: [api] /music/dislike/get
```

## module 源码（服务器重建时用）

`module/music_dislike_get.js`：

```js
// 音乐黑名单 - 获取（歌曲 / 歌手 / 播客）
// 走 /api/ 明文通道：实测无需 eapi/weapi 加密，带登录 cookie 即可
const createOption = require('../util/option.js')
module.exports = (query, request) => {
  return request('/api/music/dislike/get', {}, createOption(query, 'api'))
}
```

`module/music_blacklist_add.js`（delete 只需把路径换成 `/api/music-blacklist/delete`）：

```js
// 音乐黑名单 - 添加
// contentType: song | artist
// contentIdList: 官方要求 JSON 数组字符串，如 ["123"]；这里兼容 "123" / "1,2,3" / 数组
const createOption = require('../util/option.js')

function toIdList(v) {
  if (Array.isArray(v)) return JSON.stringify(v.map(String))
  if (v === undefined || v === null || v === '') return '[]'
  const s = String(v).trim()
  if (s.startsWith('[')) {
    try {
      const arr = JSON.parse(s)
      if (Array.isArray(arr)) return JSON.stringify(arr.map(String))
    } catch (e) {
      // 不是合法 JSON，退到逗号分隔
    }
  }
  return JSON.stringify(s.split(',').map((x) => x.trim()).filter(Boolean))
}

module.exports = (query, request) => {
  const data = {
    contentType: query.contentType || 'song',
    contentIdList: toIdList(query.contentIdList || query.id),
  }
  return request('/api/music-blacklist/add', data, createOption(query, 'api'))
}
```
