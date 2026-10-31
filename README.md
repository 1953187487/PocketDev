# PocketDev

手机端 AI 开发工具（1.0.2），基于 [chaitin/MonkeyCode](https://github.com/chaitin/MonkeyCode) 的 AI 能力层构建。

## 功能

- **AI 对话（主页）**：千问式对话界面，流式输出、可中断、快捷指令、工作区上下文选择
- **消息翻译与朗读**：每条消息支持一键翻译为中文/英文/日/韩/法/德/西/俄等语言，并支持语音朗读
- **工作区**：选择一个仓库作为工作区，对话时自动携带仓库上下文
- **仓库**：配置访问令牌即可直连 GitHub / GitLab / Gitee / Gitea，列出、创建仓库并加入工作区
- **设置（两层入口）**：
  - 设置 Hub 卡片入口：服务商 / 仓库 / 模型 / 外观 / 更新 / 关于 / 协议
  - 自定义服务商：任意 OpenAI 兼容接口 / Anthropic，可拉取模型、测试连接
  - 模型管理：远程模型列表拉取、模型文件导入与删除
  - 访问令牌：仓库托管平台令牌配置（验证 + 保存）
  - 主题模式（跟随系统 / 浅色 / 深色）与主色调切换
  - 应用内更新检测 + 在线自动下载 + 安装（离线自动重试）
  - 支持作者（支付宝 / 微信收款码）
  - 开发者 / 维护者 / 贡献者列表
- **首次引导**：语言选择 -> 环境检测 -> 服务商配置 -> 协议确认 四步引导
- **启动**：全新启动动画与品牌图标（`</>` 标志、极光渐变、沉浸式全屏）

## 开发者

- **万古沧海** — 主开发者 · 总负责 · 仓库维护
  - 哔哩哔哩：https://b23.tv/H10fiEa （万古沧海的个人空间）

## 技术栈

- Expo SDK 55 / React Native 0.83
- expo-router（文件路由）
- expo-blur / expo-linear-gradient（液态玻璃 + 极光背景）
- TypeScript
- AGPL-3.0

## 开发

```bash
npm install
npx expo start
```

## 构建 APK

```bash
# 本地构建（需 JDK 17 + Android SDK）
cd android && ./gradlew assembleRelease

# 或使用 EAS 云端构建
npx eas build --platform android --profile production
```

产物为 `com.pocketdev.app` 的 APK。

## 许可

AGPL-3.0。底层 MonkeyCode 亦为 AGPL-3.0（长亭科技 / Chaitin 出品）。
