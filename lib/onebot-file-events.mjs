import { createHash, randomUUID } from 'node:crypto'
import { dockerOneBotSockets } from './docker-onebot.mjs'

export function fileEventMessage(event) {
  if (event.post_type === 'message' && Array.isArray(event.message) && event.message.some(p => p.type === 'file')) return { ...event }
  if (event.post_type !== 'notice' || !['group_upload', 'offline_file', 'private_upload'].includes(event.notice_type) || !event.file) return null
  const group = event.notice_type === 'group_upload', file = { ...event.file, file_id: event.file.file_id || event.file.id }
  if (!file.file_id) return null
  return {
    message_id: 'qq-file-' + createHash('sha256').update(JSON.stringify([event.self_id, group ? event.group_id : event.user_id, file.file_id])).digest('hex'),
    time: event.time, self_id: event.self_id, user_id: event.user_id, group_id: group ? event.group_id : undefined,
    message_type: group ? 'group' : 'private', message: [{ type: 'file', data: file }],
  }
}

export async function openOneBotSocket(url, signal, WebSocketImpl = globalThis.WebSocket) {
  signal.throwIfAborted()
  return new Promise((resolve, reject) => {
    const socket = new WebSocketImpl(url)
    const finish = error => {
      clearTimeout(timer); signal.removeEventListener('abort', cancel)
      socket.removeEventListener('open', opened); socket.removeEventListener('error', failed); socket.removeEventListener('close', failed)
      if (error) { socket.addEventListener('error', () => {}, { once: true }); socket.close(); reject(error) }
      else resolve(socket)
    }
    const opened = () => finish(), failed = () => finish(new Error('QQ 文件通道连接失败'))
    const cancel = () => finish(new Error('QQ 文件通道连接取消'))
    const timer = setTimeout(() => finish(new Error('QQ 文件通道连接超时')), 2000)
    socket.addEventListener('open', opened, { once: true }); socket.addEventListener('error', failed, { once: true }); socket.addEventListener('close', failed, { once: true })
    signal.addEventListener('abort', cancel, { once: true })
  })
}

export async function verifyOneBotSocket(socket, selfId, signal) {
  const echo = randomUUID()
  return new Promise((resolve, reject) => {
    const finish = error => {
      clearTimeout(timer); signal.removeEventListener('abort', failed)
      socket.removeEventListener('message', message); socket.removeEventListener('error', failed); socket.removeEventListener('close', failed)
      if (error) { socket.addEventListener('error', () => {}, { once: true }); socket.close(); reject(error) } else resolve()
    }
    const failed = () => finish(new Error('文件事件通道账号核验失败'))
    const message = event => {
      try {
        if (typeof event.data !== 'string' || event.data.length > 1024 * 1024) return
        const frame = JSON.parse(event.data)
        if (frame.echo === echo) finish(frame.status === 'ok' && String(frame.data?.user_id) === selfId ? null : new Error('文件事件通道账号不匹配'))
      } catch { failed() }
    }
    const timer = setTimeout(failed, 2000)
    socket.addEventListener('message', message); socket.addEventListener('error', failed); socket.addEventListener('close', failed); signal.addEventListener('abort', failed, { once: true })
    if (signal.aborted) return failed()
    socket.send(JSON.stringify({ action: 'get_login_info', params: {}, echo }))
  })
}

