# 解灰加速 patch：`module/song_url_match.js`

## 问题

`/song/url/match` 走 `unblockmusic-utils` 的 `matchID()`，它按文件名顺序串行尝试 7 个模块：

```
byfuns -> ddyr -> gdmusic -> msls -> oi -> qijieya -> unm
```

只有最后那个 `unm` 是本地实现（`@unblockneteasemusic/server`，无外部依赖）。2026-11-13 线上日志实录：

| 模块 | 失败原因 |
|---|---|
| byfuns | HTTP 404 |
| ddyr | `yy.zddyr.top` 解析到 `2003::f11`（无效地址），TLS 证书不匹配 |
| gdmusic | HTTP 503 |
| msls / oi / qijieya | 同样失败 |

结果：公网一次 `/api/song/url/match` 实测 **7.4 秒**，时间全花在给 `unm` 让路之前的空转上。

另一个副作用：`unm` 内部返回的 `source` / `br` / `size` 被 `unm.js`（只 `return response.url`）和 `song_url_match.js`（只透出 `data`、`proxyUrl`）两层丢掉，前端拿不到"具体是哪个音源"，只能显示"第三方源"。

## 改动

`module/song_url_match.js` 整体替换为 [song_url_match.js](./song_url_match.js)：

1. 直接 `require('@unblockneteasemusic/server')` 调 `match(id, sources)`，跳过 6 个失效模块。
2. 加 8 秒硬超时，避免某个源卡住时挂到 nginx 的 `proxy_read_timeout`。
3. 透出 `source` / `br` / `size`（响应体新增字段，向后兼容 —— `data` 仍是 url 字符串）。
4. 无源时返回 **502**（语义上"上游没货"），与代码异常的 500 区分，便于按状态码统计命中率。
5. 旧链路保留为 `MATCH_LEGACY_FALLBACK=true` 的开关，默认关闭。

配套：`package.json` 的 `dependencies` 增加 `"@unblockneteasemusic/server": "^0.28.0"`。它原本是 `unblockmusic-utils` 的间接依赖（同版本范围），显式声明避免依赖提升规则变化后失效。

## 应用

```bash
cd /opt/api-enhanced
cp module/song_url_match.js /root/song_url_match.js.bak

# 1) 替换文件（从本仓库拷过去）
scp ops/api-enhanced/patches/song_url_match.js root@<host>:/opt/api-enhanced/module/song_url_match.js

# 2) 显式声明依赖
PATH=/opt/node/bin:$PATH node -e "
const fs=require('fs');const p='package.json';const j=JSON.parse(fs.readFileSync(p));
j.dependencies['@unblockneteasemusic/server']='^0.28.0';
fs.writeFileSync(p, JSON.stringify(j,null,2)+'\n');
"
PATH=/opt/node/bin:$PATH npm install --omit=dev --ignore-scripts --no-audit --no-fund

systemctl restart acmusic-api
systemctl is-active acmusic-api
```

## 验证

```bash
# 单次耗时 + 来源字段（第一次可能稍慢，第二次应显著更快）
time curl -s "http://127.0.0.1:3000/song/url/match?id=186016"

# 预期：HTTP 200，body 形如
# {"code":200,"data":"http://bd-*.kuwo.cn/...","proxyUrl":"...","source":"bodian","br":320000,"size":10792943}
```

日志里应出现一行 `解灰: id=186016 source=bodian br=320000 <ms>ms`，不再有 `byfuns error` / `ddyr error` / `gdmusic error`。

| 检查项 | 通过标准 |
|---|---|
| 有版权的歌（如 `186016`） | 200，`source` 非空，耗时 < 1.5s |
| 随便一个不存在的 id（如 `999999999`） | 502，且**秒级返回**（旧实现要 12s） |
| 常规音源 `/song/url/v1` | 仍正常，未受影响 |
| 前端灰歌播放 | 能出声 |

## 实测结果（2026-11-13 19:05 CST，生产环境）

| 场景 | 改前 | 改后 |
|---|---|---|
| `/song/url/match?id=186016` 首次 | 7.4s | **0.48s** |
| 同一首第二次 | — | 0.004s（UNM 内部缓存命中） |
| 不存在的 id（999999999） | 12.1s 后 500 | **0.09s 返回 502** |
| 返回字段 | `code` / `data` / `proxyUrl` | 追加 `source:"bodian"`、`br:320000`、`size:10792943` |

日志对照：

```
改前： byfuns error: 404 → ddyr error: 证书不匹配 → gdmusic error: 503 → …… → unm 才成功
改后： 解灰: id=186016 source=bodian br=320000 369ms
```

公网经 nginx 验证同样生效（成功 200 / 失败 JSON 502 + 0.18s），`ops/nginx/*.conf` 里没有 `error_page` 拦截 502，响应体原样透传给前端。

## 部署形态

改动以**本地提交**的形式落在服务器上（`6865c63`，基于 tag `v4.41.1`），没有 push（服务器无凭据）。
完整文件同样保存在本目录，作为独立备份 —— 即使服务器重装也能重新拷贝。

注意：GitHub 上的 fork 在 2026-11-13 已同步到上游 main（`4a7d5573`，比 `v4.41.1` 多若干提交），而服务器本地的 `origin/main` 引用仍停在旧位置。以后要跟上游时执行：

```bash
cd /opt/api-enhanced
git fetch origin            # 更新远端引用（国内可能较慢，可加 -c http.lowSpeedLimit=1000 -c http.lowSpeedTime=15）
git rebase origin/main      # 本地这条 patch 会被重放到新基线上；song_url_match.js 上游未改动，不会冲突
```

## 回滚

```bash
cp /root/song_url_match.js.bak /opt/api-enhanced/module/song_url_match.js
systemctl restart acmusic-api
```

`package.json` 里多出来的那条依赖不影响回滚（旧的 `song_url_match.js` 不会 require 它）。

