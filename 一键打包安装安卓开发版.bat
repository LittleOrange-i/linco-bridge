
@echo off
rem One-click: build H5 + Capacitor sync + gradle debug APK + adb install
rem Implementation: scripts-windows\package-android-dev.ps1 (UTF-8 BOM)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts-windows\package-android-dev.ps1"
pause
