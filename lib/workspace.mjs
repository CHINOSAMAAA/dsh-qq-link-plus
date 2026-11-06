import { existsSync, readFileSync, statSync } from 'node:fs'
import { basename, isAbsolute, join } from 'node:path'

export function createWorkspaceBinding({ home, ctx = {}, config = () => {
  try { return JSON.parse(readFileSync(join(home, 'qq-bridge-config.json'), 'utf8')) } catch { return {} }
} }) {
  const list = () => {
    let registry
    try { registry = ctx.workspaceRegistry || ctx.get?.('workspaceRegistry') } catch {}
    let rows
    if (typeof registry?.list === 'function') rows = registry.list().map(w => ({ id: w.id, path: w.path, title: w.title }))
    else {
      const path = join(home, 'storages/workspace.json')
      rows = existsSync(path) ? Object.entries(JSON.parse(readFileSync(path, 'utf8')).tables?.workspaces || {}).map(([id, w]) => ({ ...w, id })) : []
    }
    return rows.filter(w => w.id && typeof w.path === 'string' && isAbsolute(w.path)).map(w => {
      let available = false
      try { available = statSync(w.path).isDirectory() } catch {}
      return { id: String(w.id), path: w.path, title: String(w.title || basename(w.path) || w.path), available }
    })
  }
  const directory = (id = config().工作区) => {
    if (!id) throw new Error('未绑定工作区')
    const workspace = list().find(w => w.id === id)
    if (!workspace?.available) throw new Error('工作区不可用')
    return workspace.path
  }
  return { list, directory, id: () => config().工作区 || '' }
}
