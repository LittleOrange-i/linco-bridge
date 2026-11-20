import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { execSync } from 'node:child_process'
import { join, relative, resolve } from 'node:path'

const webRoot = process.cwd()
const repoRoot = execSync('git rev-parse --show-toplevel', { encoding: 'utf8' }).trim()

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full, files)
    else if (name.endsWith('.vue')) files.push(full)
  }
  return files
}

const vueFiles = walk(join(webRoot, 'src'))
let patched = 0

for (const abs of vueFiles) {
  const repoPath = relative(repoRoot, abs).replace(/\\/g, '/')
  let head
  try {
    head = execSync(`git show "HEAD:${repoPath}"`, { encoding: 'utf8' })
  } catch {
    continue
  }
  const classes = [...head.matchAll(/<scroll-view\b[^>]*class="([^"]*)"/g)]
    .map((m) => m[1])
    .filter((c) => c.trim())

  let text = readFileSync(abs, 'utf8')
  const before = text
  for (const cls of classes) {
    const first = cls.trim().split(/\s+/)[0]
    if (!first) continue
    const tagRe = new RegExp(`(<div\\b[^>]*class=")([^"]*\\b${first}\\b[^"]*)(")`)
    if (tagRe.test(text)) {
      text = text.replace(tagRe, (whole, open, existing, close) =>
        existing.includes('uni-scroll-view') ? whole : `${open}uni-scroll-view ${existing}${close}`,
      )
    }
  }

  text = text.replace(
    /\s+(refresher-enabled|:refresher-triggered="[^"]*"|scroll-with-animation|:scroll-with-animation="[^"]*"|:show-scrollbar="[^"]*")/g,
    '',
  )

  if (text !== before) {
    writeFileSync(abs, text, 'utf8')
    patched += 1
  }
}
console.log(`[scroll-fix] patched ${patched} files`)
