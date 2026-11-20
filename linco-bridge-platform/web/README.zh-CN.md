# Linco Bridge Web

[English](README.md)

Linco Bridge 参考平台前端，已由 UniApp 重构为 **Vue 3 + Vite + Capacitor**。Web 与 Android 共用同一套 TypeScript/Vue 代码：浏览器用 Vite 开发和部署，Android 用 Capacitor 生成原生壳并打包 APK。

> 配套后端见 [`../server/README.zh-CN.md`](../server/README.zh-CN.md)，完整平台流程见 [`../README.zh-CN.md`](../README.zh-CN.md)。

## 为什么采用 Vue 3 + Vite + Capacitor

| 方案 | 结论 |
| --- | --- |
| 继续 UniApp | HBuilderX / 多端条件编译 / 小程序工具链增加打包复杂度，且本项目 Android 是刚需 |
| React | UI 框架迁移成本高，需要重写 48 个 Vue 组件及大量 Pinia/Vue 组合式逻辑，对 Android 打包没有直接帮助 |
| Tauri | 更像桌面壳；Android 支持可用，但需要 Rust、NDK、更重的原生工具链，迁移收益低 |
| **Vue 3 + Vite + Capacitor** | 保留现有 Vue 业务逻辑，去掉 UniApp 编译器，Web 构建简单，Android 工具链标准且成熟 |

## 技术栈

| 类别 | 选型 |
| --- | --- |
| UI | Vue 3 + `<script setup lang="ts">` |
| 路由 | vue-router 4 |
| 状态管理 | Pinia |
| Web 构建 | Vite 5 + `@vitejs/plugin-vue` |
| Android 壳 | Capacitor 7 |
| 原生能力 | Clipboard、Filesystem、App 返回键、Haptics、Share |
| 质量工具 | ESLint、Prettier、Vitest、vue-tsc |

## 前置要求

### Web / 通用

- Node.js 20+
- npm 10+

### Android 打包

- JDK 17（Capacitor / Android Gradle Plugin 推荐）
- Android SDK Platform 35
- Android SDK Build Tools 35.0.0+
- 设置 `ANDROID_HOME` 或 `ANDROID_SDK_ROOT` 指向 Android SDK
- 如需在模拟器联调后端，Android 模拟器访问宿主机后端地址为 `http://10.0.2.2:3300`

## 快速开始

### 1. 启动后端

```bash
cd linco-bridge-platform/server
npm install
npm run start:dev
```

确认后端可用：

```bash
curl http://127.0.0.1:3300/api/demo-config
```

### 2. 启动 Web 前端

```bash
cd linco-bridge-platform/web
npm install
npm run dev
```

打开 Vite 输出的本地地址，然后进入 **桥接** Tab。

### 3. 构建 Web

```bash
npm run build:web
```

产物位于 `web/dist/`，可直接部署到任意静态站点服务器。

## Android 开发

### 首次添加 Android 工程

Android 工程目录由 Capacitor 生成，仓库中默认忽略。首次执行：

```bash
npm run android:add
```

### 日常同步与打开 Android Studio

```bash
npm run android:dev
```

该命令会：

1. 执行 `npm run build`
2. 把 `dist/` 同步进 Android 工程的 `app/src/main/assets/public`
3. 打开 Android Studio

### 打 Debug APK

```bash
npm run cap:sync
cd android
./gradlew :app:assembleDebug
```

APK 输出：

```text
android/app/build/outputs/apk/debug/app-debug.apk
```

### 打 Release APK

```bash
npm run cap:sync
cd android
./gradlew :app:assembleRelease
```

正式发布前还需配置签名。Capacitor 生成的 `android/app/build.gradle` 已包含 release build type，但默认未配置签名。

## 常用脚本

| 命令 | 说明 |
| --- | --- |
| `npm run dev` | Web 开发服务器 |
| `npm run dev:h5` | 兼容旧脚本名，等价于 `npm run dev` |
| `npm run build:web` | Web 生产构建 |
| `npm run build` | 等价 `build:web`，同时供 Capacitor 同步使用 |
| `npm run cap:sync` | 构建 Web 并同步到 Capacitor Android |
| `npm run android:add` | 首次生成 `android/` 工程 |
| `npm run android:dev` | 同步并打开 Android Studio |
| `npm run android:build` | 同步并调用 Gradle 生成 Debug APK |
| `npm run typecheck` | 类型检查 |
| `npm run test` | Vitest |
| `npm run lint` | ESLint |
| `npm run check` | typecheck + lint + format + test |

> 原 `dev:mp-weixin` / `build:mp-weixin` 已移除，执行时会提示该平台不再支持。本次重构目标是 Web + Android。

## 环境变量

生产构建会自动加载 [`prod.env`](prod.env)。

| 变量 | 默认值 | 说明 |
| --- | --- | --- |
| `VITE_API_BASE_URL` | 见 `prod.env` | REST 根地址；Web 同域部署时可留空走 `/api` |
| `VITE_USE_REMOTE_API` | `true` | 设为 `false` 时使用内存 Mock |
| `VITE_AGENT_CHAT_SDK` | 空 | 设为 `mock` 时强制 AgentChat SDK 走 Mock |

Web 本地开发未设置 `VITE_API_BASE_URL` 时走 Vite 代理：

```text
/api → http://127.0.0.1:3300
```

Android WebView 中未设置 `VITE_API_BASE_URL` 时默认请求：

```text
http://10.0.2.2:3300
```

真机调试时请将 `VITE_API_BASE_URL` 配置为电脑在局域网中的地址，例如 `http://192.168.1.100:3300`，并确保手机与电脑同网段。

## 迁移后的结构

```text
src/
  api/
  bridge/
  components/
  composables/
  constants/
  pages/                # vue-router 页面组件
  router/               # Web/Android 共用路由
  stores/
  utils/
    uni-compat.ts       # 兼容层：路由、storage、toast、clipboard、request、文件系统、返回键
scripts/
  with-prod-env.mjs
  generate-icons.mjs
  migrate-uni-to-vue.mjs
capacitor.config.json
android/                # 首次 android:add 后生成，默认 gitignore
```

## 原生适配说明

- `uni.*` 调用已统一收敛到 `src/utils/uni-compat.ts`
- 页面生命周期由 `src/composables/uni-lifecycle.ts` 映射到 Vue 生命周期与 vue-router
- Android 物理返回键通过 `@capacitor/app` 处理，优先返回上一页，首页则回到消息页
- 剪贴板在 Android 使用 `@capacitor/clipboard`，Web 使用 Clipboard API
- 文件临时读写在 Android 使用 `@capacitor/filesystem`
- 文件分享在 Android 使用 `@capacitor/share`
- 附件选择使用浏览器文件输入框，Capacitor WebView 可直接使用

## Agent 能力矩阵

| Agent | 工作区选择 | 上下文绑定 | 模型与推理设置 | Slash 命令补全 |
| --- | --- | --- | --- | --- |
| Codex | 支持 | 不需要 | 支持 | 支持（`/help` 缓存） |
| Claude | 支持 | 不需要 | 支持 | 支持 |
| Hermes | 不支持 | 仅导入时绑定 | 不支持 | 支持 |
| OpenClaw | 不支持 | 仅导入时绑定 | 不支持 | 支持 |

### Hermes 与 OpenClaw 绑定规则

- 仅在导入阶段选择上下文。
- 一组 Demo 凭证绑定一个 Profile 或 Agent。
- 聊天页不支持切换已绑定的 Profile 或 Agent。

