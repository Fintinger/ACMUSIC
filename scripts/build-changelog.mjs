#!/usr/bin/env node
/**
 * 从仓库根目录的 CHANGELOG.md 生成前端可用的 `src/data/changelog.generated.js`。
 *
 * 为什么要有这一步：更新日志的"人读版本"必须是 Markdown（GitHub 上直接看、发版时手写），
 * 但 Vue 组件不能直接 import .md（项目里没有 raw-loader，也不想为一条日志加依赖）。
 * 所以约定一份严格但极简的格式，构建前转成一个普通 ES 模块：
 *
 *   ## 1.1.0 — 2026-11-05
 *   ### 新增
 *   - 某某功能
 *
 * 只认 `##` / `###` / `- ` 三级，其余（标题、引言、空行、代码块）一律忽略，
 * 解析失败也不会让构建挂掉 —— 日志是附属功能，不能拖累发布。
 *
 * 触发时机：`yarn build`（prebuild）、`yarn serve`（preserve），也可手动 `yarn changelog`。
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const srcFile = path.join(root, 'CHANGELOG.md')
const outFile = path.join(root, 'src', 'data', 'changelog.generated.js')

/** 解析 markdown → [{ version, date, sections: [{ title, items }] }] */
function parse(md) {
    const entries = []
    let entry = null
    let section = null

    for (const raw of md.split(/\r?\n/)) {
        const line = raw.trim()

        // ## 1.1.0 — 2026-11-05（首发）   /   ## v1.1.0 - 2026-11-05
        const head = line.match(/^##\s+v?(\d+\.\d+(?:\.\d+)?)\s*[—–-]\s*(.+)$/)
        if (head) {
            entry = { version: head[1], date: head[2].trim(), sections: [] }
            entries.push(entry)
            section = null
            continue
        }
        if (!entry) continue

        const sec = line.match(/^###\s+(.+)$/)
        if (sec) {
            section = { title: sec[1].trim(), items: [] }
            entry.sections.push(section)
            continue
        }
        if (!section) continue

        const item = line.match(/^[-*]\s+(.+)$/)
        if (item) section.items.push(item[1].trim())
    }

    // 没有条目的版本（只写了标题）就不要了，避免弹窗里出现空壳
    return entries.filter(e => e.sections.some(s => s.items.length))
}

function main() {
    let md = ''
    try {
        md = fs.readFileSync(srcFile, 'utf8')
    } catch (e) {
        console.warn('[changelog] 读不到 CHANGELOG.md，跳过生成')
        return
    }

    const entries = parse(md)
    if (!entries.length) {
        console.warn('[changelog] CHANGELOG.md 里没有解析到版本条目，跳过生成')
        return
    }

    const body = JSON.stringify(entries, null, 4)
    const code = `// 该文件由 scripts/build-changelog.mjs 从 CHANGELOG.md 生成，请勿手改。
// 改内容请编辑仓库根目录的 CHANGELOG.md，然后跑 yarn changelog（build/serve 会自动跑）。
export default ${body}
`
    fs.mkdirSync(path.dirname(outFile), { recursive: true })
    fs.writeFileSync(outFile, code, 'utf8')
    console.log(`[changelog] 已生成 ${entries.length} 个版本 → src/data/changelog.generated.js`)
}

main()
