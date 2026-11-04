import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { cmpVer, createSelfUpdate } from '../lib/selfupdate.mjs'

test('修订号按 SemVer 顺序比较，忽略构建元数据', () => {
  const versions = ['1.5.1-alpha', '1.5.1-alpha.1', '1.5.1-alpha.beta', '1.5.1-beta', '1.5.1-beta.2', '1.5.1-beta.11', '1.5.1-rc.1', '1.5.1']
  for (let i = 1; i < versions.length; i++) {
    assert.equal(cmpVer(versions[i], versions[i - 1]), 1)
    assert.equal(cmpVer(versions[i - 1], versions[i]), -1)
  }
  assert.equal(cmpVer('1.5.1-10', '1.5.1-9'), 1)
  assert.equal(cmpVer('1.5.1-2+build.1', 'v1.5.1-2+build.99'), 0)
  assert.equal(cmpVer('1.5.2-1', '1.5.1-99'), 1)
})

test('仅检查 Plus main，支持缓存和刷新；安装不沿用旧仓库或固定提交', async () => {
  const home = mkdtempSync(join(tmpdir(), 'qq-update-'))
  const originalHome = process.env.DSH_HOME, originalFetch = globalThis.fetch
  try {
    process.env.DSH_HOME = home
    const root = join(home, 'node_modules', 'dsh-qq-link-plus')
    mkdirSync(root, { recursive: true })
    writeFileSync(join(root, 'package.json'), JSON.stringify({ name: 'dsh-qq-link-plus', version: '1.5.1-9',
      repository: { url: 'git+https://github.com/CHINOSAMAAA/dsh-qq-link-plus.git' } }))
    const profile = join(home, 'profiles', 'desktop')
    mkdirSync(profile, { recursive: true })
    writeFileSync(join(profile, 'package.json'), JSON.stringify({ dependencies: {
      'dsh-qq-link-plus': 'github:Yuuyuko-uu/dsh-qq-link#old-commit',
    } }))
    const urls = []
    globalThis.fetch = async url => {
      urls.push(url)
      return { ok: true, json: async () => ({ version: '1.5.1-10' }) }
    }
    const updater = createSelfUpdate({ packageRoot: root })
    const result = await updater.check(true)
    assert.equal(result.hasUpdate, true)
    assert.equal(result.repoUrl, 'https://github.com/CHINOSAMAAA/dsh-qq-link-plus')
    assert.equal(result.from, 'GitHub')
    assert.deepEqual(urls, ['https://raw.githubusercontent.com/CHINOSAMAAA/dsh-qq-link-plus/main/package.json'])
    assert.equal((await updater.check(false)).cached, true)
    assert.equal(urls.length, 1)
    await updater.check(true)
    assert.equal(urls.length, 2)
    const installed = []
    const ctx = { pluginManager: { installBundle: async spec => { installed.push(spec); return { applied: true } } } }
    assert.equal((await updater.install(ctx)).ok, true)
    assert.deepEqual(installed, ['github:CHINOSAMAAA/dsh-qq-link-plus#main'])
    globalThis.fetch = async () => ({ ok: false, status: 503 })
    const failed = await updater.check(true)
    assert.equal(failed.ok, false)
    assert.equal(failed.latest, null)
    assert.match(failed.error, /503/)
    const devRoot = join(home, 'dev-copy')
    mkdirSync(devRoot)
    writeFileSync(join(devRoot, 'package.json'), JSON.stringify({ name: 'dsh-qq-link-plus' }))
    assert.equal((await createSelfUpdate({ packageRoot: devRoot }).install(ctx)).ok, false)
    assert.equal(installed.length, 1)
  } finally {
    globalThis.fetch = originalFetch
    if (originalHome === undefined) delete process.env.DSH_HOME
    else process.env.DSH_HOME = originalHome
    rmSync(home, { recursive: true, force: true })
  }
})
