# 一键启动电脑端服务（局域网/开发模式）
# 打开两个命令行窗口：
#   1. API 服务器  - linco-bridge-platform/server，监听 3300
#   2. 本机连接器  - linco-connect，桥接本机 Codex Desktop / DeepSeek Harness 与服务器
# 关闭对应窗口即可停止对应服务。公网部署说明见 README 的「公网部署」一节。
# 入口：仓库根目录的中文名 .bat（纯 ASCII 包装）。本文件必须保持 UTF-8 with BOM。

$ErrorActionPreference = 'Stop'
$repoRoot = Split-Path -Parent $PSScriptRoot
$serverDir = Join-Path $repoRoot 'linco-bridge-platform\server'
$connectorDir = Join-Path $repoRoot 'linco-bridge-connect'

Write-Host '正在启动电脑端服务...'
Write-Host '[1/2] 启动 API 服务器（端口 3300）...'
$serverCmd = "title Linco 服务器(3300) && cd /d `"$serverDir`" && (if not exist node_modules (echo 首次运行，安装依赖... && call npm install)) && npm run start:dev"
Start-Process -FilePath 'cmd.exe' -ArgumentList '/k', $serverCmd

Write-Host '[2/2] 启动本机连接器（桥接 Codex Desktop / DeepSeek Harness）...'
$connectorCmd = "title Linco 连接器 && cd /d `"$connectorDir`" && (if not exist node_modules (echo 首次运行，安装依赖... && call npm install)) && node bin\linco-connect.js start"
Start-Process -FilePath 'cmd.exe' -ArgumentList '/k', $connectorCmd

Write-Host ''
Write-Host '两个服务已在新的命令行窗口启动：'
Write-Host '  - 服务器窗口：REST + WebSocket 中继，监听 http://127.0.0.1:3300'
Write-Host '  - 连接器窗口：读取 %USERPROFILE%\.linco\config.json 连接服务器，'
Write-Host '    自动发现 Codex Desktop 自带 codex.exe，无需官方账号登录'
Write-Host ''
Write-Host '手机端（同一局域网）访问：http://本机IP:3300'
Write-Host '本机 IP 可用 ipconfig 查看；IP 变化后记得同步更新'
Write-Host 'linco-bridge-platform\web\android.env 并重新打包安卓端。'
