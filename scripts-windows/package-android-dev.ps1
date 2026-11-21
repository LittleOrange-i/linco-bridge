# 一键打包安装安卓开发版（Debug APK）
# 流程：读取 web\android.env 的服务器地址 - 构建 H5 - cap sync
#       - gradle 编译 Debug APK - adb 安装到已连接的设备
# 注意：手机与电脑需在同一局域网；电脑 IP 变化后先更新
#       linco-bridge-platform\web\android.env 再重新打包。
# 入口：仓库根目录的中文名 .bat（纯 ASCII 包装）。本文件必须保持 UTF-8 with BOM。

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$webDir = Join-Path $repoRoot 'linco-bridge-platform\web'
$androidDir = Join-Path $webDir 'android'
$apkPath = Join-Path $androidDir 'app\build\outputs\apk\debug\app-debug.apk'
$script:adbOk = $false

Write-Host '[1/4] 检查运行环境...'
if (-not (Get-Command node -ErrorAction SilentlyContinue)) {
  throw '未找到 Node.js，请先安装 Node.js 22 LTS 并加入 PATH。'
}
if (Get-Command adb -ErrorAction SilentlyContinue) {
  $script:adbOk = $true
} else {
  Write-Host '[提示] 未在 PATH 中找到 adb，安装步骤将跳过，只产出 APK。'
}

Write-Host '[2/4] 构建 H5 资源并同步到安卓工程...'
Push-Location $webDir
try {
  if (-not (Test-Path (Join-Path $webDir 'node_modules'))) {
    Write-Host '首次运行，安装 web 依赖...'
    cmd /c 'npm install'
    if ($LASTEXITCODE -ne 0) { throw 'npm install 失败。' }
  }
  cmd /c 'npm run android:build:env'
  if ($LASTEXITCODE -ne 0) { throw 'H5 构建失败，请查看上方日志。' }

  Write-Host '[3/4] 编译安卓 Debug APK...'
  Push-Location $androidDir
  try {
    cmd /c 'gradlew.bat :app:assembleDebug'
    if ($LASTEXITCODE -ne 0) { throw 'APK 编译失败，请查看上方日志。' }
  } finally { Pop-Location }
} finally { Pop-Location }

if (-not (Test-Path $apkPath)) { throw "未找到产物 APK: $apkPath" }
Write-Host "APK 已生成: $apkPath"

if (-not $script:adbOk) {
  Write-Host '[警告] 未找到 adb，跳过自动安装。'
  Write-Host '       请手动将上方 APK 传到手机安装，或安装 Android platform-tools 后重跑。'
  return
}

Write-Host '[4/4] 安装到已连接的安卓设备...'
$deviceOnline = ((adb devices) | Where-Object { $_ -match '\S\s+device\s*$' }).Count -gt 0
if (-not $deviceOnline) {
  Write-Host '[警告] 未检测到已连接的安卓设备。'
  Write-Host '       请用 USB 连接手机并开启 USB 调试，或配置无线 adb 后重新运行。'
  return
}
adb install -r $apkPath
if ($LASTEXITCODE -ne 0) { throw 'adb install 失败，请查看上方日志。' }
Write-Host ''
Write-Host '[完成] 打包并安装成功！在手机上打开应用即可使用。'
Write-Host '       服务器地址以 web\android.env 配置为准（见构建日志）。'
