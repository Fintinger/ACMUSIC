#!/usr/bin/env node
/**
 * 从 git 历史生成 `docs/DEVLOG_COMMITS.md` —— 按年月分组的逐条提交清单。
 *
 * 定位：编年史 `docs/DEVLOG.md` 讲"阶段和意图"，本文件只回答"哪天提了什么"，
 * 两者不重复。文件是自动产物，不要手改；改了提交历史就重跑 `yarn devlog`。
 *
 * 为什么放文档而不是放进构建：提交清单对使用者没意义，只是开发时的考古工具，
 * 没必要进前端产物，也不该拖慢 build。
 *
 * 用法：`yarn devlog`（可选参数：`--limit 500` 限制条数）
 */
import { execFileSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(here, '..')
const outFile = path.join(root, 'docs', 'DEVLOG_COMMITS.md')

const FIELD = '\u001f' // 用不可见分隔符，避免提交信息里的 | 把字段切断

function git(args) {
    return execFileSync('git', args, { cwd: root, encoding: 'utf8', maxBuffer: 32 * 1024 * 1024 })
}

/** 标签 → 提交短 hash（annotated tag 取 peeled 的 *objectname） */
function readTags() {
    const map = new Map()
    let raw = ''
    try {
        raw = git(['for-each-ref', 'refs/tags', '--format=%(refname:short)' + FIELD + '%(objectname:short)' + FIELD + '%(*objectname:short)'])
    } catch (_) {
        return map
    }
    for (const line of raw.split(/\r?\n/)) {
        if (!line.trim()) continue
        const [name, objHash, peeled] = line.split(FIELD)
        const hash = peeled || objHash
        if (!hash) continue
        if (!map.has(hash)) map.set(hash, [])
        map.get(hash).push(name)
    }
    return map
}

function readCommits(limit) {
    const args = ['log', `--pretty=%ad${FIELD}%h${FIELD}%s`, '--date=short']
    if (limit) args.push(`-n${limit}`)
    return git(args)
        .split(/\r?\n/)
        .filter(Boolean)
        .map(line => {
            const [date, hash, subject] = line.split(FIELD)
            return { date, hash, subject }
        })
}

function main() {
    const limitArg = process.argv.indexOf('--limit')
    const limit = limitArg > -1 ? Number(process.argv[limitArg + 1]) || 0 : 0

    let commits = []
    try {
        commits = readCommits(limit)
    } catch (e) {
        console.warn('[devlog] 读取 git 历史失败，跳过生成：' + e.message)
        return
    }
    if (!commits.length) {
        console.warn('[devlog] 没有读到提交，跳过生成')
        return
    }

    const tags = readTags()
    const byMonth = new Map()
    for (const c of commits) {
        const month = c.date.slice(0, 7)
        if (!byMonth.has(month)) byMonth.set(month, [])
        byMonth.get(month).push(c)
    }

    const first = commits[commits.length - 1].date
    const last = commits[0].date
    const lines = [
        '# 提交清单（自动生成）',
        '',
        '> 由 `scripts/build-devlog.mjs` 从 git 历史生成，**请勿手改**。',
        '> 重新生成：`yarn devlog`。阶段与意图的叙述见 `docs/DEVLOG.md`。',
        '',
        `共 ${commits.length} 个提交，时间跨度 ${first} ~ ${last}。`,
        ''
    ]

    for (const month of [...byMonth.keys()].sort().reverse()) {
        const list = byMonth.get(month)
        lines.push(`## ${month}（${list.length} 个提交）`, '')
        for (const c of list) {
            const tag = tags.get(c.hash)
            const tagText = tag && tag.length ? ` 　\`${tag.join('` `')}\`` : ''
            lines.push(`- \`${c.hash}\` ${c.subject}${tagText}`)
        }
        lines.push('')
    }

    const allTags = [...tags.entries()]
        .flatMap(([hash, names]) => names.map(name => ({ name, hash })))
        .sort((a, b) => a.name.localeCompare(b.name))
    if (allTags.length) {
        lines.push('## 标签索引', '')
        for (const t of allTags) lines.push(`- \`${t.name}\` → \`${t.hash}\``)
        lines.push('')
    }

    fs.mkdirSync(path.dirname(outFile), { recursive: true })
    fs.writeFileSync(outFile, lines.join('\n'), 'utf8')
    console.log(`[devlog] 已生成 ${byMonth.size} 个月 / ${commits.length} 个提交 → docs/DEVLOG_COMMITS.md`)
}

main()
