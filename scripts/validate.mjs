#!/usr/bin/env node
/**
 * 广坊开发者名单校验器
 *
 * 本地与 GitHub Actions 共用（纯 Node，无第三方依赖）。
 *
 * 用法：
 *   node scripts/validate.mjs [--base origin/main] [--head HEAD] [--actor <github用户名>] [--json]
 *
 * 退出码：0 = 通过；1 = 未通过；2 = 参数/环境错误。
 *
 * 通过时向 stdout 输出（供 workflow 抓取）：
 *   @@OK
 *   @@NEW_NAME=<开发者名称>
 *   @@NEW_GITHUB=<github 用户名>
 *   欢迎 <开发者名称> 加入广坊开发组！
 */
import { execFileSync } from 'node:child_process'
import process from 'node:process'

const LIST_PATH = 'developers.json'
const FIELDS = ['name', 'github', 'joinedAt']
const NAME_RE = /^.{1,24}$/
// GitHub 用户名：字母/数字开头，允许中间出现连字符，总长 <= 39
const GITHUB_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,38})$/
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/

const PROTECTED_HINT = '本项目只允许修改 developers.json，其余文件均为受保护文件。'
const STATUS_LABEL = { A: '新增', M: '修改', D: '删除', R: '重命名', C: '复制', T: '类型变更' }

function die(msg) {
  console.error(msg)
  process.exit(2)
}

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }).replace(/\s+$/, '')
}

function parseArgs(argv) {
  const args = { base: 'origin/main', head: 'HEAD', actor: null, json: false }
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--base') args.base = argv[++i]
    else if (a === '--head') args.head = argv[++i]
    else if (a === '--actor') args.actor = argv[++i]
    else if (a === '--json') args.json = true
    else die(`未知参数：${a}`)
  }
  if (!args.base || !args.head) die('参数 --base / --head 需要一个值')
  return args
}

function isPlainObject(v) {
  return typeof v === 'object' && v !== null && !Array.isArray(v)
}

function describe(entry) {
  if (!isPlainObject(entry)) return JSON.stringify(entry)
  return entry.name || entry.github || JSON.stringify(entry)
}

/** 用于"是否同一条记录"的比较：三个字段按固定顺序序列化 */
function canonical(entry) {
  if (!isPlainObject(entry)) return JSON.stringify(entry)
  return JSON.stringify([entry.name, entry.github, entry.joinedAt])
}

function validateEntry(entry, index, seenGithub) {
  const where = `第 ${index + 1} 条记录`
  const errs = []
  if (!isPlainObject(entry)) {
    errs.push(`${where}必须是对象，例如 {"name":"张三","github":"zhangsan","joinedAt":"2026-10-10"}`)
    return errs
  }
  const keys = Object.keys(entry)
  const extra = keys.filter((k) => !FIELDS.includes(k))
  const missing = FIELDS.filter((k) => !keys.includes(k))
  if (extra.length) errs.push(`${where}含有多余字段：${extra.join('、')}（只允许 ${FIELDS.join('、')}）`)
  if (missing.length) errs.push(`${where}缺少字段：${missing.join('、')}`)

  if (typeof entry.name !== 'string' || !NAME_RE.test(entry.name) || entry.name !== entry.name.trim()) {
    errs.push(`${where}的 name 必须是 1–24 个字符、且首尾没有空格的字符串`)
  }
  if (typeof entry.github !== 'string' || !GITHUB_RE.test(entry.github)) {
    errs.push(`${where}的 github 必须是合法的 GitHub 用户名（字母/数字/连字符，不能以连字符开头）`)
  } else {
    const key = entry.github.toLowerCase()
    if (seenGithub.has(key)) errs.push(`${where}的 github「${entry.github}」与名单中已有的记录重复`)
    seenGithub.add(key)
  }
  if (
    typeof entry.joinedAt !== 'string' ||
    !DATE_RE.test(entry.joinedAt) ||
    Number.isNaN(Date.parse(entry.joinedAt))
  ) {
    errs.push(`${where}的 joinedAt 必须是 YYYY-MM-DD 格式的日期，例如 2026-10-10`)
  }
  return errs
}

function readListAt(ref) {
  try {
    return { text: git(['show', `${ref}:${LIST_PATH}`]) }
  } catch {
    return { missing: true }
  }
}

function parseList(text, label) {
  let data
  try {
    data = JSON.parse(text)
  } catch (e) {
    return { error: `${label} 不是合法的 JSON：${e.message}（常见原因：漏了逗号、用了中文引号、末尾多了逗号）` }
  }
  if (!Array.isArray(data)) return { error: `${label} 的顶层必须是数组 [ ... ]` }
  return { list: data }
}

