# 安卓端构建与运行指南

本文面向想在安卓设备上使用 Linco Bridge 的用户和二次开发者，说明环境准备、必要配置、运行与安装步骤、验证方式和常见问题。

## 先明确结论

| 问题 | 结论 | 依据 |
| --- | --- | --- |
| 本仓库能否直接构建出安卓 APK？ | **不能。** 仓库里没有 Android 原生工程、Gradle 配置、`AndroidManifest.xml`、签名证书，也没有 App 打包脚本。 | `linco-bridge-platform/web/src/manifest.json` 只配置了 `h5` 与 `mp-weixin`，没有 `app-plus`；`linco-bridge-platform/web/package.json` 只有 `dev:h5`、`build:h5`、`dev:mp-weixin`、`build:mp-weixin` 等脚本，没有 App 构建脚本。 |
| 安卓用户怎么使用？ | 两条路径：① 安装官方 Linco App 的 APK（**仓库外的产品**，源码不在本仓库）；② 在安卓浏览器/ WebView 中使用本仓库的 H5 参考前端或在线 Demo。 | `README.zh-CN.md` 第 24、63、69、73–88 行：提供 APK 下载链接，同时明确“仓库不包含完整 Linco App，也不包含官方托管云服务实现”。 |
| 是否需要手机号登录？ | **不需要。** 仓库内的连接与使用流程没有手机号、短信验证码或手机号注册步骤。 | 参考平台使用签名匿名访客 Session 自动隔离访客（`linco-bridge-platform/server/README.zh-CN.md` 第 18、93–114 行）；连接器凭证是页面生成的 `appId:appSecret`（`linco-bridge-connect/src/cli/init.js`）；微信小程序文档写的是“扫码登录”，不是手机号登录（`docs/zh-CN/quick-start.md` 第 49 行）。参考平台明确把“登录与 JWT”列在**不包含**范围（`linco-bridge-platform/README.zh-CN.md` 第 150–155 行）。 |

> 说明：官方 Linco App 本体及官方托管服务不在本仓库中，本文不对其产品层面的账号策略作承诺。下面涉及“无需手机号登录”的结论，范围是本仓库代码、脚本与文档所描述的运行、构建和连接流程。

## 一、环境准备

| 项目 | 要求 |
| --- | --- |
| Node.js | 20 或 22–26，推荐 22 LTS；连接器依赖原生模块 `better-sqlite3`，不支持 Node.js 21。 |
| npm | 随 Node.js 安装即可。 |
| 电脑侧 Agent CLI | 例如 Codex CLI、Claude Code、Hermes 或 OpenClaw；按对应工具的说明先完成它自身的安装与登录/配置（这是 Agent CLI 的账号，不是 Linco Bridge 的手机号登录）。 |
| 安卓设备 | 安装官方 APK，或用安卓浏览器访问 H5；设备与电脑需在同一局域网（本地联调时）。 |
| 可选工具 | 仅在自行二次开发、准备把前端打成 App 时才会用到 HBuilderX / Android Studio / 签名证书；仓库现有流程不依赖它们。 |

## 二、必要配置

### 1. 参考平台后端（`linco-bridge-platform/server`）

默认监听 `http://127.0.0.1:3300`。常用环境变量：

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `PORT` | `3300` | HTTP 与 WebSocket 端口。 |
| `PUBLIC_HOST` | `127.0.0.1` | 写入 `demo-config` 和 `setupCommands` 的主机名；公网部署时改为你的域名。 |
| `CORS_ORIGINS` | 开发环境放行全部；生产环境禁止跨域 | 生产环境必须填入实际前端域名，多个用逗号分隔。 |
| `VISITOR_SESSION_SECRET` | 开发环境有回退值；生产必填 | 匿名访客 Session 的 HMAC 签名密钥，请用安全随机值，勿提交仓库。 |
| `SQLITE_PATH` | `./data/linco-bridge.db` | SQLite 数据文件位置。 |

### 2. 参考平台前端（`linco-bridge-platform/web`）

