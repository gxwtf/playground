// 广坊开发组已认证开发者名单：读取并渲染 developers.json
const NEW_MEMBER_DAYS = 7

const escapeHtml = (value) =>
  String(value).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]))

const daysSince = (dateStr) => {
  const t = Date.parse(dateStr)
  return Number.isNaN(t) ? Infinity : (Date.now() - t) / 86400000
}

async function loadDevelopers() {
  const res = await fetch('./developers.json', { cache: 'no-store' })
  if (!res.ok) throw new Error(`请求 developers.json 失败（HTTP ${res.status}）`)
  const data = await res.json()
  if (!Array.isArray(data)) throw new Error('developers.json 的顶层应该是数组')
  return data
    .filter((d) => d && d.name && d.github)
    .sort(
      (a, b) =>
        String(a.joinedAt || '').localeCompare(String(b.joinedAt || '')) ||
        String(a.name).localeCompare(String(b.name)),
    )
}

function renderWelcome(list) {
  const latest = list[list.length - 1]
  if (!latest) return
  const el = document.getElementById('welcome')
  const isNew = daysSince(latest.joinedAt) <= NEW_MEMBER_DAYS
  el.querySelector('.welcome-text').textContent = isNew
    ? `🎉 欢迎 ${latest.name} 加入广坊开发组！`
    : `最新成员：${latest.name}`
  el.hidden = false
}

function renderList(list) {
  const listEl = document.getElementById('list')
  document.getElementById('count').textContent = `共 ${list.length} 位`

  if (list.length === 0) {
    document.getElementById('empty').hidden = false
    return
  }

  listEl.innerHTML = list
    .map((dev) => {
      const initial = escapeHtml(String(dev.name).trim().charAt(0).toUpperCase())
      const badge = daysSince(dev.joinedAt) <= NEW_MEMBER_DAYS ? '<span class="badge">新成员</span>' : ''
      const href = `https://github.com/${encodeURIComponent(dev.github)}`
      return `<li class="item">
        <span class="avatar">${initial}</span>
        <span class="meta">
          <span class="name">${escapeHtml(dev.name)}${badge}</span>
          <a class="gh" href="${href}" target="_blank" rel="noopener">@${escapeHtml(dev.github)}</a>
        </span>
        <time class="date">${escapeHtml(dev.joinedAt || '')}</time>
      </li>`
    })
    .join('')
}

async function main() {
  try {
    const list = await loadDevelopers()
    renderWelcome(list)
    renderList(list)
  } catch (err) {
    document.getElementById('count').textContent = ''
    const el = document.getElementById('error')
    el.textContent = `名单加载失败：${err.message}`
    el.hidden = false
  }
}

main()