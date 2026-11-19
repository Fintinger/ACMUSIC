# AI 点歌辅助服务

`/ai` 页面的后端。把「一句话」翻译成「曲库里真实存在的歌单」。

它**不替代** NeteaseCloudMusicApi，而是挂在它旁边：`3000` 是曲库，`3002` 是这层意图解析。

```
浏览器 ──/api/ai/playlist──> nginx ──> 127.0.0.1:3002  (本服务)
                                            │
                                            ├──> DeepSeek       解析意图，输出标签/关键词/歌名标题
                                            └──> 127.0.0.1:3000  /cloudsearch 校验曲目
```

## 为什么要有这一层

模型会编歌名。直接让它「推荐 10 首歌」再拿去播，十首里能有两三首搜不到，剩下的一半是翻唱。
所以这里的模型只被允许干一件事：**输出搜索词**。真正的歌曲对象一律由 `/cloudsearch` 返回，
搜不到就不出现在结果里 —— 这是整条链路唯一重要的事。

第二个原因是 key 不能进前端。仓库是公开的，`dist/` 里的任何字符串都等于公开。

## 部署

### 1. 放代码

服务是单文件、零依赖（只用 Node 内置模块），不需要 `npm install`：

```bash
sudo mkdir -p /opt/acmusic-ai
sudo cp api/ai-recommend.mjs /opt/acmusic-ai/
```

Node 需要 **18+**（用到全局 `fetch` 和 `AbortSignal.timeout`）。VPS 上是 24，没问题。

### 2. 配 key

`/etc/acmusic-ai.env`（**权限必须 600**，这个文件不进 git）：

```bash
sudo tee /etc/acmusic-ai.env >/dev/null <<'EOF'
DEEPSEEK_API_KEY=sk-xxxxxxxxxxxxxxxx
NETEASE_API_BASE=http://127.0.0.1:3000
AI_PORT=3002
EOF
sudo chmod 600 /etc/acmusic-ai.env
sudo chown root:root /etc/acmusic-ai.env
```

可选变量：

| 变量 | 默认 | 说明 |
|---|---|---|
| `DEEPSEEK_API_KEY` | 空 | 不填则**降级为原话直搜**，功能不崩，页面上会提示 |
| `DEEPSEEK_BASE_URL` | `https://api.deepseek.com` | 换任何 OpenAI 兼容网关都行 |
| `DEEPSEEK_MODEL` | `deepseek-chat` | |
| `NETEASE_API_BASE` | `http://127.0.0.1:3000` | 同机直连，不过公网 |
| `AI_PORT` | `3002` | |

> 注意：**不要**把 key 写进仓库的 `.env`。那个文件是 git 跟踪的。

### 3. 起服务

```bash
sudo cp ops/ai-recommend/acmusic-ai.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now acmusic-ai
systemctl status acmusic-ai --no-pager
curl -s http://127.0.0.1:3002/health
```

`/health` 返回 `aiEnabled: false` 说明没读到 key —— 服务能跑，但只做原话直搜。

### 4. 接 nginx

仓库里的 `ops/nginx/music.conf` 和 `ops/nginx/acmusic-guard.conf` 已经写好了两个 location
（`/api/ai/playlist`、`/api/ai/health`）和一条独立的限流 zone。按 `ops/nginx/README.md`
的步骤推到服务器：

```bash
sudo cp ops/nginx/music.conf /etc/nginx/sites-available/music
sudo cp ops/nginx/acmusic-guard.conf /etc/nginx/conf.d/acmusic-guard.conf
sudo nginx -t && sudo systemctl reload nginx
```

**nginx 不由 CI 部署**，上面这几步必须手动做，否则线上 `/api/ai/playlist` 会是 404。

## 排障

| 现象 | 看什么 |
|---|---|
| 页面提示「AI 服务还没部署到线上」 | 前端拿到 404。`curl -X POST https://music.archai.space/api/ai/playlist` 是否 502/404 |
| `degraded: "no-key"` | `systemctl show acmusic-ai -p Environment` 里有没有 key，或 `/health` 的 `aiEnabled` |
| `degraded: "llm-failed"` | `journalctl -u acmusic-ai -n 50`，多半是 key 失效、余额不足或模型名写错 |
| 歌单为空 | 关键词搜不到。日志里 `tracks=0` 那条会带 keywords，拿去手动 `/cloudsearch` 试 |
| 歌单里全是翻唱/伴奏 | 检查 `JUNK_PATTERN`、`isSpamTitle`、`isKeywordBait` 三个过滤器是否被改松了 |

## 成本与限流

- 缓存：同一句话（含历史）5 分钟内只打一次模型，`resultCache` 最多 200 条。
- 限流：每 IP 10 次/分钟，nginx 和应用层各一道。
- 单次请求典型消耗：prompt ≈ 700 token（含 51 个标签的词表），输出 ≈ 150 token。
  按 deepseek-chat 的价格，一次问答的成本在**厘**的量级，一天一百次也就几分钱。

## 改模型

换 `DEEPSEEK_BASE_URL` + `DEEPSEEK_MODEL` 即可，接口按 OpenAI 的 `/chat/completions` 约定。
如果目标模型不支持 `response_format: {type: "json_object"}`，需要把 `parseIntent` 里的这个字段
去掉 —— 代码已经对「JSON 外面包了层文字」做了兜底提取，能扛住。
