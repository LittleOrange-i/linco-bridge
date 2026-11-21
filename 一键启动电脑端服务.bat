@echo off
setlocal
cd /d "%~dp0"

rem ============================================================
rem  一键启动电脑端服务（局域网/开发模式）
rem  会打开两个命令行窗口：
rem    1. API 服务器  - linco-bridge-platform/server，监听 3300
rem    2. 本机连接器  - linco-connect，桥接本机 Codex Desktop /
rem       DeepSeek Harness 与服务器
rem  关闭对应窗口即可停止对应服务。
rem  公网部署说明见 README 的「公网部署」一节。
rem  本文件为 GBK 编码（cmd 中文 Windows 原生解析），勿转 UTF-8
rem ============================================================

echo 正在启动电脑端服务...

echo [1/2] 启动 API 服务器（端口 3300）...
start "Linco 服务器(3300)" cmd /k "cd /d "%~dp0linco-bridge-platform\server" && (if not exist node_modules (echo 首次运行，安装依赖... && npm install) ) && npm run start:dev"

echo [2/2] 启动本机连接器（桥接 Codex Desktop / DeepSeek Harness）...
start "Linco 连接器" cmd /k "cd /d "%~dp0linco-bridge-connect" && (if not exist node_modules (echo 首次运行，安装依赖... && npm install) ) && node bin\linco-connect.js start"

echo.
echo 两个服务已在新的命令行窗口启动：
echo   - 服务器窗口：REST + WebSocket 中继，监听 http://127.0.0.1:3300
echo   - 连接器窗口：读取 %%USERPROFILE%%\.linco\config.json 连接服务器，
echo     自动发现 Codex Desktop 自带 codex.exe，无需官方账号登录
echo.
echo 手机端（同一局域网）访问：http://本机IP:3300
echo 本机 IP 可用 ipconfig 查看；IP 变化后记得同步更新
echo linco-bridge-platform\web\android.env 并重新打包安卓端。
echo.
pause
exit /b 0
