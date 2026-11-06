import { basename } from 'node:path'
import { BlockList, isIP } from 'node:net'
import { backendFileStream } from './onebot-file-stream.mjs'

export const qqFileName = data => Array.from(basename(String(data?.name || data?.file_name || 'QQ文件').replace(/\\/g, '/')).replace(/[\x00-\x1f\x7f【】]/g, '_').replace(/^\.+/, '')).slice(0, 160).join('') || 'QQ文件'

const privateIPs = new BlockList()
for (const [ip, prefix] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.168.0.0',16],['192.0.0.0',24],['198.18.0.0',15],['224.0.0.0',3]]) privateIPs.addSubnet(ip, prefix)
// QQ also returns numeric CDN addresses. Accept those only from an authenticated backend response, never from message text.
function downloadURL(value, endpoint, resolved = false) {
  const url = new URL(value), backend = new URL(endpoint)
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password ||
    !(url.origin === backend.origin || (!url.port && /(^|\.)(qq\.com|qq\.com\.cn|qpic\.cn|gtimg\.cn)$/i.test(url.hostname)) || (resolved && isIP(url.hostname) === 4 && !privateIPs.check(url.hostname)))) throw new Error('文件下载地址不是 QQ 文件服务或已配置的 QQ 后端')
  return url.href
}

export async function receiveQQFiles({ files = [], binding, config, attachments, call, signal, backendHeaders, storage, sockets, socketIdentity, active = () => true, log = () => {} }) {
  const content = [], notes = []
  if (!files.length || !config.收文件) return { content, notes }
  const count = Math.floor(Math.max(1, Math.min(Number(config.收文件最多) || 3, 10)))
  const maximum = Math.max(1, Math.min(Number(config.收文件上限MB) || 20, 100)) * 1048576
  const check = () => { signal?.throwIfAborted(); if (!active()) throw new Error('收文件配置或绑定已变化，已停止') }
  for (const segment of files.slice(0, count)) {
    const data = segment.data || {}
    let name = qqFileName(data)
    try {
      check()
      if (typeof attachments?.saveFileStream !== 'function') throw new Error('宿主缺少通用文件附件接口，请升级宿主')
      if (Number(data.size ?? data.file_size) > maximum) throw new Error('文件超过 ' + config.收文件上限MB + ' MB 上限')
      let info = data, url = String(data.url || ''), resolved = false
      const id = String(data.file_id || data.id || data.file || '')
      const validId = id && id.length <= 4096 && !/^(?:[a-z]+:)|(?:^|[\\/])\.\.(?:[\\/]|$)/i.test(id) && (!/[\\/]/.test(id) || /^\/[0-9a-f-]{32,36}$/i.test(id))
      if (url && validId) {
        try {
          const candidate = new URL(url)
          if (isIP(candidate.hostname) === 4 && !privateIPs.check(candidate.hostname) && candidate.origin !== new URL(config.NapCat).origin) url = ''
        } catch {}
      }
      if (!url && !info.base64) {
        if (!validId) throw new Error('缺少有效 QQ 文件 ID')
        const group = binding.类型 === '群'
        info = await call(group ? 'get_group_file_url' : 'get_private_file_url', {
          file_id: id, ...(group ? { group_id: String(binding.号码), busid: Number(data.busid) || 102 } : { user_id: String(binding.号码), ...(data.file_hash ? { file_hash: String(data.file_hash) } : {}) }),
        }) || {}
        check(); resolved = true; url = String(info.url || '')
        if (!url) { info = await call('get_file', { file_id: id }) || {}; check(); url = String(info.url || '') }
      }
      if (Number(info.file_size ?? info.size) > maximum) throw new Error('文件超过 ' + config.收文件上限MB + ' MB 上限')
      if (!data.name && !data.file_name) name = qqFileName(info)
      const deadline = AbortSignal.timeout(30000), downloadSignal = signal ? AbortSignal.any([signal, deadline]) : deadline
      let stream
      if (info.base64 && !/^https?:\/\//i.test(url)) {
        if (typeof info.base64 !== 'string' || info.base64.length > Math.ceil(maximum / 3) * 4 || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(info.base64)) throw new Error('文件 Base64 无效或超过大小上限')
        stream = (async function* () { yield Buffer.from(info.base64, 'base64') })()
      } else {
        // A container-local path returned by get_file is not a host file. Request bytes by QQ ID instead.
        const remote = /^https?:\/\//i.test(url)
        if (remote) downloadURL(url, config.NapCat, resolved)
        else if (url && !resolved) throw new Error('文件下载地址无效')
        try {
          if (!remote) throw new Error('QQ 后端未提供直链')
          let response
          for (let redirects = 0; redirects < 4; redirects++) {
            check(); downloadSignal.throwIfAborted()
            response = await fetch(downloadURL(url, config.NapCat, resolved), { redirect: 'manual', signal: downloadSignal, headers: new URL(url).origin === new URL(config.NapCat).origin ? backendHeaders : undefined })
            if ([301,302,303,307,308].includes(response.status)) {
              const next = response.headers.get('location'); await response.body?.cancel()
              if (!next || redirects === 3) throw new Error('文件下载跳转无效或过多')
              url = new URL(next, url).href; continue
            }
            break
          }
          if (!response.ok) { await response.body?.cancel(); throw new Error('文件下载失败：HTTP ' + response.status) }
          if (Number(response.headers.get('content-length')) > maximum) { await response.body?.cancel(); throw new Error('文件超过 ' + config.收文件上限MB + ' MB 上限') }
          if (!response.body) throw new Error('文件下载没有返回内容')
          stream = response.body
        } catch (error) {
          check(); downloadSignal.throwIfAborted()
          if (!validId) throw error
          stream = backendFileStream({ config, id, url: remote ? downloadURL(url, config.NapCat, resolved) : '', signal: downloadSignal, maximum, sockets, socketIdentity })
        }
      }
      let size = 0, finished = false
      const bounded = (async function* () {
        for await (const chunk of stream) {
          check(); downloadSignal.throwIfAborted(); size += chunk.length
          if (size > maximum) throw new Error('文件实际大小超过 ' + config.收文件上限MB + ' MB 上限')
          yield chunk
        }
        check(); downloadSignal.throwIfAborted(); finished = true
      })()
      let ref
      try { ref = await attachments.saveFileStream({ name, data: bounded, signal: downloadSignal }) }
      finally { await bounded.return(); if (stream.cancel) await stream.cancel().catch(() => {}) }
      check()
      if (!finished || !ref?.attachmentId || ref.bytes !== size) throw new Error('宿主没有完整接收文件附件')
      content.push({ type: 'file', attachment: ref }); notes.push('文件「' + name + '」已作为附件交给 DSH（' + size + ' 字节）')
      if (config.文件存储) {
        try {
          if (!storage || typeof attachments.readFileStream !== 'function') throw new Error('宿主缺少文件归档读取接口')
          await storage.save({ kind: 'files', name, data: attachments.readFileStream(ref, signal), binding, endpoint: config.NapCat, maxBytes: maximum, active, signal })
          notes.push('文件「'+name+'」已存入 QQ文件 目录')
        } catch(e) { signal?.throwIfAborted(); notes.push('文件「'+name+'」已接收，额外存储失败：'+e.message); log(notes.at(-1)) }
      }
    } catch (error) {
      signal?.throwIfAborted()
      notes.push('文件「' + name + '」未接收：' + error.message); log(notes.at(-1))
      if (!active()) break
    }
  }
  if (files.length > count) notes.push('本批只接收前 ' + count + ' 个文件，其余已跳过')
  return { content, notes }
}