function main() {
  const args = parseArgs(process.argv.slice(2))
  const errors = []
  const warnings = []

  // 1) 相对主分支的变更文件
  let mergeBase
  let diffOutput
  try {
    mergeBase = git(['merge-base', args.base, args.head])
    diffOutput = git(['diff', '--name-status', mergeBase, args.head])
  } catch (e) {
    die(`无法比较 ${args.base} 与 ${args.head}：${e.message}`)
  }

  const badPaths = []
  let listStatus = null
  for (const line of diffOutput ? diffOutput.split('\n') : []) {
    const parts = line.split('\t')
    const status = parts[0]
    for (const p of parts.slice(1)) {
      if (p === LIST_PATH) listStatus = status
      else badPaths.push(`${p}（${STATUS_LABEL[status[0]] || status}）`)
    }
  }

  if (badPaths.length) {
    errors.push(`检测到被改动的受保护文件：\n    - ${badPaths.join('\n    - ')}\n  ${PROTECTED_HINT}`)
  }
  if (!listStatus) {
    errors.push(`没有检测到对 ${LIST_PATH} 的改动。请把你自己的那一条记录追加进去。`)
  } else if (listStatus[0] === 'D') {
    errors.push(`${LIST_PATH} 不能被删除。`)
  }

  // 2) 名单内容
  const baseRead = readListAt(mergeBase)
  let baseList = []
  if (baseRead.missing) {
    warnings.push(`主分支上原本没有 ${LIST_PATH}。`)
  } else {
    const parsed = parseList(baseRead.text, `主分支的 ${LIST_PATH}`)
    if (parsed.error) errors.push(parsed.error)
    else baseList = parsed.list
  }

  const headRead = readListAt(args.head)
  let headList = null
  if (headRead.missing) {
    errors.push(`你的分支上找不到 ${LIST_PATH}，不能删除该文件。`)
  } else {
    const parsed = parseList(headRead.text, `你的 ${LIST_PATH}`)
    if (parsed.error) errors.push(parsed.error)
    else headList = parsed.list
  }

  let newEntries = []
  if (headList) {
    if (headList.length === 0) errors.push(`${LIST_PATH} 不能为空，请保留已有记录。`)
    const seen = new Set()
    headList.forEach((entry, i) => validateEntry(entry, i, seen).forEach((m) => errors.push(m)))

    // 3) 只增不改不删
    const baseKeys = baseList.map(canonical)
    const headKeys = headList.map(canonical)
    const removed = baseList.filter((entry, i) => !headKeys.includes(baseKeys[i]))
    newEntries = headList.filter((entry, i) => !baseKeys.includes(headKeys[i]))

    if (removed.length) {
      errors.push(`不能删除或修改已有的开发者记录：${removed.map(describe).join('、')}`)
    }
    if (newEntries.length === 0) {
      errors.push('没有新增开发者记录。你需要追加你自己的一条记录。')
    } else if (newEntries.length > 1) {
      errors.push(`一次只能新增一条记录（你自己），当前新增了 ${newEntries.length} 条。`)
    }

    // 4) 只能加自己
    if (newEntries.length === 1 && args.actor) {
      const g = String(newEntries[0].github ?? '')
      if (g.toLowerCase() !== args.actor.toLowerCase()) {
        errors.push(
          `新增记录的 github 必须是你自己的 GitHub 用户名。\n    当前推送者：${args.actor}\n    记录中的 github：${g || '(空)'}`,
        )
      }
    }
  }

  // 5) 分支名建议（仅提示，不阻断）
  try {
    const branch = git(['rev-parse', '--abbrev-ref', args.head])
    if (branch && branch !== 'HEAD' && !branch.startsWith('join/')) {
      warnings.push(`建议使用 join/<你的GitHub用户名> 作为分支名（当前分支：${branch}）`)
    }
  } catch {
    /* 忽略 */
  }

  const ok = errors.length === 0
  const newEntry = newEntries.length === 1 && isPlainObject(newEntries[0]) ? newEntries[0] : null

  const lines = []
  if (ok) {
    lines.push('@@OK')
    lines.push(`@@NEW_NAME=${newEntry.name}`)
    lines.push(`@@NEW_GITHUB=${newEntry.github}`)
    lines.push('')
    lines.push(`🎉 欢迎 ${newEntry.name} 加入广坊开发组！`)
    for (const w of warnings) lines.push(`提示：${w}`)
    lines.push('')
    lines.push('校验通过，即将自动合并到主分支……')
  } else {
    lines.push('@@FAIL')
    lines.push('')
    lines.push(`❌ 校验未通过（共 ${errors.length} 个问题）：`)
    errors.forEach((e, i) => lines.push(`${i + 1}. ${e}`))
    lines.push('')
    lines.push('如何修复：')
    lines.push('- 只修改 developers.json，不要动其它任何文件；')
    lines.push('- 确保 JSON 合法，并且只追加你自己的一条记录；')
    lines.push('- 记录格式：{"name":"你的昵称","github":"你的GitHub用户名","joinedAt":"YYYY-MM-DD"}；')
    lines.push('- 改好后重新提交，并 push 到你的分支即可。')
  }

  console.log(lines.join('\n'))
  if (args.json) {
    console.log('@@JSON=' + JSON.stringify({ ok, errors, warnings, newEntry }))
  }
  process.exit(ok ? 0 : 1)
}

main()