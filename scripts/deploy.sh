#!/usr/bin/env bash
#
# 手工部署兜底脚本（CI 不可用时手动执行）
#
# 正常流程：push 到 master → GitHub Actions 自动构建 + rsync 上线（见 .github/workflows/deploy.yml）
# 本脚本用于：Actions 挂了 / 想不经过 CI 紧急上线
#
# 用法： ./scripts/deploy.sh
# 覆盖： DEPLOY_HOST=1.2.3.4 DEPLOY_KEY=~/.ssh/xxx ./scripts/deploy.sh
#
set -euo pipefail

HOST="${DEPLOY_HOST:-39.96.78.231}"
KEY="${DEPLOY_KEY:-$HOME/.ssh/archai_deploy}"
TARGET="/var/www/music"
SITE="https://music.archai.space"

cd "$(dirname "$0")/.."

echo "== 1/6 检查工作区 =="
if [[ -n "$(git status --porcelain)" ]]; then
  echo "⚠️  工作区有未提交改动，本次产物会包含这些改动（线上与仓库不一致）"
fi

echo "== 2/6 检查推送状态 =="
if git rev-parse '@{u}' >/dev/null 2>&1; then
  AHEAD=$(git rev-list --count '@{u}..HEAD')
  if [[ "$AHEAD" -gt 0 ]]; then
    echo "⚠️  有 $AHEAD 个 commit 未推送 —— 会造成「线上已更新、仓库没有」的漂移，建议先 git push"
  fi
else
  echo "⚠️  当前分支没有上游分支"
fi

echo "== 3/6 构建 =="
export VUE_APP_COMMIT_SHA="$(git rev-parse --short HEAD)"
echo "commit: $VUE_APP_COMMIT_SHA"
npm run build

JS="$(basename "$(ls dist/js/app.*.js | head -1)")"
echo "产物: $JS"

echo "== 4/6 打包上传 =="
tar -czf /tmp/acmusic-deploy.tgz -C dist .
scp -q -i "$KEY" /tmp/acmusic-deploy.tgz "root@$HOST:/root/acmusic-deploy.tgz"

echo "== 5/6 服务器备份并解包 =="
ssh -i "$KEY" "root@$HOST" "set -e
  TS=\$(date +%Y%m%d-%H%M%S)
  cp -a $TARGET /root/music.www.bak.\$TS
  echo \"backup=/root/music.www.bak.\$TS\"
  rm -rf $TARGET/css $TARGET/js $TARGET/fonts $TARGET/img $TARGET/index.html $TARGET/favicon.ico
  tar -xzf /root/acmusic-deploy.tgz -C $TARGET
  chmod -R a+rX $TARGET
  rm -f /root/acmusic-deploy.tgz"

echo "== 6/6 线上校验 =="
CODE="$(curl -s -o /dev/null -w '%{http_code}' "$SITE/")"
echo "首页 HTTP $CODE"
[[ "$CODE" == "200" ]] || { echo "❌ 首页不可用"; exit 1; }

if ! curl -s "$SITE/" | grep -q "$JS"; then
  echo "❌ 线上 index.html 未引用 $JS，部署可能未生效"
  exit 1
fi

echo "✅ 已部署 $JS（commit $VUE_APP_COMMIT_SHA）"