| 文件 | 作用 | 注意事项 |
| --- | --- | --- |
| `vite.config.ts` | H5 开发代理：`/api` → `http://127.0.0.1:3300` | 配置中未设置 `server.host`，默认只监听本机；手机直接访问电脑局域网 IP 前，需要自行加上 `host: '0.0.0.0'` 并重启，或改用部署后的静态站点。 |
| `local.env` | 微信小程序本地开发用，默认 `VITE_API_BASE_URL=http://127.0.0.1:3300` | 真机预览请改成电脑的局域网 IP，例如 `http://192.168.1.100:3300`。 |
| `prod.env` | `build:h5` / `build:mp-weixin` 自动加载 | 默认指向官方 Demo `https://bridge-demo.lincotalk.com`。**自托管必须改成自己的域名**（或与 API 同域时留空走 `/api`），不要指向官方 Demo API。 |
| `src/manifest.json` | UniApp 平台配置 | 只有 `h5` 和 `mp-weixin`，`appid` 为空，没有 `app-plus` 配置。 |

前端环境变量说明见 `linco-bridge-platform/web/README.zh-CN.md` 的“环境变量”章节。

### 3. 连接器凭证

无需手机号。打开应用的 **桥接** 页面，选择 Agent 导入方式，页面会生成包含 `appId:appSecret` 的 `setupCommands`；在电脑侧执行即可，实际参数以页面生成内容为准。

## 三、构建 / 运行 / 安装步骤

### 路径 A：安装官方 Linco App（面向最终用户）

1. 下载安卓 APK：<https://www.lincotalk.com/download/apk/linco.apk>。
2. 在安卓设备上安装；如系统提示，允许安装来自此来源的应用。
3. 打开 App，进入 **桥接**，选择 Agent 导入方式，复制页面生成的命令。
4. 在已安装 Agent CLI 的电脑上执行：

   ```bash
   npm install -g linco-connect
   linco-connect init --token "<app-id>:<app-secret>" --agent codex
   linco-connect start --daemon
   ```

5. 返回 App，确认连接器在线，发送测试消息。

APK 是仓库外提供的官方产品安装包；本文不提供它的源码构建步骤。

### 路径 B：在安卓设备上使用本仓库的 H5 参考前端（本地联调）

1. 终端 1，启动后端：

   ```bash
   cd linco-bridge-platform/server
   npm install
   npm run start:dev
   ```

2. 终端 2，启动 H5：

   ```bash
   cd linco-bridge-platform/web
   npm install
   npm run dev:h5
   ```

   开发服务端口为 `5173`（见 `src/manifest.json` 的 `h5.devServer.port`）。

3. 让安卓设备与电脑处于同一局域网，在手机浏览器打开 `http://<电脑局域网IP>:5173`。若打不开，按“必要配置”中的说明在 `vite.config.ts` 增加 `host: '0.0.0.0'` 并重启，同时检查电脑防火墙。

4. 在手机页面依次操作：**桥接** → **从 Codex 导入** → 复制页面生成的 `setupCommands` → 在电脑终端执行 → 回到页面点击“我已复制，获取连接状态” → 确认连接成功后进入聊天页。

   本地命令通常形如（以页面生成的为准）：

   ```bash
   npm install -g linco-connect
   linco-connect init \
     --token "<app-id>:<app-secret>" \
     --agent codex \
     --channel linco-demo \
     --account "<account-id>" \
     --allow-insecure-ws
   linco-connect start --daemon
   ```

### 路径 C：构建 H5 静态产物并在安卓上使用

1. 先按“必要配置”修改 `prod.env`，把 `VITE_API_BASE_URL` 指向你的 Server 域名（同域部署可留空使用 `/api`）。
2. 构建：

   ```bash
   cd linco-bridge-platform/web
   npm install
   npm run build:h5
   ```

   `build:h5` 会自动加载 `prod.env`，构建后还会运行 `scripts/verify-h5-tabbar.mjs` 检查 TabBar 产物。产物在 `dist/build/h5`。

3. 将 `dist/build/h5` 部署到 Nginx 或其他静态服务器，建议启用 HTTPS。安卓浏览器打开该地址即可使用，也可以通过浏览器菜单“添加到主屏幕”获得类似 App 的入口。
4. 若前端与后端不同域，后端 `CORS_ORIGINS` 需包含该前端域名；公网连接应使用 `https` / `wss`，不要用 `--allow-insecure-ws`。

### 路径 D：自行打包成 Android App（仓库未提供，需要二次开发）

仓库目前**没有**可直接执行的 App 打包命令，也未提供经过验证的 Android 工程。如果确实需要自有 APK，属于仓库外工作，至少需要自行补齐：

- `src/manifest.json` 的 `app-plus` 配置与有效的 DCloud `appid`；
- App 端构建脚本或 HBuilderX / uni-app 离线打包工具链；
- Android 签名证书与版本管理；
- App 端 API 根地址、网络权限、WebSocket 地址与后端 `CORS_ORIGINS` / `PUBLIC_HOST` 的匹配配置；
- 按目标 Android 版本完成真机验证。

