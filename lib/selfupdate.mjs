// Plus 更新仅追踪 package.json 中 repository 对应仓库的 main 分支。
// 检测失败如实报告；本地开发副本禁止自动安装，避免覆盖工作目录。
import { readFileSync } from 'node:fs'
import { join } from 'node:path'

const TTL = 6 * 3600 * 1000
const TIMEOUT = 8000

function parseVer(v) {
  const s = String(v || '').trim().replace(/^v/i, '').split('+')[0]
  const cut = s.indexOf('-')
  const core = cut >= 0 ? s.slice(0, cut) : s
  const pre = cut >= 0 ? s.slice(cut + 1) : ''
  const nums = core.split('.').map((x) => Number(x) || 0)
  return { nums: [nums[0] || 0, nums[1] || 0, nums[2] || 0], pre }
}

// 1.2.3 / v1.2.3 / 1.2.3-beta.1 都认
export function cmpVer(a, b) {
  const x = parseVer(a)
  const y = parseVer(b)
  for (let i = 0; i < 3; i++) {
    if (x.nums[i] !== y.nums[i]) return x.nums[i] > y.nums[i] ? 1 : -1
  }
  if (x.pre === y.pre) return 0
  if (!x.pre) return 1   // 正式版比预发布新
  if (!y.pre) return -1
  const left = x.pre.split('.'), right = y.pre.split('.')
  for (let i = 0; i < Math.max(left.length, right.length); i++) {
    if (left[i] === undefined) return -1
    if (right[i] === undefined) return 1
    if (left[i] === right[i]) continue
    const aNum = /^\d+$/.test(left[i]), bNum = /^\d+$/.test(right[i])
    if (aNum && bNum) return BigInt(left[i]) > BigInt(right[i]) ? 1 : -1
    if (aNum !== bNum) return aNum ? -1 : 1
    return left[i] > right[i] ? 1 : -1
  }
  return 0
}

