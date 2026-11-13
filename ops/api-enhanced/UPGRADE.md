# api-enhanced 升级操作单（到 v4.41.1）

> 适用对象：`/opt/api-enhanced`（`Fintinger/api-enhanced` 的 shallow clone）
> 基线记录：HEAD `5b780ad` / package.json `4.39.0` / `unblockmusic-utils@0.4.5` / 2026-11-13 核对
> 目标版本：`v4.41.1`（落后 58 个 commit、54 个文件）
>
> 本文命令假定在**同一个 shell 会话**内连续执行（`$TS` 是步骤 1 定义的时间戳）。分步执行时请自行替换变量。

## 0. 现状与前提

| 项 | 值 | 影响 |
|---|---|---|
| 服务 | `systemctl` → `acmusic-api.service`，`Type=simple`，`MemoryMax=512M` | 重启即生效，无需 build |
| 目录体积 | 72M（含 node_modules） | 整目录备份成本可忽略 |
| 运行时数据 | `data/` 只有 `china_ip_ranges.txt`、`deviceid.txt`（git 跟踪） | **无需单独备份数据** |
| `.env` / `anonymous_token` | 均不存在 | 无环境变量要迁移 |
| 锁文件 | 仓库自带 `pnpm-lock.yaml`，实际用 npm 装过（生成了未跟踪的 `package-lock.json`） | 见步骤 2 |
| node / npm | `/opt/node/bin/{node,npm}`（v22.23.3） | **不在 root 的 PATH 里，必须写全路径** |
| 磁盘 / 可用内存 | 31G 空闲 / 643M available | unshallow 与 npm install 都够用，但别并行跑别的 |

## 1. 备份（先做，不可跳过）

```bash
TS=$(date +%Y%m%d-%H%M%S)
cp -a /opt/api-enhanced /opt/api-enhanced.bak.$TS
ls -d /opt/api-enhanced.bak.*          # 记下路径，回滚要用
```

同时留一份"升级前行为基线"，升级后逐条比对：

```bash
B=/root/api-baseline.$TS
{
  echo "== version =="; grep -m1 '"version"' /opt/api-enhanced/package.json
  echo "== search ==";      curl -s "http://127.0.0.1:3000/search?keywords=%E6%99%B4%E5%A4%A9&type=1&limit=1" | head -c 200
  echo; echo "== cloudsearch =="; curl -s "http://127.0.0.1:3000/cloudsearch?keywords=%E6%99%B4%E5%A4%A9&type=1&limit=1" | head -c 200
  echo; echo "== url/v1 =="; curl -s "http://127.0.0.1:3000/song/url/v1?id=2058263032&level=exhigh" | head -c 200
  echo; echo "== match ==";  curl -s "http://127.0.0.1:3000/song/url/match?id=186016" | head -c 200
  echo; echo "== detail =="; curl -s "http://127.0.0.1:3000/song/detail?ids=186016" | head -c 200
} > $B 2>&1
cat $B
```

## 2. 清理工作区

`package-lock.json` 未跟踪，会让 rebase 报"工作区不干净"：

```bash
cd /opt/api-enhanced
git status --porcelain                 # 预期只有 ?? package-lock.json
mv package-lock.json /root/package-lock.json.$TS
git status --porcelain                 # 预期为空
```

## 3. 同步代码

shallow clone 必须先补历史，否则 rebase 会拒绝：

```bash
cd /opt/api-enhanced
git fetch --unshallow                  # 约 100~200MB，一次性
git remote add upstream https://github.com/NeteaseCloudMusicApiEnhanced/api-enhanced.git   # 只需一次
git fetch upstream --tags
git rebase v4.41.1                     # 用 tag 名，不是 upstream/v4.41.1（tag 不在远端命名空间下）
grep -m1 '"version"' package.json      # 预期 4.41.1
git log --oneline -3
git status -sb                         # 会显示领先 origin/main 若干条，属正常
```

> 若 `git remote add upstream` 报已存在，改用 `git remote set-url upstream ...`。
> 不要把 fork 的 `main` 直接 rebase 到 `upstream/main`：那里可能已包含未发版的提交，钉在 tag 上更可控。
> 回写 fork 不要在服务器上 push（无凭据、会弹交互）。升完确认稳定后，去 GitHub 仓库页点一次 **Sync fork** 即可，两边最终一致。

