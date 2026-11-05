import { createHash } from 'node:crypto'
import { writeFileAtomicSync } from './atomic-file.mjs'
import { readFileSync, mkdirSync } from 'node:fs'
import { join } from 'node:path'

export const sessionKey = value => String(value || '').replace(/^session-/, '')
export const endpointKey = config => createHash('sha256').update(JSON.stringify([config.NapCat, config.令牌 || ''])).digest('hex')
export function exclusiveBinding(bindings, sid) {
  const rows = (bindings || []).filter(b => sessionKey(b.会话) === sessionKey(sid))
  if (rows.length !== 1) return null
  const row = rows[0]
  return row.开 !== false && (bindings || []).filter(b => b.类型 === row.类型 && String(b.号码) === String(row.号码)).length === 1 ? row : null
}

// 只有桥内已核验的 OneBot 轮询调用此函数；HTTP receive/notice 和模型工具没有写入入口。
export function recordSource(home, config, botId, row, messageId, senders) {
  if (!/^\d+$/.test(String(botId)) || !/^\d+$/.test(String(row.号码)) || !exclusiveBinding(config.绑定, row.会话)) throw new Error('QQ 绑定不独占或机器人账号未知')
  const path = join(home, 'qq-bridge-memory-sources.json')
  let registry = { version: 1, sessions: {} }
  try { registry = JSON.parse(readFileSync(path, 'utf8')) } catch (e) { if (e.code !== 'ENOENT') throw e }
  const sid = sessionKey(row.会话)
  const identity = { botId: String(botId), type: row.类型, chatId: String(row.号码), endpoint: endpointKey(config) }
  const old = registry.sessions[sid]
  if (old && ['botId', 'type', 'chatId'].some(k => old[k] !== identity[k])) throw new Error('此会话曾绑定其他 QQ 来源，请为新聊天创建独立会话')
  const senderIds = [...new Set(senders.map(String).filter(x => /^\d+$/.test(x)))]
  const receipts = [...(old?.receipts || []).filter(r => r.id !== messageId), { id: messageId, senders: senderIds }].slice(-100)
  registry.sessions[sid] = { ...identity, sessionId: String(row.会话), messageId, senders: senderIds, receipts }
  mkdirSync(home, { recursive: true })
  writeFileAtomicSync(path, JSON.stringify(registry, null, 2))
  return registry.sessions[sid]
}

export function invalidateSource(home, sid) {
  const path = join(home, 'qq-bridge-memory-sources.json')
  let registry
  try { registry = JSON.parse(readFileSync(path, 'utf8')) } catch (e) { if (e.code === 'ENOENT') return; throw e }
  const entry = registry.sessions[sessionKey(sid)]
  if (!entry) return
  entry.unverified = true
  entry.messageId = ''
  entry.receipts = []
  writeFileAtomicSync(path, JSON.stringify(registry, null, 2))
}
export function historyMemoryTarget(home, config, row) {
  const registry = JSON.parse(readFileSync(join(home, 'qq-bridge-memory-sources.json'), 'utf8'))
  const source = registry.sessions[sessionKey(row.会话)]
  if (!source || source.unverified || source.endpoint !== endpointKey(config) || source.type !== row.类型 || source.chatId !== String(row.号码) || !exclusiveBinding(config.绑定, row.会话)) throw new Error('请先由实时 QQ 轮询核验此聊天的独占绑定与机器人账号')
  let settings = {}
  try { settings = JSON.parse(readFileSync(join(home, 'fish-memory-config.json'), 'utf8')) } catch (e) { if (e.code !== 'ENOENT') throw e }
  return row.类型 === '私聊' ? `qq_${source.botId}_private_${row.号码}` : (settings.qqIsolatedGroups || []).includes(String(row.号码)) ? `qq_${source.botId}_group_${row.号码}` : `qq_${source.botId}_shared`
}

export function bindingSource(home, row) {
  let registry
  try { registry = JSON.parse(readFileSync(join(home, 'qq-bridge-memory-sources.json'), 'utf8')) } catch (e) { if (e.code === 'ENOENT') return null; throw e }
  const source = registry.sessions[sessionKey(row.会话)]
  if (source && (source.type !== row.类型 || source.chatId !== String(row.号码))) throw new Error('此会话曾绑定其他聊天，请创建独立会话')
  return source || null
}