// main 分支是唯一更新来源，不使用 CDN 缓存或 npm 版本。
function sources(repo) {
  const m = /github\.com[/:]([^/]+)\/([^/#?]+)/i.exec(String(repo || ''))
  if (!m) return []
  return [{ url: `https://raw.githubusercontent.com/${m[1]}/${m[2].replace(/\.git$/i, '')}/main/package.json`, from: 'GitHub' }]
}

export function createSelfUpdate({ packageRoot, diag }) {
  const noop = () => {}
  const log = typeof diag === 'function' ? diag : noop

  let meta = {}
  try {
    meta = JSON.parse(readFileSync(join(packageRoot, 'package.json'), 'utf8'))
  } catch (e) {
    log('读自己的 package.json 失败：' + (e && e.message))
  }

  const current = String(meta.version || '')
  const repo = String(
    (meta.repository && (meta.repository.url || meta.repository)) || meta.homepage || ''
  )
  const repoUrl = repo
    .replace(/^git\+/, '')
    .replace(/^git:/, 'https:')
    .replace(/\.git$/, '')
    .replace(/#readme$/i, '')

  // 装在自己的 node_modules 里 = 正常安装；不在 = 本地 link 的开发副本
  const 是开发副本 = !/[\\/]node_modules[\\/]/.test(String(packageRoot))

  let cache = null

  async function fetchLatest() {
    const list = sources(repo)
    if (!list.length) return { latest: null, error: '未配置 GitHub 仓库地址，无法检查更新' }
    const 结果 = await Promise.all(list.map(async (s) => {
      try {
        const res = await fetch(s.url, {
          signal: AbortSignal.timeout(TIMEOUT),
          headers: { accept: 'application/json', 'user-agent': 'dsh-plugin-selfupdate' },
        })
        if (!res.ok) return { err: s.from + ' HTTP ' + res.status }
        const j = await res.json()
        const v = String((j && j.version) || '')
        if (!v) return { err: s.from + ' 没有 version' }
        return { v, from: s.from }
      } catch (e) {
        return { err: s.from + ' ' + String((e && e.message) || e) }
      }
    }))
    let best = null
    let bestFrom = null
    for (const r of 结果) {
      if (!r.v) continue
      if (best === null || cmpVer(r.v, best) > 0) { best = r.v; bestFrom = r.from }
    }
    if (best === null) {
      return { latest: null, error: 结果.map((r) => r.err).filter(Boolean).join(' · ') || '查询失败' }
    }
    return { latest: best, from: bestFrom }
  }

  async function check(force) {
    if (!force && cache && Date.now() - cache.checkedAt < TTL) return { ...cache, cached: true }
    const r = await fetchLatest()
    const hasUpdate = Boolean(r.latest && current && cmpVer(r.latest, current) > 0)
    cache = {
      ok: Boolean(r.latest),
      current,
      latest: r.latest || null,
      hasUpdate,
      // 本机比仓库还新 —— 自己改过还没推，正常
      ahead: Boolean(r.latest && current && cmpVer(r.latest, current) < 0),
      error: r.error || null,
      from: r.from || null,
      repoUrl: repoUrl || null,
      devCopy: 是开发副本,
      canInstall: !是开发副本,
      checkedAt: Date.now(),
    }
    log('查更新：当前 ' + current + ' / 最新 ' + (r.latest || '查不到') + (r.from ? '（' + r.from + '）' : '') + (r.error ? '（' + r.error + '）' : ''))
    return cache
  }

  // 始终安装本仓库 main，避免沿用旧仓库、固定提交或本地归档地址。
  function 取安装来源() {
    const m = /github\.com[/:]([^/]+)\/([^/#?]+)/i.exec(repoUrl)
    return m ? 'github:' + m[1] + '/' + m[2].replace(/\.git$/i, '') + '#main' : ''
  }

  async function install(ctx) {
    if (是开发副本) {
      return { ok: false, error: '这是本地开发副本（link: 进来的），一键更新会把你正在改的目录换成仓库里的版本 —— 要更新请在仓库里 git pull' }
    }
    const pm = ctx && ctx.pluginManager
    if (!pm || typeof pm.installBundle !== 'function') {
      return { ok: false, error: '这版 DSH 没有插件管理接口，装不了；请手动更新' }
    }
    const spec = 取安装来源()
    if (!spec) return { ok: false, error: '不知道该从哪儿装（既没有仓库地址，也没记录安装来源）' }
    try {
      log('一键更新：开始装 ' + spec)
      const r = await pm.installBundle(spec)
      log('一键更新：' + JSON.stringify(r && (r.applied ?? r.application ?? r.reason ?? r)))
      return { ok: true, spec, result: r || null }
    } catch (e) {
      log('一键更新失败：' + String((e && e.message) || e))
      return { ok: false, spec, error: String((e && e.message) || e) }
    }
  }

  function register(ctx, route) {
    const send = (res, code, obj) => {
      res.writeHead(code, { 'content-type': 'application/json; charset=utf-8', 'cache-control': 'no-store' })
      res.end(JSON.stringify(obj))
    }
    try {
      ctx.effect(() => ctx.webServer.register({
        kind: 'exact',
        path: route + '/update',
        handler: async (req, res) => {
          try {
            const url = new URL(req.url, 'http://127.0.0.1')
            const force = url.searchParams.get('refresh') === '1'
            send(res, 200, { ok: true, ...(await check(force)) })
          } catch (e) {
            log('查更新路由失败：' + (e && e.message))
            send(res, 200, { ok: false, current, latest: null, error: String((e && e.message) || e) })
          }
        },
      }))
      // ⭐ 一键更新：POST。装完的结果原样带回去（可能要重启才生效）
      ctx.effect(() => ctx.webServer.register({
        kind: 'exact',
        path: route + '/install',
        handler: async (req, res) => {
          if (req.method !== 'POST') { send(res, 405, { ok: false, error: '只接受 POST' }); return }
          try {
            const r = await install(ctx)
            send(res, 200, r)
          } catch (e) {
            log('一键更新路由失败：' + (e && e.message))
            send(res, 200, { ok: false, error: String((e && e.message) || e) })
          }
        },
      }))
    } catch (e) {
      log('查更新路由注册失败：' + (e && e.message))
    }
  }

  return { current, repo, repoUrl, check, install, register }
}
