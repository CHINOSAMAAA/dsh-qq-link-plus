// 「通到 QQ」网页半边冒烟测试 —— 用假的 React / 假的 slots 把设置页渲染成一棵对象树。
// 验：模块 id、inject、挂到 settings.section（id=qq-bridge 是 slot id，跟包名无关）、关键元素都渲染出来、不抛错。
// 跑法： node tests/网页半边.mjs

let 捕获 = null
globalThis.window = { __ModuleLoader__: { load: (o) => { 捕获 = o } } }

globalThis.fetch = async (url) => {
  return {
    json: async () => ({
      ok: true, 版本: '0.1.0',
      配置: {
    总开关: false, 试运行: true, NapCat: 'http://127.0.0.1:3000', 令牌: '',
    绑定: [{ 类型: '私聊', 号码: '123', 会话: 'session-X', 称呼: '小明' }],
    收图: true, 发图: true, 收图最多: 4, 图上限MB: 5, 图片根目录: '',
  },
      NapCat状态: { 用户: 10001, 昵称: '测试号' },
      活着的会话: [{ id: 'session-X', 标题: '测试会话' }],
      目标情况: [],
      日志: [{ 时间: '01-01 00:00:00', 文本: '已装好' }],
    }),
  }
}

let 状态槽 = []
let 下标 = 0
const 造React = () => ({
  createElement: (t, p, ...kids) => ({ t, p: p || {}, kids: kids.flat(9).filter((k) => k !== null && k !== undefined && k !== false) }),
  useState: (init) => {
    const i = 下标++
    if (!(i in 状态槽)) 状态槽[i] = init
    return [状态槽[i], (v) => { 状态槽[i] = typeof v === 'function' ? v(状态槽[i]) : v }]
  },
  useEffect: () => {},
  useCallback: (f) => f,
})
const 假require = (n) => {
  if (n === 'react') return 造React()
  throw new Error('不该 require 这个：' + n)
}

await import(new URL('../lib/client.js', import.meta.url).href)

const exports = 捕获.factory(假require)
let 挂了 = 0
const 报 = (标签, 过, 详情) => { if (!过) 挂了++; console.log(`${过 ? 'PASS' : 'FAIL'}  ${标签}${详情 ? '  :: ' + 详情 : ''}`) }

报('模块 id = dsh-qq-link-plus', 捕获.id === 'dsh-qq-link-plus', 捕获.id)
报('inject 只依赖 slots', Array.isArray(exports.inject) && exports.inject.join() === 'slots')

let 注册 = null
let 组件 = null
const slots = {
  inject: (n, cb) => { if (n !== 'settings.section') throw new Error('槽位名不对：' + n); cb() },
  register: (d, c) => { 注册 = d; 组件 = c; return () => {} },
}
exports.apply({ get: (n) => (n === 'slots' ? slots : undefined) })
报('挂到 settings.section，id = qq-bridge', 注册 !== null && 注册.id === 'qq-bridge' && 注册.name === 'settings.section', JSON.stringify(注册))

// 预先填好「已经读到状态」的第一格（体），这样不用等 useEffect 拉数据，组件一次渲染就出整页
const 初始态 = {
  ok: true, 版本: '0.1.0',
  配置: { 总开关: false, 试运行: true, 目标会话: '', 私聊会话: '', 群会话: '', 私聊QQ: '', 群号: '', 转私聊: true, 转群: false, NapCat: 'http://127.0.0.1:3000',
    允许发空间动态: false, 空间定时发: [{ 时: '09:30', 权: 1, 开: true }], 空间看圈开: false, 空间看圈分: 30, 空间点赞开: false, 空间评论开: false,
    绑定: [{ 类型: '群', 号码: '123456', 会话: 'session-X', 称呼: '群里的人' }] },
  NapCat状态: { 用户: 10001, 昵称: '测试号' },
  活着的会话: [{ id: 'session-X', 标题: '测试会话' }],
  目标情况: [],
  日志: [{ 时间: '01-01 00:00:00', 文本: '已装好' }],
}
下标 = 0
状态槽 = [初始态]
const 树 = 组件()
const 文 = JSON.stringify(树)
const 要有 = ['通到 QQ', '总开关', '试运行', '绑定', '总览', '消息', '空间', '门槛', '更新', '测试一句', '保存设置', '连着的 QQ：测试号（10001）']
const 缺 = 要有.filter((x) => !文.includes(x))
报('关键元素都渲染出来（含连接状态 + 目标会话标题）', 缺.length === 0, 缺.length ? '缺：' + 缺.join('、') : 文.length + ' 字节')

