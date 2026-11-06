import { execFile } from 'node:child_process'
import { existsSync } from 'node:fs'
import { homedir } from 'node:os'
import { join } from 'node:path'
import { promisify } from 'node:util'

const exec = promisify(execFile)
const run = async args => {
  const options = { timeout: 4000, maxBuffer: 512 * 1024 }
  try { return (await exec('docker', args, options)).stdout }
  catch (error) {
    // macOS apps launched from Finder may not inherit the Docker CLI's PATH.
    const cli = process.platform === 'darwin' && ['/usr/local/bin/docker', join(homedir(), '.docker/bin/docker'), '/Applications/Docker.app/Contents/Resources/bin/docker'].find(existsSync)
    if (error.code !== 'ENOENT' || !cli) throw error
    return (await exec(cli, args, options)).stdout
  }
}

// Inspect only the local container publishing the already authenticated HTTP endpoint.
export async function dockerOneBotSockets(config, selfId, runCommand = run) {
  const http = new URL(config.NapCat)
  if (!['127.0.0.1', 'localhost', '[::1]', 'host.docker.internal'].includes(http.hostname) || !/^\d+$/.test(String(selfId))) return []
  const port = http.port || (http.protocol === 'https:' ? '443' : '80')
  const ids = (await runCommand(['ps', '-q', '--filter', 'publish=' + port])).trim().split(/\s+/).filter(Boolean)
  const output = []
  for (const id of ids.slice(0, 4)) {
    const [container] = JSON.parse(await runCommand(['inspect', id])), ports = container.NetworkSettings?.Ports || {}
    const entry = Object.entries(ports).find(([, values]) => values?.some(p => p.HostPort === port))
    if (!entry) continue
    const script = `
      const fs = require('fs'), account = process.argv[1], records = [];
      for (const root of ['/app/data/config', '/app/napcat/config']) {
        for (const name of ['onebot_' + account + '.json', 'onebot11_' + account + '.json', 'onebot.json']) {
          try {
            const config = JSON.parse(fs.readFileSync(root + '/' + name)), network = config.networks || config.network || {};
            records.push({ http: network.httpServers || [], ws: network.wsServers || network.websocketServers || [] });
          } catch {}
        }
      }
      process.stdout.write(JSON.stringify(records));`
    const records = JSON.parse(await runCommand(['exec', id, 'node', '-e', script, String(selfId)]))
    for (const record of records) {
      if (!record.http.some(h => String(h.port) === entry[0].split('/')[0] && String(h.accessToken ?? h.token ?? '') === String(config.令牌 || '') && h.enabled !== false && h.enable !== false)) continue
      for (const ws of record.ws) {
        const mapped = ports[ws.port + '/tcp']?.[0]
        if (!mapped || ws.enabled === false || ws.enable === false || String(ws.role).toLowerCase() === 'api') continue
        const url = new URL(config.NapCat)
        url.protocol = http.protocol === 'https:' ? 'wss:' : 'ws:'; url.port = mapped.HostPort
        url.pathname = ws.path || '/'; url.search = ''; url.hash = ''
        if (ws.accessToken || ws.token) url.searchParams.set('access_token', ws.accessToken || ws.token)
        output.push(url.href)
      }
    }
  }
  return [...new Set(output)]
}
