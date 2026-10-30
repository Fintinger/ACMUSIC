# API 滥用防护（nginx 层）

> 落地时间：2026-10-28
> 线上：`music.archai.space`（nginx 1.24 / Ubuntu；主机地址见 `deploy.yml` 的 `SSH_HOST`）
> 本次范围：L1（CORS 收紧）+ L2（按 IP 限流 / 音频限速 / 只读接口缓存 / 探测路径拦截）
>
> 本文档不写生产主机地址——唯一来源是 `.github/workflows/deploy.yml` 的 `SSH_HOST`；
> 个人出口 IP 一律脱敏（本仓库为 public）。

## 1. 为什么做

起因是「`https://music.archai.space/api/` 是不是谁都能直接调」。实测结论：**是，而且完全没有门槛**。

| 探测 | 改之前 | 改之后 |
|---|---|---|
| `curl` 不带任何头打 `/api/search` | 200，正常返回 | 200（限流内允许） |
| `Origin: https://evil.example.com` 的响应 | `Access-Control-Allow-Origin: https://evil.example.com`（反射任意源） | 固定 `https://music.archai.space` |
| OPTIONS 预检 | 204 + 反射 Origin | 204，不反射 |
| 响应头 | `Server: nginx/1.24.0 (Ubuntu)`、`X-Powered-By: Express` | `Server: nginx`，无 X-Powered-By |
| `/.env`、`/.git/config`、`/wp-login.php` | 200 + index.html（soft 404，扫描器以为文件存在） | 404 |
| 60 并发打同一接口 | 全 200 | 74/100 被 429，约 6 秒后自动恢复 |

### 日志里的真实情况（2026-10-28 当日，748 条 /api 请求）

- **524 条来自你自己的出口 IP**（家宽 IP，已脱敏，需要时查当日日志），其中 UA `acmusic-qbot-service/1.0` 占 252 条 ——
  一个点歌机器人服务在调 `/song/detail`、`/song/url/match`、`/cloudsearch`、`/song/chorus`，并透传了你账号的 `MUSIC_U`。
  如果这不是你部署的，需要立刻排查本机/局域网。
- 196 条来自 AWS 东京两个 IP，Referer 与 UA 都是正常浏览器 → 大概率是你自己挂了代理的浏览器。
- **没有发现外部大规模盗用**。但 24 小时内有 554 次通用漏洞扫描（两台 GCP 主机，探测 `/.env`、`/.git/config`、`phpinfo.php`）。
- 日志中 `?cookie=MUSIC_U%3D...` 是**明文**落盘的，等价于账号密码 → 本次一并做了脱敏。

结论：接口确实完全开放，但目前还没被人当免费后端用。防的是「以后」和「有人顺手打爆」。

## 2. 文件与部署位置

| 仓库文件 | 服务器位置 | 作用 |
|---|---|---|
| `ops/nginx/acmusic-guard.conf` | `/etc/nginx/conf.d/acmusic-guard.conf` | http 级：限流 zone、缓存路径、日志脱敏 map + log_format |
| `ops/nginx/acmusic-api-common.conf` | `/etc/nginx/snippets/acmusic-api-common.conf` | 所有 `/api/` 系 location 共用的 CORS / 限流 / 代理设置 |
| `ops/nginx/music.conf` | `/etc/nginx/sites-available/music` | 站点配置（`sites-enabled/music` 是指向它的 symlink） |

为什么拆三个文件：`nginx.conf` 里还有 blog、guacamole 两个站点，新增 zone 一旦写错会波及全部站点。
拆出来后改动全部收敛在 music 一个站点内，`conf.d` 那个文件也只定义变量不定义 server。

## 3. 部署步骤

```bash
# 1) 上传（本地仓库根目录执行）
#    主机地址不写死：默认从 deploy.yml 的 SSH_HOST 取，也可用环境变量覆盖
DEPLOY_HOST=${DEPLOY_HOST:-$(grep -m1 'SSH_HOST:' .github/workflows/deploy.yml | awk '{print $2}')}
TS=$(date +%Y%m%d-%H%M%S)
ssh root@$DEPLOY_HOST "mkdir -p /root/nginx-bak.$TS && cp -a /etc/nginx/sites-available/music /root/nginx-bak.$TS/"
scp ops/nginx/*.conf root@$DEPLOY_HOST:/tmp/nginx-new/

# 2) 安装（LF 必须保证，否则 nginx -t 会报 unexpected end of file）
ssh root@$DEPLOY_HOST '
  sed -i "s/\r$//" /tmp/nginx-new/*.conf
  mkdir -p /var/cache/nginx/acmusic && chown -R www-data:www-data /var/cache/nginx
  install -m 644 /tmp/nginx-new/acmusic-guard.conf     /etc/nginx/conf.d/acmusic-guard.conf
  install -m 644 /tmp/nginx-new/acmusic-api-common.conf /etc/nginx/snippets/acmusic-api-common.conf
  install -m 644 /tmp/nginx-new/music.conf              /etc/nginx/sites-available/music
  nginx -t && nginx -s reload
'
```

`nginx -t` 失败时线上仍在跑旧配置（未 reload），直接回滚即可，没有中断窗口。

## 4. 验证清单

