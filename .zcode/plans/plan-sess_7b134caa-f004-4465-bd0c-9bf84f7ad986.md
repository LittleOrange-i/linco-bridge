# Linco Bridge 大改：无官方登录 Codex 接入 + 移动端任务控制台

## Context（为什么改）

你要的是 WorkBuddy 式体验：手机随时查看/控制正在工作的电脑——接入 Codex Desktop 正在跑的任务和工作目录，远程查看、随时开始/继续/结束任务；agent 可用模型列表同步到手机。当前卡点：

1. **连接器起不来 codex**：你机器只有 Codex Desktop（商店版），没有 CLI。连接器 init/doctor 只查 PATH 上的 `codex`，起不来 app-server → 数据同步失效。
2. **运行中任务不可见**：连接器 `thread/list` 已产出 `running` 标志，但 payload（`buildSessionsPayload`）和服务端 DTO（`mapWorkspaceSessions` 只留 id/title/bindCommand）把它丢了；也没有"列全部线程（不限工作目录）"的命令。
3. **UI 是"消息列表"形态**，不是"设备-任务控制台"形态。

**已实测验证的关键事实**（决定方案可行性）：
- Codex Desktop 自带 CLI：`C:\Program Files\WindowsApps\OpenAI.Codex_*\app\resources\codex.exe`（v0.171.0-alpha.13，支持 `app-server`）
- 你的 `~/.codex/config.toml` 已是 CC Switch 第三方配置（`model_provider=custom` → `127.0.0.1:3065`，`requires_openai_auth=false`）→ **spawn app-server 跑 turn 不需要官方登录**
- `~/.codex/state_5.sqlite` 有 `threads` 表（含运行状态），`session_index.jsonl`/`sessions/*.jsonl` 齐全；连接器 reader 已按 `state_\d+\.sqlite` 通配
- 模型列表链路已存在：连接器 `getModelsAndReasons` → app-server RPC `model/list`（读 config.toml 即 CC Switch 目录）→ 服务端 `/api/agent-bridges/:type/settings/options` → 移动端 `BridgeSettingsPickerSheet`

## 架构总览（改造后）

```
Codex Desktop（你电脑上正常用） + DeepSeek Harness
   ↕ 同一份 ~/.codex 数据（state sqlite + JSONL）+ spawn Desktop 自带 codex.exe app-server
linco-connect（bin 自动发现，无 CLI 依赖，无官方登录依赖）
   ↕ WebSocket ws://192.168.123.11:3300/bridge/ws/<agent>?token=...
NestJS 服务端（新增：全量线程查询 + running 状态透传）
   ↕ REST + SSE
移动端（UI 大改：设备卡片 → 任务控制台 → 任务详情/聊天）
```

## 分阶段实施

### Phase 0 — 冒烟验证（先证明，再动手）

写一次性脚本（不进仓库）验证三件事：
1. spawn Desktop 自带 `codex.exe app-server --listen stdio://` → RPC `thread/list`（不带 cwd）能否列出全部线程（含 `status.type`）；`model/list` 能否返回 CC Switch 目录模型
2. 对一个**非活跃**线程发 `thread/resume` + `turn/start` 跑通一轮（验证无官方登录下 turn 可用）
3. 实验性：`codex app-server daemon` / `proxy` 能否接管 Desktop 正在跑的线程（决定"结束任务"能否覆盖 Desktop 活跃线程；失败则活跃线程走 view-only + "请在桌面端结束"降级）

### Phase 1 — 连接器（linco-bridge-connect）

**1a. codex 二进制自动发现**
- `src/config/commandResolution.js` 新增 `findCodexBundledBinary()`：优先级 = config 显式 bin → `%LOCALAPPDATA%\Programs\Codex\**\codex.exe`（独立安装版）→ glob `C:\Program Files\WindowsApps\OpenAI.Codex_*\app\resources\codex.exe`（取版本号最新）→ PATH。macOS 加 `~/Applications/Codex.app` 对应路径
- `src/config/env.js` `agentConfig()`：codex 的 bin 解析链接入发现函数（bin 为空或纯 `codex` 时）
- `src/cli/init.js:39-47`：codex 校验改用发现链（找到即写入 config 的 bin，init 不再报"未检测到 codex CLI"）
- `src/cli/doctor.js:64-67`：codex 检查项显示发现到的实际路径

