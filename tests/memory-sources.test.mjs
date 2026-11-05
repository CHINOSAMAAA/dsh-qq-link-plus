import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { exclusiveBinding, recordSource, invalidateSource, historyMemoryTarget, bindingSource } from '../lib/memory-sources.mjs'
test('可信映射按机器人与聊天固定；歧义绑定拒绝，历史导入固定目标库', () => {
  const home = mkdtempSync(join(tmpdir(), 'qq-source-'))
  const row = { 类型: '群', 号码: '12345', 会话: 'session-A' }
  const config = { NapCat: 'http://fixture', 绑定: [row] }
  const source = recordSource(home, config, '99999', row, 'host-message', ['30001', '30002'])
  assert.equal(source.messageId, 'host-message'); assert.deepEqual(source.senders, ['30001', '30002'])
  assert.equal(historyMemoryTarget(home, config, row), 'qq_99999_shared')
  assert.throws(() => bindingSource(home, { ...row, 类型: '私聊' }), /独立会话/)
  recordSource(home, config, '99999', row, 'next-message', ['30003'])
  assert.equal(bindingSource(home, row).receipts.length, 2, '排队中的旧消息仍有桥内凭据')
  writeFileSync(join(home, 'fish-memory-config.json'), JSON.stringify({ qqIsolatedGroups: ['12345'] }))
  assert.equal(historyMemoryTarget(home, config, row), 'qq_99999_group_12345')
  assert.throws(() => recordSource(home, config, '88888', row, 'other-bot', ['30001']), /独立会话/)
  assert.throws(() => recordSource(home, config, '', row, 'unknown', []), /未知/)
  assert.equal(exclusiveBinding([row, { ...row, 号码: '54321' }], 'A'), null)
  assert.equal(exclusiveBinding([row, { ...row, 会话: 'B' }], 'A'), null)
  invalidateSource(home, 'A'); assert.throws(() => historyMemoryTarget(home, config, row), /核验/)
})
