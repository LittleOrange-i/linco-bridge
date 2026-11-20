const platform = process.argv[2] ?? 'unknown-platform'
console.error(`[removed-platform] ${platform} 构建已从 UniApp 迁移中移除。当前支持：Web (npm run build:web) 与 Android (npm run android:build)。`)
process.exit(1)
