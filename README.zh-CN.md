<p align="center">
  <img src="docs/images/readme-logo-temp.png" alt="Linco Bridge logo" width="140" />
</p>

<h1 align="center">Linco Bridge</h1>

<p align="center">
  把运行在个人电脑上的 AI Agent（Codex / Claude / DeepSeek Harness / Hermes / OpenClaw）
  桥接到手机端：远程查看任务、随时开始 / 继续 / 结束，Agent 始终在你的电脑上执行。
</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-open%20source%20alpha-0f766e" alt="status: open source alpha" />
  <img src="https://img.shields.io/badge/agents-Codex%20%7C%20Claude%20%7C%20DeepSeek%20%7C%20Hermes%20%7C%20OpenClaw-2563eb" alt="supported agents" />
  <img src="https://img.shields.io/badge/移动端-安卓%20APK%20%2B%20H5-f59e0b" alt="mobile: android apk + h5" />
  <img src="https://img.shields.io/badge/license-MIT-111827" alt="license: MIT" />
</p>

**项目状态：** Open Source Alpha。接口和兼容性可能变化，破坏性变更将配套迁移说明。

## ✨ 亮点

| 本地优先 | 任务控制台 | 无官方账号依赖 |
| --- | --- | --- |
| Agent 任务继续运行在你的电脑上，手机只做查看和控制，代码与数据不出本机。 | WorkBuddy 式三层结构：设备卡片 → 任务控制台（运行中 / 最近任务）→ 聊天页流式对话，支持远程继续任务。 | Codex 无需官方账号登录：自动发现 Codex Desktop 自带的 codex 二进制，配合 CC Switch 等第三方 API 配置即可跑通全链路，也不要求安装 codex CLI。 |

## 🧭 架构

```text
你的电脑
 ├─ Codex Desktop（正在跑的任务） / Claude / DeepSeek Harness
 └─ linco-connect 连接器
     ├─ 自动发现 Codex Desktop 自带 codex.exe，spawn app-server
     ├─ 读取本地 ~/.codex / ~/.claude 会话数据
     └─ 全量任务列表（/sessions --all）+ running 运行状态
        ↕ WebSocket（token = appId:appSecret）
服务器（NestJS，默认端口 3300，SQLite）
 ├─ REST + SSE 中继，visitor 免登录会话隔离
 └─ GET /api/agent-bridges/:type/threads  ← 任务控制台数据源
        ↕ REST + SSE
移动端（Vue 3 + Capacitor 安卓 App / H5）
 └─ 消息 / 设备（任务控制台）/ 桥接 三 Tab + 聊天页（流式 + 停止）
```

| 仓库区域 | 作用 |
| --- | --- |
| `linco-bridge-connect` | 本地连接器：适配 Agent CLI/Desktop，维护会话、权限、附件、模型列表与运行状态。 |
| `linco-bridge-platform/server` | NestJS 服务器：设备与任务中继、会话存储、任务控制台 API。 |
| `linco-bridge-platform/web` | 移动端：Vue 3 + Capacitor 安卓 App（可打包 APK），H5 开发模式。 |
| `docs` | 架构、协议、安全、兼容性和扩展文档。 |

## 🚀 快速开始（Windows，三步）

### 第 1 步：启动电脑端服务

双击仓库根目录的 **`一键启动电脑端服务.bat`**，会打开两个窗口：

| 窗口 | 内容 |
| --- | --- |
| Linco 服务器(3300) | REST + WebSocket 中继，监听 `http://127.0.0.1:3300` |
| Linco 连接器 | 读取 `%USERPROFILE%\.linco\config.json`，桥接本机 Agent 与服务器 |

也可以手动启动：

```bash
# 终端 1：服务器
cd linco-bridge-platform/server
npm install
npm run start:dev

# 终端 2：连接器
cd linco-bridge-connect
npm install
node bin/linco-connect.js start
```

### 第 2 步：连接 Agent（Codex / Claude / DeepSeek Harness）

首次使用先在连接器目录初始化账号（token 从移动端「桥接」页复制）：

```bash
node bin/linco-connect.js init --token "<app-id>:<app-secret>" --agent codex --channel linco-demo --account default --ws-url "ws://<电脑IP>:3300/bridge/ws/codex" --allow-insecure-ws
```

**Codex 支持三种形态，全部不需要官方账号登录：**

| 形态 | 说明 |
| --- | --- |
| Codex Desktop（商店版 / 独立安装版） | 连接器自动发现自带的 codex.exe，无需任何安装 |
| codex CLI（PATH 上） | 直接使用 |
| CC Switch 第三方 API | `~/.codex/config.toml` 指向第三方 provider 即可跑 turn 与全量任务列表 |

DeepSeek Harness 装好后保持运行（默认网关 `127.0.0.1:3080`），连接器即接即用。

### 第 3 步：安装移动端（安卓）

双击 **`一键打包安装安卓开发版.bat`**：读取 `linco-bridge-platform/web/android.env` 里的服务器地址 → 构建 H5 → cap sync → 编译 Debug APK → `adb install` 到已连接的手机。

前提：手机与电脑同一局域网；电脑 IP 变化后先改 `web/android.env` 的 `VITE_API_BASE_URL` 再重新打包。不想装 App 时也可用 H5 开发模式：

```bash
cd linco-bridge-platform/web
npm install
npm run dev:h5
```

### 中文脚本一览

