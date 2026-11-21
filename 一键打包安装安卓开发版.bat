@echo off
setlocal
cd /d "%~dp0"

rem ============================================================
rem  一键打包安装安卓开发版（Debug APK）
rem  流程：读取 web\android.env 的服务器地址 - 构建 H5 - cap sync
rem        - gradle 编译 Debug APK - adb 安装到已连接的设备
rem  注意：手机与电脑需在同一局域网；电脑 IP 变化后先更新
rem        linco-bridge-platform\web\android.env 再重新打包
rem  本文件为 GBK 编码（cmd 中文 Windows 原生解析），勿转 UTF-8
rem ============================================================

echo [1/4] 检查运行环境...
where node >nul 2>nul
if errorlevel 1 (
  echo [错误] 未找到 Node.js，请先安装 Node.js 22 LTS 并加入 PATH。
  goto :fail
)
where adb >nul 2>nul
if errorlevel 1 (
  echo [提示] 未在 PATH 中找到 adb，安装步骤将跳过，只产出 APK。
  set "ADB_OK=0"
) else (
  set "ADB_OK=1"
)

echo [2/4] 构建 H5 资源并同步到安卓工程...
pushd linco-bridge-platform\web
if not exist node_modules (
  echo 首次运行，安装 web 依赖...
  call npm install
  if errorlevel 1 goto :fail
)
call npm run android:build:env
if errorlevel 1 goto :fail

echo [3/4] 编译安卓 Debug APK...
pushd android
call gradlew.bat :app:assembleDebug
if errorlevel 1 goto :fail
popd
popd

set "APK=%~dp0linco-bridge-platform\web\android\app\build\outputs\apk\debug\app-debug.apk"
if not exist "%APK%" (
  echo [错误] 未找到产物 APK: %APK%
  goto :fail
)
echo APK 已生成: %APK%

if "%ADB_OK%"=="0" goto :no_adb

echo [4/4] 安装到已连接的安卓设备...
adb devices | findstr /V "List" | findstr /R "device *$" >nul
if errorlevel 1 goto :no_device
adb install -r "%APK%"
if errorlevel 1 goto :fail
echo.
echo [完成] 打包并安装成功！在手机上打开应用即可使用。
echo        服务器地址以 web\android.env 配置为准（见构建日志）。
goto :done

:no_adb
echo.
echo [警告] 未找到 adb，跳过自动安装。
echo        请手动将上方 APK 传到手机安装，或安装 Android platform-tools 后重跑。
goto :done

:no_device
echo.
echo [警告] 未检测到已连接的安卓设备。
echo        请用 USB 连接手机并开启 USB 调试，或配置无线 adb 后重新运行。
goto :done

:done
echo.
pause
exit /b 0

:fail
echo.
echo [失败] 脚本执行失败，请查看上方日志。
pause
exit /b 1
