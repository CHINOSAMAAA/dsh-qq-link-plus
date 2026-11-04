// DSH「通到 QQ」· 网页半边
//
// 在 **DSH 设置** 左侧栏加一项「通到 QQ」，Plus 增加历史导入页。
// 绑定是核心：一行 = 一个聊天（私聊 或 群）→ 一间 DSH 会话，各回各的，不串。
//
// ⚠ 这里不碰会话、不发消息，只是往宿主那几条 /dsh-qq-bridge/* 路由上读写。

window.__ModuleLoader__.load({
  id: 'dsh-qq-link-plus',
  factory: (require) => {
    var module = { exports: {} }
    var exports = module.exports

    const React = require('react')
    const inject = ['slots']

    const B = '/dsh-qq-bridge'
    const get = (p) => fetch(B + p, { cache: 'no-store' }).then((r) => r.json()).catch(() => null)
    const post = (p, body) =>
      fetch(B + p, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body || {}) })
        .then((r) => r.json())
        .catch(() => null)

    const h = React.createElement

    const S = {
      wrap: {
        padding: '20px 20px 28px',
        fontSize: 13,
        lineHeight: 1.6,
        background: 'var(--dsw-alias-bg-layer-1, rgba(255,255,255,.92))',
        border: '1px solid var(--dsw-alias-border-l1, rgba(0,0,0,.08))',
        borderRadius: 12,
      },
      h: { fontSize: 14, fontWeight: 600, margin: '0 0 12px' },
      dim: { opacity: 0.62, fontSize: 12 },
      card: {
        border: '1px solid var(--dsw-alias-border-l2)',
        borderRadius: 8,
        padding: '16px',
        marginBottom: 0,
        minWidth: 0,
        background: 'var(--dsw-alias-bg-layer-1)',
      },
      row: { display: 'flex', gap: 10, alignItems: 'flex-start', marginBottom: 14, flexWrap: 'wrap' },
      lab: { flex: '0 1 190px', paddingTop: 3, fontSize: 12.5, fontWeight: 500 },
      ctl: { flex: '1 1 260px', minWidth: 0 },
      hint: { opacity: 0.6, fontSize: 11.5, marginTop: 2 },
      input: {
        border: '1px solid var(--dsw-alias-border-l2)',
        borderRadius: 6,
        padding: '4px 8px',
        background: 'transparent',
        color: 'inherit',
        fontSize: 12.5,
        width: '100%',
        boxSizing: 'border-box',
      },
      small: {
        border: '1px solid var(--dsw-alias-border-l2)',
        borderRadius: 6,
        padding: '4px 8px',
        background: 'transparent',
        color: 'inherit',
        fontSize: 12.5,
        width: 140,
        boxSizing: 'border-box',
      },
      wide: {
        border: '1px solid var(--dsw-alias-border-l2)',
        borderRadius: 6,
        padding: '4px 8px',
        background: 'transparent',
        color: 'inherit',
        fontSize: 12.5,
        width: '100%',
        boxSizing: 'border-box',
      },
      ok: { color: 'var(--dsw-alias-state-business-primary)', fontSize: 12 },
      已同步: { margin: '6px 0 10px', fontSize: 12, color: 'var(--dsw-alias-state-business-primary)' },
      未保存: { margin: '6px 0 10px', fontSize: 12, color: '#c0392b', fontWeight: 600 },
      悬浮保存条: {
        position: 'sticky',
        bottom: 0,
        marginTop: 12,
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        flexWrap: 'wrap',
        padding: '8px 12px',
        borderRadius: 10,
        border: '1px solid var(--dsw-alias-border-l2)',
        background: 'var(--dsw-alias-bg-layer-1, rgba(255,255,255,.95))',
        boxShadow: '0 -6px 18px rgba(0,0,0,.18)',
        zIndex: 5,
      },
      btn: {
        border: '1px solid var(--dsw-alias-border-l2)',
        borderRadius: 6,
        padding: '4px 12px',
        background: 'transparent',
        color: 'inherit',
        fontSize: 12,
        cursor: 'pointer',
      },
      btnOn: {
        border: '1px solid var(--dsw-alias-state-business-primary)',
        borderRadius: 6,
        padding: '4px 12px',
        background: 'var(--dsw-alias-state-business-primary)',
        color: '#fff',
        fontSize: 12,
        cursor: 'pointer',
      },
      tabBar: { display: 'flex', gap: 8, flexWrap: 'wrap', margin: '16px 0', paddingBottom: 14, borderBottom: '1px solid var(--dsw-alias-border-l2)' },
      stack: { display: 'grid', gap: 14 },
      grid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 380px), 1fr))', gap: 14, alignItems: 'start' },
      group: { border: '1px solid var(--dsw-alias-border-l2)', borderRadius: 10, padding: '14px 16px' },
      summary: { fontWeight: 600, fontSize: 14, cursor: 'pointer', padding: '2px 0 12px' },
      日志行: { fontFamily: 'ui-monospace, Consolas, monospace', fontSize: 11.5, whiteSpace: 'pre-wrap' },
      表头: { display: 'grid', gridTemplateColumns: '70px minmax(90px, 130px) minmax(90px, 1fr) 40px 64px 48px', gap: 8, alignItems: 'center', marginBottom: 8, minWidth: 500 },
      表格行: { display: 'grid', gridTemplateColumns: '70px minmax(90px, 130px) minmax(90px, 1fr) 40px 64px 48px', gap: 8, alignItems: 'center', marginBottom: 8, minWidth: 500 },
      表头字: { fontSize: 11.5, opacity: 0.65 },
      空间表头: { display: 'grid', gridTemplateColumns: '120px 140px 1fr 56px', gap: 6, alignItems: 'center', marginBottom: 4 },
      空间行: { display: 'grid', gridTemplateColumns: '120px 140px 1fr 56px', gap: 6, alignItems: 'center', marginBottom: 6 },
    }

    const 提示 = (文本) => h('div', { style: S.hint }, 文本)
    const 行 = (标签, 控件, 说明) =>
      h('div', { style: S.row }, h('div', { style: S.lab }, 标签), h('div', { style: S.ctl }, 控件, 说明 ? 提示(说明) : null))
    const 按钮 = (文字, onClick, 亮, 关) =>
      h('button', { type: 'button', style: 亮 ? S.btnOn : S.btn, onClick, disabled: !!关, title: 文字 }, 文字)
    const 勾 = (值, onChange) => h('input', { type: 'checkbox', checked: !!值, onChange: (e) => onChange(e.target.checked) })
    const 短id = (id) => {
      const s = String(id)
      return s.length <= 8 ? s : s.slice(-8)
    }

    const 页签们 = ['总览', '绑定', '历史导入', '更新']

    function Section() {
      const [态, 设态] = React.useState(null)
      const [脏, 设脏] = React.useState(false)
      const [忙, 设忙] = React.useState(false)
      const [说, 设说] = React.useState('')
      const [更新, 设更新] = React.useState(null)
      const [更新忙, 设更新忙] = React.useState(false)
      const [页, 设页] = React.useState('总览')
      const [asr, 设asr] = React.useState(null)
      const [asr忙, 设asr忙] = React.useState(false)
      const [人设行, 设人设行] = React.useState(null) // 哪一行展开了「单独的人设」
      const [人设忙, 设人设忙] = React.useState(false)
      const [人设说, 设人设说] = React.useState('')
      const [历史绑定, 设历史绑定] = React.useState('')
      const [历史文件, 设历史文件] = React.useState(null)
      const [历史AI, 设历史AI] = React.useState('')
      const [历史页数, 设历史页数] = React.useState(100)
      const [历史任务, 设历史任务] = React.useState(null)
      const [历史列表, 设历史列表] = React.useState([])
      const [历史忙, 设历史忙] = React.useState(false)
      const [历史说, 设历史说] = React.useState('')
      const [历史控制] = React.useState({ stop: false, running: false })

      React.useEffect(() => {
        get('/history/jobs').then(r => r && r.ok && 设历史列表(r.jobs))
        return () => { 历史控制.stop = true }
      }, [])

      React.useEffect(() => {
        拉()
        get('/update').then((r) => r && 设更新(r)).catch(() => {})
        get('/asr-status').then((r) => r && 设asr(r)).catch(() => {})
      }, [])
      // 装依赖的时候每 2 秒看一眼进度（装完就停）
      React.useEffect(() => {
        if (!asr || !asr.进行中) return undefined
        const t = setInterval(() => {
          get('/asr-status').then((r) => { if (r) 设asr(r) }).catch(() => {})
        }, 2000)
        return () => clearInterval(t)
      }, [asr && asr.进行中])

      const 拉 = async () => {
        const s = await get('/state')
        if (s) 设态(s)
      }
      // ⭐ 1.1.2：人设「现在就生效」—— 不用等 QQ 那边来一条消息
      const 人设现在生效 = async () => {
        设人设忙(true)
        设人设说('')
        const r = await post('/persona-apply', {})
        设人设忙(false)
        if (!r || !r.ok) {
          设人设说('✗ ' + ((r && r.说) || '请求未响应'))
          return
        }
        const 行们 = Array.isArray(r.结果们) ? r.结果们 : []
        if (!行们.length) {
          设人设说('暂无会话绑定')
          return
        }
        const 不顺 = 行们.filter((x) => !x.生效)
        设人设说((r.生效 ? '✓ ' + r.生效 + ' 个会话已应用' : '未应用到任何会话')
          + (不顺.length ? '；' + 不顺.map((x) => x.聊天 + '：' + x.说).join('；') : ''))
      }
      const 改 = (k, v) => {
        设态((旧) => (旧 ? { ...旧, 配置: { ...(旧.配置 || {}), [k]: v } } : 旧))
        设脏(true)
      }
      // —— 绑定：整份数组替换（宿主那边会再规整一遍、并挡掉重复）——
      const 绑定们 = () => {
        const a = 态 && 态.配置 && 态.配置.绑定
        return Array.isArray(a) ? a : []
      }
      const 设绑定 = (下一份) => 改('绑定', 下一份)
      const 改绑定 = (i, 补) => 设绑定(绑定们().map((x, j) => (j === i ? { ...x, ...补 } : x)))
      const 加绑定 = () => 设绑定([...绑定们(), { 类型: '群', 号码: '', 会话: '', 称呼: '', 门槛: false }])
      const 删绑定 = (i) => 设绑定(绑定们().filter((_, j) => j !== i))

      const 存 = async () => {
        设忙(true)
        const s = await post('/save', (态 && 态.配置) || {})
        设忙(false)
        if (s && s.ok) {
          设态(s)
          设脏(false)
          设说(s.说 || '设置已保存')
        } else {
          设说((s && s.说) || '保存失败')
        }
      }
      const 装语音 = async () => {
        设asr忙(true)
        const r = await post('/asr-install', {})
        设说((r && r.说) || '任务已启动')
        设asr忙(false)
        const s2 = await get('/asr-status')
        if (s2) 设asr(s2)
      }
      const 填语音命令 = async () => {
        const r = await get('/asr-status')
        if (r) 设asr(r)
        if (r && r.就绪 && r.命令) {
          改('语音转写', true)
          改('转写命令', r.命令)
          设说(String(配置.语音模型目录 || '').trim()
            ? '命令已填写，请保存设置'
            : '请填写语音模型目录后重新生成命令')
        } else if (r && !r.就绪) 设说('请先安装语音依赖')
        else 设说('无法读取状态')
      }

      const 试一句 = async () => {
        设忙(true)
        const s = await post('/test-send', {})
        设忙(false)
        设说((s && s.说) || '请求未响应')
        await 拉()
      }

      if (!态) return h('div', { style: S.wrap }, h('div', { style: S.h }, '通到 QQ'), h('div', { style: S.dim }, '读取中…'))

      const 配置 = 态.配置 || {}
      const 目标们 = Array.isArray(态.活着的会话) ? 态.活着的会话 : []
      const NapCat = 态.NapCat状态 || null
      const 日志 = Array.isArray(态.日志) ? 态.日志 : []
      const 绑定 = 绑定们()

      const 会话选项 = (值, onChange) =>
        h('select', { style: S.wide, value: 值 || '', onChange: (e) => onChange(e.target.value) },
          h('option', { value: '' }, '请选择目标会话'),
          ...目标们.map((s) => h('option', { value: s.id }, (s.标题 || '…' + 短id(s.id)) + ' · ' + 短id(s.id))),
          值 && !目标们.some((s) => s.id === 值)
            ? h('option', { value: 值 }, '（当前：' + 短id(值) + '）')
            : null)

      const 页签 = h('div', { style: S.tabBar },
        ...页签们.map((名) => 按钮(名 === '绑定' ? '配置' : 名, () => 设页(名), 页 === 名, false)))

      const 历史请求 = async (path, body, memory = false) => {
        const response = await fetch((memory ? '/dsh-fish-memory' : B + '/history') + path, {
          method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
        })
        let result
        try { result = await response.json() } catch { throw new Error(memory ? '未找到鱼的记忆 Plus，请安装 github:CHINOSAMAAA/dsh-fish-memory-plus 并重启 DSH' : '导入接口未返回 JSON') }
        if (!response.ok || !result.ok) throw new Error(result.说 || result.error || result.message || '请求失败')
        return result
      }
      const 预览历史 = async source => {
        if (历史控制.running) return
        历史控制.running = true
        设历史忙(true); 设历史说('正在读取记录…')
        try {
          if (脏) throw new Error('请先保存绑定设置')
          const binding = 绑定[Number(历史绑定)]
          if (历史绑定 === '' || !binding) throw new Error('请选择 QQ 会话绑定')
          if (source === 'file' && !历史文件) throw new Error('请选择 QCE JSON、OneBot JSON 或 QQ TXT 文件')
          if (历史文件 && source === 'file' && 历史文件.size > 50 * 1024 * 1024) throw new Error('单文件最大 50 MB，请先分文件导出')
          let content
          if (source === 'file') {
            const bytes = await 历史文件.arrayBuffer()
            // QQ 旧版 TXT 常用 GB18030；解码失败再回退，不用替换符静默损坏原文。
            try { content = new TextDecoder('utf-8', { fatal: true }).decode(bytes) }
            catch {
              if (/\.json$/i.test(历史文件.name)) throw new Error('JSON 文件须使用 UTF-8 编码')
              content = new TextDecoder('gb18030', { fatal: true }).decode(bytes)
            }
          }
          const r = await 历史请求('/prepare', { source, type: binding.类型, number: binding.号码, session: binding.会话,
            aiQQ: 历史AI, maxPages: 历史页数, filename: source === 'file' ? 历史文件.name : undefined, content })
          设历史任务(r.job)
          const list = await get('/history/jobs')
          if (list?.ok) 设历史列表(list.jobs)
          设历史说('读取完成，请核对记录范围和发言人身份。')
        } catch (e) { 设历史说('✗ ' + e.message) }
        finally { 历史控制.running = false; 设历史忙(false) }
      }
      const 整理历史 = async () => {
        if (!历史任务 || 历史控制.running) return
        历史控制.running = true; 历史控制.stop = false
        设历史忙(true)
        try {
          const res = await fetch('/dsh-fish-memory/list', { cache: 'no-store' })
          if (!res.ok) throw new Error('请先安装 github:CHINOSAMAAA/dsh-fish-memory-plus 并重启 DSH')
          const memory = await res.json()
          if (!memory.ok || !Array.isArray(memory.sessions)) throw new Error('鱼的记忆接口不兼容')
          if (memory.模式 !== 'session') throw new Error('请在「鱼的记忆」启用按会话模式，避免跨会话共享历史记录')
          const target = memory.sessions.find(s => s.id === 历史任务.session)
          if (!memory.全局开关 || !target?.enabled) throw new Error('请在「鱼的记忆」启用总开关及目标会话记忆')
          let job = 历史任务
          while (!job.done && !历史控制.stop) {
            设历史说(`正在处理 ${job.completed + 1} / ${job.total} 段（消耗模型额度）…`)
            const analysis = await 历史请求('/analyze', { id: job.id })
            if (历史控制.stop) break
            if (analysis.done) { job = analysis.job; break }
            const pending = analysis.pending
            let receipt = { ok: true, added: 0, batch: null }
            if (pending.items.length) receipt = await 历史请求('/import/apply', { session: job.session, items: pending.items }, true)
            const committed = await 历史请求('/commit', { id: job.id, token: pending.token, result: receipt })
            job = committed.job; 设历史任务(job)
          }
          设历史任务(job)
          设历史说(job.done ? '✓ 处理完成，可在「鱼的记忆」核查结果。' : '已暂停，可从已保存进度继续。')
          const list = await get('/history/jobs')
          if (list?.ok) 设历史列表(list.jobs)
        } catch (e) { 设历史说('✗ ' + e.message + '；进度已保存，可重试。') }
        finally { 历史控制.running = false; 设历史忙(false) }
      }
      const 历史页 = h('div', { style: S.stack },
        h('div', { style: S.card },
          h('div', { style: S.h }, '导入 QQ 聊天记录'),
          h('p', null, '按时间分段读取记录，通过摘要衔接上下文并写入「鱼的记忆 Plus」。目标会话需使用 DeepSeek。'),
          行('目标会话绑定', h('select', { style: S.wide, value: 历史绑定, disabled: 历史忙, 'aria-label': '历史导入绑定', onChange: e => 设历史绑定(e.target.value) },
            h('option', { value: '' }, '请选择已保存的绑定'),
            ...绑定.map((b, i) => h('option', { key: i, value: String(i) }, `${b.类型} ${b.号码} → ${b.会话}`)))),
          行('AI 对应的 QQ 号（选填）', h('input', { style: S.input, value: 历史AI, disabled: 历史忙, 'aria-label': 'AI 对应的 QQ 号', onChange: e => 设历史AI(e.target.value) }),
            '指定 AI 身份对应的 QQ 号；留空则保留原发言人姓名。'),
          行('历史读取上限（页）', h('input', { style: S.small, type: 'number', min: 1, max: 1000, value: 历史页数, disabled: 历史忙, 'aria-label': '最多读取页数', onChange: e => 设历史页数(Number(e.target.value)) }),
            '每页请求 100 条；可读取范围取决于后端缓存。'),
          按钮('读取后端记录', () => 预览历史('backend'), false, 历史忙),
          行('聊天记录文件', h('input', { type: 'file', accept: '.json,.txt', disabled: 历史忙, 'aria-label': '聊天记录文件', onChange: e => 设历史文件(e.target.files?.[0] || null) }),
            '支持 QCE 单文件 JSON、OneBot JSON、QQ 原生 TXT（UTF-8 / GB18030），单文件最大 50 MB。'),
          按钮('预览文件', () => 预览历史('file'), false, 历史忙),
          h('p', { style: S.dim }, '原文和进度保存在本机 qq-history-imports。整理将调用模型并消耗额度；图片、语音仅保留文字标记。'),
        ),
        h('div', { style: S.card },
          行('已保存任务', h('select', { style: S.wide, value: 历史任务?.id || '', disabled: 历史忙, 'aria-label': '恢复历史导入任务', onChange: e => 设历史任务(历史列表.find(j => j.id === e.target.value) || null) },
            h('option', { value: '' }, '请选择导入任务'),
            ...历史列表.map(j => h('option', { key: j.id, value: j.id }, `${j.filename} → ${j.session}（${j.completed}/${j.total}）`)))),
          历史任务 ? h('div', null,
            h('div', null, `${历史任务.format}｜${历史任务.count} 条｜去重 ${历史任务.duplicates} 条｜${历史任务.completed}/${历史任务.total} 段`),
            h('div', null, `目标：${历史任务.binding.类型} ${历史任务.binding.号码} → ${历史任务.session}；AI QQ：${历史任务.aiQQ || '未指定'}`),
            h('div', null, `时间：${历史任务.start || '未知'} ～ ${历史任务.end || '未知'}`),
            h('p', null, 历史任务.warning),
            h('progress', { value: 历史任务.completed, max: 历史任务.total, 'aria-label': '历史导入进度' }),
            h('pre', { style: { ...S.日志行, maxHeight: 240, overflow: 'auto' } }, 历史任务.preview),
            按钮(历史任务.done ? '已完成' : '开始 / 继续导入', 整理历史, true, 历史忙 || 历史任务.done),
          ) : null,
          历史忙 ? 按钮('暂停导入', () => { 历史控制.stop = true; 设历史说('正在暂停，等待当前请求结束并保存结果…') }, false, false) : null,
          h('div', { role: 'status', style: { whiteSpace: 'pre-wrap' } }, 历史说),
        ),
      )

      // ───────────── 总览 ─────────────
      const 总览卡片 = [
        h('div', { style: S.card },
          h('div', { style: { ...S.h, margin: '0 0 8px' } }, '基础策略与通知'),
          行('总开关', 勾(配置.总开关, (v) => 改('总开关', v)), '禁用后停止转发。'),
          行('试运行', 勾(配置.试运行, (v) => 改('试运行', v)), '仅记录发送日志，不实际发送 QQ 消息。'),
          // ⭐ 1.5.0（issue #29）：戳一戳这类通知 —— 它们不是消息，拉历史拉不到，只能让 OneBot 主动推
          行('接收 QQ 通知', 勾(配置.收通知, (v) => 改('收通知', v)),
            '通知通过 OneBot HTTP 上报接收。'
            + '上报地址：'
            + 'http://127.0.0.1:<DSH 端口>' + B + '/notice。'
            + '仅处理 notice，消息仍通过轮询接收。'),
          行('上报口令（选填）', h('input', {
            style: S.wide,
            value: String(配置.通知口令 || ''),
            placeholder: '留空不校验口令',
            onChange: (e) => 改('通知口令', e.target.value),
          }), '填写后，上报地址须附带 ?token=口令；留空不校验来源口令。'),
        ),
        h('div', { style: S.card },
          h('div', { style: { ...S.h, margin: '0 0 8px' } }, '会话绑定（' + 绑定.length + ' 条）'),
          绑定.length === 0
            ? h('div', { style: S.dim }, '暂无绑定，请在「配置」中添加 QQ 与 DSH 会话映射。')
            : h('div', null,
              ...绑定.map((x, i) => h('div', { key: i, style: { marginBottom: 4 } },
                (x.类型 === '群' ? '群 ' : '私聊 ') + String(x.号码 || '?')
                + ' → ' + (x.会话 ? 短id(x.会话) : '未选择会话')
                + (x.称呼 ? '　称呼：' + x.称呼 : '')
                + (x.类型 === '群' && x.门槛 ? '　回复门槛：已启用' : '')))),
          h('div', { style: { marginTop: 6 } }, 按钮('管理配置', () => 设页('绑定'))),
        ),
        h('div', { style: S.card },
          h('div', { style: { ...S.h, margin: '0 0 8px' } }, '操作与诊断'),
          h('div', null,
            按钮('保存设置', 存, true, 忙),
            h('span', { style: S.dim }, '　'),
            按钮('发送测试消息', 试一句, false, 忙),
            h('span', { style: S.dim }, '　'),
            按钮('刷新', 拉, false, 忙)),
          h('div', { style: { ...S.dim, marginTop: 4 } }, '测试消息会实际发送至 QQ，不受试运行限制。'),
          说 ? h('div', { style: { ...S.ok, marginTop: 6 } }, 说) : null,
        ),
        h('div', { style: S.card },
          h('div', { style: { ...S.h, margin: '0 0 8px' } }, '最近 ' + 日志.length + ' 条日志（按时间升序）'),
          h('div', { style: { marginTop: 6, maxHeight: 220, overflowY: 'auto' } },
            日志.length === 0
              ? h('div', { style: S.dim }, '暂无日志。')
              : 日志.map((条, i) => h('div', { key: i, style: S.日志行 }, 条.时间 + '　' + 条.文本))),
        ),
      ]

      // ───────────── 绑定 ─────────────
      const 绑定卡片 = [
        h('div', { style: S.card },
          h('div', { style: { ...S.h, margin: '0 0 8px' } }, '全局角色设定'),
          h('div', { style: S.dim },
            '未配置独立角色的会话使用全局设定。'),
          h('div', { style: { marginTop: 6 } }, 勾(配置.人设开, (v) => 改('人设开', v)), ' ', '启用角色设定'),
          h('textarea', {
            style: { ...S.input, display: 'block', width: '100%', height: 88, marginTop: 6, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5, boxSizing: 'border-box' },
            value: String(配置.人设 || ''),
            placeholder: '输入角色身份、表达风格与交互要求。',
            onChange: (e) => 改('人设', e.target.value),
          }),
          h('div', { style: { ...S.dim, marginTop: 4 } },
            '建议简洁描述，减少上下文占用。'),
          h('div', { style: { marginTop: 6 } },
            按钮('立即应用', 人设现在生效, false, 人设忙),
            h('span', { style: S.dim }, '　应用至已打开的目标会话。')),
          人设说 ? h('div', { style: { ...S.dim, marginTop: 4 } }, 人设说) : null,
        ),
        h('div', { style: { ...S.card, overflowX: 'auto' } },
          h('div', { style: { ...S.h, margin: '0 0 8px' } }, 'QQ 与 DSH 会话映射'),
          h('div', { style: S.dim },
            '私聊填写 QQ 号，群聊填写群号；回复按绑定关系转发。'
            + '同一 DSH 会话绑定多个目标时，回复将发送至所有关联目标。'),
          h('div', { style: { ...S.表头, marginTop: 10 } },
            h('div', { style: S.表头字 }, '类型'),
            h('div', { style: S.表头字 }, '号码'),
            h('div', { style: S.表头字 }, '称呼'),
            h('div', { style: S.表头字 }, '门槛'),
            h('div', { style: S.表头字 }, '角色'),
            h('div', { style: S.表头字 }, '')),
          绑定.length === 0
            ? h('div', { style: { ...S.dim, margin: '8px 0' } }, '暂无条目，请添加。')
            : h('div', null, ...绑定.map((x, i) => h(React.Fragment, { key: i },
              h('div', { style: S.表格行 },
                h('select', { style: S.wide, value: x.类型 || '群', onChange: (e) => 改绑定(i, { 类型: e.target.value }) },
                  h('option', { value: '私聊' }, '私聊'),
                  h('option', { value: '群' }, '群')),
                h('input', {
                  style: S.wide, value: String(x.号码 || ''), placeholder: x.类型 === '私聊' ? 'QQ 号' : '群号',
                  onChange: (e) => 改绑定(i, { 号码: e.target.value.trim() }),
                }),
                h('input', {
                  style: S.wide, value: String(x.称呼 || ''),
                  placeholder: x.类型 === '私聊' ? '对方' : '群成员',
                  onChange: (e) => 改绑定(i, { 称呼: e.target.value }),
                }),
                h('div', { style: { textAlign: 'center' } },
                  勾(x.门槛, (v) => 改绑定(i, { 门槛: v }))),
                h('div', { style: { textAlign: 'center' } },
                  按钮(String(x.人设 || '').trim() ? '✓ 独立' : '独立', () => 设人设行(人设行 === i ? null : i), false, false)),
                h('div', null, 按钮('删除', () => 删绑定(i), false, false))),
              // ⭐ 1.1.0：会话单独占一整行，宽度给够
              h('div', { style: { display: 'grid', gridTemplateColumns: '70px 1fr', gap: 6, alignItems: 'center', margin: '0 0 6px' } },
                h('div', { style: S.表头字 }, '会话'),
                会话选项(x.会话, (v) => 改绑定(i, { 会话: v }))),
              // ⭐ 1.1.8：这一行自己的开关 —— 不想理就把「启用」取消，不用删掉
              h('div', { style: { display: 'flex', gap: 16, alignItems: 'center', margin: '0 0 10px', paddingLeft: 2 } },
                h('span', { style: { display: 'flex', gap: 4, alignItems: 'center' } },
                  勾(x.开 !== false, (v) => 改绑定(i, { 开: v })),
                  h('span', { style: S.dim }, '启用收发')),
                x.类型 === '群'
                  ? h('span', { style: { display: 'flex', gap: 4, alignItems: 'center' } },
                      勾(x.只听点名 == null ? !配置.群里听所有人 : Boolean(x.只听点名), (v) => 改绑定(i, { 只听点名: v })),
                      h('span', { style: S.dim }, '仅接收点名消息'))
                  : null),
              i === 人设行
                ? h('div', { style: { margin: '0 0 8px', padding: '6px 8px', background: 'rgba(127,127,127,.06)', borderRadius: 4 } },
                    h('div', { style: { ...S.dim, marginBottom: 4 } }, '独立角色设定（留空使用全局设定）'),
                    h('textarea', {
                      style: { ...S.input, display: 'block', width: '100%', height: 72, resize: 'vertical', fontFamily: 'inherit', lineHeight: 1.5, boxSizing: 'border-box' },
                      value: String(x.人设 || ''),
                      placeholder: '输入此会话的角色设定。',
                      onChange: (e) => 改绑定(i, { 人设: e.target.value }),
                    }),
                    h('div', { style: { marginTop: 4 } },
                      按钮('清空', () => 改绑定(i, { 人设: '' }), false, false),
                      h('span', { style: S.dim }, '　'),
                      按钮('收起', () => 设人设行(null), false, false)))
                : null,
              // ⭐ 1.4.3：这个群里「不听点名也直接收」的 QQ 号。
              //   「只听点名」一开，群里**所有人**（包括自己）都要点名才收；这里列出来的号例外。
              x.类型 === '群' && (x.只听点名 == null ? !配置.群里听所有人 : Boolean(x.只听点名))
                ? h('div', { style: { margin: '0 0 8px' } },
                    h('div', { style: { ...S.dim, marginBottom: 3 } },
                      '点名豁免名单（QQ 号，以逗号或空格分隔）'),
                    h('input', {
                      style: { ...S.input, display: 'block', width: '100%', boxSizing: 'border-box' },
                      value: String(x.点名例外 || ''),
                      placeholder: '例如 3274796953',
                      onChange: (e) => 改绑定(i, { 点名例外: e.target.value }),
                    }))
                : null))),
          h('div', { style: { marginTop: 8 } },
            按钮('+ 添加条目', 加绑定, false, false),
            h('span', { style: S.dim }, '　'),
            按钮('刷新会话列表', 拉, false, 忙)),
          h('div', { style: { ...S.dim, marginTop: 6 } },
            '回复门槛仅适用于群聊，用于判断是否需要回复。'
            + '私聊不执行门槛判断。'),
        ),
        h('div', { style: S.card },
          h('div', { style: { ...S.h, margin: '0 0 8px' } }, '群聊频率与概率'),
          h('div', { style: S.dim },
            '以下设置控制群聊处理频率与回复概率。'),
          行('回复冷却时间（秒）', h('input', { type: 'number', min: 0, max: 300, style: S.small, value: String(配置.回复冷却秒 ?? 5), onChange: (e) => 改('回复冷却秒', Number(e.target.value)) }), '冷却期间的消息等待合并处理，默认 5 秒。'),
          行('每分钟处理上限（条）', h('input', { type: 'number', min: 1, max: 120, style: S.small, value: String(配置.每分钟最多条 ?? 4), onChange: (e) => 改('每分钟最多条', Number(e.target.value)) }), '超出限制的消息等待下一时间窗口，默认 4 条。'),
          行('单批合并上限（条）', h('input', { type: 'number', min: 1, max: 50, style: S.small, value: String(配置.合并最多条 ?? 8), onChange: (e) => 改('合并最多条', Number(e.target.value)) }), '合并时保留发言人标识，默认 8 条。'),
          行('私聊来源标识', h('select', { style: S.small, value: String(配置.私聊署名 || '关'), onChange: (e) => 改('私聊署名', e.target.value) },
            h('option', { value: '关' }, '无标识'), h('option', { value: '前缀' }, '[QQ] 前缀'), h('option', { value: '署名' }, '署名（对方：…）')),
            '区分 QQ 消息与 DSH 手动输入，默认不标记。'),
          行('点名消息必回', h('input', { type: 'checkbox', checked: 配置.点名必回 !== false, onChange: (e) => 改('点名必回', Boolean(e.target.checked)) }), '默认启用；禁用后，点名消息也受回复概率限制。'),
          行('回复概率（%）', h('input', { type: 'number', min: 0, max: 100, style: S.small, value: String(配置.回复概率 ?? 100), onChange: (e) => 改('回复概率', Number(e.target.value)) }), '默认 100%；未选中的消息不进入模型上下文。'),
          h('div', { style: { ...S.dim, marginTop: 4 } }, '合并窗口可在「消息收发」中配置，默认 3 秒。'),
        ),
      ]

      // ───────────── 消息 ─────────────
      const 消息卡片 = [
        h('div', { style: S.card },
          h('div', { style: { ...S.h, margin: '0 0 8px' } }, 'QQ 后端连接'),
          行('接口地址', h('input', { style: S.wide, value: String(配置.NapCat || ''), onChange: (e) => 改('NapCat', e.target.value) }), 'OneBot HTTP 地址，默认 http://127.0.0.1:3000。'),
          行('接口令牌', h('input', { type: 'password', style: S.small, value: String(配置.令牌 || ''), onChange: (e) => 改('令牌', e.target.value) }), '后端启用鉴权时填写 access_token。'),
        ),
        h('div', { style: S.card },
          h('div', { style: { ...S.h, margin: '0 0 8px' } }, '发送格式'),
          行('仅发送 [QQ] 标记内容', 勾(配置.只发标记内, (v) => 改('只发标记内', v)), '仅发送 [QQ]…[/QQ] 内的内容；转入消息会附带格式提示。'),
          行('仅转发 QQ 触发的回复', 勾(配置.只回QQ唤醒, (v) => 改('只回QQ唤醒', v)), '仅转发由 QQ 消息触发的回复。'),
          行('包含自动触发的回复', 勾(配置.自动触发也发, (v) => 改('自动触发也发', v)), '启用后包含主动消息和定时任务；DSH 手动对话不转发。'),
          行('拆分长回复', 勾(配置.长回复拆段, (v) => 改('长回复拆段', v)), '默认按空行拆分；禁用后整段发送。'),
          行('按句拆分', 勾(配置.按句拆, (v) => 改('按句拆', v)), '按句末标点拆分，括号内标点除外；默认禁用。'),
          行('分段发送间隔（毫秒）', h('input', { type: 'number', min: 0, max: 5000, style: S.small, value: String(配置.拆段间隔毫秒 ?? 450), onChange: (e) => 改('拆段间隔毫秒', Number(e.target.value)) }), '仅在启用拆分时生效，默认 450 毫秒。'),
        ),
        h('div', { style: S.card },
          h('div', { style: { ...S.h, margin: '0 0 8px' } }, '接收与合并'),
          行('合并窗口（秒）', h('input', { type: 'number', min: 0, max: 60, style: S.small, value: String(配置.合并窗口秒 ?? 3), onChange: (e) => 改('合并窗口秒', Number(e.target.value)) }), '同一发言人的连续消息合并处理；0 为禁用，默认 3 秒。'),
          行('最长合并等待（秒）', h('input', { type: 'number', min: 3, max: 300, style: S.small, value: String(配置.合并最多秒 ?? 20), onChange: (e) => 改('合并最多秒', Number(e.target.value)) }), '达到时限后处理已接收的消息，默认 20 秒。'),
          行('消息轮询间隔（毫秒）', h('input', { type: 'number', min: 800, max: 30000, style: S.small, value: String(配置.轮询间隔毫秒 ?? 2000), onChange: (e) => 改('轮询间隔毫秒', Number(e.target.value)) }), '默认 2000 毫秒，修改后需重启 DSH。'),
        ),
        h('div', { style: S.card },
          h('div', { style: { ...S.h, margin: '0 0 8px' } }, '图片'),
          行('接收图片（QQ → DSH）', 勾(配置.收图, (v) => 改('收图', v)), '图片转入目标会话；纯文本模型仅接收图片数量和路径。'),
          行('发送图片（DSH → QQ）', 勾(配置.发图, (v) => 改('发图', v)), '将模型输出的图片转发至 QQ。'),
          行('单条图片上限（张）', h('input', { type: 'number', min: 1, max: 10, style: S.small, value: String(配置.收图最多 ?? 4), onChange: (e) => 改('收图最多', Number(e.target.value)) }), '最多 10 张，超出部分不转发。'),
          行('单张图片上限（MB）', h('input', { type: 'number', min: 1, max: 30, style: S.small, value: String(配置.图上限MB ?? 5), onChange: (e) => 改('图上限MB', Number(e.target.value)) }), '收发共用，超出上限时跳过。'),
          行('图片根目录', h('input', { style: S.wide, placeholder: '留空使用会话工作区', value: String(配置.图片根目录 || ''), onChange: (e) => 改('图片根目录', e.target.value) }), '用于解析 Markdown 图片的相对路径。'),
          h('div', { style: S.dim }, '接收图片保存在 DSH 数据目录的 qq-bridge-inbox 中。'),
        ),
        h('div', { style: S.card },
          h('div', { style: { ...S.h, margin: '0 0 8px' } }, '文件'),
          行('发送文件（DSH → QQ）', 勾(配置.发文件, (v) => 改('发文件', v)), '将正文中的本地文件链接上传至 QQ；图片语法单独处理。'),
          行('单文件上限（MB）', h('input', { type: 'number', min: 1, max: 2048, style: S.small, value: String(配置.文件上限MB ?? 50), onChange: (e) => 改('文件上限MB', Number(e.target.value)) }), '超限时发送说明；同时受 QQ 后端限制。'),
          行('文件仅发送至私聊', 勾(配置.文件仅私聊 !== false, (v) => 改('文件仅私聊', v)), '默认启用；禁用后允许向群聊上传文件。'),
          h('div', { style: S.dim }, '含空格的路径需使用尖括号：[报告](<D:\\我的 文档\\报告.docx>)。网页链接不作为文件处理。'),
        ),
        h('div', { style: S.card },
          h('div', { style: { ...S.h, margin: '0 0 8px' } }, '语音转写'),
          行('转写语音', 勾(配置.语音转写, (v) => 改('语音转写', v)), '通过指定命令转写语音；禁用时仅保留语音标记。'),
          // —— 一键装依赖 ——
          h('div', { style: { ...S.row, alignItems: 'center' } },
            h('div', { style: S.lab }, '语音识别环境'),
            h('div', { style: S.ctl },
              h('div', null,
                按钮(asr忙 ? '…' : (asr && asr.就绪 ? '重新安装' : '安装语音依赖'), 装语音, !(asr && asr.就绪), asr忙 || Boolean(asr && asr.进行中)),
                h('span', { style: S.dim }, '　'),
                按钮('生成转写命令', 填语音命令, false, false)),
              h('div', { style: S.hint },
                asr && asr.就绪 && asr.模型就绪
                  ? '环境与模型已就绪：' + String(asr.python || '')
                  : asr && asr.就绪
                    ? '环境已就绪，模型未下载完成，可重新安装以继续下载。'
                  : '安装独立环境及 sherpa-onnx、numpy 和语音模型。'),
              // 进度
              asr && asr.步骤 && asr.步骤.length
                ? h('div', { style: { marginTop: 8 } },
                  ...asr.步骤.map((x, i) => h('div', { key: i, style: { fontSize: 12 } },
                    (x.态 === '完成' ? '✓ ' : x.态 === '失败' ? '✗ ' : '⋯ ') + x.名 + (x.附 ? '（' + x.附 + '）' : ''))))
                : null,
              // —— 下载进度条（模型 230MB，得让人看见下了多少）——
              asr && asr.下载
                ? h('div', { style: { marginTop: 8 } },
                  h('div', { style: { height: 8, borderRadius: 6, background: 'rgba(128,128,128,.25)', overflow: 'hidden' } },
                    h('div', {
                      style: {
                        height: '100%', width: String(asr.下载.百分比 || 0) + '%',
                        background: 'var(--dsw-alias-state-business-primary)', transition: 'width .4s',
                      },
                    })),
                  h('div', { style: { ...S.dim, marginTop: 4 } },
                    (asr.下载.文件 ? '正在下载 ' + asr.下载.文件 + '：' : '')
                    + '已下载 ' + Math.round((asr.下载.已收 || 0) / 1048576) + 'MB'
                    + (asr.下载.总 ? ' / ' + Math.round(asr.下载.总 / 1048576) + 'MB' : '')
                    + '（' + String(asr.下载.百分比 || 0) + '%）'
                    + (asr.下载.速度KB ? '　约 ' + (asr.下载.速度KB > 1024 ? (asr.下载.速度KB / 1024).toFixed(1) + 'MB/s' : asr.下载.速度KB + 'KB/s') : '')))
                : null,
              asr && asr.进行中 ? h('div', { style: { ...S.dim, marginTop: 4 } }, '正在安装，已用时 ' + String(asr.用时秒 || 0) + ' 秒（每 2 秒刷新一次）') : null,
              asr && asr.失败 ? h('div', { style: { color: '#c0392b', fontSize: 12, marginTop: 4 } }, '✗ ' + asr.失败) : null,
              asr && asr.日志
                ? h('div', { style: { marginTop: 8 } },
                  h('div', { style: S.dim }, '安装日志'),
                  h('div', { style: { ...S.日志行, maxHeight: 160, overflowY: 'auto', whiteSpace: 'pre-wrap', marginTop: 4 } }, String(asr.日志)))
                : null)),
          行('转写命令', h('input', {
            style: S.wide,
            placeholder: 'python D:\\asr_cli.py "{file}"',
            value: String(配置.转写命令 || ''),
            onChange: (e) => 改('转写命令', e.target.value),
          }), '命令须包含 {file}，向 stdout 输出转写文本；非零退出码视为失败。'),
          行('语音模型目录', h('input', {
            style: S.wide,
            placeholder: '安装依赖后自动填写',
            value: String(配置.语音模型目录 || ''),
            onChange: (e) => 改('语音模型目录', e.target.value),
          }), '安装时自动下载模型并填写目录；使用自备模型时可手动修改。'),
          行('超时（秒）', h('input', { type: 'number', min: 5, max: 600, style: S.small, value: String(配置.转写超时秒 ?? 60), onChange: (e) => 改('转写超时秒', Number(e.target.value)) }), '超时后终止命令，默认 60 秒。'),
          h('div', { style: S.dim },
            '内置 tools/asr_cli.py 支持本机 SenseVoice，也可配置其他转写命令。'),
        ),
      ]

      // ───────────── 门槛 ─────────────
      const 门槛卡片 = [
        h('div', { style: S.card },
          h('div', { style: { ...S.h, margin: '0 0 8px' } }, '回复门槛'),
          h('div', { style: S.dim },
            '回复门槛按绑定单独启用。'
            + '私聊不执行门槛判断。'),
          h('div', { style: { ...S.dim, marginTop: 6 } },
            '模型判断消息是否需要回复；未通过判断时不向 QQ 发送回复。'),
          行('未通过门槛时终止推理', 勾(配置.门槛真停轮, (v) => 改('门槛真停轮', v)), '默认仅阻止转发；启用后终止当前轮次，可能显示 tool call aborted。'),
          h('div', { style: { ...S.dim, marginTop: 6 } },
            '启用门槛会新增工具，目标会话的下一次请求可能重新计算上下文。'),
          行('点名关键词', h('input', {
            style: S.wide,
            value: String(配置.点名关键词 || ''),
            placeholder: '留空仅识别 @ 和引用',
            onChange: (e) => 改('点名关键词', e.target.value),
          }), '正文匹配关键词时视为点名；多个关键词以逗号或空格分隔。'),
          h('div', { style: { ...S.dim, marginTop: 8, fontWeight: 600 } }, '群聊接收范围'),
          行('接收全部群消息', 勾(配置.群里听所有人, (v) => 改('群里听所有人', v)),
            '默认仅接收 @ 或引用消息。'
            + '启用后接收全部群消息，由回复门槛判断是否回复。'),
          // ⭐ 1.4.1：被点名之后，同一个群后面紧跟着的几句也放进来（不然接话接不上前文）
          行('点名后续接收上限（条）', h('input', { type: 'number', min: 0, max: 50, style: S.small, value: String(配置.点名后接听条 ?? 5), onChange: (e) => 改('点名后接听条', Number(e.target.value)) }),
            '点名后继续接收同群后续消息，默认 5 条；0 为禁用。'),
          行('点名后续接收时限（秒）', h('input', { type: 'number', min: 0, max: 600, style: S.small, value: String(配置.点名后接听秒 ?? 120), onChange: (e) => 改('点名后接听秒', Number(e.target.value)) }),
            '到期后恢复仅接收点名消息，默认 120 秒。'),
        ),
      ]

      // ───────────── 空间 ─────────────
      const 空间定时 = () => {
        const a = 配置.空间定时发
        return Array.isArray(a) ? a : []
      }
      const 设空间定时 = (下一份) => 改('空间定时发', 下一份)
      const 改空间定时 = (i, 补) => 设空间定时(空间定时().map((x, j) => (j === i ? { ...x, ...补 } : x)))
      const 加空间定时 = () => 设空间定时([...空间定时(), { 时: '09:30', 权: 1, 开: true }].slice(0, 12))
      const 删空间定时 = (i) => 设空间定时(空间定时().filter((_, j) => j !== i))

      const 空间卡片 = [
        h('div', { style: S.card },
          h('div', { style: { ...S.h, margin: '0 0 8px' } }, '开关'),
          行('允许发布 QQ 空间动态', 勾(配置.允许发空间动态, (v) => 改('允许发空间动态', v)), '默认禁用发布，不影响查看动态。'),
          h('div', { style: S.dim }, '共用 QQ 后端连接地址和令牌。'),
        ),
        h('div', { style: S.card },
          h('div', { style: { ...S.h, margin: '0 0 8px' } }, '定时发布'),
          h('div', { style: S.dim }, '按计划触发绑定会话，动态内容由模型生成。'),
          h('div', { style: { ...S.空间表头, marginTop: 10 } },
            h('div', { style: S.表头字 }, '时间'),
            h('div', { style: S.表头字 }, '可见范围'),
            h('div', { style: S.表头字 }, '启用'),
            h('div', { style: S.表头字 }, '')),
          空间定时().length === 0
            ? h('div', { style: { ...S.dim, margin: '8px 0' } }, '暂无条目，请添加。')
            : h('div', null, ...空间定时().map((x, i) => h('div', { key: i, style: S.空间行 },
              h('input', {
                type: 'time', style: S.wide, value: String(x.时 || '09:30'),
                onChange: (e) => 改空间定时(i, { 时: e.target.value }),
              }),
              h('select', {
                style: S.wide, value: String(x.权 || 1),
                onChange: (e) => 改空间定时(i, { 权: Number(e.target.value) }),
              },
                h('option', { value: '1' }, '所有人'),
                h('option', { value: '4' }, '好友'),
                h('option', { value: '64' }, '仅自己')),
              h('div', { style: { textAlign: 'center' } }, 勾(x.开 !== false, (v) => 改空间定时(i, { 开: v }))),
              h('div', null, 按钮('删除', () => 删空间定时(i), false, false))))),
          h('div', { style: { marginTop: 8 } },
            按钮('+ 添加条目', 加空间定时, false, false),
            h('span', { style: S.dim }, '　最多 12 条')),
        ),
        h('div', { style: S.card },
          h('div', { style: { ...S.h, margin: '0 0 8px' } }, '好友动态同步'),
          行('同步间隔（分钟）', h('input', { type: 'number', min: 5, max: 1440, style: S.small, value: String(配置.空间看圈分 ?? 30), onChange: (e) => 改('空间看圈分', Number(e.target.value)) }), '5～1440，默认 30。'),
          行('启用同步', 勾(配置.空间看圈开, (v) => 改('空间看圈开', v)), '启用后定时获取好友动态。'),
        ),
        h('div', { style: S.card },
          h('div', { style: { ...S.h, margin: '0 0 8px' } }, '点赞 / 评论'),
          行('自动点赞', 勾(配置.空间点赞开, (v) => 改('空间点赞开', v)), '同步时点赞近期未处理动态，每次最多 3 条、每日最多 20 条。'),
          行('允许评论', 勾(配置.空间评论开, (v) => 改('空间评论开', v)), '将新动态转入会话，由模型决定是否评论及评论内容。'),
        ),
      ]

      // ───────────── 更新 ─────────────
      const 查更新 = async () => {
        设更新忙(true)
        const r = await get('/update?refresh=1')
        if (r) 设更新(r)
        设更新忙(false)
        设说(!r ? '更新检查失败：网络异常' : r.hasUpdate ? '可用版本 v' + r.latest : r.ok ? '当前为最新版本' : '检查失败：' + (r.error || '网络'))
      }
      // ⭐ 2026-11-01：查到新版就一键装（宿主的 pluginManager.installBundle）
      const 一键更新 = async () => {
        设更新忙(true)
        设说('正在安装…')
        try {
          const r = await post('/install', {})
          设说(r && r.ok ? '安装已启动，完成后请重启或重载 DSH' : '安装失败：' + ((r && r.error) || '未知原因'))
        } catch (e) {
          设说('安装失败：' + ((e && e.message) || e))
        }
        设更新忙(false)
      }
      const 更新页 = h('div', null,
        h('div', { style: S.card },
          h('div', { style: { ...S.h, margin: '0 0 8px' } }, '检查更新'),
          h('div', { style: S.dim },
            !更新 ? '正在检查更新…'
              : 更新.hasUpdate ? '可用版本 v' + 更新.latest
                : 更新.ok ? '当前为最新版本' : '检查失败（' + (更新.error || '网络') + '）'),
          h('div', { style: { marginTop: 6 } }, 按钮(更新忙 ? '检查中…' : '检查更新', 查更新, false, 更新忙)),
          更新 && 更新.hasUpdate
            ? h('div', { style: { marginTop: 8 } },
              (更新 && 更新.canInstall)
                ? 按钮(更新忙 ? '安装中…' : '更新至 v' + 更新.latest, 一键更新, false, 更新忙)
                : h('div', { style: S.dim }, '本地开发版本，请手动更新。'),
              h('div', { style: S.dim }, '安装完成后请重启或重载 DSH。'))
            : null,
        ),
      )

      const 总览页 = h('div', { style: S.stack }, 总览卡片[1], 总览卡片[3])
      const 配置页 = h('div', { style: S.stack },
        h('div', { style: S.dim }, '统一管理连接、会话和收发策略。修改后请保存设置。'),
        h('details', { style: S.group, open: true },
          h('summary', { style: S.summary }, '连接与通知'),
          h('div', { style: S.grid }, 消息卡片[0], 总览卡片[0])),
        h('details', { style: S.group, open: true },
          h('summary', { style: S.summary }, '会话绑定与角色'),
          h('div', { style: S.stack }, 绑定卡片[1], 绑定卡片[0])),
        h('details', { style: S.group },
          h('summary', { style: S.summary }, '消息收发'),
          h('div', { style: S.grid }, 消息卡片[1], 消息卡片[2])),
        h('details', { style: S.group },
          h('summary', { style: S.summary }, '群聊回复策略'),
          h('div', { style: S.grid }, 绑定卡片[2], 门槛卡片[0])),
        h('details', { style: S.group },
          h('summary', { style: S.summary }, '图片、文件与语音'),
          h('div', { style: S.stack }, h('div', { style: S.grid }, 消息卡片[3], 消息卡片[4]), 消息卡片[5])),
        h('details', { style: S.group },
          h('summary', { style: S.summary }, 'QQ 空间'),
          h('div', { style: S.grid }, ...空间卡片)),
      )

      return h(
        'div',
        { style: S.wrap },
        h('div', { style: S.h }, '通到 QQ'),
        h('div', { style: S.dim },
          'QQ 与 DSH 双向消息转发及历史记忆导入。'
            + '版本 ' + String(态.版本 || '?') + '｜配置文件：' + String(态.配置文件 || '')),
        NapCat && !NapCat.错
          ? h('div', { style: S.已同步 }, '✓ 已连接 QQ：' + NapCat.昵称 + '（' + NapCat.用户 + '）')
          : h('div', { style: S.未保存 }, '⚠ QQ 后端未连接（NapCat / SnowLuma）' + (NapCat && NapCat.错 ? '：' + NapCat.错 : '')),
        页签,
        h('div', { style: 脏 ? S.未保存 : S.已同步 },
          脏 ? '存在未保存的配置' : '配置已保存 ✓'),
        h('div', { style: { marginBottom: 14 } }, 总览卡片[2]),
        页 === '总览' ? 总览页 : null,
        页 === '绑定' ? 配置页 : null,
        页 === '历史导入' ? 历史页 : null,
        页 === '更新' ? 更新页 : null,
        脏
          ? h('div', { style: S.悬浮保存条 },
            h('span', { style: { fontWeight: 600, color: '#c0392b' } }, '存在未保存的配置'),
            h('span', { style: S.dim }, '保存后生效'),
            按钮('保存设置', 存, true, 忙))
          : null,
      )
    }

    function apply(ctx) {
      const slots = ctx.get('slots')
      if (slots === undefined) return
      slots.inject('settings.section', () =>
        slots.register(
          { name: 'settings.section', id: 'qq-bridge', order: 54, label: () => '通到 QQ' },
          Section,
        ),
      )
    }

    exports.apply = apply
    exports.inject = inject
    return module.exports
  },
})