接入新客户端时，推荐复用 `linco-bridge-connect/src/package/connector` 与 `linco-bridge-platform/web/src/bridge/sdk`，并通过新增 channel adapter 扩展，而不是修改官方 `linco` 通道；见 `docs/zh-CN/secondary-development.md`。

## 四、验证方式

| 检查项 | 操作 | 期望结果 |
| --- | --- | --- |
| 后端可用 | 电脑执行 `curl http://127.0.0.1:3300/api/demo-config` | 返回 `code: 0`、`success: true` 的 JSON。 |
| 前端加载 | 安卓浏览器打开 H5 地址 | 底部出现“消息 / 助手 / 桥接”三个 Tab，页面无空白。 |
| 访客会话 | 浏览器访问后查看接口请求 | 自动调用 `/api/visitor/bootstrap`，获得 `visitorId` 与 `sessionToken`，无需填写手机号或账号。 |
| 连接器状态 | 电脑执行 `linco-connect doctor` | 本机环境与 CLI 状态正常；桥接页显示连接器在线。 |
| 端到端链路 | 在安卓端发送一条测试消息 | Agent 在电脑侧执行，安卓端能看到回复（H5 支持流式展示）。 |
| 前端质量检查（可选） | `cd linco-bridge-platform/web && npm run check` | 类型检查、lint、格式与测试均通过。 |

## 五、常见问题

**1. 手机访问 `http://localhost:5173` 打不开？**
`localhost` 在手机上指向手机自己。请使用电脑的局域网 IP；并确认 `vite.config.ts` 允许外部访问（`server.host: '0.0.0.0'`）、两端同网段、电脑防火墙未拦截。

**2. 页面能打开，但桥接/聊天请求失败？**
本地 H5 依赖 Vite 把 `/api` 代理到 `http://127.0.0.1:3300`，先确认后端已启动。若使用构建产物，检查 `prod.env` 是否仍指向官方 Demo；自托管必须改为自己的 Server 地址。跨域报错时检查后端 `CORS_ORIGINS`。

**3. 桥接页一直显示连接器离线？**
确认页面生成的命令已完整执行，`--token`、`--channel`、`--account` 与页面一致；执行 `linco-connect doctor` 排查本机环境。WebSocket 仅用于本机 `linco-connect` 与平台通信，聊天请求本身走 HTTP；公网环境需用 `wss`。

**4. 为什么换了设备/浏览器后看不到之前的会话？**
参考平台使用匿名访客 Session 隔离数据，H5 与微信小程序是**独立访客会话**，不提供跨设备恢复，也不是正式账号。更换设备、清除存储或使用无痕模式会创建新的访客上下文。

**5. 需要手机号/短信验证码登录吗？**
本仓库流程不需要。微信小程序文档中出现的“扫码登录”是微信入口的登录方式，不是手机号验证码；Agent CLI 自身的登录由对应工具决定，与 Linco Bridge 的手机号登录无关。

**6. 能从本仓库直接打一个 APK 吗？**
不能。仓库内没有 Android 工程与打包脚本；请使用官方 APK，或按“路径 D”自行补齐二次开发工作。

**7. 构建后的 H5 中间 Tab 空白？**
`build:h5` 已内置 `scripts/verify-h5-tabbar.mjs` 校验；若手动跳过该步骤，请重新执行 `npm run build:h5`，并确认 `pages.json` 中的 `pages/agents/index` 与 `static/tabbar/agents*.png` 存在。

**8. Node.js 版本有什么限制？**
使用 20 或 22–26，推荐 22 LTS；Node.js 21 因 `better-sqlite3` 原生模块问题不受支持。

## 六、相关文件

- `README.zh-CN.md`：体验路径、APK 下载链接与项目范围边界。
- `docs/zh-CN/quick-start.md`：最小启动流程。
- `docs/zh-CN/deploy-demo.md`：H5 / 小程序部署说明。
- `linco-bridge-platform/README.zh-CN.md`：参考平台全栈启动与数据流。
- `linco-bridge-platform/server/README.zh-CN.md`：后端环境变量、访客 Session 与 API。
- `linco-bridge-platform/web/README.zh-CN.md`：前端脚本、环境变量、H5 与小程序差异。
- `linco-bridge-connect/README.zh-CN.md`：连接器安装、初始化与命令。
