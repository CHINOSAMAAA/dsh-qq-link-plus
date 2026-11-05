import { recordSource } from '../lib/memory-sources.mjs'
import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { Readable } from 'node:stream'
import { parseHistory, normalizeMessages, chunkMessages, fetchHistory, registerHistoryImport } from '../lib/history-import.mjs'

const onebot = (id, seq = id) => ({ message_id: String(id), message_seq: String(seq), time: 1793491200 + id,
  sender: { user_id: 12345, nickname: '小明' }, message: [{ type: 'text', data: { text: '消息 ' + id } }] })
const binding = { 类型: '私聊', 号码: '12345', 会话: 'session-X' }
const envelope = messages => ({ status: 'ok', retcode: 0, data: { messages } })

test('OneBot/QCE JSON 与 QQ TXT 保留时间、多人、多行和附件标记', () => {
  const a = parseHistory(JSON.stringify(envelope([onebot(2), onebot(1), onebot(1)])), 'history.json')
  assert.equal(a.duplicates, 1)
  assert.deepEqual(a.messages.map(m => m.text), ['消息 1', '消息 2'])
  const qce = { chatInfo: { type: 'private', peerUin: '12345' }, messages: [{ id: '9007199254740993',
    timestamp: 1793491200000, time: '2026-11-01 08:00:00', sender: { uin: '12345', name: '小明' },
    content: { text: '你好', elements: [{ type: 'text', data: { text: '你好\n第二行' } }, { type: 'image', data: { file: 'a.jpg' } }] } }] }
  const b = parseHistory('\uFEFF' + JSON.stringify(qce), 'qce.json')
  assert.equal(b.format, 'QCE JSON')
  assert.equal(b.messages[0].id, '9007199254740993')
  assert.match(b.messages[0].text, /你好\n第二行\[image a.jpg\]/)
  assert.equal(b.messages[0].senderId, '12345')
  const c = parseHistory('消息记录\r\n2026-11-01 08:00:00 小明(12345)\r\n你好\r\n第二行\r\n2026-11-01 08:01:00 小红(54321)\r\n早上好', 'qq.txt')
  assert.equal(c.messages.length, 2)
  assert.equal(c.messages[0].at, '2026-11-01T00:00:00.000Z')
  assert.match(c.messages[0].text, /你好\n第二行/)
  assert.equal(c.messages[1].senderId, '54321')
  assert.equal(normalizeMessages([{ ...onebot(1), message_id: undefined }, { ...onebot(1), message_id: undefined }]).messages.length, 2)
  assert.throws(() => parseHistory('{bad', 'bad.json'), /JSON 格式错误/)
  assert.throws(() => parseHistory('任意文章', 'bad.txt'), /未找到 QQ TXT/)
  assert.throws(() => normalizeMessages([{ text: 'test', time: 'bad-time' }]), /无法识别消息时间/)
})

test('超长单条逐段完整覆盖，包括末尾和 Unicode 表情', () => {
  const text = '开始' + '长消息🐟'.repeat(3000) + '最后一句不丢失'
  const chunks = chunkMessages([{ name: '小明', senderId: '12345', at: null, text }])
  assert.ok(chunks.length > 2)
  assert.ok(chunks.every(c => c.text.length <= 6000))
  const restored = chunks.map(c => c.text.replace(/^\[时间未知\] 小明\(12345\)：\n(?:\[接上一段\]\n)?/, '').slice(0, -1)).join('')
  assert.equal(restored, text)
  assert.ok(chunks.every(c => !/[\uD800-\uDBFF]$/.test(c.text.slice(0, -1))))
  assert.throws(() => chunkMessages([{ name: 'x'.repeat(5990), text: '🐟', senderId: '', at: null }]), /名称过长/)
})

