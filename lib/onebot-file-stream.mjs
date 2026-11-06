import { randomUUID } from 'node:crypto'
import { openOneBotSocket, verifyOneBotSocket } from './onebot-file-events.mjs'

const parse = text => { try { return JSON.parse(text) } catch { throw new Error('QQ 文件流格式无效') } }

// Both backends delimit streamed HTTP action responses with blank lines; the terminal frame may lack a delimiter.
async function* httpFrames(config, params, signal) {
  const response = await fetch(config.NapCat.replace(/\/$/, '') + '/download_file_stream', {
    method: 'POST', headers: { 'content-type': 'application/json', ...(config.令牌 ? { authorization: 'Bearer ' + config.令牌 } : {}) },
    body: JSON.stringify(params), signal,
  })
  if (!response.ok) { await response.body?.cancel(); throw new Error('QQ 后端流下载接口不可用') }
  let buffer = ''; const decoder = new TextDecoder()
  for await (const bytes of response.body) {
    buffer += decoder.decode(bytes, { stream: true })
    let split
    while ((split = /\r?\n\r?\n/.exec(buffer))) {
      const frame = buffer.slice(0, split.index).trim(); buffer = buffer.slice(split.index + split[0].length)
      if (frame.length > 512 * 1024) throw new Error('QQ 文件分块过大')
      if (frame) yield parse(frame)
    }
    if (buffer.length > 512 * 1024) throw new Error('QQ 文件分块过大')
  }
  buffer += decoder.decode()
  if (buffer.trim()) yield parse(buffer)
}

async function* socketFrames(url, params, signal, botId) {
  const socket = await openOneBotSocket(url, signal), echo = randomUUID(), queue = []
  await verifyOneBotSocket(socket, botId, signal)
  let pending = 0, wake, error, ended = false
  const fail = () => { error = new Error('QQ 文件流连接中断'); wake?.() }
  const message = event => {
    try {
      if (typeof event.data !== 'string' || event.data.length > 512 * 1024) return fail()
      const frame = JSON.parse(event.data)
      if (frame.echo !== echo) return
      pending += event.data.length
      if (pending > 4 * 1024 * 1024) return fail()
      queue.push({ frame, size: event.data.length }); wake?.()
      if (frame.status === 'failed' || frame.data?.data_type === 'file_complete' || frame.data?.type === 'error') ended = true
    } catch { fail() }
  }
  const closed = () => { if (!ended) fail(); else wake?.() }
  socket.addEventListener('message', message); socket.addEventListener('error', fail); socket.addEventListener('close', closed); signal.addEventListener('abort', fail, { once: true })
  try {
    signal.throwIfAborted(); socket.send(JSON.stringify({ action: 'download_file_stream', params, echo }))
    while (true) {
      signal.throwIfAborted()
      if (error) throw error
      if (queue.length) { const item = queue.shift(); pending -= item.size; yield item.frame; continue }
      if (ended) return
      await new Promise(resolve => { wake = resolve })
    }
  } finally {
    signal.removeEventListener('abort', fail); socket.removeEventListener('message', message); socket.removeEventListener('error', fail); socket.removeEventListener('close', closed)
    socket.addEventListener('error', () => {}, { once: true }); socket.close()
  }
}

async function* decodeFile(frames, maximum) {
  let header = false, complete = false, index = 0, size = 0, declared = 0
  for await (const envelope of frames) {
    const data = envelope.data
    if (envelope.status !== 'ok' || !data || data.type === 'error') throw new Error('QQ 后端无法下载此文件')
    if (complete) throw new Error('QQ 文件流存在多余数据')
    if (data.data_type === 'file_info') {
      if (header || index || !Number.isSafeInteger(data.file_size) || data.file_size < 0 || data.file_size > maximum) throw new Error('QQ 文件流大小无效或超过上限')
      header = true; declared = data.file_size
    } else if (data.data_type === 'file_chunk') {
      if (!header || data.index !== index++ || typeof data.data !== 'string' || data.data.length > 128 * 1024 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(data.data)) throw new Error('QQ 文件分块顺序或内容无效')
      const bytes = Buffer.from(data.data, 'base64'); size += bytes.length
      if (data.size !== bytes.length || size > maximum) throw new Error('QQ 文件流大小无效或超过上限')
      yield bytes
    } else if (data.data_type === 'file_complete') {
      if (!header || data.total_chunks !== index || data.total_bytes !== size || (declared && declared !== size)) throw new Error('QQ 文件下载不完整')
      complete = true
    } else throw new Error('QQ 后端未返回文件流')
  }
  if (!complete) throw new Error('QQ 文件下载缺少完成确认')
}

export async function* backendFileStream({ config, id, url, signal, maximum, sockets = () => [], socketIdentity = () => '' }) {
  const requests = [...(id ? [{ file_id: id, chunk_size: 65536 }] : []), ...(url ? [{ file: url, chunk_size: 65536 }] : [])]
  let emitted = false, lastError
  // Retry another source/transport only before any bytes have reached the attachment service.
  for (const params of requests) {
    try {
      for await (const bytes of decodeFile(httpFrames(config, params, signal), maximum)) { emitted = true; yield bytes }
      return
    } catch (e) { signal.throwIfAborted(); if (emitted) throw e; lastError = e }
    for (const socket of await sockets()) {
      const botId = String(socketIdentity())
      if (!/^\d+$/.test(botId)) continue
      try {
        for await (const bytes of decodeFile(socketFrames(socket, params, signal, botId), maximum)) { emitted = true; yield bytes }
        return
      } catch (e) { signal.throwIfAborted(); if (emitted) throw e; lastError = e }
    }
  }
  throw new Error('QQ 后端未能传回文件内容：' + (lastError?.message || '不支持文件流接口'))
}
