# 安卓端构建与运行指南

本文说明如何在安卓设备上安装与运行 Linco Bridge 移动端（Vue 3 + Capacitor 打包的 Debug APK），包含一键脚本、手动构建、真机验证与常见问题。

## 先明确结论

| 问题 | 结论 |
| --- | --- |
| 本仓库能否直接构建出安卓 APK？ | **能。** `linco-bridge-platform/web/android` 是完整的 Capacitor 安卓工程，仓库根目录提供中文一键脚本。 |
| 是否需要手机号登录？ | **不需要。** 移动端使用匿名访客 Session 自动隔离数据；连接器凭证是页面生成的 `appId:appSecret`。 |
| Codex 需要官方账号登录吗？ | **不需要。** 连接器自动发现 Codex Desktop 自带的 codex 二进制；`~/.codex/config.toml` 使用第三方 API（如 CC Switch）即可跑通任务列表与对话，也不要求安装 codex CLI。 |

## 一、环境准备

| 项目 | 要求 |
| --- | --- |
| Node.js | 20 或 22–26，推荐 22 LTS；连接器依赖原生模块 `better-sqlite3`，不支持 Node.js 21。 |
| Android 工具链 | JDK 17+ 与 Android SDK（首次构建由 Gradle 自动补齐依赖）；或已装 Android Studio。 |
| adb | 用于一键安装；Android platform-tools 目录加入 PATH，或只产出 APK 手动传输。 |
| 安卓设备 | 开启 USB 调试，与电脑同一局域网（局域网联调时）。 |
| 电脑侧 Agent | Codex（Desktop 或 CLI）、Claude Code、DeepSeek Harness、Hermes、OpenClaw 任一。 |

## 二、必要配置

### 1. 服务器地址（安卓端）

移动端构建前从 `linco-bridge-platform/web/android.env` 读取服务器地址：

```ini
VITE_API_BASE_URL=http://192.168.123.11:3300
VITE_USE_REMOTE_API=true
```

- 手机与电脑必须在同一局域网；
- **电脑 IP 变化后必须同步更新此文件并重新打包**；
- 公网部署时改成公网地址（如 `https://bridge.example.com`）。

### 2. 服务器（`linco-bridge-platform/server`）

默认监听 `http://127.0.0.1:3300`。常用环境变量：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `3300` | HTTP 与 WebSocket 端口。 |
| `PUBLIC_HOST` | `127.0.0.1` | 公网部署改为你的域名；非回环地址时生成的连接命令自动切换 `https`/`wss`。 |
| `CORS_ORIGINS` | 开发放行全部；生产禁止跨域 | 生产环境必须填入实际前端域名。 |
| `VISITOR_SESSION_SECRET` | 开发有回退值；生产必填 | 匿名访客 Session 的 HMAC 签名密钥，勿提交仓库。 |
| `SQLITE_PATH` | `./data/linco-bridge.db` | SQLite 数据文件位置。 |

### 3. 连接器凭证

无需手机号。打开移动端 **桥接** 页面，选择 Agent 导入方式，页面生成含 `appId:appSecret` 的 `setupCommands`；在电脑侧执行即可（或直接用仓库根的 `一键启动电脑端服务.bat` 启动服务后按页面命令 init）。

## 三、一键脚本（Windows，仓库根目录）

| 脚本 | 作用 |
| --- | --- |
| `一键启动电脑端服务.bat` | 启动服务器(3300) + 本机连接器，各占一个命令行窗口，关窗即停。 |
| `一键打包安装安卓开发版.bat` | 读取 `android.env` → 构建 H5 → Capacitor sync → 编译 Debug APK → `adb install -r` 到已连接设备。 |

打包脚本对 adb 的三种情况都会明确提示：未安装 adb（只产出 APK）、无设备连接（提示连接后重跑）、安装成功。

## 四、手动构建（可选）

```bash
cd linco-bridge-platform/web
npm install
npm run android:build:env        # 读 android.env 构建 H5 并 cap sync
cd android
gradlew.bat :app:assembleDebug   # 编译 Debug APK
```

产物：`linco-bridge-platform/web/android/app/build/outputs/apk/debug/app-debug.apk`

手动安装：

```bash
adb install -r linco-bridge-platform/web/android/app/build/outputs/apk/debug/app-debug.apk
```

不走 `android.env` 的 H5 开发模式：

```bash
cd linco-bridge-platform/web
npm run dev:h5                   # 5173 端口，手机浏览器访问 http://<电脑IP>:5173
```

## 五、真机验证

| 检查项 | 操作 | 期望结果 |
| --- | --- | --- |
| 后端可用 | 电脑执行 `curl http://127.0.0.1:3300/api/demo-config` | 返回 `code: 0`、`success: true`。 |
| App 启动 | 手机打开应用 | 进入「消息 / 设备 / 桥接」三 Tab，无白屏。 |
| 访客会话 | 打开 App 后看服务端日志 | 自动调用 `/api/visitor/bootstrap` 获得 visitorId。 |
| 连接器在线 | 「桥接」页检查连接状态 | 显示已连接设备名。 |
| 任务控制台 | 「设备」Tab 点击设备卡片 | 运行中/最近任务列表出现；电脑端 Codex Desktop 开个长任务，10 秒内在"运行中"出现。 |
| 端到端对话 | 任务点「继续」→ 发消息 | 电脑侧 Agent 执行，手机流式显示回复。 |
| 前端质量检查（可选） | `cd linco-bridge-platform/web && npm run check` | 类型、lint、格式与测试全部通过。 |

## 六、常见问题

| 现象 | 处理 |
| --- | --- |
| App 提示无法连接服务器 | 确认服务器已启动（3300 监听）、手机与电脑同一局域网、`android.env` 里 IP 与电脑当前 IP 一致；Windows 防火墙需放行 TCP 3300 入站。 |
| 电脑换了 WiFi / IP | 更新 `android.env` 的 `VITE_API_BASE_URL` 后重新打包安装。 |
| 打包脚本找不到 gradlew | 确认在仓库根目录运行脚本；首次构建需联网下载 Gradle 与 SDK 组件。 |
| `adb` 未找到 | 安装 Android platform-tools 并加入 PATH，或按脚本提示手动安装 APK。 |
| init 提示未检测到 codex CLI | 已不需要 CLI——新版连接器自动发现 Codex Desktop 自带二进制；确认 Codex Desktop 已安装，或显式在 `~/.linco/config.json` 账号里配 `bin` 路径。 |
| 公网使用 | 服务器侧 `PUBLIC_HOST=你的域名` + 反向代理终结 HTTPS/WSS；`android.env` 改公网地址重新打包；连接器 init 用页面生成的公网命令（自带 `--ws-url wss://...`，不要加 `--allow-insecure-ws`）。 |

## 七、相关文档

- [快速开始](quick-start.md)
- [Reference Web](reference-web.md)
- [排障](troubleshooting.md)
- [安全与隐私](security-and-privacy.md)
