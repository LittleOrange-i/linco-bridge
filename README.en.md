<p align="center">
  <img src="docs/images/readme-logo-temp.png" alt="Linco Bridge logo" width="140" />
</p>

<h1 align="center">Linco Bridge</h1>

<p align="center">
  Bridge AI Agents running on your own computer (Codex / Claude / DeepSeek Harness /
  Hermes / OpenClaw) to your phone: view tasks remotely, start / resume / stop them
  anytime — agents always execute on your PC.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/status-open%20source%20alpha-0f766e" alt="status: open source alpha" />
  <img src="https://img.shields.io/badge/agents-Codex%20%7C%20Claude%20%7C%20DeepSeek%20%7C%20Hermes%20%7C%20OpenClaw-2563eb" alt="supported agents" />
  <img src="https://img.shields.io/badge/mobile-Android%20APK%20%2B%20H5-f59e0b" alt="mobile: android apk + h5" />
  <img src="https://img.shields.io/badge/license-MIT-111827" alt="license: MIT" />
</p>

**Status:** Open Source Alpha. Interfaces and compatibility may change with documented migration notes.

<p align="center">
  <a href="README.md">简体中文</a> · <b>English</b>
</p>

## ✨ Highlights

| Local-first | Task console | No official-account lock-in |
| --- | --- | --- |
| Agent tasks keep running on your computer; the phone only views and controls, code and data never leave the machine. | WorkBuddy-style three layers: device card → task console (running / recent tasks) → streaming chat, with one-tap resume. | Codex works without an official account login: the connector auto-discovers the codex binary bundled with Codex Desktop, and third-party API setups (e.g. CC Switch) work end to end. No codex CLI required. |

## 🧭 Architecture

```text
Your computer
 ├─ Codex Desktop (live tasks) / Claude / DeepSeek Harness
 └─ linco-connect connector
     ├─ auto-discovers the codex.exe bundled with Codex Desktop, spawns app-server
     ├─ reads local ~/.codex / ~/.claude session data
     └─ full task list (/sessions --all) + running status
        ↕ authenticated WebSocket (token = appId:appSecret)
Server (NestJS, default port 3300, SQLite)
 ├─ REST + SSE relay, anonymous visitor sessions
 └─ GET /api/agent-bridges/:type/threads  ← task console data source
        ↕ REST + SSE
Mobile (Vue 3 + Capacitor Android app / H5)
 └─ Messages / Devices (task console) / Bridge tabs + streaming chat
```

| Repository area | Purpose |
| --- | --- |
| `linco-bridge-connect` | Local connector: agent CLIs/Desktop adapters, sessions, permissions, attachments, model lists, running status. |
| `linco-bridge-platform/server` | NestJS server: device & task relay, session storage, task console API. |
| `linco-bridge-platform/web` | Mobile app: Vue 3 + Capacitor Android (packagable APK), H5 dev mode. |
| `docs` | Architecture, protocol, security, compatibility and extension guides. |

## 🚀 Quick Start (Windows, three steps)

### Step 1: Start the desktop services

Double-click **`一键启动电脑端服务.bat`** in the repository root. It opens two windows:

| Window | Content |
| --- | --- |
| Linco server (3300) | REST + WebSocket relay on `http://127.0.0.1:3300` |
| Linco connector | Reads `%USERPROFILE%\.linco\config.json`, bridges local agents to the server |

Manual alternative:

```bash
# Terminal 1: server
cd linco-bridge-platform/server
npm install
npm run start:dev

# Terminal 2: connector
cd linco-bridge-connect
npm install
node bin/linco-connect.js start
```

### Step 2: Connect an agent (Codex / Claude / DeepSeek Harness)

Initialize an account first (copy the token from the mobile "Bridge" page):

```bash
node bin/linco-connect.js init --token "<app-id>:<app-secret>" --agent codex --channel linco-demo --account default --ws-url "ws://<PC-IP>:3300/bridge/ws/codex" --allow-insecure-ws
```

**Codex works in three forms, none requiring an official account login:**

| Form | Notes |
| --- | --- |
| Codex Desktop (store / standalone) | the bundled codex binary is auto-discovered, nothing to install |
| codex CLI on PATH | used directly |
| Third-party API via CC Switch | point `~/.codex/config.toml` at your provider; turns and task lists work |

DeepSeek Harness just needs to be running (default gateway `127.0.0.1:3080`).

### Step 3: Install the mobile app (Android)

Double-click **`一键打包安装安卓开发版.bat`**: it reads the server address from `linco-bridge-platform/web/android.env`, builds H5, syncs via Capacitor, compiles the debug APK and installs it over adb.

Prerequisite: phone and PC on the same LAN. When the PC IP changes, update `VITE_API_BASE_URL` in `web/android.env` and rerun. H5 dev mode alternative:

```bash
cd linco-bridge-platform/web
npm install
npm run dev:h5
```

### Helper scripts (repository root, Chinese names)

