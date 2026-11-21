
@echo off
rem One-click: start desktop services (NestJS server 3300 + local connector)
rem Implementation: scripts-windows\start-desktop-services.ps1 (UTF-8 BOM)
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts-windows\start-desktop-services.ps1"
pause
