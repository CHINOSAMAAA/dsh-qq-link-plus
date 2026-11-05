import test from 'node:test'
import assert from 'node:assert/strict'
import { mkdtempSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { recordSource } from '../lib/memory-sources.mjs'

test('普通群共享记忆仍独占回复路由；歧义、换聊天和换机器人均不发送', async () => {
  const home = mkdtempSync(join(tmpdir(), 'qq-memory-route-'))
  process.env.DSH_HOME = home
  const host = await import('../lib/host.js')
  const rows = [{ 类型:'群', 号码:'20003', 会话:'C' }, { 类型:'群', 号码:'20004', 会话:'D' }]
  const config = { 总开关:true, 试运行:false, 转群:true, NapCat:'http://fixture', 绑定:rows, 长回复拆段:false, 发图:false, 发文件:false }
  for (const row of rows) recordSource(home, config, '99999', row, 'msg-'+row.会话, ['30001'])
  const sent = [], original = globalThis.fetch
  let bot = '99999'
  globalThis.fetch = async (url, options) => {
    if (String(url).endsWith('/get_login_info')) return { json:async()=>({status:'ok',data:{user_id:bot}}) }
    sent.push(JSON.parse(options.body))
    return { json:async()=>({status:'ok',retcode:0,data:{message_id:sent.length}}) }
  }
  try {
    const runtime = host.apply({ effect:fn=>fn(), on:()=>()=>{}, interval:()=>()=>{}, get:()=>null,
      webServer:{ register:()=>()=>{} }, agents:{ list:()=>[],get:()=>null },sessions:{ list:()=>[] } })
    await runtime.发到QQ(config, '共享库里的知识，当前C群的回复', [], 'C')
    assert.deepEqual(sent.map(x=>x.group_id), [20003])
    await runtime.发到QQ(config, '当前D群的回复', [], 'D')
    assert.deepEqual(sent.map(x=>x.group_id), [20003,20004])
    await runtime.发到QQ({...config,绑定:[...rows,{类型:'群',号码:'20005',会话:'C'}]},'不能广播',[],'C')
    await runtime.发到QQ({...config,绑定:[{类型:'私聊',号码:'10001',会话:'C'}]},'旧群回复不能改发私聊',[],'C')
    bot='88888';await runtime.发到QQ(config,'不能沿用旧机器人会话',[],'C')
    assert.equal(sent.length,2)
  } finally { globalThis.fetch = original }
})
