import test from 'node:test'
import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

// ⭐ 1.5.2：转写命令里的脚本路径失效（仓库改名 / 插件升级到新目录）→ 自动换成本包自带那份。
//   host.js 依赖宿主环境，整体 import 不起来，所以把那个纯函数抠出来测。

function 取函数() {
  const 文 = readFileSync(join(process.cwd(), 'lib', 'host.js'), 'utf8')
  const 起 = 文.indexOf('function 修转写脚本(')
  const 止 = 文.indexOf('function 跑命令(')
  assert.ok(起 > 0 && 止 > 起, 'host.js 里应该找得到 修转写脚本')
  const 段 = 文.slice(起, 止)
  const PACKAGE_ROOT = process.cwd()
  // eslint-disable-next-line no-new-func
  return new Function('existsSync', 'join', 'PACKAGE_ROOT', 段 + '; return 修转写脚本')(existsSync, join, PACKAGE_ROOT)
}

const 自带 = join(process.cwd(), 'tools', 'asr_cli.py')
const 引 = (p) => '"' + p + '"'

test('自带的 asr_cli.py 确实在包里', () => {
  assert.equal(existsSync(自带), true)
})

test('路径失效 → 换成包里自带那份', () => {
  const 修 = 取函数()
  const 坏 = 引('C:/x/python.exe') + ' ' + 引(join('D:', '不存在的仓库', 'tools', 'asr_cli.py')) + ' "{file}" --模型目录 "C:/m"'
  const 新 = 修(坏)
  assert.ok(新.includes(自带), '应该换成包里那份')
  assert.ok(新.includes('{file}'), '占位符不能弄丢')
  assert.ok(新.includes('--模型目录'), '后面的参数不能弄丢')
})

test('路径是好的 → 一个字都不动', () => {
  const 修 = 取函数()
  const 好 = 引('C:/x/python.exe') + ' ' + 引(自带) + ' "{file}"'
  assert.equal(修(好), 好)
})

test('没有 .py 的命令原样返回', () => {
  const 修 = 取函数()
  const 命令 = 'whisper-cli --file "{file}"'
  assert.equal(修(命令), 命令)
})

test('空命令不炸', () => {
  const 修 = 取函数()
  assert.equal(修(''), '')
  assert.equal(修(null), '')
})