**1b. 全量任务列表 + running 透传**
- `src/command/history/payloads.js` `buildSessionsPayload`：items 增加 `running: item.running === true`、`source`
- `src/command/history/handlers.js`：`/sessions` 支持 `--all`（无 `--project` 时不限定工作目录，列全部线程）；新增调用 `codex.listAllThreads(limit)`（新函数，复用 `buildThreadListParams` 的无-cwd 分支 + RPC `thread/list` 分页，本地 state db 兜底）
- `src/agent/deepseek/index.js`：对应全量 `session.list`（不过滤 workspace）

**1c. reasoning 档位对齐**
- `src/command/settingsCommand.js` `buildCodexSettingsPayload`：reasoning options 优先取 `model/list` 返回的 per-model `supportedReasoningEfforts`（你配置里有 8 档，现在固定 4 档）

### Phase 2 — 服务端（linco-bridge-platform/server）

- `bridge-workspace.dto.ts`：`BridgeWorkspaceSessionDto` 增加 `running?: boolean; workspace?: string; updatedAt?: number; source?: string`
- `bridge.service.ts` `mapWorkspaceSessions`（:981-1001）：透传上述字段
- `bridge.service.ts` `listProjectSessions` + `bridge.controller.ts`：`projectPath` 改可选，新增 `runningOnly`、`limit` 查询参数；无 projectPath 时向连接器发 `/sessions --all <limit>`
- 新 REST：`GET /api/agent-bridges/:type/threads`（= listProjectSessions 的全量形态，供任务控制台）
- （可选增强）`GET :type/status` 附带 `runningCount`

### Phase 3 — 移动端 UI 大改（linco-bridge-platform/web，Vue3+Capacitor 保留）

**信息架构（WorkBuddy 式三层）**：
- Tab2「助手」改造为「设备」：设备卡片显示 在线状态 + 设备名 + 运行中任务数（复用 `ConnectedAgentSwipeListItem`/`BridgeSourceCard`、`useBridgeStore.checkStatus`）
- **新页面 `pages/device/console.vue`（任务控制台）**：顶部"运行中"分区（红点+实时刷新，10s 轮询第一版）+ "最近任务"分区；任务行复用 `AgentHistoryRow` 风格显示 标题/工作目录/状态/相对时间；操作：**继续**（跳 `pages/chat/index` 走已有 resume 链路）/ **停止**（POST `/messages/cancel` 链路，Desktop 活跃线程按 Phase 0 结论降级）
- `pages/chat/landing.vue` 保持"开始新任务"入口；`pages/chat/index.vue` 已有流式 + stop，不动
- `web/src/api/` 新增 threads API 封装；`stores/index.ts` 加 deviceStore（任务列表状态 + 轮询）
- 注册页（`import-local.vue`）文案更新：不再要求安装 codex CLI，检测逻辑随连接器新版本

### Phase 4 — 端到端验证

1. `linco-connect init --token ... --agent codex` 在无 CLI 环境 init 成功、doctor 显示发现的 Desktop 路径
2. 服务端 `npm run start:dev`（3300）；连接器 `start --daemon`
3. PC 上 Codex Desktop 开一个长任务 → 手机 App 设备页看到运行中任务 → 点进任务看到对话轮次 → 新发消息继续任务 → 停止按钮生效
4. landing 页 `/settings` 弹层显示 CC Switch 目录模型 + 8 档 reasoning
5. DeepSeek Harness 路径回归：`/sessions --all` 列出 harness 会话
6. 跑 `linco-bridge-connect` 现有 jest 测试 + `web` vitest

## 关键复用（不重造）

- 连接器：`buildThreadListParams`（sessions.js:141，无 cwd 已支持）、`mapThreadListItem` running 标志（sessions.js:31）、`threadWriterLock.js`（与 Desktop 并发写保护）、history 全链路（handlers.js:330）
- 服务端：`fetchProjectSessionsFromConnector`（bridge.service.ts:932）、slash command 中继（bridge-relay.service.ts:424-652）
- 移动端：`useChatSession`、`useBridgeSettings`、`BridgeSettingsPickerSheet`、`AgentLandingAppBar`、`SwipeActionItem`

## 交付边界（本期）

- 局域网部署（192.168.123.11:3300 已跑通）；公网走后续（现有 env 已支持 wsUrl/TLS 配置，无需新代码）
- Desktop 活跃线程的"结束"能力取决于 Phase 0 实验 3 的结论，失败则降级为查看 + 桌面端操作提示（会在实现时明确标注）
- 运行中任务的实时输出流（JSONL tailing/SSE 推送）留到下一期；本期用轮询 + 手动刷新