# 音频取流方案（音质选择重构）— 提案

> 状态：**已实施**（2026-10-21，commit 见 CHANGELOG_AI.md）
> 决策：解灰选 A（尊重音质优先，解灰只做兜底）；档位补齐常用档（加 higher，共 5 档）
> 取证时间：2026-10-21，API 版本 v4.39.0（`/opt/api-enhanced`）

## 实施结果（按新链路实测）

| 歌曲 | 选 hires | 选 lossless | 选 exhigh | 选 higher | 选 standard |
| --- | --- | --- | --- | --- | --- |
| 2058263032（普通歌） | 320k / 7.7MB¹ | 320k / 7.7MB¹ | 320k / 7.7MB | 192k / 4.6MB | 128k / 3.1MB |
| 186016（VIP 歌） | 解灰源 | 解灰源 | 解灰源 | 解灰源 | 解灰源 |

¹ 非会员请求 lossless/hires 被上游压到 exhigh（返回 `level=exhigh`），UI 会如实显示 320k。

对比修复前：**所有档位都是 flac 32.5MB**，现在是 3.1 / 4.6 / 7.7MB 按档递增。


## 一、结论先行

现在"音质切换形同虚设、永远拿最高档 flac"的原因**不是**接口不支持音质，而是主请求带了 `unblock=true`：

```js
// src/components/musicPlayer/PlayerCore.vue:558
self.$axios('/song/url/v1', {
  params: { id, level: lv, unblock: true, timestamp: Date.now() }   // ← unblock 把 level 废掉了
})
```

上游模块源码写得很直白（`module/song_url_v1.js` 注释原文）：

> 当 unblock 为 true 时, 会尝试使用 unblockmusic-utils 进行解锁, **同时音质设置不会生效**, 但仍然为必须传入参数

也就是说：只要带 `unblock=true`，`level` 传什么都白搭，直接走第三方解灰源拿 flac。

## 二、现有音频相关接口盘点

| 接口 | 参数 | 能否选音质 | 实测行为 | 项目里现在怎么用 |
| --- | --- | --- | --- | --- |
| `/song/url/v1` | `level` = standard / higher / exhigh / lossless / hires / jyeffect / sky / jymaster | ✅ **能**（但被 `unblock` 覆盖） | `unblock=false` 时 level 生效；`unblock=true` 恒返回 flac | 主接口，**但一直带 unblock=true** |
| `/song/url` | `br` = 128000 / 192000 / 320000 / 999000 | ⚠️ 理论能，实测**被忽略** | 三个 br 全部返回 128k MP3（481KB） | 第二层兜底 |
| `/song/url/match` | `id`（可选 `source`） | ❌ 固定第三方源 | 返回 `data` 为**字符串 URL**；VIP 歌返回 kuwo 源 | 第三层兜底，**但解析写错，实际从未生效** |
| `/song/download/url/v1` | `level` | ✅ 能 | 需登录，未登录 `code:-110` | 下载按钮（P0 已接） |
| `/song/media/outer/url` | `id` | ❌ | 本版本 **404** | 死路径（`initAudioByOuterUrl`） |
| `/check/music` | `id`, `br` | ❌ | 返回 `success/message` | 失败原因提示（P0 已接） |

### 实测数据：level 到底生效不生效

同一首歌（2058263032，普通歌），**不带 unblock**：

| 请求 level | 实际返回 level | 类型 | 码率 | 体积 |
| --- | --- | --- | --- | --- |
| standard | standard | mp3 | 128 kbps | 3.2 MB |
| higher | higher | mp3 | 192 kbps | 4.8 MB |
| exhigh | exhigh | mp3 | 320 kbps | 8.0 MB |
| lossless | **exhigh** | mp3 | 320 kbps | 8.0 MB |
| hires | **exhigh** | mp3 | 320 kbps | 8.0 MB |

（后两行是非会员被上游"压级"，返回的 `level` 字段会如实告诉你降到了 exhigh —— 这个字段可以拿来做 UI 提示。）

**带 unblock=true**（当前代码）：

| 请求 level | 实际返回 | 类型 | 体积 |
| --- | --- | --- | --- |
| standard | flac | flac | **32.5 MB** |
| exhigh | flac | flac | 32.5 MB |
| hires | flac | flac | 32.5 MB |

同一首歌 128k 是 **481 KB**，flac 是 **32.5 MB**，**差 68 倍**。这就是你感觉"切了没用、加载变慢"的直接来源。

### 另一个坑：VIP 歌在关掉 unblock 后直接没声音

`186016`（晴天，fee=1）不带 unblock 时，**所有 level 都返回 `url: null`**；带 unblock 才拿到 kuwo 源。
所以不能简单地把 `unblock=true` 删掉就完事——那样所有 VIP 歌会静音。

## 三、顺带查出来的 4 个问题

1. **`/song/url/match` 解析写错，兜底从未生效**
   接口返回 `{code:200, data:"http://...", proxyUrl:"..."}`，`data` 是**字符串**；
   而代码读 `r.data.data[0].url` → 永远 `undefined` → 抛 `NO_RESOURCE`。这一层等于没有。
