#!/usr/bin/env node
/**
 * 停掉占用指定端口的 dev server 进程（默认 8080）。
 *
 * 背景：`vue-cli-service serve` 在端口被占用时会自动 +1（8080 → 8081 → 8082…），
 * 旧实例又不会自己退出，于是越开越多、端口越漂越远，还会跟 QQ 等无关进程的端口撞上。
 * 这里不做"猜"：只按监听端口精确定位 PID 再杀，不会碰其他进程。
 *
 * 用法：
 *   node scripts/dev-stop.js            # 清 8080
 *   node scripts/dev-stop.js 8081 8083  # 清多个
 */
const {execSync} = require('child_process')

function sh(cmd) {
    try {
        return execSync(cmd, {encoding: 'utf8', windowsHide: true, stdio: ['ignore', 'pipe', 'ignore']}) || ''
    } catch (e) {
        return (e.stdout || '') + ''
    }
}

/** 返回监听指定端口的 PID 列表 */
function listeners(port) {
    if (process.platform === 'win32') {
        const out = sh(`netstat -ano -p tcp`)
        return out.split(/\r?\n/)
            .filter(l => /\bLISTENING\b/.test(l))
            // 先 trim 再切列：netstat 每行前面有空格，不 trim 的话 [0] 是空串、列会整体错位
            .map(l => l.trim().split(/\s+/))
            // 第 2 列是本地地址（如 0.0.0.0:8080 / [::]:8080），必须正好以 :port 结尾
            .filter(cols => cols[1] && new RegExp(`[:.]${port}$`).test(cols[1]))
            .map(cols => cols[cols.length - 1])
            .filter(Boolean)
    }
    return sh(`lsof -ti tcp:${port} -sTCP:LISTEN`)
        .split(/\s+/).filter(Boolean)
}

const ports = process.argv.slice(2).map(Number).filter(Boolean)
if (!ports.length) ports.push(8080)

let total = 0
for (const port of ports) {
    const pids = [...new Set(listeners(port))]
    if (!pids.length) {
        console.log(`:${port} 没有监听进程`)
        continue
    }
    for (const pid of pids) {
        const cmd = process.platform === 'win32'
            ? sh(`taskkill /PID ${pid} /T /F`).trim()
            : (() => { sh(`kill -9 ${pid}`); return `killed ${pid}` })()
        console.log(`:${port} → PID ${pid} 已结束${cmd ? '' : '（可能已退出）'}`)
        total++
    }
}
console.log(total ? `共结束 ${total} 个进程` : '无需处理')