test('分页读取使用反向游标并去掉边界重复，游标/后端错误不伪装成全量成功', async () => {
  const calls = []
  const result = await fetchHistory(async (action, body) => {
    calls.push({ action, body })
    return envelope(body.message_seq === '0' ? [onebot(4), onebot(3)] : body.message_seq === '3' ? [onebot(3), onebot(2)] : [])
  }, binding)
  assert.deepEqual(result.messages.map(m => m.id), ['2', '3', '4'])
  assert.match(result.warning, /空页/)
  assert.deepEqual(calls.map(x => x.body.message_seq), ['0', '3', '2'])
  assert.ok(calls.every(c => c.body.reverseOrder === true && c.body.user_id === '12345'))
  const stuck = await fetchHistory(async () => envelope([onebot(4)]), binding)
  assert.match(stuck.warning, /重复返回/)
  const noCursor = await fetchHistory(async () => envelope([{ ...onebot(4), message_seq: undefined }]), binding)
  assert.match(noCursor.warning, /缺少分页游标/)
  const limited = await fetchHistory(async () => envelope([onebot(4)]), binding, 1)
  assert.match(limited.warning, /上限/)
  await assert.rejects(fetchHistory(async () => ({ status: 'failed', message: 'denied' }), binding), /denied/)
})

async function request(handler, body = {}, extra = {}, chunks = null) {
  const req = Readable.from(chunks || [JSON.stringify(body)])
  req.method = 'POST'
  req.headers = { 'content-type': 'application/json', host: 'localhost:1234', ...extra }
  let code = 200, data
  await handler(req, { setHeader() {}, writeHead(c) { code = c }, end(text) { data = JSON.parse(text) } })
  return { ...data, httpStatus: code }
}

