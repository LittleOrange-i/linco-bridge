const { existsSync } = require('node:fs')
const { join } = require('node:path')

const errors = []
const sdk = process.env.ANDROID_HOME || process.env.ANDROID_SDK_ROOT
if (!sdk || !existsSync(sdk)) errors.push('未找到 Android SDK，请设置 ANDROID_HOME 或 ANDROID_SDK_ROOT')
else {
  if (!existsSync(join(sdk, 'platforms', 'android-35'))) errors.push('缺少 Android SDK Platform 35')
  if (!existsSync(join(sdk, 'build-tools', '35.0.0'))) errors.push('缺少 Android SDK Build Tools 35.0.0（更高版本也可手动调整 variables.gradle）')
}

if (!process.env.JAVA_HOME || !existsSync(join(process.env.JAVA_HOME, 'bin', 'java.exe'))) {
  errors.push('未找到 JDK，请设置 JAVA_HOME（推荐 JDK 17）')
}

if (errors.length) {
  console.error('[android:check] 前置条件不满足：')
  for (const error of errors) console.error(` - ${error}`)
  process.exit(1)
}

console.log(`[android:check] OK  SDK=${sdk}  JAVA_HOME=${process.env.JAVA_HOME}`)