export function createFileEvents({ config, onWake = () => {}, WebSocketImpl = globalThis.WebSocket, discover = dockerOneBotSockets, log = () => {} }) {
  const queue = new Map()
  let key = '', next = 0, controller = null, socket = null, connecting = false, stopped = false, selfId = '', candidates = [], status = '未连接', socketsTask = null, identityReady = Promise.resolve(), identityDone = () => {}
  const close = () => { controller?.abort(); socket?.close(); socket = null; controller = null; status = '未连接' }
  const accept = event => {
    const cfg = config()
    if (!cfg.总开关 || !cfg.收文件 || String(event.self_id) !== selfId) return
    const message = fileEventMessage(event)
    if (!message || String(message.user_id) === selfId) return
    const type = message.group_id ? '群' : '私聊', chat = String(message.group_id || message.user_id)
    if (!cfg.绑定?.some(b => b.开 !== false && b.类型 === type && String(b.号码) === chat)) return
    const id = String(message.message_id)
    if (!queue.has(id)) {
      if (queue.size >= 128) queue.delete(queue.keys().next().value)
      queue.set(id, { message: { ...message, time: Number(message.time) || Math.floor(Date.now() / 1000), __文件事件: true }, seen: Date.now() }); onWake()
    }
  }
  const call = async (action, signal) => {
    const c = config(), r = await fetch(c.NapCat.replace(/\/$/, '') + '/' + action, {
      method: 'POST', headers: { 'content-type': 'application/json', ...(c.令牌 ? { authorization: 'Bearer ' + c.令牌 } : {}) },
      body: '{}', signal: AbortSignal.any([signal, AbortSignal.timeout(3000)]),
    })
    const value = await r.json(); return value.status === 'ok' ? value.data : null
  }
  const findSockets = async (c, signal) => {
    if (candidates.length) return
    if (socketsTask) return socketsTask
    socketsTask = (async () => {
      const make = (port, path) => {
        const u = new URL(c.NapCat); u.protocol = u.protocol === 'https:' ? 'wss:' : 'ws:'
        if (port) u.port = port
        u.pathname = path || u.pathname; u.search = ''; u.hash = ''
        if (c.令牌) u.searchParams.set('access_token', c.令牌)
        return u.href
      }
      const found = [make(null, null), make(null, '/ws')]
      try { found.push(...await discover(c, selfId)) } catch {}
      signal.throwIfAborted()
      const defaultPort = new URL(c.NapCat).port || (new URL(c.NapCat).protocol === 'https:' ? '443' : '80')
      if (Number(defaultPort) < 65535) found.push(make(String(Number(defaultPort) + 1), '/'))
      candidates = [...new Set(found)]
    })()
    try { await socketsTask } finally { socketsTask = null }
  }
  const connect = async () => {
    if (connecting || stopped || Date.now() < next) return
    connecting = true
    identityReady = new Promise(resolve => { identityDone = resolve })
    const own = new AbortController(); controller = own; next = Date.now() + 30000
    try {
      const version = await call('get_version_info', own.signal)
      if (!/napcat|snowluma/i.test(version?.app_name || '')) { status = '使用历史消息接收'; return }
      const login = await call('get_login_info', own.signal)
      if (!/^\d+$/.test(String(login?.user_id))) throw new Error('无法核验文件通道账号')
      own.signal.throwIfAborted(); selfId = String(login.user_id); identityDone()
      const c = config(), base = c.NapCat.replace(/\/$/, '')
      const timeout = new AbortController(), timer = setTimeout(() => timeout.abort(), 2000)
      try {
        const r = await fetch(base + '/_events', { headers: { accept: 'text/event-stream', ...(c.令牌 ? { authorization: 'Bearer ' + c.令牌 } : {}) }, signal: AbortSignal.any([own.signal, timeout.signal]) })
        if (r.ok && r.headers.get('content-type')?.includes('text/event-stream')) {
          clearTimeout(timer); status = 'SSE 已连接'
          let buffer = ''; const decoder = new TextDecoder()
          for await (const bytes of r.body) {
            buffer += decoder.decode(bytes, { stream: true })
            let split
            while ((split = /\r?\n\r?\n/.exec(buffer))) {
              const frame = buffer.slice(0, split.index); buffer = buffer.slice(split.index + split[0].length)
              if (frame.length > 1024 * 1024) throw new Error('文件事件过大')
              const text = frame.split(/\r?\n/).filter(x => x.startsWith('data:')).map(x => x.slice(5).trim()).join('\n')
              if (text) { try { accept(JSON.parse(text)) } catch {} }
            }
            if (buffer.length > 1024 * 1024) throw new Error('文件事件过大')
          }
          return
        }
        await r.body?.cancel()
      } catch (e) { if (own.signal.aborted) throw e } finally { clearTimeout(timer) }
      if (!WebSocketImpl) throw new Error('宿主缺少 WebSocket')
      await findSockets(c, own.signal)
      for (const url of candidates) {
        own.signal.throwIfAborted()
        try {
          const ws = await openOneBotSocket(url, own.signal, WebSocketImpl)
          await verifyOneBotSocket(ws, selfId, own.signal)
          if (own.signal.aborted) { ws.close(); return }
          socket = ws; status = 'WebSocket 已连接'
          ws.addEventListener('error', () => {})
          ws.addEventListener('message', e => { try { if (typeof e.data === 'string' && e.data.length <= 1024 * 1024) accept(JSON.parse(e.data)) } catch {} })
          ws.addEventListener('close', () => { if (socket === ws) { socket = null; status = '事件通道等待重连'; next = Date.now() + 5000 } })
          candidates = [url, ...candidates.filter(x => x !== url)]; return
        } catch {}
      }
      status = '历史接收可用，文件事件通道未连接'
    } catch { if (!own.signal.aborted) { status = '文件事件通道等待重试'; log(status) } }
    finally {
      identityDone(); connecting = false
      if (controller === own && !socket && status === 'SSE 已连接') status = '事件通道等待重连'
    }
  }
  return {
    tick() {
      const c = config(), fresh = JSON.stringify([c.NapCat, c.令牌, c.总开关, c.收文件, c.绑定?.map(b => [b.类型, b.号码, b.会话, b.开])])
      if (key !== fresh) { key = fresh; close(); queue.clear(); candidates = []; selfId = ''; next = 0 }
      if (!c.总开关 || !c.收文件) { status = '已关闭'; return }
      if (!socket && !connecting) void connect()
    },
    messages(binding, seen) {
      for (const [id, x] of queue) if (seen.has(x.message.message_id) || Date.now() - x.seen > 600000) queue.delete(id)
      return [...queue.values()].map(x => x.message).filter(m => binding.类型 === '群' ? String(m.group_id) === String(binding.号码) : !m.group_id && String(m.user_id) === String(binding.号码))
    },
    async candidates() { await identityReady; if (selfId && !candidates.length && controller && !controller.signal.aborted) await findSockets(config(), controller.signal); return candidates },
    status: () => status, identity: () => selfId,
    stop() { stopped = true; close(); queue.clear() },
  }
}
