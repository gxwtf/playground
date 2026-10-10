#!/usr/bin/env node
/**
 * 启用仓库内的 Git 钩子（.githooks/），从而强制"只能用 SSH 推送"。
 * 由 package.json 的 prepare 脚本在 `npm install` 后自动执行。
 *
 * 只写入本地 core.hooksPath，不影响全局配置；不在 git 仓库中时静默跳过。
 */
import { execFileSync } from 'node:child_process'
import process from 'node:process'

function git(args) {
  return execFileSync('git', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] })
}

try {
  git(['rev-parse', '--git-dir'])
} catch {
  process.exit(0) // 不在 git 仓库里，跳过
}

try {
  git(['config', 'core.hooksPath', '.githooks'])
  console.log('已启用仓库内 Git 钩子：core.hooksPath=.githooks（只允许 SSH 推送）')
} catch (e) {
  console.warn('启用 Git 钩子失败（不影响其它功能）：' + e.message)
}
process.exit(0)