| 脚本（仓库根目录） | 作用 |
| --- | --- |
| `一键启动电脑端服务.bat` | 启动服务器(3300) + 本机连接器，各占一个窗口 |
| `一键打包安装安卓开发版.bat` | 构建 H5 → 编译 Debug APK → adb 安装到手机 |

## 📱 任务控制台（WorkBuddy 式）

移动端「设备」Tab 点击设备卡片进入任务控制台：

- **运行中**：实时显示电脑上正在执行的 Agent 任务（基于连接器 writer-lock 判定，跨 Codex Desktop / CLI / 连接器生效），10 秒轮询刷新；
- **最近任务**：全量本地任务列表（不限工作目录），按更新时间排序；
- **继续**：一键绑定原线程进入聊天页，流式输出、权限确认、模型/推理档位切换（列表来自电脑端当前配置，如 CC Switch 目录）全部可用。

## 🌐 公网部署

局域网内网可直连；要在任何网络下控制家里的电脑，把服务器部署到公网（VPS / 云主机）：

```bash
# 在公网服务器上，于 linco-bridge-platform/server 目录执行：
npm install
npm run build
PUBLIC_HOST=bridge.example.com PORT=3300 npm run start:prod
```

关键配置与要求：

| 配置 | 说明 |
| --- | --- |
| `PUBLIC_HOST` | 对外域名或 IP。非回环地址时服务器会自动把生成的连接命令切换为 `wss://` + `https://` |
| `PORT` | 监听端口，默认 3300 |
| TLS | NestJS 自身是 HTTP，公网必须挂反向代理（nginx / caddy / 云负载均衡）终结 HTTPS/WSS 证书并转发到 3300 |
| 连接器侧 | 电脑上 `linco-connect init` 用移动端「桥接」页生成的公网命令（自动带 `--ws-url wss://...`），不要再加 `--allow-insecure-ws` |
| 移动端 | 打包前把 `web/android.env` 的 `VITE_API_BASE_URL` 改为公网地址（`https://bridge.example.com`）再执行打包脚本 |

即：**只有 `linco-bridge-platform/server` 这一个服务需要部署在公网**；连接器始终跑在你自己的电脑上，手机装 App 或直接浏览器访问公网地址。

## 🤖 兼容性

| Agent | 状态 | 说明 |
| --- | --- | --- |
| Codex（Desktop / CLI） | 支持 | Desktop 自带二进制自动发现，无需 CLI 与官方登录；已验证 `codex-cli 0.171.0` |
| Claude Code | 支持 | `2.1.198 (Claude Code)` |
| DeepSeek Harness | 支持 | 本地网关 `127.0.0.1:3080`，模型列表与运行状态直读 |
| Hermes | 支持 | `Hermes Agent v0.13.0` |
| OpenClaw | 支持 | `OpenClaw 2026.5.18` |

使用 Node.js 20 或 22–26，推荐 Node.js 22 LTS。当前兼容边界见 [支持平台](docs/zh-CN/supported-platforms.md)。

## 🧩 扩展点

| 区域 | 位置 |
| --- | --- |
| Connector SDK | `linco-bridge-connect/src/package/connector` |
| 协议工具 | `linco-bridge-connect/src/package/protocol` |
| Reference Web SDK | `linco-bridge-platform/web/src/bridge/sdk` |
| Channel adapter | `linco-bridge-connect/src/channel` |

第三方集成应新增自定义 channel adapter。详见 [二次开发规则](docs/zh-CN/secondary-development.md)。

## 🔐 安全

- 不要提交或记录 Token、App Secret、私钥、用户数据或带鉴权信息的 URL。
- `ws://` 仅用于可信局域网。公网部署必须 HTTPS/WSS，并定义自己的鉴权、存储、审计和保留策略。
- TLS/WSS 不等于端到端加密。
- 文件下发默认拦截隐藏路径和敏感文件（`.env`、`.git/config`、`.ssh/*`）。
- 连接真实数据前请阅读 [安全与隐私](docs/zh-CN/security-and-privacy.md)；漏洞请按 [SECURITY.md](SECURITY.md) 私密报告。

## 📚 文档

| 目标 | 文档 |
| --- | --- |
| 快速上手 | [快速开始](docs/zh-CN/quick-start.md)、[安卓端构建与运行](docs/zh-CN/android.md)、[排障](docs/zh-CN/troubleshooting.md) |
| 理解系统 | [工作原理](docs/zh-CN/how-it-works.md)、[公开协议](docs/zh-CN/protocol.md)、[CLI 命令参考](docs/zh-CN/cli.md) |
| 部署或扩展 | [参考平台部署](docs/zh-CN/deploy-demo.md)、[Reference Web](docs/zh-CN/reference-web.md)、[二次开发](docs/zh-CN/secondary-development.md) |
| 查看边界与政策 | [支持平台](docs/zh-CN/supported-platforms.md)、[安全与隐私](docs/zh-CN/security-and-privacy.md)、[支持边界](SUPPORT.md) |
| 开发子项目 | [连接器 README](linco-bridge-connect/README.zh-CN.md)、[参考平台 README](linco-bridge-platform/README.zh-CN.md) |

## 🤝 参与贡献

欢迎提交 Issue 和 Pull Request。协议、跨模块或破坏性变更请先阅读 [CONTRIBUTING.md](CONTRIBUTING.md)。

## ⚖️ 许可证

Linco Bridge 基于 [MIT License](LICENSE) 开源。许可证适用于仓库代码和文档，不单独授予超出正常指代范围的 Linco 名称、Logo 或其他品牌资产使用权。