```bash
S=https://music.archai.space
DEPLOY_HOST=${DEPLOY_HOST:-$(grep -m1 'SSH_HOST:' .github/workflows/deploy.yml | awk '{print $2}')}

# 首页与接口
curl -s -o /dev/null -w "%{http_code}\n" $S/                      # 期望 200
curl -s -o /dev/null -w "%{http_code}\n" "$S/api/search?keywords=test&limit=1"   # 期望 200

# CORS 收紧
curl -sI -H "Origin: https://evil.example.com" "$S/api/search?keywords=t" | grep -i access-control
# 期望：Access-Control-Allow-Origin: https://music.archai.space

# 探测路径
for p in /.env /.git/config /api/ /wp-login.php; do curl -s -o /dev/null -w "$p %{http_code}\n" $S$p; done
# 期望：全部 404

# 缓存（同一关键词连打两次，第二次应为 HIT）
curl -sI "$S/api/search?keywords=jaychou&limit=3" | grep -i x-cache-status   # MISS
curl -sI "$S/api/search?keywords=jaychou&limit=3" | grep -i x-cache-status   # HIT
curl -sI "$S/api/search?keywords=jaychou&limit=3&cookie=MUSIC_U%3Dx" | grep -i x-cache-status  # BYPASS

# 限流（100 并发，期望大约 70 条 429，之后自动恢复）
urls=$(for i in $(seq 100); do echo "$S/api/banner?type=0&x=$i"; done)
curl -s --parallel --parallel-max 60 -o /dev/null -w "%{http_code}\n" $urls | sort | uniq -c

# 日志脱敏
curl -s -o /dev/null "$S/api/song/detail?ids=1&cookie=MUSIC_U%3DSECRET"
ssh root@$DEPLOY_HOST "tail -1 /var/log/nginx/music.access.log"   # 期望看到 cookie=REDACTED
```

音频链路（限速不能破坏起播和 seek）：

```bash
U=$(curl -s "$S/api/song/url?id=347230&br=128000" | python -c "import sys,json;print(json.load(sys.stdin)['data'][0]['url'])")
E=$(python -c "import urllib.parse,sys;print(urllib.parse.quote(sys.argv[1],safe=''))" "$U")
curl -s -o /dev/null -D - "$S/api/audio-proxy?url=$E"     | head -3   # 200 + audio/mpeg
curl -s -o /dev/null -D - -r 100000-200000 "$S/api/audio-proxy?url=$E" | grep -i range  # 206 + content-range
```

## 5. 回滚

```bash
cat /etc/nginx/sites-available/music | head -1        # 确认是本次版本
cp -a /root/nginx-bak.<TS>/music /etc/nginx/sites-available/music
rm -f /etc/nginx/conf.d/acmusic-guard.conf /etc/nginx/snippets/acmusic-api-common.conf
nginx -t && nginx -s reload
```

只删 `conf.d` 那个文件而不恢复站点配置会导致 `unknown limit_req_zone` 报错，两步都要做。

## 6. 已知副作用

- **`/api/` 根路径从 200 变 404**：原本会返回 NeteaseCloudMusicApi 自带的接口文档页（`/api/docs/netease.png` 之类的静态资源也跟着 404）。
  需要看文档时临时放开：把 `music.conf` 里 `location = /api/ { return 404; }` 注释掉再 reload。
- **429 阈值是 `15 r/s` + `burst 40`**。详情页首屏一次会并发 10-15 个接口，正常浏览远低于阈值；
  但如果哪天出现「快速切换页面偶发 429」，把 `acmusic-guard.conf` 里的 `rate=15r/s` 调到 `25r/s`，或 `burst` 调到 `60`。
- **缓存只覆盖 `/api/search`、`/api/cloudsearch`、`/api/song/detail`**，且只对不带 `cookie` 参数的请求生效。
  其他接口一律不缓存 —— NeteaseCloudMusicApi 里很多「写操作」是 GET 实现的（`/like`、`/playlist/tracks`、`/follow`），误缓存会导致「点了没反应」。
- **限流按 IP 计**：如果以后在 nginx 前面套 CDN/WAF，`$binary_remote_addr` 会变成 CDN 节点 IP，
  必须补 `set_real_ip_from` + `real_ip_header X-Forwarded-For`，否则一整片用户会共用一个额度。

## 7. 还没做的（按性价比排序）

1. **历史日志里的明文 MUSIC_U**：本次之后新日志已脱敏，但 `music.access.log.1`～`.7.gz` 里还有大量旧记录。
   建议：`/var/log/nginx` 下旧文件就地脱敏或删除；如果这份日志曾被转发/上传过，去网易云「退出所有设备」重新登录一次最稳。
2. **L3 cookie 门票**：nginx 下发 `httpOnly` cookie，`/api/` 校验为空即 403。能把「从没打开过你网站的人」全部挡在外面，
   代价是白嫖者从「curl 一行」变成「先打开网站、再翻 DevTools 抄 cookie」。这是纯前端 SPA 能做到的实际上限。
3. **音频签名 URL**：`<audio>` 不能带自定义 header，只能在拿到播放地址时换一个短时效签名，
   抓到的链接只能听一首、几分钟。如果带宽账单是主要痛点再做。
4. **自己的 qbot 服务**：`acmusic-qbot-service` 目前用的是你的个人 `MUSIC_U`，且走的是公开接口。
   如果要长期跑，建议给它单独申请一个账号，避免主账号被风控（也便于单独限额）。
