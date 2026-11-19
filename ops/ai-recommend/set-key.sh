#!/usr/bin/env bash
# 写入 / 更新 DeepSeek API Key 并重启 AI 点歌服务。
#
# 为什么用脚本而不是让人直接 sed：
#   1) key 会留在 shell history 里 —— 这里用 read -s，输入不回显、不落盘；
#   2) 顺便把文件权限、字段完整性、重启和健康检查一次做完，不会出现
#      「改了 key 但忘了重启」或者「key 写对了但权限 644」这种半成品。
#
# 用法：sudo bash /opt/acmusic-ai/set-key.sh
set -euo pipefail

ENV_FILE=/etc/acmusic-ai.env

read -rsp "粘贴 DeepSeek API Key（输入不显示）: " KEY
echo
if [ -z "${KEY}" ]; then
    echo "没有输入内容，已取消。" >&2
    exit 1
fi

umask 077
# 只替换 DEEPSEEK_API_KEY 那一行，其余配置（白名单、日配额、端口）原样保留 ——
# 否则改一次 key 就把站长白名单清掉了
TMP_FILE="$(mktemp)"
if [ -f "${ENV_FILE}" ]; then
    grep -v '^DEEPSEEK_API_KEY=' "${ENV_FILE}" > "${TMP_FILE}" || true
fi
printf 'DEEPSEEK_API_KEY=%s\n' "${KEY}" >> "${TMP_FILE}"
mv "${TMP_FILE}" "${ENV_FILE}"
chmod 600 "${ENV_FILE}"
chown root:root "${ENV_FILE}"

systemctl restart acmusic-ai
sleep 1

echo "已写入 ${ENV_FILE}（600）并重启服务，当前状态："
curl -s --max-time 5 http://127.0.0.1:3002/health || true
echo
