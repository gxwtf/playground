#!/usr/bin/env node
/**
 * 本地静态预览服务器（仅用于调试页面，不参与部署）。
 *   node scripts/preview.mjs     -> http://localhost:5173
 */
import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { extname, join, normalize } from 'node:path'
import process from 'node:process'

const root = process.cwd()
const port = Number(process.env.PORT || 5173)

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.png': 'image/png',
}

createServer(async (req, res) => {
  try {
    let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
    if (pathname === '/' || pathname.endsWith('/')) pathname += 'index.html'
    // 去掉任何试图向上跳出的路径
    const safe = normalize(pathname).replace(/^(\.\.[/\\])+/, '')
    const file = join(root, safe)
    const data = await readFile(file)
    res.writeHead(200, {
      'Content-Type': TYPES[extname(file)] || 'application/octet-stream',
      'Cache-Control': 'no-store',
    })
    res.end(data)
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' })
    res.end('404 Not Found')
  }
}).listen(port, () => {
  console.log(`预览已启动： http://localhost:${port}`)
})