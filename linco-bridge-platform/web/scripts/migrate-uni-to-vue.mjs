/**
 * One-time migration helper: UniApp -> plain Vue 3 + Vite (H5/Web).
 * Keeps a copy of this script for traceability; run with `node scripts/migrate-uni-to-vue.mjs`.
 */
import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs'
import { join, extname, relative } from 'node:path'

const root = process.cwd()
const src = join(root, 'src')
const skip = new Set(['src/platform-runtime.ts', 'src/utils/platform-runtime.ts', 'src/main.ts', 'src/App.vue'])

function walk(dir, files = []) {
  for (const name of readdirSync(dir)) {
    const full = join(dir, name)
    if (statSync(full).isDirectory()) walk(full, files)
    else files.push(full)
  }
  return files
}

function stripConditionals(text, kind) {
  const lines = text.split(/\r?\n/)
  const out = []
  const stack = []
  for (const line of lines) {
    const t = line.trim()
    if (kind === 'ts') {
      let match = /^\/\/\s*#ifdef\s+(.+)$/.exec(t)
      if (match) {
        const cond = match[1].trim()
        stack.push(stack.at(-1) !== false && cond === 'H5')
        continue
      }
      match = /^\/\/\s*#ifndef\s+(.+)$/.exec(t)
      if (match) {
        const cond = match[1].trim()
        stack.push(stack.at(-1) !== false && cond !== 'H5')
        continue
      }
      if (/^\/\/\s*#endif\b/.test(t)) {
        stack.pop()
        continue
      }
    } else {
      let match = /^<!--\s*#ifdef\s+(.+?)\s*-->/.exec(t)
      if (match) {
        const cond = match[1].trim()
        stack.push(stack.at(-1) !== false && cond === 'H5')
        continue
      }
      match = /^<!--\s*#ifndef\s+(.+?)\s*-->/.exec(t)
      if (match) {
        const cond = match[1].trim()
        stack.push(stack.at(-1) !== false && cond !== 'H5')
        continue
      }
      if (/^<!--\s*#endif\s*-->/.test(t)) {
        stack.pop()
        continue
      }
    }
    if (stack.length === 0 || stack.at(-1) !== false) out.push(line)
  }
  return out.join('\n')
}

function convertVue(text) {
  let t = stripConditionals(text, 'vue')
  t = t.replace(/from '@dcloudio\/uni-app'/g, "from '@/composables/uni-lifecycle'")
  t = t.replace(/<view\b/g, '<div').replace(/<\/view>/g, '</div>')
  t = t.replace(/<text\b/g, '<span').replace(/<\/text>/g, '</span>')
  t = t.replace(/<image\b/g, '<img').replace(/<\/image>/g, '</img>')
  t = t.replace(/<scroll-view\b/g, '<div').replace(/<\/scroll-view>/g, '</div>')
  t = t.replace(/@tap\b/g, '@click')
  t = t.replace(/\s+scroll-y(?=[\s/>])/g, '')
  t = t.replace(/\s+:show-scrollbar="[^"]*"/g, '')
  t = t.replace(/\s+mode="aspect(Fit|Fill)"/g, ' class="img-cover"')
  t = t.replace(/\s+placeholder-class="[^"]*"/g, '')
  t = t.replace(/\s+auto-height(?=[\s/>])/g, '')
  t = t.replace(/\s+:maxlength="-1"/g, '')
  t = t.replace(/confirm-type="[^"]*"/g, 'enterkeyhint="search"')
  t = t.replace(/:focus="([^"]+)"/g, 'v-focus="$1"')
  t = t.replace(/@confirm=/g, '@keydown.enter=')
  return t
}

function convertTs(text) {
  let t = stripConditionals(text, 'ts')
  t = t.replace(/from '@dcloudio\/uni-app'/g, "from '@/composables/uni-lifecycle'")
  return t
}

let changed = 0
for (const file of walk(src)) {
  const rel = relative(root, file).replace(/\\/g, '/')
  if (skip.has(rel) || ![ '.ts', '.vue' ].includes(extname(file))) continue
  const before = readFileSync(file, 'utf8')
  const after = extname(file) === '.vue' ? convertVue(before) : convertTs(before)
  if (after !== before) {
    writeFileSync(file, after, 'utf8')
    changed += 1
  }
}
console.log(`[migrate] updated ${changed} files`)