2. **`qualityOptions` 与 `qualityLevels` 不一致**
   菜单只给 4 档（hires / lossless / exhigh / standard），而降级链里有 `higher`；
   用户选了 standard 之后，菜单里没有任何办法回到 higher/192k。
   API 还支持 `jyeffect`（高清环绕声）、`sky`（沉浸环绕声）、`jymaster`（超清母带），菜单里都没有。
3. **界面显示的是"用户选的档位"，不是"实际拿到的档位"**
   `currentQualityShort` 取的是 `config.player.level`。实际被压级/降级时（比如非会员选无损 → 320k），
   按钮仍显示"无损"，用户无从判断。
4. **切档只清了 `urlCache`，没清 `audioCache`**
   `urlCache` 按 `id_level` 存（正确），但 `audioCache` 按 `id` 存；切档后预加载可能命中旧质量。

## 四、推荐方案

### 4.1 目标请求顺序（4 层）

```
第 0 层  命中 urlCache(id_level)                  → 直接用（同档位复用，切档天然不命中）
第 1 层  /song/url/v1?level=<用户选择>             → unblock 不再传；尊重音质
         失败/无 url → level 逐级下移（exhigh→higher→standard）
第 2 层  /song/url/match?id=<id>                   → 专门解灰接口（VIP/版权受限兜底）
         解析 data 字符串；成功则标记 source='match'（音质不可控，要告知用户）
第 3 层  /song/url?br=<按 level 映射>              → 老接口保底（实测只给 128k，价值低）
第 4 层  全失败 → /check/music 解释原因 + 自动下一首
```

关键变化：
- **`unblock` 从第 1 层移除**，解灰统一交给第 2 层的 `/song/url/match`（这也是上游文档推荐的用法：
  "Customizing unblock sources is not supported on this endpoint. Please use `/song/url/match` instead."）
- 第 2 层成功时，把 `currentQuality.actual = 'unblock'` 并在播放器上给个"解灰源"标记（音质/版本不可控）
- 第 3 层实测收益几乎为零（br 被忽略），建议**降级为可选开关**，默认关掉，减少一次无效请求

### 4.2 缓存与切档

| 缓存 | key | 现存问题 | 改法 |
| --- | --- | --- | --- |
| `urlCache` | `id_level` | 正确 | 保持；新增 `id_match` 单独存 |
| `audioCache` | `id` | 切档后仍命中旧质量 | 切档时 `removeAudioCache(id)`，或 key 改成 `id_level` |

### 4.3 UI 与配置

1. `qualityOptions` 与 `qualityLevels` 对齐：
   - 免费档：standard(128) / higher(192) / exhigh(320)
   - VIP 档：lossless / hires（可选加 jyeffect / sky / jymaster）
2. 播放器音质按钮显示**实际档位**：`currentQuality.actual`，被压级时加个角标（如"320k"而非"无损"）
3. 非会员选了 VIP 档（上一轮已做门控），继续保持拦截 + 提示

### 4.4 代码改动范围

| 文件 | 改动 |
| --- | --- |
| `src/components/musicPlayer/PlayerCore.vue` | `getSongUrl` 去掉 unblock、重排兜底顺序；`requestMatchSongUrl` 修解析；`onQualitySelect` 清 `audioCache`；`currentQualityShort` 改用 actual |
| `src/config.js` | `qualityOptions` 补 higher，`qualityLevels` 与之一致；新增 `enableLegacyBrFallback` 开关（默认 false） |
| `src/components/musicPlayer/QualityMenu.vue` | 可选档位按会员状态展示（复用上一轮的 `vipType`） |
| `src/api/Tracks.js` | `songUrlMatch` 返回值注释修正（data 是字符串） |

**不动**：下载（`/song/download/url/v1` 另走 `level`，与播放解耦）、歌词、其他页面。

## 五、验证方案

| 项 | 方法 | 期望 |
| --- | --- | --- |
| level 生效 | 同一首歌分别切 standard/higher/exhigh，看 Network 里 `br` 与文件大小 | 128k/192k/320k 递增，不再恒 flac |
| 非会员压级 | 选 lossless（有门控时会被拦；绕过门控则看返回） | 返回 `level=exhigh`，UI 显示 320k |
| VIP 歌兜底 | 播放 186016 | 走到第 2 层 match，拿到可用 url，UI 标记"解灰源" |
| 切档不串味 | 播歌 → 切档 → 再看 Network | 新请求 level 与所选一致，缓存不命中 |
| 失败提示 | 播放无版权歌 | 显示 `/check/music` 的原话，自动下一首 |

## 六、需要你决定的取舍

解灰（第三方源）与"尊重音质"天然冲突：解灰源只能给 flac/固定质量，且曲目版本不一定对（kuwo 源）。
三个选项：

| 选项 | 行为 | 代价 |
| --- | --- | --- |
| **A（推荐）** | 尊重音质优先；解灰只做第 2 层兜底，并在 UI 标"解灰源" | VIP 歌首次播放多一次请求（约 +200ms） |
| B | 高音质档（lossless/hires）保留 `unblock=true`，低音质档不带 | 高音质档仍恒 flac，等于"选无损=解灰源" |
| C | 彻底关闭解灰 | VIP 歌无声音，只提示"需要 VIP" |

另外是否补齐 `jyeffect / sky / jymaster` 三档（需要 VIP，且 `sky` 还要选 `immerseType`），一句话决定即可。