## 4. 更新依赖

服务器内存偏紧（643M available），跳过 devDependencies：

```bash
cd /opt/api-enhanced
PATH=/opt/node/bin:$PATH npm install --omit=dev --ignore-scripts --no-audit --no-fund
echo "EXIT=$?"
```

**`--ignore-scripts` 不能省。** `package.json` 里有 `"prepare": "husky install"`，而 husky 属于 devDependencies，被 `--omit=dev` 排除后 `prepare` 会以 `husky: not found` 失败，npm 退出码 **127**——但此时包其实已经装完了（`.package-lock.json` 已写入、依赖可解析），很容易误判成安装失败而回滚。

本项目的依赖树里没有任何包带 `install`/`postinstall`/`preinstall` 脚本（已逐个核对），所以 `--ignore-scripts` 不会漏掉构建步骤。换版本后可重新核对：

```bash
node -e "const fs=require('fs'),p=require('path');for(const d of fs.readdirSync('node_modules')){if(d[0]==='.')continue;try{const j=require(p.resolve('node_modules',d,'package.json'));const s=j.scripts||{};if(s.install||s.postinstall||s.preinstall)console.log(d,s.install||s.postinstall||s.preinstall)}catch(e){}}"
```

预期变化：`axios ^1.18.1 → ^1.20.0`、`unblockmusic-utils ^0.4.0 → ^0.4.5`。
其余为 eslint/mocha/prettier 等 devDependencies，被 `--omit=dev` 跳过。

## 5. 重启

```bash
systemctl restart acmusic-api
sleep 3
systemctl is-active acmusic-api
journalctl -u acmusic-api -n 60 --no-pager
```

日志里若出现 `EACCES`/`Cannot find module`，先回滚（见第 7 节），再单查。

## 6. 验证

```bash
cd /opt/api-enhanced
echo "version: $(grep -m1 '"version"' package.json)"
for u in \
  "search?keywords=%E6%99%B4%E5%A4%A9&type=1&limit=1" \
  "cloudsearch?keywords=%E6%99%B4%E5%A4%A9&type=1&limit=1" \
  "song/detail?ids=186016" \
  "login/status"; do
  printf "%-52s http=%s\n" "$u" "$(curl -s -m 20 -o /dev/null -w '%{http_code}' "http://127.0.0.1:3000/$u")"
done
echo "url_v1 : $(curl -s -m 20 "http://127.0.0.1:3000/song/url/v1?id=2058263032&level=exhigh" | grep -o '"url":"http[^"]*' | head -1)"
echo "match  : $(curl -s -m 25 "http://127.0.0.1:3000/song/url/match?id=186016" | grep -o '"code":[0-9]*' | head -1)"
echo "vivid  : $(curl -s -m 25 "http://127.0.0.1:3000/song/url/v1?id=186016&level=vivid" | grep -o '"code":[0-9]*' | head -1)"
```

> **不要用整段响应做 diff。** 升级前后 `url`、`md5`、CDN 节点（`p3`↔`p4`）、时间戳 token 每次都会变，而 `head -c 200` 又会把内容截断在 URL 中间，导致 `sed` 归一化匹配不到，diff 全是噪音。用上面的字段级断言，第 1 步的快照只留作人工对照。

| 检查项 | 通过标准 |
|---|---|
| `/search`、`/cloudsearch`、`/song/detail`、`/login/status` | HTTP 200 |
| `/song/url/v1?id=2058263032&level=exhigh` | 能取到 `"url":"http...` |
| `/song/url/match?id=186016` | `"code":200`（`data` 是 `bd-*.kuwo.cn` 链接） |
| `/song/url/v1?id=186016&level=vivid` | 不返回 500；未登录/非会员时 `data[0].code:404`、`url:null` 属正常 |
| 服务健康 | `systemctl is-active` = active，`NRestarts=0`，`MemoryCurrent` ≈ 70~80MB |
| 前端全链路 | 打开 https://music.archai.space，搜索 → 点播 → 灰歌能出声 |

> 注意：直接 `curl /login/status` 会返回一个 `id` 形如 `18053540264`、`userName` 以 `1000_` 开头的**匿名账号**，这是服务端自动申请的，与真实登录无关，不能拿它判断登录态是否正常。

