import { spawnSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const webRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')

function loadEnvFile(name) {
  const p = resolve(webRoot, name)
  if (!existsSync(p)) return
  for (const line of readFileSync(p, 'utf8').split(/\r?\n/)) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eq = trimmed.indexOf('=')
    if (eq <= 0) continue
    let value = trimmed.slice(eq + 1).trim()
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
      value = value.slice(1, -1)
    }
    process.env[trimmed.slice(0, eq).trim()] = value
  }
}

const args = process.argv.slice(2)
const envFileName = args[0]?.endsWith('.env') ? args.shift() : 'prod.env'
loadEnvFile(envFileName)

const command = args[0] ?? 'vite'
const commandArgs = args.slice(1)
const result = spawnSync(command, commandArgs, { cwd: webRoot, env: process.env, stdio: 'inherit', shell: true })
process.exit(result.status ?? 1)