// ⭐ 1.1.0：点进「绑定」页 —— 人设卡、那一列「单独」都得出来
const 找按钮 = (节点, 文字) => {
  if (!节点 || typeof 节点 !== 'object') return null
  if (Array.isArray(节点)) {
    for (const x of 节点) {
      const r = 找按钮(x, 文字)
      if (r) return r
    }
    return null
  }
  if (Array.isArray(节点.kids) && 节点.kids.includes(文字) && 节点.p && typeof 节点.p.onClick === 'function') return 节点
  return 找按钮(节点.kids, 文字)
}
const 绑定钮 = 找按钮(树, '绑定')
报('能找到「绑定」页签', Boolean(绑定钮))
if (绑定钮) {
  绑定钮.p.onClick()
  下标 = 0
  const 树2 = 组件()
  const 文2 = JSON.stringify(树2)
  const 要有2 = ['人设（选填）', '给聊天带上人设', '单独', '群里怎么回（对所有群生效）', '两条之间至少隔（秒）']
  const 缺2 = 要有2.filter((x) => !文2.includes(x))
  报('绑定行有「启用 / 只听 @」两个开关',
    文2.includes('启用（关掉 = 这个聊天不收了，也不发）') && 文2.includes('只听 @ 我的'), '')
  报('绑定页里人设卡 + 那一列都在', 缺2.length === 0, 缺2.length ? '缺：' + 缺2.join('、') : 文2.length + ' 字节')
}

// ⭐ 1.5.0：页签改成 总览 / 绑定 / 消息 / 空间 / 门槛 / 更新，六个都得在
const 页签名们 = ['总览', '绑定', '历史导入', '消息', '空间', '门槛', '更新']
const 缺页签 = 页签名们.filter((名) => !找按钮(树, 名))
报('七个页签都在（含历史导入）', 缺页签.length === 0,
  缺页签.length ? '缺：' + 缺页签.join('、') : 页签名们.join(' / '))

// 通用查找：按类型 + 属性找控件（input 的 type / select 之类）
const 找控件 = (节点, 条件, 出 = []) => {
  if (!节点 || typeof 节点 !== 'object') return 出
  if (Array.isArray(节点)) {
    for (const x of 节点) 找控件(x, 条件, 出)
    return 出
  }
  if (条件(节点)) 出.push(节点)
  找控件(节点.kids, 条件, 出)
  return 出
}

找按钮(树, '历史导入').p.onClick()
下标 = 0
const 历史树 = 组件()
const 历史文 = JSON.stringify(历史树)
报('历史导入有三种入口、预览与恢复', ['QCE 单文件 JSON', 'OneBot JSON', 'QQ 原生 TXT', '从 QQ 后端读取并预览', '恢复已有任务', 'AI 对应的 QQ'].every(t => 历史文.includes(t)))
报('文件选择限定 JSON / TXT', 找控件(历史树, n => n.t === 'input' && n.p.type === 'file').some(n => n.p.accept === '.json,.txt'))