| Script | Purpose |
| --- | --- |
| `一键启动电脑端服务.bat` | Start server (3300) + local connector, one window each |
| `一键打包安装安卓开发版.bat` | Build H5 → compile debug APK → adb install |

> Implementation lives in `scripts-windows/` (`start-desktop-services.ps1`, `package-android-dev.ps1`, UTF-8 BOM). The Chinese-named `.bat` files are pure-ASCII entry points, so they work under any console code page (GBK/UTF-8) without mojibake or line-splitting issues.

## 📱 Task console (WorkBuddy style)

Tap a device card on the mobile "Devices" tab to open its task console:

- **Running**: live tasks currently executing on the PC (writer-lock based, effective across Codex Desktop / CLI / connector), 10s polling;
- **Recent**: full local task list regardless of workspace, sorted by recency;
- **Resume**: one tap binds the original thread and opens the chat page — streaming output, permission prompts, model/reasoning pickers (sourced from the PC configuration, e.g. the CC Switch catalog) all work.

## 🌐 Public deployment

Direct LAN connections work out of the box. To control your home computer from anywhere, deploy the server to a public host (VPS / cloud):

```bash
# On the public server, inside linco-bridge-platform/server:
npm install
npm run build
PUBLIC_HOST=bridge.example.com PORT=3300 npm run start:prod
```

Key settings and requirements:

| Item | Notes |
| --- | --- |
| `PUBLIC_HOST` | Public domain or IP. Non-loopback hosts automatically switch generated commands to `wss://` + `https://` |
| `PORT` | Listen port, default 3300 |
| TLS | NestJS itself is HTTP; terminate HTTPS/WSS at a reverse proxy (nginx / caddy / cloud LB) forwarding to 3300 |
| Connector | On the PC use the public command generated by the mobile "Bridge" page (it embeds `--ws-url wss://...`); drop `--allow-insecure-ws` |
| Mobile | Set `VITE_API_BASE_URL` in `web/android.env` to the public address before packaging |

In short: **only `linco-bridge-platform/server` needs a public deployment**; the connector always runs on your own computer, and the phone uses the app or any browser pointed at the public address.

## 🤖 Compatibility

| Agent | Status | Notes |
| --- | --- | --- |
| Codex (Desktop / CLI) | supported | Desktop-bundled binary auto-discovered, no CLI or official login needed; verified with `codex-cli 0.171.0` |
| Claude Code | supported | `2.1.198 (Claude Code)` |
| DeepSeek Harness | supported | local gateway `127.0.0.1:3080`, model list and running status read directly |
| Hermes | supported | `Hermes Agent v0.13.0` |
| OpenClaw | supported | `OpenClaw 2026.5.18` |

Node.js 20 or 22–26; Node.js 22 LTS recommended. See [supported platforms](docs/supported-platforms.md).

## 🧩 Extension points

| Area | Location |
| --- | --- |
| Connector SDK | `linco-bridge-connect/src/package/connector` |
| Protocol helpers | `linco-bridge-connect/src/package/protocol` |
| Reference Web SDK | `linco-bridge-platform/web/src/bridge/sdk` |
| Channel adapter | `linco-bridge-connect/src/channel` |

Third-party integrations should add a custom channel adapter. See [secondary development rules](docs/secondary-development.md).

## 🔐 Security

- Never commit or log tokens, app secrets, private keys, user data, or authenticated URLs.
- `ws://` is for trusted LANs only. Public deployments must use HTTPS/WSS and define their own auth, storage, audit and retention policies.
- TLS/WSS is not end-to-end encryption.
- File delivery blocks hidden paths and sensitive files (`.env`, `.git/config`, `.ssh/*`) by default.
- Review [security & privacy](docs/security-and-privacy.md) before connecting real data; report vulnerabilities per [SECURITY.md](SECURITY.md).

## 📚 Docs

| Goal | Docs |
| --- | --- |
| Get started | [Quick start](docs/quick-start.md), [Android build & run](docs/zh-CN/android.md), [Troubleshooting](docs/troubleshooting.md) |
| Understand | [How it works](docs/how-it-works.md), [Protocol](docs/protocol.md), [CLI reference](docs/cli.md) |
| Deploy or extend | [Reference platform deploy](docs/deploy-demo.md), [Reference web](docs/reference-web.md), [Secondary development](docs/secondary-development.md) |
| Boundaries & policies | [Supported platforms](docs/supported-platforms.md), [Security & privacy](docs/security-and-privacy.md), [Support scope](SUPPORT.md) |
| Subprojects | [Connector README](linco-bridge-connect/README.md), [Platform README](linco-bridge-platform/README.md) |

## 🤝 Contributing

Issues and pull requests are welcome. Read [CONTRIBUTING.md](CONTRIBUTING.md) before protocol, cross-module, or breaking changes.

## ⚖️ License

Linco Bridge is open source under the [MIT License](LICENSE). The license covers repository code and docs; it does not grant rights to the Linco name, logo, or other brand assets beyond normal reference use.
