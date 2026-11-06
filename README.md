# PocketDev

手机端 AI 开发工具（1.0.7），基于 [chaitin/MonkeyCode](https://github.com/chaitin/MonkeyCode) 的 AI 能力层构建。

## 功能

- **AI 对话（主页）**：千问式对话界面，流式输出、可中断、快捷指令、工作区上下文选择
- **计划模式（可开关）**：在标题栏一键开启，AI 先给出编号执行计划，确认后才开始执行
- **消息排队**：回复过程中可继续发消息，进入待发送队列，可「立即发送」打断当前回复
- **功能应用（Applet）**：用 `return async (ctx, args) => {}` 编写轻量功能，AI 通过 `@CALL: 名称` 标记调用并把结果回填对话
- **消息翻译与朗读**：每条消息支持一键翻译为中文/英文/日/韩/法/德/西/俄等语言，并支持语音朗读
- **工作区**：选择一个仓库作为工作区，对话时自动携带仓库上下文
- **更多（功能 tab）**：功能应用、本地目录工作区、手机自动化（小龙虾）、本地模型
- **本地目录工作区**：把手机本地目录加入为工作区，支持快捷目录、手动路径、目录校验与文件预览
- **手机自动化（小龙虾）**：基于 Shizuku / Dhizuku 的助手式设备操作，每个动作逐条弹窗确认后执行
- **仓库**：配置访问令牌即可直连 GitHub / GitLab / Gitee / Gitea，列出、创建仓库并加入工作区
- **设置（两层入口）**：
  - 设置 Hub 卡片入口：服务商 / 仓库 / 模型 / 外观 / 更新 / 关于 / 协议
  - 自定义服务商：任意 OpenAI 兼容接口 / Anthropic，可拉取模型、测试连接
  - 模型管理：远程模型列表拉取、模型文件导入与删除
  - 访问令牌：仓库托管平台令牌配置（验证 + 保存）
  - 主题模式（跟随系统 / 浅色 / 深色）与主色调切换
  - 应用内更新检测 + 在线自动下载 + 安装（离线自动重试）+ 下载进度条 + 更新公告
  - 支持作者（支付宝 / 微信收款码）
  - 开发者 / 维护者 / 贡献者列表
- **首次引导**：语言选择 -> 环境检测 -> 服务商配置（可拉取模型） -> 协议确认（全文可展开收起）四步引导
- **启动**：全新启动动画与品牌图标（`</>` 标志、极光渐变、沉浸式全屏）

## 开发者

- **万古沧海** — 主开发者 · 总负责 · 仓库维护
  - 哔哩哔哩：https://b23.tv/H10fiEa （万古沧海的个人空间）

## 技术栈

- Expo SDK 55 / React Native 0.83
- expo-router（文件路由）
- expo-blur / expo-linear-gradient（液态玻璃 + 极光背景）
- TypeScript / Jest / ESLint
- GitHub Actions（Android CI，构建/测试/发布全自动）
- AGPL-3.0

## 兼容环境

- Android 8.0（API 26）及以上，目标 API 36

## 开发

```bash
npm install
npx expo start
```

## 持续集成（Android CI）

本项目用自带的 **GitHub Actions** 完成编译、测试、报告和发布，本地不跑 Gradle 构建，配置全部写在根目录 [`.android-ci.yml`](.android-ci.yml)：

- **Build & Test**（`.github/workflows/build-test.yml`）：每次 push / PR 自动跑 `tsc --noEmit` + `expo lint` + `jest`，结果聚合成人机可读报告（`report.md` / `report.json`）并作为产物上传，写进运行摘要，供 AI 直接读。
- **Release**（`.github/workflows/release.yml`）：打 `v*` 标签或手动触发 → `expo prebuild` → Gradle 打签名 APK（签名密钥来自仓库 Secrets）→ 计算 SHA-256 → 上传 GitHub Release。

### AI 协作闭环

手机上的 AI 改代码 → push → 读 **Build & Test** 报告 → 修 → 再 push → 打 `v*` 标签 → CI 自动构建签名 APK 并发布。规则见 [`AGENTS.md`](AGENTS.md)，机制说明见 [`docs/android-ci.md`](docs/android-ci.md)。

### 发布前需要配置的 Secrets

在仓库 Settings → Secrets and variables → Actions 中添加（签名密钥，不进代码库）：

- `ANDROID_KEYSTORE_BASE64`：`.jks` keystore 的 base64（`base64 -w0 release.jks`）
- `ANDROID_KEYSTORE_PASSWORD`、`ANDROID_KEY_ALIAS`、`ANDROID_KEY_PASSWORD`

## 许可

AGPL-3.0。底层 MonkeyCode 亦为 AGPL-3.0（长亭科技 / Chaitin 出品）。

本项目的 CI 架构（配置驱动 + AI 报告闭环 + 薄入口复用工作流）借鉴自 [wenjinliuu/ios-ci-workflows](https://github.com/wenjinliuu/ios-ci-workflows)（MIT License），已由 iOS 移植为 Android 实现。