// ⭐ 1.5.0：「消息」页不再有「QQ 空间」那张卡（搬到「空间」页了）
const 消息钮 = 找按钮(树, '消息')
报('能找到「消息」页签', Boolean(消息钮))
if (消息钮) {
  消息钮.p.onClick()
  下标 = 0
  const 树3 = 组件()
  const 文3 = JSON.stringify(树3)
  const 要有3 = ['连到哪个 QQ 后端', '发出去的样子', '收进来的样子', '图片', '语音转写（QQ 语音条 → 文字）']
  const 缺3 = 要有3.filter((x) => !文3.includes(x))
  报('消息页里原来那几张卡都还在', 缺3.length === 0, 缺3.length ? '缺：' + 缺3.join('、') : 文3.length + ' 字节')
  报('「消息」页里没有「QQ 空间」那张卡了', !文3.includes('允许发 QQ 空间动态'))
}

// ⭐ 1.5.0：「空间」页四张卡的关键控件
const 空间钮 = 找按钮(树, '空间')
报('能找到「空间」页签', Boolean(空间钮))
if (空间钮) {
  空间钮.p.onClick()
  下标 = 0
  const 树4 = 组件()
  const 文4 = JSON.stringify(树4)
  const 要有4 = ['允许发 QQ 空间动态', '定时发说说', '可见范围', '所有人', '好友', '仅自己',
    '多久看一圈（分钟）', '自动点赞', '允许评论']
  const 缺4 = 要有4.filter((x) => !文4.includes(x))
  报('「空间」页四张卡的关键控件都渲染出来了', 缺4.length === 0, 缺4.length ? '缺：' + 缺4.join('、') : 文4.length + ' 字节')
  报('定时那条表格：一行有一条时间框 + 可见范围下拉 + 启用勾 + 删',
    Boolean(找控件(树4, (n) => n.t === 'input' && n.p.type === 'time').length)
      && Boolean(找控件(树4, (n) => n.t === 'select').length)
      && Boolean(找控件(树4, (n) => n.t === 'input' && n.p.type === 'checkbox').length)
      && Boolean(找按钮(树4, '删')))
  const 数字框 = 找控件(树4, (n) => n.t === 'input' && n.p.type === 'number')
  报('看圈分钟是个 5～1440 的数字框', 数字框.some((n) => String(n.p.min) === '5' && String(n.p.max) === '1440'),
    JSON.stringify(数字框.map((n) => [n.p.min, n.p.max])))
  报('点赞 / 评论是两个 checkbox（默认都不勾）', 找控件(树4, (n) => n.t === 'input' && n.p.type === 'checkbox' && n.p.checked === false).length >= 2)

  // 定时表空着的时候要有一句提示（另起一次渲染，配置里清空）
  状态槽 = [{ ...初始态, 配置: { ...初始态.配置, 空间定时发: [] } }, false, false, '', null, false, '空间']
  下标 = 0
  const 树空 = 组件()
  报('定时表空着时给一句「还没有 —— 点下面的「+ 加一条」」',
    JSON.stringify(树空).includes('还没有 —— 点下面的「+ 加一条」'))
}

// ⭐ 1.5.0：「门槛」页里「转发进来会变成什么样」那张卡整块删掉了
const 门槛钮 = 找按钮(树, '门槛')
报('能找到「门槛」页签', Boolean(门槛钮))
if (门槛钮) {
  门槛钮.p.onClick()
  下标 = 0
  const 树5 = 组件()
  const 文5 = JSON.stringify(树5)
  const 要有5 = ['点名之后接着听几条', '接着听多少秒']
  const 缺5 = 要有5.filter((x) => !文5.includes(x))
  报('门槛页里有「点名之后接着听几条 / 接着听多少秒」', 缺5.length === 0, 缺5.length ? '缺：' + 缺5.join('、') : 文5.length + ' 字节')
  报('门槛页里没有「转发进来会变成什么样」了', !文5.includes('转发进来会变成什么样'))
}

// ⭐ 1.5.0：「更新」页里有「检查更新」按钮（那张卡整块搬过去了）
const 更新钮 = 找按钮(树, '更新')
报('能找到「更新」页签', Boolean(更新钮))
if (更新钮) {
  更新钮.p.onClick()
  下标 = 0
  const 树6 = 组件()
  const 文6 = JSON.stringify(树6)
  报('更新页里有「检查更新」按钮', Boolean(找按钮(树6, '检查更新')))
  报('更新页里没有「转发进来会变成什么样」那张卡', !文6.includes('转发进来会变成什么样'))
}