重点回归这三处（本次改动最大的两个文件是 `util/request.js` +153/−26、`util/crypto.js` +106/−8，动的是易盾风控对接）：**未登录播放、登录、搜索**。

## 7. 回滚

```bash
systemctl stop acmusic-api
rm -rf /opt/api-enhanced
mv /opt/api-enhanced.bak.<TS> /opt/api-enhanced
systemctl start acmusic-api
sleep 3 && systemctl is-active acmusic-api
```

整目录回滚会连 `node_modules` 一起还原，比 `git reset` + 重装更干净。
确认无误后可删掉旧备份；建议至少保留到观察满 24 小时。

## 8. 升级后可选跟进

1. **音质档位**：`src/config.js` 的 `qualityLevels` / `qualityOptions` 补 `vivid`（臻音全景声），并把 `jyeffect` 的中文名对齐上游的"高清臻音"。
2. **解灰加速 patch**：**已于 2026-11-13 19:05 应用**，详见 [`patches/README.md`](./patches/README.md)。实测 7.4s → 0.48s，并向响应体追加 `source / br / size`。该文件在 58 个提交里未被上游修改，冲突面为 0。
3. **新接口**（按价值排序）：`song_simi_get`（插播相似歌曲）→ `recommend_songs_v1` / `recommend_category_*` → `song_wiki_info`。`like_v1` 走的是 `/api/v1/radio/like`，与现有红心语义不同，不要直接替换。

## 9. 已知不一致（记录在案）

- 仓库锁的是 `pnpm-lock.yaml`，实际用 npm 安装并生成了 `package-lock.json`。本次沿用 npm（`--omit=dev`）。若日后想和上游完全一致，改用 `corepack pnpm install --prod`，但需先确认 pnpm 版本与上游 workspace 兼容。
- `unblockmusic-utils` 声明为 `^0.4.0`，实装 0.4.5（满足语义化范围），升级后会变成 `^0.4.5`。

## 10. 执行记录

**2026-11-13 19:00 CST 完成升级：4.39.0 → 4.41.1**

| 项 | 值 |
|---|---|
| 备份 | `/opt/api-enhanced.bak.20261113-184934`（72M，建议保留至 11-14 之后再删） |
| 基线快照 | `/root/api-baseline.20261113-184934` |
| 代码 | `2db6684`（v4.41.1），`main` 领先 `origin/main` 58 条 —— fork 待 GitHub 上 Sync |
| 依赖 | axios 1.20.0 / unblockmusic-utils 0.4.5 / express 5.x，`npm ls --omit=dev` 无 UNMET |
| 服务 | 19:00:50 重启，`NRestarts=0`，内存 74.1MB |
| 验证 | `/search`、`/cloudsearch`、`/song/detail`、`/login/status` 全 200；`/song/url/v1` 有 url；`/song/url/match` 200；`vivid` 返回 `data[0].code:404`（非会员，符合预期） |

过程中踩到并在正文修正的两个坑：`npm install --omit=dev` 因 `prepare: husky install` 退出 127；整段响应 diff 因 `head -c` 截断在 URL 中间而全是噪音。

**顺带确认的事实**（日志实录，可作为解灰 patch 的收益依据）：

| 模块 | 失败原因 |
|---|---|
| `byfuns` | HTTP 404 |
| `ddyr` | `yy.zddyr.top` 解析到 `2003::f11`（无效地址），TLS 报证书不匹配 |
| `gdmusic` | HTTP 503 |
| `msls` / `oi` / `qijieya` | 串行尝试，同样失败 |

这 6 个模块在 `unm` 之前串行跑完，公网实测一次 `/api/song/url/match` 耗时 **7.4s**。也就是说它们唯一的作用，是在本地 UNM 接管之前先浪费 7 秒 —— 这正是第 8 节第 2 条 patch 要解决的问题。

**2026-11-13 19:05 已应用该 patch**（服务器本地提交 `6865c63`，基于 tag `v4.41.1`）：

| 场景 | 改前 | 改后 |
|---|---|---|
| `/song/url/match?id=186016` | 7.4s | 0.48s（二次 0.004s） |
| 不存在的 id | 12.1s → 500 | 0.09s → 502 |

改动落在 `module/song_url_match.js` + `package.json`（显式声明 `@unblockneteasemusic/server@^0.28.0`，原为间接依赖）。完整文件与回滚方式见 `patches/`。