test('任务恢复、顺序承接、失败重试、写入确认与目标隔离（可对记忆 Plus 做契约检查）', async () => {
  const home = mkdtempSync(join(tmpdir(), 'qq-history-'))
  const oldHome = process.env.DSH_HOME
  process.env.DSH_HOME = home
  const routes = new Map(), prompts = [], effects = []
  let mode = 'ok', rejectManagement = false
  const agent = { session: { id: 'session-X', requestHeader: () => ({ config: { provider: 'deepseek', model: 'deepseek-chat' } }) } }
  const ctx = { effect(fn) { effects.push(fn()) }, on() { return () => {} }, interval() { return () => {} },
    get(name) { if (name === 'connection') return { requestRejection: () => rejectManagement ? 403 : undefined } },
    agents: { get: id => id === 'session-X' ? agent : null, list: () => [agent] },
    webServer: { register: ({ path, handler }) => { routes.set(path, handler); return () => {} } },
    llm: { async *stream(options) {
      prompts.push(options)
      const p = JSON.parse(options.messages[0].content[0].text)
      yield { type: 'text-delta', text: mode === 'bad-json' ? 'bad' : JSON.stringify({ summary: '已读到第' + p.segment + '段',
        memories: [{ text: `小明和小红在第${p.segment}段商量周末出游，带雨伞。`, at: null, importance: 0.5 }] }) }
      yield { type: 'finish', reason: { kind: mode === 'truncated' ? 'max-tokens' : 'stop' } }
    } } }
  writeFileSync(join(home, 'qq-bridge-config.json'), JSON.stringify({ 绑定: [binding] }))
  recordSource(home, { 绑定: [binding] }, '99999', binding, 'fixture-message', ['12345'])
  const mount = () => registerHistoryImport({ ctx, home, route: (path, handler) => routes.set(path, handler),
    config: () => ({ 绑定: [binding] }), findAgent: id => ctx.agents.get(id), headers: () => ({}) })
  const api = (path, body, headers) => request(routes.get('/dsh-qq-bridge/history/' + path), body, headers)
  try {
    mount()
    const content = JSON.stringify([{ ...onebot(1), message: [{ type: 'text', data: { text: '完整原文'.repeat(2500) } }] }])
    const input = { source: 'file', type: '私聊', number: '12345', session: 'session-X', filename: 'qq.json', content }
    assert.equal((await api('prepare', { ...input, session: 'session-Y' })).ok, false)
    assert.equal((await api('prepare', input, { origin: 'https://evil.example' })).ok, false)
    assert.equal((await api('prepare', input, { 'content-type': 'text/plain' })).ok, false)
    const prepared = await api('prepare', input), id = prepared.job.id
    assert.ok(prepared.job.total > 1)
    assert.deepEqual((await api('prepare', input)).job, prepared.job)
    const bytes = Buffer.from(JSON.stringify(input)), split = bytes.indexOf(Buffer.from('完整')) + 1
    const splitBody = await request(routes.get('/dsh-qq-bridge/history/prepare'), {}, {}, [bytes.subarray(0, split), bytes.subarray(split)])
    assert.equal(splitBody.job.id, id, 'HTTP 分包切在汉字中间也不能损坏原文')
    mode = 'truncated'
    assert.equal((await api('analyze', { id })).ok, false)
    mode = 'bad-json'
    assert.equal((await api('analyze', { id })).ok, false)
    mode = 'ok'
    const analysis = await api('analyze', { id }), before = prompts.length
    assert.equal(analysis.pending.index, 0)
    mount() // 模拟重启：持久化的模型结果不会重跑。
    assert.deepEqual((await api('analyze', { id })).pending, analysis.pending)
    assert.equal(prompts.length, before)
    assert.equal((await api('commit', { id, token: 'bad', result: { ok: true } })).ok, false)
    assert.equal((await api('commit', { id, token: analysis.pending.token, result: { ok: false } })).ok, false)
    let receipt = { ok: true, added: 1, batch: 'synthetic-batch' }
    if (process.env.FISH_MEMORY_SOURCE) {
      const memory = await import(pathToFileURL(resolve(process.env.FISH_MEMORY_SOURCE)).href)
      memory.apply(ctx)
      const apply = body => request(routes.get('/dsh-fish-memory/import/apply'), body)
      const body = { session: analysis.job.session, storeId: prepared.job.memoryStoreId, items: analysis.pending.items }
      receipt = await apply(body)
      assert.equal(receipt.ok, true)
      assert.equal(receipt.added, 1)
      assert.equal((await apply(body)).added, 0, '已写入后重试应去重')
      const stored = JSON.parse(readFileSync(join(home, 'fish-memory/' + prepared.job.memoryStoreId + '.json'), 'utf8'))
      assert.equal(stored.memories.length, 1)
      assert.equal(stored.memories[0].at, null)
      assert.match(stored.memories[0].source, /QQ历史\//)
      const deletion = await request(routes.get('/dsh-fish-memory/delete'), { session: 'session-X', storeId: prepared.job.memoryStoreId, id: stored.memories[0].id })
      assert.equal(deletion.ok, true)
      const reimport = await apply(body)
      assert.equal(reimport.added, 0)
      assert.equal(reimport.删过, 1, '重试不复活已经删除的记忆')
      rejectManagement = true
      assert.equal((await apply(body)).httpStatus, 403)
      rejectManagement = false
    }
    const committed = await api('commit', { id, token: analysis.pending.token, result: receipt })
    assert.equal(committed.job.completed, 1)
    await api('analyze', { id })
    const second = JSON.parse(prompts.at(-1).messages[0].content[0].text)
    assert.equal(second.previousSummary, analysis.pending.summary)
    assert.equal(second.segment, 2)
    assert.equal(prompts.at(-1).sessionId, 'session-X')
    assert.equal((await api('analyze', { id: '../../x' })).ok, false)
    assert.equal((await api('jobs')).jobs[0].completed, 1)
    let progress = (await api('analyze', { id }))
    while (!progress.done) {
      await api('commit', { id, token: progress.pending.token, result: { ok: true, added: 0 } })
      progress = await api('analyze', { id })
    }
    assert.equal(progress.job.completed, prepared.job.total)
    const count = prompts.length
    assert.equal((await api('analyze', { id })).done, true)
    assert.equal(prompts.length, count, '已经完成的任务不会再次调用模型')
    // 检查实际宿主接线，不能只在独立模块的假 route 上通过。
    const host = await import('../lib/host.js?history-contract')
    host.apply(ctx)
    rejectManagement = true
    const rejected = await request(routes.get('/dsh-qq-bridge/history/analyze'), { id })
    assert.equal(rejected.ok, false)
    assert.equal(rejected.说, 'management_forbidden')
  } finally {
    effects.reverse().forEach(fn => { if (typeof fn === 'function') fn() })
    if (oldHome === undefined) delete process.env.DSH_HOME; else process.env.DSH_HOME = oldHome
    rmSync(home, { recursive: true, force: true })
  }
})