// Plus：模拟用户选择绑定和文件，验证同源记忆写入、错误不推进、恢复后完成。
状态槽 = [初始态, false, false, '', null, false, '历史导入']
const 渲历史 = () => { 下标 = 0; return 组件() }
let 历史界面 = 渲历史()
找控件(历史界面, n => n.p['aria-label'] === '历史导入绑定')[0].p.onChange({ target: { value: '0' } })
找控件(历史界面, n => n.p.type === 'file')[0].p.onChange({ target: { files: [{ name: 'qq.txt', size: 4,
  arrayBuffer: async () => new Uint8Array([0xc4, 0xe3, 0xba, 0xc3]).buffer }] } })
const 历史请求们 = []
let 工作区模式 = true, 写入失败 = true
let 任务 = { id: 'a'.repeat(64), session: 'session-X', binding: { 类型: '群', 号码: '123456' }, filename: 'qq.txt',
  count: 2, duplicates: 0, format: 'QQ TXT', start: null, end: null, total: 2, completed: 0, done: false, preview: '你好' }
globalThis.fetch = async (url, options = {}) => {
  const path = String(url), body = options.body ? JSON.parse(options.body) : null
  历史请求们.push({ path, body })
  let data
  if (path.endsWith('/history/jobs')) data = { ok: true, jobs: [任务] }
  else if (path.endsWith('/history/prepare')) data = { ok: true, job: 任务 }
  else if (path.endsWith('/dsh-fish-memory/list')) data = { ok: true, 全局开关: true, 模式: 工作区模式 ? 'workspace' : 'session', sessions: [{ id: 'session-X', enabled: true }] }
  else if (path.endsWith('/history/analyze')) data = { ok: true, pending: { token: 'token', items: [{ text: '记忆', importance: 0.5 }] }, job: 任务 }
  else if (path.endsWith('/dsh-fish-memory/import/apply')) data = 写入失败 ? { ok: false, message: '模拟写入失败' } : { ok: true, added: 1 }
  else if (path.endsWith('/history/commit')) {
    任务 = { ...任务, completed: 任务.completed + 1, done: 任务.completed + 1 === 任务.total }
    data = { ok: true, job: 任务 }
  } else throw new Error('不该请求的地址：' + path)
  return { ok: true, json: async () => data }
}
历史界面 = 渲历史()
await 找按钮(历史界面, '读取文件并预览').p.onClick()
报('旧版 GB18030 TXT 在浏览器转为正确中文再上传', 历史请求们.find(x => x.path.endsWith('/prepare'))?.body.content === '你好')
历史界面 = 渲历史()
await 找按钮(历史界面, '开始 / 继续整理并写入记忆').p.onClick()
报('工作区共享模式不开始导入', !历史请求们.some(x => x.path.endsWith('/analyze')) && JSON.stringify(渲历史()).includes('按会话模式'))
工作区模式 = false
await 找按钮(渲历史(), '开始 / 继续整理并写入记忆').p.onClick()
报('写入失败不确认导入进度', !历史请求们.some(x => x.path.endsWith('/commit')) && JSON.stringify(渲历史()).includes('模拟写入失败'))
写入失败 = false
await 找按钮(渲历史(), '开始 / 继续整理并写入记忆').p.onClick()
报('继续导入完整处理两段，记忆只发给所选会话', 任务.done && 任务.completed === 2
  && 历史请求们.filter(x => x.path.endsWith('/import/apply')).every(x => x.body.session === 'session-X'))
报('历史导入完成后按钮禁用，不会发送 QQ 消息', 找按钮(渲历史(), '已完成')?.p.disabled === true
  && 历史请求们.every(x => !x.path.includes('send_')))

console.log(`\n${挂了 === 0 ? '全部通过 ✅' : `有 ${挂了} 条没过 ❌`}`)
process.exitCode = 挂了 === 0 ? 0 : 1
