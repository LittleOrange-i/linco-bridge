import { defineConfig, type Plugin, type ViteDevServer } from 'vite'
import type { AcceptedPlugin } from 'postcss'
import vue from '@vitejs/plugin-vue'
import { cpSync, createReadStream, existsSync, statSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, URL } from 'node:url'
import compileRpx from './scripts/postcss-rpx.cjs'

const __dirname = dirname(fileURLToPath(import.meta.url))
const STATIC_SRC = resolve(__dirname, 'src/static')
const STATIC_URL_PREFIX = '/static/'

const MIME_TYPES: Record<string, string> = {
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
}

/**
 * Serves src/static at /static/** in dev and copies it into dist/static on build,
 * matching the original UniApp H5 asset layout used by all icon URLs.
 */
function staticAssets(): Plugin {
  return {
    name: 'linco-static-assets',
    configureServer(server: ViteDevServer) {
      server.middlewares.use((req, res, next) => {
        if (!req.url?.startsWith(STATIC_URL_PREFIX)) {
          next()
          return
        }
        const rel = decodeURIComponent(req.url.slice(STATIC_URL_PREFIX.length).split('?')[0])
        const filePath = join(STATIC_SRC, rel)
        if (
          !filePath.startsWith(STATIC_SRC) ||
          !existsSync(filePath) ||
          !statSync(filePath).isFile()
        ) {
          res.statusCode = 404
          res.end('Not Found')
          return
        }
        res.setHeader(
          'Content-Type',
          MIME_TYPES[filePath.slice(filePath.lastIndexOf('.')).toLowerCase()] ??
            'application/octet-stream',
        )
        createReadStream(filePath).pipe(res)
      })
    },
    closeBundle() {
      cpSync(STATIC_SRC, resolve(__dirname, 'dist/static'), { recursive: true })
    },
  }
}

export default defineConfig({
  plugins: [vue(), staticAssets()],
  resolve: {
    alias: {
      '@': fileURLToPath(new URL('./src', import.meta.url)),
    },
  },
  css: {
    postcss: {
      plugins: [compileRpx as unknown as AcceptedPlugin],
    },
    preprocessorOptions: {
      scss: {
        api: 'modern-compiler',
        additionalData: '@use "@/uni.scss" as *;\n',
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://127.0.0.1:3300',
        changeOrigin: true,
      },
    },
  },
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
})
